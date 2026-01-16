/**
 * Internal Search Console - Console Manager
 */

import {
  SearchQuery,
  PagePerformance,
  QueryPageAssociation,
  SearchEvent,
  DateRange,
  TrendDataPoint,
  SearchConsoleStats,
  QueryComparison,
  CoverageIssue,
  SitemapStatus,
} from './types';

// In-memory stores
const searchQueries = new Map<string, SearchQuery>();
const pagePerformance = new Map<string, PagePerformance>();
const queryPageAssociations: QueryPageAssociation[] = [];
const searchEvents: SearchEvent[] = [];
const coverageIssues = new Map<string, CoverageIssue>();
const sitemapStatuses = new Map<string, SitemapStatus>();

/**
 * Normalize query for matching.
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Record a search event (impression or click).
 */
export function recordSearchEvent(
  query: string,
  pageUrl: string,
  position: number,
  clicked: boolean,
  options: {
    device?: 'desktop' | 'mobile' | 'tablet';
    country?: string;
  } = {}
): SearchEvent {
  const normalizedQuery = normalizeQuery(query);
  const id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const event: SearchEvent = {
    id,
    query,
    pageUrl,
    position,
    clicked,
    timestamp: new Date(),
    device: options.device,
    country: options.country,
  };

  searchEvents.push(event);

  // Keep last 100000 events
  if (searchEvents.length > 100000) {
    searchEvents.shift();
  }

  // Update query stats
  updateQueryStats(normalizedQuery, query, position, clicked);

  // Update page stats
  updatePageStats(pageUrl, normalizedQuery, position, clicked);

  // Update query-page association
  updateQueryPageAssociation(normalizedQuery, pageUrl, position, clicked);

  return event;
}

/**
 * Update query statistics.
 */
function updateQueryStats(
  normalizedQuery: string,
  originalQuery: string,
  position: number,
  clicked: boolean
): void {
  let queryStats = searchQueries.get(normalizedQuery);

  if (!queryStats) {
    queryStats = {
      id: `q-${Date.now()}`,
      query: originalQuery,
      normalizedQuery,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      avgPosition: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
    };
  }

  queryStats.impressions++;
  if (clicked) queryStats.clicks++;
  queryStats.ctr = queryStats.clicks / queryStats.impressions;
  queryStats.avgPosition =
    (queryStats.avgPosition * (queryStats.impressions - 1) + position) /
    queryStats.impressions;
  queryStats.lastSeen = new Date();

  searchQueries.set(normalizedQuery, queryStats);
}

/**
 * Update page performance stats.
 */
function updatePageStats(
  pageUrl: string,
  normalizedQuery: string,
  position: number,
  clicked: boolean
): void {
  let pageStats = pagePerformance.get(pageUrl);

  if (!pageStats) {
    pageStats = {
      id: `p-${Date.now()}`,
      url: pageUrl,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      avgPosition: 0,
      topQueries: [],
      lastUpdated: new Date(),
    };
  }

  pageStats.impressions++;
  if (clicked) pageStats.clicks++;
  pageStats.ctr = pageStats.clicks / pageStats.impressions;
  pageStats.avgPosition =
    (pageStats.avgPosition * (pageStats.impressions - 1) + position) /
    pageStats.impressions;
  pageStats.lastUpdated = new Date();

  // Update top queries
  if (!pageStats.topQueries.includes(normalizedQuery)) {
    pageStats.topQueries.push(normalizedQuery);
    if (pageStats.topQueries.length > 10) {
      pageStats.topQueries.shift();
    }
  }

  pagePerformance.set(pageUrl, pageStats);
}

/**
 * Update query-page association.
 */
function updateQueryPageAssociation(
  queryId: string,
  pageUrl: string,
  position: number,
  clicked: boolean
): void {
  const today = new Date().toISOString().split('T')[0];
  let assoc = queryPageAssociations.find(
    (a) =>
      a.queryId === queryId &&
      a.pageUrl === pageUrl &&
      a.date.toISOString().split('T')[0] === today
  );

  if (!assoc) {
    assoc = {
      id: `qpa-${Date.now()}`,
      queryId,
      pageUrl,
      impressions: 0,
      clicks: 0,
      avgPosition: 0,
      date: new Date(),
    };
    queryPageAssociations.push(assoc);
  }

  assoc.impressions++;
  if (clicked) assoc.clicks++;
  assoc.avgPosition =
    (assoc.avgPosition * (assoc.impressions - 1) + position) / assoc.impressions;

  // Keep last 30 days of associations
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffIndex = queryPageAssociations.findIndex(
    (a) => a.date > thirtyDaysAgo
  );
  if (cutoffIndex > 0) {
    queryPageAssociations.splice(0, cutoffIndex);
  }
}

/**
 * Get all queries with optional filters.
 */
export function getQueries(options: {
  dateRange?: DateRange;
  limit?: number;
  sortBy?: 'impressions' | 'clicks' | 'ctr' | 'position';
  order?: 'asc' | 'desc';
} = {}): SearchQuery[] {
  let queries = Array.from(searchQueries.values());

  if (options.dateRange) {
    queries = queries.filter(
      (q) => q.lastSeen >= options.dateRange!.start && q.lastSeen <= options.dateRange!.end
    );
  }

  const sortBy = options.sortBy || 'impressions';
  const order = options.order || 'desc';
  const multiplier = order === 'desc' ? -1 : 1;

  queries.sort((a, b) => {
    switch (sortBy) {
      case 'impressions':
        return (a.impressions - b.impressions) * multiplier;
      case 'clicks':
        return (a.clicks - b.clicks) * multiplier;
      case 'ctr':
        return (a.ctr - b.ctr) * multiplier;
      case 'position':
        return (a.avgPosition - b.avgPosition) * multiplier;
      default:
        return 0;
    }
  });

  if (options.limit) {
    queries = queries.slice(0, options.limit);
  }

  return queries;
}

/**
 * Get all pages with optional filters.
 */
export function getPages(options: {
  limit?: number;
  sortBy?: 'impressions' | 'clicks' | 'ctr' | 'position';
  order?: 'asc' | 'desc';
} = {}): PagePerformance[] {
  let pages = Array.from(pagePerformance.values());

  const sortBy = options.sortBy || 'impressions';
  const order = options.order || 'desc';
  const multiplier = order === 'desc' ? -1 : 1;

  pages.sort((a, b) => {
    switch (sortBy) {
      case 'impressions':
        return (a.impressions - b.impressions) * multiplier;
      case 'clicks':
        return (a.clicks - b.clicks) * multiplier;
      case 'ctr':
        return (a.ctr - b.ctr) * multiplier;
      case 'position':
        return (a.avgPosition - b.avgPosition) * multiplier;
      default:
        return 0;
    }
  });

  if (options.limit) {
    pages = pages.slice(0, options.limit);
  }

  return pages;
}

/**
 * Get page details with query breakdown.
 */
export function getPageDetails(
  pageUrl: string
): { page: PagePerformance | null; queries: Array<{ query: string; impressions: number; clicks: number; avgPosition: number }> } {
  const page = pagePerformance.get(pageUrl) || null;

  if (!page) {
    return { page: null, queries: [] };
  }

  const pageAssocs = queryPageAssociations.filter((a) => a.pageUrl === pageUrl);
  const queryMap = new Map<string, { impressions: number; clicks: number; avgPosition: number }>();

  for (const assoc of pageAssocs) {
    const existing = queryMap.get(assoc.queryId);
    if (existing) {
      existing.impressions += assoc.impressions;
      existing.clicks += assoc.clicks;
      existing.avgPosition = (existing.avgPosition + assoc.avgPosition) / 2;
    } else {
      queryMap.set(assoc.queryId, {
        impressions: assoc.impressions,
        clicks: assoc.clicks,
        avgPosition: assoc.avgPosition,
      });
    }
  }

  const queries = Array.from(queryMap.entries())
    .map(([query, stats]) => ({ query, ...stats }))
    .sort((a, b) => b.impressions - a.impressions);

  return { page, queries };
}

/**
 * Get query details with page breakdown.
 */
export function getQueryDetails(
  query: string
): { query: SearchQuery | null; pages: Array<{ url: string; impressions: number; clicks: number; avgPosition: number }> } {
  const normalizedQuery = normalizeQuery(query);
  const queryStats = searchQueries.get(normalizedQuery) || null;

  if (!queryStats) {
    return { query: null, pages: [] };
  }

  const queryAssocs = queryPageAssociations.filter(
    (a) => a.queryId === normalizedQuery
  );
  const pageMap = new Map<string, { impressions: number; clicks: number; avgPosition: number }>();

  for (const assoc of queryAssocs) {
    const existing = pageMap.get(assoc.pageUrl);
    if (existing) {
      existing.impressions += assoc.impressions;
      existing.clicks += assoc.clicks;
      existing.avgPosition = (existing.avgPosition + assoc.avgPosition) / 2;
    } else {
      pageMap.set(assoc.pageUrl, {
        impressions: assoc.impressions,
        clicks: assoc.clicks,
        avgPosition: assoc.avgPosition,
      });
    }
  }

  const pages = Array.from(pageMap.entries())
    .map(([url, stats]) => ({ url, ...stats }))
    .sort((a, b) => b.impressions - a.impressions);

  return { query: queryStats, pages };
}

/**
 * Get performance trends.
 */
export function getPerformanceTrends(days: number = 30): TrendDataPoint[] {
  const trends: TrendDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayEvents = searchEvents.filter(
      (e) => e.timestamp.toISOString().split('T')[0] === dateStr
    );

    const impressions = dayEvents.length;
    const clicks = dayEvents.filter((e) => e.clicked).length;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const avgPosition =
      impressions > 0
        ? dayEvents.reduce((sum, e) => sum + e.position, 0) / impressions
        : 0;

    trends.push({
      date: dateStr,
      impressions,
      clicks,
      ctr,
      avgPosition,
    });
  }

  return trends;
}

/**
 * Get search console stats.
 */
export function getSearchConsoleStats(): SearchConsoleStats {
  const queries = Array.from(searchQueries.values());
  const pages = Array.from(pagePerformance.values());

  const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
  const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition =
    queries.length > 0
      ? queries.reduce((sum, q) => sum + q.avgPosition, 0) / queries.length
      : 0;

  const topQueries = [...queries]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  const topPages = [...pages]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  const trends = getPerformanceTrends(30);

  return {
    totalQueries: queries.length,
    totalImpressions,
    totalClicks,
    avgCtr,
    avgPosition,
    topQueries,
    topPages,
    trends,
  };
}

/**
 * Compare query performance between two date ranges.
 */
export function compareQueryPerformance(
  current: DateRange,
  previous: DateRange,
  limit: number = 20
): QueryComparison[] {
  const comparisons: QueryComparison[] = [];

  for (const [queryId, queryStats] of searchQueries) {
    const currentAssocs = queryPageAssociations.filter(
      (a) =>
        a.queryId === queryId &&
        a.date >= current.start &&
        a.date <= current.end
    );

    const previousAssocs = queryPageAssociations.filter(
      (a) =>
        a.queryId === queryId &&
        a.date >= previous.start &&
        a.date <= previous.end
    );

    const currentStats = {
      impressions: currentAssocs.reduce((sum, a) => sum + a.impressions, 0),
      clicks: currentAssocs.reduce((sum, a) => sum + a.clicks, 0),
      ctr: 0,
      avgPosition:
        currentAssocs.length > 0
          ? currentAssocs.reduce((sum, a) => sum + a.avgPosition, 0) /
            currentAssocs.length
          : 0,
    };
    currentStats.ctr =
      currentStats.impressions > 0
        ? currentStats.clicks / currentStats.impressions
        : 0;

    const previousStats = {
      impressions: previousAssocs.reduce((sum, a) => sum + a.impressions, 0),
      clicks: previousAssocs.reduce((sum, a) => sum + a.clicks, 0),
      ctr: 0,
      avgPosition:
        previousAssocs.length > 0
          ? previousAssocs.reduce((sum, a) => sum + a.avgPosition, 0) /
            previousAssocs.length
          : 0,
    };
    previousStats.ctr =
      previousStats.impressions > 0
        ? previousStats.clicks / previousStats.impressions
        : 0;

    if (currentStats.impressions > 0 || previousStats.impressions > 0) {
      comparisons.push({
        query: queryStats.query,
        current: currentStats,
        previous: previousStats,
        changes: {
          impressions: currentStats.impressions - previousStats.impressions,
          clicks: currentStats.clicks - previousStats.clicks,
          ctr: currentStats.ctr - previousStats.ctr,
          avgPosition: currentStats.avgPosition - previousStats.avgPosition,
        },
      });
    }
  }

  return comparisons
    .sort((a, b) => Math.abs(b.changes.impressions) - Math.abs(a.changes.impressions))
    .slice(0, limit);
}

/**
 * Record a coverage issue.
 */
export function recordCoverageIssue(
  url: string,
  issueType: CoverageIssue['issueType'],
  severity: CoverageIssue['severity'],
  description: string
): CoverageIssue {
  const id = `cov-${Date.now()}`;

  const issue: CoverageIssue = {
    id,
    url,
    issueType,
    severity,
    description,
    detectedAt: new Date(),
  };

  coverageIssues.set(id, issue);
  return issue;
}

/**
 * Resolve a coverage issue.
 */
export function resolveCoverageIssue(id: string): CoverageIssue | null {
  const issue = coverageIssues.get(id);
  if (!issue) return null;

  issue.resolvedAt = new Date();
  coverageIssues.set(id, issue);
  return issue;
}

/**
 * Get coverage issues.
 */
export function getCoverageIssues(options: {
  resolved?: boolean;
  severity?: CoverageIssue['severity'];
  issueType?: CoverageIssue['issueType'];
} = {}): CoverageIssue[] {
  let issues = Array.from(coverageIssues.values());

  if (options.resolved !== undefined) {
    issues = issues.filter((i) =>
      options.resolved ? i.resolvedAt !== undefined : i.resolvedAt === undefined
    );
  }

  if (options.severity) {
    issues = issues.filter((i) => i.severity === options.severity);
  }

  if (options.issueType) {
    issues = issues.filter((i) => i.issueType === options.issueType);
  }

  return issues.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
}

/**
 * Update sitemap status.
 */
export function updateSitemapStatus(
  url: string,
  status: Partial<Omit<SitemapStatus, 'url'>>
): SitemapStatus {
  let sitemap = sitemapStatuses.get(url);

  if (!sitemap) {
    sitemap = {
      url,
      submitted: false,
      urlCount: 0,
      indexedCount: 0,
      errors: 0,
      warnings: 0,
    };
  }

  Object.assign(sitemap, status);
  sitemapStatuses.set(url, sitemap);
  return sitemap;
}

/**
 * Get all sitemap statuses.
 */
export function getSitemapStatuses(): SitemapStatus[] {
  return Array.from(sitemapStatuses.values());
}

/**
 * Get low-performing queries (opportunities).
 */
export function getLowPerformingQueries(options: {
  minImpressions?: number;
  maxPosition?: number;
  minCtr?: number;
  limit?: number;
} = {}): SearchQuery[] {
  const minImpressions = options.minImpressions || 10;
  const maxPosition = options.maxPosition || 20;
  const minCtr = options.minCtr || 0.01;
  const limit = options.limit || 20;

  return Array.from(searchQueries.values())
    .filter(
      (q) =>
        q.impressions >= minImpressions &&
        q.avgPosition <= maxPosition &&
        q.ctr < minCtr
    )
    .sort((a, b) => a.ctr - b.ctr)
    .slice(0, limit);
}

/**
 * Get trending queries (rising impressions).
 */
export function getTrendingQueries(days: number = 7, limit: number = 20): Array<{
  query: SearchQuery;
  trend: 'rising' | 'falling' | 'stable';
  changePercent: number;
}> {
  const now = new Date();
  const midpoint = new Date(now);
  midpoint.setDate(midpoint.getDate() - Math.floor(days / 2));
  const start = new Date(now);
  start.setDate(start.getDate() - days);

  const results: Array<{
    query: SearchQuery;
    trend: 'rising' | 'falling' | 'stable';
    changePercent: number;
  }> = [];

  for (const [queryId, queryStats] of searchQueries) {
    const recentAssocs = queryPageAssociations.filter(
      (a) => a.queryId === queryId && a.date >= midpoint && a.date <= now
    );

    const olderAssocs = queryPageAssociations.filter(
      (a) => a.queryId === queryId && a.date >= start && a.date < midpoint
    );

    const recentImpressions = recentAssocs.reduce(
      (sum, a) => sum + a.impressions,
      0
    );
    const olderImpressions = olderAssocs.reduce(
      (sum, a) => sum + a.impressions,
      0
    );

    if (recentImpressions === 0 && olderImpressions === 0) continue;

    const changePercent =
      olderImpressions > 0
        ? ((recentImpressions - olderImpressions) / olderImpressions) * 100
        : recentImpressions > 0
        ? 100
        : 0;

    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (changePercent > 10) trend = 'rising';
    else if (changePercent < -10) trend = 'falling';

    results.push({ query: queryStats, trend, changePercent });
  }

  return results
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, limit);
}

/**
 * Clear all data (for testing).
 */
export function clearAllData(): void {
  searchQueries.clear();
  pagePerformance.clear();
  queryPageAssociations.length = 0;
  searchEvents.length = 0;
  coverageIssues.clear();
  sitemapStatuses.clear();
}
