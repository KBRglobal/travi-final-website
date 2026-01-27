/**
 * Content Timeline API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import { getContentTimeline, getRecentEvents, type TimelineEventType } from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_TIMELINE === "true";
}

export function registerContentTimelineRoutes(app: Express): void {
  // Get timeline for specific content
  app.get(
    "/api/admin/content/:id/timeline",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_TIMELINE" });
      }

      try {
        const { limit, offset, types, from, to } = req.query;

        const eventTypes = types
          ? ((types as string).split(",") as TimelineEventType[])
          : undefined;

        const timeline = await getContentTimeline(req.params.id, {
          limit: parseInt(limit as string) || 100,
          offset: parseInt(offset as string) || 0,
          eventTypes,
          fromDate: from ? new Date(from as string) : undefined,
          toDate: to ? new Date(to as string) : undefined,
        });

        res.json(timeline);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch timeline" });
      }
    }
  );

  // Get recent events across all content
  app.get("/api/admin/timeline/recent", requirePermission("canViewAnalytics"), async (req, res) => {
    if (!isEnabled()) {
      return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_TIMELINE" });
    }

    try {
      const { limit, types } = req.query;

      const eventTypes = types ? ((types as string).split(",") as TimelineEventType[]) : undefined;

      const events = await getRecentEvents(parseInt(limit as string) || 50, eventTypes);

      res.json({ events });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent events" });
    }
  });
}
