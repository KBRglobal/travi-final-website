/**
 * Content Health Module
 *
 * Automated content health monitoring and issue detection.
 */

export { registerContentHealthRoutes } from './routes';
export { startHealthScanner, stopHealthScanner, getSchedulerMetrics, isHealthScannerRunning } from './scheduler';
export { scanContent, scanContentBatch, getHealthSummary } from './scanner';
export {
  getOpenIssues,
  getHealthStats,
  getIssuesForContent,
  clearAllIssues,
} from './repository';
export {
  isContentHealthJobsEnabled,
  type ContentHealthIssue,
  type ContentHealthScan,
  type ContentHealthStats,
  type HealthIssueType,
  type HealthIssueSeverity,
} from './types';
