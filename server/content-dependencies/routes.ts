/**
 * Content Dependencies API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import { getDependencies, getDependents, analyzeImpact, addDependency, removeDependency } from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_DEPENDENCIES === "true";
}

export function registerContentDependencyRoutes(app: Express): void {
  // Get dependencies of a content piece
  app.get(
    "/api/admin/content/:id/dependencies",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_DEPENDENCIES" });
      }

      try {
        const dependencies = await getDependencies(req.params.id);
        const dependents = await getDependents(req.params.id);

        res.json({
          contentId: req.params.id,
          dependsOn: dependencies,
          dependedOnBy: dependents,
        });
      } catch (error) {
        console.error("[ContentDependencies] Error:", error);
        res.status(500).json({ error: "Failed to fetch dependencies" });
      }
    }
  );

  // Get impacted content when this content changes
  app.get(
    "/api/admin/content/:id/impacted",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_DEPENDENCIES" });
      }

      try {
        const maxDepth = parseInt(req.query.maxDepth as string) || 3;
        const impact = await analyzeImpact(req.params.id, Math.min(maxDepth, 5));

        res.json(impact);
      } catch (error) {
        console.error("[ContentDependencies] Error:", error);
        res.status(500).json({ error: "Failed to analyze impact" });
      }
    }
  );

  // Add dependency
  app.post(
    "/api/admin/content/:id/dependencies",
    requirePermission("canEdit"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_DEPENDENCIES" });
      }

      try {
        const { targetId, dependencyType, weight } = req.body;
        if (!targetId) {
          return res.status(400).json({ error: "targetId required" });
        }

        await addDependency(req.params.id, targetId, dependencyType, weight);
        res.json({ success: true });
      } catch (error) {
        console.error("[ContentDependencies] Error:", error);
        res.status(500).json({ error: "Failed to add dependency" });
      }
    }
  );

  // Remove dependency
  app.delete(
    "/api/admin/content/:id/dependencies/:targetId",
    requirePermission("canEdit"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_DEPENDENCIES" });
      }

      try {
        await removeDependency(req.params.id, req.params.targetId);
        res.json({ success: true });
      } catch (error) {
        console.error("[ContentDependencies] Error:", error);
        res.status(500).json({ error: "Failed to remove dependency" });
      }
    }
  );

  console.log("[ContentDependencies] Routes registered");
}
