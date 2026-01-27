/**
 * Content Health Admin Routes
 *
 * Admin endpoints for content health visibility and monitoring.
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  getOpenIssues,
  getIssuesForContent,
  getIssuesByType,
  getHealthStats,
  ignoreHealthIssue,
  getTotalIssueCount,
  getOpenIssueCount,
} from "./repository";
import { scanContent, getHealthSummary, getContentWithIssues } from "./scanner";
import { getSchedulerMetrics, triggerScan, isHealthScannerRunning } from "./scheduler";
import { isContentHealthJobsEnabled, type HealthIssueType } from "./types";

/**
 * Register content health routes
 */
export function registerContentHealthRoutes(app: Express): void {
  /**
   * GET /api/admin/content/health/issues
   * Get all open health issues with pagination
   */
  app.get("/api/admin/content/health/issues", requireAuth, async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const issueType = req.query.type as HealthIssueType | undefined;

    try {
      let issues;
      if (issueType) {
        issues = getIssuesByType(issueType).slice(0, limit);
      } else {
        issues = getOpenIssues(limit);
      }

      res.json({
        items: issues,
        count: issues.length,
        total: getOpenIssueCount(),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get health issues" });
    }
  });

  /**
   * GET /api/admin/content/health/stats
   * Get aggregated health statistics
   */
  app.get("/api/admin/content/health/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = getHealthStats();
      const summary = await getHealthSummary();
      const schedulerMetrics = getSchedulerMetrics();

      res.json({
        enabled: isContentHealthJobsEnabled(),
        scanner: {
          isRunning: isHealthScannerRunning(),
          ...schedulerMetrics,
        },
        issues: stats,
        summary,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get health stats" });
    }
  });

  /**
   * GET /api/admin/content/health/:contentId
   * Get health status for a specific content item
   */
  app.get(
    "/api/admin/content/health/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      const { contentId } = req.params;

      try {
        const scan = await scanContent(contentId);
        const issues = getIssuesForContent(contentId);

        if (!scan) {
          return res.status(404).json({ error: "Content not found or deleted" });
        }

        res.json({
          contentId,
          health: scan,
          issues: issues.filter(i => i.status === "open"),
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get content health" });
      }
    }
  );

  /**
   * GET /api/admin/content/health/issues/by-type/:type
   * Get issues filtered by type
   */
  app.get(
    "/api/admin/content/health/issues/by-type/:type",
    requireAuth,
    async (req: Request, res: Response) => {
      const issueType = req.params.type as HealthIssueType;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      try {
        const issues = getIssuesByType(issueType).slice(0, limit);

        res.json({
          issueType,
          items: issues,
          count: issues.length,
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get issues" });
      }
    }
  );

  /**
   * GET /api/admin/content/health/scan
   * Get content with issues (from real-time scan)
   */
  app.get("/api/admin/content/health/scan", requireAuth, async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const issueType = req.query.type as HealthIssueType | undefined;

    try {
      const content = await getContentWithIssues(issueType, limit);

      res.json({
        items: content,
        count: content.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to scan content" });
    }
  });

  /**
   * POST /api/admin/content/health/issues/:issueId/ignore
   * Ignore a health issue
   */
  app.post(
    "/api/admin/content/health/issues/:issueId/ignore",
    requireAuth,
    async (req: Request, res: Response) => {
      const { issueId } = req.params;

      try {
        const success = ignoreHealthIssue(issueId);

        if (!success) {
          return res.status(404).json({ error: "Issue not found" });
        }

        res.json({
          success: true,
          issueId,
          status: "ignored",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to ignore issue" });
      }
    }
  );

  /**
   * POST /api/admin/content/health/scan/trigger
   * Manually trigger a scan batch
   */
  app.post(
    "/api/admin/content/health/scan/trigger",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isContentHealthJobsEnabled()) {
        return res.status(403).json({ error: "Content health jobs are disabled" });
      }

      try {
        const result = await triggerScan();

        res.json({
          success: true,
          result,
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to trigger scan" });
      }
    }
  );
}
