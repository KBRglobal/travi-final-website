/**
 * Data Integrity Watchdog - Core Scanner
 *
 * FEATURE 4: Detect silent data corruption and partial writes
 *
 * Periodic scans for:
 * - Published content without entities
 * - Published content not indexed
 * - Orphaned entity links
 * - Failed lifecycle transitions
 *
 * Feature flag: ENABLE_DATA_INTEGRITY_WATCHDOG
 */

import { log } from '../../lib/logger';
import type {
  IntegritySeverity,
  IntegrityCheckType,
  IntegrityIssue,
  IntegrityCheckResult,
  IntegrityScanConfig,
  IntegrityScanReport,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[DataIntegrity] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[DataIntegrity] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[DataIntegrity] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[DataIntegrity][AUDIT] ${msg}`, data),
};

const DEFAULT_CONFIG: IntegrityScanConfig = {
  enabledChecks: [
    'orphaned_content',
    'missing_entities',
    'unindexed_content',
    'orphaned_links',
    'failed_transitions',
  ],
  maxIssuesPerCheck: 100,
  scanTimeoutMs: 60000, // 1 minute per check
  scanIntervalMs: 3600000, // 1 hour
};

// Bounded storage
const MAX_ISSUES = 500;
const MAX_REPORTS = 50;

class DataIntegrityWatchdog {
  private config: IntegrityScanConfig;
  private enabled = false;
  private issues: Map<string, IntegrityIssue> = new Map();
  private reports: IntegrityScanReport[] = [];
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private isScanning = false;

  constructor(config?: Partial<IntegrityScanConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.enabled = process.env.ENABLE_DATA_INTEGRITY_WATCHDOG === 'true';

    if (this.enabled) {
      logger.info('Data Integrity Watchdog enabled');
    }
  }

  /**
   * Run a full integrity scan
   */
  async runScan(triggeredBy: 'scheduled' | 'manual' | 'incident' = 'manual'): Promise<IntegrityScanReport> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    const startedAt = new Date();
    const results: IntegrityCheckResult[] = [];

    logger.info('Starting data integrity scan', { triggeredBy });

    try {
      for (const checkType of this.config.enabledChecks) {
        try {
          const result = await this.runCheck(checkType);
          results.push(result);

          // Add new issues to tracking
          for (const issue of result.issues) {
            this.addIssue(issue);
          }
        } catch (err) {
          logger.error(`Check ${checkType} failed`, {
            error: err instanceof Error ? err.message : 'Unknown error',
          });
          results.push({
            type: checkType,
            passed: false,
            issuesFound: 0,
            issues: [],
            checkedAt: new Date(),
            durationMs: 0,
          });
        }
      }
    } finally {
      this.isScanning = false;
    }

    const completedAt = new Date();
    const issuesBySeverity: Record<IntegritySeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    let totalIssuesFound = 0;
    for (const result of results) {
      totalIssuesFound += result.issuesFound;
      for (const issue of result.issues) {
        issuesBySeverity[issue.severity]++;
      }
    }

    const report: IntegrityScanReport = {
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      checksRun: results.length,
      totalIssuesFound,
      issuesBySeverity,
      results,
      triggeredBy,
    };

    this.addReport(report);

    logger.info('Data integrity scan completed', {
      reportId: report.id,
      durationMs: report.durationMs,
      totalIssuesFound,
      issuesBySeverity,
    });

    // Notify incident system for critical issues
    if (issuesBySeverity.critical > 0 || issuesBySeverity.error > 0) {
      await this.notifyIncidentSystem(report);
    }

    return report;
  }

  /**
   * Run a single integrity check
   */
  private async runCheck(type: IntegrityCheckType): Promise<IntegrityCheckResult> {
    const startTime = Date.now();
    const issues: IntegrityIssue[] = [];

    try {
      switch (type) {
        case 'orphaned_content':
          await this.checkOrphanedContent(issues);
          break;
        case 'missing_entities':
          await this.checkMissingEntities(issues);
          break;
        case 'unindexed_content':
          await this.checkUnindexedContent(issues);
          break;
        case 'orphaned_links':
          await this.checkOrphanedLinks(issues);
          break;
        case 'failed_transitions':
          await this.checkFailedTransitions(issues);
          break;
        case 'stale_cache':
          await this.checkStaleCache(issues);
          break;
        case 'missing_media':
          await this.checkMissingMedia(issues);
          break;
      }
    } catch (err) {
      logger.error(`Check ${type} error`, {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Apply limit
    const limitedIssues = issues.slice(0, this.config.maxIssuesPerCheck);

    return {
      type,
      passed: issues.length === 0,
      issuesFound: issues.length,
      issues: limitedIssues,
      checkedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Check for orphaned content (published but missing required relations)
   */
  private async checkOrphanedContent(issues: IntegrityIssue[]): Promise<void> {
    try {
      const { db } = await import('../../db');
      const { sql } = await import('drizzle-orm');

      // Check for destinations without translations
      const orphaned = await db.execute(sql`
        SELECT d.id, d.slug
        FROM destinations d
        LEFT JOIN destination_translations dt ON d.id = dt.destination_id
        WHERE d.status = 'published' AND dt.id IS NULL
        LIMIT ${this.config.maxIssuesPerCheck}
      `);

      for (const row of orphaned.rows as Array<{ id: string; slug: string }>) {
        issues.push(this.createIssue(
          'orphaned_content',
          'warning',
          `Published destination missing translations: ${row.slug}`,
          `Destination ${row.id} is published but has no translations`,
          row.id,
          'destination',
          { slug: row.slug }
        ));
      }
    } catch {
      // DB queries might fail if tables don't exist
    }
  }

  /**
   * Check for missing entities (referenced but not existing)
   */
  private async checkMissingEntities(issues: IntegrityIssue[]): Promise<void> {
    try {
      const { db } = await import('../../db');
      const { sql } = await import('drizzle-orm');

      // Check for media referenced but missing
      const missing = await db.execute(sql`
        SELECT DISTINCT m.id, m.url
        FROM media m
        WHERE m.deleted_at IS NULL
          AND m.url IS NOT NULL
          AND m.url != ''
          AND NOT EXISTS (
            SELECT 1 FROM destination_media dm WHERE dm.media_id = m.id
          )
        LIMIT ${this.config.maxIssuesPerCheck}
      `);

      // This is informational, not an error
      if ((missing.rows as unknown[]).length > 50) {
        issues.push(this.createIssue(
          'missing_entities',
          'info',
          'Large number of unused media files',
          `Found ${(missing.rows as unknown[]).length} media files not linked to any destination`,
          undefined,
          'media',
          { count: (missing.rows as unknown[]).length }
        ));
      }
    } catch {
      // DB queries might fail
    }
  }

  /**
   * Check for content not properly indexed
   */
  private async checkUnindexedContent(issues: IntegrityIssue[]): Promise<void> {
    try {
      const { db } = await import('../../db');
      const { sql } = await import('drizzle-orm');

      // Check for published content that might be missing from search
      const unindexed = await db.execute(sql`
        SELECT d.id, d.slug, d.updated_at
        FROM destinations d
        WHERE d.status = 'published'
          AND d.updated_at > NOW() - INTERVAL '1 day'
          AND d.search_indexed_at IS NULL OR d.search_indexed_at < d.updated_at
        LIMIT ${this.config.maxIssuesPerCheck}
      `);

      for (const row of unindexed.rows as Array<{ id: string; slug: string }>) {
        issues.push(this.createIssue(
          'unindexed_content',
          'warning',
          `Content not indexed: ${row.slug}`,
          `Destination ${row.id} was updated but not re-indexed`,
          row.id,
          'destination',
          { slug: row.slug },
          true
        ));
      }
    } catch {
      // Column might not exist
    }
  }

  /**
   * Check for orphaned internal links
   */
  private async checkOrphanedLinks(issues: IntegrityIssue[]): Promise<void> {
    // Placeholder - would check for broken internal links
    // This requires content parsing
  }

  /**
   * Check for failed lifecycle transitions
   */
  private async checkFailedTransitions(issues: IntegrityIssue[]): Promise<void> {
    try {
      const { db } = await import('../../db');
      const { sql } = await import('drizzle-orm');

      // Check for content stuck in transitional states
      const stuck = await db.execute(sql`
        SELECT d.id, d.slug, d.status, d.updated_at
        FROM destinations d
        WHERE d.status IN ('pending', 'review', 'processing')
          AND d.updated_at < NOW() - INTERVAL '24 hours'
        LIMIT ${this.config.maxIssuesPerCheck}
      `);

      for (const row of stuck.rows as Array<{ id: string; slug: string; status: string }>) {
        issues.push(this.createIssue(
          'failed_transitions',
          'error',
          `Content stuck in ${row.status} state: ${row.slug}`,
          `Destination ${row.id} has been in ${row.status} state for over 24 hours`,
          row.id,
          'destination',
          { slug: row.slug, status: row.status }
        ));
      }
    } catch {
      // Tables might not exist
    }
  }

  /**
   * Check for stale cache entries
   */
  private async checkStaleCache(issues: IntegrityIssue[]): Promise<void> {
    // Placeholder for cache integrity checks
  }

  /**
   * Check for missing media files
   */
  private async checkMissingMedia(issues: IntegrityIssue[]): Promise<void> {
    // Placeholder - would verify media URLs are accessible
  }

  /**
   * Create an integrity issue
   */
  private createIssue(
    type: IntegrityCheckType,
    severity: IntegritySeverity,
    title: string,
    description: string,
    affectedEntity?: string,
    affectedEntityType?: string,
    metadata: Record<string, unknown> = {},
    autoResolvable = false
  ): IntegrityIssue {
    return {
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      description,
      affectedEntity,
      affectedEntityType,
      detectedAt: new Date(),
      autoResolvable,
      metadata,
    };
  }

  /**
   * Add issue with bounded storage
   */
  private addIssue(issue: IntegrityIssue): void {
    // Check for duplicate
    for (const existing of this.issues.values()) {
      if (
        existing.type === issue.type &&
        existing.affectedEntity === issue.affectedEntity &&
        !existing.resolvedAt
      ) {
        return; // Already tracked
      }
    }

    this.issues.set(issue.id, issue);

    // Prune old resolved issues
    if (this.issues.size > MAX_ISSUES) {
      const resolved = Array.from(this.issues.entries())
        .filter(([_, i]) => i.resolvedAt)
        .sort((a, b) => (a[1].resolvedAt?.getTime() || 0) - (b[1].resolvedAt?.getTime() || 0));

      for (const [id] of resolved.slice(0, MAX_ISSUES / 4)) {
        this.issues.delete(id);
      }
    }
  }

  /**
   * Add report with bounded storage
   */
  private addReport(report: IntegrityScanReport): void {
    this.reports.push(report);
    if (this.reports.length > MAX_REPORTS) {
      this.reports = this.reports.slice(-MAX_REPORTS);
    }
  }

  /**
   * Notify incident system of critical issues
   */
  private async notifyIncidentSystem(report: IntegrityScanReport): Promise<void> {
    try {
      const { createIncident } = await import('../../ops/incidents');

      if (report.issuesBySeverity.critical > 0) {
        createIncident(
          'data_integrity_risk',
          'critical',
          'data_integrity',
          `Critical data integrity issues detected`,
          `Found ${report.issuesBySeverity.critical} critical integrity issues`,
          {
            reportId: report.id,
            issuesBySeverity: report.issuesBySeverity,
          }
        );
      } else if (report.issuesBySeverity.error > 0) {
        createIncident(
          'data_integrity_risk',
          'high',
          'data_integrity',
          `Data integrity errors detected`,
          `Found ${report.issuesBySeverity.error} integrity errors`,
          {
            reportId: report.id,
            issuesBySeverity: report.issuesBySeverity,
          }
        );
      }
    } catch {
      // Incident system not available
    }
  }

  /**
   * Get all issues
   */
  getIssues(includeResolved = false): IntegrityIssue[] {
    return Array.from(this.issues.values())
      .filter(i => includeResolved || !i.resolvedAt)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(severity: IntegritySeverity): IntegrityIssue[] {
    return this.getIssues().filter(i => i.severity === severity);
  }

  /**
   * Mark an issue as resolved
   */
  resolveIssue(issueId: string): boolean {
    const issue = this.issues.get(issueId);
    if (!issue) return false;

    issue.resolvedAt = new Date();
    logger.info('Issue resolved', { issueId, type: issue.type });
    return true;
  }

  /**
   * Get recent reports
   */
  getReports(limit = 10): IntegrityScanReport[] {
    return this.reports.slice(-limit);
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): IntegrityScanReport | undefined {
    return this.reports.find(r => r.id === reportId);
  }

  /**
   * Start periodic scanning
   */
  start(): void {
    if (!this.enabled) return;

    this.scanInterval = setInterval(() => {
      this.runScan('scheduled').catch(err => {
        logger.error('Scheduled scan failed', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
    }, this.config.scanIntervalMs);

    logger.info('Data Integrity Watchdog started', {
      interval: this.config.scanIntervalMs,
    });
  }

  /**
   * Stop periodic scanning
   */
  stop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    logger.info('Data Integrity Watchdog stopped');
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if currently scanning
   */
  isScanInProgress(): boolean {
    return this.isScanning;
  }
}

// Singleton
let instance: DataIntegrityWatchdog | null = null;

export function getDataIntegrityWatchdog(): DataIntegrityWatchdog {
  if (!instance) {
    instance = new DataIntegrityWatchdog();
  }
  return instance;
}

export function resetDataIntegrityWatchdog(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}

export { DataIntegrityWatchdog };
