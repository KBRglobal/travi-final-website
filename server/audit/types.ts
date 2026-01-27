/**
 * Audit Types
 * Feature flag: ENABLE_AUDIT_LOGS
 */

export type AuditSource = "ui" | "api" | "automation" | "ai" | "system" | "webhook";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "archive"
  | "restore"
  | "view"
  | "export"
  | "import"
  | "login"
  | "logout"
  | "permission_change"
  | "role_change"
  | "config_change"
  | "approval_request"
  | "approval_decision"
  | "ai_generation"
  | "bulk_operation";

export interface AuditEvent {
  userId?: string;
  userRole?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  beforeSnapshot?: string;
  afterSnapshot?: string;
  source: AuditSource;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  beforeSnapshot?: string;
  afterSnapshot?: string;
  snapshotHash?: string;
  source: AuditSource;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditQuery {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  source?: AuditSource;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

export interface AuditSummary {
  totalEvents: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  bySource: Record<string, number>;
  topUsers: { userId: string; count: number }[];
  recentActivity: AuditLogEntry[];
}
