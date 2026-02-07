/**
 * Production Cutover Engine - API Routes
 * Feature Flag: ENABLE_PRODUCTION_CUTOVER=false
 */

import { Router, Request, Response, NextFunction } from "express";
import { isProductionCutoverEnabled, CUTOVER_CONFIG } from "./config";
import {
  evaluateCutover,
  dryRun,
  createApproval,
  createOverride,
  clearOverride,
  getActiveApproval,
  getActiveOverride,
  getDecisionHistory,
  clearCache,
} from "./engine";
import type { CutoverDecision, CutoverStatus } from "./types";

const router = Router();

// Feature flag middleware
function requireEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isProductionCutoverEnabled()) {
    res.status(503).json({ error: "Production cutover is not enabled" });
    return;
  }
  next();
}

// GET /api/ops/cutover/status - Get current cutover status
router.get("/status", (req: Request, res: Response) => {
  const status: CutoverStatus = {
    enabled: isProductionCutoverEnabled(),
    activeApproval: getActiveApproval() || undefined,
    activeOverride: getActiveOverride() || undefined,
  };
  res.json(status);
});

// GET /api/ops/cutover/config - Get configuration
router.get("/config", (req: Request, res: Response) => {
  res.json({
    enabled: isProductionCutoverEnabled(),
    config: CUTOVER_CONFIG,
  });
});

// POST /api/ops/cutover/evaluate - Run live evaluation
router.post("/evaluate", requireEnabled, async (req: Request, res: Response) => {
  try {
    const result = await evaluateCutover("live");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/ops/cutover/dry-run - Run dry-run evaluation
router.post("/dry-run", async (req: Request, res: Response) => {
  try {
    const result = await dryRun();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/ops/cutover/approve - Create time-boxed approval
router.post("/approve", requireEnabled, (req: Request, res: Response) => {
  const { approvedBy, reason } = req.body;

  if (!approvedBy || !reason) {
    res.status(400).json({ error: "approvedBy and reason are required" });
    return;
  }

  const approval = createApproval(approvedBy, reason);
  res.json(approval);
});

// POST /api/ops/cutover/override - Create emergency override
router.post("/override", requireEnabled, (req: Request, res: Response) => {
  const { overriddenBy, newDecision, reason } = req.body;

  if (!overriddenBy || !newDecision || !reason) {
    res.status(400).json({ error: "overriddenBy, newDecision, and reason are required" });
    return;
  }

  const validDecisions: CutoverDecision[] = ["CAN_GO_LIVE", "WARN", "BLOCK"];
  if (!validDecisions.includes(newDecision)) {
    res.status(400).json({ error: "Invalid decision value" });
    return;
  }

  const override = createOverride(overriddenBy, newDecision, reason);
  res.json(override);
});

// DELETE /api/ops/cutover/override - Clear active override
router.delete("/override", requireEnabled, (req: Request, res: Response) => {
  clearOverride();
  res.json({ success: true });
});

// GET /api/ops/cutover/approval - Get active approval
router.get("/approval", requireEnabled, (req: Request, res: Response) => {
  const approval = getActiveApproval();
  if (!approval) {
    res.status(404).json({ error: "No active approval" });
    return;
  }
  res.json(approval);
});

// GET /api/ops/cutover/override - Get active override
router.get("/override", requireEnabled, (req: Request, res: Response) => {
  const override = getActiveOverride();
  if (!override) {
    res.status(404).json({ error: "No active override" });
    return;
  }
  res.json(override);
});

// GET /api/ops/cutover/history - Get decision history
router.get("/history", requireEnabled, (req: Request, res: Response) => {
  const limit = Number.parseInt(req.query.limit as string) || 20;
  const history = getDecisionHistory(limit);
  res.json({ history, count: history.length });
});

// POST /api/ops/cutover/cache/clear - Clear cached result
router.post("/cache/clear", requireEnabled, (req: Request, res: Response) => {
  clearCache();
  res.json({ success: true });
});

export default router;
