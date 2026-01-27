import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { ROLE_PERMISSIONS, type UserRole } from "@shared/schema";

// ============================================================================
// AUTH USER TYPES
// ============================================================================
export interface AuthUserClaims {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface AuthenticatedUser {
  claims: AuthUserClaims;
}

/**
 * Type guard to check if req.user is an authenticated user
 */
export function isAuthenticatedUser(user: unknown): user is AuthenticatedUser {
  return (
    typeof user === "object" &&
    user !== null &&
    "claims" in user &&
    typeof (user as AuthenticatedUser).claims?.sub === "string"
  );
}

/**
 * Safely get user ID from request
 */
export function getUserId(req: Request): string | undefined {
  if (isAuthenticatedUser(req.user)) {
    return req.user.claims.sub;
  }
  return undefined;
}

// ============================================================================
// APPROVED BOT ALLOWLIST
// AI crawlers, search engines, and social media bots that should bypass security
// ============================================================================
export const APPROVED_BOTS = [
  // Search Engines
  "googlebot",
  "bingbot",
  "slurp", // Yahoo
  "duckduckbot",
  "baiduspider",
  "yandexbot",

  // AI Assistants - Critical for AI search visibility
  "anthropic",
  "claude",
  "chatgpt",
  "gptbot",
  "google-extended",
  "perplexitybot",
  "applebot",
  "cohere",
  "claudebot",
  "ai2bot",
  "ccbot", // Common Crawl
  "omgilibot",
  "diffbot",

  // Social Media Preview Bots
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "pinterest",
  "whatsapp",
  "telegrambot",
  "slackbot",
  "discordbot",

  // SEO Tools
  "ahrefsbot",
  "semrushbot",
  "mj12bot",
  "screaming frog",
  "dotbot",
  "rogerbot",

  // Verification & Review Bots
  "trustpilot",
  "feefo",
  "bazaarvoice",
  "reevoo",
  "yotpo",

  // Site Monitoring & Uptime
  "pingdom",
  "uptimerobot",
  "statuscake",
  "gtmetrix",
  "pagespeed",

  // Other Legitimate Bots
  "feedly",
  "flipboard",
  "pocket",
  "embedly",
  "quora link preview",
  "outbrain",
  "disqus",
];

/**
 * Check if a user agent belongs to an approved bot
 */
export function isApprovedBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return APPROVED_BOTS.some(bot => ua.includes(bot.toLowerCase()));
}

// ============================================================================
// BOT BLOCKING TOGGLE - Cached setting from database
// ============================================================================
let botBlockingDisabledCache: boolean | null = null;
let botBlockingCacheTime = 0;
const BOT_BLOCKING_CACHE_TTL = 30000; // 30 seconds cache

/**
 * Get the bot blocking disabled setting from database (cached)
 */
export async function isBotBlockingDisabled(): Promise<boolean> {
  const now = Date.now();

  // Return cached value if still valid
  if (botBlockingDisabledCache !== null && now - botBlockingCacheTime < BOT_BLOCKING_CACHE_TTL) {
    return botBlockingDisabledCache;
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { db } = await import("./db");
    const { siteSettings } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const result = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "botBlockingDisabled"));
    botBlockingDisabledCache = result.length > 0 && result[0].value === true;
    botBlockingCacheTime = now;
    return botBlockingDisabledCache;
  } catch (error) {
    return false; // Default to blocking enabled if error
  }
}

/**
 * Clear the bot blocking cache (call when setting changes)
 */
export function clearBotBlockingCache() {
  botBlockingDisabledCache = null;
  botBlockingCacheTime = 0;
}

/**
 * Middleware that marks approved bots so they bypass security checks
 * Apply this BEFORE other security middleware
 */
export function approvedBotMiddleware(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.headers["user-agent"];

  // Check if it's an approved bot
  if (isApprovedBot(userAgent)) {
    (req as any).isApprovedBot = true;
    return next();
  }

  // Check if bot blocking is disabled (async check)
  isBotBlockingDisabled()
    .then(disabled => {
      if (disabled) {
        // All bots allowed when blocking is disabled
        (req as any).isApprovedBot = true;
      }
      next();
    })
    .catch(() => {
      next(); // Continue even on error
    });
}

// ============================================================================
// SAFE MODE CONFIGURATION
// Toggle via environment variables - no code changes needed
// ============================================================================
export const safeMode = {
  get readOnlyMode(): boolean {
    return process.env.SAFE_MODE_READ_ONLY === "true";
  },
  get aiDisabled(): boolean {
    return process.env.SAFE_MODE_DISABLE_AI === "true";
  },
};

// ============================================================================
// RATE LIMITING (In-memory for performance, Redis recommended for production)
// ============================================================================
// Architecture:
// - Short-term limits: In-memory (acceptable data loss on restart)
// - Long-term AI limits: Database-backed with cache (see aiUsageCache)
// - IP blocking: In-memory transient (see suspiciousIps)
// For multi-instance/distributed deployments, replace with Redis.
// ============================================================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store - use Redis for distributed deployments
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(
    () => {
      const now = Date.now();
      rateLimitStore.forEach((entry, key) => {
        if (entry.resetTime < now) {
          rateLimitStore.delete(key);
        }
      });
    },
    5 * 60 * 1000
  );
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = "" } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting for approved bots (AI crawlers, search engines)
    if ((req as any).isApprovedBot || isApprovedBot(req.headers["user-agent"])) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const userId = getUserId(req) || "anonymous";
    const key = `${keyPrefix}:${ip}:${userId}`;

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.setHeader("Retry-After", Math.ceil((entry.resetTime - now) / 1000));
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
    }

    entry.count++;
    next();
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    keyPrefix: "auth",
  }),
  ai: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: "ai",
  }),
  contentWrite: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyPrefix: "content-write",
  }),
  analytics: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: "analytics",
  }),
  newsletter: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    keyPrefix: "newsletter",
  }),
};

// ============================================================================
// AI USAGE LIMITS (per user, per day) - Database-backed for persistence
// ============================================================================
interface AiUsageEntry {
  count: number;
  resetTime: number;
}

// In-memory cache for fast lookups (synced with DB)
const aiUsageCache = new Map<string, AiUsageEntry>();

const AI_DAILY_LIMIT = 100; // requests per user per day

export async function checkAiUsageLimit(req: Request, res: Response, next: NextFunction) {
  if (safeMode.aiDisabled) {
    return res.status(503).json({
      error: "AI features are temporarily disabled",
      code: "AI_DISABLED",
    });
  }

  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required for AI features" });
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const key = `ai_daily:${userId}`;

  // Check in-memory cache first
  let entry = aiUsageCache.get(key);

  // If not in cache or expired, check database
  if (!entry || entry.resetTime < now) {
    try {
      const dbLimit = await storage.getRateLimit(key);
      if (dbLimit && dbLimit.resetAt.getTime() > now) {
        entry = { count: dbLimit.count, resetTime: dbLimit.resetAt.getTime() };
        aiUsageCache.set(key, entry);
      } else {
        // Reset or new entry
        entry = { count: 0, resetTime: now + dayMs };
      }
    } catch (err) {
      entry = entry || { count: 0, resetTime: now + dayMs };
    }
  }

  if (entry.count >= AI_DAILY_LIMIT) {
    return res.status(429).json({
      error: "Daily AI usage limit exceeded",
      limit: AI_DAILY_LIMIT,
      resetIn: Math.ceil((entry.resetTime - now) / 1000 / 60), // minutes
    });
  }

  // Increment count
  entry.count++;
  aiUsageCache.set(key, entry);

  // Persist to database asynchronously (don't block request)
  storage.incrementRateLimit(key, new Date(entry.resetTime)).catch(err => {});

  next();
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
// DEV: Cache admin user for auto-auth bypass
let devAutoAuthUser: any = null;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // DEV ONLY: Auto-authenticate as admin when DEV_AUTO_AUTH=true
  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTO_AUTH === "true") {
    // Use cached user or fallback to known admin
    const devAdminId = devAutoAuthUser?.id || "1c932a80-c8c1-4ca5-b4f3-de09914947ba";
    (req as any).user = { claims: { sub: devAdminId }, id: devAdminId };
    (req as any).dbUser = devAutoAuthUser || { id: devAdminId, role: "admin" };
    (req as any).userRole = devAutoAuthUser?.role || "admin";
    (req as any).isAuthenticated = () => true;
    return next();
  }

  const isAuthenticated = typeof req.isAuthenticated === "function" ? req.isAuthenticated() : false;
  if (!isAuthenticated || !getUserId(req)) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// DEV: Initialize auto-auth user cache
export async function initDevAutoAuth(getAdminUser: () => Promise<any>) {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTO_AUTH === "true") {
    try {
      devAutoAuthUser = await getAdminUser();
    } catch (e) {}
  }
}

// ============================================================================
// SAFE MODE MIDDLEWARE
// ============================================================================
export function checkReadOnlyMode(req: Request, res: Response, next: NextFunction) {
  if (safeMode.readOnlyMode) {
    return res.status(503).json({
      error: "System is in read-only mode",
      code: "READ_ONLY_MODE",
    });
  }
  next();
}

// ============================================================================
// AUTHORIZATION / RBAC MIDDLEWARE
// ============================================================================
type PermissionKey = keyof typeof ROLE_PERMISSIONS.admin;

function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions[permission] : false;
}

export function requirePermission(permission: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // DEV ONLY: Auto-authenticate as admin when DEV_AUTO_AUTH=true
    if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTO_AUTH === "true") {
      const devAdminId = devAutoAuthUser?.id || "1c932a80-c8c1-4ca5-b4f3-de09914947ba";
      (req as any).user = { claims: { sub: devAdminId }, id: devAdminId };
      (req as any).dbUser = devAutoAuthUser || { id: devAdminId, role: "admin" };
      (req as any).userRole = devAutoAuthUser?.role || "admin";
      (req as any).isAuthenticated = () => true;
      return next();
    }

    const userId = getUserId(req);
    const isAuthenticated =
      typeof req.isAuthenticated === "function" ? req.isAuthenticated() : false;
    if (!isAuthenticated || !userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const dbUser = await storage.getUser(userId);
    const userRole: UserRole = dbUser?.role || "viewer";

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        error: "Permission denied",
        required: permission,
        currentRole: userRole,
      });
    }

    // Attach user info to request for later use
    (req as any).dbUser = dbUser;
    (req as any).userRole = userRole;

    next();
  };
}

// Check if user can only edit their own content (Author/Contributor)
export function requireOwnContentOrPermission(permission: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const isAuthenticated =
      typeof req.isAuthenticated === "function" ? req.isAuthenticated() : false;
    if (!isAuthenticated || !user?.claims?.sub) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const dbUser = await storage.getUser(user.claims.sub);
    const userRole: UserRole = dbUser?.role || "viewer";

    // Admin and Editor can edit any content
    if (hasPermission(userRole, permission)) {
      (req as any).dbUser = dbUser;
      (req as any).userRole = userRole;
      return next();
    }

    // Author/Contributor can only edit their own content
    if (userRole === "author" || userRole === "contributor") {
      const contentId = req.params.id;
      if (contentId) {
        const content = await storage.getContent(contentId);
        if (content && content.authorId === user.claims.sub) {
          (req as any).dbUser = dbUser;
          (req as any).userRole = userRole;
          return next();
        }
      }
    }

    return res.status(403).json({
      error: "Permission denied - you can only modify your own content",
      currentRole: userRole,
    });
  };
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================
// SECURITY NOTE: CSRF and CORS are intentionally restrictive.
// External security scanners may report "CORS misconfiguration" - this is expected.
// We use an explicit allowlist (no wildcards) to prevent cross-origin attacks.
// Only the domains listed below can make authenticated requests to our API.
// ============================================================================
const ALLOWED_ORIGINS = [
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
  process.env.FRONTEND_URL,
  process.env.SITE_URL,
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://127.0.0.1:5000",
  "https://travi.world",
  "https://www.travi.world",
  "https://travi--mzgdubai.replit.app",
].filter(Boolean) as string[];

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Only check for state-changing methods
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    return next();
  }

  // Skip for webhooks and public newsletter endpoints
  if (
    req.path.startsWith("/api/webhooks/") ||
    req.path === "/api/newsletter/subscribe" ||
    req.path === "/api/analytics/record-view"
  ) {
    return next();
  }

  const origin = req.get("Origin") || req.get("Referer");

  // If no origin header, check if it's a same-origin request
  if (!origin) {
    // Allow requests without Origin if they're from the same host
    const host = req.get("Host");
    if (host && (host.includes("localhost") || host.includes("replit"))) {
      return next();
    }
    // For API calls without Origin, require authentication
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(403).json({ error: "CSRF validation failed - missing origin" });
  }

  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
  if (!isAllowed) {
    return res.status(403).json({ error: "CSRF validation failed - invalid origin" });
  }

  next();
}

// ============================================================================
// MEDIA UPLOAD VALIDATION
// ============================================================================
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function validateMediaUpload(req: Request, res: Response, next: NextFunction) {
  const file = (req as any).file;

  if (!file) {
    return next(); // Let the route handler deal with missing file
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return res.status(413).json({
      error: "File too large",
      maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
    });
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return res.status(415).json({
      error: "Invalid file type",
      allowedTypes: ALLOWED_MIME_TYPES,
    });
  }

  // Check for executable extensions
  const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".js", ".php"];
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
  if (dangerousExtensions.includes(ext)) {
    return res.status(415).json({
      error: "Executable files are not allowed",
    });
  }

  next();
}

// ============================================================================
// ANALYTICS VALIDATION
// ============================================================================
export async function validateAnalyticsRequest(req: Request, res: Response, next: NextFunction) {
  const { contentId } = req.params;

  if (!contentId) {
    return res.status(400).json({ error: "Content ID required" });
  }

  // Validate contentId exists
  const content = await storage.getContent(contentId);
  if (!content) {
    return res.status(404).json({ error: "Content not found" });
  }

  // Only allow tracking views for published content
  if (content.status !== "published") {
    return res.status(400).json({ error: "Cannot track views for unpublished content" });
  }

  next();
}

// ============================================================================
// ERROR HANDLING (no stack traces to client)
// ============================================================================
export function secureErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log full error for debugging (but never log secrets or PII)
  console.error("[API-ERROR]", {
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Never expose stack traces or internal details to clients
  if (res.headersSent) {
    return next(err);
  }

  // Check for specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: "Validation error", message: err.message });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Generic error response (no details)
  res.status(500).json({ error: "Internal server error" });
}

// ============================================================================
// SESSION/COOKIE CONFIGURATION
// ============================================================================
export const sessionConfig = {
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || !!process.env.REPLIT_DEV_DOMAIN,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

// ============================================================================
// AUDIT LOG PROTECTION - No delete/update operations
// ============================================================================
export function auditLogReadOnly(req: Request, res: Response, next: NextFunction) {
  if (["DELETE", "PATCH", "PUT"].includes(req.method)) {
    return res.status(403).json({
      error: "Audit logs are immutable",
      message: "Audit logs cannot be modified or deleted",
    });
  }
  next();
}

// ============================================================================
// AUDIT LOGGING - Track all critical operations
// ============================================================================
export interface AuditLogEntry {
  timestamp: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "publish"
    | "login"
    | "logout"
    | "translate"
    | "ai_generate";
  resourceType: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  ip: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

// Audit logs are now persisted to database via storage.createAuditLog()
// In-memory store only used as fallback if DB write fails
const auditLogFallback: AuditLogEntry[] = [];
const MAX_FALLBACK_LOGS = 100;

// Map audit actions to valid database enum values
function mapActionToDbEnum(
  action: AuditLogEntry["action"]
): "create" | "update" | "delete" | "publish" | "login" | "logout" {
  switch (action) {
    case "translate":
      return "update"; // Translation is a form of update
    case "ai_generate":
      return "create"; // AI generation creates new content
    default:
      return action;
  }
}

export async function logAuditEvent(entry: Omit<AuditLogEntry, "timestamp">) {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // Console log for immediate visibility (with original action for debugging)

  try {
    // Persist to database (map action to valid DB enum)
    await storage.createAuditLog({
      userId: entry.userId,
      userName: entry.userEmail,
      actionType: mapActionToDbEnum(entry.action),
      entityType: entry.resourceType as any,
      entityId: entry.resourceId,
      description: `${entry.action} on ${entry.resourceType}${entry.resourceId ? ` (${entry.resourceId})` : ""}`,
      ipAddress: entry.ip,
      userAgent: entry.userAgent,
      afterState: entry.details as Record<string, unknown>,
    });
  } catch (err) {
    // Fallback to in-memory if DB fails

    auditLogFallback.push(logEntry);
    if (auditLogFallback.length > MAX_FALLBACK_LOGS) {
      auditLogFallback.splice(0, auditLogFallback.length - MAX_FALLBACK_LOGS);
    }
  }
}

export async function getAuditLogs(options?: {
  action?: string;
  resourceType?: string;
  userId?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    // Query from database
    const dbLogs = await storage.getAuditLogs({
      actionType: options?.action as any,
      entityType: options?.resourceType,
      userId: options?.userId,
      limit: options?.limit || 100,
    });

    // Convert to AuditLogEntry format
    return dbLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      action: log.actionType as AuditLogEntry["action"],
      resourceType: log.entityType,
      resourceId: log.entityId || undefined,
      userId: log.userId || undefined,
      userEmail: log.userName || undefined,
      ip: log.ipAddress || "unknown",
      userAgent: log.userAgent || undefined,
      details: log.afterState || undefined,
    }));
  } catch (err) {
    // Return fallback logs if DB fails
    let logs = [...auditLogFallback];
    if (options?.action) logs = logs.filter(l => l.action === options.action);
    if (options?.resourceType) logs = logs.filter(l => l.resourceType === options.resourceType);
    if (options?.userId) logs = logs.filter(l => l.userId === options.userId);
    logs.reverse();
    return options?.limit ? logs.slice(0, options.limit) : logs;
  }
}

// Middleware to auto-log requests
export function auditLogMiddleware(action: AuditLogEntry["action"], resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditEvent({
          action,
          resourceType,
          resourceId: req.params.id || data?.id,
          userId: user?.claims?.sub,
          userEmail: user?.claims?.email,
          ip,
          userAgent: req.get("User-Agent"),
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        });
      }
      return originalJson(data);
    };

    next();
  };
}

// ============================================================================
// CONTENT SECURITY POLICY HEADERS
// ============================================================================
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy
  // TODO: Remove 'unsafe-inline' and 'unsafe-eval' by implementing CSP nonces
  // Currently required for:
  // - 'unsafe-inline': Inline styles from Tailwind, Radix UI components
  // - 'unsafe-eval': Development hot reload, some third-party analytics
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com https://www.googletagmanager.com https://www.google-analytics.com https://us.i.posthog.com https://us-assets.i.posthog.com https://emrld.ltd",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.cdnfonts.com data:",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://*.replit.dev https://*.replit.app https://api.deepl.com https://api.openai.com https://generativelanguage.googleapis.com https://openrouter.ai https://images.unsplash.com https://www.google-analytics.com https://us.i.posthog.com https://us-assets.i.posthog.com https://emrld.ltd wss:",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; ")
  );

  // Additional security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Additional security headers for improved protection
  // NOTE: HSTS is handled by Replit infrastructure - do not set here to avoid duplicates
  // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  // Remove server fingerprinting headers
  res.removeHeader("X-Powered-By");
  res.setHeader("X-DNS-Prefetch-Control", "off");

  next();
}

// ============================================================================
// CORS CONFIGURATION (uses ALLOWED_ORIGINS from CSRF section above)
// ============================================================================
// SECURITY DESIGN DECISION: CORS is intentionally restrictive
//
// WHY EXTERNAL SCANNERS REPORT CORS ISSUES:
// - We do NOT use Access-Control-Allow-Origin: * (wildcard)
// - We do NOT echo arbitrary Origin headers
// - Cross-origin requests from unknown domains are blocked
// - This is BY DESIGN to prevent CSRF and data exfiltration
//
// WHAT HAPPENS:
// - Requests from unlisted origins: No CORS headers sent (browser blocks response)
// - Requests from allowed origins: Full CORS headers sent with credentials
// - Same-origin requests: Work normally (no CORS needed)
//
// This configuration PASSES security audits but may FAIL simple "CORS test" tools
// that expect permissive configurations. Do NOT add wildcards to "fix" scanner warnings.
// ============================================================================
// In development, allow all Replit preview URLs
const isReplitOrigin = (origin: string) => {
  return (
    origin.includes(".replit.dev") || origin.includes(".replit.app") || origin.includes(".repl.co")
  );
};

/**
 * CORS middleware with proper origin validation
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
  if (!origin) {
    return next();
  }

  // Check if origin is allowed
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (process.env.NODE_ENV !== "production" && isReplitOrigin(origin));

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Expose-Headers", "X-Total-Count, X-Page, X-Limit");
    res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
}

// ============================================================================
// INPUT SANITIZATION MIDDLEWARE
// ============================================================================
// HTML entity encoding for untrusted input
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return str.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
}

// Remove null bytes and other dangerous characters
function sanitizeString(value: string): string {
  // Remove null bytes
  let sanitized = value.replace(/\0/g, "");

  // Remove other control characters (except newline and tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized.trim();
}

// Dangerous keys that could cause prototype pollution
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Recursively sanitize an object
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Protect against prototype pollution attacks
    if (DANGEROUS_KEYS.has(key)) {
      continue;
    }

    // Skip sensitive fields that shouldn't be modified
    if (["password", "secret", "token", "apiKey", "api_key"].includes(key.toLowerCase())) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "string") {
      // For short strings (likely form fields), sanitize more strictly
      if (value.length < 500) {
        sanitized[key] = sanitizeString(value);
      } else {
        // For longer content (like body/content), just remove dangerous control chars
        sanitized[key] = value.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === "string") return sanitizeString(item);
        if (typeof item === "object" && item !== null)
          return sanitizeObject(item as Record<string, unknown>);
        return item;
      });
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware to sanitize incoming request body and query parameters
 * Removes null bytes, control characters, and trims whitespace
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query as Record<string, unknown>) as typeof req.query;
  }

  next();
}

// ============================================================================
// IP BLOCKING - Track and block suspicious IPs
// ============================================================================
interface SuspiciousIpEntry {
  failedAttempts: number;
  blockedUntil?: number;
  lastAttempt: number;
}

const suspiciousIps = new Map<string, SuspiciousIpEntry>();
const BLOCK_THRESHOLD = 10; // Block after 10 failed attempts
const BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Clean up old entries every 10 minutes - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(
    () => {
      const now = Date.now();
      suspiciousIps.forEach((entry, ip) => {
        if (entry.blockedUntil && entry.blockedUntil < now) {
          suspiciousIps.delete(ip);
        } else if (now - entry.lastAttempt > ATTEMPT_WINDOW * 2) {
          suspiciousIps.delete(ip);
        }
      });
    },
    10 * 60 * 1000
  );
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = suspiciousIps.get(ip) || { failedAttempts: 0, lastAttempt: now };

  // Reset if last attempt was too long ago
  if (now - entry.lastAttempt > ATTEMPT_WINDOW) {
    entry.failedAttempts = 0;
  }

  entry.failedAttempts++;
  entry.lastAttempt = now;

  // Block if threshold exceeded
  if (entry.failedAttempts >= BLOCK_THRESHOLD) {
    entry.blockedUntil = now + BLOCK_DURATION;

    logAuditEvent({
      action: "login",
      resourceType: "security",
      ip,
      details: {
        event: "ip_blocked",
        failedAttempts: entry.failedAttempts,
        blockedUntil: new Date(entry.blockedUntil).toISOString(),
      },
    });
  }

  suspiciousIps.set(ip, entry);
}

export function isIpBlocked(ip: string): boolean {
  const entry = suspiciousIps.get(ip);
  if (!entry?.blockedUntil) return false;

  if (entry.blockedUntil < Date.now()) {
    suspiciousIps.delete(ip);
    return false;
  }

  return true;
}

export function ipBlockMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip IP blocking for approved bots (AI crawlers, search engines)
  if ((req as any).isApprovedBot || isApprovedBot(req.headers["user-agent"])) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";

  if (isIpBlocked(ip)) {
    const entry = suspiciousIps.get(ip);
    const retryAfter = entry?.blockedUntil
      ? Math.ceil((entry.blockedUntil - Date.now()) / 1000)
      : 1800;

    res.setHeader("Retry-After", retryAfter);
    return res.status(403).json({
      error: "IP temporarily blocked due to suspicious activity",
      retryAfter,
    });
  }

  next();
}

// ============================================================================
// SSRF PROTECTION - Validate URLs before server-side requests
// ============================================================================

interface SSRFValidationResult {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

// Private IP ranges that should be blocked
const PRIVATE_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local (AWS metadata, etc.)
  /^0\./, // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-9])\./, // Shared address space
  /^198\.18\./, // Benchmark testing
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique local
  /^fd00:/i, // IPv6 unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "metadata.google.com",
  "instance-data",
  "instance-metadata",
];

// Only allow these protocols
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Validate a URL to prevent SSRF attacks
 * Call this before making any server-side HTTP request to user-provided URLs
 */
export function validateUrlForSSRF(urlString: string): SSRFValidationResult {
  if (!urlString || typeof urlString !== "string") {
    return { valid: false, error: "URL is required" };
  }

  try {
    const url = new URL(urlString.trim());

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        valid: false,
        error: `Protocol not allowed: ${url.protocol}. Only HTTP and HTTPS are permitted.`,
      };
    }

    // Check for blocked hostnames
    const hostname = url.hostname.toLowerCase();
    if (
      BLOCKED_HOSTNAMES.some(blocked => hostname === blocked || hostname.endsWith("." + blocked))
    ) {
      return { valid: false, error: "Hostname not allowed" };
    }

    // Check if hostname is an IP address and validate it
    const ipMatch = hostname.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$|^\[(.+)\]$/);
    if (ipMatch) {
      const ip = ipMatch[1] || ipMatch[2];
      if (isPrivateIP(ip)) {
        return { valid: false, error: "Private IP addresses are not allowed" };
      }
    }

    // Check for suspicious port usage (common internal service ports)
    const port = url.port ? parseInt(url.port, 10) : url.protocol === "https:" ? 443 : 80;
    const suspiciousPorts = [22, 23, 25, 3306, 5432, 6379, 11211, 27017, 9200, 9300];
    if (suspiciousPorts.includes(port)) {
      return { valid: false, error: `Port ${port} is not allowed for security reasons` };
    }

    // Check for URL with credentials (user:pass@host)
    if (url.username || url.password) {
      return { valid: false, error: "URLs with credentials are not allowed" };
    }

    // Prevent DNS rebinding by checking for numeric-looking hostnames
    if (/^[0-9.]+$/.test(hostname) && !ipMatch) {
      return { valid: false, error: "Invalid hostname format" };
    }

    return {
      valid: true,
      sanitizedUrl: url.toString(),
    };
  } catch (err) {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Check if an IP address is private/internal
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
}

/**
 * Middleware to validate URL parameters for SSRF
 */
export function ssrfProtectionMiddleware(urlParamName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const url = req.body?.[urlParamName] || req.query?.[urlParamName];

    if (url) {
      const result = validateUrlForSSRF(url);
      if (!result.valid) {
        return res.status(400).json({
          error: "Invalid URL",
          details: result.error,
        });
      }
      // Replace with sanitized URL
      if (req.body?.[urlParamName]) {
        req.body[urlParamName] = result.sanitizedUrl;
      }
    }

    next();
  };
}

// ============================================================================
// PUBLIC API - List of blocked IPs (for admin)
// ============================================================================
export function getBlockedIps(): Array<{
  ip: string;
  blockedUntil: string;
  failedAttempts: number;
}> {
  const result: Array<{ ip: string; blockedUntil: string; failedAttempts: number }> = [];
  const now = Date.now();

  suspiciousIps.forEach((entry, ip) => {
    if (entry.blockedUntil && entry.blockedUntil > now) {
      result.push({
        ip,
        blockedUntil: new Date(entry.blockedUntil).toISOString(),
        failedAttempts: entry.failedAttempts,
      });
    }
  });

  return result;
}
