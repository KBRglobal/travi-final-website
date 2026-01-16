/**
 * Autonomy Integration Module
 * Central integration point for AI calls, jobs, and publishing
 */

// AI Guard
export {
  wrapProviderWithEnforcement,
  guardedAiCompletion,
  isAiFeatureAvailable,
  getAiEnforcementStatus,
} from './ai-guard';

// Job Guard
export {
  shouldExecuteJob,
  createGuardedJobExecutor,
  getBlockedJobs,
  getBlockedJob,
  isJobBlocked,
  markJobForRetry,
  clearBlockedJob,
  getBlockedJobStats,
  cleanupBlockedJobs,
} from './job-guard';

// Publish Guard
export {
  canPublishContent,
  assertCanPublish,
  createPublishGuardMiddleware,
  canPublishBatch,
  getPublishingStatus,
  PublishCheckResult,
} from './publish-guard';
