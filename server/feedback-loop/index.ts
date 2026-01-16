/**
 * User Feedback Loop
 *
 * Feature flag: ENABLE_FEEDBACK_LOOP=true
 */

export { isFeedbackLoopEnabled } from './types';
export type {
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackEntry,
  ContentFeedbackSummary,
  FeedbackTrend,
  FeedbackStats,
  FeedbackFilter,
  FeedbackActionLog,
  BulkFeedbackResult,
} from './types';

export {
  submitFeedback,
  getFeedback,
  updateFeedbackStatus,
  updateFeedbackPriority,
  assignFeedback,
  addFeedbackTags,
  removeFeedbackTag,
  deleteFeedback,
  getAllFeedback,
  getContentFeedbackSummary,
  getFeedbackTrends,
  getFeedbackStats,
  bulkUpdateStatus,
  bulkAssign,
  getFeedbackActionLogs,
  getAllTags,
  clearAllData,
} from './feedback-manager';

export { feedbackLoopRoutes } from './routes';
