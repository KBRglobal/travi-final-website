/**
 * Draft Review & Approval - Routes
 */

import { Router, Request, Response } from 'express';
import { isApprovalWorkflowEnabled, WorkflowStage, TransitionAction } from './types';
import {
  initializeWorkflow,
  getWorkflowState,
  transitionWorkflow,
  addApproval,
  addRejection,
  requestChanges,
  resolveChangeRequest,
  getPendingReviews,
  getContentByStage,
  getWorkflowConfig,
  updateWorkflowConfig,
  getWorkflowStats,
} from './workflow-engine';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isApprovalWorkflowEnabled()) {
    res.status(503).json({
      error: 'Approval Workflow is disabled',
      hint: 'Set ENABLE_APPROVAL_WORKFLOW=true to enable',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/workflow/content/:contentId
 */
router.get('/content/:contentId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const state = getWorkflowState(contentId);

    if (!state) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    res.json({ state });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/workflow/content/:contentId/initialize
 */
router.post('/content/:contentId/initialize', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const state = initializeWorkflow(contentId);
    res.json({ state });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/workflow/content/:contentId/transition
 */
router.post('/content/:contentId/transition', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { action, performedBy, comment } = req.body;

    if (!action || !performedBy) {
      res.status(400).json({ error: 'action and performedBy are required' });
      return;
    }

    const result = transitionWorkflow(contentId, action as TransitionAction, performedBy, comment);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ state: result.newState });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/workflow/content/:contentId/approve
 */
router.post('/content/:contentId/approve', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { reviewerId, comment } = req.body;

    if (!reviewerId) {
      res.status(400).json({ error: 'reviewerId is required' });
      return;
    }

    const result = addApproval(contentId, reviewerId, comment);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ state: result.newState });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/workflow/content/:contentId/reject
 */
router.post('/content/:contentId/reject', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { reviewerId, reason } = req.body;

    if (!reviewerId || !reason) {
      res.status(400).json({ error: 'reviewerId and reason are required' });
      return;
    }

    const result = addRejection(contentId, reviewerId, reason);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ state: result.newState });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/workflow/content/:contentId/request-changes
 */
router.post('/content/:contentId/request-changes', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { reviewerId, comments, priority } = req.body;

    if (!reviewerId || !comments) {
      res.status(400).json({ error: 'reviewerId and comments are required' });
      return;
    }

    const result = requestChanges(contentId, reviewerId, comments, priority);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ state: result.newState });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/workflow/content/:contentId/resolve-change/:changeRequestId
 */
router.post('/content/:contentId/resolve-change/:changeRequestId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId, changeRequestId } = req.params;
    const resolved = resolveChangeRequest(contentId, changeRequestId);

    if (!resolved) {
      res.status(404).json({ error: 'Change request not found' });
      return;
    }

    res.json({ resolved: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/workflow/pending
 */
router.get('/pending', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const pending = getPendingReviews();
    res.json({ pending, count: pending.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/workflow/by-stage/:stage
 */
router.get('/by-stage/:stage', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { stage } = req.params;
    const content = getContentByStage(stage as WorkflowStage);
    res.json({ content, count: content.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/workflow/stats
 */
router.get('/stats', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const stats = getWorkflowStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/workflow/config
 */
router.get('/config', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const config = getWorkflowConfig();
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/workflow/config
 */
router.put('/config', requireEnabled, async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const config = updateWorkflowConfig('default', updates);

    if (!config) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as workflowRoutes };
