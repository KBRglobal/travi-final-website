/**
 * Entity Quality: Dedup Scanner - Admin Routes
 * Feature Flag: ENABLE_ENTITY_QUALITY=true
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger';
import { isEntityQualityEnabled, ENTITY_QUALITY_CONFIG } from './config';
import {
  querySuggestions,
  getSuggestionById,
  ignoreSuggestion,
  markAsMerged,
  getSuggestionStats,
  getOpenCount,
} from './suggestion-store';
import type { EntityType, SuggestionStatus, EntityQualityStatus } from './types';

const logger = createLogger('entity-quality-routes');
const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireEntityQualityEnabled(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isEntityQualityEnabled()) {
    res.status(404).json({
      error: 'Entity quality is not enabled',
      hint: 'Set ENABLE_ENTITY_QUALITY=true to enable this feature',
    });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin/entity-quality/suggestions
 * Get merge suggestions with filters
 */
router.get('/suggestions', requireEntityQualityEnabled, (req: Request, res: Response) => {
  try {
    const { entityType, status, minConfidence, limit, offset } = req.query;

    const suggestions = querySuggestions({
      entityType: entityType as EntityType | undefined,
      status: status as SuggestionStatus | undefined,
      minConfidence: minConfidence ? parseInt(minConfidence as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({ suggestions, count: suggestions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get suggestions');
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * GET /api/admin/entity-quality/suggestions/:id
 * Get a specific suggestion
 */
router.get('/suggestions/:id', requireEntityQualityEnabled, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const suggestion = getSuggestionById(id);

    if (!suggestion) {
      res.status(404).json({ error: 'Suggestion not found' });
      return;
    }

    res.json(suggestion);
  } catch (error) {
    logger.error({ error, suggestionId: req.params.id }, 'Failed to get suggestion');
    res.status(500).json({ error: 'Failed to get suggestion' });
  }
});

/**
 * POST /api/admin/entity-quality/suggestions/:id/ignore
 * Ignore a merge suggestion
 */
router.post('/suggestions/:id/ignore', requireEntityQualityEnabled, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.body.actorId || 'admin';

    const suggestion = ignoreSuggestion(id, actorId);

    if (!suggestion) {
      res.status(404).json({ error: 'Suggestion not found' });
      return;
    }

    logger.info({ suggestionId: id, actorId }, 'Suggestion ignored');
    res.json(suggestion);
  } catch (error) {
    logger.error({ error, suggestionId: req.params.id }, 'Failed to ignore suggestion');
    res.status(500).json({ error: 'Failed to ignore suggestion' });
  }
});

/**
 * POST /api/admin/entity-quality/suggestions/:id/mark-merged
 * Mark a suggestion as merged (actual merge done elsewhere)
 */
router.post('/suggestions/:id/mark-merged', requireEntityQualityEnabled, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.body.actorId || 'admin';

    const suggestion = markAsMerged(id, actorId);

    if (!suggestion) {
      res.status(404).json({ error: 'Suggestion not found' });
      return;
    }

    logger.info({ suggestionId: id, actorId }, 'Suggestion marked as merged');
    res.json(suggestion);
  } catch (error) {
    logger.error({ error, suggestionId: req.params.id }, 'Failed to mark as merged');
    res.status(500).json({ error: 'Failed to mark as merged' });
  }
});

/**
 * GET /api/admin/entity-quality/stats
 * Get suggestion statistics
 */
router.get('/stats', requireEntityQualityEnabled, (req: Request, res: Response) => {
  try {
    const stats = getSuggestionStats();
    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Failed to get entity quality stats');
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/admin/entity-quality/status
 * Get feature status
 */
router.get('/status', requireEntityQualityEnabled, (req: Request, res: Response) => {
  try {
    const stats = getSuggestionStats();
    const status: EntityQualityStatus = {
      enabled: isEntityQualityEnabled(),
      totalSuggestions: stats.total,
      openSuggestions: stats.open,
      config: {
        batchSize: ENTITY_QUALITY_CONFIG.batchSize,
        minConfidenceThreshold: ENTITY_QUALITY_CONFIG.minConfidenceThreshold,
      },
    };
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get entity quality status');
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export function registerEntityQualityRoutes(app: Router): void {
  app.use('/api/admin/entity-quality', router);
}

export default router;