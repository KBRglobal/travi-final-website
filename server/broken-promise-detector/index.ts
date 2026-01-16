/**
 * Broken Promise Detector Module
 *
 * FEATURE 7: Broken Promise Detector (SEO/AEO)
 */

export { registerBrokenPromiseRoutes } from "./routes";
export { analyzeContent, getCachedAnalysis, getPromiseStats, bulkAnalyze } from "./detector";
export type {
  BrokenPromise,
  PromiseAnalysis,
  PromiseStats,
  PromiseType,
  PromiseSeverity,
  PromiseStatus,
} from "./types";
export { isBrokenPromiseDetectorEnabled, PROMISE_PATTERNS } from "./types";
