/**
 * Content Confidence API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import { getContentConfidence, calculateConfidence, getLowConfidenceContent } from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_CONFIDENCE === "true";
}

export function registerContentConfidenceRoutes(app: Express): void {
  // Get confidence score for content
  app.get(
    "/api/admin/content/:id/confidence",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res
          .status(503)
          .json({ error: "Feature disabled", flag: "ENABLE_CONTENT_CONFIDENCE" });
      }

      try {
        const result = await getContentConfidence(req.params.id);
        if (!result) {
          return res.status(404).json({ error: "Content not found" });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch confidence score" });
      }
    }
  );

  // Recalculate confidence score
  app.post(
    "/api/admin/content/:id/confidence/recalculate",
    requirePermission("canEdit"),
    async (req, res) => {
      if (!isEnabled()) {
        return res
          .status(503)
          .json({ error: "Feature disabled", flag: "ENABLE_CONTENT_CONFIDENCE" });
      }

      try {
        const result = await calculateConfidence(req.params.id);
        if (!result) {
          return res.status(404).json({ error: "Content not found" });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to calculate confidence" });
      }
    }
  );

  // Get all low confidence content
  app.get(
    "/api/admin/content/low-confidence",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res
          .status(503)
          .json({ error: "Feature disabled", flag: "ENABLE_CONTENT_CONFIDENCE" });
      }

      try {
        const { limit } = req.query;
        const results = await getLowConfidenceContent(parseInt(limit as string) || 50);
        res.json({ items: results, total: results.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch low confidence content" });
      }
    }
  );
}
