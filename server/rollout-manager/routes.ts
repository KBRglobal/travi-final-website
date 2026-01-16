/**
 * Release & Rollout Manager - Routes
 */

import { Router, Request, Response } from 'express';
import { isRolloutManagerEnabled, ReleaseStatus, RolloutStrategy, RolloutMetrics } from './types';
import {
  createRelease,
  getRelease,
  updateRelease,
  addReleaseItem,
  removeReleaseItem,
  startRelease,
  advanceStage,
  rollbackRelease,
  cancelRelease,
  getAllReleases,
  getReleaseEvents,
  isUserInRollout,
  getFeatureFlags,
  recordRolloutMetrics,
  getReleaseStats,
  getScheduledReleases,
  getRollbackHistory,
} from './rollout-engine';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isRolloutManagerEnabled()) {
    res.status(503).json({
      error: 'Rollout Manager is disabled',
      hint: 'Set ENABLE_ROLLOUT_MANAGER=true to enable',
    });
    return;
  }
  next();
}

/**
 * POST /api/admin/releases
 * Create a new release.
 */
router.post('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { name, version, strategy, description, items, stages, scheduledAt, metadata, createdBy } = req.body;

    if (!name || !version || !strategy) {
      res.status(400).json({ error: 'name, version, and strategy are required' });
      return;
    }

    const release = createRelease(name, version, strategy as RolloutStrategy, createdBy || 'admin', {
      description,
      items,
      stages,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      metadata,
    });

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/releases
 * Get all releases.
 */
router.get('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as ReleaseStatus | undefined;
    const strategy = req.query.strategy as RolloutStrategy | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const releases = getAllReleases({ status, strategy, limit, offset });
    res.json({ releases, count: releases.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/releases/:id
 * Get release by ID.
 */
router.get('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const release = getRelease(id);

    if (!release) {
      res.status(404).json({ error: 'Release not found' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/releases/:id
 * Update release.
 */
router.put('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const release = updateRelease(id, updates);

    if (!release) {
      res.status(404).json({ error: 'Release not found' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/releases/:id/items
 * Add item to release.
 */
router.post('/:id/items', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = req.body;

    if (!item.type || !item.name) {
      res.status(400).json({ error: 'type and name are required' });
      return;
    }

    const release = addReleaseItem(id, item);

    if (!release) {
      res.status(404).json({ error: 'Release not found' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * DELETE /api/admin/releases/:id/items/:itemId
 * Remove item from release.
 */
router.delete('/:id/items/:itemId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;

    const release = removeReleaseItem(id, itemId);

    if (!release) {
      res.status(404).json({ error: 'Release not found' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/releases/:id/start
 * Start a release.
 */
router.post('/:id/start', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const release = startRelease(id);

    if (!release) {
      res.status(404).json({ error: 'Release not found' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/releases/:id/advance
 * Advance to next stage.
 */
router.post('/:id/advance', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { metrics } = req.body;

    const release = advanceStage(id, metrics as RolloutMetrics | undefined);

    if (!release) {
      res.status(404).json({ error: 'Release not found' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/releases/:id/rollback
 * Rollback a release.
 */
router.post('/:id/rollback', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, triggeredBy, automatic } = req.body;

    if (!reason) {
      res.status(400).json({ error: 'reason is required' });
      return;
    }

    const release = rollbackRelease(id, reason, triggeredBy || 'admin', automatic || false);

    if (!release) {
      res.status(404).json({ error: 'Release not found' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/releases/:id/cancel
 * Cancel a release.
 */
router.post('/:id/cancel', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const release = cancelRelease(id);

    if (!release) {
      res.status(404).json({ error: 'Release not found' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/releases/:id/events
 * Get release events.
 */
router.get('/:id/events', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const events = getReleaseEvents(id, limit);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/releases/:id/metrics
 * Record rollout metrics.
 */
router.post('/:id/metrics', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const metrics = req.body as RolloutMetrics;

    const release = recordRolloutMetrics(id, metrics);

    if (!release) {
      res.status(404).json({ error: 'Release not found or not in progress' });
      return;
    }

    res.json({ release });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/releases/check-user
 * Check if user is in rollout.
 */
router.post('/check-user', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { releaseId, userId, userGroups } = req.body;

    if (!releaseId || !userId) {
      res.status(400).json({ error: 'releaseId and userId are required' });
      return;
    }

    const inRollout = isUserInRollout(releaseId, userId, userGroups || []);
    res.json({ inRollout });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/releases/feature-flags
 * Get all feature flags.
 */
router.get('/feature-flags', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const flags = getFeatureFlags();
    res.json({ flags });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/releases/stats
 * Get release stats.
 */
router.get('/stats', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const stats = getReleaseStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/releases/scheduled
 * Get scheduled releases.
 */
router.get('/scheduled', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const releases = getScheduledReleases();
    res.json({ releases });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/releases/rollback-history
 * Get rollback history.
 */
router.get('/rollback-history', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = getRollbackHistory(limit);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/releases/events
 * Get all events.
 */
router.get('/events', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = getReleaseEvents(undefined, limit);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as rolloutManagerRoutes };
