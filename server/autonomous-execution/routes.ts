/**
 * Autonomous Execution Routes
 *
 * Admin API endpoints for the Autonomous Execution Orchestrator.
 */

import { Router, Request, Response } from "express";
import { getExecutionPlanner, ApprovedProposal } from "./planner";
import { getExecutor } from "./executor";
import { getRollbackManager } from "./rollback";
import { getSafetyGuards } from "./safety-guards";
import type { ExecutionMode } from "./types";

const ENABLE_AUTONOMOUS_EXECUTION = process.env.ENABLE_AUTONOMOUS_EXECUTION === "true";
const ENABLE_AUTONOMOUS_ROLLBACK = process.env.ENABLE_AUTONOMOUS_ROLLBACK !== "false"; // Default true

export function createAutonomousExecutionRouter(): Router {
  const router = Router();

  // Feature flag middleware
  router.use((req: Request, res: Response, next) => {
    if (!ENABLE_AUTONOMOUS_EXECUTION) {
      return res.status(404).json({ error: "Autonomous Execution is disabled" });
    }
    next();
  });

  // ==========================================================================
  // PLANS
  // ==========================================================================

  /**
   * POST /plans - Create execution plan
   */
  router.post("/plans", (req: Request, res: Response) => {
    try {
      const planner = getExecutionPlanner();
      const { name, proposals, mode, config } = req.body;

      if (!name || !Array.isArray(proposals)) {
        return res.status(400).json({ error: "name and proposals required" });
      }

      const plan = planner.createPlan(
        name,
        proposals as ApprovedProposal[],
        (mode as ExecutionMode) || "staged",
        config
      );

      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  /**
   * GET /plans - Get all plans
   */
  router.get("/plans", (req: Request, res: Response) => {
    try {
      const planner = getExecutionPlanner();
      const plans = planner.getAllPlans();

      res.json({
        total: plans.length,
        plans,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get plans" });
    }
  });

  /**
   * GET /plans/:id - Get plan by ID
   */
  router.get("/plans/:id", (req: Request, res: Response) => {
    try {
      const planner = getExecutionPlanner();
      const plan = planner.getPlan(req.params.id);

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to get plan" });
    }
  });

  /**
   * POST /plans/:id/validate - Validate a plan
   */
  router.post("/plans/:id/validate", (req: Request, res: Response) => {
    try {
      const planner = getExecutionPlanner();
      const validation = planner.validatePlan(req.params.id);

      res.json(validation);
    } catch (error) {
      res.status(500).json({ error: "Validation failed" });
    }
  });

  /**
   * POST /plans/:id/cancel - Cancel a plan
   */
  router.post("/plans/:id/cancel", (req: Request, res: Response) => {
    try {
      const planner = getExecutionPlanner();
      const plan = planner.cancelPlan(req.params.id);

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel plan" });
    }
  });

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * POST /execute/:planId - Execute a plan
   */
  router.post("/execute/:planId", async (req: Request, res: Response) => {
    try {
      const executor = getExecutor();

      if (executor.getIsRunning()) {
        return res.status(409).json({ error: "Another execution is in progress" });
      }

      // Start execution in background
      const planId = req.params.planId;

      // Non-blocking execution
      executor.execute(planId).catch(err => {});

      res.json({
        status: "started",
        planId,
        message: "Execution started. Poll /progress/:planId for status.",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to start execution" });
    }
  });

  /**
   * GET /progress/:planId - Get execution progress
   */
  router.get("/progress/:planId", (req: Request, res: Response) => {
    try {
      const executor = getExecutor();
      const progress = executor.getProgress(req.params.planId);

      if (!progress) {
        return res.status(404).json({ error: "Plan not found" });
      }

      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to get progress" });
    }
  });

  /**
   * GET /status - Get executor status
   */
  router.get("/status", (req: Request, res: Response) => {
    try {
      const executor = getExecutor();
      const rateLimits = executor.getRateLimitState();

      res.json({
        isRunning: executor.getIsRunning(),
        rateLimits: {
          hourly: {
            used: rateLimits.itemsThisHour,
            limit: rateLimits.hourlyBudget.limit,
            resetAt: rateLimits.hourlyBudget.resetAt,
          },
          daily: {
            used: rateLimits.itemsThisDay,
            limit: rateLimits.dailyBudget.limit,
            resetAt: rateLimits.dailyBudget.resetAt,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // ==========================================================================
  // ROLLBACK
  // ==========================================================================

  /**
   * POST /rollback/:planId - Rollback a plan
   */
  router.post("/rollback/:planId", async (req: Request, res: Response) => {
    if (!ENABLE_AUTONOMOUS_ROLLBACK) {
      return res.status(404).json({ error: "Autonomous rollback is disabled" });
    }

    try {
      const rollbackManager = getRollbackManager();
      const result = await rollbackManager.rollbackPlan(req.params.planId);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Rollback failed" });
    }
  });

  /**
   * GET /rollback/:itemId/plan - Get rollback plan for item
   */
  router.get("/rollback/:itemId/plan", (req: Request, res: Response) => {
    try {
      const rollbackManager = getRollbackManager();
      const plan = rollbackManager.getRollbackPlan(req.params.itemId);

      if (!plan) {
        return res.status(404).json({ error: "Rollback plan not found" });
      }

      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to get rollback plan" });
    }
  });

  /**
   * GET /rollback/:itemId/check - Check if item can be rolled back
   */
  router.get("/rollback/:itemId/check", (req: Request, res: Response) => {
    try {
      const rollbackManager = getRollbackManager();
      const result = rollbackManager.canRollback(req.params.itemId);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to check rollback" });
    }
  });

  // ==========================================================================
  // SAFETY
  // ==========================================================================

  /**
   * GET /safety/checks - Get all safety checks
   */
  router.get("/safety/checks", (req: Request, res: Response) => {
    try {
      const safetyGuards = getSafetyGuards();
      const type = req.query.type as string | undefined;

      let checks;
      if (type) {
        checks = safetyGuards.getChecksByType(type as any);
      } else {
        checks = safetyGuards.getAllChecks();
      }

      res.json({
        total: checks.length,
        checks: checks.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get safety checks" });
    }
  });

  /**
   * POST /safety/run - Run safety checks for a plan/item
   */
  router.post("/safety/run", (req: Request, res: Response) => {
    try {
      const planner = getExecutionPlanner();
      const safetyGuards = getSafetyGuards();

      const { planId, itemId, type } = req.body;

      const plan = planner.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const item = plan.proposals.find(p => p.id === itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const result = safetyGuards.runChecks(type || "pre_execution", plan, item);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Safety check failed" });
    }
  });

  // ==========================================================================
  // AUDIT
  // ==========================================================================

  /**
   * GET /audit - Get audit log
   */
  router.get("/audit", (req: Request, res: Response) => {
    try {
      const executor = getExecutor();
      const planId = req.query.planId as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

      const log = executor.getAuditLog(planId, limit);

      res.json({
        total: log.length,
        entries: log,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get audit log" });
    }
  });

  return router;
}
