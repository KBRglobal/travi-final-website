/**
 * Broken Promise Detector Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import { analyzeContent, getCachedAnalysis, getPromiseStats, bulkAnalyze } from "./detector";
import { isBrokenPromiseDetectorEnabled, PROMISE_PATTERNS } from "./types";

export function registerBrokenPromiseRoutes(app: Express): void {
  // Analyze content for broken promises
  app.get(
    "/api/admin/promises/analyze/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isBrokenPromiseDetectorEnabled()) {
        return res.json({ enabled: false, message: "Broken promise detector disabled" });
      }

      try {
        const analysis = await analyzeContent(req.params.contentId);
        res.json({ enabled: true, ...analysis });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Analysis failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // Get cached analysis
  app.get(
    "/api/admin/promises/cached/:contentId",
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

  // Get promise detection statistics
  app.get("/api/admin/promises/stats", requireAuth, async (req: Request, res: Response) => {
    if (!isBrokenPromiseDetectorEnabled()) {
      return res.json({ enabled: false, message: "Broken promise detector disabled" });
    }

    const stats = await getPromiseStats();
    res.json({ enabled: true, patterns: PROMISE_PATTERNS.length, ...stats });
  });

  // Bulk analyze multiple content items
  app.post("/api/admin/promises/bulk-analyze", requireAuth, async (req: Request, res: Response) => {
    if (!isBrokenPromiseDetectorEnabled()) {
      return res.json({ enabled: false, message: "Broken promise detector disabled" });
    }

    const { contentIds } = req.body;
    if (!Array.isArray(contentIds)) {
      return res.status(400).json({ error: "contentIds must be an array" });
    }

    const results = await bulkAnalyze(contentIds);
    const broken = results.filter(r => r.brokenPromises > 0);

    res.json({
      analyzed: results.length,
      withBrokenPromises: broken.length,
      results,
    });
  });

  // Get available detection patterns
  app.get("/api/admin/promises/patterns", requireAuth, async (req: Request, res: Response) => {
    const patterns = PROMISE_PATTERNS.map(p => ({
      type: p.type,
      description: p.description,
      pattern: p.pattern.source,
    }));
    res.json({ patterns });
  });
}
