/**
 * Publish Gates - Admin Routes
 * API endpoints for managing publish gates
 */

import { Router, Request, Response } from "express";
import { gateService } from "./gate-service";
import { GateOverrideRequest } from "./types";

const router = Router();

// Middleware to check admin access
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !["admin", "editor"].includes(user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * GET /api/admin/publish-gates/status
 * Get gates status and statistics
 */
router.get("/status", requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = gateService.getStats();
    const config = gateService.getConfig();

    res.json({
      success: true,
      data: {
        ...stats,
        config,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get status" });
  }
});

/**
 * GET /api/admin/publish-gates/rules
 * Get all rules
 */
router.get("/rules", requireAdmin, async (req: Request, res: Response) => {
  try {
    const rules = gateService.getRules();
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ error: "Failed to get rules" });
  }
});

/**
 * PATCH /api/admin/publish-gates/rules/:ruleId
 * Update a rule
 */
router.patch("/rules/:ruleId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { enabled, threshold } = req.body;

    const rule = gateService.updateRule(ruleId, { enabled, threshold });

    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ error: "Failed to update rule" });
  }
});

/**
 * POST /api/admin/publish-gates/evaluate/:contentId
 * Evaluate gates for content
 */
router.post("/evaluate/:contentId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const user = (req as any).user;

    const result = await gateService.evaluate({
      contentId,
      contentType: req.body.contentType || "article",
      userId: user?.id || "anonymous",
      userRole: user?.role || "user",
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to evaluate gates" });
  }
});

/**
 * POST /api/admin/publish-gates/override
 * Create override for content
 */
router.post("/override", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { contentId, reason, expiresInHours } = req.body;

    if (!contentId || !reason) {
      return res.status(400).json({ error: "contentId and reason are required" });
    }

    const request: GateOverrideRequest = {
      contentId,
      userId: user?.id || "anonymous",
      reason,
      approvedBy: user?.id,
      expiresAt: expiresInHours
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : undefined,
    };

    const override = await gateService.createOverride(request);
    res.json({ success: true, data: override });
  } catch (error) {
    res.status(500).json({ error: "Failed to create override" });
  }
});

/**
 * DELETE /api/admin/publish-gates/override/:contentId
 * Revoke override
 */
router.delete("/override/:contentId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const user = (req as any).user;

    const revoked = gateService.revokeOverride(contentId, user?.id || "anonymous");

    if (!revoked) {
      return res.status(404).json({ error: "Override not found" });
    }

    res.json({ success: true, message: "Override revoked" });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke override" });
  }
});

/**
 * GET /api/admin/publish-gates/overrides
 * Get all active overrides
 */
router.get("/overrides", requireAdmin, async (req: Request, res: Response) => {
  try {
    const overrides = gateService.getActiveOverrides();
    res.json({ success: true, data: overrides });
  } catch (error) {
    res.status(500).json({ error: "Failed to get overrides" });
  }
});

/**
 * GET /api/admin/publish-gates/audit
 * Get audit log
 */
router.get("/audit", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { contentId, userId, action, limit } = req.query;

    const logs = gateService.getAuditLog({
      contentId: contentId as string,
      userId: userId as string,
      action: action as string,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to get audit log" });
  }
});

export default router;
