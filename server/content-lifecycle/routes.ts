/**
 * Content Lifecycle Timeline Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  recordEvent,
  getContentLifecycle,
  queryEvents,
  getTimelineStats,
  exportAudit,
  getRecentEvents,
  compareSnapshots,
} from "./service";
import { isLifecycleTimelineEnabled } from "./types";
import type { EventType, EventSource, TimelineFilter } from "./types";

export function registerLifecycleRoutes(app: Express): void {
  // Get content lifecycle
  app.get("/api/admin/lifecycle/:contentId", requireAuth, async (req: Request, res: Response) => {
    if (!isLifecycleTimelineEnabled()) {
      return res.json({ enabled: false, message: "Lifecycle timeline disabled" });
    }

    try {
      const lifecycle = await getContentLifecycle(req.params.contentId);
      res.json({ enabled: true, ...lifecycle });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get lifecycle";
      res.status(500).json({ error: message });
    }
  });

  // Query events with filters
  app.post("/api/admin/lifecycle/events/query", requireAuth, async (req: Request, res: Response) => {
    if (!isLifecycleTimelineEnabled()) {
      return res.json({ enabled: false, message: "Lifecycle timeline disabled" });
    }

    const filter: TimelineFilter = {
      contentId: req.body.contentId,
      types: req.body.types as EventType[],
      sources: req.body.sources as EventSource[],
      userId: req.body.userId,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      limit: req.body.limit || 100,
      offset: req.body.offset || 0,
    };

    const events = await queryEvents(filter);
    res.json({ count: events.length, events });
  });

  // Get recent events
  app.get("/api/admin/lifecycle/events/recent", requireAuth, async (req: Request, res: Response) => {
    if (!isLifecycleTimelineEnabled()) {
      return res.json({ enabled: false, message: "Lifecycle timeline disabled" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const events = await getRecentEvents(limit);

    res.json({ count: events.length, events });
  });

  // Get timeline statistics
  app.get("/api/admin/lifecycle/stats", requireAuth, async (req: Request, res: Response) => {
    if (!isLifecycleTimelineEnabled()) {
      return res.json({ enabled: false, message: "Lifecycle timeline disabled" });
    }

    const stats = await getTimelineStats();
    res.json({ enabled: true, ...stats });
  });

  // Record a custom event
  app.post("/api/admin/lifecycle/:contentId/event", requireAuth, async (req: Request, res: Response) => {
    if (!isLifecycleTimelineEnabled()) {
      return res.json({ enabled: false, message: "Lifecycle timeline disabled" });
    }

    const { type, source, description, metadata } = req.body;

    if (!type || !description) {
      return res.status(400).json({ error: "type and description required" });
    }

    const userId = (req as Request & { user?: { id: string; name?: string } }).user?.id;
    const userName = (req as Request & { user?: { id: string; name?: string } }).user?.name;

    const event = recordEvent(
      req.params.contentId,
      type as EventType,
      (source as EventSource) || 'user',
      description,
      { userId, userName, metadata }
    );

    res.json({ success: true, event });
  });

  // Export audit trail
  app.get("/api/admin/lifecycle/:contentId/export", requireAuth, async (req: Request, res: Response) => {
    if (!isLifecycleTimelineEnabled()) {
      return res.json({ enabled: false, message: "Lifecycle timeline disabled" });
    }

    const format = (req.query.format as 'json' | 'csv') || 'json';
    const userId = (req as Request & { user?: { id: string } }).user?.id || 'unknown';

    try {
      const audit = await exportAudit(req.params.contentId, format, userId);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-${req.params.contentId}.csv"`);
        res.send(audit.data);
      } else {
        res.json(audit);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      res.status(500).json({ error: message });
    }
  });

  // Compare state snapshots
  app.get("/api/admin/lifecycle/:contentId/compare", requireAuth, async (req: Request, res: Response) => {
    if (!isLifecycleTimelineEnabled()) {
      return res.json({ enabled: false, message: "Lifecycle timeline disabled" });
    }

    const version1 = parseInt(req.query.v1 as string);
    const version2 = parseInt(req.query.v2 as string);

    if (isNaN(version1) || isNaN(version2)) {
      return res.status(400).json({ error: "v1 and v2 version numbers required" });
    }

    const comparison = compareSnapshots(req.params.contentId, version1, version2);

    if (!comparison) {
      return res.status(404).json({ error: "One or both versions not found" });
    }

    res.json({ version1, version2, ...comparison });
  });

  // Get available event types and sources
  app.get("/api/admin/lifecycle/meta", requireAuth, async (req: Request, res: Response) => {
    const eventTypes: EventType[] = [
      'created', 'updated', 'published', 'unpublished', 'scheduled', 'archived',
      'deleted', 'restored', 'ownership_changed', 'reviewed', 'approved', 'rejected',
      'ai_generated', 'ai_edited', 'merged', 'split', 'redirected',
      'experiment_started', 'experiment_ended', 'quality_scored',
      'decay_detected', 'competition_detected', 'sla_violated', 'custom',
    ];

    const eventSources: EventSource[] = ['user', 'system', 'ai', 'scheduler', 'automation', 'api'];

    res.json({ eventTypes, eventSources });
  });

  console.log("[Lifecycle] Routes registered");
}
