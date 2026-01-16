/**
 * Go-Live Control Plane - Executor Types
 *
 * Types for safe rollout execution
 */

import { RiskLevel, CapabilityDomain } from '../capabilities/types';
import { SimulationResult } from '../simulator/types';

/**
 * Execution status
 */
export type ExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rolled_back'
  | 'cancelled';

/**
 * Step status
 */
export type StepStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'rolled_back';

/**
 * Execution step
 */
export interface ExecutionStep {
  id: string;
  order: number;
  capabilityId: string;
  capabilityName: string;
  action: 'enable' | 'disable';
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: string;
  rollbackable: boolean;
}

/**
 * Execution plan
 */
export interface ExecutionPlan {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;

  // Steps
  steps: ExecutionStep[];
  totalSteps: number;

  // Metadata
  simulationId: string;
  riskLevel: RiskLevel;
  affectedDomains: CapabilityDomain[];

  // Safety
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;

  // Timing
  scheduledFor?: Date;
  expiresAt?: Date;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  planId: string;
  executionId: string;
  status: ExecutionStatus;

  // Progress
  stepsCompleted: number;
  stepsFailed: number;
  stepsSkipped: number;
  currentStep?: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;

  // Steps
  steps: ExecutionStep[];

  // Outcome
  success: boolean;
  errors: string[];
  warnings: string[];

  // Rollback
  rolledBack: boolean;
  rollbackReason?: string;
  rollbackAt?: Date;

  // Audit
  auditLog: AuditEntry[];
}

/**
 * Audit entry
 */
export interface AuditEntry {
  timestamp: Date;
  action: string;
  details: string;
  actor: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Rollback request
 */
export interface RollbackRequest {
  executionId: string;
  reason: string;
  actor: string;
  steps?: string[]; // Specific steps to rollback, or all if empty
}

/**
 * Rollback result
 */
export interface RollbackResult {
  executionId: string;
  success: boolean;
  stepsRolledBack: number;
  stepsFailed: number;
  errors: string[];
  completedAt: Date;
  durationMs: number;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  dryRun?: boolean;
  pauseBetweenSteps?: number; // ms
  stopOnError?: boolean;
  autoRollback?: boolean;
  timeout?: number; // ms
  actor?: string;
}

/**
 * Checkpoint for resumable execution
 */
export interface ExecutionCheckpoint {
  executionId: string;
  stepIndex: number;
  timestamp: Date;
  state: Map<string, boolean>;
  canResume: boolean;
}
