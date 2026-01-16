/**
 * Data Integrity Watchdog - Types
 *
 * FEATURE 4: Detect silent data corruption and partial writes
 */

export type IntegritySeverity = 'info' | 'warning' | 'error' | 'critical';

export type IntegrityCheckType =
  | 'orphaned_content'
  | 'missing_entities'
  | 'unindexed_content'
  | 'orphaned_links'
  | 'failed_transitions'
  | 'stale_cache'
  | 'missing_media';

export interface IntegrityIssue {
  id: string;
  type: IntegrityCheckType;
  severity: IntegritySeverity;
  title: string;
  description: string;
  affectedEntity?: string;
  affectedEntityType?: string;
  detectedAt: Date;
  resolvedAt?: Date;
  autoResolvable: boolean;
  metadata: Record<string, unknown>;
}

export interface IntegrityCheckResult {
  type: IntegrityCheckType;
  passed: boolean;
  issuesFound: number;
  issues: IntegrityIssue[];
  checkedAt: Date;
  durationMs: number;
}

export interface IntegrityScanConfig {
  // Which checks to run
  enabledChecks: IntegrityCheckType[];

  // Limits
  maxIssuesPerCheck: number;
  scanTimeoutMs: number;

  // Scheduling
  scanIntervalMs: number;
}

export interface IntegrityScanReport {
  id: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  checksRun: number;
  totalIssuesFound: number;
  issuesBySeverity: Record<IntegritySeverity, number>;
  results: IntegrityCheckResult[];
  triggeredBy: 'scheduled' | 'manual' | 'incident';
}
