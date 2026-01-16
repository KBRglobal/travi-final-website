/**
 * Enterprise Governance Types
 * Complete type definitions for RBAC, Audit, Approvals, and Policies
 */

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export type AdminRole =
  | "super_admin"     // Full system access, can manage other admins
  | "system_admin"    // System configuration, no user management
  | "manager"         // Content management, team oversight, approvals
  | "editor"          // Content creation and editing
  | "analyst"         // Read-only analytics access
  | "ops"             // Operations and monitoring
  | "viewer";         // Read-only basic access

export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 100,
  system_admin: 90,
  manager: 70,
  ops: 60,
  editor: 40,
  analyst: 30,
  viewer: 10,
};

export const ADMIN_ROLES: AdminRole[] = ["super_admin", "system_admin", "manager"];
export const CONTENT_ROLES: AdminRole[] = ["editor", "analyst", "viewer"];
export const OPS_ROLES: AdminRole[] = ["ops"];

// ============================================================================
// ACTION DEFINITIONS
// ============================================================================

export type Action =
  // Content actions
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "publish"
  | "unpublish"
  | "archive"
  | "restore"
  // Approval actions
  | "approve"
  | "reject"
  | "submit_for_review"
  | "escalate"
  // Admin actions
  | "manage_users"
  | "manage_roles"
  | "manage_policies"
  | "manage_workflows"
  // System actions
  | "configure"
  | "ops"
  | "audit"
  | "export"
  | "import";

// ============================================================================
// RESOURCE DEFINITIONS
// ============================================================================

export type Resource =
  | "content"
  | "entity"
  | "revenue"
  | "users"
  | "roles"
  | "policies"
  | "workflows"
  | "settings"
  | "analytics"
  | "audit"
  | "media"
  | "translations"
  | "integrations"
  | "system";

// ============================================================================
// SCOPE DEFINITIONS
// ============================================================================

export type Scope =
  | "global"          // All resources
  | "team"            // Team-specific
  | "locale"          // Language-specific
  | "content_type"    // Content type specific
  | "own"             // Own resources only
  | "assigned";       // Assigned resources

export interface ScopeValue {
  scope: Scope;
  value?: string;
}

// ============================================================================
// PERMISSION STRUCTURES
// ============================================================================

export interface Permission {
  action: Action;
  resource: Resource;
  scope: Scope;
  scopeValue?: string;
  isAllowed: boolean;
  conditions?: PolicyCondition[];
}

export interface RoleDefinition {
  name: AdminRole;
  displayName: string;
  description: string;
  priority: number;
  isSystem: boolean;
  permissions: Permission[];
  inheritsFrom?: AdminRole[];
}

export interface UserContext {
  userId: string;
  roles: AdminRole[];
  permissions: Permission[];
  teamIds?: string[];
  locale?: string;
  metadata?: Record<string, unknown>;
}

export interface AccessContext {
  resource: Resource;
  resourceId?: string;
  action: Action;
  locale?: string;
  entityId?: string;
  contentId?: string;
  teamId?: string;
  ownerId?: string;
  contentType?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  matchedPermissions: Permission[];
  matchedPolicies: PolicyEvaluation[];
  denyReason?: string;
}

// ============================================================================
// POLICY DEFINITIONS (Policy-as-Code)
// ============================================================================

export type PolicyEffect = "allow" | "deny" | "require_approval";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "in"
  | "not_in"
  | "between"
  | "is_null"
  | "is_not_null"
  | "matches_regex"
  | "has_role"
  | "is_owner"
  | "within_time_window"
  | "ip_in_range";

export interface PolicyCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logicalOperator?: "AND" | "OR";
}

export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  effect: PolicyEffect;
  priority: number;
  conditions: PolicyCondition[];
  actions: Action[];
  resources: Resource[];
  roles?: AdminRole[];
  schedules?: TimeSchedule[];
  rateLimit?: RateLimitConfig;
  approvalConfig?: ApprovalConfig;
  isActive: boolean;
}

export interface TimeSchedule {
  startTime?: string;  // HH:MM format
  endTime?: string;    // HH:MM format
  daysOfWeek?: number[];  // 0-6, Sunday = 0
  timezone?: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
  scope: "user" | "ip" | "global";
}

export interface ApprovalConfig {
  requiredApprovers: number;
  approverRoles: AdminRole[];
  approverUsers?: string[];
  autoApproveAfterHours?: number;
  escalateAfterHours?: number;
  escalateTo?: AdminRole;
}

export interface PolicyEvaluation {
  policyId: string;
  policyName: string;
  effect: PolicyEffect;
  matched: boolean;
  reason?: string;
}

// ============================================================================
// AUDIT TRAIL DEFINITIONS
// ============================================================================

export type SecurityEventType =
  // Authentication events
  | "login_success"
  | "login_failure"
  | "logout"
  | "session_expired"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_challenge_success"
  | "mfa_challenge_failure"
  | "password_changed"
  | "password_reset_requested"
  // Authorization events
  | "permission_denied"
  | "permission_granted"
  | "role_assigned"
  | "role_revoked"
  | "policy_violated"
  // Data access events
  | "data_accessed"
  | "data_exported"
  | "data_deleted"
  | "bulk_operation"
  // Admin events
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "user_activated"
  | "user_deactivated"
  | "role_created"
  | "role_updated"
  | "role_deleted"
  | "policy_created"
  | "policy_updated"
  | "policy_deleted"
  // System events
  | "config_changed"
  | "integration_connected"
  | "integration_disconnected"
  | "api_key_created"
  | "api_key_revoked"
  // Approval events
  | "approval_requested"
  | "approval_granted"
  | "approval_denied"
  | "approval_escalated"
  | "approval_expired";

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  id?: string;
  timestamp: Date;
  eventType: SecurityEventType;
  severity: SeverityLevel;
  userId?: string;
  userName?: string;
  userRole?: string;
  targetUserId?: string;
  targetUserName?: string;
  resource?: Resource;
  resourceId?: string;
  action?: Action;
  success: boolean;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  // For compliance
  isCompliant: boolean;
  complianceTags?: string[];
  // For integrity
  previousEventHash?: string;
  eventHash?: string;
}

// ============================================================================
// APPROVAL WORKFLOW DEFINITIONS
// ============================================================================

export type ApprovalStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "escalated";

export type ApprovalStepType =
  | "user"       // Specific user
  | "role"       // Any user with role
  | "team"       // Any team member
  | "manager"    // Resource owner's manager
  | "auto";      // Automatic (time-based)

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description?: string;
  resourceTypes: Resource[];
  actions: Action[];
  contentTypes?: string[];
  steps: ApprovalWorkflowStep[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalWorkflowStep {
  stepNumber: number;
  name: string;
  type: ApprovalStepType;
  approverRoles?: AdminRole[];
  approverUserIds?: string[];
  requiredApprovals: number;
  timeoutHours?: number;
  autoApprove?: boolean;
  escalateTo?: {
    type: ApprovalStepType;
    roles?: AdminRole[];
    userIds?: string[];
  };
  conditions?: PolicyCondition[];
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  requestType: string;
  resourceType: Resource;
  resourceId: string;
  resourceTitle?: string;
  action: Action;
  requesterId: string;
  requesterName?: string;
  currentStep: number;
  totalSteps: number;
  status: ApprovalStatus;
  priority: "low" | "normal" | "high" | "urgent";
  reason?: string;
  metadata?: Record<string, unknown>;
  dueAt?: Date;
  escalatedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalStepRecord {
  id: string;
  requestId: string;
  stepNumber: number;
  stepName: string;
  approverType: ApprovalStepType;
  approverId?: string;
  approverRole?: AdminRole;
  status: ApprovalStatus;
  decision?: "approved" | "rejected";
  decisionReason?: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: Date;
  dueAt?: Date;
  createdAt: Date;
}

// ============================================================================
// DATA ACCESS SCOPING (Row-Level Security)
// ============================================================================

export interface DataAccessScope {
  userId: string;
  resource: Resource;
  accessType: "read" | "write" | "delete";
  scopeRules: DataScopeRule[];
}

export interface DataScopeRule {
  field: string;
  operator: "equals" | "in" | "is_owner" | "is_team_member" | "all";
  value?: unknown;
  values?: unknown[];
}

export interface RowLevelFilter {
  field: string;
  operator: string;
  value: unknown;
}

// ============================================================================
// COMPLIANCE EXPORT DEFINITIONS (GDPR)
// ============================================================================

export type ComplianceExportType =
  | "gdpr_data_export"
  | "gdpr_deletion_report"
  | "audit_report"
  | "access_report"
  | "activity_report"
  | "permissions_report";

export interface ComplianceExportRequest {
  id: string;
  exportType: ComplianceExportType;
  requesterId: string;
  targetUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeAuditLogs: boolean;
  includeUserData: boolean;
  includeContentData: boolean;
  includeAnalytics: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  filePath?: string;
  fileSize?: number;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface GDPRDataPackage {
  exportId: string;
  exportedAt: Date;
  userId: string;
  userEmail: string;
  sections: {
    profile: UserProfileData;
    activity: ActivityData[];
    content: ContentOwnershipData[];
    permissions: PermissionData[];
    auditLogs: AuditLogEntry[];
    dataRetention: DataRetentionInfo;
  };
}

export interface UserProfileData {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface ActivityData {
  timestamp: Date;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}

export interface ContentOwnershipData {
  contentId: string;
  title: string;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionData {
  role: string;
  scope: string;
  grantedAt: Date;
  grantedBy?: string;
}

export interface AuditLogEntry {
  timestamp: Date;
  action: string;
  resource: string;
  details: string;
}

export interface DataRetentionInfo {
  retentionPolicy: string;
  dataCategories: string[];
  deletionDate?: Date;
}

console.log("[Governance] Types loaded");
