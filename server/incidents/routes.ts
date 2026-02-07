/**
 * SLA/Incidents + Alerting System - Admin Routes
 * Feature Flag: ENABLE_INCIDENTS=true
 */

import { Router, Request, Response, NextFunction } from "express";
import { createLogger } from "../lib/logger";
import { isIncidentsEnabled } from "./config";
import {
  listIncidents,
  getIncident,
  ackIncident,
  closeIncident,
  getSummary,
  getStatus,
  raiseManualIncident,
} from "./service";
import type { IncidentStatus, IncidentSeverity, IncidentSource } from "./types";

const logger = createLogger("incidents-routes");
const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireIncidentsEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isIncidentsEnabled()) {
    res.status(404).json({
      error: "Incidents feature is not enabled",
      hint: "Set ENABLE_INCIDENTS=true to enable this feature",
    });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin/incidents
 * List incidents with optional filters
 */
router.get("/", requireIncidentsEnabled, (req: Request, res: Response) => {
  try {
    const { status, severity, source, limit, offset } = req.query;

    const incidents = listIncidents({
      status: status as IncidentStatus | undefined,
      severity: severity as IncidentSeverity | undefined,
      source: source as IncidentSource | undefined,
      limit: limit ? Number.parseInt(limit as string, 10) : undefined,
      offset: offset ? Number.parseInt(offset as string, 10) : undefined,
    });

    res.json({ incidents, total: incidents.length });
  } catch (error) {
    logger.error({ error }, "Failed to list incidents");
    res.status(500).json({ error: "Failed to list incidents" });
  }
});

/**
 * GET /api/admin/incidents/summary
 * Get incident summary statistics
 */
router.get("/summary", requireIncidentsEnabled, (req: Request, res: Response) => {
  try {
    const summary = getSummary();
    res.json(summary);
  } catch (error) {
    logger.error({ error }, "Failed to get incident summary");
    res.status(500).json({ error: "Failed to get incident summary" });
  }
});

/**
 * GET /api/admin/incidents/status
 * Get incidents feature status
 */
router.get("/status", requireIncidentsEnabled, (req: Request, res: Response) => {
  try {
    const status = getStatus();
    res.json(status);
  } catch (error) {
    logger.error({ error }, "Failed to get incidents status");
    res.status(500).json({ error: "Failed to get incidents status" });
  }
});

/**
 * GET /api/admin/incidents/:id
 * Get a specific incident
 */
router.get("/:id", requireIncidentsEnabled, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const incident = getIncident(id);

    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    res.json(incident);
  } catch (error) {
    logger.error({ error, incidentId: req.params.id }, "Failed to get incident");
    res.status(500).json({ error: "Failed to get incident" });
  }
});

/**
 * POST /api/admin/incidents/:id/ack
 * Acknowledge an incident
 */
router.post("/:id/ack", requireIncidentsEnabled, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.body.actorId || "admin";

    const incident = ackIncident(id, actorId);

    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    res.json(incident);
  } catch (error) {
    logger.error({ error, incidentId: req.params.id }, "Failed to acknowledge incident");
    res.status(500).json({ error: "Failed to acknowledge incident" });
  }
});

/**
 * POST /api/admin/incidents/:id/resolve
 * Resolve an incident
 */
router.post("/:id/resolve", requireIncidentsEnabled, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorId = "admin", notes } = req.body;

    const incident = closeIncident(id, actorId, notes);

    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    res.json(incident);
  } catch (error) {
    logger.error({ error, incidentId: req.params.id }, "Failed to resolve incident");
    res.status(500).json({ error: "Failed to resolve incident" });
  }
});

/**
 * POST /api/admin/incidents
 * Create a manual incident
 */
router.post("/", requireIncidentsEnabled, (req: Request, res: Response) => {
  try {
    const { severity, title, description, metadata } = req.body;

    if (!severity || !title || !description) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["severity", "title", "description"],
      });
      return;
    }

    const incident = raiseManualIncident({
      severity,
      title,
      description,
      metadata,
    });

    res.status(201).json(incident);
  } catch (error) {
    logger.error({ error }, "Failed to create manual incident");
    res.status(500).json({ error: "Failed to create incident" });
  }
});

export default router;
