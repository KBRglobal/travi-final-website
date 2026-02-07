/**
 * Go-Live Timeline & Forensics - API Routes
 * Feature Flag: ENABLE_GO_LIVE_FORENSICS=false
 */

import { Router, Request, Response, NextFunction } from "express";
import { isGoLiveForensicsEnabled, FORENSICS_CONFIG } from "./config";
import {
  recordEvent,
  queryTimeline,
  getEventById,
  getEventsByCorrelation,
  getRecentEvents,
  getSummary,
  getStatus,
  exportEvents,
  pruneOldEvents,
} from "./timeline";
import type { ForensicsEventType, EventSeverity, TimelineQuery } from "./types";

const router = Router();

// Feature flag middleware
function requireEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isGoLiveForensicsEnabled()) {
    res.status(503).json({ error: "Go-live forensics is not enabled" });
    return;
  }
  next();
}

// GET /api/ops/forensics/status - Get forensics status
router.get("/status", (req: Request, res: Response) => {
  res.json(getStatus());
});

// GET /api/ops/forensics/config - Get configuration
router.get("/config", (req: Request, res: Response) => {
  res.json({
    enabled: isGoLiveForensicsEnabled(),
    config: FORENSICS_CONFIG,
  });
});

// GET /api/ops/forensics/summary - Get event summary
router.get("/summary", requireEnabled, (req: Request, res: Response) => {
  res.json(getSummary());
});

// GET /api/ops/forensics/events - Query timeline events
router.get("/events", requireEnabled, (req: Request, res: Response) => {
  const query: TimelineQuery = {};

  if (req.query.startTime) {
    query.startTime = new Date(req.query.startTime as string);
  }
  if (req.query.endTime) {
    query.endTime = new Date(req.query.endTime as string);
  }
  if (req.query.types) {
    query.types = (req.query.types as string).split(",") as ForensicsEventType[];
  }
  if (req.query.sources) {
    query.sources = (req.query.sources as string).split(",");
  }
  if (req.query.severities) {
    query.severities = (req.query.severities as string).split(",") as EventSeverity[];
  }
  if (req.query.correlationId) {
    query.correlationId = req.query.correlationId as string;
  }
  if (req.query.actor) {
    query.actor = req.query.actor as string;
  }
  if (req.query.limit) {
    query.limit = Number.parseInt(req.query.limit as string, 10);
  }
  if (req.query.offset) {
    query.offset = Number.parseInt(req.query.offset as string, 10);
  }

  const result = queryTimeline(query);
  res.json(result);
});

// GET /api/ops/forensics/events/recent - Get recent events
router.get("/events/recent", requireEnabled, (req: Request, res: Response) => {
  const limit = Number.parseInt(req.query.limit as string) || 50;
  const events = getRecentEvents(limit);
  res.json({ events, count: events.length });
});

// GET /api/ops/forensics/events/:id - Get single event
router.get("/events/:id", requireEnabled, (req: Request, res: Response) => {
  const event = getEventById(req.params.id);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(event);
});

// GET /api/ops/forensics/correlation/:id - Get correlated events
router.get("/correlation/:id", requireEnabled, (req: Request, res: Response) => {
  const events = getEventsByCorrelation(req.params.id);
  res.json({ events, count: events.length, correlationId: req.params.id });
});

// POST /api/ops/forensics/events - Record manual event
router.post("/events", requireEnabled, (req: Request, res: Response) => {
  const { type, severity, source, title, description, data, actor, correlationId } = req.body;

  if (!type || !severity || !source || !title || !description) {
    res.status(400).json({ error: "type, severity, source, title, and description are required" });
    return;
  }

  const validTypes: ForensicsEventType[] = [
    "decision",
    "approval",
    "override",
    "state_change",
    "degradation",
    "recovery",
    "deployment",
    "rollback",
    "incident",
    "manual",
  ];
  const validSeverities: EventSeverity[] = ["info", "warning", "error", "critical"];

  if (!validTypes.includes(type)) {
    res.status(400).json({ error: "Invalid type" });
    return;
  }
  if (!validSeverities.includes(severity)) {
    res.status(400).json({ error: "Invalid severity" });
    return;
  }

  try {
    const event = recordEvent(type, severity, source, title, description, data || {}, {
      actor,
      correlationId,
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/forensics/export - Export all events
router.get("/export", requireEnabled, (req: Request, res: Response) => {
  const events = exportEvents();
  res.json({
    events,
    count: events.length,
    exportedAt: new Date(),
  });
});

// POST /api/ops/forensics/prune - Prune old events
router.post("/prune", requireEnabled, (req: Request, res: Response) => {
  const pruned = pruneOldEvents();
  res.json({ pruned, remaining: getStatus().totalEvents });
});

export default router;
