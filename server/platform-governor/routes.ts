/**
 * Autonomous Platform Governor - Admin Routes
 * Feature Flag: ENABLE_PLATFORM_GOVERNOR=false
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';
import { isPlatformGovernorEnabled, GOVERNOR_CONFIG } from './config';
import { getAllRules, getEnabledRules } from './rules';
import {
  evaluateRules,
  getActiveRestrictions,
  getRecentDecisions,
  getAuditLog,
  overrideDecision,
  resetAllRestrictions,
} from './decision-engine';
import { collectContext } from './context-collector';
import type { GovernorStatus, GovernorFeatureStatus } from './types';

const logger = createLogger('platform-governor-routes');
const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requirePlatformGovernor(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isPlatformGovernorEnabled()) {
    res.status(404).json({
      error: 'Platform governor is not enabled',
      hint: 'Set ENABLE_PLATFORM_GOVERNOR=true to enable this feature',
    });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin/governor/status
 * Get current governor status
 */
router.get('/status', requirePlatformGovernor, async (req: Request, res: Response) => {
  try {
    const rules = getAllRules();
    const enabledRules = getEnabledRules();
    const restrictions = getActiveRestrictions();
    const decisions = getRecentDecisions(10);

    const status: GovernorStatus = {
      enabled: isPlatformGovernorEnabled(),
      activeRestrictions: restrictions,
      recentDecisions: decisions,
      rulesCount: rules.length,
      enabledRulesCount: enabledRules.length,
      lastEvaluationAt: decisions[0]?.triggeredAt,
    };

    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get governor status');
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * GET /api/admin/governor/decisions
 * Get recent decisions with optional limit
 */
router.get('/decisions', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const decisions = getRecentDecisions(limit);
    res.json({ decisions, count: decisions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get decisions');
    res.status(500).json({ error: 'Failed to get decisions' });
  }
});

/**
 * GET /api/admin/governor/audit
 * Get audit log
 */
router.get('/audit', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const entries = getAuditLog(limit);
    res.json({ entries, count: entries.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get audit log');
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

/**
 * GET /api/admin/governor/restrictions
 * Get active restrictions
 */
router.get('/restrictions', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const restrictions = getActiveRestrictions();
    res.json({ restrictions, count: restrictions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get restrictions');
    res.status(500).json({ error: 'Failed to get restrictions' });
  }
});

/**
 * GET /api/admin/governor/rules
 * Get all rules
 */
router.get('/rules', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const rules = getAllRules();
    const enabled = getEnabledRules();
    res.json({
      rules,
      total: rules.length,
      enabled: enabled.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get rules');
    res.status(500).json({ error: 'Failed to get rules' });
  }
});

/**
 * GET /api/admin/governor/context
 * Get current context (for debugging)
 */
router.get('/context', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const context = collectContext();
    res.json(context);
  } catch (error) {
    logger.error({ error }, 'Failed to get context');
    res.status(500).json({ error: 'Failed to get context' });
  }
});

/**
 * POST /api/admin/governor/evaluate
 * Manually trigger rule evaluation
 */
router.post('/evaluate', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const context = collectContext();
    const decisions = evaluateRules(context);
    res.json({
      evaluated: true,
      newDecisions: decisions,
      count: decisions.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to evaluate rules');
    res.status(500).json({ error: 'Failed to evaluate' });
  }
});

/**
 * POST /api/admin/governor/override
 * Override a specific decision
 */
router.post('/override', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const { decisionId, actorId = 'admin' } = req.body;

    if (!decisionId) {
      res.status(400).json({ error: 'decisionId is required' });
      return;
    }

    const success = overrideDecision(decisionId, actorId);

    if (!success) {
      res.status(404).json({ error: 'Decision not found' });
      return;
    }

    res.json({ success: true, message: 'Decision overridden' });
  } catch (error) {
    logger.error({ error }, 'Failed to override decision');
    res.status(500).json({ error: 'Failed to override' });
  }
});

/**
 * POST /api/admin/governor/reset
 * Reset all restrictions
 */
router.post('/reset', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const { actorId = 'admin' } = req.body;
    resetAllRestrictions(actorId);
    res.json({ success: true, message: 'All restrictions reset' });
  } catch (error) {
    logger.error({ error }, 'Failed to reset restrictions');
    res.status(500).json({ error: 'Failed to reset' });
  }
});

/**
 * GET /api/admin/governor/feature-status
 * Get feature configuration
 */
router.get('/feature-status', requirePlatformGovernor, (req: Request, res: Response) => {
  try {
    const status: GovernorFeatureStatus = {
      enabled: isPlatformGovernorEnabled(),
      config: {
        evaluationIntervalMs: GOVERNOR_CONFIG.evaluationIntervalMs,
        maxDecisionsStored: GOVERNOR_CONFIG.maxDecisionsStored,
        defaultCooldownMs: GOVERNOR_CONFIG.defaultCooldownMs,
      },
    };
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get feature status');
    res.status(500).json({ error: 'Failed to get feature status' });
  }
});

export default router;
