/**
 * Executive Go-Live Report
 * Feature Flag: ENABLE_EXECUTIVE_REPORT=false
 *
 * Human-readable summary of go-live readiness with GO/WAIT/ROLL_BACK
 * recommendation, risk assessment, scorecard, and action items.
 */

export { isExecutiveReportEnabled, REPORT_CONFIG } from './config';
export {
  generateReport,
  toMarkdown,
  toHtml,
  getReportHistory,
  getStatus,
  clearCache,
  clearHistory,
} from './generator';
export type {
  ExecutiveRecommendation,
  ReportFormat,
  ExecutiveSummary,
  RiskAssessment,
  RiskFactor,
  ReadinessScorecard,
  TimelineHighlight,
  ActionItem,
  ExecutiveReport,
  ReportAppendix,
  ReportStatus,
} from './types';
export { default as executiveReportRoutes } from './routes';
