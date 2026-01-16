/**
 * Content Performance Feedback Loop - Module Exports
 *
 * Feature flag: ENABLE_CONTENT_PERFORMANCE_LOOP=true
 *
 * Admin API:
 *   GET /api/admin/content-performance/issues
 *   GET /api/admin/content-performance/summary
 *   GET /api/admin/content-performance/:contentId
 *   GET /api/admin/content-performance/actions
 *   GET /api/admin/content-performance/low-ctr
 *   GET /api/admin/content-performance/high-bounce
 *   GET /api/admin/content-performance/low-dwell
 *   GET /api/admin/content-performance/no-clicks
 */

export { isContentPerformanceLoopEnabled, PERFORMANCE_THRESHOLDS } from './types';
export type {
  PerformanceMetrics,
  PerformanceIssue,
  PerformanceIssueType,
  IssueSeverity,
  Recommendation,
  RecommendationType,
} from './types';

export {
  getContentMetrics,
  getAllContentMetrics,
  getAggregateMetrics,
  getLowCtrContent,
  getHighBounceContent,
  getLowDwellContent,
  getNoClickContent,
} from './metrics';

export {
  evaluateContent,
  getContentWithIssues,
  getIssuesSummary,
} from './evaluator';

export {
  generateRecommendations,
  enrichIssuesWithRecommendations,
  getPrioritizedActions,
} from './recommender';

export { contentPerformanceRoutes } from './routes';
