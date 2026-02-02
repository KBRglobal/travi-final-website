/**
 * Analytics Routes
 * Content analytics endpoints for admin/editor users
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requirePermission, rateLimiters, validateAnalyticsRequest } from "../security";

export function registerAnalyticsRoutes(app: Express): void {
  // Analytics Routes (admin/editor only)
  app.get("/api/analytics/overview", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const overview = await storage.getAnalyticsOverview();
      res.json(overview);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  });

  app.get(
    "/api/analytics/views-over-time",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const days = parseInt(req.query.days as string) || 30;
        const views = await storage.getViewsOverTime(Math.min(days, 90));
        res.json(views);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch views over time" });
      }
    }
  );

  app.get("/api/analytics/top-content", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topContent = await storage.getTopContent(Math.min(limit, 50));
      res.json(topContent);
    } catch (error) {
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
      } catch (error) {
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
      } catch (error) {
        res.json({ success: true });
      }
    }
  );
}
