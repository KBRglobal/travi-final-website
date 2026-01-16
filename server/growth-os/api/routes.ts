/**
 * Growth OS API Routes
 *
 * Express routes for the Executive Growth Feed API.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getFeed,
  getDashboardSummary,
  getActionQueue,
  markRead,
  dismissItem,
  generateFeed,
} from './feed';
import { signalRegistry, aggregateByCategory, getDecayStats } from '../signals';
import { planRegistry, approvePlan, executePlan, getPlanSummary, getExecutionStats } from '../actions';
import { checkReadiness, getAllPolicies } from '../safety';
import { isApiEnabled, getGrowthOSConfig } from '../config';
import { log } from '../../lib/logger';

const router = Router();

/**
 * Middleware to check if API is enabled
 */
function checkEnabled(req: Request, res: Response, next: () => void) {
  if (!isApiEnabled()) {
    return res.status(503).json({
      code: 'GROWTH_OS_DISABLED',
      message: 'Growth OS API is disabled',
    });
  }
  next();
}

router.use(checkEnabled);

/**
 * GET /api/growth-os/feed
 * Get the executive growth feed
 */
router.get('/feed', (req: Request, res: Response) => {
  try {
    const filter = {
      types: req.query.types ? (req.query.types as string).split(',') as any[] : undefined,
      priorities: req.query.priorities ? (req.query.priorities as string).split(',') as any[] : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') as any[] : undefined,
      includeRead: req.query.includeRead === 'true',
      includeDismissed: req.query.includeDismissed === 'true',
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };

    const feed = getFeed(filter);
    res.json(feed);
  } catch (error) {
    log.error('[GrowthOS] Feed error:', error);
    res.status(500).json({
      code: 'FEED_ERROR',
      message: 'Failed to generate feed',
    });
  }
});

/**
 * POST /api/growth-os/feed/:id/read
 * Mark a feed item as read
 */
router.post('/feed/:id/read', (req: Request, res: Response) => {
  const success = markRead(req.params.id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Feed item not found',
    });
  }
});

/**
 * POST /api/growth-os/feed/:id/dismiss
 * Dismiss a feed item
 */
router.post('/feed/:id/dismiss', (req: Request, res: Response) => {
  const success = dismissItem(req.params.id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Feed item not found',
    });
  }
});

/**
 * GET /api/growth-os/dashboard
 * Get dashboard summary
 */
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const summary = getDashboardSummary();
    res.json(summary);
  } catch (error) {
    log.error('[GrowthOS] Dashboard error:', error);
    res.status(500).json({
      code: 'DASHBOARD_ERROR',
      message: 'Failed to generate dashboard',
    });
  }
});

/**
 * GET /api/growth-os/queue
 * Get action queue
 */
router.get('/queue', (req: Request, res: Response) => {
  try {
    const queue = getActionQueue();
    res.json(queue);
  } catch (error) {
    log.error('[GrowthOS] Queue error:', error);
    res.status(500).json({
      code: 'QUEUE_ERROR',
      message: 'Failed to get action queue',
    });
  }
});

/**
 * GET /api/growth-os/signals
 * Get signal aggregations
 */
router.get('/signals', (req: Request, res: Response) => {
  try {
    const aggregations = aggregateByCategory();
    const stats = signalRegistry.getStats();
    const decayStats = getDecayStats();

    res.json({
      aggregations,
      stats,
      decayStats,
    });
  } catch (error) {
    log.error('[GrowthOS] Signals error:', error);
    res.status(500).json({
      code: 'SIGNALS_ERROR',
      message: 'Failed to get signals',
    });
  }
});

/**
 * GET /api/growth-os/plans
 * Get action plans
 */
router.get('/plans', (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    let plans = planRegistry.getAll();

    if (status) {
      plans = plans.filter(p => p.status === status);
    }

    const summaries = plans.map(getPlanSummary);
    res.json({ plans: summaries, total: summaries.length });
  } catch (error) {
    log.error('[GrowthOS] Plans error:', error);
    res.status(500).json({
      code: 'PLANS_ERROR',
      message: 'Failed to get plans',
    });
  }
});

/**
 * GET /api/growth-os/plans/:id
 * Get plan details
 */
router.get('/plans/:id', (req: Request, res: Response) => {
  try {
    const plan = planRegistry.get(req.params.id);
    if (!plan) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Plan not found',
      });
    }

    const readiness = checkReadiness(plan);
    res.json({ plan, readiness });
  } catch (error) {
    log.error('[GrowthOS] Plan error:', error);
    res.status(500).json({
      code: 'PLAN_ERROR',
      message: 'Failed to get plan',
    });
  }
});

/**
 * POST /api/growth-os/plans/:id/approve
 * Approve a plan
 */
router.post('/plans/:id/approve', (req: Request, res: Response) => {
  try {
    const plan = planRegistry.get(req.params.id);
    if (!plan) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Plan not found',
      });
    }

    const approvedBy = req.body.approvedBy || 'admin';
    const approved = approvePlan(plan, approvedBy);
    planRegistry.update(approved);

    res.json({ success: true, plan: getPlanSummary(approved) });
  } catch (error) {
    log.error('[GrowthOS] Approval error:', error);
    res.status(500).json({
      code: 'APPROVAL_ERROR',
      message: 'Failed to approve plan',
    });
  }
});

/**
 * POST /api/growth-os/plans/:id/execute
 * Execute a plan
 */
router.post('/plans/:id/execute', async (req: Request, res: Response) => {
  try {
    const plan = planRegistry.get(req.params.id);
    if (!plan) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Plan not found',
      });
    }

    const readiness = checkReadiness(plan);
    if (readiness.status !== 'ready') {
      return res.status(400).json({
        code: 'NOT_READY',
        message: `Plan is not ready: ${readiness.status}`,
        readiness,
      });
    }

    const dryRun = req.query.dryRun === 'true';
    const result = await executePlan(plan, { dryRun });

    res.json(result);
  } catch (error) {
    log.error('[GrowthOS] Execution error:', error);
    res.status(500).json({
      code: 'EXECUTION_ERROR',
      message: 'Failed to execute plan',
    });
  }
});

/**
 * GET /api/growth-os/policies
 * Get all policies
 */
router.get('/policies', (req: Request, res: Response) => {
  try {
    const policies = getAllPolicies();
    res.json({ policies });
  } catch (error) {
    log.error('[GrowthOS] Policies error:', error);
    res.status(500).json({
      code: 'POLICIES_ERROR',
      message: 'Failed to get policies',
    });
  }
});

/**
 * GET /api/growth-os/stats
 * Get execution statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const execution = getExecutionStats();
    const signals = signalRegistry.getStats();
    const decay = getDecayStats();
    const config = getGrowthOSConfig();

    res.json({
      execution,
      signals,
      decay,
      config: {
        enabled: config.enabled,
        subsystems: {
          signals: config.enableSignals,
          prioritization: config.enablePrioritization,
          actions: config.enableActions,
          safety: config.enableSafety,
          api: config.enableApi,
        },
      },
    });
  } catch (error) {
    log.error('[GrowthOS] Stats error:', error);
    res.status(500).json({
      code: 'STATS_ERROR',
      message: 'Failed to get stats',
    });
  }
});

/**
 * POST /api/growth-os/refresh
 * Refresh the feed
 */
router.post('/refresh', (req: Request, res: Response) => {
  try {
    generateFeed();
    res.json({ success: true, timestamp: new Date() });
  } catch (error) {
    log.error('[GrowthOS] Refresh error:', error);
    res.status(500).json({
      code: 'REFRESH_ERROR',
      message: 'Failed to refresh feed',
    });
  }
});

export default router;
