export {
  recordImpression,
  recordClick,
  recordScrollDepth,
  getMetrics,
  getTopPerformers,
  getAllMetrics,
  clearMetrics,
  type ContentMetrics,
} from "./content-metrics";

export {
  shouldAllowRegeneration,
  getRegenerationDecision,
  forceAllowRegeneration,
  HIGH_ENGAGEMENT_THRESHOLD,
  type RegenerationDecision,
} from "./regeneration-guard";

export {
  calculateScore,
  calculateRecencyBonus,
  getCachedScore,
  cacheScore,
  calculateAndCacheScore,
  getScoreBreakdown,
  CLICK_WEIGHT,
  IMPRESSION_WEIGHT,
  RECENCY_MAX_BONUS,
  RECENCY_DECAY_DAYS,
} from "./content-score";

export {
  recordImpression as recordPerformanceImpression,
  recordClick as recordPerformanceClick,
  getPerformanceScore,
  getPerformance,
  getAllPerformance,
  clearPerformance,
  DAILY_DECAY_RATE,
  type ContentPerformance,
} from "./performance-model";

export {
  shouldRewrite,
  getRewriteDecision,
  forceRewrite,
  SCORE_THRESHOLD,
  CTR_THRESHOLD,
  type RewriteDecision,
} from "./rewrite-guard";

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
} from "./content-performance";
