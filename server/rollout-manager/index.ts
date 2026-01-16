/**
 * Release & Rollout Manager
 *
 * Feature flag: ENABLE_ROLLOUT_MANAGER=true
 */

export { isRolloutManagerEnabled } from './types';
export type {
  ReleaseStatus,
  RolloutStrategy,
  ReleaseItemType,
  ReleaseItem,
  RolloutStage,
  Release,
  RolloutMetrics,
  HealthCheckResult,
  RollbackInfo,
  ReleaseEvent,
  RolloutFeatureFlag,
  ReleaseStats,
} from './types';

export {
  createRelease,
  getRelease,
  updateRelease,
  addReleaseItem,
  removeReleaseItem,
  startRelease,
  advanceStage,
  rollbackRelease,
  cancelRelease,
  getAllReleases,
  getReleaseEvents,
  isUserInRollout,
  getFeatureFlags,
  performHealthCheck,
  recordRolloutMetrics,
  getReleaseStats,
  getScheduledReleases,
  getRollbackHistory,
  clearAllData,
} from './rollout-engine';

export { rolloutManagerRoutes } from './routes';
