/**
 * Admin Module Exports
 *
 * Central export for admin intelligence functionality.
 *
 * PHASE 17: Admin Intelligence & Visibility Layer
 */

export { registerAdminIntelligenceRoutes } from './intelligence-routes';
export { registerAdminIngestionRoutes } from './ingestion-routes';
export {
  generateIntelligenceSnapshot,
  evaluateContentCoverage,
  evaluateAllContentCoverage,
  isIntelligenceEnabled,
  type IntelligenceSnapshot,
  type ContentCoverageMetrics,
  type ContentStateSnapshot,
  type AIActivitySnapshot,
  type SearchHealthSnapshot,
  type RSSHealthSnapshot,
  type SystemWarningsSnapshot,
} from './intelligence-snapshot';
export {
  getContentHealthScore,
  getSearchHealthScore,
  getAIHealthScore,
  getBlockingIssues,
  type HealthScore,
  type BlockingIssue,
} from './intelligence-scorers';
