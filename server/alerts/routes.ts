import { Router, Request, Response } from "express";
import * as repository from "./alert-repository";
import { getAlertStats, getEngineStatus, isAlertingEnabled } from "./alert-engine";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  if (!isAlertingEnabled()) {
    return res.json({ enabled: false, alerts: [] });
  }

  try {
    const limit = Number.parseInt(req.query.limit as string) || 100;
    const alerts = await repository.getAllAlerts(limit);
    res.json({ enabled: true, alerts });
  } catch {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.get("/active", async (req: Request, res: Response) => {
  if (!isAlertingEnabled()) {
    return res.json({ enabled: false, alerts: [] });
  }

  try {
    const alerts = await repository.getActiveAlerts();
    res.json({ enabled: true, alerts });
  } catch {
    res.status(500).json({ error: "Failed to fetch active alerts" });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  if (!isAlertingEnabled()) {
    return res.json({ enabled: false, stats: null, engine: getEngineStatus() });
  }

  try {
    const stats = await getAlertStats();
    const engine = getEngineStatus();
    res.json({ enabled: true, stats, engine });
  } catch {
    res.status(500).json({ error: "Failed to fetch alert stats" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  if (!isAlertingEnabled()) {
    return res.status(404).json({ error: "Alerting system not enabled" });
  }

  try {
    const alert = await repository.getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json(alert);
  } catch {
    res.status(500).json({ error: "Failed to fetch alert" });
  }
});

router.post("/:id/resolve", async (req: Request, res: Response) => {
  if (!isAlertingEnabled()) {
    return res.status(404).json({ error: "Alerting system not enabled" });
  }

  try {
    const resolved = await repository.resolveAlert(req.params.id);
    if (!resolved) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json({ success: true, message: "Alert resolved" });
  } catch {
    res.status(500).json({ error: "Failed to resolve alert" });
  }
});

export default router;
