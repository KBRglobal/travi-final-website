/**
 * Admin Activity Feed
 *
 * Answers "what happened today?" without logs.
 *
 * Feature flag: ENABLE_ACTIVITY_FEED=false
 */

export * from './types';
export * from './service';
export { default as activityFeedRoutes } from './routes';
