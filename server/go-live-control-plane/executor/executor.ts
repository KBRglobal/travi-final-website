/**
 * Go-Live Control Plane - Safe Rollout Executor
 *
 * Executes capability changes with safety measures
 */

import { randomUUID } from 'crypto';
import {
  ExecutionPlan,
  ExecutionResult,
  ExecutionStep,
  ExecutionOptions,
  ExecutionStatus,
  StepStatus,
  RollbackRequest,
} from './types';
import { SimulationResult } from '../simulator/types';
import { isGLCPEnabled, RiskLevel, CapabilityDomain } from '../capabilities/types';
import { getCapability } from '../capabilities/registry';
import { logAuditEvent } from './audit';
import { createCheckpoint, rollback, canRollback, getRollbackInstructions } from './rollback';

// Execution storage (bounded)
const MAX_EXECUTIONS = 100;
const executions = new Map<string, ExecutionResult>();
const plans = new Map<string, ExecutionPlan>();

// Execution timeout
const DEFAULT_TIMEOUT = 300000; // 5 minutes
const DEFAULT_STEP_PAUSE = 100; // 100ms between steps

/**
 * Create an execution plan from simulation
 */
export function createPlan(
  simulation: SimulationResult,
  name: string,
  createdBy: string,
  options?: {
    description?: string;
    scheduledFor?: Date;
    expiresAt?: Date;
  }
): ExecutionPlan {
  const planId = randomUUID();

  // Build steps from simulation
  const steps: ExecutionStep[] = [];
  let order = 0;

  // Add enable steps
  for (const capId of simulation.enableOrder) {
    const cap = getCapability(capId);
    if (!cap) continue;

    steps.push({
      id: `${planId}-step-${order}`,
      order,
      capabilityId: capId,
      capabilityName: cap.name,
      action: 'enable',
      status: 'pending',
      rollbackable: true,
    });
    order++;
  }

  // Add disable steps
  for (const capId of simulation.disableOrder) {
    const cap = getCapability(capId);
    if (!cap) continue;

    steps.push({
      id: `${planId}-step-${order}`,
      order,
      capabilityId: capId,
      capabilityName: cap.name,
      action: 'disable',
      status: 'pending',
      rollbackable: true,
    });
    order++;
  }

  // Determine affected domains
  const affectedDomains = new Set<CapabilityDomain>();
  for (const impact of simulation.domainImpacts) {
    affectedDomains.add(impact.domain);
  }

  // Determine if approval required
  const requiresApproval = simulation.riskLevel === 'high' || simulation.riskLevel === 'critical';

  const plan: ExecutionPlan = {
    id: planId,
    name,
    description: options?.description,
    createdAt: new Date(),
    createdBy,
    steps,
    totalSteps: steps.length,
    simulationId: simulation.id,
    riskLevel: simulation.riskLevel,
    affectedDomains: Array.from(affectedDomains),
    requiresApproval,
    scheduledFor: options?.scheduledFor,
    expiresAt: options?.expiresAt,
  };

  // Store plan
  if (plans.size >= MAX_EXECUTIONS) {
    const oldestKey = plans.keys().next().value;
    if (oldestKey) plans.delete(oldestKey);
  }
  plans.set(planId, plan);

  logAuditEvent(
    'plan_created',
    `Execution plan "${name}" created with ${steps.length} steps`,
    createdBy,
    true,
    { planId, riskLevel: simulation.riskLevel, steps: steps.length }
  );

  return plan;
}

/**
 * Approve an execution plan
 */
export function approvePlan(
  planId: string,
  approvedBy: string
): ExecutionPlan | null {
  const plan = plans.get(planId);
  if (!plan) return null;

  plan.approvedBy = approvedBy;
  plan.approvedAt = new Date();

  logAuditEvent(
    'plan_approved',
    `Plan "${plan.name}" approved`,
    approvedBy,
    true,
    { planId }
  );

  return plan;
}

/**
 * Execute a plan
 */
export async function execute(
  planId: string,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const plan = plans.get(planId);

  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }

  if (plan.requiresApproval && !plan.approvedBy) {
    throw new Error('Plan requires approval before execution');
  }

  if (plan.expiresAt && new Date() > plan.expiresAt) {
    throw new Error('Plan has expired');
  }

  if (!isGLCPEnabled() && !options.dryRun) {
    throw new Error('GLCP is not enabled');
  }

  const {
    dryRun = false,
    pauseBetweenSteps = DEFAULT_STEP_PAUSE,
    stopOnError = true,
    autoRollback = true,
    timeout = DEFAULT_TIMEOUT,
    actor = 'system',
  } = options;

  const executionId = randomUUID();
  const startTime = Date.now();

  // Initialize result
  const result: ExecutionResult = {
    planId,
    executionId,
    status: 'in_progress',
    stepsCompleted: 0,
    stepsFailed: 0,
    stepsSkipped: 0,
    startedAt: new Date(),
    durationMs: 0,
    steps: JSON.parse(JSON.stringify(plan.steps)), // Deep copy
    success: false,
    errors: [],
    warnings: [],
    rolledBack: false,
    auditLog: [],
  };

  // Store execution
  storeExecution(result);

  // Create checkpoint
  createCheckpoint(executionId, 0);

  logAuditEvent(
    'execution_started',
    `Execution started for plan "${plan.name}"${dryRun ? ' (dry run)' : ''}`,
    actor,
    true,
    { executionId, planId, dryRun }
  );

  try {
    // Execute steps with timeout
    await Promise.race([
      executeSteps(result, { dryRun, pauseBetweenSteps, stopOnError }, actor),
      createTimeoutPromise(timeout),
    ]);

    result.success = result.stepsFailed === 0;
    result.status = result.success ? 'completed' : 'failed';
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(errorMsg);
    result.status = 'failed';
    result.success = false;

    // Auto-rollback on failure
    if (autoRollback && !dryRun && result.stepsCompleted > 0) {
      try {
        const rollbackRequest: RollbackRequest = {
          executionId,
          reason: `Auto-rollback due to: ${errorMsg}`,
          actor: 'system',
        };

        const completedSteps = result.steps.filter(s => s.status === 'success');
        await rollback(rollbackRequest, completedSteps);

        result.rolledBack = true;
        result.rollbackReason = errorMsg;
        result.rollbackAt = new Date();
        result.status = 'rolled_back';
      } catch (rollbackErr) {
        const rbError = rollbackErr instanceof Error ? rollbackErr.message : 'Unknown';
        result.errors.push(`Rollback failed: ${rbError}`);
      }
    }
  }

  result.completedAt = new Date();
  result.durationMs = Date.now() - startTime;

  logAuditEvent(
    result.success ? 'execution_completed' : 'execution_failed',
    `Execution ${result.success ? 'completed' : 'failed'}: ${result.stepsCompleted} succeeded, ${result.stepsFailed} failed`,
    actor,
    result.success,
    { executionId, planId, stepsCompleted: result.stepsCompleted, stepsFailed: result.stepsFailed }
  );

  // Update stored execution
  storeExecution(result);

  return result;
}

/**
 * Execute steps sequentially
 */
async function executeSteps(
  result: ExecutionResult,
  options: { dryRun: boolean; pauseBetweenSteps: number; stopOnError: boolean },
  actor: string
): Promise<void> {
  for (const step of result.steps) {
    result.currentStep = step.id;

    // Skip if we should stop on error and had failures
    if (options.stopOnError && result.stepsFailed > 0) {
      step.status = 'skipped';
      result.stepsSkipped++;
      continue;
    }

    step.status = 'running';
    step.startedAt = new Date();

    logAuditEvent(
      'step_started',
      `Starting step: ${step.action} ${step.capabilityName}`,
      actor,
      true,
      { executionId: result.executionId, stepId: step.id }
    );

    try {
      if (options.dryRun) {
        // Dry run - just simulate
        await new Promise(resolve => setTimeout(resolve, 10));
      } else {
        // Actually execute the step
        await executeStep(step);
      }

      step.status = 'success';
      step.completedAt = new Date();
      step.durationMs = step.completedAt.getTime() - step.startedAt.getTime();
      result.stepsCompleted++;

      logAuditEvent(
        'step_completed',
        `Step completed: ${step.action} ${step.capabilityName}`,
        actor,
        true,
        { executionId: result.executionId, stepId: step.id, durationMs: step.durationMs }
      );
    } catch (err) {
      step.status = 'failed';
      step.completedAt = new Date();
      step.durationMs = step.completedAt.getTime() - step.startedAt.getTime();
      step.error = err instanceof Error ? err.message : 'Unknown error';
      result.stepsFailed++;
      result.errors.push(`Step ${step.order}: ${step.error}`);

      logAuditEvent(
        'step_failed',
        `Step failed: ${step.action} ${step.capabilityName} - ${step.error}`,
        actor,
        false,
        { executionId: result.executionId, stepId: step.id, error: step.error }
      );

      if (options.stopOnError) {
        throw new Error(`Step ${step.order} failed: ${step.error}`);
      }
    }

    // Pause between steps
    if (options.pauseBetweenSteps > 0) {
      await new Promise(resolve => setTimeout(resolve, options.pauseBetweenSteps));
    }
  }
}

/**
 * Execute a single step
 */
async function executeStep(step: ExecutionStep): Promise<void> {
  const cap = getCapability(step.capabilityId);
  if (!cap) {
    throw new Error(`Capability ${step.capabilityId} not found`);
  }

  // In a real implementation, this would:
  // 1. Update environment variable or feature flag service
  // 2. Notify dependent services
  // 3. Clear relevant caches
  // 4. Wait for propagation

  // For now, we simulate the execution
  await new Promise(resolve => setTimeout(resolve, 50));

  // Validate the change took effect (in real implementation)
  // await validateStepEffect(step);
}

/**
 * Get execution result
 */
export function getExecution(executionId: string): ExecutionResult | undefined {
  return executions.get(executionId);
}

/**
 * Get plan
 */
export function getPlan(planId: string): ExecutionPlan | undefined {
  return plans.get(planId);
}

/**
 * List recent executions
 */
export function listExecutions(options: {
  limit?: number;
  status?: ExecutionStatus;
} = {}): ExecutionResult[] {
  let results = Array.from(executions.values());

  if (options.status) {
    results = results.filter(r => r.status === options.status);
  }

  results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return results.slice(0, options.limit || 50);
}

/**
 * Cancel a pending execution
 */
export function cancelExecution(
  executionId: string,
  actor: string
): ExecutionResult | null {
  const result = executions.get(executionId);
  if (!result) return null;

  if (result.status !== 'pending' && result.status !== 'in_progress') {
    return null;
  }

  result.status = 'cancelled';
  result.completedAt = new Date();
  result.durationMs = result.completedAt.getTime() - result.startedAt.getTime();

  logAuditEvent(
    'execution_failed',
    `Execution cancelled by ${actor}`,
    actor,
    true,
    { executionId }
  );

  return result;
}

/**
 * Request rollback of an execution
 */
export async function requestRollback(
  executionId: string,
  reason: string,
  actor: string
): Promise<{ success: boolean; result?: ExecutionResult; error?: string }> {
  const result = executions.get(executionId);
  if (!result) {
    return { success: false, error: 'Execution not found' };
  }

  const { canRollback: can, reason: cantReason } = canRollback(result);
  if (!can) {
    return { success: false, error: cantReason };
  }

  const rollbackRequest: RollbackRequest = {
    executionId,
    reason,
    actor,
  };

  const completedSteps = result.steps.filter(s => s.status === 'success');
  const rollbackResult = await rollback(rollbackRequest, completedSteps);

  if (rollbackResult.success) {
    result.rolledBack = true;
    result.rollbackReason = reason;
    result.rollbackAt = new Date();
    result.status = 'rolled_back';
    return { success: true, result };
  } else {
    return { success: false, error: rollbackResult.errors.join(', ') };
  }
}

/**
 * Get rollback instructions for manual rollback
 */
export function getManualRollbackInstructions(executionId: string): string[] | null {
  const result = executions.get(executionId);
  if (!result) return null;

  return getRollbackInstructions(result.steps);
}

// === Helper functions ===

function storeExecution(result: ExecutionResult): void {
  if (executions.size >= MAX_EXECUTIONS) {
    const oldestKey = executions.keys().next().value;
    if (oldestKey) executions.delete(oldestKey);
  }
  executions.set(result.executionId, result);
}

function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Execution timeout')), timeout)
  );
}

/**
 * Clear all plans and executions (for testing)
 */
export function clearExecutorState(): void {
  executions.clear();
  plans.clear();
}
