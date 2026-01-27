/**
 * System Intelligence Feedback Loop - Admin Routes
 */

import { Router, Request, Response } from "express";
import { getRecentEvents, getEventsByTarget, cleanupOldEvents } from "./tracker";
import {
  generateSummary,
  trainModel,
  getModel,
  resetModel,
  getWeightAdjustmentHistory,
  calculateAllConfidenceScores,
} from "./learner";

const router = Router();

const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !["admin", "editor"].includes(user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * GET /api/admin/intelligence-feedback/summary
 * Get complete feedback summary
 */
router.get("/summary", requireAdmin, async (req: Request, res: Response) => {
  try {
    const summary = generateSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ error: "Failed to get summary" });
  }
});

/**
 * GET /api/admin/intelligence-feedback/events
 * Get recent feedback events
 */
router.get("/events", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = getRecentEvents(limit);

    res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get events" });
  }
});

/**
 * GET /api/admin/intelligence-feedback/events/:targetId
 * Get events for specific target
 */
router.get("/events/:targetId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { targetId } = req.params;
    const events = getEventsByTarget(targetId);

    res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get events" });
  }
});

/**
 * GET /api/admin/intelligence-feedback/model
 * Get current learning model
 */
router.get("/model", requireAdmin, async (req: Request, res: Response) => {
  try {
    const model = getModel();
    res.json({ success: true, data: model });
  } catch (error) {
    res.status(500).json({ error: "Failed to get model" });
  }
});

/**
 * POST /api/admin/intelligence-feedback/train
 * Trigger model training
 */
router.post("/train", requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = trainModel();

    res.json({
      success: true,
      data: {
        modelVersion: result.modelVersion,
        taskAdjustments: result.taskAdjustments.length,
        signalAdjustments: result.signalAdjustments.length,
        adjustments: [...result.taskAdjustments, ...result.signalAdjustments],
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to train model" });
  }
});

/**
 * POST /api/admin/intelligence-feedback/reset
 * Reset learning model to defaults
 */
router.post("/reset", requireAdmin, async (req: Request, res: Response) => {
  try {
    resetModel();
    res.json({
      success: true,
      message: "Model reset to defaults",
      data: getModel(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset model" });
  }
});

/**
 * GET /api/admin/intelligence-feedback/confidence
 * Get confidence scores for all task types
 */
router.get("/confidence", requireAdmin, async (req: Request, res: Response) => {
  try {
    const scores = calculateAllConfidenceScores();
    res.json({ success: true, data: scores });
  } catch (error) {
    res.status(500).json({ error: "Failed to get confidence scores" });
  }
});

/**
 * GET /api/admin/intelligence-feedback/adjustments
 * Get weight adjustment history
 */
router.get("/adjustments", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const adjustments = getWeightAdjustmentHistory(limit);

    res.json({
      success: true,
      data: adjustments,
      count: adjustments.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get adjustments" });
  }
});

/**
 * POST /api/admin/intelligence-feedback/cleanup
 * Clean up old events
 */
router.post("/cleanup", requireAdmin, async (req: Request, res: Response) => {
  try {
    const removed = cleanupOldEvents();
    res.json({
      success: true,
      message: `Removed ${removed} old events`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to cleanup events" });
  }
});

export default router;
