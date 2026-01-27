/**
 * Internal Competition Detector Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  analyzeCompetition,
  getCachedAnalysis,
  getCompetitionStats,
  getHighPriorityPairs,
  resolvePair,
  createCluster,
  getClusters,
} from "./detector";
import { isInternalCompetitionEnabled, SEVERITY_THRESHOLDS } from "./types";

export function registerInternalCompetitionRoutes(app: Express): void {
  // Analyze content for internal competition
  app.get(
    "/api/admin/competition/analyze/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isInternalCompetitionEnabled()) {
        return res.json({ enabled: false, message: "Internal competition detection disabled" });
      }

      try {
        const analysis = await analyzeCompetition(req.params.contentId);
        res.json({ enabled: true, ...analysis });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Analysis failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // Get cached analysis
  app.get(
    "/api/admin/competition/cached/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      const cached = getCachedAnalysis(req.params.contentId);
      if (cached) {
        res.json({ cached: true, ...cached });
      } else {
        res.json({ cached: false, message: "No cached analysis" });
      }
    }
  );

  // Get competition statistics
  app.get("/api/admin/competition/stats", requireAuth, async (req: Request, res: Response) => {
    if (!isInternalCompetitionEnabled()) {
      return res.json({ enabled: false, message: "Internal competition detection disabled" });
    }

    const stats = await getCompetitionStats();
    res.json({
      enabled: true,
      thresholds: SEVERITY_THRESHOLDS,
      ...stats,
    });
  });

  // Get high-priority unresolved pairs
  app.get("/api/admin/competition/priority", requireAuth, async (req: Request, res: Response) => {
    if (!isInternalCompetitionEnabled()) {
      return res.json({ enabled: false, message: "Internal competition detection disabled" });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const pairs = getHighPriorityPairs(limit);

    res.json({
      count: pairs.length,
      pairs,
    });
  });

  // Resolve a competition pair
  app.patch(
    "/api/admin/competition/pair/:pairId/resolve",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isInternalCompetitionEnabled()) {
        return res.json({ enabled: false, message: "Internal competition detection disabled" });
      }

      const { resolution } = req.body;
      const validResolutions = ["merge", "differentiate", "redirect", "delete", "no_action"];

      if (!validResolutions.includes(resolution)) {
        return res
          .status(400)
          .json({ error: "Invalid resolution. Must be: " + validResolutions.join(", ") });
      }

      const userId = (req as Request & { user?: { id: string } }).user?.id;
      const pair = resolvePair(req.params.pairId, resolution, userId);

      if (!pair) {
        return res.status(404).json({ error: "Competition pair not found" });
      }

      res.json({ success: true, pair });
    }
  );

  // Get all clusters
  app.get("/api/admin/competition/clusters", requireAuth, async (req: Request, res: Response) => {
    if (!isInternalCompetitionEnabled()) {
      return res.json({ enabled: false, message: "Internal competition detection disabled" });
    }

    const clusters = getClusters();
    res.json({ count: clusters.length, clusters });
  });

  // Create a competition cluster
  app.post("/api/admin/competition/clusters", requireAuth, async (req: Request, res: Response) => {
    if (!isInternalCompetitionEnabled()) {
      return res.json({ enabled: false, message: "Internal competition detection disabled" });
    }

    const { name, description, contentIds, sharedKeywords, sharedTopics } = req.body;

    if (!name || !contentIds || !Array.isArray(contentIds)) {
      return res.status(400).json({ error: "name and contentIds array required" });
    }

    const cluster = createCluster(
      name,
      description || "",
      contentIds,
      sharedKeywords || [],
      sharedTopics || []
    );

    res.json({ success: true, cluster });
  });
}
