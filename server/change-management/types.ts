/**
 * Production Change Management System (PCMS) - Core Types
 *
 * "Terraform plan/apply" for content & intelligence.
 * Safe, auditable, reversible bulk changes.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type PlanStatus = 'draft' | 'pending_approval' | 'approved' | 'applying' | 'applied' | 'failed' | 'rolled_back' | 'cancelled';
export type PlanScope = 'content' | 'entity' | 'seo' | 'aeo' | 'canonical' | 'links' | 'monetization' | 'global';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ChangeType =
  | 'content_update'
  | 'content_publish'
  | 'content_unpublish'
  | 'entity_merge'
  | 'entity_update'
  | 'canonical_set'
  | 'canonical_remove'
  | 'link_add'
  | 'link_remove'
  | 'aeo_regenerate'
  | 'seo_update'
  | 'experiment_start'
  | 'experiment_stop'
  | 'monetization_update';

export type ChangeStatus = 'pending' | 'applying' | 'applied' | 'failed' | 'skipped' | 'rolled_back';
export type CreatedFrom = 'growth_engine' | 'admin' | 'automation' | 'ai_recommendation' | 'bulk_import' | 'api';

// ============================================================================
// CHANGE ITEM - Single atomic change
// ============================================================================

export interface ChangeItem {
  id: string;
  type: ChangeType;
  targetType: 'content' | 'entity' | 'canonical' | 'link' | 'experiment';
  targetId: string;
  targetTitle?: string;

  // What changes
  field?: string;
  beforeValue: unknown;
  afterValue: unknown;

  // Execution state
  status: ChangeStatus;
  appliedAt?: Date;
  error?: string;

  // Rollback data
  rollbackData?: unknown;

  // Metadata
  reason?: string;
  confidence?: number; // 0-100 if AI-suggested
}

// ============================================================================
// IMPACT ESTIMATE - Projected effects of changes
// ============================================================================

export interface ImpactEstimate {
  contentAffected: number;
  entitiesAffected: number;
  linksAffected: number;

  // SEO/AEO impact
  pagesReindexNeeded: number;
  capsulesToRegenerate: number;

  // Risk metrics
  publishedContentTouched: number;
  highTrafficPagesTouched: number;
  experimentConflicts: number;

  // Estimated time
  estimatedDurationMs: number;

  // Warnings
  warnings: string[];
}

// ============================================================================
// CHANGE PLAN - Collection of changes to apply together
// ============================================================================

export interface ChangePlan {
  id: string;
  name: string;
  description: string;

  // Scope & origin
  scope: PlanScope;
  createdFrom: CreatedFrom;

  // Changes
  changes: ChangeItem[];

  // Analysis
  impactEstimate: ImpactEstimate;
  riskLevel: RiskLevel;

  // Status & lifecycle
  status: PlanStatus;
  createdAt: Date;
  createdBy: string;

  // Approval
  approvedAt?: Date;
  approvedBy?: string;
  approvalNotes?: string;

  // Execution
  appliedAt?: Date;
  appliedBy?: string;
  executionDurationMs?: number;

  // Rollback
  rolledBackAt?: Date;
  rolledBackBy?: string;
  rollbackReason?: string;

  // Metadata
  tags?: string[];
  parentPlanId?: string; // For split/derived plans
  dryRunResult?: DryRunResult;
}

// ============================================================================
// DRY RUN RESULT
// ============================================================================

export interface DryRunResult {
  planId: string;
  success: boolean;
  simulatedAt: Date;

  // What would happen
  changesWouldApply: number;
  changesWouldSkip: number;
  changesWouldFail: number;

  // Validation results
  guardsPassed: GuardResult[];
  guardsFailed: GuardResult[];

  // Detailed preview
  preview: ChangePreview[];

  // Warnings & blockers
  warnings: string[];
  blockers: string[];
}

export interface ChangePreview {
  changeId: string;
  wouldApply: boolean;
  reason?: string;
  diff?: DiffBlock[];
}

// ============================================================================
// DIFF STRUCTURES
// ============================================================================

export interface DiffBlock {
  field: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  before?: string;
  after?: string;
  context?: string;
}

export interface ContentDiff {
  contentId: string;
  title: string;
  blocks: DiffBlock[];
  entityChanges: {
    added: string[];
    removed: string[];
  };
  linkChanges: {
    added: { text: string; url: string }[];
    removed: { text: string; url: string }[];
  };
  metaChanges: DiffBlock[];
}

// ============================================================================
// GUARD SYSTEM
// ============================================================================

export type GuardType =
  | 'publish_gate'
  | 'sla_ownership'
  | 'experiment_conflict'
  | 'high_traffic'
  | 'recent_change'
  | 'canonical_integrity'
  | 'kill_switch'
  | 'rate_limit'
  | 'permission';

export interface GuardResult {
  guard: GuardType;
  passed: boolean;
  message: string;
  severity: 'warning' | 'error' | 'blocker';
  affectedChanges?: string[]; // Change IDs
}

export interface GuardConfig {
  enabled: boolean;
  blocking: boolean; // If true, failure blocks entire plan
  config?: Record<string, unknown>;
}

// ============================================================================
// EXECUTION
// ============================================================================

export interface ExecutionContext {
  planId: string;
  executedBy: string;
  dryRun: boolean;
  batchSize: number;
  continueOnError: boolean;
  emitEvents: boolean;
}

export interface ExecutionResult {
  planId: string;
  success: boolean;
  dryRun: boolean;

  // Counts
  total: number;
  applied: number;
  failed: number;
  skipped: number;

  // Timing
  startedAt: Date;
  completedAt: Date;
  durationMs: number;

  // Details
  results: ChangeResult[];
  errors: ExecutionError[];
}

export interface ChangeResult {
  changeId: string;
  status: ChangeStatus;
  appliedAt?: Date;
  rollbackData?: unknown;
  error?: string;
}

export interface ExecutionError {
  changeId: string;
  error: string;
  stack?: string;
  recoverable: boolean;
}

// ============================================================================
// ROLLBACK
// ============================================================================

export interface RollbackPlan {
  planId: string;
  changes: RollbackItem[];
  createdAt: Date;
}

export interface RollbackItem {
  changeId: string;
  targetType: string;
  targetId: string;
  restoreData: unknown;
  status: 'pending' | 'restored' | 'failed';
  error?: string;
}

export interface RollbackResult {
  planId: string;
  success: boolean;
  restored: number;
  failed: number;
  results: RollbackItem[];
  completedAt: Date;
}

// ============================================================================
// HISTORY & AUDIT
// ============================================================================

export interface PlanHistoryEntry {
  id: string;
  planId: string;
  action: 'created' | 'approved' | 'rejected' | 'applied' | 'failed' | 'rolled_back' | 'cancelled';
  timestamp: Date;
  userId: string;
  userName?: string;
  details?: Record<string, unknown>;
}

export interface ChangeManagementStats {
  totalPlans: number;
  byStatus: Record<PlanStatus, number>;
  byScope: Record<PlanScope, number>;
  byRisk: Record<RiskLevel, number>;
  recentActivity: number;
  avgExecutionTime: number;
  successRate: number;
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export function isChangeManagementEnabled(): boolean {
  return process.env.ENABLE_CHANGE_MANAGEMENT === 'true';
}

export function isChangeApplyEnabled(): boolean {
  return process.env.ENABLE_CHANGE_APPLY === 'true';
}

export function isChangeRollbackEnabled(): boolean {
  return process.env.ENABLE_CHANGE_ROLLBACK !== 'false'; // Default true
}

export function isDryRunEnabled(): boolean {
  return process.env.ENABLE_CHANGE_DRY_RUN !== 'false'; // Default true
}
