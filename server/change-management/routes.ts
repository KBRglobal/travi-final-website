/**
 * Change Management Admin API Routes
 *
 * RESTful endpoints for the Production Change Management System.
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  isChangeManagementEnabled,
  isChangeApplyEnabled,
  isChangeRollbackEnabled,
  isDryRunEnabled,
} from "./types";
import type { PlanScope, CreatedFrom, ChangeItem, PlanStatus } from "./types";
import {
  createPlan,
  getPlan,
  updatePlanStatus,
  listPlans,
  getPlanHistory,
  getStats,
  deletePlan,
} from "./plans";
import { generatePlanPreview, generateHumanReadableSummary, generateJsonDiff } from "./diff";
import { evaluateGuards, canApprove, canApply } from "./guards";
import { dryRun, executePlan, isExecuting, getExecutionStatus } from "./executor";
import {
  rollbackPlan,
  rollbackChanges,
  previewRollback,
  canRollback,
  isRollingBack,
} from "./rollback";

/**
 * Register all change management routes
 */
export function registerChangeManagementRoutes(app: Express): void {
  // ============================================================================
  // PLAN CRUD
  // ============================================================================

  /**
   * Create a new change plan
   */
  app.post("/api/admin/changes/plan", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const { name, description, scope, createdFrom, changes, tags, parentPlanId } = req.body;

    if (!name || !description || !scope || !changes || !Array.isArray(changes)) {
      return res.status(400).json({
        error: "Missing required fields: name, description, scope, changes[]",
      });
    }

    const userId = (req as Request & { user?: { id: string } }).user?.id || "unknown";

    try {
      const plan = createPlan(
        name,
        description,
        scope as PlanScope,
        (createdFrom as CreatedFrom) || "admin",
        userId,
        changes as Omit<ChangeItem, "id" | "status">[],
        { tags, parentPlanId }
      );

      res.status(201).json({
        success: true,
        plan,
        message: `Plan created with ${plan.changes.length} changes`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create plan";
      res.status(500).json({ error: message });
    }
  });

  /**
   * Get a specific plan
   */
  app.get("/api/admin/changes/:id", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    res.json({
      plan,
      isExecuting: isExecuting(plan.id),
      isRollingBack: isRollingBack(plan.id),
    });
  });

  /**
   * List plans with filters
   */
  app.get("/api/admin/changes", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const status = req.query.status
      ? ((req.query.status as string).split(",") as PlanStatus[])
      : undefined;
    const scope = req.query.scope
      ? ((req.query.scope as string).split(",") as PlanScope[])
      : undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { plans, total } = listPlans({ status, scope, limit, offset });

    res.json({ plans, total, limit, offset });
  });

  /**
   * Delete a draft plan
   */
  app.delete("/api/admin/changes/:id", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    try {
      const deleted = deletePlan(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json({ success: true, message: "Plan deleted" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete plan";
      res.status(400).json({ error: message });
    }
  });

  // ============================================================================
  // DIFF & PREVIEW
  // ============================================================================

  /**
   * Get plan diff preview
   */
  app.get("/api/admin/changes/:id/diff", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const format = (req.query.format as string) || "json";

    try {
      if (format === "human") {
        const summary = generateHumanReadableSummary(plan);
        res.type("text/plain").send(summary);
      } else {
        const diff = await generateJsonDiff(plan);
        res.json(diff);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate diff";
      res.status(500).json({ error: message });
    }
  });

  /**
   * Get change previews
   */
  app.get("/api/admin/changes/:id/preview", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    try {
      const preview = await generatePlanPreview(plan);
      res.json({ planId: plan.id, preview });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate preview";
      res.status(500).json({ error: message });
    }
  });

  // ============================================================================
  // DRY RUN
  // ============================================================================

  /**
   * Execute a dry run
   */
  app.post("/api/admin/changes/:id/dry-run", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    if (!isDryRunEnabled()) {
      return res.status(503).json({ error: "Dry run is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const userId = (req as Request & { user?: { id: string } }).user?.id || "unknown";

    try {
      const result = await dryRun(req.params.id, userId);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dry run failed";
      res.status(500).json({ error: message });
    }
  });

  // ============================================================================
  // APPROVAL WORKFLOW
  // ============================================================================

  /**
   * Check guards for a plan
   */
  app.get("/api/admin/changes/:id/guards", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const userId = (req as Request & { user?: { id: string } }).user?.id || "unknown";

    try {
      const { passed, failed } = await evaluateGuards(plan, userId);
      res.json({
        planId: plan.id,
        allPassed: failed.length === 0,
        passed,
        failed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Guard evaluation failed";
      res.status(500).json({ error: message });
    }
  });

  /**
   * Submit plan for approval
   */
  app.post("/api/admin/changes/:id/submit", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    if (plan.status !== "draft") {
      return res.status(400).json({ error: `Plan is ${plan.status}, not draft` });
    }

    const userId = (req as Request & { user?: { id: string } }).user?.id || "unknown";

    const updatedPlan = updatePlanStatus(req.params.id, "pending_approval", userId);
    res.json({ success: true, plan: updatedPlan });
  });

  /**
   * Approve a plan
   */
  app.post("/api/admin/changes/:id/approve", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const userId = (req as Request & { user?: { id: string } }).user?.id || "unknown";
    const { notes } = req.body;

    // Check if approval is allowed
    const { canApprove: allowed, reasons } = await canApprove(plan, userId);
    if (!allowed) {
      return res.status(403).json({ error: "Cannot approve", reasons });
    }

    const updatedPlan = updatePlanStatus(req.params.id, "approved", userId, {
      approvedAt: new Date(),
      approvedBy: userId,
      approvalNotes: notes,
    });

    res.json({ success: true, plan: updatedPlan });
  });

  /**
   * Reject a plan
   */
  app.post("/api/admin/changes/:id/reject", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    if (plan.status !== "pending_approval") {
      return res.status(400).json({ error: `Plan is ${plan.status}, not pending approval` });
    }

    const userId = (req as Request & { user?: { id: string } }).user?.id || "unknown";
    const { reason } = req.body;

    const updatedPlan = updatePlanStatus(req.params.id, "cancelled", userId, {
      rollbackReason: reason || "Rejected during approval",
    });

    res.json({ success: true, plan: updatedPlan });
  });

  // ============================================================================
  // EXECUTION
  // ============================================================================

  /**
   * Apply an approved plan
   */
  app.post("/api/admin/changes/:id/apply", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    if (!isChangeApplyEnabled()) {
      return res.status(503).json({
        error: "Change apply is disabled. Set ENABLE_CHANGE_APPLY=true to enable.",
      });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const userId = (req as Request & { user?: { id: string } }).user?.id || "unknown";

    // Check if execution is allowed
    const { canApply: allowed, reasons } = await canApply(plan, userId);
    if (!allowed) {
      return res.status(403).json({ error: "Cannot apply", reasons });
    }

    const { batchSize, continueOnError, emitEvents } = req.body;

    try {
      const result = await executePlan(req.params.id, {
        executedBy: userId,
        dryRun: false,
        batchSize: batchSize || 10,
        continueOnError: continueOnError ?? true,
        emitEvents: emitEvents ?? true,
      });

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Execution failed";
      res.status(500).json({ error: message });
    }
  });

  /**
   * Get execution status
   */
  app.get("/api/admin/changes/:id/status", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const status = getExecutionStatus(req.params.id);
    if (!status.plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    res.json(status);
  });

  // ============================================================================
  // ROLLBACK
  // ============================================================================

  /**
   * Preview rollback
   */
  app.get(
    "/api/admin/changes/:id/rollback/preview",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isChangeManagementEnabled()) {
        return res.status(503).json({ error: "Change management is disabled" });
      }

      const preview = previewRollback(req.params.id);
      res.json(preview);
    }
  );

  /**
   * Rollback an applied plan
   */
  app.post("/api/admin/changes/:id/rollback", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    if (!isChangeRollbackEnabled()) {
      return res.status(503).json({ error: "Rollback is disabled" });
    }

    const plan = getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const userId = (req as Request & { user?: { id: string } }).user?.id || "unknown";
    const { reason, changeIds } = req.body;

    try {
      let result;

      if (changeIds && Array.isArray(changeIds) && changeIds.length > 0) {
        // Partial rollback
        result = await rollbackChanges(req.params.id, changeIds, userId, reason);
      } else {
        // Full rollback
        result = await rollbackPlan(req.params.id, userId, reason);
      }

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rollback failed";
      res.status(500).json({ error: message });
    }
  });

  // ============================================================================
  // HISTORY & STATS
  // ============================================================================

  /**
   * Get plan history
   */
  app.get("/api/admin/changes/:id/history", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const history = getPlanHistory(req.params.id);
    res.json({ planId: req.params.id, history });
  });

  /**
   * Get all history (recent activity)
   */
  app.get("/api/admin/changes/history", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    // Get recent plans and their history
    const { plans } = listPlans({ limit: 20 });

    const recentHistory = plans
      .flatMap(p => {
        const history = getPlanHistory(p.id);
        return history.map(h => ({ ...h, planName: p.name }));
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    res.json({ history: recentHistory });
  });

  /**
   * Get overall statistics
   */
  app.get("/api/admin/changes/stats", requireAuth, async (req: Request, res: Response) => {
    if (!isChangeManagementEnabled()) {
      return res.status(503).json({ error: "Change management is disabled" });
    }

    const stats = getStats();

    res.json({
      enabled: true,
      applyEnabled: isChangeApplyEnabled(),
      rollbackEnabled: isChangeRollbackEnabled(),
      dryRunEnabled: isDryRunEnabled(),
      ...stats,
    });
  });
}
