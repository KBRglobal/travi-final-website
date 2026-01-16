/**
 * Intelligence Coverage Engine (ICE)
 *
 * Measures and enforces intelligence coverage across the content ecosystem.
 * Answers: "How much of our content is entity-aware, connected, and AI-ready?"
 *
 * Feature Flag: ENABLE_INTELLIGENCE_COVERAGE=true (default: false)
 *
 * Usage:
 *   import { evaluateContentCoverage, onContentPublished } from './intelligence/coverage';
 *
 *   // After content publish
 *   onContentPublished(contentId);
 *
 *   // Get coverage for content
 *   const coverage = await evaluateContentCoverage(contentId);
 *
 *   // Run backfill
 *   await runBackfill(100);
 */

// Types
export type {
  ContentCoverage,
  ContentCoverageSignals,
  CoverageEvaluationResult,
  BatchEvaluationResult,
  CoverageSummary,
  CoverageJobPayload,
} from './types';

// Evaluator
export {
  isIntelligenceCoverageEnabled,
  evaluateContentCoverage,
  evaluateAllContentCoverage,
  calculateCoverageScore,
} from './evaluator';

// Persistence
export {
  cacheCoverage,
  getCachedCoverage,
  clearCoverageCache,
  getCacheStats,
  computeCoverageSummary,
} from './persistence';

// Job Handler
export {
  JOB_TYPE,
  processCoverageJob,
  onContentPublished,
  onContentUpdated,
  runBackfill,
  getJobState,
} from './job-handler';

// Routes
export { default as coverageRoutes } from './routes';
