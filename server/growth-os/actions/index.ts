/**
 * Action Synthesis Engine (Subsystem 3)
 *
 * Generates executable action plans from prioritized candidates
 * with step-by-step execution and rollback support.
 */

// Types
export type {
  StepStatus,
  StepType,
  ExecutionStep,
  PlanStatus,
  ActionPlan,
  RollbackPlan,
  ExecutionResult,
  ActionChange,
  SynthesisOptions,
  PlanSummary,
} from './types';

// Synthesizer
export {
  synthesizePlan,
  synthesizePlans,
  approvePlan,
  markReady,
  cancelPlan,
  getPlanSummary,
  planRegistry,
  estimateBatchDuration,
  getReadyPlans,
  getPendingApproval,
} from './synthesizer';

// Executor
export {
  registerStepExecutor,
  executePlan,
  createRollbackPlan,
  executeRollback,
  pausePlan,
  resumePlan,
  getExecutionStats,
  type StepExecutor,
  type ExecutionStats,
} from './executor';
