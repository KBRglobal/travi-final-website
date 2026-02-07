/**
 * Content Metrics Routes
 * Content performance tracking, metrics recording, and regeneration decisions
 */

import type { Express } from "express";
import { requireAuth } from "../security";

export async function registerContentMetricsRoutes(app: Express): Promise<void> {
  // ============================================================================
  // Content Metrics API Routes
  // ============================================================================

  const {
    recordImpression,
    recordClick,
    recordScrollDepth,
    getMetrics: getContentMetrics,
    getTopPerformers,
    getScoreBreakdown,
    getRegenerationDecision,
  } = await import("../content");

  app.get("/api/content/metrics/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const metrics = getContentMetrics(contentId);

      if (!metrics) {
        return res.json({
          contentId,
          metrics: null,
          score: 0,
          breakdown: null,
          message: "No metrics recorded for this content",
        });
      }

      const breakdown = getScoreBreakdown(metrics);

      res.json({
        contentId,
        metrics: {
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          scrollDepth: metrics.scrollDepth,
          lastUpdated: metrics.lastUpdated.toISOString(),
        },
        score: breakdown.totalScore,
        breakdown,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content metrics" });
    }
  });

  app.get("/api/content/top-performers", requireAuth, async (req, res) => {
    try {
      const limit = Math.min(Number.parseInt(req.query.limit as string) || 10, 100);
      const topPerformers = getTopPerformers(limit);

      res.json({
        topPerformers: topPerformers.map(item => ({
          contentId: item.contentId,
          metrics: {
            impressions: item.metrics.impressions,
            clicks: item.metrics.clicks,
            scrollDepth: item.metrics.scrollDepth,
            lastUpdated: item.metrics.lastUpdated.toISOString(),
          },
          score: item.score,
        })),
        count: topPerformers.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top performers" });
    }
  });

  app.post("/api/content/metrics/:contentId/impression", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const metrics = recordImpression(contentId);
      res.json({ success: true, metrics });
    } catch (error) {
      res.status(500).json({ error: "Failed to record impression" });
    }
  });

  app.post("/api/content/metrics/:contentId/click", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const metrics = recordClick(contentId);
      res.json({ success: true, metrics });
    } catch (error) {
      res.status(500).json({ error: "Failed to record click" });
    }
  });

  app.post("/api/content/metrics/:contentId/scroll", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const { depth } = req.body;

      if (typeof depth !== "number" || depth < 0 || depth > 100) {
        return res.status(400).json({ error: "Invalid scroll depth (must be 0-100)" });
      }

      const metrics = recordScrollDepth(contentId, depth);
      res.json({ success: true, metrics });
    } catch (error) {
      res.status(500).json({ error: "Failed to record scroll depth" });
    }
  });

  app.get("/api/content/metrics/:contentId/regeneration-check", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const decision = getRegenerationDecision(contentId);
      res.json(decision);
    } catch (error) {
      res.status(500).json({ error: "Failed to check regeneration status" });
    }
  });

  // ============================================================================
  // Performance Model Routes
  // ============================================================================

  const {
    getPerformance,
    getPerformanceScore,
    recordImpression: recordPerformanceImpression,
    recordClick: recordPerformanceClick,
    getAllPerformance,
  } = await import("../content/metrics/performance-model");

  const { getRewriteDecision, shouldRewrite } = await import("../content/metrics/rewrite-guard");

  const {
    recordImpression: recordContentPerfImpression,
    recordClick: recordContentPerfClick,
    recordScrollDepth: recordContentPerfScrollDepth,
    getPerformanceScore: getContentPerfScore,
    getPerformance: getContentPerfData,
    getAllPerformance: getAllContentPerfData,
    shouldAllowRegeneration: shouldAllowContentRegen,
  } = await import("../content/metrics/content-performance");

  app.get("/api/content/performance/:entityId", requireAuth, async (req, res) => {
    try {
      const { entityId } = req.params;
      const performance = getPerformance(entityId);

      if (!performance) {
        return res.json({
          entityId,
          performance: null,
          score: 0,
          message: "No performance data recorded for this entity",
        });
      }

      res.json({
        entityId,
        entityType: performance.entityType,
        impressions: performance.impressions,
        clicks: performance.clicks,
        ctr: performance.ctr,
        score: performance.score,
        lastUpdated: performance.lastUpdated.toISOString(),
        createdAt: performance.createdAt.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  app.get("/api/content/performance", requireAuth, async (req, res) => {
    try {
      const all = getAllPerformance();
      res.json({
        performances: all.map(p => ({
          entityId: p.entityId,
          entityType: p.entityType,
          impressions: p.impressions,
          clicks: p.clicks,
          ctr: p.ctr,
          score: p.score,
          lastUpdated: p.lastUpdated.toISOString(),
          createdAt: p.createdAt.toISOString(),
        })),
        count: all.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  app.post("/api/content/performance", requireAuth, async (req, res) => {
    try {
      const { entityId, entityType, eventType, scrollDepth, forceOverride } = req.body;

      if (!entityId || typeof entityId !== "string") {
        return res.status(400).json({ error: "entityId is required" });
      }

      if (!entityType || typeof entityType !== "string") {
        return res.status(400).json({ error: "entityType is required" });
      }

      if (!eventType || !["impression", "click", "scroll"].includes(eventType)) {
        return res
          .status(400)
          .json({ error: "eventType must be 'impression', 'click', or 'scroll'" });
      }

      let performance;
      switch (eventType) {
        case "impression":
          performance = recordContentPerfImpression(entityId, entityType);
          break;
        case "click":
          performance = recordContentPerfClick(entityId, entityType);
          break;
        case "scroll":
          if (typeof scrollDepth !== "number" || scrollDepth < 0 || scrollDepth > 100) {
            return res
              .status(400)
              .json({ error: "scrollDepth must be a number between 0 and 100" });
          }
          performance = recordContentPerfScrollDepth(entityId, entityType, scrollDepth);
          break;
      }

      res.json({
        success: true,
        performance: {
          entityId: performance!.entityId,
          entityType: performance!.entityType,
          impressions: performance!.impressions,
          clicks: performance!.clicks,
          scrollDepth: performance!.scrollDepth,
          score: performance!.score,
          lastModified: performance!.lastModified.toISOString(),
          createdAt: performance!.createdAt.toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to record performance event" });
    }
  });

  app.get(
    "/api/content/performance/:entityId/regeneration-check",
    requireAuth,
    async (req, res) => {
      try {
        const { entityId } = req.params;
        const forceOverride = req.query.force === "true";
        const decision = shouldAllowContentRegen(entityId, forceOverride);
        const performance = getContentPerfData(entityId);

        res.json({
          entityId,
          allowed: decision.allowed,
          reason: decision.reason,
          score: performance?.score ?? 0,
          performance: performance
            ? {
                impressions: performance.impressions,
                clicks: performance.clicks,
                scrollDepth: performance.scrollDepth,
                score: performance.score,
                lastModified: performance.lastModified.toISOString(),
              }
            : null,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to check regeneration eligibility" });
      }
    }
  );

  app.post("/api/content/performance/:entityId/impression", requireAuth, async (req, res) => {
    try {
      const { entityId } = req.params;
      const { entityType } = req.body;

      if (!entityType || typeof entityType !== "string") {
        return res.status(400).json({ error: "entityType is required" });
      }

      const performance = recordPerformanceImpression(entityId, entityType);
      res.json({ success: true, performance });
    } catch (error) {
      res.status(500).json({ error: "Failed to record impression" });
    }
  });

  app.post("/api/content/performance/:entityId/click", requireAuth, async (req, res) => {
    try {
      const { entityId } = req.params;
      const { entityType } = req.body;

      if (!entityType || typeof entityType !== "string") {
        return res.status(400).json({ error: "entityType is required" });
      }

      const performance = recordPerformanceClick(entityId, entityType);
      res.json({ success: true, performance });
    } catch (error) {
      res.status(500).json({ error: "Failed to record click" });
    }
  });

  app.get("/api/content/performance/:entityId/rewrite-check", requireAuth, async (req, res) => {
    try {
      const { entityId } = req.params;
      const decision = getRewriteDecision(entityId);
      res.json({
        entityId,
        allowed: decision.allowed,
        reason: decision.reason,
        performance: decision.performance
          ? {
              score: decision.performance.score,
              ctr: decision.performance.ctr,
              impressions: decision.performance.impressions,
              clicks: decision.performance.clicks,
            }
          : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check rewrite eligibility" });
    }
  });

  // ============================================================================
  // Entity Metrics (Public endpoint)
  // ============================================================================

  app.get("/api/content/entity-metrics/:entityId", async (req, res) => {
    try {
      const { entityId } = req.params;
      const performance = getPerformance(entityId);
      const score = getPerformanceScore(entityId);
      const rewriteDecision = getRewriteDecision(entityId);

      if (!performance) {
        return res.json({
          entityId,
          entityType: null,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          score: 0,
          rewriteAllowed: true,
          rewriteReason: "No performance data recorded for this entity",
          message: "No metrics recorded",
        });
      }

      res.json({
        entityId,
        entityType: performance.entityType,
        impressions: performance.impressions,
        clicks: performance.clicks,
        ctr: performance.ctr,
        score,
        rewriteAllowed: rewriteDecision.allowed,
        rewriteReason: rewriteDecision.reason,
        lastUpdated: performance.lastUpdated.toISOString(),
        createdAt: performance.createdAt.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entity metrics" });
    }
  });
}
