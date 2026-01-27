/**
 * Admin Intelligence API Routes
 *
 * Read-only endpoints for admin intelligence dashboard.
 *
 * PHASE 17: Admin Intelligence & Visibility Layer
 */

import type { Express, Request, Response } from "express";
import { requireAuth, requirePermission } from "../security";
import {
  generateIntelligenceSnapshot,
  evaluateContentCoverage,
  evaluateAllContentCoverage,
  isIntelligenceEnabled,
  type ContentCoverageMetrics,
} from "./intelligence-snapshot";
import {
  getContentHealthScore,
  getSearchHealthScore,
  getAIHealthScore,
  getBlockingIssues,
} from "./intelligence-scorers";

/**
 * Register admin intelligence routes
 */
export function registerAdminIntelligenceRoutes(app: Express) {
  /**
   * GET /api/admin/intelligence-snapshot
   *
   * Returns full intelligence snapshot with all system health metrics.
   * Cached for speed, timeout-protected.
   */
  app.get("/api/admin/intelligence-snapshot", requireAuth, async (req: Request, res: Response) => {
    try {
      const snapshot = await generateIntelligenceSnapshot();
      res.json(snapshot);
    } catch (error) {
      res.status(500).json({
        error: "Failed to generate intelligence snapshot",
        generatedAt: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/admin/intelligence/scores
   *
   * Returns all health scores in one call.
   */
  app.get("/api/admin/intelligence/scores", requireAuth, async (req: Request, res: Response) => {
    try {
      const [contentHealth, searchHealth, aiHealth] = await Promise.all([
        getContentHealthScore(),
        getSearchHealthScore(),
        getAIHealthScore(),
      ]);

      res.json({
        generatedAt: new Date().toISOString(),
        scores: {
          content: contentHealth,
          search: searchHealth,
          ai: aiHealth,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get health scores" });
    }
  });

  /**
   * GET /api/admin/intelligence/issues
   *
   * Returns top blocking issues that need attention.
   */
  app.get("/api/admin/intelligence/issues", requireAuth, async (req: Request, res: Response) => {
    try {
      const issues = await getBlockingIssues();
      res.json({
        generatedAt: new Date().toISOString(),
        issues,
        count: issues.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get blocking issues" });
    }
  });

  /**
   * GET /api/admin/intelligence/coverage/summary
   *
   * Returns coverage summary for all content.
   */
  app.get(
    "/api/admin/intelligence/coverage/summary",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isIntelligenceEnabled()) {
        return res.json({
          enabled: false,
          message:
            "Intelligence coverage feature is disabled. Set ENABLE_INTELLIGENCE_COVERAGE=true",
        });
      }

      try {
        const batchSize = 100;
        let cursor: string | undefined;
        let totalProcessed = 0;
        let totalScore = 0;
        let withEntities = 0;
        let indexed = 0;
        let withAeo = 0;
        let withLinks = 0;

        // Process in batches to avoid memory issues
        while (true) {
          const { results, nextCursor } = await evaluateAllContentCoverage(batchSize, cursor);

          for (const coverage of results) {
            totalProcessed++;
            totalScore += coverage.coverageScore;
            if (coverage.hasEntities) withEntities++;
            if (coverage.isSearchIndexed) indexed++;
            if (coverage.hasAeoCapsule) withAeo++;
            if (coverage.hasInternalLinks) withLinks++;
          }

          if (!nextCursor) break;
          cursor = nextCursor;

          // Safety limit
          if (totalProcessed > 10000) break;
        }

        const avgScore = totalProcessed > 0 ? Math.round(totalScore / totalProcessed) : 0;

        res.json({
          generatedAt: new Date().toISOString(),
          enabled: true,
          summary: {
            totalEvaluated: totalProcessed,
            averageCoverageScore: avgScore,
            withEntities,
            indexed,
            withAeoCapsule: withAeo,
            withInternalLinks: withLinks,
            percentIndexed: totalProcessed > 0 ? Math.round((indexed / totalProcessed) * 100) : 0,
            percentWithAeo: totalProcessed > 0 ? Math.round((withAeo / totalProcessed) * 100) : 0,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get coverage summary" });
      }
    }
  );

  /**
   * GET /api/admin/intelligence/coverage/content/:id
   *
   * Returns coverage metrics for a specific content item.
   */
  app.get(
    "/api/admin/intelligence/coverage/content/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      const { id } = req.params;

      if (!isIntelligenceEnabled()) {
        return res.json({
          enabled: false,
          message: "Intelligence coverage feature is disabled",
        });
      }

      try {
        const coverage = await evaluateContentCoverage(id);

        if (!coverage) {
          return res.status(404).json({ error: "Content not found" });
        }

        res.json({
          enabled: true,
          coverage,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get content coverage" });
      }
    }
  );

  /**
   * GET /api/admin/intelligence/dashboard
   *
   * Returns combined dashboard data for the frontend.
   */
  app.get("/api/admin/intelligence/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const [snapshot, contentHealth, searchHealth, aiHealth, issues] = await Promise.all([
        generateIntelligenceSnapshot(),
        getContentHealthScore(),
        getSearchHealthScore(),
        getAIHealthScore(),
        getBlockingIssues(),
      ]);

      res.json({
        generatedAt: new Date().toISOString(),
        featureEnabled: isIntelligenceEnabled(),
        snapshot,
        scores: {
          content: contentHealth,
          search: searchHealth,
          ai: aiHealth,
        },
        issues,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard data" });
    }
  });
}
