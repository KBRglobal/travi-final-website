/**
 * Plan Executor
 *
 * Executes action plans with timeout handling and rollback support.
 */

import { randomUUID } from 'crypto';
import type {
  ActionPlan,
  ExecutionStep,
  ExecutionResult,
  ActionChange,
  RollbackPlan,
} from './types';
import { planRegistry } from './synthesizer';
import { isActionsEnabled, getGrowthOSConfig, getAutonomyLevel } from '../config';
import { log } from '../../lib/logger';

/**
 * Step executor function type
 */
export type StepExecutor = (
  step: ExecutionStep,
  plan: ActionPlan
) => Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }>;

/**
 * Default step executor (simulates execution)
 */
const defaultStepExecutor: StepExecutor = async (step) => {
  // Simulate async work
  await new Promise(resolve => setTimeout(resolve, step.estimatedDurationSeconds * 100));
  return { success: true, output: { simulated: true } };
};

/**
 * Registered step executors by step type
 */
const stepExecutors = new Map<string, StepExecutor>();

/**
 * Register a step executor
 */
export function registerStepExecutor(stepType: string, executor: StepExecutor): void {
  stepExecutors.set(stepType, executor);
}

/**
 * Get executor for step
 */
function getExecutor(step: ExecutionStep): StepExecutor {
  return stepExecutors.get(step.type) || defaultStepExecutor;
}

/**
 * Execute a single step with timeout
 */
async function executeStep(
  step: ExecutionStep,
  plan: ActionPlan,
  timeoutMs: number
): Promise<{ success: boolean; error?: string }> {
  const executor = getExecutor(step);

  // Update step status
  step.status = 'running';
  step.startedAt = new Date();

  try {
    // Execute with timeout
    const result = await Promise.race([
      executor(step, plan),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Step timeout')), timeoutMs)
      ),
    ]);

    step.status = result.success ? 'completed' : 'failed';
    step.completedAt = new Date();
    step.actualDurationSeconds = (step.completedAt.getTime() - step.startedAt!.getTime()) / 1000;
    step.output = result.output || {};

    if (!result.success) {
      step.error = result.error || 'Step failed';
      return { success: false, error: step.error };
    }

    return { success: true };
  } catch (error) {
    step.status = 'failed';
    step.completedAt = new Date();
    step.actualDurationSeconds = (step.completedAt.getTime() - step.startedAt!.getTime()) / 1000;
    step.error = error instanceof Error ? error.message : 'Unknown error';

    return { success: false, error: step.error };
  }
}

/**
 * Execute an action plan
 */
export async function executePlan(
  plan: ActionPlan,
  options: { dryRun?: boolean; onProgress?: (step: ExecutionStep, plan: ActionPlan) => void } = {}
): Promise<ExecutionResult> {
  if (!isActionsEnabled()) {
    return {
      planId: plan.id,
      success: false,
      status: 'failed',
      stepsCompleted: 0,
      totalSteps: plan.steps.length,
      durationSeconds: 0,
      error: 'Actions subsystem is disabled',
      changes: [],
      canRollback: false,
      timestamp: new Date(),
    };
  }

  const config = getGrowthOSConfig();
  const autonomy = getAutonomyLevel();

  // Check autonomy level
  if (autonomy === 'disabled') {
    return {
      planId: plan.id,
      success: false,
      status: 'failed',
      stepsCompleted: 0,
      totalSteps: plan.steps.length,
      durationSeconds: 0,
      error: 'Autonomy is disabled',
      changes: [],
      canRollback: false,
      timestamp: new Date(),
    };
  }

  // Check approval
  if (plan.requiresApproval && !plan.approved) {
    return {
      planId: plan.id,
      success: false,
      status: 'failed',
      stepsCompleted: 0,
      totalSteps: plan.steps.length,
      durationSeconds: 0,
      error: 'Plan requires approval',
      changes: [],
      canRollback: false,
      timestamp: new Date(),
    };
  }

  const startTime = Date.now();
  const changes: ActionChange[] = [];
  let stepsCompleted = 0;

  // Update plan status
  plan.status = 'executing';
  plan.updatedAt = new Date();
  planRegistry.update(plan);

  log.info(`[GrowthOS] Executing plan: ${plan.title} (${plan.steps.length} steps)`);

  try {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      plan.currentStepIndex = i;

      if (options.dryRun) {
        step.status = 'completed';
        step.output = { dryRun: true };
        stepsCompleted++;
        continue;
      }

      // Notify progress
      if (options.onProgress) {
        options.onProgress(step, plan);
      }

      // Execute step
      const result = await executeStep(step, plan, config.defaultTimeoutMs);

      if (!result.success) {
        // Step failed
        if (step.required) {
          // Required step failed - stop execution
          plan.status = 'failed';
          plan.updatedAt = new Date();
          planRegistry.update(plan);

          return {
            planId: plan.id,
            success: false,
            status: 'failed',
            stepsCompleted,
            totalSteps: plan.steps.length,
            durationSeconds: (Date.now() - startTime) / 1000,
            error: `Step "${step.name}" failed: ${result.error}`,
            changes,
            canRollback: hasRollbackableSteps(plan, stepsCompleted),
            timestamp: new Date(),
          };
        }

        // Optional step failed - skip and continue
        step.status = 'skipped';
        log.warn(`[GrowthOS] Optional step skipped: ${step.name} - ${result.error}`);
        continue;
      }

      stepsCompleted++;

      // Track changes from execution steps
      if (step.type === 'execution' && step.output.changes) {
        changes.push(...(step.output.changes as ActionChange[]));
      }
    }

    // All steps completed
    plan.status = 'completed';
    plan.completedAt = new Date();
    plan.updatedAt = new Date();
    planRegistry.update(plan);

    const durationSeconds = (Date.now() - startTime) / 1000;
    log.info(`[GrowthOS] Plan completed: ${plan.title} in ${durationSeconds.toFixed(1)}s`);

    return {
      planId: plan.id,
      success: true,
      status: 'completed',
      stepsCompleted,
      totalSteps: plan.steps.length,
      durationSeconds,
      error: null,
      changes,
      canRollback: hasRollbackableSteps(plan, stepsCompleted),
      timestamp: new Date(),
    };
  } catch (error) {
    plan.status = 'failed';
    plan.updatedAt = new Date();
    planRegistry.update(plan);

    return {
      planId: plan.id,
      success: false,
      status: 'failed',
      stepsCompleted,
      totalSteps: plan.steps.length,
      durationSeconds: (Date.now() - startTime) / 1000,
      error: error instanceof Error ? error.message : 'Unknown execution error',
      changes,
      canRollback: hasRollbackableSteps(plan, stepsCompleted),
      timestamp: new Date(),
    };
  }
}

/**
 * Check if plan has rollbackable steps
 */
function hasRollbackableSteps(plan: ActionPlan, completedCount: number): boolean {
  return plan.steps
    .slice(0, completedCount)
    .some(step => step.canRollback && step.status === 'completed');
}

/**
 * Create rollback plan
 */
export function createRollbackPlan(plan: ActionPlan, reason: string): RollbackPlan {
  const rollbackSteps: ExecutionStep[] = [];

  // Find completed steps that can be rolled back
  for (let i = plan.currentStepIndex; i >= 0; i--) {
    const step = plan.steps[i];
    if (step.canRollback && step.status === 'completed') {
      rollbackSteps.push({
        id: randomUUID(),
        type: 'execution',
        name: `Rollback: ${step.name}`,
        description: `Undo changes from step: ${step.name}`,
        status: 'pending',
        required: true,
        canRollback: false,
        estimatedDurationSeconds: step.actualDurationSeconds || step.estimatedDurationSeconds,
        actualDurationSeconds: null,
        error: null,
        output: { originalStepId: step.id, originalOutput: step.output },
        startedAt: null,
        completedAt: null,
      });
    }
  }

  return {
    id: randomUUID(),
    originalPlanId: plan.id,
    steps: rollbackSteps,
    status: 'draft',
    reason,
    createdAt: new Date(),
  };
}

/**
 * Execute rollback
 */
export async function executeRollback(
  rollbackPlan: RollbackPlan
): Promise<ExecutionResult> {
  if (!isActionsEnabled()) {
    return {
      planId: rollbackPlan.id,
      success: false,
      status: 'failed',
      stepsCompleted: 0,
      totalSteps: rollbackPlan.steps.length,
      durationSeconds: 0,
      error: 'Actions subsystem is disabled',
      changes: [],
      canRollback: false,
      timestamp: new Date(),
    };
  }

  const config = getGrowthOSConfig();
  const startTime = Date.now();
  let stepsCompleted = 0;
  const changes: ActionChange[] = [];

  rollbackPlan.status = 'executing';

  log.info(`[GrowthOS] Executing rollback: ${rollbackPlan.reason} (${rollbackPlan.steps.length} steps)`);

  try {
    for (const step of rollbackPlan.steps) {
      const result = await executeStep(step, { steps: rollbackPlan.steps } as ActionPlan, config.defaultTimeoutMs);

      if (!result.success) {
        rollbackPlan.status = 'failed';
        return {
          planId: rollbackPlan.id,
          success: false,
          status: 'failed',
          stepsCompleted,
          totalSteps: rollbackPlan.steps.length,
          durationSeconds: (Date.now() - startTime) / 1000,
          error: `Rollback step failed: ${result.error}`,
          changes,
          canRollback: false,
          timestamp: new Date(),
        };
      }

      stepsCompleted++;
    }

    rollbackPlan.status = 'completed';

    // Update original plan
    const originalPlan = planRegistry.get(rollbackPlan.originalPlanId);
    if (originalPlan) {
      originalPlan.status = 'rolled_back';
      originalPlan.updatedAt = new Date();
      planRegistry.update(originalPlan);
    }

    return {
      planId: rollbackPlan.id,
      success: true,
      status: 'completed',
      stepsCompleted,
      totalSteps: rollbackPlan.steps.length,
      durationSeconds: (Date.now() - startTime) / 1000,
      error: null,
      changes,
      canRollback: false,
      timestamp: new Date(),
    };
  } catch (error) {
    rollbackPlan.status = 'failed';
    return {
      planId: rollbackPlan.id,
      success: false,
      status: 'failed',
      stepsCompleted,
      totalSteps: rollbackPlan.steps.length,
      durationSeconds: (Date.now() - startTime) / 1000,
      error: error instanceof Error ? error.message : 'Unknown rollback error',
      changes,
      canRollback: false,
      timestamp: new Date(),
    };
  }
}

/**
 * Pause a running plan
 */
export function pausePlan(plan: ActionPlan): ActionPlan {
  if (plan.status !== 'executing') {
    throw new Error('Can only pause executing plans');
  }

  plan.status = 'paused';
  plan.updatedAt = new Date();
  planRegistry.update(plan);

  return plan;
}

/**
 * Resume a paused plan
 */
export async function resumePlan(plan: ActionPlan): Promise<ExecutionResult> {
  if (plan.status !== 'paused') {
    throw new Error('Can only resume paused plans');
  }

  // Resume from current step
  return executePlan(plan);
}

/**
 * Get execution statistics
 */
export interface ExecutionStats {
  totalPlans: number;
  completed: number;
  failed: number;
  executing: number;
  pending: number;
  avgDurationSeconds: number;
  successRate: number;
}

export function getExecutionStats(): ExecutionStats {
  const plans = planRegistry.getAll();

  if (plans.length === 0) {
    return {
      totalPlans: 0,
      completed: 0,
      failed: 0,
      executing: 0,
      pending: 0,
      avgDurationSeconds: 0,
      successRate: 0,
    };
  }

  let completed = 0;
  let failed = 0;
  let executing = 0;
  let pending = 0;
  let totalDuration = 0;
  let durationCount = 0;

  for (const plan of plans) {
    switch (plan.status) {
      case 'completed':
        completed++;
        if (plan.completedAt && plan.createdAt) {
          totalDuration += (plan.completedAt.getTime() - plan.createdAt.getTime()) / 1000;
          durationCount++;
        }
        break;
      case 'failed':
      case 'rolled_back':
        failed++;
        break;
      case 'executing':
        executing++;
        break;
      case 'draft':
      case 'ready':
        pending++;
        break;
    }
  }

  const completedOrFailed = completed + failed;
  const successRate = completedOrFailed > 0 ? (completed / completedOrFailed) * 100 : 0;

  return {
    totalPlans: plans.length,
    completed,
    failed,
    executing,
    pending,
    avgDurationSeconds: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    successRate: Math.round(successRate),
  };
}
