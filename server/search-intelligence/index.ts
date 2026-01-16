/**
 * Search Intelligence - Module Exports
 *
 * Feature flag: ENABLE_SEARCH_INTELLIGENCE=true
 *
 * Admin API:
 *   POST /api/admin/search-intelligence/record-query
 *   GET  /api/admin/search-intelligence/gaps
 *   GET  /api/admin/search-intelligence/recommendations
 *   GET  /api/admin/search-intelligence/summary
 */

import { Router, Request, Response } from 'express';
import {
  isSearchIntelligenceEnabled,
  recordQuery,
  getZeroResultQueries,
  getLowClickQueries,
} from './query-collector';
import { detectGaps, getHighPriorityGaps } from './gap-detector';
import { generateRecommendations, getTopRecommendations } from './recommendation-engine';

// Re-export everything
export { isSearchIntelligenceEnabled, recordQuery, getZeroResultQueries, getLowClickQueries } from './query-collector';
export { normalizeQuery, querySimilarity, clusterQueries } from './normalizer';
export { detectGaps, getGapsByType, getHighPriorityGaps } from './gap-detector';
export {
  generateRecommendations,
  getTopRecommendations,
  getRecommendationsByType,
} from './recommendation-engine';

// ============================================================================
// Admin Routes
// ============================================================================

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isSearchIntelligenceEnabled()) {
    res.status(503).json({
      error: 'Search Intelligence is disabled',
      hint: 'Set ENABLE_SEARCH_INTELLIGENCE=true to enable',
    });
    return;
  }
  next();
}

/**
 * POST /api/admin/search-intelligence/record-query
 * Record a search query for analysis.
 */
router.post('/record-query', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { query, resultsCount, clickedResultId, locale, sessionId } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    await recordQuery(
      query,
      resultsCount ?? 0,
      clickedResultId ?? null,
      locale ?? 'en',
      sessionId
    );

    res.json({ recorded: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-intelligence/gaps
 * Get content gaps based on search queries.
 */
router.get('/gaps', requireEnabled, async (req: Request, res: Response) => {
  try {
    const sinceDays = parseInt(req.query.sinceDays as string) || 7;
    const priorityOnly = req.query.priorityOnly === 'true';

    const gaps = priorityOnly
      ? await getHighPriorityGaps(sinceDays)
      : (await detectGaps(sinceDays)).gaps;

    res.json({ gaps, count: gaps.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-intelligence/recommendations
 * Get content recommendations based on gap analysis.
 */
router.get('/recommendations', requireEnabled, async (req: Request, res: Response) => {
  try {
    const sinceDays = parseInt(req.query.sinceDays as string) || 7;
    const limit = parseInt(req.query.limit as string) || 50;
    const topOnly = req.query.topOnly === 'true';

    if (topOnly) {
      const recommendations = await getTopRecommendations(limit, sinceDays);
      res.json({ recommendations, count: recommendations.length });
    } else {
      const summary = await generateRecommendations(sinceDays, limit);
      res.json(summary);
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-intelligence/summary
 * Get overall search intelligence summary.
 */
router.get('/summary', requireEnabled, async (req: Request, res: Response) => {
  try {
    const sinceDays = parseInt(req.query.sinceDays as string) || 7;

    const [zeroResultQueries, lowClickQueries, gapAnalysis, recommendations] = await Promise.all([
      getZeroResultQueries(10, sinceDays),
      getLowClickQueries(10, sinceDays),
      detectGaps(sinceDays),
      generateRecommendations(sinceDays, 10),
    ]);

    res.json({
      summary: {
        totalGaps: gapAnalysis.gaps.length,
        highPriorityGaps: gapAnalysis.gaps.filter(g => g.priority === 'high').length,
        totalRecommendations: recommendations.recommendations.length,
        topMissingTopics: gapAnalysis.topMissingTopics.slice(0, 5),
        zeroResultQueriesCount: gapAnalysis.totalZeroResultQueries,
        lowEngagementQueriesCount: gapAnalysis.totalLowEngagementQueries,
      },
      topZeroResultQueries: zeroResultQueries,
      topLowClickQueries: lowClickQueries,
      topRecommendations: recommendations.recommendations.slice(0, 5),
      analyzedAt: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as searchIntelligenceRoutes };
