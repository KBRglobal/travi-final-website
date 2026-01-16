/**
 * Enterprise Policy Compliance Engine - Types
 */

export type PolicyCategory =
  | 'data-retention'
  | 'ai-usage'
  | 'content-ownership'
  | 'localization'
  | 'publishing-standards'
  | 'audit-retention'
  | 'kill-switch'
  | 'security'
  | 'privacy';

export type ComplianceStatus = 'compliant' | 'warning' | 'violation';

export type PolicyScope =
  | 'system'
  | 'feature'
  | 'content'
  | 'locale'
  | 'user';

export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Policy definition
 */
export interface Policy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  scope: PolicyScope;
  enabled: boolean;

  // Evaluation
  check: PolicyCheck;
  thresholds?: PolicyThresholds;

  // Metadata
  version: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: string;
  externalRef?: string;  // Link to external policy doc
}

/**
 * Policy check configuration
 */
export interface PolicyCheck {
  type: 'config' | 'state' | 'flag' | 'runtime' | 'composite';
  target: string;          // What to check
  operator: CheckOperator;
  expectedValue: unknown;
  warningValue?: unknown;  // Optional warning threshold
}

export type CheckOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'
  | 'matches'
  | 'in_range';

/**
 * Policy thresholds
 */
export interface PolicyThresholds {
  warningAt?: number;
  violationAt?: number;
  unit?: string;
}

/**
 * Compliance check result
 */
export interface ComplianceResult {
  policyId: string;
  policyName: string;
  category: PolicyCategory;
  scope: PolicyScope;

  status: ComplianceStatus;
  severity: SeverityLevel;

  actualValue: unknown;
  expectedValue: unknown;

  message: string;
  details?: string;

  checkedAt: Date;
  expiresAt?: Date;

  // For tracking
  entityId?: string;
  entityType?: string;
}

/**
 * Violation record
 */
export interface Violation {
  id: string;
  policyId: string;
  policyName: string;
  category: PolicyCategory;

  status: 'open' | 'acknowledged' | 'resolved' | 'waived';
  severity: SeverityLevel;

  entityId?: string;
  entityType?: string;
  scope: PolicyScope;

  message: string;
  details: string;
  actualValue: unknown;
  expectedValue: unknown;

  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  waivedAt?: Date;
  waivedBy?: string;
  waiverReason?: string;

  // For integration
  readinessImpact: boolean;
  governorBlocking: boolean;
}

/**
 * Compliance scan request
 */
export interface ScanRequest {
  categories?: PolicyCategory[];
  scopes?: PolicyScope[];
  entityId?: string;
  entityType?: string;
  policiesOnly?: string[];  // Specific policy IDs
}

/**
 * Compliance scan result
 */
export interface ScanResult {
  id: string;
  timestamp: Date;
  durationMs: number;

  request: ScanRequest;

  // Results
  totalPolicies: number;
  checkedPolicies: number;
  results: ComplianceResult[];

  // Summary
  summary: {
    compliant: number;
    warning: number;
    violation: number;
  };

  overallStatus: ComplianceStatus;
}

/**
 * Compliance status by entity
 */
export interface EntityCompliance {
  entityId: string;
  entityType: string;
  overallStatus: ComplianceStatus;
  results: ComplianceResult[];
  lastChecked: Date;
}

/**
 * System-wide compliance status
 */
export interface SystemComplianceStatus {
  timestamp: Date;
  overallStatus: ComplianceStatus;

  byCategory: Record<PolicyCategory, {
    status: ComplianceStatus;
    count: number;
    violations: number;
  }>;

  byScope: Record<PolicyScope, {
    status: ComplianceStatus;
    count: number;
    violations: number;
  }>;

  activeViolations: number;
  acknowledgedViolations: number;
  waivedViolations: number;

  lastFullScan?: Date;
}
