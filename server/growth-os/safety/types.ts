/**
 * Safety Layer Types
 *
 * Types for safety checks, policies, and readiness evaluation.
 */

import type { ActionPlan } from '../actions/types';
import type { ActionCandidate } from '../prioritization/types';

/**
 * Safety check result
 */
export type SafetyResult = 'pass' | 'warn' | 'block';

/**
 * Safety check category
 */
export type SafetyCategory =
  | 'reversibility'
  | 'blast_radius'
  | 'governance'
  | 'resource'
  | 'timing'
  | 'dependency'
  | 'conflict';

/**
 * Individual safety check
 */
export interface SafetyCheck {
  /** Check ID */
  id: string;
  /** Check category */
  category: SafetyCategory;
  /** Check name */
  name: string;
  /** Check description */
  description: string;
  /** Result */
  result: SafetyResult;
  /** Message */
  message: string;
  /** Details */
  details: Record<string, unknown>;
  /** Remediation if blocked/warned */
  remediation: string | null;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Safety evaluation result
 */
export interface SafetyEvaluation {
  /** Plan or candidate ID */
  targetId: string;
  /** Overall result */
  overallResult: SafetyResult;
  /** Individual checks */
  checks: SafetyCheck[];
  /** Total checks run */
  totalChecks: number;
  /** Passed checks */
  passed: number;
  /** Warning checks */
  warnings: number;
  /** Blocked checks */
  blocked: number;
  /** Risk score (0-100) */
  riskScore: number;
  /** Execution recommended */
  executionRecommended: boolean;
  /** Evaluation duration in ms */
  durationMs: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Policy type
 */
export type PolicyType =
  | 'content_protection'
  | 'rate_limit'
  | 'time_window'
  | 'approval_required'
  | 'resource_limit'
  | 'dependency_check'
  | 'conflict_prevention';

/**
 * Policy enforcement result
 */
export interface PolicyEnforcementResult {
  /** Policy ID */
  policyId: string;
  /** Policy type */
  policyType: PolicyType;
  /** Enforced */
  enforced: boolean;
  /** Violation detected */
  violated: boolean;
  /** Message */
  message: string;
  /** Override allowed */
  overrideAllowed: boolean;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Policy definition
 */
export interface Policy {
  /** Policy ID */
  id: string;
  /** Policy type */
  type: PolicyType;
  /** Policy name */
  name: string;
  /** Policy description */
  description: string;
  /** Enabled */
  enabled: boolean;
  /** Policy configuration */
  config: Record<string, unknown>;
  /** Priority (higher = checked first) */
  priority: number;
  /** Allow override */
  allowOverride: boolean;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Readiness status
 */
export type ReadinessStatus = 'ready' | 'blocked' | 'pending_approval' | 'pending_dependency';

/**
 * Readiness check result
 */
export interface ReadinessCheck {
  /** Plan ID */
  planId: string;
  /** Readiness status */
  status: ReadinessStatus;
  /** Safety evaluation */
  safetyEvaluation: SafetyEvaluation;
  /** Policy enforcement results */
  policyResults: PolicyEnforcementResult[];
  /** Missing dependencies */
  missingDependencies: string[];
  /** Blocking conflicts */
  blockingConflicts: string[];
  /** Time until ready (if timing blocked) */
  readyAt: Date | null;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Conflict type
 */
export type ConflictType =
  | 'resource_contention'
  | 'entity_lock'
  | 'concurrent_modification'
  | 'dependency_cycle';

/**
 * Conflict detection result
 */
export interface ConflictResult {
  /** Conflict detected */
  hasConflict: boolean;
  /** Conflict type */
  type: ConflictType | null;
  /** Conflicting plan IDs */
  conflictingPlanIds: string[];
  /** Conflicting entity IDs */
  conflictingEntityIds: string[];
  /** Resolution strategy */
  resolutionStrategy: 'abort' | 'wait' | 'merge' | 'force';
  /** Message */
  message: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Within limit */
  allowed: boolean;
  /** Current count */
  currentCount: number;
  /** Limit */
  limit: number;
  /** Window in seconds */
  windowSeconds: number;
  /** Reset timestamp */
  resetsAt: Date;
  /** Wait time in seconds (if blocked) */
  waitSeconds: number;
}

/**
 * Safety configuration
 */
export interface SafetyConfig {
  /** Enable safety checks */
  enabled: boolean;
  /** Maximum blast radius score */
  maxBlastRadius: number;
  /** Maximum risk score */
  maxRiskScore: number;
  /** Require reversibility */
  requireReversible: boolean;
  /** Actions per hour limit */
  actionsPerHourLimit: number;
  /** Quiet hours (UTC) */
  quietHoursStart: number;
  quietHoursEnd: number;
  /** Enable quiet hours */
  enableQuietHours: boolean;
}
