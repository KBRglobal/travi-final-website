/**
 * Internal Search Console - Routes
 */

import { Router, Request, Response } from 'express';
import { isSearchConsoleEnabled, CoverageIssue } from './types';
import {
  recordSearchEvent,
  getQueries,
  getPages,
  getPageDetails,
  getQueryDetails,
  getPerformanceTrends,
  getSearchConsoleStats,
  compareQueryPerformance,
  recordCoverageIssue,
  resolveCoverageIssue,
  getCoverageIssues,
  updateSitemapStatus,
  getSitemapStatuses,
  getLowPerformingQueries,
  getTrendingQueries,
} from './console-manager';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isSearchConsoleEnabled()) {
    res.status(503).json({
      error: 'Search Console is disabled',
      hint: 'Set ENABLE_SEARCH_CONSOLE=true to enable',
    });
    return;
  }
  next();
}

/**
 * POST /api/admin/search-console/event
 * Record a search event.
 */
router.post('/event', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { query, pageUrl, position, clicked, device, country } = req.body;

    if (!query || !pageUrl || position === undefined) {
      res.status(400).json({ error: 'query, pageUrl, and position are required' });
      return;
    }

    const event = recordSearchEvent(query, pageUrl, position, clicked || false, {
      device,
      country,
    });

    res.json({ event });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/queries
 * Get all queries with filters.
 */
router.get('/queries', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const sortBy = (req.query.sortBy as string) || 'impressions';
    const order = (req.query.order as string) || 'desc';

    const queries = getQueries({
      limit,
      sortBy: sortBy as 'impressions' | 'clicks' | 'ctr' | 'position',
      order: order as 'asc' | 'desc',
    });

    res.json({ queries, count: queries.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/pages
 * Get all pages with filters.
 */
router.get('/pages', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const sortBy = (req.query.sortBy as string) || 'impressions';
    const order = (req.query.order as string) || 'desc';

    const pages = getPages({
      limit,
      sortBy: sortBy as 'impressions' | 'clicks' | 'ctr' | 'position',
      order: order as 'asc' | 'desc',
    });

    res.json({ pages, count: pages.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/page/:url
 * Get page details with query breakdown.
 */
router.get('/page/:url(*)', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { url } = req.params;
    const details = getPageDetails(decodeURIComponent(url));

    if (!details.page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/query/:query
 * Get query details with page breakdown.
 */
router.get('/query/:query', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const details = getQueryDetails(decodeURIComponent(query));

    if (!details.query) {
      res.status(404).json({ error: 'Query not found' });
      return;
    }

    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/trends
 * Get performance trends.
 */
router.get('/trends', requireEnabled, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trends = getPerformanceTrends(days);
    res.json({ trends });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/stats
 * Get overall stats.
 */
router.get('/stats', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const stats = getSearchConsoleStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/search-console/compare
 * Compare performance between date ranges.
 */
router.post('/compare', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { currentStart, currentEnd, previousStart, previousEnd, limit } = req.body;

    if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
      res.status(400).json({ error: 'currentStart, currentEnd, previousStart, previousEnd are required' });
      return;
    }

    const comparisons = compareQueryPerformance(
      { start: new Date(currentStart), end: new Date(currentEnd) },
      { start: new Date(previousStart), end: new Date(previousEnd) },
      limit || 20
    );

    res.json({ comparisons });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/opportunities
 * Get low-performing queries (optimization opportunities).
 */
router.get('/opportunities', requireEnabled, async (req: Request, res: Response) => {
  try {
    const minImpressions = parseInt(req.query.minImpressions as string) || 10;
    const maxPosition = parseFloat(req.query.maxPosition as string) || 20;
    const minCtr = parseFloat(req.query.minCtr as string) || 0.01;
    const limit = parseInt(req.query.limit as string) || 20;

    const opportunities = getLowPerformingQueries({
      minImpressions,
      maxPosition,
      minCtr,
      limit,
    });

    res.json({ opportunities, count: opportunities.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/trending
 * Get trending queries.
 */
router.get('/trending', requireEnabled, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const limit = parseInt(req.query.limit as string) || 20;

    const trending = getTrendingQueries(days, limit);
    res.json({ trending });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/search-console/coverage-issue
 * Record a coverage issue.
 */
router.post('/coverage-issue', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { url, issueType, severity, description } = req.body;

    if (!url || !issueType || !severity || !description) {
      res.status(400).json({ error: 'url, issueType, severity, and description are required' });
      return;
    }

    const issue = recordCoverageIssue(
      url,
      issueType as CoverageIssue['issueType'],
      severity as CoverageIssue['severity'],
      description
    );

    res.json({ issue });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/search-console/coverage-issue/:id/resolve
 * Resolve a coverage issue.
 */
router.post('/coverage-issue/:id/resolve', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const issue = resolveCoverageIssue(id);

    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }

    res.json({ issue });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/coverage-issues
 * Get coverage issues.
 */
router.get('/coverage-issues', requireEnabled, async (req: Request, res: Response) => {
  try {
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
    const severity = req.query.severity as CoverageIssue['severity'] | undefined;
    const issueType = req.query.issueType as CoverageIssue['issueType'] | undefined;

    const issues = getCoverageIssues({ resolved, severity, issueType });
    res.json({ issues, count: issues.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/search-console/sitemap
 * Update sitemap status.
 */
router.put('/sitemap', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { url, ...status } = req.body;

    if (!url) {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    const sitemap = updateSitemapStatus(url, status);
    res.json({ sitemap });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/search-console/sitemaps
 * Get all sitemap statuses.
 */
router.get('/sitemaps', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const sitemaps = getSitemapStatuses();
    res.json({ sitemaps });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as searchConsoleRoutes };
