/**
 * Content Backlog Generator - Module Exports
 *
 * Feature flag: ENABLE_CONTENT_BACKLOG=true
 *
 * Admin API:
 *   GET  /api/admin/backlog
 *   GET  /api/admin/backlog/summary
 *   GET  /api/admin/backlog/:id
 *   POST /api/admin/backlog/collect
 *   POST /api/admin/backlog/:id/status
 *   POST /api/admin/backlog/:id/convert-to-draft
 *   POST /api/admin/backlog/cleanup
 */

export { isContentBacklogEnabled } from './types';
export type {
  BacklogItem,
  BacklogItemStatus,
  BacklogSource,
  BacklogSummary,
  ScoringFactors,
} from './types';

export {
  collectZeroResultSearches,
  collectLowClickSearches,
  collectRssTopics,
  collectEntityGaps,
  collectAllIdeas,
} from './collector';

export { calculatePriorityScore, scoreAndRankItems, getScoringBreakdown } from './scorer';

export {
  createBacklogItem,
  createBacklogItems,
  getBacklogItem,
  getBacklogItems,
  getBacklogSummary,
  updateBacklogItemStatus,
  convertToContent,
  cleanupOldItems,
} from './repository';

export { backlogRoutes } from './routes';
