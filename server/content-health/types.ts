/**
 * Content Health Types
 *
 * Types for the automated content health monitoring system.
 */

/**
 * Health issue severity levels
 */
export type HealthIssueSeverity = 'critical' | 'warning' | 'info';

/**
 * Types of health issues that can be detected
 */
export type HealthIssueType =
  | 'no_entities'
  | 'no_aeo_capsule'
  | 'not_indexed'
  | 'low_intelligence_coverage'
  | 'no_blocks'
  | 'low_seo_score'
  | 'low_aeo_score'
  | 'stale_content';

/**
 * Status of a health issue
 */
export type HealthIssueStatus = 'open' | 'in_progress' | 'resolved' | 'ignored';

/**
 * A single health issue for a content item
 */
export interface ContentHealthIssue {
  id: string;
  contentId: string;
  contentTitle: string;
  contentType: string;
  issueType: HealthIssueType;
  severity: HealthIssueSeverity;
  status: HealthIssueStatus;
  message: string;
  details?: Record<string, unknown>;
  detectedAt: Date;
  resolvedAt?: Date;
  jobEnqueued: boolean;
  jobEnqueuedAt?: Date;
}

/**
 * Health scan result for a single content item
 */
export interface ContentHealthScan {
  contentId: string;
  contentTitle: string;
  contentType: string;
  scannedAt: Date;
  issues: HealthIssueType[];
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
}

/**
 * Aggregated health statistics
 */
export interface ContentHealthStats {
  totalContent: number;
  healthyCount: number;
  degradedCount: number;
  unhealthyCount: number;
  byIssueType: Record<HealthIssueType, number>;
  bySeverity: Record<HealthIssueSeverity, number>;
  lastScanAt: Date | null;
  openIssues: number;
  resolvedLast24h: number;
}

/**
 * Configuration for the health scanner
 */
export interface HealthScannerConfig {
  batchSize: number;
  scanIntervalMs: number;
  minAeoScore: number;
  minSeoScore: number;
  staleContentDays: number;
  autoEnqueueJobs: boolean;
}

/**
 * Result of a batch scan operation
 */
export interface BatchScanResult {
  scannedCount: number;
  issuesFound: number;
  newIssues: number;
  resolvedIssues: number;
  duration: number;
  nextBatchOffset: number;
}

/**
 * Feature flag check
 */
export function isContentHealthJobsEnabled(): boolean {
  return process.env.ENABLE_CONTENT_HEALTH_JOBS === 'true';
}

/**
 * Check if auto-enqueue for refresh jobs is enabled
 */
export function isAutoEnqueueEnabled(): boolean {
  return process.env.ENABLE_HEALTH_AUTO_ENQUEUE === 'true';
}

/**
 * Default configuration
 */
export const DEFAULT_SCANNER_CONFIG: HealthScannerConfig = {
  batchSize: 50,
  scanIntervalMs: 5 * 60 * 1000, // 5 minutes
  minAeoScore: 50,
  minSeoScore: 40,
  staleContentDays: 180,
  autoEnqueueJobs: false,
};

/**
 * Map issue types to severity
 */
export const ISSUE_SEVERITY_MAP: Record<HealthIssueType, HealthIssueSeverity> = {
  no_blocks: 'critical',
  no_entities: 'warning',
  no_aeo_capsule: 'warning',
  not_indexed: 'warning',
  low_intelligence_coverage: 'info',
  low_seo_score: 'info',
  low_aeo_score: 'info',
  stale_content: 'info',
};

/**
 * Human-readable messages for each issue type
 */
export const ISSUE_MESSAGES: Record<HealthIssueType, string> = {
  no_blocks: 'Content has no body/blocks',
  no_entities: 'Content has no extracted entities',
  no_aeo_capsule: 'Content missing AEO answer capsule',
  not_indexed: 'Content is not indexed for search',
  low_intelligence_coverage: 'Content has low intelligence coverage',
  low_seo_score: 'Content has low SEO score',
  low_aeo_score: 'Content has low AEO score',
  stale_content: 'Content has not been updated in a long time',
};
