/**
 * Security Audit Logger
 *
 * Comprehensive security event logging with:
 * - Severity levels
 * - PII masking
 * - Integration with audit_logs table
 * - IP and User-Agent tracking
 */

import { storage } from "../storage";
import type { Request } from "express";

/**
 * Security event types
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = "login_success",
  LOGIN_FAILED = "login_failed",
  LOGOUT = "logout",
  PASSWORD_CHANGE = "password_change",
  PASSWORD_RESET_REQUEST = "password_reset_request",
  PASSWORD_RESET_SUCCESS = "password_reset_success",
  ACCOUNT_LOCKED = "account_locked",
  ACCOUNT_UNLOCKED = "account_unlocked",
  PERMISSION_DENIED = "permission_denied",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  SQL_INJECTION_ATTEMPT = "sql_injection_attempt",
  XSS_ATTEMPT = "xss_attempt",
  FILE_UPLOAD_REJECTED = "file_upload_rejected",
  INVALID_TOKEN = "invalid_token",
  SESSION_HIJACK_ATTEMPT = "session_hijack_attempt",
  BRUTE_FORCE_ATTEMPT = "brute_force_attempt",
  IP_BLOCKED = "ip_blocked",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  DATA_EXPORT = "data_export",
  SETTINGS_CHANGED = "settings_changed",
  USER_CREATED = "user_created",
  USER_DELETED = "user_deleted",
  ROLE_CHANGED = "role_changed",
}

/**
 * Security severity levels
 */
export enum SecuritySeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Security event data
 */
export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  userName?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

function maskEmail(data: string): string {
  const [localPart, domain] = data.split("@");
  if (!localPart || !domain) return "[masked]";
  const maskedLocal = localPart.length > 2 ? localPart.substring(0, 2) + "***" : "***";
  return `${maskedLocal}@${domain}`;
}

function maskPhone(data: string): string {
  const digits = data.replaceAll(/\D/g, "");
  return digits.length < 4 ? "***" : "***" + digits.slice(-4);
}

function maskIp(data: string): string {
  if (data.includes(".")) {
    const parts = data.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  } else if (data.includes(":")) {
    const parts = data.split(":");
    if (parts.length > 2) return parts.slice(0, -2).join(":") + ":***:***";
  }
  return "[masked]";
}

/**
 * Mask PII data for logging
 */
export function maskPii(data: string, type: "email" | "phone" | "ip"): string {
  if (!data) return "[masked]";

  const maskers: Record<string, (d: string) => string> = {
    email: maskEmail,
    phone: maskPhone,
    ip: maskIp,
  };
  return (maskers[type] ?? (() => "[masked]"))(data);
}

/**
 * Get severity for event type
 */
function getSeverityForEventType(type: SecurityEventType): SecuritySeverity {
  const severityMap: Record<SecurityEventType, SecuritySeverity> = {
    [SecurityEventType.LOGIN_SUCCESS]: SecuritySeverity.LOW,
    [SecurityEventType.LOGIN_FAILED]: SecuritySeverity.MEDIUM,
    [SecurityEventType.LOGOUT]: SecuritySeverity.LOW,
    [SecurityEventType.PASSWORD_CHANGE]: SecuritySeverity.MEDIUM,
    [SecurityEventType.PASSWORD_RESET_REQUEST]: SecuritySeverity.MEDIUM,
    [SecurityEventType.PASSWORD_RESET_SUCCESS]: SecuritySeverity.MEDIUM,
    [SecurityEventType.ACCOUNT_LOCKED]: SecuritySeverity.HIGH,
    [SecurityEventType.ACCOUNT_UNLOCKED]: SecuritySeverity.MEDIUM,
    [SecurityEventType.PERMISSION_DENIED]: SecuritySeverity.MEDIUM,
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: SecuritySeverity.MEDIUM,
    [SecurityEventType.SUSPICIOUS_ACTIVITY]: SecuritySeverity.HIGH,
    [SecurityEventType.SQL_INJECTION_ATTEMPT]: SecuritySeverity.CRITICAL,
    [SecurityEventType.XSS_ATTEMPT]: SecuritySeverity.CRITICAL,
    [SecurityEventType.FILE_UPLOAD_REJECTED]: SecuritySeverity.MEDIUM,
    [SecurityEventType.INVALID_TOKEN]: SecuritySeverity.MEDIUM,
    [SecurityEventType.SESSION_HIJACK_ATTEMPT]: SecuritySeverity.CRITICAL,
    [SecurityEventType.BRUTE_FORCE_ATTEMPT]: SecuritySeverity.HIGH,
    [SecurityEventType.IP_BLOCKED]: SecuritySeverity.HIGH,
    [SecurityEventType.UNAUTHORIZED_ACCESS]: SecuritySeverity.HIGH,
    [SecurityEventType.DATA_EXPORT]: SecuritySeverity.MEDIUM,
    [SecurityEventType.SETTINGS_CHANGED]: SecuritySeverity.MEDIUM,
    [SecurityEventType.USER_CREATED]: SecuritySeverity.LOW,
    [SecurityEventType.USER_DELETED]: SecuritySeverity.MEDIUM,
    [SecurityEventType.ROLE_CHANGED]: SecuritySeverity.MEDIUM,
  };

  return severityMap[type] || SecuritySeverity.MEDIUM;
}

/**
 * Map security event type to audit action type
 */
function mapToAuditActionType(type: SecurityEventType): string {
  const actionMap: Record<SecurityEventType, string> = {
    [SecurityEventType.LOGIN_SUCCESS]: "login",
    [SecurityEventType.LOGIN_FAILED]: "login",
    [SecurityEventType.LOGOUT]: "logout",
    [SecurityEventType.PASSWORD_CHANGE]: "update",
    [SecurityEventType.PASSWORD_RESET_REQUEST]: "update",
    [SecurityEventType.PASSWORD_RESET_SUCCESS]: "update",
    [SecurityEventType.ACCOUNT_LOCKED]: "update",
    [SecurityEventType.ACCOUNT_UNLOCKED]: "update",
    [SecurityEventType.PERMISSION_DENIED]: "update",
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: "update",
    [SecurityEventType.SUSPICIOUS_ACTIVITY]: "update",
    [SecurityEventType.SQL_INJECTION_ATTEMPT]: "update",
    [SecurityEventType.XSS_ATTEMPT]: "update",
    [SecurityEventType.FILE_UPLOAD_REJECTED]: "update",
    [SecurityEventType.INVALID_TOKEN]: "update",
    [SecurityEventType.SESSION_HIJACK_ATTEMPT]: "update",
    [SecurityEventType.BRUTE_FORCE_ATTEMPT]: "update",
    [SecurityEventType.IP_BLOCKED]: "update",
    [SecurityEventType.UNAUTHORIZED_ACCESS]: "update",
    [SecurityEventType.DATA_EXPORT]: "update",
    [SecurityEventType.SETTINGS_CHANGED]: "settings_change",
    [SecurityEventType.USER_CREATED]: "user_create",
    [SecurityEventType.USER_DELETED]: "user_delete",
    [SecurityEventType.ROLE_CHANGED]: "role_change",
  };

  return actionMap[type] || "update";
}

/**
 * Log security event
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const severity = event.severity || getSeverityForEventType(event.type);

    // Prepare details with masked PII
    const maskedDetails = { ...event.details };
    if (event.userEmail) {
      maskedDetails.userEmail = maskPii(event.userEmail, "email");
    }

    // Log to database
    await storage.createAuditLog({
      userId: event.userId,
      userName: event.userName,
      actionType: mapToAuditActionType(event.type) as any,
      entityType: "session",
      entityId: event.userId,
      description:
        event.type +
        ": " +
        (event.success ? "Success" : "Failed") +
        (event.errorMessage ? " - " + event.errorMessage : ""),
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      afterState: {
        eventType: event.type,
        severity,
        success: event.success,
        resource: event.resource,
        action: event.action,
        ...maskedDetails,
      },
    });
  } catch {
    void 0; // Don't fail the request if logging fails
  }
}

/**
 * Log security event from request
 */
export async function logSecurityEventFromRequest(
  req: Request,
  type: SecurityEventType,
  options: {
    success: boolean;
    resource?: string;
    action?: string;
    details?: Record<string, unknown>;
    errorMessage?: string;
  }
): Promise<void> {
  const user = (req as any).user;
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.get("User-Agent");

  await logSecurityEvent({
    type,
    severity: getSeverityForEventType(type),
    userId: user?.claims?.sub,
    userName: user?.claims?.name,
    userEmail: user?.claims?.email,
    ipAddress,
    userAgent,
    ...options,
  });
}

/**
 * Get security events from audit logs
 */
export async function getSecurityEvents(filters?: {
  severity?: SecuritySeverity;
  type?: SecurityEventType;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<any[]> {
  try {
    // Query audit logs for security events
    const logs = await storage.getAuditLogs({
      userId: filters?.userId,
      limit: filters?.limit || 100,
    });

    // Filter by security event criteria
    let filtered = logs.filter(log => {
      const afterState = log.afterState as any;
      return afterState?.eventType;
    });

    if (filters?.severity) {
      filtered = filtered.filter(log => {
        const afterState = log.afterState as any;
        return afterState.severity === filters.severity;
      });
    }

    if (filters?.type) {
      filtered = filtered.filter(log => {
        const afterState = log.afterState as any;
        return afterState.eventType === filters.type;
      });
    }

    if (filters?.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
    }

    return filtered;
  } catch (error) {
    return [];
  }
}

/**
 * Get security summary statistics
 */
export async function getSecuritySummary(timeRange: "day" | "week" | "month" = "day"): Promise<{
  totalEvents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalEvents: number;
  failedLogins: number;
  blockedIps: number;
}> {
  const now = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case "day":
      startDate.setDate(now.getDate() - 1);
      break;
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  const events = await getSecurityEvents({ startDate, limit: 10000 });

  const summary = {
    totalEvents: events.length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    criticalEvents: 0,
    failedLogins: 0,
    blockedIps: 0,
  };

  events.forEach(log => {
    const afterState = log.afterState;
    if (!afterState) return;

    const eventType = afterState.eventType || "unknown";
    const severity = afterState.severity || SecuritySeverity.LOW;

    summary.byType[eventType] = (summary.byType[eventType] || 0) + 1;
    summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;

    if (severity === SecuritySeverity.CRITICAL) {
      summary.criticalEvents++;
    }

    if (eventType === SecurityEventType.LOGIN_FAILED) {
      summary.failedLogins++;
    }

    if (eventType === SecurityEventType.IP_BLOCKED) {
      summary.blockedIps++;
    }
  });

  return summary;
}
