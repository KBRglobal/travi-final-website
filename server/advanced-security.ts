/**
 * Advanced Security Module
 *
 * - Rate limiting by IP and action type
 * - 2FA for admins
 * - Audit logging
 * - CAPTCHA verification
 */

import { db } from "./db";
import { users, auditLogs, twoFactorSecrets } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, like } from "drizzle-orm";
import { cache } from "./cache";
import * as crypto from "crypto";
import { authenticator } from "otplib";

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests in window
  blockDurationMs: number; // How long to block after limit exceeded
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Authentication
  "auth:login": { windowMs: 900000, maxRequests: 5, blockDurationMs: 900000 }, // 5 attempts per 15 min
  "auth:register": { windowMs: 3600000, maxRequests: 3, blockDurationMs: 3600000 }, // 3 per hour
  "auth:password-reset": { windowMs: 3600000, maxRequests: 3, blockDurationMs: 3600000 },
  "auth:2fa-verify": { windowMs: 300000, maxRequests: 5, blockDurationMs: 600000 }, // 5 per 5 min

  // API
  "api:general": { windowMs: 60000, maxRequests: 100, blockDurationMs: 60000 }, // 100/min
  "api:search": { windowMs: 60000, maxRequests: 30, blockDurationMs: 60000 }, // 30/min
  "api:translate": { windowMs: 60000, maxRequests: 10, blockDurationMs: 300000 }, // 10/min, block 5 min
  "api:ai-generate": { windowMs: 60000, maxRequests: 5, blockDurationMs: 300000 }, // 5/min

  // Forms
  "form:contact": { windowMs: 3600000, maxRequests: 5, blockDurationMs: 3600000 },
  "form:newsletter": { windowMs: 3600000, maxRequests: 3, blockDurationMs: 3600000 },
  "form:lead": { windowMs: 3600000, maxRequests: 10, blockDurationMs: 3600000 },

  // Content
  "content:create": { windowMs: 3600000, maxRequests: 50, blockDurationMs: 3600000 },
  "content:update": { windowMs: 60000, maxRequests: 30, blockDurationMs: 300000 },
  "content:delete": { windowMs: 3600000, maxRequests: 20, blockDurationMs: 3600000 },

  // Media
  "media:upload": { windowMs: 3600000, maxRequests: 100, blockDurationMs: 3600000 },
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore: Map<
  string,
  { count: number; resetAt: number; blocked?: boolean; blockedUntil?: number }
> = new Map();

export const rateLimiter = {
  /**
   * Check if request should be rate limited
   */
  async check(
    ip: string,
    action: string,
    userId?: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetIn: number;
    blockedFor?: number;
  }> {
    const config = rateLimitConfigs[action] || rateLimitConfigs["api:general"];
    const key = userId ? `${action}:user:${userId}` : `${action}:ip:${ip}`;

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    // Check if blocked
    if (entry?.blocked && entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((entry.blockedUntil - now) / 1000),
        blockedFor: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // Reset if window expired
    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 0,
        resetAt: now + config.windowMs,
      };
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      entry.blocked = true;
      entry.blockedUntil = now + config.blockDurationMs;
      rateLimitStore.set(key, entry);

      // Log security event
      await this.logRateLimitExceeded(ip, action, userId);

      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil(config.blockDurationMs / 1000),
        blockedFor: Math.ceil(config.blockDurationMs / 1000),
      };
    }

    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
  },

  /**
   * Log rate limit exceeded event
   */
  async logRateLimitExceeded(ip: string, action: string, userId?: string): Promise<void> {
    await auditLogger.log({
      action: "security:rate_limit_exceeded",
      userId: userId || null,
      ipAddress: ip,
      details: { action, reason: "Rate limit exceeded" },
      severity: "warning",
    });
  },

  /**
   * Clear rate limit for key
   */
  async clear(ip: string, action: string, userId?: string): Promise<void> {
    const key = userId ? `${action}:user:${userId}` : `${action}:ip:${ip}`;
    rateLimitStore.delete(key);
  },

  /**
   * Get Express middleware
   */
  middleware(action: string) {
    return async (req: any, res: any, next: any) => {
      const ip = req.ip || req.connection.remoteAddress;
      const userId = req.user?.id;

      const result = await this.check(ip, action, userId);

      // Set rate limit headers
      res.set("X-RateLimit-Remaining", result.remaining.toString());
      res.set("X-RateLimit-Reset", result.resetIn.toString());

      if (!result.allowed) {
        res.set("Retry-After", result.blockedFor?.toString() || "60");
        return res.status(429).json({
          error: "Too many requests",
          retryAfter: result.blockedFor,
        });
      }

      next();
    };
  },
};

// ============================================================================
// TWO-FACTOR AUTHENTICATION
// ============================================================================

// In-memory cache for fast lookups (synced with DB)
const twoFactorCache: Map<string, { secret: string; backupCodes: string[]; verified: boolean }> =
  new Map();

export const twoFactorAuth = {
  /**
   * Generate TOTP secret for user (RFC 6238 compliant)
   * Persists to database for durability
   */
  async generateSecret(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    // Generate RFC 6238 compliant base32 secret using otplib
    const secret = authenticator.generateSecret();

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    // Store secret in database (upsert in case user regenerates)
    await db
      .insert(twoFactorSecrets)
      .values({
        userId,
        secret,
        backupCodes,
        verified: false,
      } as any)
      .onConflictDoUpdate({
        target: twoFactorSecrets.userId,
        set: {
          secret,
          backupCodes,
          verified: false,
          updatedAt: new Date(),
        } as any,
      });

    // Update cache
    twoFactorCache.set(userId, { secret, backupCodes, verified: false });

    // Generate QR code URL using otplib (RFC 6238 compliant)
    const qrCodeUrl = authenticator.keyuri(userId, "Travi CMS", secret);

    return { secret, qrCodeUrl, backupCodes };
  },

  /**
   * Verify TOTP code and enable 2FA
   */
  async verifyAndEnable(userId: string, code: string): Promise<boolean> {
    const stored = await this.getStoredSecret(userId);
    if (!stored) return false;

    const isValid = this.verifyCode(stored.secret, code);

    if (isValid) {
      // Update database
      await db
        .update(twoFactorSecrets)
        .set({ verified: true, updatedAt: new Date() } as any)
        .where(eq(twoFactorSecrets.userId, userId));

      // Update cache
      twoFactorCache.set(userId, { ...stored, verified: true });

      // Log 2FA enabled
      await auditLogger.log({
        action: "security:2fa_enabled",
        userId,
        details: { method: "totp" },
        severity: "info",
      });
    }

    return isValid;
  },

  /**
   * Get stored 2FA secret (from cache or DB)
   */
  async getStoredSecret(
    userId: string
  ): Promise<{ secret: string; backupCodes: string[]; verified: boolean } | null> {
    // Check cache first
    const cached = twoFactorCache.get(userId);
    if (cached) return cached;

    // Fallback to database
    const [stored] = await db
      .select()
      .from(twoFactorSecrets)
      .where(eq(twoFactorSecrets.userId, userId));

    if (!stored) return null;

    // Update cache
    const data = {
      secret: stored.secret,
      backupCodes: stored.backupCodes || [],
      verified: stored.verified,
    };
    twoFactorCache.set(userId, data);
    return data;
  },

  /**
   * Verify TOTP code (RFC 6238 compliant)
   */
  verifyCode(secret: string, code: string): boolean {
    try {
      // Use otplib's authenticator for RFC 6238 compliant verification
      // Includes time window tolerance for clock drift
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  },

  /**
   * Generate current TOTP code (RFC 6238 compliant)
   */
  generateCode(secret: string): string {
    return authenticator.generate(secret);
  },

  /**
   * Check if user has 2FA enabled
   */
  async isEnabled(userId: string): Promise<boolean> {
    const stored = await this.getStoredSecret(userId);
    return stored?.verified === true;
  },

  /**
   * Verify login with 2FA
   */
  async verifyLogin(
    userId: string,
    code: string
  ): Promise<{
    success: boolean;
    usedBackupCode?: boolean;
  }> {
    const stored = await this.getStoredSecret(userId);
    if (!stored || !stored.verified) {
      return { success: false };
    }

    // Try TOTP code
    if (this.verifyCode(stored.secret, code)) {
      return { success: true };
    }

    // Try backup code
    const backupIndex = stored.backupCodes.indexOf(code.toUpperCase());
    if (backupIndex !== -1) {
      // Remove used backup code
      const newBackupCodes = [...stored.backupCodes];
      newBackupCodes.splice(backupIndex, 1);

      // Update database
      await db
        .update(twoFactorSecrets)
        .set({ backupCodes: newBackupCodes, updatedAt: new Date() } as any)
        .where(eq(twoFactorSecrets.userId, userId));

      // Update cache
      twoFactorCache.set(userId, { ...stored, backupCodes: newBackupCodes });

      await auditLogger.log({
        action: "security:2fa_backup_code_used",
        userId,
        details: { remainingBackupCodes: newBackupCodes.length },
        severity: "warning",
      });

      return { success: true, usedBackupCode: true };
    }

    return { success: false };
  },

  /**
   * Disable 2FA for user
   */
  async disable(userId: string, adminId?: string): Promise<boolean> {
    const stored = await this.getStoredSecret(userId);
    const existed = !!stored;

    // Delete from database
    await db.delete(twoFactorSecrets).where(eq(twoFactorSecrets.userId, userId));

    // Remove from cache
    twoFactorCache.delete(userId);

    if (existed) {
      await auditLogger.log({
        action: "security:2fa_disabled",
        userId,
        details: { disabledBy: adminId || userId },
        severity: adminId ? "warning" : "info",
      });
    }

    return existed;
  },

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[] | null> {
    const stored = await this.getStoredSecret(userId);
    if (!stored || !stored.verified) return null;

    const newCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    // Update database
    await db
      .update(twoFactorSecrets)
      .set({ backupCodes: newCodes, updatedAt: new Date() } as any)
      .where(eq(twoFactorSecrets.userId, userId));

    // Update cache
    twoFactorCache.set(userId, { ...stored, backupCodes: newCodes });

    await auditLogger.log({
      action: "security:2fa_backup_codes_regenerated",
      userId,
      severity: "info",
    });

    return newCodes;
  },
};

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditLogEntry {
  action: string;
  userId: string | null;
  ipAddress?: string;
  userAgent?: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
  severity: "info" | "warning" | "error" | "critical";
}

// Helper functions to map audit entry fields to database enum values
// Valid actionTypes: create, update, delete, publish, unpublish, submit_for_review, approve, reject, login, logout, user_create, user_update, user_delete, role_change, settings_change, media_upload, media_delete, restore
function mapActionToAuditType(
  action: string
):
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "login"
  | "logout"
  | "settings_change"
  | "role_change"
  | "media_upload"
  | "media_delete"
  | "restore" {
  const actionLower = action.toLowerCase();
  if (actionLower.includes("create") || actionLower.includes("add")) return "create";
  if (
    actionLower.includes("update") ||
    actionLower.includes("edit") ||
    actionLower.includes("modify")
  )
    return "update";
  if (actionLower.includes("delete") || actionLower.includes("remove")) return "delete";
  if (actionLower.includes("publish")) return "publish";
  if (actionLower.includes("unpublish")) return "unpublish";
  if (actionLower.includes("login")) return "login";
  if (actionLower.includes("logout")) return "logout";
  if (actionLower.includes("settings") || actionLower.includes("config")) return "settings_change";
  if (actionLower.includes("permission") || actionLower.includes("role")) return "role_change";
  if (actionLower.includes("upload") || actionLower.includes("media_upload")) return "media_upload";
  if (actionLower.includes("media_delete")) return "media_delete";
  if (actionLower.includes("restore")) return "restore";
  return "update"; // Default to update instead of non-existent 'other'
}

// Valid entityTypes: content, user, media, settings, rss_feed, affiliate_link, translation, session, tag, cluster, campaign, newsletter_subscriber
function mapEntityToType(
  resource?: string
):
  | "content"
  | "user"
  | "media"
  | "settings"
  | "translation"
  | "campaign"
  | "session"
  | "tag"
  | "cluster" {
  if (!resource) return "session"; // Default to session for system events
  const resourceLower = resource.toLowerCase();
  if (
    resourceLower.includes("content") ||
    resourceLower.includes("article") ||
    resourceLower.includes("hotel") ||
    resourceLower.includes("attraction")
  )
    return "content";
  if (resourceLower.includes("user")) return "user";
  if (resourceLower.includes("media") || resourceLower.includes("image")) return "media";
  if (resourceLower.includes("settings") || resourceLower.includes("config")) return "settings";
  if (resourceLower.includes("translation") || resourceLower.includes("locale"))
    return "translation";
  if (resourceLower.includes("campaign") || resourceLower.includes("newsletter")) return "campaign";
  if (resourceLower.includes("tag")) return "tag";
  if (resourceLower.includes("cluster")) return "cluster";
  return "content"; // Default to content
}

// Hybrid audit log: in-memory for fast queries + database for persistence
const auditLogStore: Array<AuditLogEntry & { id: string; timestamp: Date }> = [];

export const auditLogger = {
  /**
   * Log an audit event to both memory and database
   */
  async log(entry: AuditLogEntry): Promise<string> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const fullEntry = {
      ...entry,
      id,
      timestamp: new Date(),
    };

    // Add to in-memory store for fast access
    auditLogStore.push(fullEntry);

    // Keep only last 50000 entries in memory
    if (auditLogStore.length > 50000) {
      auditLogStore.splice(0, auditLogStore.length - 50000);
    }

    // Write to database for persistence
    try {
      const resourceStr = entry.targetId || entry.targetType || "";
      await db.insert(auditLogs).values({
        userId: entry.userId || null,
        userName: entry.userId ? `User ${entry.userId}` : "System",
        userRole: "admin",
        actionType: mapActionToAuditType(entry.action),
        entityType: mapEntityToType(resourceStr),
        entityId: resourceStr || null,
        description: `${entry.action}${entry.details ? ": " + JSON.stringify(entry.details) : ""}`,
        beforeState: null,
        afterState: entry.details || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      } as any);
    } catch (dbError) {
      console.error("Audit log database error:", dbError);
    }

    // For critical events, send alert
    if (entry.severity === "critical") {
      await this.alertCriticalEvent(fullEntry);
    }

    return id;
  },

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: {
    userId?: string;
    action?: string;
    severity?: AuditLogEntry["severity"];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: Array<AuditLogEntry & { id: string; timestamp: Date }>;
    total: number;
  }> {
    // Read from database for persistence (not just in-memory)
    try {
      const conditions = [];

      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }
      if (filters.action) {
        conditions.push(like(auditLogs.description, `%${filters.action}%`));
      }
      if (filters.startDate) {
        conditions.push(gte(auditLogs.timestamp, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(auditLogs.timestamp, filters.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(whereClause);
      const total = Number(countResult[0]?.count || 0);

      // Get paginated results
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;

      const results = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset);

      // Transform to expected format
      const logs: Array<AuditLogEntry & { id: string; timestamp: Date }> = results.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        action: row.description,
        userId: row.userId,
        targetType: row.entityType as string,
        targetId: row.entityId ?? undefined,
        details: row.afterState || {},
        severity: "info" as const,
        ipAddress: row.ipAddress ?? undefined,
        userAgent: row.userAgent ?? undefined,
      }));

      return { logs, total };
    } catch (error) {
      // Fallback to in-memory if database fails
      let filtered = [...auditLogStore];
      if (filters.userId) filtered = filtered.filter(l => l.userId === filters.userId);
      if (filters.action) filtered = filtered.filter(l => l.action.includes(filters.action!));
      if (filters.startDate) filtered = filtered.filter(l => l.timestamp >= filters.startDate!);
      if (filters.endDate) filtered = filtered.filter(l => l.timestamp <= filters.endDate!);
      filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      return { logs: filtered.slice(offset, offset + limit), total: filtered.length };
    }
  },

  /**
   * Get user activity summary from database
   */
  async getUserActivity(
    userId: string,
    days: number = 30
  ): Promise<{
    totalActions: number;
    byAction: Record<string, number>;
    bySeverity: Record<string, number>;
    recentActivity: Array<{ action: string; timestamp: Date }>;
  }> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const userLogs = await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.userId, userId), gte(auditLogs.timestamp, cutoff)))
        .orderBy(desc(auditLogs.timestamp));

      const byAction: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};

      for (const log of userLogs) {
        const actionType = log.actionType || "unknown";
        byAction[actionType] = (byAction[actionType] || 0) + 1;
        bySeverity["info"] = (bySeverity["info"] || 0) + 1;
      }

      return {
        totalActions: userLogs.length,
        byAction,
        bySeverity,
        recentActivity: userLogs.slice(0, 10).map(l => ({
          action: l.description,
          timestamp: l.timestamp,
        })),
      };
    } catch (error) {
      return { totalActions: 0, byAction: {}, bySeverity: {}, recentActivity: [] };
    }
  },

  /**
   * Get security summary from database
   */
  async getSecuritySummary(hours: number = 24): Promise<{
    totalEvents: number;
    warnings: number;
    errors: number;
    critical: number;
    topActions: Array<{ action: string; count: number }>;
    suspiciousIps: Array<{ ip: string; events: number }>;
  }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const recentLogs = await db.select().from(auditLogs).where(gte(auditLogs.timestamp, cutoff));

      const actionCounts: Record<string, number> = {};
      const ipCounts: Record<string, number> = {};
      let warnings = 0,
        errors = 0,
        critical = 0;

      for (const log of recentLogs) {
        const actionType = log.actionType || "unknown";
        actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;

        if (log.ipAddress) {
          ipCounts[log.ipAddress] = (ipCounts[log.ipAddress] || 0) + 1;
        }

        // Check description for severity indicators
        const desc = log.description.toLowerCase();
        if (desc.includes("warning") || desc.includes("failed")) warnings++;
        else if (desc.includes("error")) errors++;
        else if (desc.includes("critical") || desc.includes("breach")) critical++;
      }

      // Find suspicious IPs (many events)
      const suspiciousIps = Object.entries(ipCounts)
        .filter(([, count]) => count > 50)
        .map(([ip, events]) => ({ ip, events }))
        .sort((a, b) => b.events - a.events)
        .slice(0, 10);

      return {
        totalEvents: recentLogs.length,
        warnings,
        errors,
        critical,
        topActions: Object.entries(actionCounts)
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        suspiciousIps,
      };
    } catch (error) {
      return {
        totalEvents: 0,
        warnings: 0,
        errors: 0,
        critical: 0,
        topActions: [],
        suspiciousIps: [],
      };
    }
  },

  /**
   * Alert on critical events
   */
  async alertCriticalEvent(entry: AuditLogEntry & { id: string; timestamp: Date }): Promise<void> {
    // In production, send email/SMS/Slack alert
  },
};

// ============================================================================
// CAPTCHA VERIFICATION
// ============================================================================

interface CaptchaConfig {
  provider: "recaptcha" | "hcaptcha" | "turnstile";
  siteKey: string;
  secretKey: string;
  minScore?: number; // For reCAPTCHA v3
}

export const captcha = {
  config: {
    provider: "recaptcha" as "recaptcha" | "hcaptcha" | "turnstile",
    siteKey: process.env.RECAPTCHA_SITE_KEY || "",
    secretKey: process.env.RECAPTCHA_SECRET_KEY || "",
    minScore: 0.5,
  },

  /**
   * Verify reCAPTCHA token
   */
  async verifyRecaptcha(
    token: string,
    ip?: string
  ): Promise<{
    success: boolean;
    score?: number;
    action?: string;
    errorCodes?: string[];
  }> {
    if (!this.config.secretKey) {
      // CAPTCHA not configured - allow in development
      return { success: true };
    }

    try {
      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: this.config.secretKey,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      });

      const data = await response.json();

      // For reCAPTCHA v3, check score
      if (data.score !== undefined && data.score < this.config.minScore!) {
        return {
          success: false,
          score: data.score,
          errorCodes: ["score-too-low"],
        };
      }

      return {
        success: data.success,
        score: data.score,
        action: data.action,
        errorCodes: data["error-codes"],
      };
    } catch (error) {
      return { success: false, errorCodes: ["verification-failed"] };
    }
  },

  /**
   * Verify hCaptcha token
   */
  async verifyHcaptcha(
    token: string,
    ip?: string
  ): Promise<{
    success: boolean;
    errorCodes?: string[];
  }> {
    const secretKey = process.env.HCAPTCHA_SECRET_KEY;
    if (!secretKey) {
      return { success: true };
    }

    try {
      const response = await fetch("https://hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      });

      const data = await response.json();
      return {
        success: data.success,
        errorCodes: data["error-codes"],
      };
    } catch (error) {
      return { success: false, errorCodes: ["verification-failed"] };
    }
  },

  /**
   * Verify Cloudflare Turnstile token
   */
  async verifyTurnstile(
    token: string,
    ip?: string
  ): Promise<{
    success: boolean;
    errorCodes?: string[];
  }> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      return { success: true };
    }

    try {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      });

      const data = await response.json();
      return {
        success: data.success,
        errorCodes: data["error-codes"],
      };
    } catch (error) {
      return { success: false, errorCodes: ["verification-failed"] };
    }
  },

  /**
   * Verify token using configured provider
   */
  async verify(
    token: string,
    ip?: string
  ): Promise<{
    success: boolean;
    score?: number;
    errorCodes?: string[];
  }> {
    switch (this.config.provider) {
      case "recaptcha":
        return this.verifyRecaptcha(token, ip);
      case "hcaptcha":
        return this.verifyHcaptcha(token, ip);
      case "turnstile":
        return this.verifyTurnstile(token, ip);
      default:
        return { success: true };
    }
  },

  /**
   * Express middleware for CAPTCHA verification
   */
  middleware(options?: { action?: string; scoreThreshold?: number }) {
    return async (req: any, res: any, next: any) => {
      const token = req.body.captchaToken || req.headers["x-captcha-token"];

      if (!token) {
        return res.status(400).json({ error: "CAPTCHA token required" });
      }

      const ip = req.ip || req.connection.remoteAddress;
      const result = await this.verify(token, ip);

      if (!result.success) {
        await auditLogger.log({
          action: "security:captcha_failed",
          userId: req.user?.id || null,
          ipAddress: ip,
          details: { errorCodes: result.errorCodes, action: options?.action },
          severity: "warning",
        });

        return res.status(403).json({
          error: "CAPTCHA verification failed",
          codes: result.errorCodes,
        });
      }

      next();
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const advancedSecurity = {
  rateLimiter,
  twoFactorAuth,
  auditLogger,
  captcha,
};

export default advancedSecurity;
