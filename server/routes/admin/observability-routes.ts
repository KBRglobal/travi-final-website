/**
 * Observability Routes - System visibility and health endpoints
 * Tasks 1-6: Content intelligence, jobs, RSS status, search coverage
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../../security";
import { db } from "../../db";
import {
  contents,
  searchIndex,
  internalLinks,
  rssFeeds,
  topicClusters,
  topicClusterItems,
  aiGenerationLogs,
} from "@shared/schema";
import { eq, desc, and, sql, count, isNull, isNotNull, gte } from "drizzle-orm";

// Track RSS processing stats (in-memory for now)
let rssProcessingStats = {
  lastRunTime: null as Date | null,
  lastError: null as string | null,
  itemsProcessed: 0,
  entityExtractionSuccess: 0,
  entityExtractionFailure: 0,
};

export function updateRssProcessingStats(stats: Partial<typeof rssProcessingStats>) {
  rssProcessingStats = { ...rssProcessingStats, ...stats };
}

export function getRssProcessingStats() {
  return { ...rssProcessingStats };
}

export function registerObservabilityRoutes(app: Express) {
  // ============================================================================
  // HEALTH CHECK (public, for sanity script runtime verification)
  // Does not expose sensitive data, only system health status
  // ============================================================================

  // Detailed health check with event bus and queue status (renamed to avoid conflict)
  app.get("/api/health/detailed", async (req: Request, res: Response) => {
    try {
      // Import and check event bus status
      const { getSubscriberStatus, contentEvents } = await import("../../events");
      const eventBusStatus = getSubscriberStatus();
      const eventStats = contentEvents.getStats();

      // Import and check job queue status with runtime info
      const { getQueueHealth } = await import("../../job-queue");
      const queueHealth = getQueueHealth();

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        eventBus: {
          initialized: eventBusStatus?.initialized || false,
          lastInitializedAt: eventBusStatus?.lastInitializedAt || null,
          subscribers: eventBusStatus?.stats?.subscribers || {},
          subscriberCount: Object.keys(eventBusStatus?.stats?.subscribers || {}).length,
          lastPublishedEvent: eventStats?.events?.["content.published"]?.lastEmitted || null,
          lastUpdatedEvent: eventStats?.events?.["content.updated"]?.lastEmitted || null,
        },
        jobQueue: {
          available: queueHealth.available,
          isRunning: queueHealth.isRunning,
          lastProcessedAt: queueHealth.lastProcessedAt,
          lastTickAt: queueHealth.lastTickAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ============================================================================
  // TASK 1: Content Intelligence Status (per-content view)
  // ============================================================================

  app.get(
    "/api/admin/content/intelligence-status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        const offset = parseInt(req.query.offset as string) || 0;

        // Get published content with intelligence indicators
        const contentList = await db
          .select({
            id: contents.id,
            title: contents.title,
            type: contents.type,
            status: contents.status,
            slug: contents.slug,
            answerCapsule: contents.answerCapsule,
            parentId: contents.parentId,
            publishedAt: contents.publishedAt,
          })
          .from(contents)
          .where(eq(contents.status, "published"))
          .orderBy(desc(contents.publishedAt))
          .limit(limit)
          .offset(offset);

        // Get search index entries
        const indexedIds = await db.select({ contentId: searchIndex.contentId }).from(searchIndex);
        const indexedSet = new Set(indexedIds.map(i => i.contentId));

        // Get internal link counts per content
        const linkCounts = await db
          .select({
            sourceContentId: internalLinks.sourceContentId,
            count: sql<number>`count(*)::int`,
          })
          .from(internalLinks)
          .groupBy(internalLinks.sourceContentId);
        const linkCountMap = new Map(linkCounts.map(l => [l.sourceContentId, l.count]));

        // Build response with intelligence status per content
        const items = contentList.map(c => ({
          id: c.id,
          title: c.title,
          type: c.type,
          slug: c.slug,
          publishedAt: c.publishedAt?.toISOString() || null,
          isIndexed: indexedSet.has(c.id),
          hasAEO: !!(c.answerCapsule && c.answerCapsule.length > 0),
          entityLinked: !!c.parentId,
          internalLinksCount: linkCountMap.get(c.id) || 0,
        }));

        // Get total count
        const [totalResult] = await db
          .select({ count: count() })
          .from(contents)
          .where(eq(contents.status, "published"));

        res.json({
          items,
          total: Number(totalResult?.count || 0),
          limit,
          offset,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get content intelligence status" });
      }
    }
  );

  // ============================================================================
  // TASK 2: Job & Failure Visibility
  // ============================================================================

  app.get("/api/admin/jobs/recent", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

      // Get recent AI generation logs as job records
      const jobs = await db
        .select({
          id: aiGenerationLogs.id,
          targetType: aiGenerationLogs.targetType,
          targetId: aiGenerationLogs.targetId,
          provider: aiGenerationLogs.provider,
          model: aiGenerationLogs.model,
          success: aiGenerationLogs.success,
          error: aiGenerationLogs.error,
          duration: aiGenerationLogs.duration,
          createdAt: aiGenerationLogs.createdAt,
        })
        .from(aiGenerationLogs)
        .orderBy(desc(aiGenerationLogs.createdAt))
        .limit(limit);

      const recentJobs = jobs.map(j => ({
        id: j.id,
        type: j.targetType,
        targetId: j.targetId,
        provider: j.provider || "unknown",
        model: j.model || "unknown",
        status: j.success ? "success" : "failed",
        error: j.error,
        duration: j.duration,
        timestamp: j.createdAt?.toISOString() || null,
      }));

      // Get summary stats
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [statsResult] = await db
        .select({
          total: count(),
          successful: sql<number>`count(*) filter (where ${aiGenerationLogs.success} = true)`,
          failed: sql<number>`count(*) filter (where ${aiGenerationLogs.success} = false)`,
        })
        .from(aiGenerationLogs)
        .where(gte(aiGenerationLogs.createdAt, last24h));

      res.json({
        jobs: recentJobs,
        stats: {
          total: Number(statsResult?.total || 0),
          successful: Number(statsResult?.successful || 0),
          failed: Number(statsResult?.failed || 0),
          last24h: true,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get recent jobs" });
    }
  });

  // ============================================================================
  // TASK 4: Internal Linking Health Check
  // ============================================================================

  app.get("/api/content/:id/health", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get content
      const [content] = await db
        .select({
          id: contents.id,
          title: contents.title,
          status: contents.status,
          answerCapsule: contents.answerCapsule,
          wordCount: contents.wordCount,
          seoScore: contents.seoScore,
          publishedAt: contents.publishedAt,
        })
        .from(contents)
        .where(eq(contents.id, id))
        .limit(1);

      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Count internal links
      const [linksResult] = await db
        .select({ count: count() })
        .from(internalLinks)
        .where(eq(internalLinks.sourceContentId, id));
      const internalLinksCount = Number(linksResult?.count || 0);

      // Check if indexed
      const [indexResult] = await db
        .select({ contentId: searchIndex.contentId })
        .from(searchIndex)
        .where(eq(searchIndex.contentId, id))
        .limit(1);
      const isIndexed = !!indexResult;

      res.json({
        contentId: content.id,
        title: content.title,
        status: content.status,
        health: {
          internalLinksCount,
          isIndexed,
          hasAEO: !!(content.answerCapsule && content.answerCapsule.length > 0),
          wordCount: content.wordCount || 0,
          seoScore: content.seoScore || 0,
        },
        publishedAt: content.publishedAt?.toISOString() || null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get content health" });
    }
  });

  // ============================================================================
  // TASK 5: RSS Processing Status
  // ============================================================================

  app.get("/api/admin/rss/status", requireAuth, async (req: Request, res: Response) => {
    try {
      // Get feeds summary
      const feeds = await db
        .select({
          id: rssFeeds.id,
          name: rssFeeds.name,
          isActive: rssFeeds.isActive,
          lastFetchedAt: rssFeeds.lastFetchedAt,
        })
        .from(rssFeeds)
        .orderBy(desc(rssFeeds.lastFetchedAt))
        .limit(20);

      // Get cluster stats
      const [clusterStats] = await db
        .select({
          total: count(),
          pending: sql<number>`count(*) filter (where ${topicClusters.status} = 'pending')`,
          merged: sql<number>`count(*) filter (where ${topicClusters.status} = 'merged')`,
        })
        .from(topicClusters);

      // Get recent cluster items count
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [itemsResult] = await db
        .select({ count: count() })
        .from(topicClusterItems)
        .where(gte(topicClusterItems.createdAt, last24h));

      res.json({
        lastRunTime: rssProcessingStats.lastRunTime?.toISOString() || null,
        processing: {
          itemsProcessed: rssProcessingStats.itemsProcessed,
          entityExtractionSuccess: rssProcessingStats.entityExtractionSuccess,
          entityExtractionFailure: rssProcessingStats.entityExtractionFailure,
        },
        feeds: feeds.map(f => ({
          id: f.id,
          name: f.name,
          isActive: f.isActive,
          lastFetched: f.lastFetchedAt?.toISOString() || null,
        })),
        clusters: {
          total: Number(clusterStats?.total || 0),
          pending: Number(clusterStats?.pending || 0),
          merged: Number(clusterStats?.merged || 0),
        },
        recentItems24h: Number(itemsResult?.count || 0),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get RSS status" });
    }
  });

  // ============================================================================
  // TASK 6: Search Coverage Indicator
  // ============================================================================

  app.get("/api/content/:id/search-status", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if content exists
      const [content] = await db
        .select({
          id: contents.id,
          title: contents.title,
          status: contents.status,
          slug: contents.slug,
        })
        .from(contents)
        .where(eq(contents.id, id))
        .limit(1);

      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Check if in search index
      const [indexEntry] = await db
        .select({
          contentId: searchIndex.contentId,
          updatedAt: searchIndex.updatedAt,
        })
        .from(searchIndex)
        .where(eq(searchIndex.contentId, id))
        .limit(1);

      res.json({
        contentId: content.id,
        title: content.title,
        slug: content.slug,
        status: content.status,
        isDiscoverable: content.status === "published" && !!indexEntry,
        searchIndex: indexEntry
          ? {
              indexed: true,
              lastIndexed: indexEntry.updatedAt?.toISOString() || null,
            }
          : {
              indexed: false,
              lastIndexed: null,
            },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get search status" });
    }
  });
}
