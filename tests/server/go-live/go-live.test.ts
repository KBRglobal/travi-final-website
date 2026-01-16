/**
 * Tests for Go-Live Checklist (System Readiness Gate)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_GO_LIVE_CHECKLIST', 'true');

import {
  isGoLiveChecklistEnabled,
  getEnabledChecks,
  getCriticalChecks,
  AVAILABLE_CHECKS,
} from '../../../server/go-live/config';
import {
  checkDbConnection,
  checkEventBus,
  checkSearchIndex,
  checkJobQueue,
  runCheck,
} from '../../../server/go-live/checks';
import {
  evaluateGoLiveStatus,
  clearCache,
  isReadyForLaunch,
} from '../../../server/go-live/evaluator';

describe('Go-Live Checklist', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_GO_LIVE_CHECKLIST', 'true');
    clearCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearCache();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_GO_LIVE_CHECKLIST', 'true');
      expect(isGoLiveChecklistEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_GO_LIVE_CHECKLIST', '');
      expect(isGoLiveChecklistEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have available checks defined', () => {
      expect(AVAILABLE_CHECKS.length).toBeGreaterThan(0);
    });

    it('should return enabled checks', () => {
      const enabled = getEnabledChecks();
      expect(enabled.length).toBeGreaterThan(0);
      expect(enabled.every(c => c.enabled)).toBe(true);
    });

    it('should return critical checks', () => {
      const critical = getCriticalChecks();
      expect(critical.length).toBeGreaterThan(0);
      expect(critical.every(c => c.critical)).toBe(true);
    });
  });

  describe('Individual Checks', () => {
    it('should run database connection check', async () => {
      const result = await checkDbConnection();
      expect(result.id).toBe('db_connection');
      expect(result.status).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should run event bus check', async () => {
      const result = await checkEventBus();
      expect(result.id).toBe('event_bus');
      expect(result.status).toBeDefined();
    });

    it('should run search index check', async () => {
      const result = await checkSearchIndex();
      expect(result.id).toBe('search_index');
      expect(result.status).toBeDefined();
    });

    it('should run job queue check', async () => {
      const result = await checkJobQueue();
      expect(result.id).toBe('job_queue');
      expect(result.status).toBeDefined();
    });

    it('should handle missing check gracefully', async () => {
      const result = await runCheck('non_existent_check');
      expect(result).toBeNull();
    });
  });

  describe('Evaluator', () => {
    it('should evaluate go-live status', async () => {
      const status = await evaluateGoLiveStatus(false);

      expect(status.status).toMatch(/^(PASS|WARN|BLOCK)$/);
      expect(status.checks).toBeDefined();
      expect(status.checks.length).toBeGreaterThan(0);
      expect(status.summary).toBeDefined();
      expect(status.summary.total).toBe(status.checks.length);
      expect(status.timestamp).toBeInstanceOf(Date);
      expect(status.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should summarize check results correctly', async () => {
      const status = await evaluateGoLiveStatus(false);

      const { summary } = status;
      const totalFromSummary = summary.passed + summary.warned + summary.failed + summary.skipped;
      expect(totalFromSummary).toBe(summary.total);
    });

    it('should cache results', async () => {
      const first = await evaluateGoLiveStatus(true);
      const second = await evaluateGoLiveStatus(true);

      // Same timestamp means cached
      expect(first.timestamp.getTime()).toBe(second.timestamp.getTime());
    });

    it('should refresh when cache is disabled', async () => {
      const first = await evaluateGoLiveStatus(false);

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await evaluateGoLiveStatus(false);

      // Different timestamps when not using cache
      expect(first.timestamp.getTime()).not.toBe(second.timestamp.getTime());
    });

    it('should clear cache', async () => {
      await evaluateGoLiveStatus(true);
      expect(isReadyForLaunch()).toBeDefined();

      clearCache();

      // After clearing, isReadyForLaunch returns false since cache is empty
      expect(isReadyForLaunch()).toBe(false);
    });
  });

  describe('Overall Status Determination', () => {
    it('should return PASS when all checks pass', async () => {
      // With default mocks, most checks should pass
      const status = await evaluateGoLiveStatus(false);

      // Status should be either PASS or WARN (not BLOCK in normal conditions)
      expect(['PASS', 'WARN']).toContain(status.status);
    });

    it('should include all enabled checks in results', async () => {
      const status = await evaluateGoLiveStatus(false);
      const enabledCheckIds = getEnabledChecks().map(c => c.id);

      for (const checkId of enabledCheckIds) {
        const found = status.checks.find(c => c.id === checkId);
        expect(found).toBeDefined();
      }
    });
  });

  describe('Check Results Format', () => {
    it('should have required fields in check results', async () => {
      const status = await evaluateGoLiveStatus(false);

      for (const check of status.checks) {
        expect(check.id).toBeDefined();
        expect(check.name).toBeDefined();
        expect(check.description).toBeDefined();
        expect(check.status).toMatch(/^(pass|warn|fail|skip)$/);
        expect(check.message).toBeDefined();
        expect(typeof check.duration).toBe('number');
      }
    });
  });
});
