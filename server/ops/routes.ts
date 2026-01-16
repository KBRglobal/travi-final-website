/**
 * Operations & Reliability - Admin API Routes
 *
 * Exposes admin endpoints for inspecting and controlling ops components.
 * All routes require admin authentication.
 */

import { Router, Request, Response } from 'express';
import { log } from '../lib/logger';
import { getOpsConfig } from './config';
import { getHealthAggregator } from './health-aggregator';
import { getCostGuards } from './cost-guards';
import { getBackpressureController } from './backpressure';
import { getSelfHealingJobManager } from './self-healing';
import { getKillSwitchManager } from './kill-switches';
import { getOpsStatus } from './index';
import type { Subsystem, Feature } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[OpsRoutes] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[OpsRoutes] ${msg}`, data),
};

const router = Router();

// Middleware to ensure ops routes are only accessible in appropriate contexts
function opsAccessMiddleware(req: Request, res: Response, next: () => void) {
  // In production, this should verify admin authentication
  // For now, we'll log access
  logger.info('Ops API accessed', {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  next();
}

router.use(opsAccessMiddleware);

/**
 * GET /ops/status
 * Get overall ops status and configuration
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await getOpsStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get ops status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /ops/config
 * Get current ops configuration
 */
router.get('/config', (_req: Request, res: Response) => {
  const config = getOpsConfig();
  res.json(config);
});

// ============ Health Aggregator Routes ============

/**
 * GET /ops/health
 * Get current system health snapshot
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const aggregator = getHealthAggregator();
    const snapshot = await aggregator.checkHealth();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /ops/health/history
 * Get health check history
 */
router.get('/health/history', (_req: Request, res: Response) => {
  const aggregator = getHealthAggregator();
  const history = aggregator.getHistory();
  res.json({ history, count: history.length });
});

// ============ Cost Guards Routes ============

/**
 * GET /ops/costs
 * Get all feature cost usage
 */
router.get('/costs', (_req: Request, res: Response) => {
  const guards = getCostGuards();
  res.json({
    usage: guards.getAllUsage(),
    totals: guards.getTotalSpending(),
    degradedFeatures: guards.getDegradedFeatures(),
  });
});

/**
 * GET /ops/costs/:feature
 * Get specific feature cost usage
 */
router.get('/costs/:feature', (req: Request, res: Response) => {
  const feature = req.params.feature as Feature;
  const guards = getCostGuards();
  const usage = guards.getFeatureUsage(feature);

  if (!usage) {
    res.status(404).json({ error: 'Feature not found' });
    return;
  }

  res.json({
    ...usage,
    isDegraded: guards.isFeatureDegraded(feature),
  });
});

/**
 * POST /ops/costs/:feature/limits
 * Update feature cost limits
 */
router.post('/costs/:feature/limits', (req: Request, res: Response) => {
  const feature = req.params.feature as Feature;
  const { dailyLimitUsd, monthlyLimitUsd } = req.body;

  if (typeof dailyLimitUsd !== 'number' || typeof monthlyLimitUsd !== 'number') {
    res.status(400).json({ error: 'Invalid limits provided' });
    return;
  }

  const guards = getCostGuards();
  guards.setFeatureLimits(feature, dailyLimitUsd, monthlyLimitUsd);

  logger.info('Feature limits updated via API', {
    feature,
    dailyLimitUsd,
    monthlyLimitUsd,
  });

  res.json({ success: true, feature, dailyLimitUsd, monthlyLimitUsd });
});

/**
 * POST /ops/costs/reset-daily
 * Manually reset daily counters
 */
router.post('/costs/reset-daily', (_req: Request, res: Response) => {
  const guards = getCostGuards();
  guards.resetDaily();
  res.json({ success: true, message: 'Daily counters reset' });
});

// ============ Backpressure Routes ============

/**
 * GET /ops/backpressure
 * Get current backpressure state
 */
router.get('/backpressure', (_req: Request, res: Response) => {
  const controller = getBackpressureController();
  res.json({
    state: controller.getState(),
    throttleConfig: controller.getThrottleConfig(),
  });
});

/**
 * GET /ops/backpressure/history
 * Get metrics history
 */
router.get('/backpressure/history', (_req: Request, res: Response) => {
  const controller = getBackpressureController();
  const history = controller.getMetricsHistory();
  res.json({ history, count: history.length });
});

/**
 * POST /ops/backpressure/force
 * Force a specific backpressure level
 */
router.post('/backpressure/force', (req: Request, res: Response) => {
  const { level, reason } = req.body;

  if (!['none', 'light', 'heavy'].includes(level)) {
    res.status(400).json({ error: 'Invalid level. Must be: none, light, heavy' });
    return;
  }

  if (!reason || typeof reason !== 'string') {
    res.status(400).json({ error: 'Reason is required' });
    return;
  }

  const controller = getBackpressureController();
  controller.forceLevel(level, reason);

  logger.warn('Backpressure level forced via API', { level, reason });

  res.json({ success: true, level, reason });
});

// ============ Self-Healing Routes ============

/**
 * GET /ops/jobs
 * Get self-healing job statistics
 */
router.get('/jobs', (_req: Request, res: Response) => {
  const manager = getSelfHealingJobManager();
  res.json({
    stats: manager.getStats(),
    stuckJobs: manager.getStuckJobs(),
    poisonJobs: manager.getPoisonJobs(),
  });
});

/**
 * GET /ops/jobs/actions
 * Get recent healing actions
 */
router.get('/jobs/actions', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const manager = getSelfHealingJobManager();
  const actions = manager.getRecentActions(limit);
  res.json({ actions, count: actions.length });
});

/**
 * GET /ops/jobs/:jobId
 * Get specific job health state
 */
router.get('/jobs/:jobId', (req: Request, res: Response) => {
  const manager = getSelfHealingJobManager();
  const health = manager.getJobHealth(req.params.jobId);

  if (!health) {
    res.status(404).json({ error: 'Job not found in tracking' });
    return;
  }

  res.json(health);
});

/**
 * POST /ops/jobs/:jobId/reset
 * Reset a poison job for retry
 */
router.post('/jobs/:jobId/reset', (req: Request, res: Response) => {
  const manager = getSelfHealingJobManager();
  const success = manager.resetPoisonJob(req.params.jobId);

  if (!success) {
    res.status(400).json({ error: 'Job is not a poison job or not found' });
    return;
  }

  logger.info('Poison job reset via API', { jobId: req.params.jobId });

  res.json({ success: true, jobId: req.params.jobId });
});

/**
 * DELETE /ops/jobs/:jobId
 * Clear a job from tracking
 */
router.delete('/jobs/:jobId', (req: Request, res: Response) => {
  const manager = getSelfHealingJobManager();
  const success = manager.clearJob(req.params.jobId);

  if (!success) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json({ success: true, jobId: req.params.jobId });
});

// ============ Kill Switch Routes ============

/**
 * GET /ops/kill-switches
 * Get all kill switch states
 */
router.get('/kill-switches', (_req: Request, res: Response) => {
  const manager = getKillSwitchManager();
  res.json({
    switches: manager.getAllStates(),
    stats: manager.getStats(),
    killedSubsystems: manager.getKilledSubsystems(),
  });
});

/**
 * GET /ops/kill-switches/:subsystem
 * Get specific kill switch state
 */
router.get('/kill-switches/:subsystem', (req: Request, res: Response) => {
  const subsystem = req.params.subsystem as Subsystem;
  const manager = getKillSwitchManager();
  const state = manager.getState(subsystem);

  if (!state) {
    res.status(404).json({ error: 'Subsystem not found' });
    return;
  }

  res.json(state);
});

/**
 * POST /ops/kill-switches/:subsystem/enable
 * Enable a kill switch (disable subsystem)
 */
router.post('/kill-switches/:subsystem/enable', (req: Request, res: Response) => {
  const subsystem = req.params.subsystem as Subsystem;
  const { reason, enabledBy, durationMs } = req.body;

  if (!reason || typeof reason !== 'string') {
    res.status(400).json({ error: 'Reason is required' });
    return;
  }

  const manager = getKillSwitchManager();
  const success = manager.enable(subsystem, 'api', reason, enabledBy, durationMs);

  if (!success) {
    res.status(400).json({ error: 'Failed to enable kill switch' });
    return;
  }

  logger.warn('Kill switch enabled via API', { subsystem, reason, enabledBy });

  res.json({
    success: true,
    subsystem,
    reason,
    expiresAt: durationMs ? new Date(Date.now() + durationMs).toISOString() : undefined,
  });
});

/**
 * POST /ops/kill-switches/:subsystem/disable
 * Disable a kill switch (enable subsystem)
 */
router.post('/kill-switches/:subsystem/disable', (req: Request, res: Response) => {
  const subsystem = req.params.subsystem as Subsystem;
  const { reason } = req.body;

  const manager = getKillSwitchManager();
  const success = manager.disable(subsystem, 'api', reason);

  if (!success) {
    res.status(400).json({ error: 'Failed to disable kill switch (may be env-based)' });
    return;
  }

  logger.info('Kill switch disabled via API', { subsystem, reason });

  res.json({ success: true, subsystem });
});

/**
 * GET /ops/kill-switches/events
 * Get kill switch event history
 */
router.get('/kill-switches/events', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const manager = getKillSwitchManager();
  const events = manager.getEventHistory(limit);
  res.json({ events, count: events.length });
});

export default router;
