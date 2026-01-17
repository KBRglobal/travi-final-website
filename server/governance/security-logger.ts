/**
 * Security Event Logger
 * Immutable audit trail for all sensitive operations
 */

import { db } from "../db";
import { governanceAuditLogs, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import {
  SecurityEvent,
  SecurityEventType,
  SeverityLevel,
  Resource,
  Action,
} from "./types";

// ============================================================================
// EVENT SEVERITY MAPPING
// ============================================================================

const EVENT_SEVERITY: Record<SecurityEventType, SeverityLevel> = {
  // Authentication - mostly medium, failures are high
  login_success: "low",
  login_failure: "high",
  logout: "low",
  session_expired: "low",
  mfa_enabled: "medium",
  mfa_disabled: "high",
  mfa_challenge_success: "low",
  mfa_challenge_failure: "high",
  password_changed: "medium",
  password_reset_requested: "medium",
  // Authorization
  permission_denied: "medium",
  permission_granted: "low",
  role_assigned: "medium",
  role_revoked: "medium",
  policy_violated: "high",
  // Data access
  data_accessed: "low",
  data_exported: "medium",
  data_deleted: "high",
  bulk_operation: "medium",
  // Admin
  user_created: "medium",
  user_updated: "medium",
  user_deleted: "high",
  user_activated: "medium",
  user_deactivated: "medium",
  role_created: "high",
  role_updated: "high",
  role_deleted: "critical",
  policy_created: "high",
  policy_updated: "high",
  policy_deleted: "critical",
  // System
  config_changed: "high",
  integration_connected: "medium",
  integration_disconnected: "medium",
  api_key_created: "high",
  api_key_revoked: "high",
  // Approvals
  approval_requested: "low",
  approval_granted: "medium",
  approval_denied: "medium",
  approval_escalated: "high",
  approval_expired: "medium",
};

// ============================================================================
// COMPLIANCE TAGS
// ============================================================================

const GDPR_RELEVANT_EVENTS: SecurityEventType[] = [
  "data_accessed",
  "data_exported",
  "data_deleted",
  "user_created",
  "user_updated",
  "user_deleted",
  "password_changed",
  "permission_granted",
  "role_assigned",
  "role_revoked",
];

const SOC2_RELEVANT_EVENTS: SecurityEventType[] = [
  "login_success",
  "login_failure",
  "mfa_enabled",
  "mfa_disabled",
  "permission_denied",
  "policy_violated",
  "config_changed",
  "role_created",
  "role_updated",
  "role_deleted",
];

// ============================================================================
// SECURITY EVENT LOGGER CLASS
// ============================================================================

class SecurityEventLogger {
  private lastEventHash: string | null = null;
  private eventBuffer: SecurityEvent[] = [];
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startFlushTimer();
  }

  /**
   * Log a security event
   */
  async log(event: Omit<SecurityEvent, "id" | "timestamp" | "eventHash" | "previousEventHash" | "isCompliant" | "complianceTags">): Promise<SecurityEvent> {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
      severity: event.severity || EVENT_SEVERITY[event.eventType] || "medium",
      isCompliant: true,
      complianceTags: this.getComplianceTags(event.eventType),
      previousEventHash: this.lastEventHash || undefined,
      eventHash: "", // Will be computed
    };

    // Compute event hash for chain integrity
    fullEvent.eventHash = this.computeEventHash(fullEvent);
    this.lastEventHash = fullEvent.eventHash;

    // Add to buffer
    this.eventBuffer.push(fullEvent);

    // Flush if buffer is full or event is critical
    if (this.eventBuffer.length >= this.BUFFER_SIZE || fullEvent.severity === "critical") {
      await this.flush();
    }

    return fullEvent;
  }

  /**
   * Log authentication event
   */
  async logAuth(params: {
    eventType: SecurityEventType;
    userId?: string;
    userName?: string;
    success: boolean;
    details: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SecurityEvent> {
    return this.log({
      eventType: params.eventType,
      severity: EVENT_SEVERITY[params.eventType],
      userId: params.userId,
      userName: params.userName,
      success: params.success,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      sessionId: params.sessionId,
      metadata: params.metadata,
    });
  }

  /**
   * Log authorization event
   */
  async logAuthz(params: {
    eventType: "permission_denied" | "permission_granted" | "role_assigned" | "role_revoked" | "policy_violated";
    userId: string;
    userName?: string;
    userRole?: string;
    action: Action;
    resource: Resource;
    resourceId?: string;
    success: boolean;
    details: string;
    targetUserId?: string;
    targetUserName?: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SecurityEvent> {
    return this.log({
      eventType: params.eventType,
      severity: EVENT_SEVERITY[params.eventType],
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      targetUserId: params.targetUserId,
      targetUserName: params.targetUserName,
      success: params.success,
      details: params.details,
      ipAddress: params.ipAddress,
      metadata: params.metadata,
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(params: {
    eventType: "data_accessed" | "data_exported" | "data_deleted" | "bulk_operation";
    userId: string;
    userName?: string;
    resource: Resource;
    resourceId?: string;
    action: Action;
    details: string;
    recordCount?: number;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SecurityEvent> {
    return this.log({
      eventType: params.eventType,
      severity: EVENT_SEVERITY[params.eventType],
      userId: params.userId,
      userName: params.userName,
      resource: params.resource,
      resourceId: params.resourceId,
      action: params.action,
      success: true,
      details: params.details,
      ipAddress: params.ipAddress,
      metadata: {
        ...params.metadata,
        recordCount: params.recordCount,
      },
    });
  }

  /**
   * Log admin action
   */
  async logAdmin(params: {
    eventType: SecurityEventType;
    userId: string;
    userName?: string;
    userRole?: string;
    targetUserId?: string;
    targetUserName?: string;
    resource?: Resource;
    resourceId?: string;
    details: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SecurityEvent> {
    return this.log({
      eventType: params.eventType,
      severity: EVENT_SEVERITY[params.eventType],
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      targetUserId: params.targetUserId,
      targetUserName: params.targetUserName,
      resource: params.resource,
      resourceId: params.resourceId,
      success: true,
      details: params.details,
      metadata: {
        ...params.metadata,
        beforeState: params.beforeState,
        afterState: params.afterState,
      },
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Log approval workflow event
   */
  async logApproval(params: {
    eventType: "approval_requested" | "approval_granted" | "approval_denied" | "approval_escalated" | "approval_expired";
    userId: string;
    userName?: string;
    resource: Resource;
    resourceId: string;
    approvalRequestId: string;
    decision?: string;
    reason?: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SecurityEvent> {
    return this.log({
      eventType: params.eventType,
      severity: EVENT_SEVERITY[params.eventType],
      userId: params.userId,
      userName: params.userName,
      resource: params.resource,
      resourceId: params.resourceId,
      success: true,
      details: params.reason || `Approval ${params.eventType.replace("approval_", "")} for ${params.resource} ${params.resourceId}`,
      metadata: {
        ...params.metadata,
        approvalRequestId: params.approvalRequestId,
        decision: params.decision,
      },
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Flush buffered events to database
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      for (const event of eventsToFlush) {
        await this.persistEvent(event);
      }
    } catch (error) {
      console.error("[SecurityLogger] Error flushing events:", error);
      // Re-add failed events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Persist event to database
   */
  private async persistEvent(event: SecurityEvent): Promise<void> {
    await db.insert(governanceAuditLogs).values({
      userId: event.userId,
      userRole: event.userRole,
      action: event.eventType,
      resource: event.resource || "system",
      resourceId: event.resourceId,
      beforeSnapshot: event.metadata?.beforeState ? JSON.stringify(event.metadata.beforeState) : undefined,
      afterSnapshot: event.metadata?.afterState ? JSON.stringify(event.metadata.afterState) : undefined,
      snapshotHash: event.eventHash,
      source: "security_logger",
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      sessionId: event.sessionId,
      metadata: {
        severity: event.severity,
        success: event.success,
        details: event.details,
        targetUserId: event.targetUserId,
        targetUserName: event.targetUserName,
        complianceTags: event.complianceTags,
        previousEventHash: event.previousEventHash,
        requestId: event.requestId,
        ...event.metadata,
      },
    } as any);
  }

  /**
   * Compute hash for event chain integrity
   */
  private computeEventHash(event: SecurityEvent): string {
    const data = JSON.stringify({
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      userId: event.userId,
      resource: event.resource,
      resourceId: event.resourceId,
      action: event.action,
      details: event.details,
      previousHash: event.previousEventHash,
    });
    return createHash("sha256").update(data).digest("hex");
  }

  /**
   * Get compliance tags for event type
   */
  private getComplianceTags(eventType: SecurityEventType): string[] {
    const tags: string[] = [];
    if (GDPR_RELEVANT_EVENTS.includes(eventType)) {
      tags.push("GDPR");
    }
    if (SOC2_RELEVANT_EVENTS.includes(eventType)) {
      tags.push("SOC2");
    }
    return tags;
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Verify event chain integrity
   */
  async verifyChainIntegrity(fromDate: Date, toDate: Date): Promise<{
    valid: boolean;
    brokenAt?: Date;
    totalEvents: number;
    verifiedEvents: number;
  }> {
    const events = await db
      .select()
      .from(governanceAuditLogs)
      .where(
        // @ts-ignore
        and(
          gte(governanceAuditLogs.createdAt, fromDate),
          lte(governanceAuditLogs.createdAt, toDate)
        )
      )
      .orderBy(governanceAuditLogs.createdAt);

    let previousHash: string | null = null;
    let verifiedEvents = 0;

    for (const event of events) {
      const metadata = event.metadata as Record<string, unknown> | null;
      const currentPreviousHash = metadata?.previousEventHash as string | undefined;

      if (previousHash !== null && currentPreviousHash !== previousHash) {
        return {
          valid: false,
          brokenAt: event.createdAt,
          totalEvents: events.length,
          verifiedEvents,
        };
      }

      previousHash = event.snapshotHash;
      verifiedEvents++;
    }

    return {
      valid: true,
      totalEvents: events.length,
      verifiedEvents,
    };
  }
}

// Import missing drizzle operators
import { and, gte, lte } from "drizzle-orm";

// Singleton instance
export const securityLogger = new SecurityEventLogger();

// Convenience functions
export const logAuthEvent = securityLogger.logAuth.bind(securityLogger);
export const logAuthzEvent = securityLogger.logAuthz.bind(securityLogger);
export const logDataAccessEvent = securityLogger.logDataAccess.bind(securityLogger);
export const logAdminEvent = securityLogger.logAdmin.bind(securityLogger);
export const logApprovalEvent = securityLogger.logApproval.bind(securityLogger);

console.log("[Governance] Security Logger loaded");
