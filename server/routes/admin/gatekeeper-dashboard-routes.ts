/**
 * Gatekeeper Dashboard API Routes
 * Command Center for editorial control and monitoring
 */

import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { getDeduplicationEngine } from "../../octypo/gatekeeper/deduplication";
import { EngineRegistry } from "../../services/engine-registry";

const router = Router();

/**
 * GET /api/admin/gatekeeper/dashboard/kpis
 * Get key performance indicators
 */
router.get("/dashboard/kpis", async (req, res) => {
  try {
    // Get 24h stats from database
    const stats24h = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as processed_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND gate1_decision = 'skip') as skipped_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND gate1_decision = 'write') as approved_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND gate1_decision = 'queue') as queued_24h,
        AVG(gate1_score) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as avg_score_24h,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review
      FROM rss_feed_items
      WHERE gate1_score IS NOT NULL
    `);

    const row = (stats24h as any).rows?.[0] || {};

    // Get dedup stats
    const dedupEngine = getDeduplicationEngine();
    const dedupStats = await dedupEngine.getStats();

    // Get engine stats
    const engineStats = EngineRegistry.getStats();

    // Calculate SEO accuracy (items that got approved and have good scores)
    const seoAccuracy = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE gate1_seo_score >= 60) as high_seo,
        COUNT(*) as total
      FROM rss_feed_items
      WHERE gate1_decision = 'write'
        AND created_at > NOW() - INTERVAL '7 days'
    `);
    const seoRow = (seoAccuracy as any).rows?.[0] || { high_seo: 0, total: 1 };
    const seoAccuracyPct = Math.round(
      (Number(seoRow.high_seo) / Math.max(1, Number(seoRow.total))) * 100
    );

    res.json({
      success: true,
      kpis: {
        processed24h: Number(row.processed_24h) || 0,
        skipped24h: Number(row.skipped_24h) || 0,
        approved24h: Number(row.approved_24h) || 0,
        queued24h: Number(row.queued_24h) || 0,
        avgScore24h: Math.round(Number(row.avg_score_24h) || 0),
        pendingReview: Number(row.pending_review) || 0,
        filterRate:
          row.processed_24h > 0
            ? Math.round((Number(row.skipped_24h) / Number(row.processed_24h)) * 100)
            : 0,
        seoAccuracy: seoAccuracyPct,
        duplicatesBlocked: (dedupStats as any).duplicatesFound || 0,
        enginesHealthy: engineStats.healthy,
        enginesTotal: engineStats.total,
      },
    });
  } catch (error) {
    console.error("[Gatekeeper Dashboard] KPIs error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/gatekeeper/dashboard/value-matrix
 * Get content value matrix data (2x2 grid)
 */
router.get("/dashboard/value-matrix", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        title,
        source,
        gate1_score as total_score,
        gate1_seo_score as seo_score,
        gate1_aeo_score as aeo_score,
        gate1_virality_score as virality_score,
        gate1_decision as decision,
        gate1_tier as tier,
        gate1_value as estimated_value,
        gate1_cost as estimated_cost,
        gate1_reasoning as reasoning,
        created_at
      FROM rss_feed_items
      WHERE gate1_score IS NOT NULL
        AND created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 100
    `);

    const items = (result as any).rows || [];

    // Categorize into quadrants
    const matrix = {
      quickWins: items.filter(
        (i: any) =>
          (i.estimated_value === "high" || i.total_score >= 70) &&
          (i.estimated_cost === "low" || i.estimated_cost === "medium")
      ),
      strategicInvestments: items.filter(
        (i: any) =>
          (i.estimated_value === "high" || i.total_score >= 70) && i.estimated_cost === "high"
      ),
      gapFillers: items.filter(
        (i: any) =>
          i.estimated_value !== "high" &&
          i.total_score < 70 &&
          (i.estimated_cost === "low" || i.estimated_cost === "medium")
      ),
      skip: items.filter(
        (i: any) =>
          (i.estimated_value === "low" || i.total_score < 40) && i.estimated_cost === "high"
      ),
    };

    res.json({
      success: true,
      matrix,
      summary: {
        quickWins: matrix.quickWins.length,
        strategicInvestments: matrix.strategicInvestments.length,
        gapFillers: matrix.gapFillers.length,
        skip: matrix.skip.length,
      },
    });
  } catch (error) {
    console.error("[Gatekeeper Dashboard] Value matrix error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/gatekeeper/dashboard/queue
 * Get editorial queue
 */
router.get("/dashboard/queue", async (req, res) => {
  try {
    const { status = "all", limit = 50, offset = 0 } = req.query;

    let whereClause = sql`gate1_score IS NOT NULL`;
    if (status === "pending") {
      whereClause = sql`${whereClause} AND gate1_decision = 'write' AND status = 'pending_review'`;
    } else if (status === "approved") {
      whereClause = sql`${whereClause} AND gate1_decision = 'write'`;
    } else if (status === "skipped") {
      whereClause = sql`${whereClause} AND gate1_decision = 'skip'`;
    }

    const result = await db.execute(sql`
      SELECT
        id,
        title,
        summary,
        source,
        url,
        category,
        gate1_score as total_score,
        gate1_seo_score as seo_score,
        gate1_aeo_score as aeo_score,
        gate1_virality_score as virality_score,
        gate1_decision as decision,
        gate1_tier as tier,
        gate1_value as estimated_value,
        gate1_cost as estimated_cost,
        gate1_reasoning as reasoning,
        gate1_writer_id as writer_id,
        gate1_writer_name as writer_name,
        gate1_keywords as keywords,
        status,
        created_at,
        processed_at
      FROM rss_feed_items
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN gate1_tier = 'S1' THEN 1
             WHEN gate1_tier = 'S2' THEN 2
             ELSE 3 END,
        gate1_score DESC,
        created_at DESC
      LIMIT ${Number(limit)}
      OFFSET ${Number(offset)}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM rss_feed_items
      WHERE ${whereClause}
    `);

    res.json({
      success: true,
      items: (result as any).rows || [],
      total: Number((countResult as any).rows?.[0]?.total) || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error("[Gatekeeper Dashboard] Queue error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/gatekeeper/dashboard/bias-check
 * Check for potential algorithmic bias
 */
router.get("/dashboard/bias-check", async (req, res) => {
  try {
    // Check geographic bias - are certain destinations over/under represented?
    const geoBias = await db.execute(sql`
      SELECT
        COALESCE(category, 'Unknown') as category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE gate1_decision = 'write') as approved,
        AVG(gate1_score) as avg_score,
        ROUND(COUNT(*) FILTER (WHERE gate1_decision = 'write')::numeric / NULLIF(COUNT(*), 0) * 100) as approval_rate
      FROM rss_feed_items
      WHERE gate1_score IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY category
      HAVING COUNT(*) >= 5
      ORDER BY approval_rate DESC
    `);

    // Check source bias - are certain sources favored?
    const sourceBias = await db.execute(sql`
      SELECT
        source,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE gate1_decision = 'write') as approved,
        AVG(gate1_score) as avg_score,
        ROUND(COUNT(*) FILTER (WHERE gate1_decision = 'write')::numeric / NULLIF(COUNT(*), 0) * 100) as approval_rate
      FROM rss_feed_items
      WHERE gate1_score IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY source
      HAVING COUNT(*) >= 3
      ORDER BY approval_rate DESC
    `);

    // Check time bias - are certain times of day favored?
    const timeBias = await db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as total,
        AVG(gate1_score) as avg_score
      FROM rss_feed_items
      WHERE gate1_score IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `);

    // Calculate bias alerts
    const geoRows = (geoBias as any).rows || [];
    const sourceRows = (sourceBias as any).rows || [];

    const alerts = [];

    // Check for extreme approval rate differences in categories
    if (geoRows.length > 1) {
      const rates = geoRows.map((r: any) => Number(r.approval_rate));
      const maxRate = Math.max(...rates);
      const minRate = Math.min(...rates);
      if (maxRate - minRate > 50) {
        alerts.push({
          type: "geographic",
          severity: "warning",
          message: `Large approval rate gap between categories: ${maxRate}% vs ${minRate}%`,
        });
      }
    }

    // Check for source favoritism
    if (sourceRows.length > 1) {
      const rates = sourceRows.map((r: any) => Number(r.approval_rate));
      const maxRate = Math.max(...rates);
      const minRate = Math.min(...rates);
      if (maxRate - minRate > 60) {
        alerts.push({
          type: "source",
          severity: "warning",
          message: `Potential source bias: approval rates vary from ${minRate}% to ${maxRate}%`,
        });
      }
    }

    res.json({
      success: true,
      biasAnalysis: {
        geographic: geoRows,
        source: sourceRows,
        temporal: (timeBias as any).rows || [],
      },
      alerts,
      overallHealth:
        alerts.length === 0
          ? "healthy"
          : alerts.some(a => a.severity === "critical")
            ? "critical"
            : "warning",
    });
  } catch (error) {
    console.error("[Gatekeeper Dashboard] Bias check error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/admin/gatekeeper/dashboard/override
 * Override a bot decision (Human-in-the-loop)
 */
router.post("/dashboard/override", async (req, res) => {
  try {
    const { itemId, newDecision, reason } = req.body;

    if (!itemId || !newDecision) {
      return res.status(400).json({
        success: false,
        error: "Missing itemId or newDecision",
      });
    }

    await db.execute(sql`
      UPDATE rss_feed_items
      SET
        gate1_decision = ${newDecision},
        human_override = true,
        human_override_reason = ${reason || "Editor override"},
        human_override_at = NOW()
      WHERE id = ${itemId}
    `);

    res.json({
      success: true,
      message: `Decision overridden to: ${newDecision}`,
    });
  } catch (error) {
    console.error("[Gatekeeper Dashboard] Override error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/gatekeeper/dashboard/trends
 * Get scoring trends over time
 */
router.get("/dashboard/trends", async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const result = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE gate1_decision = 'write') as approved,
        COUNT(*) FILTER (WHERE gate1_decision = 'skip') as skipped,
        AVG(gate1_score) as avg_score,
        AVG(gate1_seo_score) as avg_seo,
        AVG(gate1_aeo_score) as avg_aeo,
        AVG(gate1_virality_score) as avg_virality
      FROM rss_feed_items
      WHERE gate1_score IS NOT NULL
        AND created_at > NOW() - INTERVAL '${sql.raw(String(days))} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      trends: (result as any).rows || [],
    });
  } catch (error) {
    console.error("[Gatekeeper Dashboard] Trends error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
