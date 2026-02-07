/**
 * Security Authority Types
 * Supreme authority layer - all decisions flow through here
 * Feature flag: ENABLE_SECURITY_AUTHORITY
 */

import { SecuritySeverity } from "../audit-logger";

// ============================================================================
// SECURITY MODES - Global system security state
// ============================================================================

export type SecurityMode = "lockdown" | "enforce" | "monitor";

export interface SecurityModeConfig {
  mode: SecurityMode;
  reason: string;
  activatedAt: Date;
  activatedBy: string;
  autoExpireAt?: Date;
  restrictions: SecurityRestrictions;
}

export interface SecurityRestrictions {
  autopilotAllowed: boolean;
  destructiveActionsAllowed: boolean;
  bulkOperationsAllowed: boolean;
  deploymentAllowed: boolean;
  externalApiCallsAllowed: boolean;
  userRegistrationAllowed: boolean;
  requireApprovalForAll: boolean;
}

export const MODE_RESTRICTIONS: Record<SecurityMode, SecurityRestrictions> = {
  lockdown: {
    autopilotAllowed: false,
    destructiveActionsAllowed: false,
    bulkOperationsAllowed: false,
    deploymentAllowed: false,
    externalApiCallsAllowed: false,
    userRegistrationAllowed: false,
    requireApprovalForAll: true,
  },
  enforce: {
    autopilotAllowed: true,
    destructiveActionsAllowed: false,
    bulkOperationsAllowed: true,
    deploymentAllowed: true,
    externalApiCallsAllowed: true,
    userRegistrationAllowed: true,
    requireApprovalForAll: false,
  },
  monitor: {
    autopilotAllowed: true,
    destructiveActionsAllowed: true,
    bulkOperationsAllowed: true,
    deploymentAllowed: true,
    externalApiCallsAllowed: true,
    userRegistrationAllowed: true,
    requireApprovalForAll: false,
  },
};

// ============================================================================
// THREAT LEVELS
// ============================================================================

export type ThreatLevel = "normal" | "elevated" | "high" | "critical";

export interface ThreatState {
  level: ThreatLevel;
  sources: ThreatSource[];
  activeSince: Date;
  autoEscalateAt?: Date;
  autoDeescalateAt?: Date;
}

export interface ThreatSource {
  type: string;
  identifier: string;
  description: string;
  detectedAt: Date;
  severity: SecuritySeverity;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SECURITY GATE TYPES
// ============================================================================

export type GatedAction =
  | "data_read"
  | "data_write"
  | "data_delete"
  | "data_export"
  | "content_create"
  | "content_update"
  | "content_delete"
  | "content_publish"
  | "seo_autopilot"
  | "data_autopilot"
  | "ops_autopilot"
  | "bulk_operation"
  | "deployment"
  | "cutover"
  | "user_management"
  | "role_management"
  | "settings_change"
  | "external_api_call"
  | "ai_generation"
  | "translation"
  | "media_upload"
  | "admin_action";

export type ResourceType =
  | "content"
  | "entity"
  | "user"
  | "settings"
  | "deployment"
  | "system"
  | "audit"
  | "api"
  | "media"
  | "report";

export interface GateRequest {
  actor: ActorIdentity;
  action: GatedAction;
  resource: ResourceType;
  resourceId?: string;
  context: GateContext;
}

export interface ActorIdentity {
  userId?: string;
  userName?: string;
  userEmail?: string;
  roles?: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  isSystem?: boolean;
  isAutopilot?: boolean;
}

export interface GateContext {
  requestPath?: string;
  requestMethod?: string;
  entityType?: string;
  entityId?: string;
  contentId?: string;
  locale?: string;
  targetUsers?: string[];
  affectedRecordCount?: number;
  estimatedImpact?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

export interface GateDecision {
  allowed: boolean;
  decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | "RATE_LIMITED";
  reasons: GateReason[];
  requiredApprovals?: ApprovalRequirement[];
  retryAfterMs?: number;
  auditId: string;
  evaluatedAt: Date;
  securityMode: SecurityMode;
  threatLevel: ThreatLevel;
}

export interface GateReason {
  code: string;
  message: string;
  source: "mode" | "threat" | "policy" | "override" | "rate_limit" | "budget";
  severity: SecuritySeverity;
}

export interface ApprovalRequirement {
  approverRole: string;
  minApprovers: number;
  expiresAfterMs: number;
  reason: string;
}

// ============================================================================
// OVERRIDE TYPES
// ============================================================================

export interface SecurityOverride {
  id: string;
  type: OverrideType;
  target: OverrideTarget;
  grantedTo: string;
  grantedBy: string;
  reason: string;
  justification: string;
  evidence?: string[];
  createdAt: Date;
  expiresAt: Date;
  usedCount: number;
  maxUses?: number;
  active: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
}

export type OverrideType =
  | "action_bypass"
  | "mode_bypass"
  | "threat_bypass"
  | "rate_limit_bypass"
  | "approval_bypass";

export interface OverrideTarget {
  action?: GatedAction;
  resource?: ResourceType;
  resourceId?: string;
  scope?: "specific" | "category" | "all";
}

export interface OverrideRequest {
  type: OverrideType;
  target: OverrideTarget;
  reason: string;
  justification: string;
  evidence?: string[];
  durationMinutes: number;
  maxUses?: number;
}

// ============================================================================
// ADAPTERS - Cross-system integration
// ============================================================================

export interface SystemAdapter {
  name: string;
  enabled: boolean;
  onThreatEscalation: (threat: ThreatState) => Promise<void>;
  onModeChange: (mode: SecurityModeConfig) => Promise<void>;
  onEmergencyStop: () => Promise<void>;
  getStatus: () => Promise<AdapterStatus>;
}

export interface AdapterStatus {
  name: string;
  connected: boolean;
  lastHeartbeat: Date;
  pendingActions: number;
  blocked: boolean;
}

// ============================================================================
// EVIDENCE TYPES
// ============================================================================

export interface SecurityEvidence {
  id: string;
  type: EvidenceType;
  source: string;
  timestamp: Date;
  actor: ActorIdentity;
  action: GatedAction;
  resource: ResourceType;
  decision: GateDecision;
  relatedOverride?: string;
  metadata: Record<string, unknown>;
}

export type EvidenceType =
  | "gate_decision"
  | "override_used"
  | "threat_detected"
  | "mode_changed"
  | "policy_violated"
  | "approval_granted"
  | "approval_denied";

export interface ComplianceBundle {
  bundleId: string;
  framework: "SOC2" | "GDPR" | "HIPAA" | "ISO27001";
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  evidence: SecurityEvidence[];
  summary: ComplianceSummary;
  exportFormat: "json" | "pdf" | "csv";
}

export interface ComplianceSummary {
  totalDecisions: number;
  allowedCount: number;
  deniedCount: number;
  overrideCount: number;
  threatCount: number;
  highRiskActions: number;
  complianceScore: number;
  findings: ComplianceFinding[];
}

export interface ComplianceFinding {
  severity: SecuritySeverity;
  category: string;
  description: string;
  recommendation: string;
  occurrences: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SecurityAuthorityConfig {
  enabled: boolean;
  defaultMode: SecurityMode;
  failClosed: boolean;
  auditAllDecisions: boolean;
  maxOverrideDurationHours: number;
  threatEscalationThresholds: {
    elevatedThreshold: number;
    highThreshold: number;
    criticalThreshold: number;
  };
  autoLockdownOnCriticalThreat: boolean;
}

export const DEFAULT_SECURITY_AUTHORITY_CONFIG: SecurityAuthorityConfig = {
  enabled: process.env.ENABLE_SECURITY_AUTHORITY === "true",
  defaultMode: (process.env.SECURITY_DEFAULT_MODE as SecurityMode) || "enforce",
  failClosed: process.env.SECURITY_FAIL_CLOSED !== "false", // Default true
  auditAllDecisions: process.env.SECURITY_AUDIT_ALL !== "false", // Default true
  maxOverrideDurationHours: Number.parseInt(process.env.SECURITY_MAX_OVERRIDE_HOURS || "24", 10),
  threatEscalationThresholds: {
    elevatedThreshold: 5,
    highThreshold: 15,
    criticalThreshold: 30,
  },
  autoLockdownOnCriticalThreat: process.env.SECURITY_AUTO_LOCKDOWN !== "false", // Default true
};
