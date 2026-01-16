/**
 * Executive Growth Feed API (Subsystem 5)
 *
 * Provides REST API for the executive dashboard,
 * action queue, and real-time growth feed.
 */

// Types
export type {
  FeedItemType,
  FeedPriority,
  FeedItem,
  FeedCTA,
  FeedMetrics,
  FeedFilter,
  FeedResponse,
  DashboardSummary,
  QueueItem,
  QueueResponse,
  APIError,
} from './types';

// Feed
export {
  generateFeed,
  getFeed,
  markRead,
  dismissItem,
  getDashboardSummary,
  getActionQueue,
  clearFeed,
} from './feed';

// Routes
export { default as growthOSRoutes } from './routes';
