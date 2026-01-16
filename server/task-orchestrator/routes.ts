/**
 * Autonomous Task Orchestrator - Admin Routes
 */

import { Router, Request, Response } from 'express';
import {
  createPlan,
  getPlan,
  getAllPlans,
  getPlansByStatus,
  getPlanSummaries,
  updatePlanStatus,
  updateStepStatus,
  getNextReadySteps,
  deletePlan,
  archiveCompletedPlans,
  getOrchestratorStats,
} from './orchestrator';
import { PlanStatus, StepStatus } from './types';

const router = Router();

const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !['admin', 'editor'].includes(user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/admin/orchestrator/plans
 * Get all plans or filter by status
 */
router.get('/plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as PlanStatus | undefined;
    const summary = req.query.summary === 'true';

    if (summary) {
      const summaries = getPlanSummaries();
      return res.json({ success: true, data: summaries });
    }

    const plans = status ? getPlansByStatus(status) : getAllPlans();
    res.json({
      success: true,
      data: plans,
      count: plans.length,
    });
  } catch (error) {
    console.error('[Orchestrator] Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

/**
 * GET /api/admin/orchestrator/plan/:id
 * Get specific plan by ID
 */
router.get('/plan/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const plan = getPlan(id);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('[Orchestrator] Get plan error:', error);
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

/**
 * POST /api/admin/orchestrator/plans
 * Create new execution plan
 */
router.post('/plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, constraints } = req.body;
    const plan = await createPlan(name, constraints);

    if (!plan) {
      return res.status(400).json({ error: 'Failed to create plan or orchestrator disabled' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('[Orchestrator] Create plan error:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

/**
 * PATCH /api/admin/orchestrator/plan/:id/status
 * Update plan status
 */
router.patch('/plan/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: PlanStatus };

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = updatePlanStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ success: true, message: 'Plan status updated' });
  } catch (error) {
    console.error('[Orchestrator] Update plan status error:', error);
    res.status(500).json({ error: 'Failed to update plan status' });
  }
});

/**
 * PATCH /api/admin/orchestrator/plan/:planId/step/:stepId
 * Update step status
 */
router.patch('/plan/:planId/step/:stepId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { planId, stepId } = req.params;
    const { status, outputs } = req.body as { status: StepStatus; outputs?: Record<string, unknown> };

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = updateStepStatus(planId, stepId, status, outputs);
    if (!updated) {
      return res.status(404).json({ error: 'Plan or step not found' });
    }

    res.json({ success: true, message: 'Step status updated' });
  } catch (error) {
    console.error('[Orchestrator] Update step status error:', error);
    res.status(500).json({ error: 'Failed to update step status' });
  }
});

/**
 * GET /api/admin/orchestrator/plan/:id/next
 * Get next ready steps for a plan
 */
router.get('/plan/:id/next', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const steps = getNextReadySteps(id);

    res.json({ success: true, data: steps });
  } catch (error) {
    console.error('[Orchestrator] Get next steps error:', error);
    res.status(500).json({ error: 'Failed to get next steps' });
  }
});

/**
 * DELETE /api/admin/orchestrator/plan/:id
 * Delete a plan
 */
router.delete('/plan/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deletePlan(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    console.error('[Orchestrator] Delete plan error:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

/**
 * POST /api/admin/orchestrator/archive
 * Archive completed plans
 */
router.post('/archive', requireAdmin, async (req: Request, res: Response) => {
  try {
    const archived = archiveCompletedPlans();
    res.json({ success: true, message: `Archived ${archived} plans` });
  } catch (error) {
    console.error('[Orchestrator] Archive error:', error);
    res.status(500).json({ error: 'Failed to archive plans' });
  }
});

/**
 * GET /api/admin/orchestrator/stats
 * Get orchestrator statistics
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = getOrchestratorStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Orchestrator] Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
