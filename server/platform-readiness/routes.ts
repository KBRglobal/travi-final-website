/**
 * Platform Readiness - Admin Routes
 * Feature Flag: ENABLE_PLATFORM_READINESS=false
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';
import { isPlatformReadinessEnabled, READINESS_CONFIG, SIGNAL_SOURCES } from './config';
import { evaluateReadiness, simulateGoLive, getBlockers, clearCache } from './evaluator';
import type { PlatformReadinessFeatureStatus } from './types';

const logger = createLogger('platform-readiness-routes');
const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requirePlatformReadiness(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isPlatformReadinessEnabled()) {
    res.status(404).json({
      error: 'Platform readiness is not enabled',
      hint: 'Set ENABLE_PLATFORM_READINESS=true to enable this feature',
    });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin/readiness/status
 * Get full platform readiness status
 */
router.get('/status', requirePlatformReadiness, async (req: Request, res: Response) => {
  try {
    const refresh = req.query.refresh === 'true';
    const status = await evaluateReadiness(!refresh);
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get readiness status');
    res.status(500).json({ error: 'Failed to evaluate readiness' });
  }
});

/**
 * GET /api/admin/readiness/blockers
 * Get only blocking issues
 */
router.get('/blockers', requirePlatformReadiness, async (req: Request, res: Response) => {
  try {
    const status = await evaluateReadiness();
    res.json({
      blockers: status.blockers,
      warnings: status.warnings,
      canGoLive: status.canGoLive,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get blockers');
    res.status(500).json({ error: 'Failed to get blockers' });
  }
});

/**
 * GET /api/admin/readiness/checklist
 * Get go-live checklist
 */
router.get('/checklist', requirePlatformReadiness, async (req: Request, res: Response) => {
  try {
    const status = await evaluateReadiness();
    res.json(status.checklist);
  } catch (error) {
    logger.error({ error }, 'Failed to get checklist');
    res.status(500).json({ error: 'Failed to get checklist' });
  }
});

/**
 * POST /api/admin/readiness/simulate-go-live
 * Simulate a go-live attempt
 */
router.post('/simulate-go-live', requirePlatformReadiness, async (req: Request, res: Response) => {
  try {
    const result = await simulateGoLive();
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to simulate go-live');
    res.status(500).json({ error: 'Failed to simulate go-live' });
  }
});

/**
 * GET /api/admin/readiness/feature-status
 * Get feature configuration
 */
router.get('/feature-status', requirePlatformReadiness, (req: Request, res: Response) => {
  try {
    const status: PlatformReadinessFeatureStatus = {
      enabled: isPlatformReadinessEnabled(),
      config: {
        blockingThreshold: READINESS_CONFIG.blockingThreshold,
        warningThreshold: READINESS_CONFIG.warningThreshold,
        signalSources: SIGNAL_SOURCES,
      },
    };
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get feature status');
    res.status(500).json({ error: 'Failed to get feature status' });
  }
});

/**
 * POST /api/admin/readiness/cache/clear
 * Clear cached evaluation
 */
router.post('/cache/clear', requirePlatformReadiness, (req: Request, res: Response) => {
  try {
    clearCache();
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    logger.error({ error }, 'Failed to clear cache');
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
