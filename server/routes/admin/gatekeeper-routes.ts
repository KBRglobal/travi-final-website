/**
 * Gatekeeper Admin Routes
 * Control and monitor the autonomous content pipeline
 */

import { Router } from "express";
import { db } from "../../db";
import { contents } from "@shared/schema";

import { eq, desc, and, sql, count } from "drizzle-orm";
import {
  getGatekeeperOrchestrator,
  getGate1Selector,
  getGate2Approver,
  runGatekeeperPipeline,
} from "../../octypo/gatekeeper";
import { rssReader } from "../../octypo/rss-reader";
import { logger } from "../../lib/logger";

const router = Router();

// ============================================
// PIPELINE CONTROL
// ============================================

/**
 * Run the gatekeeper pipeline manually
 * POST /api/admin/gatekeeper/run
 */
router.post("/run", async (req, res) => {
  try {
    const maxItems = req.body.maxItems || 10;

    logger.info({ maxItems }, "[GatekeeperAPI] Manual pipeline run requested");

    const stats = await runGatekeeperPipeline(maxItems);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Pipeline run failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get pipeline status
 * GET /api/admin/gatekeeper/status
 */
router.get("/status", async (req, res) => {
  try {
    const orchestrator = getGatekeeperOrchestrator();

    // Get RSS stats from rssReader
    const rssStats = await rssReader.getStats();

    const [draftCount] = await db
      .select({ count: count() })
      .from(contents)
      .where(eq(contents.status, "draft"));

    const [approvedCount] = await db
      .select({ count: count() })
      .from(contents)
      .where(eq(contents.status, "approved"));

    const [publishedToday] = await db
      .select({ count: count() })
      .from(contents)
      .where(and(eq(contents.status, "approved"), sql`${contents.publishedAt} >= CURRENT_DATE`));

    res.json({
      success: true,
      status: {
        isRunning: orchestrator.isActive(),
        stats: orchestrator.getStats(),
      },
      queue: {
        unprocessedItems: rssStats.unprocessedItems,
        draftsAwaitingReview: draftCount?.count || 0,
        approvedArticles: approvedCount?.count || 0,
        publishedToday: publishedToday?.count || 0,
      },
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Status check failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================
// GATE 1: CONTENT SELECTION
// ============================================

/**
 * Preview Gate 1 evaluation for an RSS item (without saving)
 * POST /api/admin/gatekeeper/gate1/preview
 */
router.post("/gate1/preview", async (req, res) => {
  try {
    const { title, summary, category, destinationId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: "Title is required" });
    }

    const gate1 = getGate1Selector();
    const result = await gate1.evaluate({
      feedItemId: "preview",
      title,
      summary: summary || "",
      sourceUrl: "",
      sourceName: "Preview",
      category,
      destinationId,
    });

    res.json({
      success: true,
      evaluation: result,
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Gate1 preview failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get unprocessed RSS items with potential evaluation
 * GET /api/admin/gatekeeper/gate1/queue
 */
router.get("/gate1/queue", async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit as string) || 20, 100);

    // Use rssReader to get unprocessed items
    const items = await rssReader.getUnprocessedItems(limit);

    res.json({
      success: true,
      count: items.length,
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        source: item.source,
        category: item.category,
        publishedDate: item.publishedDate,
      })),
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Gate1 queue fetch failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================
// GATE 2: ARTICLE APPROVAL
// ============================================

/**
 * Preview Gate 2 evaluation for an article (without saving)
 * POST /api/admin/gatekeeper/gate2/preview
 */
router.post("/gate2/preview", async (req, res) => {
  try {
    const { contentId } = req.body;

    if (!contentId) {
      return res.status(400).json({ success: false, error: "contentId is required" });
    }

    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      return res.status(404).json({ success: false, error: "Content not found" });
    }

    const gate2 = getGate2Approver();
    const result = await gate2.review({
      contentId: content.id,
      title: content.title,
      metaTitle: content.metaTitle || content.title,
      metaDescription: content.metaDescription || "",
      summary: content.summary || "",
      answerCapsule: content.answerCapsule || undefined,
      blocks: (content.blocks as any[]) || [],
      wordCount: content.wordCount || 0,
      writerId: content.writerId || "",
    });

    res.json({
      success: true,
      evaluation: result,
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Gate2 preview failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get articles awaiting review
 * GET /api/admin/gatekeeper/gate2/queue
 */
router.get("/gate2/queue", async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit as string) || 20, 100);

    const drafts = await db.query.contents.findMany({
      where: and(eq(contents.status, "draft"), eq(contents.generatedByAI, true)),
      orderBy: [desc(contents.createdAt)],
      limit,
    });

    res.json({
      success: true,
      count: drafts.length,
      articles: drafts.map(content => ({
        id: content.id,
        title: content.title,
        wordCount: content.wordCount,
        writerId: content.writerId,
        createdAt: content.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Gate2 queue fetch failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Force approve an article (bypass Gate 2)
 * POST /api/admin/gatekeeper/gate2/force-approve
 */
router.post("/gate2/force-approve", async (req, res) => {
  try {
    const { contentId } = req.body;

    if (!contentId) {
      return res.status(400).json({ success: false, error: "contentId is required" });
    }

    await db
      .update(contents)
      .set({
        status: "approved",
        publishedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));

    logger.info({ contentId }, "[GatekeeperAPI] Force approved article");

    res.json({
      success: true,
      message: "Article approved and queued for localization",
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Force approve failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Force reject an article
 * POST /api/admin/gatekeeper/gate2/force-reject
 */
router.post("/gate2/force-reject", async (req, res) => {
  try {
    const { contentId, reason } = req.body;

    if (!contentId) {
      return res.status(400).json({ success: false, error: "contentId is required" });
    }

    // We don't delete, just leave as draft with a note
    await db
      .update(contents)
      .set({
        status: "draft",
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));

    logger.warn({ contentId, reason }, "[GatekeeperAPI] Force rejected article");

    res.json({
      success: true,
      message: "Article rejected",
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Force reject failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================
// STATISTICS & ANALYTICS
// ============================================

/**
 * Get gatekeeper statistics
 * GET /api/admin/gatekeeper/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const days = Number.parseInt(req.query.days as string) || 7;

    // Get counts by status
    const statusCounts = await db
      .select({
        status: contents.status,
        count: count(),
      })
      .from(contents)
      .where(eq(contents.generatedByAI, true))
      .groupBy(contents.status);

    // Get daily generation counts
    const dailyStats = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as generated,
        COUNT(CASE WHEN status = 'approved' OR status = 'published' THEN 1 END) as approved
      FROM contents
      WHERE generated_by_ai = true
        AND created_at >= NOW() - INTERVAL '${sql.raw(String(days))} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      stats: {
        byStatus: Object.fromEntries(statusCounts.map(s => [s.status, s.count])),
        daily: dailyStats.rows,
        period: `Last ${days} days`,
      },
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Stats fetch failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get writer performance stats
 * GET /api/admin/gatekeeper/stats/writers
 */
router.get("/stats/writers", async (req, res) => {
  try {
    const writerStats = await db.execute(sql`
      SELECT
        writer_id,
        COUNT(*) as total_articles,
        COUNT(CASE WHEN status = 'approved' OR status = 'published' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as pending
      FROM contents
      WHERE generated_by_ai = true AND writer_id IS NOT NULL
      GROUP BY writer_id
      ORDER BY total_articles DESC
    `);

    res.json({
      success: true,
      writers: writerStats.rows,
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Writer stats fetch failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================
// FULL PIPELINE HEALTH OVERVIEW
// ============================================

/**
 * Get comprehensive pipeline stats including RSS scheduler,
 * Gatekeeper, native content generation, and background services
 * GET /api/admin/gatekeeper/pipeline/stats
 */
router.get("/pipeline/stats", async (req, res) => {
  try {
    const orchestrator = getGatekeeperOrchestrator();

    // Gatekeeper stats
    const gatekeeperStats = orchestrator.getStats();

    // RSS Scheduler stats
    let rssStats: any = { running: false };
    try {
      const { getRSSSchedulerStatus, getSchedulerStats } =
        await import("../../octypo/rss-scheduler");
      const status = getRSSSchedulerStatus();
      const schedulerStats = await getSchedulerStats();
      rssStats = { ...status, ...schedulerStats };
    } catch {
      // RSS scheduler not available
    }

    // Native content generation stats
    let nativeContentStats: any = { available: false };
    try {
      const { getNativeContentStats } = await import("../../localization/native-content-handler");
      nativeContentStats = { available: true, ...getNativeContentStats() };
    } catch {
      // Native content handler not registered yet
    }

    // Background services status
    let backgroundStatus: any = { started: false };
    try {
      const { getBackgroundServicesStatus } = await import("../../services/background-services");
      backgroundStatus = await getBackgroundServicesStatus();
    } catch {
      // Background services not available
    }

    // Database content counts
    const contentCounts = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft') as drafts,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'published') as published,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as created_today,
        COUNT(*) FILTER (WHERE published_at >= CURRENT_DATE) as published_today
      FROM contents
      WHERE generated_by_ai = true
    `);

    // Native content per locale
    const localeProgress = await db.execute(sql`
      SELECT
        locale,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM translations
      GROUP BY locale
      ORDER BY total DESC
    `);

    res.json({
      success: true,
      pipeline: {
        gatekeeper: {
          isRunning: orchestrator.isActive(),
          stats: gatekeeperStats,
        },
        rssScheduler: rssStats,
        nativeContent: nativeContentStats,
        backgroundServices: backgroundStatus.started
          ? { started: true, services: backgroundStatus.services }
          : { started: false },
        content: (contentCounts as any).rows?.[0] || {},
        localeProgress: (localeProgress as any).rows || [],
      },
    });
  } catch (error) {
    logger.error({ error }, "[GatekeeperAPI] Pipeline stats failed");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
