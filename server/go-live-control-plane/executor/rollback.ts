/**
 * Go-Live Control Plane - Rollback Manager
 *
 * Handles automatic and manual rollback of executions
 */

import {
  ExecutionResult,
  ExecutionStep,
  RollbackRequest,
  RollbackResult,
  ExecutionCheckpoint,
} from './types';
import { logAuditEvent } from './audit';
import { getCapability } from '../capabilities/registry';

// Checkpoint storage (bounded)
const MAX_CHECKPOINTS = 100;
const checkpoints = new Map<string, ExecutionCheckpoint>();

/**
 * Create a checkpoint before execution
 */
export function createCheckpoint(
  executionId: string,
  stepIndex: number
): ExecutionCheckpoint {
  // Capture current state
  const state = new Map<string, boolean>();

  // In a real implementation, we would get actual flag states
  // For now, we capture what we know from the registry

  const checkpoint: ExecutionCheckpoint = {
    executionId,
    stepIndex,
    timestamp: new Date(),
    state,
    canResume: true,
  };

  // Store with bounded size
  if (checkpoints.size >= MAX_CHECKPOINTS) {
    const oldestKey = checkpoints.keys().next().value;
    if (oldestKey) checkpoints.delete(oldestKey);
  }
  checkpoints.set(executionId, checkpoint);

  logAuditEvent(
    'checkpoint_created',
    `Checkpoint created at step ${stepIndex}`,
    'system',
    true,
    { executionId, stepIndex }
  );

  return checkpoint;
}

/**
 * Get checkpoint for an execution
 */
export function getCheckpoint(executionId: string): ExecutionCheckpoint | undefined {
  return checkpoints.get(executionId);
}

/**
 * Rollback an execution
 */
export async function rollback(
  request: RollbackRequest,
  completedSteps: ExecutionStep[]
): Promise<RollbackResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let stepsRolledBack = 0;
  let stepsFailed = 0;

  logAuditEvent(
    'rollback_started',
    `Rollback initiated: ${request.reason}`,
    request.actor,
    true,
    { executionId: request.executionId, reason: request.reason }
  );

  // Determine which steps to rollback
  const stepsToRollback = request.steps && request.steps.length > 0
    ? completedSteps.filter(s => request.steps!.includes(s.id))
    : completedSteps.filter(s => s.status === 'success' && s.rollbackable);

  // Rollback in reverse order
  const reversedSteps = [...stepsToRollback].reverse();

  for (const step of reversedSteps) {
    try {
      await rollbackStep(step);
      stepsRolledBack++;
    } catch (err) {
      stepsFailed++;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to rollback ${step.capabilityName}: ${errorMsg}`);
    }
  }

  const success = stepsFailed === 0;

  logAuditEvent(
    success ? 'rollback_completed' : 'rollback_failed',
    `Rollback ${success ? 'completed' : 'failed'}: ${stepsRolledBack} steps rolled back, ${stepsFailed} failed`,
    request.actor,
    success,
    { executionId: request.executionId, stepsRolledBack, stepsFailed }
  );

  return {
    executionId: request.executionId,
    success,
    stepsRolledBack,
    stepsFailed,
    errors,
    completedAt: new Date(),
    durationMs: Date.now() - startTime,
  };
}

/**
 * Rollback a single step
 */
async function rollbackStep(step: ExecutionStep): Promise<void> {
  const cap = getCapability(step.capabilityId);
  if (!cap) {
    throw new Error(`Capability ${step.capabilityId} not found`);
  }

  // In a real implementation, this would:
  // 1. Update environment variables
  // 2. Notify dependent services
  // 3. Clear caches
  // 4. Update feature flag service

  // For now, we simulate the rollback
  const rollbackAction = step.action === 'enable' ? 'disable' : 'enable';

  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 10));

  // Log the rollback
  logAuditEvent(
    'step_completed',
    `Rolled back ${step.capabilityName} (${rollbackAction})`,
    'system',
    true,
    { stepId: step.id, capabilityId: step.capabilityId, action: rollbackAction }
  );
}

/**
 * Check if execution can be rolled back
 */
export function canRollback(result: ExecutionResult): {
  canRollback: boolean;
  reason?: string;
  rollbackableSteps: number;
} {
  if (result.rolledBack) {
    return {
      canRollback: false,
      reason: 'Execution already rolled back',
      rollbackableSteps: 0,
    };
  }

  if (result.status === 'pending' || result.status === 'in_progress') {
    return {
      canRollback: false,
      reason: 'Execution still in progress',
      rollbackableSteps: 0,
    };
  }

  const rollbackableSteps = result.steps.filter(
    s => s.status === 'success' && s.rollbackable
  ).length;

  if (rollbackableSteps === 0) {
    return {
      canRollback: false,
      reason: 'No rollbackable steps',
      rollbackableSteps: 0,
    };
  }

  return {
    canRollback: true,
    rollbackableSteps,
  };
}

/**
 * Get rollback instructions (for manual rollback)
 */
export function getRollbackInstructions(
  completedSteps: ExecutionStep[]
): string[] {
  const instructions: string[] = [];

  const rollbackableSteps = completedSteps
    .filter(s => s.status === 'success' && s.rollbackable)
    .reverse();

  for (const step of rollbackableSteps) {
    const cap = getCapability(step.capabilityId);
    if (!cap) continue;

    if (step.action === 'enable') {
      instructions.push(`Disable ${cap.name}: unset ${cap.envVarName} or set to 'false'`);
    } else {
      instructions.push(`Re-enable ${cap.name}: set ${cap.envVarName}=true`);
    }
  }

  if (instructions.length > 0) {
    instructions.push('Restart affected services after making changes');
    instructions.push('Verify system health using: GET /api/glcp/health');
  }

  return instructions;
}

/**
 * Restore from checkpoint
 */
export async function restoreFromCheckpoint(
  checkpoint: ExecutionCheckpoint
): Promise<{ success: boolean; restored: number; errors: string[] }> {
  const errors: string[] = [];
  let restored = 0;

  logAuditEvent(
    'checkpoint_restored',
    `Restoring from checkpoint at step ${checkpoint.stepIndex}`,
    'system',
    true,
    { executionId: checkpoint.executionId }
  );

  for (const [capId, enabled] of checkpoint.state) {
    try {
      const cap = getCapability(capId);
      if (!cap) continue;

      // In a real implementation, restore the flag state
      // await setFlagState(capId, enabled);
      restored++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to restore ${capId}: ${msg}`);
    }
  }

  return {
    success: errors.length === 0,
    restored,
    errors,
  };
}

/**
 * Clear old checkpoints
 */
export function clearOldCheckpoints(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs;
  let cleared = 0;

  for (const [id, checkpoint] of checkpoints) {
    if (checkpoint.timestamp.getTime() < cutoff) {
      checkpoints.delete(id);
      cleared++;
    }
  }

  return cleared;
}
