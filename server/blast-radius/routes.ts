/**
 * Blast Radius & Impact Simulator - API Routes
 * Feature Flag: ENABLE_BLAST_RADIUS=false
 */

import { Router, Request, Response, NextFunction } from 'express';
import { isBlastRadiusEnabled, BLAST_RADIUS_CONFIG } from './config';
import {
  simulateBlastRadius,
  simulateMultiple,
  compareScenarios,
  getSimulationHistory,
  getStatus,
  clearCache,
} from './simulator';
import type { ImpactTarget, ImpactScope } from './types';

const router = Router();

// Feature flag middleware
function requireEnabled(req: Request, res: Response, next: NextFunction): void {
  if (!isBlastRadiusEnabled()) {
    res.status(503).json({ error: 'Blast radius simulator is not enabled' });
    return;
  }
  next();
}

// Validate target
function validateTarget(target: unknown): target is ImpactTarget {
  if (!target || typeof target !== 'object') return false;
  const t = target as Record<string, unknown>;
  const validScopes: ImpactScope[] = ['feature', 'entity', 'locale', 'segment', 'all'];
  return typeof t.type === 'string' && validScopes.includes(t.type as ImpactScope) && typeof t.id === 'string';
}

// GET /api/ops/blast-radius/status - Get simulator status
router.get('/status', (req: Request, res: Response) => {
  res.json(getStatus());
});

// GET /api/ops/blast-radius/config - Get configuration
router.get('/config', (req: Request, res: Response) => {
  res.json({
    enabled: isBlastRadiusEnabled(),
    config: {
      totalUsers: BLAST_RADIUS_CONFIG.totalUsers,
      totalContent: BLAST_RADIUS_CONFIG.totalContent,
      severityThresholds: BLAST_RADIUS_CONFIG.severityThresholds,
    },
  });
});

// POST /api/ops/blast-radius/simulate - Simulate single target
router.post('/simulate', requireEnabled, async (req: Request, res: Response) => {
  const { target } = req.body;

  if (!validateTarget(target)) {
    res.status(400).json({ error: 'Invalid target. Required: { type: "feature"|"entity"|"locale"|"segment"|"all", id: string }' });
    return;
  }

  try {
    const result = await simulateBlastRadius(target);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/ops/blast-radius/simulate/multiple - Simulate multiple targets
router.post('/simulate/multiple', requireEnabled, async (req: Request, res: Response) => {
  const { targets } = req.body;

  if (!Array.isArray(targets) || targets.length === 0) {
    res.status(400).json({ error: 'targets array is required' });
    return;
  }

  if (!targets.every(validateTarget)) {
    res.status(400).json({ error: 'All targets must be valid' });
    return;
  }

  try {
    const results = await simulateMultiple(targets);
    const comparison = compareScenarios(results);
    res.json({ results, comparison });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/blast-radius/simulate/feature/:id - Quick feature simulation
router.get('/simulate/feature/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const result = await simulateBlastRadius({ type: 'feature', id: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/blast-radius/simulate/locale/:id - Quick locale simulation
router.get('/simulate/locale/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const result = await simulateBlastRadius({ type: 'locale', id: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/blast-radius/simulate/entity/:id - Quick entity simulation
router.get('/simulate/entity/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const result = await simulateBlastRadius({ type: 'entity', id: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/ops/blast-radius/history - Get simulation history
router.get('/history', requireEnabled, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = getSimulationHistory(limit);
  res.json({ history, count: history.length });
});

// POST /api/ops/blast-radius/cache/clear - Clear cache
router.post('/cache/clear', requireEnabled, (req: Request, res: Response) => {
  clearCache();
  res.json({ success: true });
});

export default router;
