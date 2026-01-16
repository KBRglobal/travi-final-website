/**
 * SEO Technical Health Engine - Admin Routes
 * Feature Flag: ENABLE_SEO_HEALTH=true
 */

import { Router } from 'express';
import { createLogger } from '../lib/logger';
import { isSeoHealthEnabled } from './config';
import {
  getSeoHealthSummary,
  getAllIssues,
  analyzeContent,
  getSeoHealthStatus,
  rebuildIndexes,
} from './engine';
import type { IssueSeverity } from './types';

const logger = createLogger('seo-health-routes');
const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireEnabled(req: any, res: any, next: any) {
  if (!isSeoHealthEnabled()) {
    return res.status(503).json({
      error: 'SEO health engine is disabled',
      message: 'Set ENABLE_SEO_HEALTH=true to enable',
    });
  }
  next();
}

// ============================================================================
// GET /api/admin/seo-health/summary
// ============================================================================

router.get('/summary', requireEnabled, async (req, res) => {
  try {
    const summary = await getSeoHealthSummary();

    if (!summary) {
      return res.status(500).json({ error: 'Failed to get SEO health summary' });
    }

    res.json(summary);
  } catch (error) {
    logger.error({ error }, 'Failed to get SEO health summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/seo-health/issues
// ============================================================================

router.get('/issues', requireEnabled, async (req, res) => {
  try {
    const severity = req.query.severity as IssueSeverity | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const issues = await getAllIssues(severity, limit);

    if (!issues) {
      return res.status(500).json({ error: 'Failed to get SEO issues' });
    }

    res.json(issues);
  } catch (error) {
    logger.error({ error }, 'Failed to get SEO issues');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/seo-health/content/:id
// ============================================================================

router.get('/content/:id', requireEnabled, async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await analyzeContent(id);

    if (!analysis) {
      return res.status(404).json({
        error: 'Content not found or analysis failed',
        contentId: id,
      });
    }

    res.json(analysis);
  } catch (error) {
    logger.error({ error, contentId: req.params.id }, 'Failed to analyze content');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// POST /api/admin/seo-health/rebuild-index
// ============================================================================

router.post('/rebuild-index', requireEnabled, async (req, res) => {
  try {
    await rebuildIndexes();
    res.json({ success: true, message: 'Indexes rebuilt successfully' });
  } catch (error) {
    logger.error({ error }, 'Failed to rebuild indexes');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/seo-health/status
// ============================================================================

router.get('/status', async (req, res) => {
  try {
    const status = getSeoHealthStatus();
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const seoHealthRoutes = router;
export default router;
