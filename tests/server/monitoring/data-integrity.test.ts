/**
 * Data Integrity Watchdog Tests
 *
 * FEATURE 4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDataIntegrityWatchdog,
  resetDataIntegrityWatchdog,
  DataIntegrityWatchdog,
} from '../../../server/monitoring/data-integrity/data-integrity-watchdog';

describe('DataIntegrityWatchdog', () => {
  let watchdog: DataIntegrityWatchdog;

  beforeEach(() => {
    process.env.ENABLE_DATA_INTEGRITY_WATCHDOG = 'true';
    resetDataIntegrityWatchdog();
    watchdog = getDataIntegrityWatchdog();
  });

  afterEach(() => {
    watchdog.stop();
    resetDataIntegrityWatchdog();
    delete process.env.ENABLE_DATA_INTEGRITY_WATCHDOG;
  });

  describe('runScan', () => {
    it('should complete a scan and return a report', async () => {
      const report = await watchdog.runScan('manual');

      expect(report.id).toMatch(/^scan-/);
      expect(report.startedAt).toBeInstanceOf(Date);
      expect(report.completedAt).toBeInstanceOf(Date);
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
      expect(report.checksRun).toBeGreaterThan(0);
      expect(report.triggeredBy).toBe('manual');
      expect(report.results).toBeInstanceOf(Array);
    });

    it('should track issues by severity', async () => {
      const report = await watchdog.runScan('manual');

      expect(report.issuesBySeverity).toBeDefined();
      expect(typeof report.issuesBySeverity.info).toBe('number');
      expect(typeof report.issuesBySeverity.warning).toBe('number');
      expect(typeof report.issuesBySeverity.error).toBe('number');
      expect(typeof report.issuesBySeverity.critical).toBe('number');
    });

    it('should prevent concurrent scans', async () => {
      const scan1 = watchdog.runScan('manual');

      await expect(watchdog.runScan('manual')).rejects.toThrow('already in progress');

      await scan1;
    });

    it('should store reports', async () => {
      await watchdog.runScan('manual');

      const reports = watchdog.getReports();
      expect(reports.length).toBe(1);
    });
  });

  describe('getIssues', () => {
    it('should return empty array initially', () => {
      const issues = watchdog.getIssues();
      expect(issues).toEqual([]);
    });

    it('should filter out resolved issues by default', async () => {
      // Run scan to potentially find issues
      await watchdog.runScan('manual');

      const issues = watchdog.getIssues();
      for (const issue of issues) {
        expect(issue.resolvedAt).toBeUndefined();
      }
    });

    it('should include resolved issues when requested', async () => {
      await watchdog.runScan('manual');

      // Resolve any issues that were found
      const issues = watchdog.getIssues(false);
      if (issues.length > 0) {
        watchdog.resolveIssue(issues[0].id);
      }

      const allIssues = watchdog.getIssues(true);
      // Should include resolved ones
      expect(allIssues.length).toBeGreaterThanOrEqual(issues.length - 1);
    });
  });

  describe('resolveIssue', () => {
    it('should return false for non-existent issue', () => {
      const result = watchdog.resolveIssue('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getReports', () => {
    it('should return recent reports', async () => {
      await watchdog.runScan('manual');
      await watchdog.runScan('scheduled');

      const reports = watchdog.getReports(10);

      expect(reports.length).toBe(2);
      expect(reports[0].triggeredBy).toBe('manual');
      expect(reports[1].triggeredBy).toBe('scheduled');
    });

    it('should respect limit', async () => {
      await watchdog.runScan('manual');
      await watchdog.runScan('manual');
      await watchdog.runScan('manual');

      const reports = watchdog.getReports(2);

      expect(reports.length).toBe(2);
    });
  });

  describe('getReport', () => {
    it('should return specific report by ID', async () => {
      const originalReport = await watchdog.runScan('manual');

      const retrieved = watchdog.getReport(originalReport.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(originalReport.id);
    });

    it('should return undefined for non-existent report', () => {
      const report = watchdog.getReport('non-existent');
      expect(report).toBeUndefined();
    });
  });

  describe('isScanInProgress', () => {
    it('should return false when not scanning', () => {
      expect(watchdog.isScanInProgress()).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(watchdog.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      delete process.env.ENABLE_DATA_INTEGRITY_WATCHDOG;
      resetDataIntegrityWatchdog();
      const disabled = getDataIntegrityWatchdog();

      expect(disabled.isEnabled()).toBe(false);
    });
  });
});
