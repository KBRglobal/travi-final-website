/**
 * Publishing Eligibility Admin Routes
 *
 * Admin endpoints for publishing visibility and control.
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../../security";
import { evaluateEligibility } from "./engine";
import { checkPublishGuard } from "./guard";
import { getBlockedContent, getPublishedWithIssues, getEligibilityStats } from "./repository";
import {
  isPublishGuardsEnabled,
  isAeoRequired,
  isEntityRequired,
  isIntelligenceCoverageRequired,
} from "./types";

/**
 * Register publishing eligibility routes
 */
export function registerPublishingRoutes(app: Express): void {
  /**
   * GET /api/admin/publishing/eligibility/:contentId
   * Get eligibility status for a specific content
   */
  app.get("/api/admin/publishing/eligibility/:contentId", requireAuth, async (req: Request, res: Response) => {
    const { contentId } = req.params;

    try {
      const eligibility = await evaluateEligibility(contentId);
      const guard = await checkPublishGuard(contentId);

      res.json({
        contentId,
        eligibility,
        guard: {
          allowed: guard.allowed,
          action: guard.action,
        },
        flags: {
          publishGuardsEnabled: isPublishGuardsEnabled(),
          aeoRequired: isAeoRequired(),
          entityRequired: isEntityRequired(),
          intelligenceCoverageRequired: isIntelligenceCoverageRequired(),
        },
      });
    } catch (error) {
      console.error('[Publishing] Error getting eligibility:', error);
      res.status(500).json({ error: 'Failed to evaluate eligibility' });
    }
  });

  /**
   * GET /api/admin/publishing/blocked
   * Get all blocked content
   */
  app.get("/api/admin/publishing/blocked", requireAuth, async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    try {
      const blocked = await getBlockedContent(limit);

      res.json({
        items: blocked,
        count: blocked.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Publishing] Error getting blocked content:', error);
      res.status(500).json({ error: 'Failed to get blocked content' });
    }
  });

  /**
   * GET /api/admin/publishing/issues
   * Get published content with quality issues
   */
  app.get("/api/admin/publishing/issues", requireAuth, async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    try {
      const issues = await getPublishedWithIssues(limit);

      res.json({
        items: issues,
        count: issues.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Publishing] Error getting issues:', error);
      res.status(500).json({ error: 'Failed to get content issues' });
    }
  });

  /**
   * GET /api/admin/publishing/stats
   * Get eligibility statistics
   */
  app.get("/api/admin/publishing/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await getEligibilityStats();

      res.json({
        ...stats,
        flags: {
          publishGuardsEnabled: isPublishGuardsEnabled(),
          aeoRequired: isAeoRequired(),
          entityRequired: isEntityRequired(),
          intelligenceCoverageRequired: isIntelligenceCoverageRequired(),
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Publishing] Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  /**
   * POST /api/admin/publishing/check/:contentId
   * Explicitly check if content can be published
   */
  app.post("/api/admin/publishing/check/:contentId", requireAuth, async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const { forcePublish } = req.body;

    try {
      const guard = await checkPublishGuard(contentId, { forcePublish });

      res.json({
        contentId,
        canPublish: guard.allowed,
        action: guard.action,
        eligibility: guard.eligibility,
      });
    } catch (error) {
      console.error('[Publishing] Error checking publish:', error);
      res.status(500).json({ error: 'Failed to check publish eligibility' });
    }
  });

  console.log('[Publishing] Eligibility routes registered');
}
