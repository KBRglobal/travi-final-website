/**
 * Strategic Priority Engine - Admin Routes
 */

import { Router, Request, Response } from "express";
import {
  getPriority,
  getTopPriorities,
  getStrategySnapshot,
  getPrioritiesByReason,
  getStrategyWeights,
  updateStrategyWeights,
  invalidatePriorityCache,
  getPriorityCacheStats,
} from "./engine";
import { PriorityReason } from "./types";

const router = Router();

const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !["admin", "editor"].includes(user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * GET /api/admin/strategy/priorities
 * Get all computed priorities
 */
router.get("/priorities", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const reason = req.query.reason as PriorityReason | undefined;

    let priorities;
    if (reason) {
      priorities = await getPrioritiesByReason(reason, limit);
    } else {
      priorities = await getTopPriorities(limit);
    }

    res.json({
      success: true,
      data: {
        priorities,
        count: priorities.length,
        weights: getStrategyWeights(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get priorities" });
  }
});

/**
 * GET /api/admin/strategy/content/:id
 * Get priority for specific content
 */
router.get("/content/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const priority = await getPriority(id);

    if (!priority) {
      return res.status(404).json({ error: "Content not found or engine disabled" });
    }

    res.json({ success: true, data: priority });
  } catch (error) {
    res.status(500).json({ error: "Failed to get content priority" });
  }
});

/**
 * GET /api/admin/strategy/snapshot
 * Get strategy overview snapshot
 */
router.get("/snapshot", requireAdmin, async (req: Request, res: Response) => {
  try {
    const snapshot = await getStrategySnapshot();
    res.json({ success: true, data: snapshot });
  } catch (error) {
    res.status(500).json({ error: "Failed to get snapshot" });
  }
});

/**
 * GET /api/admin/strategy/weights
 * Get current strategy weights
 */
router.get("/weights", requireAdmin, async (req: Request, res: Response) => {
  try {
    const weights = getStrategyWeights();
    res.json({ success: true, data: weights });
  } catch (error) {
    res.status(500).json({ error: "Failed to get weights" });
  }
});

/**
 * PATCH /api/admin/strategy/weights
 * Update strategy weights
 */
router.patch("/weights", requireAdmin, async (req: Request, res: Response) => {
  try {
    const adjustments = req.body;
    const newWeights = updateStrategyWeights(adjustments);
    invalidatePriorityCache();
    res.json({ success: true, data: newWeights });
  } catch (error) {
    res.status(500).json({ error: "Failed to update weights" });
  }
});

/**
 * POST /api/admin/strategy/refresh
 * Force refresh all priorities
 */
router.post("/refresh", requireAdmin, async (req: Request, res: Response) => {
  try {
    invalidatePriorityCache();
    const snapshot = await getStrategySnapshot();
    res.json({
      success: true,
      message: "Priorities refreshed",
      data: {
        totalPriorities: snapshot.totalPriorities,
        averageScore: snapshot.averageScore,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to refresh priorities" });
  }
});

/**
 * GET /api/admin/strategy/cache
 * Get cache statistics
 */
router.get("/cache", requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = getPriorityCacheStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: "Failed to get cache stats" });
  }
});

export default router;
