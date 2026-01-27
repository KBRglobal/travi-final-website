/**
 * Autonomy Policy Engine - Admin Routes
 * Authenticated admin-only API endpoints
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { policyDefinitionSchema, policyUpdateSchema, PolicyDecision } from "./types";
import {
  getPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getRecentDecisions,
  seedDefaultPolicies,
  invalidatePolicyCache,
} from "./repository";
import { getBudgetSummary, resetBudget, clearBudgetCache } from "./budgets";
import { evaluatePolicy } from "./policy-engine";

const router = Router();

// Admin-only middleware
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Admin access required",
    });
  }
  next();
};

// Apply admin check to all routes
router.use(requireAdmin);

/**
 * GET /api/admin/autonomy/policy/current
 * Get all current policies
 */
router.get("/policy/current", async (req: Request, res: Response) => {
  try {
    const policies = await getPolicies();
    res.json({
      success: true,
      data: policies,
      count: policies.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve policies",
    });
  }
});

/**
 * GET /api/admin/autonomy/policy/:id
 * Get specific policy by ID
 */
router.get("/policy/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const policy = await getPolicy(id);

    if (!policy) {
      return res.status(404).json({
        error: "Not Found",
        message: "Policy not found",
      });
    }

    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve policy",
    });
  }
});

/**
 * POST /api/admin/autonomy/policy/update
 * Create or update a policy (strict validation)
 */
router.post("/policy/update", async (req: Request, res: Response) => {
  try {
    // Strict validation
    const validationResult = policyDefinitionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid policy configuration",
        details: validationResult.error.errors,
      });
    }

    const policyData = validationResult.data;

    // Check if updating or creating
    const existing = await getPolicy(policyData.id);

    let result;
    if (existing) {
      result = await updatePolicy(policyData.id, {
        ...policyData,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      } as any);
    } else {
      result = await createPolicy({
        ...policyData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    res.json({
      success: true,
      data: result,
      action: existing ? "updated" : "created",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid policy configuration",
        details: error.errors,
      });
    }

    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update policy",
    });
  }
});

/**
 * DELETE /api/admin/autonomy/policy/:id
 * Delete a policy
 */
router.delete("/policy/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting default global policy
    if (id === "default-global") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot delete the default global policy",
      });
    }

    const deleted = await deletePolicy(id);

    if (!deleted) {
      return res.status(404).json({
        error: "Not Found",
        message: "Policy not found",
      });
    }

    res.json({ success: true, message: "Policy deleted" });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete policy",
    });
  }
});

/**
 * POST /api/admin/autonomy/policy/seed
 * Seed default policies (if none exist)
 */
router.post("/policy/seed", async (req: Request, res: Response) => {
  try {
    const seeded = await seedDefaultPolicies();
    res.json({
      success: true,
      message: seeded > 0 ? `Seeded ${seeded} default policies` : "Policies already exist",
      seeded,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to seed policies",
    });
  }
});

/**
 * GET /api/admin/autonomy/budgets/summary
 * Get budget usage summary
 */
router.get("/budgets/summary", async (req: Request, res: Response) => {
  try {
    const summary = await getBudgetSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve budget summary",
    });
  }
});

/**
 * POST /api/admin/autonomy/budgets/reset
 * Reset budget counters (scoped by target and optionally period)
 */
router.post("/budgets/reset", async (req: Request, res: Response) => {
  try {
    const resetSchema = z.object({
      targetKey: z.string().min(1).max(200),
      period: z.enum(["hourly", "daily", "weekly", "monthly"]).optional(),
    });

    const validationResult = resetSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid reset parameters",
        details: validationResult.error.errors,
      });
    }

    const { targetKey, period } = validationResult.data;
    const resetCount = await resetBudget(targetKey, period);

    res.json({
      success: true,
      message: `Reset ${resetCount} budget counter(s)`,
      targetKey,
      period: period || "all",
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to reset budget",
    });
  }
});

/**
 * GET /api/admin/autonomy/decisions/recent
 * Get recent policy decisions
 */
router.get("/decisions/recent", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const targetKey = req.query.targetKey as string | undefined;
    const actionType = req.query.actionType as string | undefined;
    const decision = req.query.decision as PolicyDecision | undefined;

    // Validate decision if provided
    if (decision && !["ALLOW", "WARN", "BLOCK"].includes(decision)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid decision filter. Must be ALLOW, WARN, or BLOCK",
      });
    }

    const decisions = await getRecentDecisions(limit, {
      targetKey,
      actionType,
      decision,
    });

    res.json({
      success: true,
      data: decisions,
      count: decisions.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve decisions",
    });
  }
});

/**
 * POST /api/admin/autonomy/evaluate
 * Test policy evaluation (dry run)
 */
router.post("/evaluate", async (req: Request, res: Response) => {
  try {
    const evaluateSchema = z.object({
      target: z.object({
        type: z.enum(["global", "feature", "entity", "locale"]),
        feature: z.string().optional(),
        entity: z.string().optional(),
        locale: z.string().optional(),
      }),
      action: z.enum([
        "content_create",
        "content_update",
        "content_delete",
        "content_publish",
        "ai_generate",
        "ai_enrich",
        "db_write",
        "db_delete",
        "external_api",
        "notification",
        "bulk_operation",
      ]),
    });

    const validationResult = evaluateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid evaluation parameters",
        details: validationResult.error.errors,
      });
    }

    const { target, action } = validationResult.data;
    const result = await evaluatePolicy(target as any, action as any, {
      requesterId: (req as any).user?.id,
      metadata: { dryRun: true },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to evaluate policy",
    });
  }
});

/**
 * POST /api/admin/autonomy/cache/clear
 * Clear all caches
 */
router.post("/cache/clear", async (req: Request, res: Response) => {
  try {
    invalidatePolicyCache();
    clearBudgetCache();

    res.json({
      success: true,
      message: "All caches cleared",
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to clear caches",
    });
  }
});

export default router;
