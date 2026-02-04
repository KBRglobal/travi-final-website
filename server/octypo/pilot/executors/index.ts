/**
 * Autopilot Task Executors
 * Register all executors with the autopilot service
 */

import { getRealAutopilot } from "../real-autopilot";
import { TaskConfig, TaskResult, AutopilotTaskType } from "../types";
import { executeContentGeneration } from "./content-generation-executor";
import { db } from "../../../db";
import { contents, seoMetadata, internalLinks, vamsAssets } from "@shared/schema";
import { eq, and, sql, lt, isNull, desc } from "drizzle-orm";
import { log } from "../../../lib/logger";

/**
 * Quality Improvement Executor
 * Improve low-quality content
 */
async function executeQualityImprovement(taskId: string, config: TaskConfig): Promise<TaskResult> {
  const startTime = Date.now();
  const contentIds: string[] = [];
  let processed = 0;
  let succeeded = 0;

  try {
    // Find low-quality content
    const lowQualityContent = await db
      .select({
        id: contents.id,
        title: contents.title,
        seoScore: contents.seoScore,
      })
      .from(contents)
      .where(and(eq(contents.status, "published"), lt(contents.seoScore, config.targetScore || 75)))
      .orderBy(contents.seoScore)
      .limit(10);

    for (const content of lowQualityContent) {
      processed++;

      // TODO: Implement AI-powered content quality improvement (rewrite low-quality sections,
      // improve SEO, enhance readability). For now, flagging content for manual review.
      await db
        .update(contents)
        .set({
          status: "in_review",
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, content.id));

      contentIds.push(content.id);
      succeeded++;
    }

    return {
      success: succeeded > 0,
      contentIds,
      metrics: {
        itemsProcessed: processed,
        itemsSucceeded: succeeded,
        itemsFailed: processed - succeeded,
        processingTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  }
}

/**
 * Freshness Update Executor
 * Update stale content
 */
async function executeFreshnessUpdate(taskId: string, config: TaskConfig): Promise<TaskResult> {
  const startTime = Date.now();
  const contentIds: string[] = [];
  let processed = 0;
  let succeeded = 0;

  try {
    const maxAge = config.maxAge || 90; // Days
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);

    // Find stale content
    const staleContent = await db
      .select({
        id: contents.id,
        title: contents.title,
        updatedAt: contents.updatedAt,
      })
      .from(contents)
      .where(and(eq(contents.status, "published"), lt(contents.updatedAt, cutoffDate)))
      .orderBy(contents.updatedAt)
      .limit(10);

    for (const content of staleContent) {
      processed++;

      // Update SEO metadata to flag for refresh
      await db
        .update(seoMetadata)
        .set({
          needsRefresh: true,
          updatedAt: new Date(),
        } as any)
        .where(eq(seoMetadata.contentId, content.id));

      contentIds.push(content.id);
      succeeded++;
    }

    return {
      success: succeeded > 0,
      contentIds,
      changes: { markedForRefresh: succeeded },
      metrics: {
        itemsProcessed: processed,
        itemsSucceeded: succeeded,
        itemsFailed: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  }
}

/**
 * Internal Linking Executor
 * Add internal links to content
 */
async function executeInternalLinking(taskId: string, config: TaskConfig): Promise<TaskResult> {
  const startTime = Date.now();
  const contentIds: string[] = [];
  let linksCreated = 0;

  try {
    // Find orphan content (no internal links pointing to it)
    const orphanContent = await db
      .select({
        id: contents.id,
        title: contents.title,
        slug: contents.slug,
      })
      .from(contents)
      .leftJoin(seoMetadata, eq(contents.id, seoMetadata.contentId))
      .where(and(eq(contents.status, "published"), eq(seoMetadata.isOrphan, true)))
      .limit(config.maxLinks || 10);

    // Find potential source content for linking
    for (const orphan of orphanContent) {
      // Find related content that could link to this orphan
      const relatedContent = await db
        .select({
          id: contents.id,
          title: contents.title,
        })
        .from(contents)
        .where(
          and(
            eq(contents.status, "published"),
            sql`id != ${orphan.id}`,
            sql`title ILIKE ${"%" + orphan.title.split(" ")[0] + "%"}`
          )
        )
        .limit(3);

      for (const source of relatedContent) {
        // Create internal link record
        await db
          .insert(internalLinks)
          .values({
            sourceContentId: source.id,
            targetContentId: orphan.id,
            anchorText: orphan.title,
            linkType: "suggested",
            autoGenerated: true,
            relevanceScore: 0.7,
          })
          .onConflictDoNothing();

        linksCreated++;
      }

      contentIds.push(orphan.id);
    }

    return {
      success: linksCreated > 0,
      contentIds,
      changes: { linksCreated },
      metrics: {
        itemsProcessed: orphanContent.length,
        itemsSucceeded: contentIds.length,
        itemsFailed: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  }
}

/**
 * Image Optimization Executor
 * Optimize images for content
 */
async function executeImageOptimization(taskId: string, config: TaskConfig): Promise<TaskResult> {
  const startTime = Date.now();
  let processed = 0;
  let optimized = 0;

  try {
    // Find content without optimized images
    const contentWithoutImages = await db
      .select({
        id: contents.id,
        title: contents.title,
        heroImage: contents.heroImage,
      })
      .from(contents)
      .where(and(eq(contents.status, "published"), isNull(contents.heroImage)))
      .limit(config.maxLinks || 10);

    for (const content of contentWithoutImages) {
      processed++;

      // TODO: Implement VAMS (Visual Asset Management System) integration to fetch
      // appropriate hero images based on content type and destination
      log.info(`[ImageOptimization] Content ${content.id} needs hero image`);
    }

    return {
      success: true,
      changes: { identified: processed, optimized },
      metrics: {
        itemsProcessed: processed,
        itemsSucceeded: optimized,
        itemsFailed: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  }
}

/**
 * Entity Extraction Executor
 */
async function executeEntityExtraction(taskId: string, config: TaskConfig): Promise<TaskResult> {
  const startTime = Date.now();

  if (!config.contentId) {
    return {
      success: false,
      error: "Content ID is required for entity extraction",
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  }

  try {
    const { getEntityExtractor } = await import("../../exploder/entity-extractor");
    const extractor = getEntityExtractor();

    const result = await extractor.extractFromContent(config.contentId);

    return {
      success: result.success,
      contentIds: [config.contentId],
      changes: { entitiesExtracted: result.entities.length },
      error: result.error,
      metrics: {
        itemsProcessed: 1,
        itemsSucceeded: result.success ? 1 : 0,
        itemsFailed: result.success ? 0 : 1,
        processingTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  }
}

/**
 * Content Explosion Executor
 */
async function executeContentExplosion(taskId: string, config: TaskConfig): Promise<TaskResult> {
  const startTime = Date.now();

  if (!config.contentId) {
    return {
      success: false,
      error: "Content ID is required for content explosion",
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  }

  try {
    const { getExplosionOrchestrator } = await import("../../exploder");
    const orchestrator = getExplosionOrchestrator();

    const jobId = await orchestrator.startExplosion(config.contentId, {
      maxArticles: config.maxArticles,
      articleTypes: config.articleTypes as any,
      locale: config.locale,
    });

    // Wait for completion with timeout
    const timeout = 10 * 60 * 1000; // 10 minutes
    const checkInterval = 10000; // 10 seconds

    while (Date.now() - startTime < timeout) {
      const progress = await orchestrator.getJobProgress(jobId);
      if (!progress) break;

      if (progress.status === "completed") {
        return {
          success: true,
          contentIds: [],
          changes: {
            entitiesExtracted: progress.entitiesExtracted,
            ideasGenerated: progress.ideasGenerated,
            articlesGenerated: progress.articlesGenerated,
          },
          metrics: {
            itemsProcessed: progress.ideasGenerated,
            itemsSucceeded: progress.articlesGenerated,
            itemsFailed: progress.ideasGenerated - progress.articlesGenerated,
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      if (progress.status === "failed") {
        return {
          success: false,
          error: progress.error || "Explosion job failed",
          metrics: { processingTimeMs: Date.now() - startTime },
        };
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return {
      success: false,
      error: "Explosion job timed out",
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metrics: { processingTimeMs: Date.now() - startTime },
    };
  }
}

/**
 * Register all executors with autopilot
 */
export function registerAllExecutors(): void {
  const autopilot = getRealAutopilot();

  autopilot.registerExecutor("content_generation", executeContentGeneration);
  autopilot.registerExecutor("quality_improvement", executeQualityImprovement);
  autopilot.registerExecutor("freshness_update", executeFreshnessUpdate);
  autopilot.registerExecutor("internal_linking", executeInternalLinking);
  autopilot.registerExecutor("image_optimization", executeImageOptimization);
  autopilot.registerExecutor("entity_extraction", executeEntityExtraction);
  autopilot.registerExecutor("content_explosion", executeContentExplosion);

  log.info("[AutopilotExecutors] All executors registered");
}
