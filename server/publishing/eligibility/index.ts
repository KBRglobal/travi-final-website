/**
 * Publishing Eligibility Module
 *
 * Central exports for the publish control and safety layer.
 */

export { registerPublishingRoutes } from './routes';
export {
  evaluateEligibility,
  canPublish,
  getBlockingReasons,
} from './engine';
export {
  checkPublishGuard,
  guardManualPublish,
  guardScheduledPublish,
} from './guard';
export {
  getBlockedContent,
  getPublishedWithIssues,
  getEligibilityStats,
} from './repository';
export {
  isPublishGuardsEnabled,
  isAeoRequired,
  isEntityRequired,
  isIntelligenceCoverageRequired,
  type EligibilityResult,
  type EligibilityOptions,
  type BlockedContent,
  type PublishGuardResult,
} from './types';
