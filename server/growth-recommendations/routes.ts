/**
 * Growth Recommendations API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import {
  getRecommendations,
  getGrowthSummary,
  generateRecommendations,
  updateRecommendationStatus,
  type RecommendationType,
} from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_GROWTH_RECOMMENDATIONS === "true";
}

export function registerGrowthRecommendationRoutes(app: Express): void {
  // Get recommendations
  app.get(
    "/api/admin/growth/recommendations",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_GROWTH_RECOMMENDATIONS" });
      }

      try {
        const { limit, status, type } = req.query;
        const recommendations = await getRecommendations({
          limit: parseInt(limit as string) || 50,
          status: status as string,
          type: type as RecommendationType,
        });
        res.json({ items: recommendations, total: recommendations.length });
      } catch (error) {
        console.error("[GrowthRecommendations] Error:", error);
        res.status(500).json({ error: "Failed to fetch recommendations" });
      }
    }
  );

  // Get growth summary
  app.get(
    "/api/admin/growth/summary",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_GROWTH_RECOMMENDATIONS" });
      }

      try {
        const summary = await getGrowthSummary();
        res.json(summary);
      } catch (error) {
        console.error("[GrowthRecommendations] Error:", error);
        res.status(500).json({ error: "Failed to fetch summary" });
      }
    }
  );

  // Generate new recommendations
  app.post(
    "/api/admin/growth/recommendations/generate",
    requirePermission("canManageSettings"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_GROWTH_RECOMMENDATIONS" });
      }

      try {
        const recommendations = await generateRecommendations();
        res.json({ generated: recommendations.length, items: recommendations });
      } catch (error) {
        console.error("[GrowthRecommendations] Error:", error);
        res.status(500).json({ error: "Failed to generate recommendations" });
      }
    }
  );

  // Update recommendation status
  app.patch(
    "/api/admin/growth/recommendations/:id",
    requirePermission("canEdit"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_GROWTH_RECOMMENDATIONS" });
      }

      try {
        const { status } = req.body;
        if (!["pending", "in_progress", "completed", "dismissed"].includes(status)) {
          return res.status(400).json({ error: "Invalid status" });
        }

        const updated = await updateRecommendationStatus(req.params.id, status);
        if (!updated) {
          return res.status(404).json({ error: "Recommendation not found" });
        }
        res.json({ success: true });
      } catch (error) {
        console.error("[GrowthRecommendations] Error:", error);
        res.status(500).json({ error: "Failed to update recommendation" });
      }
    }
  );

  console.log("[GrowthRecommendations] Routes registered");
}
