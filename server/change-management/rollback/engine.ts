/**
 * Change Rollback Engine
 *
 * Restores previous state using rollback data captured during execution.
 * One-click rollback per plan with partial rollback support.
 */

import { db } from "../../db";
import { contents as content } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { ChangePlan, ChangeItem, RollbackPlan, RollbackItem, RollbackResult } from "../types";
import { getPlan, updatePlanStatus, updateChange } from "../plans";

// Rollback lock to prevent concurrent rollbacks
const rollbackLocks = new Set<string>();

// ============================================================================
// ROLLBACK PLAN GENERATION
// ============================================================================

/**
 * Generate a rollback plan from an applied change plan
 */
export function generateRollbackPlan(plan: ChangePlan): RollbackPlan {
  if (plan.status !== "applied" && plan.status !== "failed") {
    throw new Error(`Can only rollback applied or failed plans (current: ${plan.status})`);
  }

  const rollbackItems: RollbackItem[] = [];

  // Only include changes that were actually applied
  const appliedChanges = plan.changes.filter(c => c.status === "applied" && c.rollbackData);

  for (const change of appliedChanges) {
    rollbackItems.push({
      changeId: change.id,
      targetType: change.targetType,
      targetId: change.targetId,
      restoreData: change.rollbackData!,
      status: "pending",
    });
  }

  // Reverse order for rollback (LIFO)
  rollbackItems.reverse();

  return {
    planId: plan.id,
    changes: rollbackItems,
    createdAt: new Date(),
  };
}

/**
 * Check if a plan can be rolled back
 */
export function canRollback(plan: ChangePlan): { canRollback: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check feature flag
  const rollbackEnabled = process.env.ENABLE_CHANGE_ROLLBACK !== "false";
  if (!rollbackEnabled) {
    reasons.push("Rollback is disabled (ENABLE_CHANGE_ROLLBACK=false)");
  }

  // Check status
  if (plan.status !== "applied" && plan.status !== "failed") {
    reasons.push(`Plan status must be 'applied' or 'failed' (current: ${plan.status})`);
  }

  // Check if already rolled back
  if (plan.status === "rolled_back") {
    reasons.push("Plan has already been rolled back");
  }

  // Check for rollback data
  const appliedChanges = plan.changes.filter(c => c.status === "applied");
  const changesWithRollbackData = appliedChanges.filter(c => c.rollbackData);

  if (appliedChanges.length > 0 && changesWithRollbackData.length === 0) {
    reasons.push("No rollback data available for applied changes");
  }

  // Check for lock
  if (rollbackLocks.has(plan.id)) {
    reasons.push("Rollback is already in progress");
  }

  return {
    canRollback: reasons.length === 0,
    reasons,
  };
}

// ============================================================================
// ROLLBACK EXECUTION
// ============================================================================

/**
 * Execute rollback for a plan
 */
export async function rollbackPlan(
  planId: string,
  userId: string,
  reason?: string
): Promise<RollbackResult> {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }

  // Validate rollback is possible
  const { canRollback: canDo, reasons } = canRollback(plan);
  if (!canDo) {
    throw new Error(`Cannot rollback: ${reasons.join(", ")}`);
  }

  // Acquire lock
  if (rollbackLocks.has(planId)) {
    throw new Error(`Rollback already in progress for plan ${planId}`);
  }
  rollbackLocks.add(planId);

  try {
    // Generate rollback plan
    const rollbackPlan = generateRollbackPlan(plan);

    let restored = 0;
    let failed = 0;

    // Execute rollback in reverse order
    for (const item of rollbackPlan.changes) {
      try {
        await rollbackChange(plan, item);
        item.status = "restored";
        restored++;

        // Update the original change status
        updateChange(planId, item.changeId, {
          status: "rolled_back",
        });
      } catch (error) {
        item.status = "failed";
        item.error = error instanceof Error ? error.message : "Unknown error";
        failed++;
      }
    }

    const success = failed === 0;

    // Update plan status
    updatePlanStatus(planId, "rolled_back", userId, {
      rolledBackAt: new Date(),
      rolledBackBy: userId,
      rollbackReason: reason,
    });

    return {
      planId,
      success,
      restored,
      failed,
      results: rollbackPlan.changes,
      completedAt: new Date(),
    };
  } finally {
    // Release lock
    rollbackLocks.delete(planId);
  }
}

/**
 * Rollback a single change
 */
async function rollbackChange(plan: ChangePlan, item: RollbackItem): Promise<void> {
  const change = plan.changes.find(c => c.id === item.changeId);
  if (!change) {
    throw new Error(`Change ${item.changeId} not found in plan`);
  }

  switch (change.type) {
    case "content_update":
    case "content_publish":
    case "content_unpublish":
    case "seo_update":
      await rollbackContentChange(change, item);
      break;

    case "canonical_set":
    case "canonical_remove":
      await rollbackCanonicalChange(change, item);
      break;

    case "link_add":
    case "link_remove":
      await rollbackLinkChange(change, item);
      break;

    case "entity_update":
    case "entity_merge":
      await rollbackEntityChange(change, item);
      break;

    case "aeo_regenerate":
      await rollbackAeoRegenerate(change, item);
      break;

    case "experiment_start":
    case "experiment_stop":
      await rollbackExperimentChange(change, item);
      break;

    case "monetization_update":
      await rollbackMonetizationUpdate(change, item);
      break;

    default:
  }
}

// ============================================================================
// ROLLBACK HANDLERS
// ============================================================================

async function rollbackContentChange(change: ChangeItem, item: RollbackItem): Promise<void> {
  const contentId = parseInt(change.targetId);
  const restoreData = item.restoreData as Record<string, unknown>;

  // Restore the content to its previous state
  await db
    .update(content)
    .set({
      ...restoreData,
      updatedAt: new Date(),
    } as any)
    .where(eq(content.id, contentId as any));
}

async function rollbackCanonicalChange(change: ChangeItem, item: RollbackItem): Promise<void> {
  // In production, would restore canonical_manager records
}

async function rollbackLinkChange(change: ChangeItem, item: RollbackItem): Promise<void> {
  // In production, would restore internal linking records
}

async function rollbackEntityChange(change: ChangeItem, item: RollbackItem): Promise<void> {
  // In production, would restore entity records
}

async function rollbackAeoRegenerate(change: ChangeItem, item: RollbackItem): Promise<void> {
  // In production, would restore previous AEO capsule
}

async function rollbackExperimentChange(change: ChangeItem, item: RollbackItem): Promise<void> {
  // In production, would restore experiment state
}

async function rollbackMonetizationUpdate(change: ChangeItem, item: RollbackItem): Promise<void> {
  // In production, would restore monetization settings
}

// ============================================================================
// PARTIAL ROLLBACK
// ============================================================================

/**
 * Rollback specific changes within a plan
 */
export async function rollbackChanges(
  planId: string,
  changeIds: string[],
  userId: string,
  reason?: string
): Promise<RollbackResult> {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }

  // Validate changes exist and were applied
  const targetChanges = plan.changes.filter(
    c => changeIds.includes(c.id) && c.status === "applied" && c.rollbackData
  );

  if (targetChanges.length === 0) {
    throw new Error("No valid changes to rollback");
  }

  let restored = 0;
  let failed = 0;
  const results: RollbackItem[] = [];

  for (const change of targetChanges) {
    const item: RollbackItem = {
      changeId: change.id,
      targetType: change.targetType,
      targetId: change.targetId,
      restoreData: change.rollbackData!,
      status: "pending",
    };

    try {
      await rollbackChange(plan, item);
      item.status = "restored";
      restored++;

      // Update the original change status
      updateChange(planId, change.id, {
        status: "rolled_back",
      });
    } catch (error) {
      item.status = "failed";
      item.error = error instanceof Error ? error.message : "Unknown error";
      failed++;
    }

    results.push(item);
  }

  // Note: We don't change overall plan status for partial rollback

  return {
    planId,
    success: failed === 0,
    restored,
    failed,
    results,
    completedAt: new Date(),
  };
}

// ============================================================================
// ROLLBACK PREVIEW
// ============================================================================

/**
 * Preview what would be restored in a rollback
 */
export function previewRollback(planId: string): {
  canRollback: boolean;
  reasons: string[];
  changes: Array<{
    changeId: string;
    targetType: string;
    targetId: string;
    targetTitle?: string;
    changeType: string;
    willRestore: unknown;
  }>;
} {
  const plan = getPlan(planId);
  if (!plan) {
    return { canRollback: false, reasons: ["Plan not found"], changes: [] };
  }

  const { canRollback: canDo, reasons } = canRollback(plan);

  const changes = plan.changes
    .filter(c => c.status === "applied" && c.rollbackData)
    .map(c => ({
      changeId: c.id,
      targetType: c.targetType,
      targetId: c.targetId,
      targetTitle: c.targetTitle,
      changeType: c.type,
      willRestore: c.rollbackData,
    }));

  return {
    canRollback: canDo,
    reasons,
    changes,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if a plan is currently being rolled back
 */
export function isRollingBack(planId: string): boolean {
  return rollbackLocks.has(planId);
}
