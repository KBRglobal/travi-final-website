/**
 * Content Generation Executor
 * Handles content generation tasks for autopilot
 */

import { db } from "../../../db";
import { rssFeeds, contents } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { TaskConfig, TaskResult } from "../types";
import { getOctypoOrchestrator } from "../../orchestration/orchestrator";
import { getExplosionOrchestrator } from "../../exploder";
import { rssReader } from "../../rss-reader";
import { log } from "../../../lib/logger";

/**
 * Execute content generation task
 */
export async function executeContentGeneration(
  taskId: string,
  config: TaskConfig
): Promise<TaskResult> {
  const startTime = Date.now();
  const contentIds: string[] = [];
  let itemsProcessed = 0;
  let itemsSucceeded = 0;
  let itemsFailed = 0;

  try {
    // Determine generation type
    if (config.feedId) {
      // RSS-based generation
      const result = await generateFromRSS(config.feedId, config.locale);
      itemsProcessed = result.processed;
      itemsSucceeded = result.succeeded;
      itemsFailed = result.failed;
      contentIds.push(...result.contentIds);
    } else if (config.contentId) {
      // Explosion-based generation
      const result = await generateFromExplosion(config.contentId, config);
      itemsProcessed = result.processed;
      itemsSucceeded = result.succeeded;
      itemsFailed = result.failed;
      contentIds.push(...result.contentIds);
    } else {
      // General content generation from available sources
      const result = await generateFromAvailableSources(config);
      itemsProcessed = result.processed;
      itemsSucceeded = result.succeeded;
      itemsFailed = result.failed;
      contentIds.push(...result.contentIds);
    }

    return {
      success: itemsSucceeded > 0,
      contentIds,
      metrics: {
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        processingTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    log.error(`[ContentGenerationExecutor] Task ${taskId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      contentIds,
      metrics: {
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Generate content from RSS feed
 */
async function generateFromRSS(
  feedId: string,
  locale?: string
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  contentIds: string[];
}> {
  const contentIds: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Fetch feed items
  await rssReader.fetchFeed(feedId);

  // Get unprocessed items
  const items = await rssReader.getUnprocessedItems(10, feedId);

  for (const item of items) {
    processed++;

    try {
      // Generate content for item
      const orchestrator = getOctypoOrchestrator();

      // Create a simple attraction-like data for the orchestrator
      const attractionData = {
        id: Date.now(),
        title: item.title,
        venueName: item.title,
        cityName: item.source,
        primaryCategory: item.category || "news",
        description: item.summary,
      };

      const result = await orchestrator.generateAttractionContent(attractionData as any);

      if (result.success && result.content) {
        // Save to database
        const slug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 100);

        // Check for duplicate
        const existing = await db
          .select({ id: contents.id })
          .from(contents)
          .where(eq(contents.slug, slug))
          .limit(1);

        if (existing.length === 0) {
          const [content] = await db
            .insert(contents)
            .values({
              type: "article",
              status: "draft",
              title: item.title,
              slug,
              metaTitle: result.content.metaTitle,
              metaDescription: result.content.metaDescription,
              summary: result.content.introduction?.substring(0, 200),
              answerCapsule: result.content.answerCapsule,
              blocks: [
                { type: "text", contents: { text: result.content.introduction || "" } },
                { type: "text", contents: { text: (result.content as any).whatToExpect || "" } },
              ].filter(b => b.contents.text),
              generatedByAI: true,
            } as any)
            .returning();

          contentIds.push(content.id);
          succeeded++;

          // Mark RSS item as processed
          await rssReader.markProcessed(item.id, content.id);
        } else {
          // Already exists
          await rssReader.markProcessed(item.id);
          failed++;
        }
      } else {
        failed++;
      }
    } catch (error) {
      log.error(`[ContentGenerationExecutor] Failed to process RSS item:`, error);
      failed++;
    }
  }

  return { processed, succeeded, failed, contentIds };
}

/**
 * Generate content from explosion
 */
async function generateFromExplosion(
  contentId: string,
  config: TaskConfig
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  contentIds: string[];
}> {
  const orchestrator = getExplosionOrchestrator();

  const jobId = await orchestrator.startExplosion(contentId, {
    maxArticles: config.maxArticles || 10,
    articleTypes: config.articleTypes as any,
    locale: config.locale,
  });

  // Wait for job to complete (with timeout)
  const timeout = 5 * 60 * 1000; // 5 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const progress = await orchestrator.getJobProgress(jobId);
    if (!progress) break;

    if (progress.status === "completed") {
      return {
        processed: progress.ideasGenerated,
        succeeded: progress.articlesGenerated,
        failed: progress.ideasGenerated - progress.articlesGenerated,
        contentIds: [], // Would need to query exploded_articles for IDs
      };
    }

    if (progress.status === "failed") {
      return {
        processed: 0,
        succeeded: 0,
        failed: 1,
        contentIds: [],
      };
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  }

  return {
    processed: 0,
    succeeded: 0,
    failed: 0,
    contentIds: [],
  };
}

/**
 * Generate from available sources
 */
async function generateFromAvailableSources(config: TaskConfig): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  contentIds: string[];
}> {
  const contentIds: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Get active RSS feeds
  const feeds = await db
    .select()
    .from(rssFeeds)
    .where(eq(rssFeeds.isActive, true))
    .orderBy(desc(rssFeeds.lastFetchedAt))
    .limit(3);

  for (const feed of feeds) {
    const result = await generateFromRSS(feed.id, config.locale);
    processed += result.processed;
    succeeded += result.succeeded;
    failed += result.failed;
    contentIds.push(...result.contentIds);
  }

  return { processed, succeeded, failed, contentIds };
}
