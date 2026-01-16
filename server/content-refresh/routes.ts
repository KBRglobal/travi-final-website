/**
 * Automated Content Refresh Engine - Admin Routes
 * Feature Flag: ENABLE_CONTENT_REFRESH_ENGINE=true
 */

import { Router } from 'express';
import { createLogger } from '../lib/logger';
import { isContentRefreshEnabled } from './config';
import {
  analyzeContent,
  getRefreshSummary,
  generateRefreshJobs,
  getRefreshEngineStatus,
} from './engine';

const logger = createLogger('content-refresh-routes');
const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireEnabled(req: any, res: any, next: any) {
  if (!isContentRefreshEnabled()) {
    return res.status(503).json({
      error: 'Content refresh engine is disabled',
      message: 'Set ENABLE_CONTENT_REFRESH_ENGINE=true to enable',
    });
  }
  next();
}

// ============================================================================
// GET /api/admin/content-refresh/summary
// ============================================================================

router.get('/summary', requireEnabled, async (req, res) => {
  try {
    const summary = await getRefreshSummary();

    if (!summary) {
      return res.status(500).json({ error: 'Failed to get refresh summary' });
    }

    res.json(summary);
  } catch (error) {
    logger.error({ error }, 'Failed to get refresh summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/content-refresh/:contentId
// ============================================================================

router.get('/:contentId', requireEnabled, async (req, res) => {
  try {
    const { contentId } = req.params;
    const analysis = await analyzeContent(contentId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Content not found or analysis failed',
        contentId,
      });
    }

    res.json(analysis);
  } catch (error) {
    logger.error({ error, contentId: req.params.contentId }, 'Failed to analyze content');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/content-refresh/jobs
// ============================================================================

router.get('/jobs/list', requireEnabled, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const jobs = await generateRefreshJobs(limit);

    res.json({ jobs, count: jobs.length });
  } catch (error) {
    logger.error({ error }, 'Failed to generate refresh jobs');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/admin/content-refresh/status
// ============================================================================

router.get('/status', async (req, res) => {
  try {
    const status = getRefreshEngineStatus();
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const contentRefreshRoutes = router;
export default router;
