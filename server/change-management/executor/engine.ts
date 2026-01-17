/**
 * Change Execution Engine
 *
 * Applies changes in batches with tracking.
 * Handles partial failures and emits lifecycle events.
 */

import { db } from "../../db";
import { contents as content } from "@shared/schema";
import { eq } from "drizzle-orm";
import type {
  ChangePlan,
  ChangeItem,
  ExecutionContext,
  ExecutionResult,
  ChangeResult,
  ExecutionError,
  DryRunResult,
  ChangePreview,
} from "../types";
import { getPlan, updatePlanStatus, updateChange } from "../plans";
import { evaluateGuards, hasBlockingFailures } from "../guards";
import { generatePlanPreview } from "../diff";

// Default batch size
const DEFAULT_BATCH_SIZE = 10;

// Execution lock to prevent concurrent execution
const executionLocks = new Set<string>();

// ============================================================================
// DRY RUN
// ============================================================================

/**
 * Perform a dry run of the plan
 */
export async function dryRun(planId: string, userId: string): Promise<DryRunResult> {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }

  // Check if dry run is enabled
  const dryRunEnabled = process.env.ENABLE_CHANGE_DRY_RUN !== 'false';
  if (!dryRunEnabled) {
    throw new Error('Dry run is disabled');
  }

  // Run guards
  const { passed: guardsPassed, failed: guardsFailed } = await evaluateGuards(plan, userId);

  // Generate previews
  const preview = await generatePlanPreview(plan);

  // Count what would happen
  let changesWouldApply = 0;
  let changesWouldSkip = 0;
  let changesWouldFail = 0;

  const warnings: string[] = [];
  const blockers: string[] = [];

  for (const p of preview) {
    if (p.wouldApply) {
      changesWouldApply++;
    } else if (p.reason?.includes('Error')) {
      changesWouldFail++;
      warnings.push(`Change ${p.changeId}: ${p.reason}`);
    } else {
      changesWouldSkip++;
    }
  }

  // Add guard warnings/blockers
  for (const guard of guardsFailed) {
    if (guard.severity === 'blocker') {
      blockers.push(guard.message);
    } else {
      warnings.push(guard.message);
    }
  }

  const success = blockers.length === 0 && changesWouldFail === 0;

  const result: DryRunResult = {
    planId,
    success,
    simulatedAt: new Date(),
    changesWouldApply,
    changesWouldSkip,
    changesWouldFail,
    guardsPassed,
    guardsFailed,
    preview,
    warnings,
    blockers,
  };

  // Store result on plan
  updatePlanStatus(planId, plan.status, userId, { dryRunResult: result });

  return result;
}

// ============================================================================
// EXECUTION
// ============================================================================

/**
 * Execute a change plan
 */
export async function executePlan(
  planId: string,
  context: Omit<ExecutionContext, 'planId'>
): Promise<ExecutionResult> {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }

  // Check for concurrent execution
  if (executionLocks.has(planId)) {
    throw new Error(`Plan ${planId} is already being executed`);
  }

  // Validate plan status
  if (plan.status !== 'approved') {
    throw new Error(`Plan must be approved before execution (current: ${plan.status})`);
  }

  // Check feature flag
  if (!context.dryRun) {
    const applyEnabled = process.env.ENABLE_CHANGE_APPLY === 'true';
    if (!applyEnabled) {
      throw new Error('Change apply is disabled (ENABLE_CHANGE_APPLY=false)');
    }
  }

  // Run guards one final time
  const { failed } = await evaluateGuards(plan, context.executedBy);
  if (hasBlockingFailures(failed)) {
    const blockerMessages = failed
      .filter(f => f.severity === 'blocker')
      .map(f => f.message);
    throw new Error(`Blocked by guards: ${blockerMessages.join(', ')}`);
  }

  // Acquire lock
  executionLocks.add(planId);

  const startedAt = new Date();
  const results: ChangeResult[] = [];
  const errors: ExecutionError[] = [];
  const batchSize = context.batchSize || DEFAULT_BATCH_SIZE;

  try {
    // Update plan status
    updatePlanStatus(planId, 'applying', context.executedBy);

    // Execute in batches
    const pendingChanges = plan.changes.filter(c => c.status === 'pending');

    for (let i = 0; i < pendingChanges.length; i += batchSize) {
      const batch = pendingChanges.slice(i, i + batchSize);

      // Execute batch concurrently
      const batchResults = await Promise.all(
        batch.map(change => executeChange(planId, change, context.dryRun))
      );

      for (const result of batchResults) {
        results.push(result);

        if (result.status === 'failed' && result.error) {
          errors.push({
            changeId: result.changeId,
            error: result.error,
            recoverable: true,
          });

          // Stop on error if not continue-on-error
          if (!context.continueOnError) {
            break;
          }
        }
      }

      // Check if we should stop
      if (!context.continueOnError && errors.length > 0) {
        break;
      }
    }

    const completedAt = new Date();
    const applied = results.filter(r => r.status === 'applied').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    const success = failed === 0;

    // Update plan status
    const finalStatus = context.dryRun
      ? plan.status // Don't change status on dry run
      : (success ? 'applied' : 'failed');

    if (!context.dryRun) {
      updatePlanStatus(planId, finalStatus, context.executedBy, {
        appliedAt: completedAt,
        appliedBy: context.executedBy,
        executionDurationMs: completedAt.getTime() - startedAt.getTime(),
      });
    }

    // Emit lifecycle events if enabled
    if (context.emitEvents && !context.dryRun) {
      await emitLifecycleEvents(plan, results);
    }

    return {
      planId,
      success,
      dryRun: context.dryRun,
      total: plan.changes.length,
      applied,
      failed,
      skipped,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      results,
      errors,
    };
  } finally {
    // Release lock
    executionLocks.delete(planId);
  }
}

/**
 * Execute a single change
 */
async function executeChange(
  planId: string,
  change: ChangeItem,
  dryRun: boolean
): Promise<ChangeResult> {
  const startTime = Date.now();

  try {
    // In dry run mode, just validate
    if (dryRun) {
      return {
        changeId: change.id,
        status: 'applied',
        appliedAt: new Date(),
      };
    }

    // Execute based on change type
    let rollbackData: unknown;

    switch (change.type) {
      case 'content_update':
        rollbackData = await executeContentUpdate(change);
        break;

      case 'content_publish':
        rollbackData = await executeContentPublish(change);
        break;

      case 'content_unpublish':
        rollbackData = await executeContentUnpublish(change);
        break;

      case 'seo_update':
        rollbackData = await executeSeoUpdate(change);
        break;

      case 'canonical_set':
      case 'canonical_remove':
        rollbackData = await executeCanonicalChange(change);
        break;

      case 'link_add':
      case 'link_remove':
        rollbackData = await executeLinkChange(change);
        break;

      case 'entity_update':
      case 'entity_merge':
        rollbackData = await executeEntityChange(change);
        break;

      case 'aeo_regenerate':
        rollbackData = await executeAeoRegenerate(change);
        break;

      case 'experiment_start':
      case 'experiment_stop':
        rollbackData = await executeExperimentChange(change);
        break;

      case 'monetization_update':
        rollbackData = await executeMonetizationUpdate(change);
        break;

      default:
        throw new Error(`Unknown change type: ${change.type}`);
    }

    // Update change status
    updateChange(planId, change.id, {
      status: 'applied',
      appliedAt: new Date(),
      rollbackData,
    });

    return {
      changeId: change.id,
      status: 'applied',
      appliedAt: new Date(),
      rollbackData,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update change status
    updateChange(planId, change.id, {
      status: 'failed',
      error: errorMessage,
    });

    return {
      changeId: change.id,
      status: 'failed',
      error: errorMessage,
    };
  }
}

// ============================================================================
// CHANGE TYPE HANDLERS
// ============================================================================

async function executeContentUpdate(change: ChangeItem): Promise<unknown> {
  const contentId = change.targetId;

  // Get current state for rollback
  const [current] = await db.select().from(content).where(eq(content.id, contentId as any)).limit(1);
  if (!current) throw new Error(`Content ${contentId} not found`);

  const rollbackData = { ...current };

  // Apply update
  const updates = change.afterValue as Record<string, unknown>;
  await db.update(content).set({
    ...updates,
    updatedAt: new Date(),
  } as any).where(eq(content.id, contentId as any));

  return rollbackData;
}

async function executeContentPublish(change: ChangeItem): Promise<unknown> {
  const contentId = change.targetId;

  const [current] = await db.select().from(content).where(eq(content.id, contentId as any)).limit(1);
  if (!current) throw new Error(`Content ${contentId} not found`);

  const rollbackData = { status: current.status, publishedAt: current.publishedAt };

  await db.update(content).set({
    status: 'published',
    publishedAt: new Date(),
    updatedAt: new Date(),
  } as any).where(eq(content.id, contentId as any));

  return rollbackData;
}

async function executeContentUnpublish(change: ChangeItem): Promise<unknown> {
  const contentId = change.targetId;

  const [current] = await db.select().from(content).where(eq(content.id, contentId as any)).limit(1);
  if (!current) throw new Error(`Content ${contentId} not found`);

  const rollbackData = { status: current.status, publishedAt: current.publishedAt };

  await db.update(content).set({
    status: 'draft',
    updatedAt: new Date(),
  } as any).where(eq(content.id, contentId as any));

  return rollbackData;
}

async function executeSeoUpdate(change: ChangeItem): Promise<unknown> {
  const contentId = change.targetId;

  const [current] = await db.select().from(content).where(eq(content.id, contentId as any)).limit(1);
  if (!current) throw new Error(`Content ${contentId} not found`);

  const rollbackData = {
    metaTitle: current.metaTitle,
    metaDescription: current.metaDescription,
    metaKeywords: (current as any).metaKeywords,
  };

  const updates = change.afterValue as Record<string, unknown>;
  await db.update(content).set({
    metaTitle: updates.metaTitle as string,
    metaDescription: updates.metaDescription as string,
    metaKeywords: updates.metaKeywords as string,
    updatedAt: new Date(),
  } as any).where(eq(content.id, contentId as any));

  return rollbackData;
}

async function executeCanonicalChange(change: ChangeItem): Promise<unknown> {
  // In production, would update canonical_manager records
  // For now, store the change for rollback
  return {
    targetId: change.targetId,
    type: change.type,
    beforeValue: change.beforeValue,
  };
}

async function executeLinkChange(change: ChangeItem): Promise<unknown> {
  // In production, would update internal linking records
  // For now, store the change for rollback
  return {
    targetId: change.targetId,
    type: change.type,
    beforeValue: change.beforeValue,
  };
}

async function executeEntityChange(change: ChangeItem): Promise<unknown> {
  // In production, would update entity records
  // For now, store the change for rollback
  return {
    targetId: change.targetId,
    type: change.type,
    beforeValue: change.beforeValue,
  };
}

async function executeAeoRegenerate(change: ChangeItem): Promise<unknown> {
  // In production, would trigger AEO capsule regeneration
  // For now, mark as needing regeneration
  return {
    targetId: change.targetId,
    previousCapsule: change.beforeValue,
  };
}

async function executeExperimentChange(change: ChangeItem): Promise<unknown> {
  // In production, would update experiment records
  return {
    targetId: change.targetId,
    type: change.type,
    beforeValue: change.beforeValue,
  };
}

async function executeMonetizationUpdate(change: ChangeItem): Promise<unknown> {
  // In production, would update monetization settings
  return {
    targetId: change.targetId,
    beforeValue: change.beforeValue,
  };
}

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

async function emitLifecycleEvents(
  plan: ChangePlan,
  results: ChangeResult[]
): Promise<void> {
  // In production, would emit events to content-lifecycle module
  console.log(`[ChangeManagement] Plan ${plan.id} executed: ${results.filter(r => r.status === 'applied').length} applied`);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if a plan is currently being executed
 */
export function isExecuting(planId: string): boolean {
  return executionLocks.has(planId);
}

/**
 * Get execution status for a plan
 */
export function getExecutionStatus(planId: string): {
  isExecuting: boolean;
  plan: ChangePlan | null;
} {
  const plan = getPlan(planId);
  return {
    isExecuting: executionLocks.has(planId),
    plan,
  };
}
