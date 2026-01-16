/**
 * Action Synthesis Types
 *
 * Types for action plans, execution steps, and outcomes.
 */

import type { ActionCandidate, ActionType } from '../prioritization/types';

/**
 * Execution step status
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'rolled_back';

/**
 * Step type
 */
export type StepType =
  | 'validation'
  | 'backup'
  | 'preparation'
  | 'execution'
  | 'verification'
  | 'notification'
  | 'cleanup';

/**
 * Individual execution step
 */
export interface ExecutionStep {
  /** Step ID */
  id: string;
  /** Step type */
  type: StepType;
  /** Step name */
  name: string;
  /** Step description */
  description: string;
  /** Step status */
  status: StepStatus;
  /** Whether step is required */
  required: boolean;
  /** Whether step can be rolled back */
  canRollback: boolean;
  /** Estimated duration in seconds */
  estimatedDurationSeconds: number;
  /** Actual duration in seconds (after completion) */
  actualDurationSeconds: number | null;
  /** Error message if failed */
  error: string | null;
  /** Output data from step */
  output: Record<string, unknown>;
  /** Started timestamp */
  startedAt: Date | null;
  /** Completed timestamp */
  completedAt: Date | null;
}

/**
 * Action plan status
 */
export type PlanStatus =
  | 'draft'
  | 'ready'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'rolled_back'
  | 'cancelled';

/**
 * Action execution plan
 */
export interface ActionPlan {
  /** Plan ID */
  id: string;
  /** Source action candidate */
  candidateId: string;
  /** Action type */
  actionType: ActionType;
  /** Plan title */
  title: string;
  /** Plan description */
  description: string;
  /** Plan status */
  status: PlanStatus;
  /** Execution steps */
  steps: ExecutionStep[];
  /** Current step index */
  currentStepIndex: number;
  /** Whether auto-execution is allowed */
  autoExecutable: boolean;
  /** Requires human approval */
  requiresApproval: boolean;
  /** Approval status */
  approved: boolean;
  /** Who approved */
  approvedBy: string | null;
  /** Approval timestamp */
  approvedAt: Date | null;
  /** Target entity type */
  entityType: string;
  /** Target entity ID */
  entityId: string | null;
  /** Related content IDs */
  contentIds: string[];
  /** Estimated total duration in seconds */
  estimatedDurationSeconds: number;
  /** Rollback plan reference */
  rollbackPlanId: string | null;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Completed timestamp */
  completedAt: Date | null;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Rollback plan
 */
export interface RollbackPlan {
  /** Rollback plan ID */
  id: string;
  /** Original plan ID */
  originalPlanId: string;
  /** Rollback steps */
  steps: ExecutionStep[];
  /** Status */
  status: PlanStatus;
  /** Reason for rollback */
  reason: string;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Action execution result
 */
export interface ExecutionResult {
  /** Plan ID */
  planId: string;
  /** Success status */
  success: boolean;
  /** Final status */
  status: PlanStatus;
  /** Steps completed */
  stepsCompleted: number;
  /** Total steps */
  totalSteps: number;
  /** Total duration in seconds */
  durationSeconds: number;
  /** Error if failed */
  error: string | null;
  /** Changes made */
  changes: ActionChange[];
  /** Rollback available */
  canRollback: boolean;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Individual change made by action
 */
export interface ActionChange {
  /** Change type */
  type: 'create' | 'update' | 'delete' | 'move' | 'transform';
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Field changed (if update) */
  field: string | null;
  /** Previous value */
  previousValue: unknown;
  /** New value */
  newValue: unknown;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Synthesis options
 */
export interface SynthesisOptions {
  /** Include backup steps */
  includeBackup?: boolean;
  /** Include verification steps */
  includeVerification?: boolean;
  /** Require approval */
  requireApproval?: boolean;
  /** Maximum steps */
  maxSteps?: number;
  /** Custom step timeout in seconds */
  stepTimeoutSeconds?: number;
}

/**
 * Plan summary for listings
 */
export interface PlanSummary {
  id: string;
  title: string;
  actionType: ActionType;
  status: PlanStatus;
  stepsCompleted: number;
  totalSteps: number;
  estimatedDurationSeconds: number;
  approved: boolean;
  requiresApproval: boolean;
  createdAt: Date;
}
