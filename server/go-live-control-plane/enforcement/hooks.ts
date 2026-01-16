/**
 * GLCP Enforcement Hooks
 *
 * Drop-in hooks for existing choke points.
 * Import and call these at decision points.
 */

import {
  checkOperation,
  canPublish as glcpCanPublish,
  canSchedule,
  canRunJob,
  canMakeAICall,
  canRegenerate,
  canRollout,
  canExecuteBulkChange,
  logEnforcement,
  EnforcementDecision,
  OperationContext,
} from './index';
import { isGLCPEnabled } from '../capabilities/types';

// ========================================
// PUBLISH GATE HOOK
// ========================================

/**
 * Hook for publish gates
 * Call before allowing any content to be published
 */
export async function beforePublish(
  contentId: string,
  options?: { actor?: string; bypassOnDisabled?: boolean }
): Promise<{ allowed: boolean; reason: string; decision?: EnforcementDecision }> {
  if (!isGLCPEnabled() && options?.bypassOnDisabled !== false) {
    return { allowed: true, reason: 'GLCP disabled' };
  }

  const decision = await glcpCanPublish(contentId, options?.actor);
  logEnforcement(decision, { type: 'publish', resourceId: contentId, actor: options?.actor });

  return {
    allowed: decision.action !== 'block',
    reason: decision.reason,
    decision,
  };
}

/**
 * Hook for schedule gates
 */
export async function beforeSchedule(
  contentId: string,
  scheduledTime: Date,
  options?: { actor?: string }
): Promise<{ allowed: boolean; reason: string; decision?: EnforcementDecision }> {
  if (!isGLCPEnabled()) {
    return { allowed: true, reason: 'GLCP disabled' };
  }

  const decision = await canSchedule(contentId, options?.actor);
  logEnforcement(decision, { type: 'schedule', resourceId: contentId, actor: options?.actor });

  return {
    allowed: decision.action !== 'block',
    reason: decision.reason,
    decision,
  };
}

// ========================================
// JOB QUEUE HOOK
// ========================================

/**
 * Hook for job queue processing
 * Call before processing any background job
 */
export async function beforeJobExecution(
  jobType: string,
  jobId: string
): Promise<{ allowed: boolean; reason: string; shouldDelay?: boolean }> {
  if (!isGLCPEnabled()) {
    return { allowed: true, reason: 'GLCP disabled' };
  }

  const decision = await canRunJob(jobType, jobId);
  logEnforcement(decision, { type: 'job', resourceId: jobId, metadata: { jobType } });

  // If warned, allow but mark for potential delay
  if (decision.action === 'warn') {
    return {
      allowed: true,
      reason: decision.reason,
      shouldDelay: true,
    };
  }

  return {
    allowed: decision.action !== 'block',
    reason: decision.reason,
  };
}

// ========================================
// AI ORCHESTRATOR HOOK
// ========================================

/**
 * Hook for AI calls
 * Call before making any AI API request
 */
export async function beforeAICall(
  provider: string,
  taskType: string,
  options?: { priority?: 'low' | 'medium' | 'high' | 'critical' }
): Promise<{ allowed: boolean; reason: string; degrade?: boolean }> {
  if (!isGLCPEnabled()) {
    return { allowed: true, reason: 'GLCP disabled' };
  }

  const decision = await canMakeAICall(provider, taskType);
  logEnforcement(decision, { type: 'ai_call', metadata: { provider, taskType, priority: options?.priority } });

  // For AI, warn means degrade (use fallback/cached)
  if (decision.action === 'warn') {
    return {
      allowed: true,
      reason: decision.reason,
      degrade: true,
    };
  }

  // For low priority AI tasks, block if system is not fully ready
  if (options?.priority === 'low' && decision.status !== 'READY') {
    return {
      allowed: false,
      reason: 'Low priority AI tasks blocked during degraded state',
    };
  }

  return {
    allowed: decision.action !== 'block',
    reason: decision.reason,
  };
}

// ========================================
// AUTONOMY/REGENERATION HOOK
// ========================================

/**
 * Hook for content regeneration/auto-healing
 * Call before any autonomous content modification
 */
export async function beforeRegeneration(
  contentId: string,
  regenerationType: 'auto' | 'manual' | 'scheduled'
): Promise<{ allowed: boolean; reason: string; deferUntilHealthy?: boolean }> {
  if (!isGLCPEnabled()) {
    return { allowed: true, reason: 'GLCP disabled' };
  }

  const decision = await canRegenerate(contentId);
  logEnforcement(decision, { type: 'regeneration', resourceId: contentId, metadata: { regenerationType } });

  // Auto regeneration blocked if not fully ready
  if (regenerationType === 'auto' && decision.status !== 'READY') {
    return {
      allowed: false,
      reason: 'Automatic regeneration paused - system not fully ready',
      deferUntilHealthy: true,
    };
  }

  // Manual regeneration allowed with warning if degraded
  if (decision.action === 'warn' && regenerationType === 'manual') {
    return {
      allowed: true,
      reason: `${decision.reason} - proceeding with manual request`,
    };
  }

  return {
    allowed: decision.action !== 'block',
    reason: decision.reason,
    deferUntilHealthy: decision.action === 'block',
  };
}

// ========================================
// ROLLOUT HOOK
// ========================================

/**
 * Hook for feature rollout
 * Call before enabling any feature flag
 */
export async function beforeRollout(
  featureFlag: string,
  rolloutType: 'immediate' | 'percentage' | 'canary'
): Promise<{ allowed: boolean; reason: string; blockers?: string[] }> {
  if (!isGLCPEnabled()) {
    return { allowed: true, reason: 'GLCP disabled' };
  }

  const decision = await canRollout(featureFlag);
  logEnforcement(decision, { type: 'rollout', resourceId: featureFlag, metadata: { rolloutType } });

  // Immediate rollout requires fully ready
  if (rolloutType === 'immediate' && decision.status !== 'READY') {
    return {
      allowed: false,
      reason: 'Immediate rollout blocked - system must be fully ready',
      blockers: decision.blockers,
    };
  }

  return {
    allowed: decision.action !== 'block',
    reason: decision.reason,
    blockers: decision.blockers,
  };
}

// ========================================
// BULK CHANGE HOOK
// ========================================

/**
 * Hook for bulk/destructive changes
 * Call before executing any bulk operation
 */
export async function beforeBulkChange(
  changeType: string,
  affectedCount: number,
  options?: { dryRun?: boolean }
): Promise<{ allowed: boolean; reason: string; requiresApproval?: boolean }> {
  if (!isGLCPEnabled()) {
    return { allowed: true, reason: 'GLCP disabled' };
  }

  // Dry runs always allowed
  if (options?.dryRun) {
    return { allowed: true, reason: 'Dry run allowed' };
  }

  const decision = await canExecuteBulkChange(changeType, affectedCount);
  logEnforcement(decision, { type: 'bulk_change', metadata: { changeType, affectedCount } });

  // Large bulk changes require extra approval
  if (affectedCount > 100 && decision.action === 'warn') {
    return {
      allowed: true,
      reason: decision.reason,
      requiresApproval: true,
    };
  }

  return {
    allowed: decision.action !== 'block',
    reason: decision.reason,
    requiresApproval: affectedCount > 500,
  };
}

// ========================================
// MIGRATION HOOK
// ========================================

/**
 * Hook for data migrations
 * Call before running any migration
 */
export async function beforeMigration(
  migrationId: string,
  migrationType: 'schema' | 'data' | 'backfill'
): Promise<{ allowed: boolean; reason: string }> {
  if (!isGLCPEnabled()) {
    return { allowed: true, reason: 'GLCP disabled' };
  }

  // Migrations are treated as bulk changes
  const decision = await canExecuteBulkChange(`migration:${migrationType}`, 1000);
  logEnforcement(decision, { type: 'bulk_change', resourceId: migrationId, metadata: { migrationType } });

  // Schema migrations blocked if not ready
  if (migrationType === 'schema' && decision.status !== 'READY') {
    return {
      allowed: false,
      reason: 'Schema migrations blocked - system must be fully ready',
    };
  }

  return {
    allowed: decision.action !== 'block',
    reason: decision.reason,
  };
}

// ========================================
// COMPOSITE CHECK
// ========================================

/**
 * Check multiple operations at once
 */
export async function checkMultiple(
  operations: OperationContext[]
): Promise<Map<string, { allowed: boolean; reason: string }>> {
  const results = new Map<string, { allowed: boolean; reason: string }>();

  for (const op of operations) {
    const decision = await checkOperation(op);
    const key = `${op.type}:${op.resourceId || 'global'}`;
    results.set(key, {
      allowed: decision.action !== 'block',
      reason: decision.reason,
    });
  }

  return results;
}

// ========================================
// STATUS HELPERS
// ========================================

/**
 * Get current enforcement status (for UI display)
 */
export function getEnforcementStatus(): {
  enabled: boolean;
  emergencyStop: boolean;
} {
  return {
    enabled: isGLCPEnabled(),
    emergencyStop: process.env.EMERGENCY_STOP_ENABLED === 'true',
  };
}
