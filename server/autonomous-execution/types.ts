/**
 * Autonomous Execution Orchestrator - Type Definitions
 *
 * Safely execute approved optimizations with sequencing,
 * rollback, and blast-radius control.
 */

// ============================================================================
// EXECUTION TYPES
// ============================================================================

export type ExecutionMode = 'dry_run' | 'staged' | 'progressive_rollout' | 'full' | 'auto_rollback';
export type ExecutionStatus =
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rolled_back'
  | 'paused'
  | 'cancelled';

export type ProposalType = 'content' | 'content_update' | 'seo_fix' | 'funnel' | 'experiment' | 'traffic_optimization';

// ============================================================================
// EXECUTION PLAN
// ============================================================================

export interface ExecutionPlan {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  proposals: ExecutionItem[];
  dependencies: ExecutionDependency[];
  order: string[]; // Ordered proposal IDs

  mode: ExecutionMode;
  status: ExecutionStatus;

  config: ExecutionConfig;
  schedule?: ExecutionSchedule;

  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ExecutionItem {
  id: string;
  proposalId: string;
  proposalType: ProposalType | string;
  priority: 'high' | 'medium' | 'low';
  sequence: number;
  status: ExecutionStatus;

  changes: ExecutionChange[];
  dependencies: string[];
  forecast?: {
    expectedLift?: number;
    riskLevel?: string;
  };

  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  rollbackData?: unknown;
}

export interface ExecutionChange {
  type: string;
  target: string;
  field?: string;
  currentValue?: unknown;
  newValue?: unknown;
  isReversible: boolean;
}

export interface ExecutionDependency {
  itemId: string;
  dependsOn: string[];
  condition?: 'all_success' | 'any_success' | 'no_failure';
}

export interface ExecutionConfig {
  maxConcurrent: number;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;

  // Rate limits
  itemsPerHour: number;
  itemsPerDay: number;

  // Budgets
  maxRiskScore: number;
  maxAffectedContent: number;

  // Rollback triggers
  rollbackOnErrorRate: number;
  rollbackOnMetricDrop: number;

  // Approval requirements
  requireApprovalAboveRisk: string;
  notifyOnStart: boolean;
  notifyOnComplete: boolean;
}

export interface ExecutionSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  scheduledTime?: Date;
  recurrence?: {
    pattern: 'hourly' | 'daily' | 'weekly';
    hour?: number;
    dayOfWeek?: number;
  };
}

// ============================================================================
// SAFETY & ROLLBACK
// ============================================================================

export interface SafetyCheck {
  id: string;
  name: string;
  type: 'pre_execution' | 'during_execution' | 'post_execution';
  check: (context: SafetyContext) => SafetyResult;
}

export interface SafetyContext {
  item: ExecutionItem;
  plan: ExecutionPlan;
  currentMetrics: Record<string, number>;
  baselineMetrics: Record<string, number>;
}

export interface SafetyResult {
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  shouldHalt: boolean;
  shouldRollback: boolean;
}

export interface RollbackPlan {
  itemId: string;
  steps: RollbackStep[];
  estimatedDuration: number;
  risks: string[];
}

export interface RollbackStep {
  order: number;
  action: string;
  target: string;
  data: unknown;
  isAtomic: boolean;
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export interface ExecutionAuditEntry {
  id: string;
  timestamp: Date;
  planId: string;
  itemId?: string;
  action: AuditAction;
  actor: string;
  details: Record<string, unknown>;
  result: 'success' | 'failure' | 'warning';
}

export type AuditAction =
  | 'plan_created'
  | 'plan_started'
  | 'plan_completed'
  | 'plan_failed'
  | 'plan_cancelled'
  | 'item_started'
  | 'item_completed'
  | 'item_failed'
  | 'item_rolled_back'
  | 'safety_check_passed'
  | 'safety_check_failed'
  | 'manual_intervention';

// ============================================================================
// RATE LIMITING & BUDGETS
// ============================================================================

export interface ExecutionBudget {
  id: string;
  period: 'hour' | 'day' | 'week';
  limit: number;
  used: number;
  resetAt: Date;
}

export interface RateLimitState {
  itemsThisHour: number;
  itemsThisDay: number;
  lastItemTime: Date;
  hourlyBudget: ExecutionBudget;
  dailyBudget: ExecutionBudget;
}

// ============================================================================
// PROGRESS & REPORTING
// ============================================================================

export interface ExecutionProgress {
  planId: string;
  status: ExecutionStatus;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  pendingItems: number;
  progressPercent: number;
  estimatedRemaining: number;
  currentItem?: string;
}

export interface ExecutionReport {
  planId: string;
  generatedAt: Date;
  duration: number;

  summary: {
    totalItems: number;
    successful: number;
    failed: number;
    rolledBack: number;
    skipped: number;
  };

  metrics: {
    before: Record<string, number>;
    after: Record<string, number>;
    delta: Record<string, number>;
  };

  issues: {
    itemId: string;
    error: string;
    resolution: string;
  }[];

  recommendations: string[];
}

// ============================================================================
// APPROVED PROPOSAL (moved here for ESM compatibility)
// ============================================================================

export interface ApprovedProposal {
  id: string;
  type: ProposalType;
  target: string;
  priority: 'high' | 'medium' | 'low';
  changes: {
    type: string;
    target: string;
    field?: string;
    currentValue?: unknown;
    newValue?: unknown;
    isReversible: boolean;
  }[];
  forecast?: {
    expectedLift?: number;
    riskLevel?: string;
  };
  approvedBy: string;
  approvedAt: Date;
  dependsOn?: string[];
}
