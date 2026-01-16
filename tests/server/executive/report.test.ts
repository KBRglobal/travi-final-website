/**
 * Tests for Executive Go-Live Report
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_EXECUTIVE_REPORT', 'true');

import {
  isExecutiveReportEnabled,
  REPORT_CONFIG,
} from '../../../server/executive/go-live-report/config';
import {
  generateReport,
  toMarkdown,
  toHtml,
  getReportHistory,
  getStatus,
  clearCache,
  clearHistory,
} from '../../../server/executive/go-live-report/generator';

describe('Executive Go-Live Report', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_EXECUTIVE_REPORT', 'true');
    clearHistory();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearHistory();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_EXECUTIVE_REPORT', 'true');
      expect(isExecutiveReportEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_EXECUTIVE_REPORT', '');
      expect(isExecutiveReportEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have valid config values', () => {
      expect(REPORT_CONFIG.maxTimelineHighlights).toBeGreaterThan(0);
      expect(REPORT_CONFIG.maxActionItems).toBeGreaterThan(0);
      expect(['json', 'markdown', 'html']).toContain(REPORT_CONFIG.defaultFormat);
    });
  });

  describe('Report Generation', () => {
    it('should generate JSON report', async () => {
      const report = await generateReport('json');

      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.format).toBe('json');
      expect(report.summary).toBeDefined();
      expect(report.scorecard).toBeDefined();
      expect(report.riskAssessment).toBeDefined();
    });

    it('should include executive summary', async () => {
      const report = await generateReport('json');

      expect(report.summary.recommendation).toBeDefined();
      expect(['GO', 'WAIT', 'ROLL_BACK']).toContain(report.summary.recommendation);
      expect(report.summary.confidence).toBeDefined();
      expect(report.summary.headline).toBeDefined();
      expect(Array.isArray(report.summary.keyPoints)).toBe(true);
    });

    it('should include readiness scorecard', async () => {
      const report = await generateReport('json');

      expect(report.scorecard.overall).toBeDefined();
      expect(report.scorecard.platform).toBeDefined();
      expect(report.scorecard.governance).toBeDefined();
      expect(report.scorecard.incidents).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(report.scorecard.trend);
    });

    it('should include risk assessment', async () => {
      const report = await generateReport('json');

      expect(report.riskAssessment.overallRisk).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(report.riskAssessment.overallRisk);
      expect(Array.isArray(report.riskAssessment.factors)).toBe(true);
      expect(Array.isArray(report.riskAssessment.mitigations)).toBe(true);
    });

    it('should include action items', async () => {
      const report = await generateReport('json');

      expect(Array.isArray(report.actionItems)).toBe(true);
      for (const item of report.actionItems) {
        expect(item.id).toBeDefined();
        expect(['critical', 'high', 'medium', 'low']).toContain(item.priority);
        expect(item.action).toBeDefined();
        expect(['pending', 'in_progress', 'completed', 'blocked']).toContain(item.status);
      }
    });

    it('should track requestedBy', async () => {
      const report = await generateReport('json', 'exec@company.com');

      expect(report.generatedBy).toBe('exec@company.com');
    });
  });

  describe('Report Formats', () => {
    it('should convert to markdown', async () => {
      const report = await generateReport('json');
      const md = toMarkdown(report);

      expect(md).toContain('# Go-Live Report');
      expect(md).toContain('## Executive Summary');
      expect(md).toContain(report.summary.recommendation);
    });

    it('should convert to HTML', async () => {
      const report = await generateReport('json');
      const html = toHtml(report);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Go-Live Report');
    });
  });

  describe('Caching', () => {
    it('should cache reports', async () => {
      const first = await generateReport('json');
      const second = await generateReport('json');

      expect(first.id).toBe(second.id);
    });

    it('should clear cache', async () => {
      const first = await generateReport('json');
      clearCache();
      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 5));
      const second = await generateReport('json');

      expect(first.id).not.toBe(second.id);
    });
  });

  describe('Report History', () => {
    it('should track report history', async () => {
      clearCache();
      await generateReport('json');
      clearCache();
      await generateReport('json');

      const history = getReportHistory();

      expect(history.length).toBe(2);
    });

    it('should limit history size', async () => {
      const history = getReportHistory(1);
      expect(history.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Status', () => {
    it('should report generator status', async () => {
      await generateReport('json');
      const status = getStatus();

      expect(status.enabled).toBe(true);
      expect(status.reportsGenerated).toBeGreaterThan(0);
      expect(status.lastGeneratedAt).toBeInstanceOf(Date);
    });
  });
});
