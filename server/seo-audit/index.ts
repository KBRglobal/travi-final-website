/**
 * Technical SEO Audit Engine - Module Exports
 *
 * Feature flag: ENABLE_SEO_AUDIT=true
 *
 * Admin API:
 *   POST /api/admin/seo-audit/run
 *   GET  /api/admin/seo-audit/results
 *   GET  /api/admin/seo-audit/results/:auditId
 *   GET  /api/admin/seo-audit/issues
 *   GET  /api/admin/seo-audit/issues/critical
 *   GET  /api/admin/seo-audit/content/:contentId
 *   GET  /api/admin/seo-audit/stats
 *   GET  /api/admin/seo-audit/checks
 *   POST /api/admin/seo-audit/check/:type
 *   GET  /api/admin/seo-audit/history
 *   GET  /api/admin/seo-audit/trend
 *   POST /api/admin/seo-audit/compare
 */

export { isSeoAuditEnabled, DEFAULT_CHECKS } from './types';
export type {
  SeoCheckType,
  SeoIssueSeverity,
  SeoIssue,
  CheckResult,
  AuditResult,
  AuditSummary,
  CheckConfig,
} from './types';

export * from './checks';

export {
  runFullAudit,
  runSingleCheck,
  getAudit,
  getLatestAudit,
  getAllAudits,
} from './runner';

export {
  getLatestIssues,
  getIssuesBySeverity,
  getIssuesByType,
  getCriticalIssues,
  getIssuesForContent,
  getIssueStats,
  compareAudits,
  getAuditHistory,
  getScoreTrend,
} from './repository';

export { seoAuditRoutes } from './routes';
