/**
 * Go-Live Checklist - Admin Routes
 * Feature Flag: ENABLE_GO_LIVE_CHECKLIST=true
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';
import { isGoLiveChecklistEnabled, getEnabledChecks, getCriticalChecks } from './config';
import { evaluateGoLiveStatus, runSmokeTest, clearCache } from './evaluator';
import type { GoLiveFeatureStatus } from './types';

const logger = createLogger('go-live-routes');
const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireGoLiveEnabled(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isGoLiveChecklistEnabled()) {
    res.status(404).json({
      error: 'Go-live checklist is not enabled',
      hint: 'Set ENABLE_GO_LIVE_CHECKLIST=true to enable this feature',
    });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin/go-live/status
 * Get current go-live readiness status
 */
router.get('/status', requireGoLiveEnabled, async (req: Request, res: Response) => {
  try {
    const useCache = req.query.refresh !== 'true';
    const status = await evaluateGoLiveStatus(useCache);
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to evaluate go-live status');
    res.status(500).json({ error: 'Failed to evaluate go-live status' });
  }
});

/**
 * POST /api/admin/go-live/smoke
 * Run deeper smoke tests (no cache)
 */
router.post('/smoke', requireGoLiveEnabled, async (req: Request, res: Response) => {
  try {
    const result = await runSmokeTest();
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to run smoke test');
    res.status(500).json({ error: 'Failed to run smoke test' });
  }
});

/**
 * GET /api/admin/go-live/checks
 * Get list of available checks
 */
router.get('/checks', requireGoLiveEnabled, (req: Request, res: Response) => {
  try {
    const enabled = getEnabledChecks();
    const critical = getCriticalChecks();

    res.json({
      checks: enabled,
      criticalCheckIds: critical.map(c => c.id),
      total: enabled.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get checks');
    res.status(500).json({ error: 'Failed to get checks' });
  }
});

/**
 * POST /api/admin/go-live/cache/clear
 * Clear cached results
 */
router.post('/cache/clear', requireGoLiveEnabled, (req: Request, res: Response) => {
  try {
    clearCache();
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    logger.error({ error }, 'Failed to clear cache');
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * GET /api/admin/go-live/feature-status
 * Get go-live feature configuration
 */
router.get('/feature-status', requireGoLiveEnabled, (req: Request, res: Response) => {
  try {
    const status: GoLiveFeatureStatus = {
      enabled: isGoLiveChecklistEnabled(),
      config: {
        checksEnabled: getEnabledChecks().map(c => c.id),
        criticalChecks: getCriticalChecks().map(c => c.id),
      },
    };
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get feature status');
    res.status(500).json({ error: 'Failed to get feature status' });
  }
});

export default router;
