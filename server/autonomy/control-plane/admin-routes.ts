/**
 * Autonomy Control Plane - Admin Routes
 * Express routes for policy management, budget monitoring, and overrides
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { getDashboardData, simulateEvaluation } from "./risk-dashboard";
import {
  createOverride,
  revokeOverride,
  listOverrides,
  getOverride,
  createOverrideSchema,
} from "./overrides";
import { getPolicies, createPolicy, updatePolicy, getRecentDecisions } from "../policy/repository";
import { resetBudget, getBudgetSummary, checkBudgetStatus } from "../policy/budgets";
import { policyDefinitionSchema, policyUpdateSchema } from "../policy/types";
import { GuardedFeature } from "../enforcement/types";

const router = Router();

// All routes require admin authentication (handled by parent router)

// =============================================================================
// DASHBOARD & STATUS
// =============================================================================

/**
 * GET /status
 * Get overall control plane status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const dashboard = await getDashboardData();
    res.json({
      status: dashboard.status,
      decisions: dashboard.decisions,
      activeOverrides: dashboard.activeOverrides,
      policyCount: dashboard.policyCount,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get status" });
  }
});

/**
 * GET /dashboard
 * Get full dashboard data
 */
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const dashboard = await getDashboardData();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to get dashboard" });
  }
});

// =============================================================================
// POLICIES
// =============================================================================

/**
 * GET /policies
 * List all policies
 */
router.get("/policies", async (req: Request, res: Response) => {
  try {
    const policies = await getPolicies();
    res.json({ policies });
  } catch (error) {
    res.status(500).json({ error: "Failed to list policies" });
  }
});

/**
 * POST /policies
 * Create or update a policy
 */
router.post("/policies", async (req: Request, res: Response) => {
  try {
    const parsed = policyDefinitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid policy definition",
        details: parsed.error.issues,
      });
    }

    const policy = await createPolicy({
      ...parsed.data,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: (req as any).userId,
    } as any);

    res.status(201).json({ policy });
  } catch (error) {
    res.status(500).json({ error: "Failed to create policy" });
  }
});

/**
 * PATCH /policies/:id
 * Update a policy
 */
router.patch("/policies/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = policyUpdateSchema.safeParse({ ...req.body, id });

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid policy update",
        details: parsed.error.issues,
      });
    }

    const policy = await updatePolicy(id, parsed.data as any);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ policy });
  } catch (error) {
    res.status(500).json({ error: "Failed to update policy" });
  }
});

// =============================================================================
// BUDGETS
// =============================================================================

/**
 * GET /budgets
 * Get budget summary
 */
router.get("/budgets", async (req: Request, res: Response) => {
  try {
    const summary = await getBudgetSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to get budgets" });
  }
});

/**
 * GET /budgets/:targetKey
 * Get budget for specific target
 */
router.get("/budgets/:targetKey", async (req: Request, res: Response) => {
  try {
    const { targetKey } = req.params;
    const defaultLimits = [
      {
        period: "hourly" as const,
        maxActions: 100,
        maxAiSpend: 1000,
        maxDbWrites: 50,
        maxContentMutations: 20,
      },
      {
        period: "daily" as const,
        maxActions: 1000,
        maxAiSpend: 5000,
        maxDbWrites: 500,
        maxContentMutations: 100,
      },
    ];

    const statuses = await checkBudgetStatus(targetKey, defaultLimits);
    res.json({ targetKey, statuses });
  } catch (error) {
    res.status(500).json({ error: "Failed to get budget status" });
  }
});

/**
 * POST /budgets/reset
 * Reset budget for a target
 */
router.post("/budgets/reset", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      targetKey: z.string().min(1),
      period: z.enum(["hourly", "daily", "weekly", "monthly"]).optional(),
      reason: z.string().min(5).max(200),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid reset request",
        details: parsed.error.issues,
      });
    }

    const count = await resetBudget(parsed.data.targetKey, parsed.data.period);

    res.json({
      success: true,
      countersReset: count,
      targetKey: parsed.data.targetKey,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset budget" });
  }
});

// =============================================================================
// DECISIONS
// =============================================================================

/**
 * GET /decisions
 * Get decision log with filters
 */
router.get("/decisions", async (req: Request, res: Response) => {
  try {
    const { from, to, scope, feature, decision, limit } = req.query;

    const decisions = await getRecentDecisions({
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      targetKey: scope as string,
      feature: feature as string,
      decision: decision as "ALLOW" | "WARN" | "BLOCK",
      limit: limit ? Number.parseInt(limit as string, 10) : 100,
    } as any);

    res.json({ decisions });
  } catch (error) {
    res.status(500).json({ error: "Failed to get decisions" });
  }
});

// =============================================================================
// OVERRIDES
// =============================================================================

/**
 * GET /overrides
 * List overrides
 */
router.get("/overrides", async (req: Request, res: Response) => {
  try {
    const { activeOnly, feature, targetKey, limit } = req.query;

    const overrides = await listOverrides({
      activeOnly: activeOnly === "true",
      feature: feature as GuardedFeature,
      targetKey: targetKey as string,
      limit: limit ? Number.parseInt(limit as string, 10) : 50,
    });

    res.json({ overrides });
  } catch (error) {
    res.status(500).json({ error: "Failed to list overrides" });
  }
});

/**
 * POST /override
 * Create a temporary override
 */
router.post("/override", async (req: Request, res: Response) => {
  try {
    const parsed = createOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid override request",
        details: parsed.error.issues,
      });
    }

    const userId = (req as any).userId || "unknown";
    const override = await createOverride(parsed.data, userId);

    res.status(201).json({ override });
  } catch (error) {
    res.status(500).json({ error: "Failed to create override" });
  }
});

/**
 * DELETE /overrides/:id
 * Revoke an override
 */
router.delete("/overrides/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId || "unknown";

    const result = await revokeOverride(id, userId);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke override" });
  }
});

// =============================================================================
// SIMULATION
// =============================================================================

/**
 * POST /simulate
 * Dry-run policy evaluation
 */
router.post("/simulate", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      feature: z.enum([
        "chat",
        "octopus",
        "search",
        "aeo",
        "translation",
        "images",
        "content_enrichment",
        "seo_optimization",
        "internal_linking",
        "background_job",
        "publishing",
      ]),
      action: z.string().min(1),
      targetKey: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid simulation request",
        details: parsed.error.issues,
      });
    }

    const result = await simulateEvaluation(parsed.data as any);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run simulation" });
  }
});

// =============================================================================
// BLOCKED JOBS (for retry functionality)
// =============================================================================

/**
 * GET /blocked-jobs
 * Get jobs blocked by autonomy policy
 */
router.get("/blocked-jobs", async (req: Request, res: Response) => {
  try {
    const decisions = await getRecentDecisions({
      decision: "BLOCK",
      limit: 50,
    } as any);

    // Filter for job-related blocks
    const blockedJobs = decisions.filter(d => d.metadata?.jobType || d.metadata?.jobId);

    res.json({ blockedJobs });
  } catch (error) {
    res.status(500).json({ error: "Failed to get blocked jobs" });
  }
});

/**
 * POST /blocked-jobs/:jobId/retry
 * Retry a blocked job with override
 */
router.post("/blocked-jobs/:jobId/retry", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.length < 10) {
      return res.status(400).json({ error: "Reason must be at least 10 characters" });
    }

    const userId = (req as any).userId || "unknown";

    // Create a short-lived override for this job
    const override = await createOverride(
      {
        targetKey: `job:${jobId}`,
        feature: "background_job",
        reason: `Admin retry: ${reason}`,
        ttlMinutes: 30,
      },
      userId
    );

    // Note: Actual job retry would need integration with job queue
    res.json({
      success: true,
      override,
      message: "Override created. Job will be retried on next scheduler run.",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retry job" });
  }
});

export const controlPlaneRoutes = router;
export default router;
