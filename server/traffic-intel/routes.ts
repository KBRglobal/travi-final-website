/**
 * Traffic Intelligence - Admin API Routes
 *
 * GET /api/admin/traffic/summary
 * GET /api/admin/traffic/content/:id
 * GET /api/admin/traffic/ai-visibility
 *
 * Feature-flagged: ENABLE_TRAFFIC_INTELLIGENCE
 */

import { Router, Request, Response, NextFunction } from "express";
import { getAttributionStore } from "./attribution";
import { getAIVisibilityTracker } from "./ai-visibility";
import type { TrafficSummary, ContentTrafficStats, TrafficChannel } from "./types";

// Check if feature is enabled
function isEnabled(): boolean {
  return process.env.ENABLE_TRAFFIC_INTELLIGENCE === "true";
}

// Check if AI visibility tracking is enabled
function isAIVisibilityEnabled(): boolean {
  return process.env.ENABLE_AI_VISIBILITY_TRACKING === "true";
}

// Feature flag middleware
function requireEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isEnabled()) {
    res.status(404).json({ error: "Traffic intelligence feature is disabled" });
    return;
  }
  next();
}

// Require AI visibility feature
function requireAIVisibility(req: Request, res: Response, next: NextFunction): void {
  if (!isAIVisibilityEnabled()) {
    res.status(404).json({ error: "AI visibility tracking is disabled" });
    return;
  }
  next();
}

/**
 * Create traffic intelligence admin router
 */
export function createTrafficIntelRouter(): Router {
  const router = Router();

  /**
   * GET /api/admin/traffic/summary
   * Returns overall traffic summary
   */
  router.get("/summary", requireEnabled, (req: Request, res: Response) => {
    try {
      const store = getAttributionStore();
      const summary = store.getSummary();
      const allData = store.getAggregatedData();

      // Calculate date range from data
      const dates = allData.map(d => d.date).sort();
      const period = {
        start: dates[0] || new Date().toISOString().split("T")[0],
        end: dates[dates.length - 1] || new Date().toISOString().split("T")[0],
      };

      // Calculate unique visitors (approximate)
      const uniqueVisitors = allData.reduce((sum, d) => sum + d.uniqueVisitors, 0);

      // Get top sources
      const sourceMap = new Map<string, number>();
      for (const attr of allData) {
        const current = sourceMap.get(attr.source) || 0;
        sourceMap.set(attr.source, current + attr.visits);
      }
      const topSources = Array.from(sourceMap.entries())
        .map(([source, visits]) => ({ source, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      // Get top content
      const contentMap = new Map<string, number>();
      for (const attr of allData) {
        const current = contentMap.get(attr.contentId) || 0;
        contentMap.set(attr.contentId, current + attr.visits);
      }
      const topContent = Array.from(contentMap.entries())
        .map(([contentId, visits]) => ({ contentId, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      // Calculate AI search percentage
      const aiSearchVisits = summary.channelBreakdown.ai_search || 0;
      const aiSearchPercentage =
        summary.totalVisits > 0
          ? Number(((aiSearchVisits / summary.totalVisits) * 100).toFixed(2))
          : 0;

      const result: TrafficSummary = {
        period,
        totalVisits: summary.totalVisits,
        uniqueVisitors,
        channelBreakdown: summary.channelBreakdown,
        topSources,
        aiSearchPercentage,
        topContent,
      };

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get traffic summary" });
    }
  });

  /**
   * GET /api/admin/traffic/content/:id
   * Returns traffic stats for specific content
   */
  router.get("/content/:id", requireEnabled, (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "Content ID is required" });
        return;
      }

      const store = getAttributionStore();
      const contentData = store.getContentStats(id);

      if (contentData.length === 0) {
        res.status(404).json({ error: "No traffic data found for content" });
        return;
      }

      // Aggregate stats
      let totalVisits = 0;
      let uniqueVisitors = 0;
      const channelBreakdown: Record<TrafficChannel, number> = {
        organic_search: 0,
        ai_search: 0,
        referral: 0,
        social: 0,
        direct: 0,
        email: 0,
        paid: 0,
        unknown: 0,
      };
      const sourceMap = new Map<string, number>();
      const dailyMap = new Map<string, number>();

      for (const attr of contentData) {
        totalVisits += attr.visits;
        uniqueVisitors += attr.uniqueVisitors;
        channelBreakdown[attr.channel] += attr.visits;

        const current = sourceMap.get(attr.source) || 0;
        sourceMap.set(attr.source, current + attr.visits);

        const dailyCurrent = dailyMap.get(attr.date) || 0;
        dailyMap.set(attr.date, dailyCurrent + attr.visits);
      }

      const sourceBreakdown = Array.from(sourceMap.entries())
        .map(([source, visits]) => ({ source, visits }))
        .sort((a, b) => b.visits - a.visits);

      const dailyTrend = Array.from(dailyMap.entries())
        .map(([date, visits]) => ({ date, visits }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Get AI visibility if enabled
      let aiVisibility = undefined;
      if (isAIVisibilityEnabled()) {
        const tracker = getAIVisibilityTracker();
        aiVisibility = tracker.getMetrics(id);
      }

      const result: ContentTrafficStats = {
        contentId: id,
        totalVisits,
        uniqueVisitors,
        channelBreakdown,
        sourceBreakdown,
        aiVisibility: aiVisibility || {
          contentId: id,
          totalAIVisits: channelBreakdown.ai_search,
          totalClassicVisits: channelBreakdown.organic_search,
          aiVisibilityScore: 0,
          aiToClassicRatio: 0,
          platformBreakdown: {
            chatgpt: 0,
            perplexity: 0,
            gemini: 0,
            claude: 0,
            bing_chat: 0,
            google_aio: 0,
            other_ai: 0,
          },
          trendDirection: "stable",
          lastUpdated: new Date(),
        },
        dailyTrend,
      };

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get content traffic stats" });
    }
  });

  /**
   * GET /api/admin/traffic/ai-visibility
   * Returns AI visibility metrics across all content
   */
  router.get(
    "/ai-visibility",
    requireEnabled,
    requireAIVisibility,
    (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const tracker = getAIVisibilityTracker();

        const overallStats = tracker.getOverallStats();
        const topContent = tracker.getTopByAIVisibility(limit);

        res.json({
          overall: overallStats,
          topContent,
          totalTracked: tracker.size(),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get AI visibility data" });
      }
    }
  );

  /**
   * GET /api/admin/traffic/status
   * Returns feature status
   */
  router.get("/status", (req: Request, res: Response) => {
    const store = getAttributionStore();
    const tracker = getAIVisibilityTracker();

    res.json({
      trafficIntelligenceEnabled: isEnabled(),
      aiVisibilityEnabled: isAIVisibilityEnabled(),
      storeActive: store.isActive(),
      storeEntries: store.getSummary().totalEntries,
      aiTrackerEntries: tracker.size(),
    });
  });

  return router;
}

export default createTrafficIntelRouter;
