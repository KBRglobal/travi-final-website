export {
  checkDuplicate,
  createFingerprint,
  generateTitleHash,
  generateUrlHash,
  normalizeTitle,
  normalizeUrl,
  calculateTitleSimilarity,
  type DuplicateCheckResult,
} from "./deduplication";

export {
  transitionState,
  bulkTransitionState,
  isValidTransition,
  getValidTransitions,
  canPublish,
  VALID_TRANSITIONS,
  type ContentStatus,
  type TransitionResult,
} from "./content-lifecycle";

export {
  recordImpression,
  recordClick,
  recordScrollDepth,
  getMetrics,
  getTopPerformers,
  getAllMetrics,
  clearMetrics,
  shouldAllowRegeneration,
  getRegenerationDecision,
  forceAllowRegeneration,
  calculateScore,
  getScoreBreakdown,
  HIGH_ENGAGEMENT_THRESHOLD,
  type ContentMetrics,
  type RegenerationDecision,
} from "./metrics";

export {
  recordImpression as recordPerformanceImpression,
  recordClick as recordPerformanceClick,
  getPerformanceScore,
  getPerformance,
  getAllPerformance,
  clearPerformance,
  DAILY_DECAY_RATE,
  type ContentPerformance,
} from "./metrics/performance-model";

export {
  shouldRewrite,
  getRewriteDecision,
  forceRewrite,
  SCORE_THRESHOLD,
  CTR_THRESHOLD,
  type RewriteDecision,
} from "./metrics/rewrite-guard";

export {
  recordImpression as recordContentPerformanceImpression,
  recordClick as recordContentPerformanceClick,
  recordScrollDepth as recordContentPerformanceScrollDepth,
  getPerformanceScore as getContentPerformanceScore,
  getPerformance as getContentPerformance,
  getAllPerformance as getAllContentPerformance,
  shouldAllowRegeneration as shouldAllowContentRegeneration,
  clearPerformance as clearContentPerformance,
  forcePersist as forceContentPerformancePersist,
  HIGH_PERFORMING_SCORE_THRESHOLD,
  MODIFICATION_COOLDOWN_MS,
  type ContentPerformance as ContentPerformanceData,
} from "./metrics/content-performance";

export {
  calculateContentValue,
  getImprovementCandidates,
  getHighValueContent,
  getProtectedContent,
  getContentValueSummary,
  isContentProtected,
  canImproveContent,
  HIGH_VALUE_THRESHOLD,
  LOW_VALUE_THRESHOLD,
  type ContentValueResult,
  type ContentValueSummary,
} from "./value-scorer";

export {
  queueHighValueImprovements,
  queueLowCostWins,
  getQueueSummary,
  shouldQueueImprovement,
  MAX_QUEUE_SIZE,
  LOW_COST_THRESHOLD,
  HIGH_IMPACT_PERFORMANCE_THRESHOLD,
  type QueuedImprovement,
  type QueueResult,
} from "./value-queue";

export {
  calculateContentValue as calculateAutomatedContentValue,
  isContentProtected as isAutomatedContentProtected,
  queueHighValueImprovements as queueAutomatedImprovements,
  identifyLowCostWins,
  queueLowCostWins as queueAutomatedLowCostWins,
  runAutomationCycle,
  getAutomationSummary,
  canAutoImprove,
  getContentByRecommendation,
  getProtectedContent as getAutomatedProtectedContent,
  resetAutomationState,
  HIGH_PERFORMING_THRESHOLD,
  ARCHIVE_THRESHOLD,
  LOW_COST_WIN_THRESHOLD,
  MAX_AUTO_QUEUE_SIZE,
  type ContentRecommendation,
  type ContentValueResult as AutomatedContentValueResult,
  type AutomationQueueResult,
  type LowCostWin,
  type AutomationSummary,
} from "./value-automation";
