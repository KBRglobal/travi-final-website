/**
 * Internal Search Console - Type Definitions
 *
 * Feature flag: ENABLE_SEARCH_CONSOLE=true
 */

export function isSearchConsoleEnabled(): boolean {
  return process.env.ENABLE_SEARCH_CONSOLE === 'true';
}

/**
 * Search query record.
 */
export interface SearchQuery {
  id: string;
  query: string;
  normalizedQuery: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  firstSeen: Date;
  lastSeen: Date;
}

/**
 * Page performance record.
 */
export interface PagePerformance {
  id: string;
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  topQueries: string[];
  lastUpdated: Date;
}

/**
 * Query-page association.
 */
export interface QueryPageAssociation {
  id: string;
  queryId: string;
  pageUrl: string;
  impressions: number;
  clicks: number;
  avgPosition: number;
  date: Date;
}

/**
 * Search event for tracking.
 */
export interface SearchEvent {
  id: string;
  query: string;
  pageUrl: string;
  position: number;
  clicked: boolean;
  timestamp: Date;
  device?: 'desktop' | 'mobile' | 'tablet';
  country?: string;
}

/**
 * Date range filter.
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Performance trend data point.
 */
export interface TrendDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
}

/**
 * Search console stats.
 */
export interface SearchConsoleStats {
  totalQueries: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgPosition: number;
  topQueries: SearchQuery[];
  topPages: PagePerformance[];
  trends: TrendDataPoint[];
}

/**
 * Query comparison result.
 */
export interface QueryComparison {
  query: string;
  current: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
  };
  previous: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
  };
  changes: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
  };
}

/**
 * Coverage issue.
 */
export interface CoverageIssue {
  id: string;
  url: string;
  issueType: 'not_indexed' | 'crawl_error' | 'blocked' | 'noindex' | 'redirect';
  severity: 'error' | 'warning' | 'info';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

/**
 * Sitemap status.
 */
export interface SitemapStatus {
  url: string;
  submitted: boolean;
  lastSubmitted?: Date;
  urlCount: number;
  indexedCount: number;
  errors: number;
  warnings: number;
}
