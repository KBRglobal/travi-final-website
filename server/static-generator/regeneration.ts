/**
 * Static Regeneration Service
 * Handles incremental static regeneration (ISR) for content updates
 */

import { db } from "../db";
import { contents, internalLinks } from "../../shared/schema";
import { eq, and, or, desc, gt } from "drizzle-orm";
import { getStaticGenerator } from "./index";
import { log } from "../lib/logger";

export interface RegenerationQueue {
  contentId: string;
  reason: "create" | "update" | "delete" | "link_change";
  priority: number;
  queuedAt: Date;
}

export interface RegenerationStats {
  queueSize: number;
  processedToday: number;
  failedToday: number;
  averageTimeMs: number;
}

// In-memory queue for simplicity (could be moved to Redis/DB)
const regenerationQueue: RegenerationQueue[] = [];
let isProcessing = false;

/**
 * Queue content for regeneration
 */
export function queueRegeneration(
  contentId: string,
  reason: RegenerationQueue["reason"],
  priority: number = 5
): void {
  // Check if already in queue
  const existing = regenerationQueue.findIndex(q => q.contentId === contentId);

  if (existing >= 0) {
    // Update priority if higher
    if (priority < regenerationQueue[existing].priority) {
      regenerationQueue[existing].priority = priority;
    }
    return;
  }

  regenerationQueue.push({
    contentId,
    reason,
    priority,
    queuedAt: new Date(),
  });

  // Sort by priority (lower = higher priority)
  regenerationQueue.sort((a, b) => a.priority - b.priority);

  log.debug(`[Regeneration] Queued ${contentId} with priority ${priority} (${reason})`);

  // Start processing if not already
  processQueue();
}

/**
 * Process the regeneration queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || regenerationQueue.length === 0) {
    return;
  }

  isProcessing = true;

  try {
    while (regenerationQueue.length > 0) {
      const item = regenerationQueue.shift();
      if (!item) break;

      await processItem(item);

      // Small delay between items to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single regeneration item
 */
async function processItem(item: RegenerationQueue): Promise<void> {
  const startTime = Date.now();

  try {
    const generator = getStaticGenerator();

    if (item.reason === "delete") {
      // Get content info before it's gone (from queue metadata)
      // For now, we skip delete handling as content is already gone
      log.info(`[Regeneration] Skip delete regeneration for ${item.contentId}`);
      return;
    }

    // Regenerate the content
    const result = await generator.regenerateContent(item.contentId);

    if (result.success) {
      log.info(
        `[Regeneration] Regenerated ${item.contentId} (${result.paths.length} files) in ${Date.now() - startTime}ms`
      );

      // Also regenerate linked pages if this was a significant update
      if (item.reason === "update" || item.reason === "link_change") {
        await regenerateLinkedPages(item.contentId);
      }
    } else {
      log.warn(`[Regeneration] Failed for ${item.contentId}: ${result.error}`);
    }
  } catch (error) {
    log.error(`[Regeneration] Error processing ${item.contentId}:`, error);
  }
}

/**
 * Regenerate pages that link to a content item
 */
async function regenerateLinkedPages(contentId: string): Promise<void> {
  try {
    // Find all content that links to this content
    const linkedContent = await db
      .select({ sourceId: internalLinks.sourceContentId })
      .from(internalLinks)
      .where(eq(internalLinks.targetContentId, contentId));

    // Queue each linked page with lower priority
    for (const link of linkedContent) {
      if (link.sourceId) {
        queueRegeneration(link.sourceId, "link_change", 8);
      }
    }

    if (linkedContent.length > 0) {
      log.debug(`[Regeneration] Queued ${linkedContent.length} linked pages for ${contentId}`);
    }
  } catch (error) {
    log.error("[Regeneration] Error finding linked pages:", error);
  }
}

/**
 * Content event handlers - to be called from content lifecycle
 */
export const regenerationHooks = {
  /**
   * Called when content is created
   */
  onContentCreated(contentId: string): void {
    queueRegeneration(contentId, "create", 3);
  },

  /**
   * Called when content is updated
   */
  onContentUpdated(contentId: string): void {
    queueRegeneration(contentId, "update", 5);
  },

  /**
   * Called when content is published
   */
  onContentPublished(contentId: string): void {
    queueRegeneration(contentId, "update", 2);
  },

  /**
   * Called when content is deleted
   */
  onContentDeleted(contentId: string): void {
    queueRegeneration(contentId, "delete", 1);
  },

  /**
   * Called when internal links change
   */
  onLinksChanged(contentId: string): void {
    queueRegeneration(contentId, "link_change", 7);
  },
};

/**
 * Batch regeneration for stale content
 */
export async function regenerateStaleContent(maxAgeHours: number = 24): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const staleContent = await db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.status, "published"), gt(contents.updatedAt, cutoff)))
      .orderBy(desc(contents.updatedAt))
      .limit(100);

    for (const content of staleContent) {
      queueRegeneration(content.id, "update", 9);
    }

    log.info(`[Regeneration] Queued ${staleContent.length} stale pages for regeneration`);

    return staleContent.length;
  } catch (error) {
    log.error("[Regeneration] Error finding stale content:", error);
    return 0;
  }
}

/**
 * Get regeneration queue stats
 */
export function getRegenerationStats(): RegenerationStats {
  return {
    queueSize: regenerationQueue.length,
    processedToday: 0, // Would need persistent tracking
    failedToday: 0,
    averageTimeMs: 0,
  };
}

/**
 * Clear the regeneration queue
 */
export function clearRegenerationQueue(): void {
  regenerationQueue.length = 0;
  log.info("[Regeneration] Queue cleared");
}

/**
 * Force immediate processing
 */
export async function forceProcessQueue(): Promise<void> {
  if (!isProcessing) {
    await processQueue();
  }
}
