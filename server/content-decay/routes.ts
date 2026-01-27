/**
 * Content Decay API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import { getDecayingContent, getContentDecay, calculateDecay } from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_DECAY === "true";
}

export function registerContentDecayRoutes(app: Express): void {
  // Get all decaying content
  app.get("/api/admin/content/decay", requirePermission("canViewAnalytics"), async (req, res) => {
    if (!isEnabled()) {
      return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_DECAY" });
    }

    try {
      const { status, limit } = req.query;
      const results = await getDecayingContent(
        status as "stable" | "decaying" | "critical" | undefined,
        parseInt(limit as string) || 50
      );
      res.json({ items: results, total: results.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch decaying content" });
    }
  });

  // Get decay for specific content
  app.get(
    "/api/admin/content/:id/decay",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_DECAY" });
      }

      try {
        const result = await getContentDecay(req.params.id);
        if (!result) {
          return res.status(404).json({ error: "Content not found" });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch decay info" });
      }
    }
  );

  // Recalculate decay for specific content
  app.post(
    "/api/admin/content/:id/decay/recalculate",
    requirePermission("canEdit"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_DECAY" });
      }

      try {
        const result = await calculateDecay(req.params.id);
        if (!result) {
          return res.status(404).json({ error: "Content not found" });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to recalculate decay" });
      }
    }
  );
}
