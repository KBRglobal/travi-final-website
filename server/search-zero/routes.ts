/**
 * Search Zero-Result Intelligence API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import { getZeroClusters, getCluster, createTaskFromCluster, getZeroResultStats } from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_ZERO_SEARCH_INTEL === "true";
}

export function registerSearchZeroRoutes(app: Express): void {
  // Get zero-result clusters
  app.get("/api/admin/search/zero", requirePermission("canViewAnalytics"), async (req, res) => {
    if (!isEnabled()) {
      return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_ZERO_SEARCH_INTEL" });
    }

    try {
      const { limit } = req.query;
      const stats = await getZeroResultStats();
      const clusters = await getZeroClusters(parseInt(limit as string) || 50);

      res.json({
        ...stats,
        clusters,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch zero-result data" });
    }
  });

  // Get specific cluster
  app.get(
    "/api/admin/search/zero/:clusterId",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res
          .status(503)
          .json({ error: "Feature disabled", flag: "ENABLE_ZERO_SEARCH_INTEL" });
      }

      try {
        const cluster = await getCluster(req.params.clusterId);
        if (!cluster) {
          return res.status(404).json({ error: "Cluster not found" });
        }
        res.json(cluster);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch cluster" });
      }
    }
  );

  // Create content task from cluster
  app.post(
    "/api/admin/search/zero/:clusterId/create-task",
    requirePermission("canCreate"),
    async (req, res) => {
      if (!isEnabled()) {
        return res
          .status(503)
          .json({ error: "Feature disabled", flag: "ENABLE_ZERO_SEARCH_INTEL" });
      }

      try {
        const result = await createTaskFromCluster(req.params.clusterId);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to create task" });
      }
    }
  );
}
