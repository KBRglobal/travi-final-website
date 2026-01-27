/**
 * Audit Admin Routes
 * Feature flag: ENABLE_AUDIT_LOGS
 */

import { Router } from "express";
import {
  queryAuditLogs,
  getAuditLog,
  getResourceHistory,
  getUserActivity,
  getAuditSummary,
} from "./query-engine";
import * as repo from "./repository";
import { AuditQuery } from "./types";

const router = Router();

function isEnabled(): boolean {
  return process.env.ENABLE_AUDIT_LOGS === "true";
}

// GET /api/admin/audit
router.get("/", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, entries: [], total: 0 });
  }

  try {
    const query: AuditQuery = {
      userId: req.query.userId as string,
      action: req.query.action as any,
      resource: req.query.resource as string,
      resourceId: req.query.resourceId as string,
      source: req.query.source as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await queryAuditLogs(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to query audit logs" });
  }
});

// GET /api/admin/audit/summary
router.get("/summary", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const summary = await getAuditSummary(startDate, endDate);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to get audit summary" });
  }
});

// GET /api/admin/audit/stats
router.get("/stats", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const [storage, distinctValues] = await Promise.all([
      repo.getStorageStats(),
      repo.getDistinctValues(),
    ]);

    res.json({ storage, distinctValues });
  } catch (error) {
    res.status(500).json({ error: "Failed to get audit stats" });
  }
});

// GET /api/admin/audit/:id
router.get("/:id", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Audit logs not enabled" });
  }

  try {
    const entry = await getAuditLog(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "Audit log not found" });
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: "Failed to get audit log" });
  }
});

// GET /api/admin/audit/resource/:type/:id
router.get("/resource/:type/:id", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, entries: [] });
  }

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const entries = await getResourceHistory(req.params.type, req.params.id, limit);
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ error: "Failed to get resource history" });
  }
});

// GET /api/admin/audit/user/:userId
router.get("/user/:userId", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, entries: [] });
  }

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const entries = await getUserActivity(req.params.userId, limit);
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ error: "Failed to get user activity" });
  }
});

// POST /api/admin/audit/verify
router.post("/verify", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Audit logs not enabled" });
  }

  try {
    const limit = req.body.limit || 1000;
    const result = await repo.verifyIntegrity(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to verify integrity" });
  }
});

// POST /api/admin/audit/cleanup
router.post("/cleanup", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Audit logs not enabled" });
  }

  try {
    const retentionDays = req.body.retentionDays || 90;
    const deleted = await repo.cleanupOldLogs(retentionDays);
    res.json({ deleted, message: `Cleaned up ${deleted} old audit logs` });
  } catch (error) {
    res.status(500).json({ error: "Failed to cleanup audit logs" });
  }
});

// GET /api/admin/audit/export
router.get("/export", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Audit logs not enabled" });
  }

  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const json = await repo.exportLogs(startDate, endDate);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.json`);
    res.send(json);
  } catch (error) {
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

export { router as auditRoutes };
