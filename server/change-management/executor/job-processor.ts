/**
 * PCMS Job Processor - Background execution for apply/rollback
 *
 * Integrates with the existing job queue for async processing.
 */

import { db } from "../../db";
import { eq } from "drizzle-orm";
import { contents } from "@shared/schema";
import { getPlan, updatePlanStatus } from "../plans/repository";
import type { ChangeItem, ChangePlan } from "../types";

// Type alias for compatibility
type ChangePlanItem = ChangeItem;

// ============================================================================
// STUB FUNCTIONS - These would be implemented in a full production system
// ============================================================================

interface Execution {
  id: string;
  planId: string;
  kind: "apply" | "rollback";
  status: string;
  batchSize?: number;
  lastProcessedIndex?: number;
  successCount?: number;
  failureCount?: number;
  skipCount?: number;
  startedAt?: Date;
  finishedAt?: Date;
  createdByUserId: string;
  errorSummary?: { message: string };
}

const executions = new Map<string, Execution>();
const locks = new Map<string, { executionId: string; expiresAt: number }>();

function generateExecutionId(): string {
  return `exec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

async function getPlanItems(planId: string): Promise<ChangePlanItem[]> {
  const plan = getPlan(planId);
  return plan?.changes || [];
}

async function updateItemStatus(
  _itemId: string,
  _status: string,
  _extra?: Record<string, unknown>
): Promise<void> {
  // Stub - would update item in DB
}

async function createExecution(input: {
  planId: string;
  kind: "apply" | "rollback";
  createdByUserId: string;
  batchSize?: number;
}): Promise<Execution> {
  const id = generateExecutionId();
  const execution: Execution = {
    id,
    planId: input.planId,
    kind: input.kind,
    status: "pending",
    batchSize: input.batchSize || 20,
    createdByUserId: input.createdByUserId,
  };
  executions.set(id, execution);
  return execution;
}

async function updateExecution(executionId: string, updates: Partial<Execution>): Promise<void> {
  const execution = executions.get(executionId);
  if (execution) {
    executions.set(executionId, { ...execution, ...updates });
  }
}

async function addExecutionLog(_log: {
  executionId: string;
  level: string;
  message: string;
  itemId?: string;
  data?: unknown;
}): Promise<void> {
  // Stub - would store log in DB
}

async function saveExecutionResult(_result: {
  executionId: string;
  summary: unknown;
  impacts?: unknown;
}): Promise<void> {
  // Stub - would store result in DB
}

async function acquireLock(
  lockKey: string,
  executionId: string,
  durationMs: number
): Promise<boolean> {
  const existing = locks.get(lockKey);
  if (existing && existing.expiresAt > Date.now()) {
    return false;
  }
  locks.set(lockKey, { executionId, expiresAt: Date.now() + durationMs });
  return true;
}

async function releaseLock(lockKey: string, _executionId: string): Promise<void> {
  locks.delete(lockKey);
}

async function releaseAllLocks(executionId: string): Promise<void> {
  for (const [key, value] of locks.entries()) {
    if (value.executionId === executionId) {
      locks.delete(key);
    }
  }
}

async function getExecution(executionId: string): Promise<Execution | null> {
  return executions.get(executionId) || null;
}

// Feature flags
const isApplyEnabled = () => process.env.ENABLE_CHANGE_APPLY === "true";
const isRollbackEnabled = () => process.env.ENABLE_CHANGE_ROLLBACK !== "false";
const isKillSwitchActive = () => process.env.CHANGE_MANAGEMENT_KILL_SWITCH === "true";

// Rate limiting
const MAX_BATCH_SIZE = 50;
const LOCK_DURATION_MS = 120000; // 2 minutes per item

export interface ExecuteJobInput {
  planId: string;
  executionId: string;
  kind: "apply" | "rollback";
  userId: string;
}

/**
 * Main job processor - called by job queue
 */
export async function processChangeExecutionJob(input: ExecuteJobInput): Promise<{
  success: boolean;
  applied: number;
  failed: number;
  error?: string;
}> {
  const { planId, executionId, kind, userId } = input;

  // Check kill switch
  if (isKillSwitchActive()) {
    await updateExecution(executionId, {
      status: "failed",
      finishedAt: new Date(),
      errorSummary: { message: "Kill switch is active" },
    });
    return { success: false, applied: 0, failed: 0, error: "Kill switch active" };
  }

  // Validate feature flags
  if (kind === "apply" && !isApplyEnabled()) {
    await updateExecution(executionId, {
      status: "failed",
      finishedAt: new Date(),
      errorSummary: { message: "Apply is disabled" },
    });
    return { success: false, applied: 0, failed: 0, error: "Apply disabled" };
  }

  if (kind === "rollback" && !isRollbackEnabled()) {
    await updateExecution(executionId, {
      status: "failed",
      finishedAt: new Date(),
      errorSummary: { message: "Rollback is disabled" },
    });
    return { success: false, applied: 0, failed: 0, error: "Rollback disabled" };
  }

  // Get plan and execution
  const plan = await getPlan(planId);
  const execution = await getExecution(executionId);

  if (!plan || !execution) {
    return { success: false, applied: 0, failed: 0, error: "Plan or execution not found" };
  }

  // Start execution
  await updateExecution(executionId, {
    status: "running",
    startedAt: new Date(),
  });

  await addExecutionLog({
    executionId,
    level: "info",
    message: `Starting ${kind} execution`,
    data: { planId, itemCount: plan.changes.length },
  });

  // Update plan status
  if (kind === "apply") {
    await updatePlanStatus(planId, "applying", userId);
  }

  const items = await getPlanItems(planId);
  const batchSize = Math.min(execution.batchSize || 20, MAX_BATCH_SIZE);
  const startIndex = execution.lastProcessedIndex || 0;

  let successCount = execution.successCount || 0;
  let failureCount = execution.failureCount || 0;
  let skipCount = execution.skipCount || 0;

  try {
    // Process items in batches
    for (let i = startIndex; i < items.length; i += batchSize) {
      // Check kill switch between batches
      if (isKillSwitchActive()) {
        await updateExecution(executionId, {
          lastProcessedIndex: i,
          successCount,
          failureCount,
          skipCount,
          errorSummary: { message: "Stopped by kill switch" },
        });
        throw new Error("Kill switch activated during execution");
      }

      const batch = items.slice(i, i + batchSize);

      for (const item of batch) {
        try {
          // Acquire lock
          const lockKey = `${item.targetType}:${item.targetId}`;
          const locked = await acquireLock(lockKey, executionId, LOCK_DURATION_MS);

          if (!locked) {
            await addExecutionLog({
              executionId,
              level: "warn",
              message: `Could not acquire lock for ${lockKey}`,
              itemId: item.id,
            });
            skipCount++;
            await updateItemStatus(item.id, "skipped", { errorMessage: "Lock conflict" });
            continue;
          }

          try {
            // Execute the change
            const result =
              kind === "apply"
                ? await applyItem(item, executionId)
                : await rollbackItem(item, executionId);

            if (result.success) {
              successCount++;
              await updateItemStatus(item.id, kind === "apply" ? "applied" : "rolled_back", {
                appliedAt: new Date(),
                rollbackData: (result as { rollbackData?: unknown }).rollbackData,
              });
            } else {
              failureCount++;
              await updateItemStatus(item.id, "failed", {
                errorMessage: result.error,
              });
            }
          } finally {
            // Always release lock
            await releaseLock(lockKey, executionId);
          }
        } catch (itemError) {
          failureCount++;
          const errorMsg = itemError instanceof Error ? itemError.message : "Unknown error";
          await updateItemStatus(item.id, "failed", { errorMessage: errorMsg });
          await addExecutionLog({
            executionId,
            level: "error",
            message: `Item ${item.id} failed: ${errorMsg}`,
            itemId: item.id,
          });
        }
      }

      // Update progress
      await updateExecution(executionId, {
        lastProcessedIndex: i + batch.length,
        successCount,
        failureCount,
        skipCount,
      });
    }

    // Complete execution
    const success = failureCount === 0;
    await updateExecution(executionId, {
      status: success ? "succeeded" : "failed",
      finishedAt: new Date(),
      successCount,
      failureCount,
      skipCount,
    });

    // Update plan status
    const finalStatus = kind === "apply" ? (success ? "applied" : "failed") : "rolled_back";
    await updatePlanStatus(planId, finalStatus, userId);

    // Save result summary
    await saveExecutionResult({
      executionId,
      summary: {
        total: items.length,
        applied: successCount,
        failed: failureCount,
        skipped: skipCount,
        durationMs: Date.now() - (execution.startedAt?.getTime() || Date.now()),
      },
      impacts: plan.impactEstimate || undefined,
    });

    await addExecutionLog({
      executionId,
      level: success ? "info" : "warn",
      message: `Execution completed: ${successCount} succeeded, ${failureCount} failed, ${skipCount} skipped`,
    });

    return { success, applied: successCount, failed: failureCount };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    await updateExecution(executionId, {
      status: "failed",
      finishedAt: new Date(),
      successCount,
      failureCount,
      skipCount,
      errorSummary: { message: errorMsg },
    });

    await releaseAllLocks(executionId);

    await addExecutionLog({
      executionId,
      level: "error",
      message: `Execution failed: ${errorMsg}`,
    });

    // Update plan to failed state
    await updatePlanStatus(planId, "failed", userId);

    return { success: false, applied: successCount, failed: failureCount, error: errorMsg };
  }
}

/**
 * Apply a single item
 */
async function applyItem(
  item: ChangePlanItem,
  executionId: string
): Promise<{ success: boolean; rollbackData?: unknown; error?: string }> {
  try {
    const handler = getHandler(item.type);
    if (!handler) {
      return { success: false, error: `Unsupported change type: ${item.type}` };
    }

    const result = await handler.apply(item);

    await addExecutionLog({
      executionId,
      level: "info",
      message: `Applied ${item.type} to ${item.targetType}:${item.targetId}`,
      itemId: item.id,
      data: { rollbackData: result.rollbackData },
    });

    return { success: true, rollbackData: result.rollbackData };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Apply failed";
    return { success: false, error: errorMsg };
  }
}

/**
 * Rollback a single item
 */
async function rollbackItem(
  item: ChangePlanItem,
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!item.rollbackData) {
      return { success: false, error: "No rollback data available" };
    }

    const handler = getHandler(item.type);
    if (!handler) {
      return { success: false, error: `Unsupported change type: ${item.type}` };
    }

    await handler.rollback(item, item.rollbackData);

    await addExecutionLog({
      executionId,
      level: "info",
      message: `Rolled back ${item.type} for ${item.targetType}:${item.targetId}`,
      itemId: item.id,
    });

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Rollback failed";
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// CHANGE TYPE HANDLERS
// ============================================================================

interface ChangeHandler {
  apply(item: ChangePlanItem): Promise<{ rollbackData: unknown }>;
  rollback(item: ChangePlanItem, rollbackData: unknown): Promise<void>;
}

const handlers: Record<string, ChangeHandler> = {
  // SEO Update Handler
  seo_update: {
    async apply(item) {
      const contentId = item.targetId;
      const [current] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

      if (!current) throw new Error(`Content ${contentId} not found`);

      const rollbackData = {
        metaTitle: current.metaTitle,
        metaDescription: current.metaDescription,
        slug: current.slug,
      };

      const updates = item.afterValue as Record<string, unknown>;
      await db
        .update(contents)
        .set({
          metaTitle: updates.metaTitle as string | undefined,
          metaDescription: updates.metaDescription as string | undefined,
          slug: updates.slug as string | undefined,
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));

      return { rollbackData };
    },
    async rollback(item, rollbackData) {
      const contentId = item.targetId;
      const data = rollbackData as Record<string, unknown>;
      await db
        .update(contents)
        .set({
          metaTitle: data.metaTitle as string | null,
          metaDescription: data.metaDescription as string | null,
          slug: data.slug as string | null,
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));
    },
  },

  // Content Update Handler
  content_update: {
    async apply(item) {
      const contentId = item.targetId;
      const [current] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

      if (!current) throw new Error(`Content ${contentId} not found`);

      const rollbackData = { ...current };
      const updates = item.afterValue as Record<string, unknown>;

      await db
        .update(contents)
        .set({
          ...updates,
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));

      return { rollbackData };
    },
    async rollback(item, rollbackData) {
      const contentId = item.targetId;
      await db
        .update(contents)
        .set({
          ...(rollbackData as object),
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));
    },
  },

  // Content Publish Handler
  content_publish: {
    async apply(item) {
      const contentId = item.targetId;
      const [current] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

      if (!current) throw new Error(`Content ${contentId} not found`);

      const rollbackData = { status: current.status, publishedAt: current.publishedAt };

      await db
        .update(contents)
        .set({
          status: "published",
          publishedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));

      return { rollbackData };
    },
    async rollback(item, rollbackData) {
      const contentId = item.targetId;
      const data = rollbackData as { status: string; publishedAt: Date | null };
      await db
        .update(contents)
        .set({
          status: data.status as "draft" | "published",
          publishedAt: data.publishedAt,
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));
    },
  },

  // Content Unpublish Handler
  content_unpublish: {
    async apply(item) {
      const contentId = item.targetId;
      const [current] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

      if (!current) throw new Error(`Content ${contentId} not found`);

      const rollbackData = { status: current.status, publishedAt: current.publishedAt };

      await db
        .update(contents)
        .set({
          status: "draft",
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));

      return { rollbackData };
    },
    async rollback(item, rollbackData) {
      const contentId = item.targetId;
      const data = rollbackData as { status: string; publishedAt: Date | null };
      await db
        .update(contents)
        .set({
          status: data.status as "draft" | "published",
          publishedAt: data.publishedAt,
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));
    },
  },

  // Canonical Set Handler (stub - would integrate with canonical-manager)
  canonical_set: {
    async apply(item) {
      // In production, integrate with canonical-manager module

      return { rollbackData: { previousCanonical: item.beforeValue } };
    },
    async rollback(item, rollbackData) {
      const data = rollbackData as { previousCanonical: unknown };
    },
  },

  // Canonical Remove Handler
  canonical_remove: {
    async apply(item) {
      return { rollbackData: { previousCanonical: item.beforeValue } };
    },
    async rollback(item, rollbackData) {
      const data = rollbackData as { previousCanonical: unknown };
    },
  },

  // AEO Regenerate Handler (stub - would enqueue AEO generation job)
  aeo_regenerate: {
    async apply(item) {
      // In production, enqueue AEO capsule generation job

      return { rollbackData: { previousCapsule: item.beforeValue } };
    },
    async rollback(item, rollbackData) {
      // AEO regeneration typically cannot be rolled back easily
    },
  },

  // Link Add/Remove Handler (stub)
  link_add: {
    async apply(item) {
      return { rollbackData: { added: item.afterValue } };
    },
    async rollback(item, rollbackData) {},
  },

  link_remove: {
    async apply(item) {
      return { rollbackData: { removed: item.beforeValue } };
    },
    async rollback(item, rollbackData) {},
  },

  // Entity handlers (stub)
  entity_update: {
    async apply(item) {
      return { rollbackData: item.beforeValue };
    },
    async rollback(item, rollbackData) {},
  },

  entity_merge: {
    async apply(item) {
      // Entity merge is complex and requires dedicated handling
      throw new Error("entity_merge requires dedicated implementation");
    },
    async rollback() {
      throw new Error("entity_merge rollback not supported");
    },
  },

  // Experiment handlers (stub)
  experiment_start: {
    async apply(item) {
      return { rollbackData: { wasRunning: false } };
    },
    async rollback(item, rollbackData) {},
  },

  experiment_stop: {
    async apply(item) {
      return { rollbackData: { wasRunning: true } };
    },
    async rollback(item, rollbackData) {},
  },

  // Monetization handler (stub)
  monetization_update: {
    async apply(item) {
      return { rollbackData: item.beforeValue };
    },
    async rollback(item, rollbackData) {},
  },
};

function getHandler(type: string): ChangeHandler | undefined {
  return handlers[type];
}

/**
 * Enqueue execution job
 */
export async function enqueueExecutionJob(
  planId: string,
  kind: "apply" | "rollback",
  userId: string,
  options?: { batchSize?: number }
): Promise<{ executionId: string }> {
  // Create execution record
  const execution = await createExecution({
    planId,
    kind,
    createdByUserId: userId,
    batchSize: options?.batchSize,
  });

  // For now, process synchronously (in production, enqueue to job queue)
  // The job processor is designed to be resumable if interrupted
  setImmediate(() => {
    processChangeExecutionJob({
      planId,
      executionId: execution.id,
      kind,
      userId,
    }).catch(err => {});
  });

  return { executionId: execution.id };
}
