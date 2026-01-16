/**
 * Executive Go-Live Report - Configuration
 * Feature Flag: ENABLE_EXECUTIVE_REPORT=false
 */

export function isExecutiveReportEnabled(): boolean {
  return process.env.ENABLE_EXECUTIVE_REPORT === 'true';
}

export const REPORT_CONFIG = {
  defaultFormat: (process.env.REPORT_DEFAULT_FORMAT || 'json') as 'json' | 'markdown' | 'html',
  maxTimelineHighlights: parseInt(process.env.REPORT_MAX_HIGHLIGHTS || '10', 10),
  maxActionItems: parseInt(process.env.REPORT_MAX_ACTIONS || '20', 10),
  cacheReportMs: parseInt(process.env.REPORT_CACHE_MS || '60000', 10), // 1 minute
  version: '1.0.0',
} as const;
