/**
 * Data Exfiltration Prevention System
 *
 * Guards against:
 * - Bulk data exports
 * - API scraping
 * - Clipboard/download abuse
 * - Unusual data access patterns
 * - Rate limit bypasses
 */

import type { Request, Response, NextFunction } from "express";
import { AdminRole, ROLE_HIERARCHY } from "../../governance/types";
import { logDataAccessEvent } from "../../governance/security-logger";

// ============================================================================
// TYPES
// ============================================================================

export interface ExfiltrationCheck {
  allowed: boolean;
  blocked: boolean;
  reason?: string;
  riskScore: number;
  limits: DataLimit[];
  recommendations: string[];
}

export interface DataLimit {
  type: "records" | "bytes" | "requests" | "time_window";
  current: number;
  limit: number;
  exceeded: boolean;
}

export interface ExfiltrationRule {
  id: string;
  name: string;
  description: string;
  resourceType: string;
  maxRecordsPerRequest: number;
  maxRecordsPerHour: number;
  maxRecordsPerDay: number;
  maxBytesPerRequest: number;
  maxBytesPerHour: number;
  maxRequestsPerMinute: number;
  requiresApproval: boolean;
  allowedRoles: AdminRole[];
  sensitivityLevel: "public" | "internal" | "confidential" | "restricted";
}

export interface DataAccessLog {
  userId: string;
  resourceType: string;
  recordCount: number;
  byteCount: number;
  timestamp: Date;
  operation: "read" | "export" | "download" | "api";
  destination?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_RULES: ExfiltrationRule[] = [
  {
    id: "users_data",
    name: "User Data Protection",
    description: "Prevents bulk export of user data",
    resourceType: "users",
    maxRecordsPerRequest: 50,
    maxRecordsPerHour: 500,
    maxRecordsPerDay: 2000,
    maxBytesPerRequest: 1024 * 1024, // 1MB
    maxBytesPerHour: 10 * 1024 * 1024, // 10MB
    maxRequestsPerMinute: 10,
    requiresApproval: true,
    allowedRoles: ["super_admin", "system_admin", "manager"],
    sensitivityLevel: "confidential",
  },
  {
    id: "revenue_data",
    name: "Revenue Data Protection",
    description: "Prevents bulk export of financial data",
    resourceType: "revenue",
    maxRecordsPerRequest: 100,
    maxRecordsPerHour: 1000,
    maxRecordsPerDay: 5000,
    maxBytesPerRequest: 5 * 1024 * 1024, // 5MB
    maxBytesPerHour: 50 * 1024 * 1024, // 50MB
    maxRequestsPerMinute: 5,
    requiresApproval: true,
    allowedRoles: ["super_admin", "manager", "analyst"],
    sensitivityLevel: "confidential",
  },
  {
    id: "content_data",
    name: "Content Data Protection",
    description: "Rate limits content access",
    resourceType: "content",
    maxRecordsPerRequest: 200,
    maxRecordsPerHour: 5000,
    maxRecordsPerDay: 20000,
    maxBytesPerRequest: 20 * 1024 * 1024, // 20MB
    maxBytesPerHour: 200 * 1024 * 1024, // 200MB
    maxRequestsPerMinute: 30,
    requiresApproval: false,
    allowedRoles: ["super_admin", "system_admin", "manager", "editor"],
    sensitivityLevel: "internal",
  },
  {
    id: "audit_logs",
    name: "Audit Log Protection",
    description: "Prevents bulk export of audit logs",
    resourceType: "audit",
    maxRecordsPerRequest: 1000,
    maxRecordsPerHour: 10000,
    maxRecordsPerDay: 50000,
    maxBytesPerRequest: 50 * 1024 * 1024, // 50MB
    maxBytesPerHour: 500 * 1024 * 1024, // 500MB
    maxRequestsPerMinute: 10,
    requiresApproval: true,
    allowedRoles: ["super_admin", "system_admin"],
    sensitivityLevel: "restricted",
  },
  {
    id: "analytics_data",
    name: "Analytics Protection",
    description: "Rate limits analytics access",
    resourceType: "analytics",
    maxRecordsPerRequest: 10000,
    maxRecordsPerHour: 100000,
    maxRecordsPerDay: 500000,
    maxBytesPerRequest: 100 * 1024 * 1024, // 100MB
    maxBytesPerHour: 1024 * 1024 * 1024, // 1GB
    maxRequestsPerMinute: 20,
    requiresApproval: false,
    allowedRoles: ["super_admin", "system_admin", "manager", "analyst"],
    sensitivityLevel: "internal",
  },
];

// ============================================================================
// ACCESS TRACKING
// ============================================================================

class AccessTracker {
  private logs: DataAccessLog[] = [];
  private readonly maxLogs = 100000;
  private readonly retentionHours = 72;

  record(log: DataAccessLog): void {
    this.logs.push(log);
    this.cleanup();
  }

  getAccessLogs(userId: string, resourceType: string, hours: number): DataAccessLog[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter(
      l => l.userId === userId && l.resourceType === resourceType && l.timestamp >= since
    );
  }

  getRecordCount(userId: string, resourceType: string, hours: number): number {
    const logs = this.getAccessLogs(userId, resourceType, hours);
    return logs.reduce((sum, l) => sum + l.recordCount, 0);
  }

  getByteCount(userId: string, resourceType: string, hours: number): number {
    const logs = this.getAccessLogs(userId, resourceType, hours);
    return logs.reduce((sum, l) => sum + l.byteCount, 0);
  }

  getRequestCount(userId: string, resourceType: string, minutes: number): number {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(
      l => l.userId === userId && l.resourceType === resourceType && l.timestamp >= since
    ).length;
  }

  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.retentionHours * 60 * 60 * 1000);
    this.logs = this.logs.filter(l => l.timestamp >= cutoff);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}

const accessTracker = new AccessTracker();

// ============================================================================
// EXFILTRATION GUARD
// ============================================================================

class ExfiltrationGuard {
  private rules: Map<string, ExfiltrationRule> = new Map();
  private blockedAttempts: Map<string, number> = new Map();

  constructor() {
    for (const rule of DEFAULT_RULES) {
      this.rules.set(rule.resourceType, rule);
    }
  }

  /**
   * Check if data access should be allowed
   */
  async checkAccess(
    userId: string,
    userRole: AdminRole,
    resourceType: string,
    operation: "read" | "export" | "download" | "api",
    requestedRecords: number,
    estimatedBytes: number
  ): Promise<ExfiltrationCheck> {
    const rule = this.rules.get(resourceType);
    const limits: DataLimit[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    if (!rule) {
      // No rule = allow with warning
      return {
        allowed: true,
        blocked: false,
        riskScore: 10,
        limits: [],
        recommendations: ["Consider adding exfiltration rules for this resource type"],
      };
    }

    // Check role authorization
    if (!rule.allowedRoles.includes(userRole)) {
      return {
        allowed: false,
        blocked: true,
        reason: `Role ${userRole} not authorized for ${resourceType} access`,
        riskScore: 80,
        limits: [],
        recommendations: ["Request elevated permissions for this data type"],
      };
    }

    // Check per-request limits
    const recordLimitExceeded = requestedRecords > rule.maxRecordsPerRequest;
    limits.push({
      type: "records",
      current: requestedRecords,
      limit: rule.maxRecordsPerRequest,
      exceeded: recordLimitExceeded,
    });

    if (recordLimitExceeded) {
      riskScore += 30;
      recommendations.push(`Reduce request size to ${rule.maxRecordsPerRequest} records or less`);
    }

    const byteLimitExceeded = estimatedBytes > rule.maxBytesPerRequest;
    limits.push({
      type: "bytes",
      current: estimatedBytes,
      limit: rule.maxBytesPerRequest,
      exceeded: byteLimitExceeded,
    });

    if (byteLimitExceeded) {
      riskScore += 20;
      recommendations.push("Reduce data size or use pagination");
    }

    // Check hourly limits
    const recordsThisHour = accessTracker.getRecordCount(userId, resourceType, 1);
    const hourlyRecordExceeded = recordsThisHour + requestedRecords > rule.maxRecordsPerHour;

    if (hourlyRecordExceeded) {
      riskScore += 40;
      recommendations.push(
        `Wait until hourly limit resets (${rule.maxRecordsPerHour - recordsThisHour} records remaining)`
      );
    }

    // Check daily limits
    const recordsToday = accessTracker.getRecordCount(userId, resourceType, 24);
    const dailyRecordExceeded = recordsToday + requestedRecords > rule.maxRecordsPerDay;

    if (dailyRecordExceeded) {
      riskScore += 50;
      recommendations.push("Daily data access limit reached");
    }

    // Check rate limits
    const requestsThisMinute = accessTracker.getRequestCount(userId, resourceType, 1);
    const rateLimitExceeded = requestsThisMinute >= rule.maxRequestsPerMinute;

    limits.push({
      type: "requests",
      current: requestsThisMinute,
      limit: rule.maxRequestsPerMinute,
      exceeded: rateLimitExceeded,
    });

    if (rateLimitExceeded) {
      riskScore += 30;
      recommendations.push("Slow down request rate");
    }

    // Add sensitivity risk
    switch (rule.sensitivityLevel) {
      case "restricted":
        riskScore += 20;
        break;
      case "confidential":
        riskScore += 15;
        break;
      case "internal":
        riskScore += 5;
        break;
    }

    // Export operations are riskier
    if (operation === "export" || operation === "download") {
      riskScore += 15;
    }

    // Determine if blocked
    const blocked =
      recordLimitExceeded ||
      byteLimitExceeded ||
      hourlyRecordExceeded ||
      dailyRecordExceeded ||
      rateLimitExceeded;

    const requiresApproval = rule.requiresApproval && operation === "export";

    // Generate reason
    let reason: string | undefined;
    if (blocked) {
      if (rateLimitExceeded) {
        reason = "Rate limit exceeded";
      } else if (dailyRecordExceeded) {
        reason = "Daily data access limit exceeded";
      } else if (hourlyRecordExceeded) {
        reason = "Hourly data access limit exceeded";
      } else if (recordLimitExceeded) {
        reason = "Request exceeds maximum record limit";
      } else if (byteLimitExceeded) {
        reason = "Request exceeds maximum data size";
      }

      // Track blocked attempt
      const key = `${userId}:${resourceType}`;
      this.blockedAttempts.set(key, (this.blockedAttempts.get(key) || 0) + 1);
    }

    return {
      allowed: !blocked && !requiresApproval,
      blocked,
      reason,
      riskScore: Math.min(100, riskScore),
      limits,
      recommendations,
    };
  }

  /**
   * Record a data access
   */
  recordAccess(
    userId: string,
    resourceType: string,
    recordCount: number,
    byteCount: number,
    operation: "read" | "export" | "download" | "api",
    destination?: string
  ): void {
    accessTracker.record({
      userId,
      resourceType,
      recordCount,
      byteCount,
      timestamp: new Date(),
      operation,
      destination,
    });

    // Log sensitive access
    const rule = this.rules.get(resourceType);
    if (
      rule &&
      (rule.sensitivityLevel === "confidential" || rule.sensitivityLevel === "restricted")
    ) {
      logDataAccessEvent(userId, operation.toUpperCase(), resourceType, `${recordCount} records`, {
        byteCount,
        sensitivityLevel: rule.sensitivityLevel,
        destination,
      });
    }
  }

  /**
   * Get access statistics for user
   */
  getAccessStats(userId: string): {
    resources: Record<
      string,
      {
        recordsToday: number;
        bytesToday: number;
        limitPercent: number;
      }
    >;
    blockedAttempts: number;
  } {
    const stats: Record<
      string,
      { recordsToday: number; bytesToday: number; limitPercent: number }
    > = {};

    let totalBlocked = 0;

    for (const [resourceType, rule] of this.rules) {
      const recordsToday = accessTracker.getRecordCount(userId, resourceType, 24);
      const bytesToday = accessTracker.getByteCount(userId, resourceType, 24);

      stats[resourceType] = {
        recordsToday,
        bytesToday,
        limitPercent: Math.round((recordsToday / rule.maxRecordsPerDay) * 100),
      };

      const key = `${userId}:${resourceType}`;
      totalBlocked += this.blockedAttempts.get(key) || 0;
    }

    return {
      resources: stats,
      blockedAttempts: totalBlocked,
    };
  }

  /**
   * Add custom rule
   */
  addRule(rule: ExfiltrationRule): void {
    this.rules.set(rule.resourceType, rule);
  }

  /**
   * Get all rules
   */
  getRules(): ExfiltrationRule[] {
    return [...this.rules.values()];
  }

  /**
   * Detect potential exfiltration patterns
   */
  detectExfiltrationPatterns(hours: number = 24): {
    userId: string;
    resourceType: string;
    pattern: string;
    severity: "low" | "medium" | "high" | "critical";
    details: string;
  }[] {
    const patterns: ReturnType<typeof this.detectExfiltrationPatterns> = [];

    // Aggregate access by user and resource
    const userAccess = new Map<
      string,
      Map<string, { records: number; bytes: number; requests: number }>
    >();

    for (const rule of this.rules.values()) {
      // Check each user's access patterns
      // In real implementation, would iterate through actual users
    }

    // Check for suspicious patterns in blocked attempts
    for (const [key, count] of this.blockedAttempts) {
      if (count >= 5) {
        const [userId, resourceType] = key.split(":");
        patterns.push({
          userId,
          resourceType,
          pattern: "repeated_limit_violations",
          severity: count >= 10 ? "high" : "medium",
          details: `${count} blocked access attempts`,
        });
      }
    }

    return patterns;
  }

  /**
   * Get exfiltration risk score for user
   */
  getUserRiskScore(userId: string): {
    score: number;
    factors: { name: string; value: number }[];
  } {
    const factors: { name: string; value: number }[] = [];
    let score = 0;

    // Check access across all resources
    for (const [resourceType, rule] of this.rules) {
      const recordsToday = accessTracker.getRecordCount(userId, resourceType, 24);
      const bytesToday = accessTracker.getByteCount(userId, resourceType, 24);

      const recordPercent = (recordsToday / rule.maxRecordsPerDay) * 100;
      const bytePercent = (bytesToday / (rule.maxBytesPerHour * 24)) * 100;

      if (recordPercent > 80) {
        factors.push({
          name: `${resourceType}_high_record_usage`,
          value: recordPercent,
        });
        score += 20;
      }

      if (bytePercent > 80) {
        factors.push({
          name: `${resourceType}_high_byte_usage`,
          value: bytePercent,
        });
        score += 15;
      }

      // Check blocked attempts
      const key = `${userId}:${resourceType}`;
      const blocked = this.blockedAttempts.get(key) || 0;
      if (blocked > 0) {
        factors.push({
          name: `${resourceType}_blocked_attempts`,
          value: blocked,
        });
        score += blocked * 10;
      }
    }

    return {
      score: Math.min(100, score),
      factors,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const exfiltrationGuard = new ExfiltrationGuard();

/**
 * Check if data access should be allowed
 */
export async function checkDataAccess(
  userId: string,
  userRole: AdminRole,
  resourceType: string,
  operation: "read" | "export" | "download" | "api",
  requestedRecords: number,
  estimatedBytes: number
): Promise<ExfiltrationCheck> {
  return exfiltrationGuard.checkAccess(
    userId,
    userRole,
    resourceType,
    operation,
    requestedRecords,
    estimatedBytes
  );
}

/**
 * Record a data access
 */
export function recordDataAccess(
  userId: string,
  resourceType: string,
  recordCount: number,
  byteCount: number,
  operation: "read" | "export" | "download" | "api"
): void {
  exfiltrationGuard.recordAccess(userId, resourceType, recordCount, byteCount, operation);
}

/**
 * Middleware to check exfiltration
 */
export function exfiltrationMiddleware(resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const extReq = req as Request & { user?: { id?: string; role?: string } };
    const userId = extReq.user?.id;
    const userRole = extReq.user?.role || "viewer";

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Estimate records and bytes from query
    const limitParam = req.query.limit;
    const limit = parseInt(typeof limitParam === "string" ? limitParam : "100") || 100;
    const estimatedBytes = limit * 1024; // Rough estimate

    const check = await checkDataAccess(
      userId,
      userRole,
      resourceType,
      req.query.export ? "export" : "read",
      limit,
      estimatedBytes
    );

    if (check.blocked) {
      return res.status(429).json({
        error: "Data access limit exceeded",
        reason: check.reason,
        limits: check.limits,
        recommendations: check.recommendations,
      });
    }

    // Attach check to request for logging after response
    (req as Request & { exfiltrationCheck?: ExfiltrationCheck }).exfiltrationCheck = check;
    next();
  };
}
