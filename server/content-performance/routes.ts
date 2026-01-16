/**
 * Content Performance - Admin Routes
 */

import { Router, Request, Response } from 'express';
import { isContentPerformanceLoopEnabled } from './types';
import {
  getContentMetrics,
  getAggregateMetrics,
  getLowCtrContent,
  getHighBounceContent,
  getLowDwellContent,
  getNoClickContent,
} from './metrics';
import {
  evaluateContent,
  getContentWithIssues,
  getIssuesSummary,
} from './evaluator';
import {
  generateRecommendations,
  enrichIssuesWithRecommendations,
  getPrioritizedActions,
} from './recommender';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isContentPerformanceLoopEnabled()) {
    res.status(503).json({
      error: 'Content Performance Loop is disabled',
      hint: 'Set ENABLE_CONTENT_PERFORMANCE_LOOP=true to enable',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/content-performance/issues
 * Get all content with performance issues.
 */
router.get('/issues', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const issueMap = await getContentWithIssues(limit);
    const allIssues: ReturnType<typeof enrichIssuesWithRecommendations> = [];

    for (const issues of issueMap.values()) {
      allIssues.push(...enrichIssuesWithRecommendations(issues));
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.json({
      issues: allIssues.slice(0, limit),
      count: allIssues.length,
      contentAffected: issueMap.size,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/content-performance/summary
 * Get issues summary.
 */
router.get('/summary', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const [issuesSummary, aggregateMetrics] = await Promise.all([
      getIssuesSummary(),
      getAggregateMetrics(),
    ]);

    res.json({
      issues: issuesSummary,
      metrics: aggregateMetrics,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/content-performance/:contentId
 * Get performance details for specific content.
 */
router.get('/:contentId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const periodDays = parseInt(req.query.period as string) || 30;

    const metrics = await getContentMetrics(contentId, periodDays);

    if (!metrics) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    const issues = await evaluateContent(contentId);
    const enrichedIssues = enrichIssuesWithRecommendations(issues);

    res.json({
      metrics,
      issues: enrichedIssues,
      hasIssues: issues.length > 0,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/content-performance/actions
 * Get prioritized action list.
 */
router.get('/actions', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const issueMap = await getContentWithIssues(100);
    const allIssues: ReturnType<typeof enrichIssuesWithRecommendations>[number][] = [];

    for (const issues of issueMap.values()) {
      allIssues.push(...issues);
    }

    const actions = getPrioritizedActions(allIssues);

    res.json({
      actions: actions.slice(0, limit),
      count: actions.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/content-performance/low-ctr
 * Get content with low CTR.
 */
router.get('/low-ctr', requireEnabled, async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.02;
    const limit = parseInt(req.query.limit as string) || 50;

    const content = await getLowCtrContent(threshold, 100, limit);

    res.json({
      content,
      count: content.length,
      threshold,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/content-performance/high-bounce
 * Get content with high bounce rate.
 */
router.get('/high-bounce', requireEnabled, async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.80;
    const limit = parseInt(req.query.limit as string) || 50;

    const content = await getHighBounceContent(threshold, limit);

    res.json({
      content,
      count: content.length,
      threshold,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/content-performance/low-dwell
 * Get content with low dwell time.
 */
router.get('/low-dwell', requireEnabled, async (req: Request, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 30;
    const limit = parseInt(req.query.limit as string) || 50;

    const content = await getLowDwellContent(threshold, limit);

    res.json({
      content,
      count: content.length,
      threshold,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/content-performance/no-clicks
 * Get content with impressions but no clicks.
 */
router.get('/no-clicks', requireEnabled, async (req: Request, res: Response) => {
  try {
    const minImpressions = parseInt(req.query.minImpressions as string) || 100;
    const limit = parseInt(req.query.limit as string) || 50;

    const content = await getNoClickContent(minImpressions, limit);

    res.json({
      content,
      count: content.length,
      minImpressions,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as contentPerformanceRoutes };
