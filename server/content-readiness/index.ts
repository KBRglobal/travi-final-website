/**
 * Content Readiness - Module Exports
 *
 * Feature flag: ENABLE_CONTENT_READINESS=true
 *
 * Admin API:
 *   GET /api/admin/content-readiness/:contentId
 *   GET /api/admin/content-readiness/batch
 *   GET /api/admin/content-readiness/below-threshold
 */

import { Router, Request, Response } from 'express';
import { isContentReadinessEnabled } from './types';
import {
  calculateReadiness,
  calculateBatchReadiness,
  getContentBelowThreshold,
} from './calculator';

// Re-export everything
export { isContentReadinessEnabled, READINESS_THRESHOLDS, DIMENSION_WEIGHTS } from './types';
export type { ReadinessReport, ReadinessDimension } from './types';
export {
  calculateReadiness,
  calculateBatchReadiness,
  getContentBelowThreshold,
} from './calculator';

// ============================================================================
// Admin Routes
// ============================================================================

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isContentReadinessEnabled()) {
    res.status(503).json({
      error: 'Content Readiness is disabled',
      hint: 'Set ENABLE_CONTENT_READINESS=true to enable',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/content-readiness/:contentId
 * Get readiness score for specific content.
 */
router.get('/:contentId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;

    const report = await calculateReadiness(contentId);

    if (!report) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/content-readiness/batch
 * Calculate readiness for multiple content items.
 */
router.post('/batch', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentIds } = req.body;

    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      res.status(400).json({ error: 'contentIds array is required' });
      return;
    }

    if (contentIds.length > 100) {
      res.status(400).json({ error: 'Maximum 100 content IDs per batch' });
      return;
    }

    const reports = await calculateBatchReadiness(contentIds);

    res.json({
      reports: Object.fromEntries(reports),
      count: reports.size,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/content-readiness/below-threshold
 * Get content below readiness threshold.
 */
router.get('/below-threshold', requireEnabled, async (req: Request, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 60;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const reports = await getContentBelowThreshold(threshold, limit);

    res.json({
      reports,
      count: reports.length,
      threshold,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as contentReadinessRoutes };
