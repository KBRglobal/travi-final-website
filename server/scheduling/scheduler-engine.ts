/**
 * Scheduler Engine
 *
 * Processes scheduled content for auto-publishing.
 * Runs every minute, finds due content, publishes safely.
 *
 * SAFETY:
 * - Idempotent: safe to run multiple times
 * - No infinite retries
 * - Bounded batch size
 * - Feature flag controlled
 */

import { isSchedulingEnabled, type PublishResult } from "./types";
import { getContentDueForPublishing, publishContent, getContentById } from "./repository";
import { emitContentPublished } from "../events";
import { guardScheduledPublish } from "../publishing/eligibility";

// Configuration
const SCHEDULER_INTERVAL_MS = 60 * 1000; // 1 minute
const MAX_BATCH_SIZE = 20;
const MAX_RETRIES = 0; // No retries - failures are logged and skipped

// State
let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

// Metrics
interface SchedulerMetrics {
  lastRunAt: Date | null;
  totalProcessed: number;
  totalPublished: number;
  totalFailed: number;
  isRunning: boolean;
}

const metrics: SchedulerMetrics = {
  lastRunAt: null,
  totalProcessed: 0,
  totalPublished: 0,
  totalFailed: 0,
  isRunning: false,
};

/**
 * Process a single content item for publishing
 */
async function processContentForPublishing(
  contentId: string,
  title: string,
  type: string,
  slug: string
): Promise<PublishResult> {
  try {
    // Double-check content is still draft before publishing
    const content = await getContentById(contentId);

    if (!content) {
      return { success: false, contentId, error: "Content not found" };
    }

    if (content.status === "published") {
      // Already published - idempotent success
      return { success: true, contentId, publishedAt: content.publishedAt || undefined };
    }

    if (content.deletedAt) {
      return { success: false, contentId, error: "Content was deleted" };
    }

    // Check publish eligibility
    const guardResult = await guardScheduledPublish(contentId);
    if (!guardResult.allowed) {
      return {
        success: false,
        contentId,
        error: `Eligibility blocked: ${guardResult.reasons.join("; ")}`,
      };
    }

    // Publish the content
    const result = await publishContent(contentId);

    if (!result.success) {
      if (result.alreadyPublished) {
        // Race condition - another process published it
        return { success: true, contentId };
      }
      return { success: false, contentId, error: result.error };
    }

    // Emit lifecycle event ONLY after successful DB write
    emitContentPublished(contentId, type, title, slug, "draft", "scheduled");

    return {
      success: true,
      contentId,
      publishedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      contentId,
      error: String(error),
    };
  }
}

/**
 * Run the scheduler - process all due content
 */
async function runScheduler(): Promise<void> {
  if (!isSchedulingEnabled()) {
    return;
  }

  if (isProcessing) {
    return;
  }

  isProcessing = true;
  metrics.isRunning = true;
  metrics.lastRunAt = new Date();

  try {
    const dueContent = await getContentDueForPublishing(MAX_BATCH_SIZE);

    if (dueContent.length === 0) {
      return;
    }

    for (const content of dueContent) {
      metrics.totalProcessed++;

      const result = await processContentForPublishing(
        content.id,
        content.title,
        content.type,
        content.slug
      );

      if (result.success) {
        metrics.totalPublished++;
      } else {
        metrics.totalFailed++;
      }
    }
  } catch (error) {
  } finally {
    isProcessing = false;
    metrics.isRunning = false;
  }
}

/**
 * Start the scheduler
 */
export function startScheduler(): void {
  if (!isSchedulingEnabled()) {
    return;
  }

  if (schedulerInterval) {
    return;
  }

  // Run immediately on start
  runScheduler().catch(() => {});

  // Then run every minute
  schedulerInterval = setInterval(() => {
    runScheduler().catch(() => {});
  }, SCHEDULER_INTERVAL_MS);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

/**
 * Get scheduler metrics
 */
export function getSchedulerMetrics(): SchedulerMetrics {
  return { ...metrics };
}

/**
 * Manually trigger a scheduler run (for testing)
 */
export async function triggerSchedulerRun(): Promise<void> {
  if (!isSchedulingEnabled()) {
    throw new Error("Content scheduling is disabled");
  }
  await runScheduler();
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}
