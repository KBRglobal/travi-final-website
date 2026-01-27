/**
 * Knowledge Decay Detection Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  analyzeDecay,
  getCachedAnalysis,
  getDecayStats,
  getContentNeedingAttention,
  updateIndicatorStatus,
} from "./detector";
import { isKnowledgeDecayEnabled, DECAY_PATTERNS, DECAY_THRESHOLDS } from "./types";

export function registerKnowledgeDecayRoutes(app: Express): void {
  // Analyze content for knowledge decay
  app.get(
    "/api/admin/decay/analyze/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isKnowledgeDecayEnabled()) {
        return res.json({ enabled: false, message: "Knowledge decay detection disabled" });
      }

      try {
        const analysis = await analyzeDecay(req.params.contentId);
        res.json({ enabled: true, ...analysis });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Analysis failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // Get cached analysis
  app.get(
    "/api/admin/decay/cached/:contentId",
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

  // Get decay statistics
  app.get("/api/admin/decay/stats", requireAuth, async (req: Request, res: Response) => {
    if (!isKnowledgeDecayEnabled()) {
      return res.json({ enabled: false, message: "Knowledge decay detection disabled" });
    }

    const stats = await getDecayStats();
    res.json({
      enabled: true,
      thresholds: DECAY_THRESHOLDS,
      patternCount: DECAY_PATTERNS.length,
      ...stats,
    });
  });

  // Get content needing attention
  app.get("/api/admin/decay/attention", requireAuth, async (req: Request, res: Response) => {
    if (!isKnowledgeDecayEnabled()) {
      return res.json({ enabled: false, message: "Knowledge decay detection disabled" });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const content = await getContentNeedingAttention(limit);

    res.json({
      count: content.length,
      content,
    });
  });

  // Update decay indicator status
  app.patch(
    "/api/admin/decay/indicator/:indicatorId",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isKnowledgeDecayEnabled()) {
        return res.json({ enabled: false, message: "Knowledge decay detection disabled" });
      }

      const { status } = req.body;
      const validStatuses = ["detected", "reviewed", "fixed", "ignored"];

      if (!validStatuses.includes(status)) {
        return res
          .status(400)
          .json({ error: "Invalid status. Must be: " + validStatuses.join(", ") });
      }

      const userId = (req as Request & { user?: { id: string } }).user?.id;
      updateIndicatorStatus(req.params.indicatorId, status, userId);

      res.json({ success: true, indicatorId: req.params.indicatorId, status });
    }
  );

  // Get available decay patterns
  app.get("/api/admin/decay/patterns", requireAuth, async (req: Request, res: Response) => {
    const patterns = DECAY_PATTERNS.map(p => ({
      type: p.type,
      description: p.description,
      severity: p.severity,
      pattern: p.pattern.source,
    }));
    res.json({ patterns });
  });
}
