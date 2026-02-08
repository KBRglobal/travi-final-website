/**
 * Analytics Routes
 * Content analytics endpoints for admin/editor users
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requirePermission, rateLimiters, validateAnalyticsRequest } from "../security";

export function registerAnalyticsRoutes(app: Express): void {
  // Analytics Routes (admin/editor only)
  app.get("/api/analytics/overview", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const overview = await storage.getAnalyticsOverview();
      res.json(overview);
    } catch {
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  });

  app.get(
    "/api/analytics/views-over-time",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const days = Number.parseInt(req.query.days as string) || 30;
        const views = await storage.getViewsOverTime(Math.min(days, 90));
        res.json(views);
      } catch {
        res.status(500).json({ error: "Failed to fetch views over time" });
      }
    }
  );

  app.get("/api/analytics/top-content", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const limit = Number.parseInt(req.query.limit as string) || 10;
      const topContent = await storage.getTopContent(Math.min(limit, 50));
      res.json(topContent);
    } catch {
      res.status(500).json({ error: "Failed to fetch top content" });
    }
  });

  app.get(
    "/api/analytics/by-content-type",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const byType = await storage.getViewsByContentType();
        res.json(byType);
      } catch {
        res.status(500).json({ error: "Failed to fetch views by content type" });
      }
    }
  );

  app.post(
    "/api/analytics/record-view/:contentId",
    rateLimiters.analytics,
    validateAnalyticsRequest,
    async (req, res) => {
      try {
        const { contentId } = req.params;
        await storage.recordContentView(contentId, {
          userAgent: req.headers["user-agent"],
          referrer: req.headers.referer,
          sessionId: req.sessionID,
        });
        res.json({ success: true });
      } catch {
        res.json({ success: true });
      }
    }
  );
}
