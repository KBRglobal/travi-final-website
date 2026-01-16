/**
 * Internal Search Console (GSC-like)
 *
 * Feature flag: ENABLE_SEARCH_CONSOLE=true
 */

export { isSearchConsoleEnabled } from './types';
export type {
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

export {
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
  clearAllData,
} from './console-manager';

export { searchConsoleRoutes } from './routes';
