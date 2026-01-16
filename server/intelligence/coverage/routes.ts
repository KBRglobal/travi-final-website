/**
 * Intelligence Coverage Engine - Admin Routes
 *
 * Read-only admin API for coverage monitoring.
 * Requires authentication.
 */

import { Router, Request, Response } from 'express';
import { isIntelligenceCoverageEnabled, evaluateContentCoverage } from './evaluator';
import { computeCoverageSummary, getCachedCoverage, getCacheStats } from './persistence';
import { processCoverageJob, runBackfill, getJobState } from './job-handler';

const router = Router();

// ============================================================================
// Middleware
// ============================================================================

/**
 * Check if ICE is enabled before processing requests.
 */
function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isIntelligenceCoverageEnabled()) {
    res.status(503).json({
      error: 'Intelligence Coverage Engine is disabled',
      hint: 'Set ENABLE_INTELLIGENCE_COVERAGE=true to enable',
    });
    return;
  }
  next();
}

// ============================================================================
// Summary Endpoint
// ============================================================================

/**
 * GET /api/admin/intelligence/coverage/summary
 *
 * Returns aggregate coverage statistics.
 * Cached for performance.
 */
router.get('/summary', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const summary = await computeCoverageSummary();
    const cacheStats = getCacheStats();
    const jobState = getJobState();

    res.json({
      summary,
      cache: cacheStats,
      job: {
        isRunning: jobState.isRunning,
        lastRunAt: jobState.lastRunAt,
        runCount: jobState.runCount,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// ============================================================================
// Single Content Coverage Endpoint
// ============================================================================

/**
 * GET /api/admin/intelligence/coverage/content/:id
 *
 * Returns coverage for a specific content item.
 * Uses cache if available, otherwise evaluates fresh.
 */
router.get('/content/:id', requireEnabled, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: 'Content ID required' });
    return;
  }

  try {
    // Check cache first
    const cached = getCachedCoverage(id);
    if (cached) {
      res.json({
        coverage: cached,
        source: 'cache',
      });
      return;
    }

    // Evaluate fresh
    const result = await evaluateContentCoverage(id);

    if (!result.success) {
      res.status(404).json({
        error: result.error || 'Content not found',
      });
      return;
    }

    res.json({
      coverage: result.coverage,
      source: 'evaluated',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// ============================================================================
// Trigger Evaluation Endpoints
// ============================================================================

/**
 * POST /api/admin/intelligence/coverage/evaluate/:id
 *
 * Trigger fresh evaluation for a specific content item.
 */
router.post('/evaluate/:id', requireEnabled, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: 'Content ID required' });
    return;
  }

  try {
    const result = await processCoverageJob({
      type: 'single',
      contentId: id,
    });

    res.json({
      success: result.success,
      durationMs: result.durationMs,
      error: result.error,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/admin/intelligence/coverage/backfill
 *
 * Trigger a full coverage backfill.
 * Long-running operation - responds immediately and runs in background.
 */
router.post('/backfill', requireEnabled, async (req: Request, res: Response) => {
  const batchSize = parseInt(req.query.batchSize as string) || 100;

  // Check if already running
  const state = getJobState();
  if (state.isRunning) {
    res.status(409).json({
      error: 'Backfill already in progress',
      lastRunAt: state.lastRunAt,
    });
    return;
  }

  // Start backfill in background
  runBackfill(batchSize).catch(error => {
    console.error('[ICE] Backfill failed:', error);
  });

  res.json({
    message: 'Backfill started',
    batchSize,
    hint: 'Check /summary endpoint for progress',
  });
});

// ============================================================================
// Status Endpoint
// ============================================================================

/**
 * GET /api/admin/intelligence/coverage/status
 *
 * Returns current ICE status and configuration.
 */
router.get('/status', (_req: Request, res: Response) => {
  const enabled = isIntelligenceCoverageEnabled();
  const cacheStats = getCacheStats();
  const jobState = getJobState();

  res.json({
    enabled,
    cache: cacheStats,
    job: jobState,
    config: {
      featureFlag: 'ENABLE_INTELLIGENCE_COVERAGE',
      currentValue: process.env.ENABLE_INTELLIGENCE_COVERAGE || 'false',
    },
  });
});

export default router;
