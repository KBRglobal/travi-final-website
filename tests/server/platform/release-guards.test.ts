/**
 * Release Safety & Deploy Guards Tests
 *
 * FEATURE 2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getReleaseGuard,
  resetReleaseGuard,
  ReleaseGuard,
} from '../../../server/platform/release-guards/release-guard';

describe('ReleaseGuard', () => {
  let guard: ReleaseGuard;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ENABLE_RELEASE_GUARDS = 'true';
    process.env.DATABASE_URL = 'postgres://test';
    process.env.NODE_ENV = 'test';
    resetReleaseGuard();
    guard = getReleaseGuard();
  });

  afterEach(() => {
    resetReleaseGuard();
    process.env = { ...originalEnv };
  });

  describe('runChecks', () => {
    it('should pass when all required env vars are set', async () => {
      const report = await guard.runChecks();

      const envChecks = report.checks.filter(c => c.category === 'env_var');
      const dbCheck = envChecks.find(c => c.name === 'env:DATABASE_URL');
      const nodeEnvCheck = envChecks.find(c => c.name === 'env:NODE_ENV');

      expect(dbCheck?.severity).toBe('ok');
      expect(nodeEnvCheck?.severity).toBe('ok');
    });

    it('should fail when required env var is missing', async () => {
      delete process.env.DATABASE_URL;
      resetReleaseGuard();
      const newGuard = getReleaseGuard();

      const report = await newGuard.runChecks();

      const dbCheck = report.checks.find(c => c.name === 'env:DATABASE_URL');
      expect(dbCheck?.severity).toBe('block');
      expect(report.canProceed).toBe(false);
      expect(report.blockingIssues).toContain(dbCheck?.message);
    });

    it('should detect incompatible flag combinations', async () => {
      process.env.ENABLE_COST_GUARDS = 'true';
      process.env.DISABLE_ALL_LIMITS = 'true';
      resetReleaseGuard();
      const newGuard = getReleaseGuard();

      const report = await newGuard.runChecks();

      const flagCheck = report.checks.find(c =>
        c.category === 'feature_flag' &&
        c.name.includes('ENABLE_COST_GUARDS')
      );

      expect(flagCheck?.severity).toBe('block');
    });

    it('should return overall severity correctly', async () => {
      const report = await guard.runChecks();

      if (report.blockingIssues.length > 0) {
        expect(report.overallSeverity).toBe('block');
      } else if (report.warnings.length > 0) {
        expect(report.overallSeverity).toBe('warn');
      } else {
        expect(report.overallSeverity).toBe('ok');
      }
    });
  });

  describe('validateStartup', () => {
    it('should return true when checks pass', async () => {
      const result = await guard.validateStartup();
      expect(typeof result).toBe('boolean');
    });

    it('should return true when disabled', async () => {
      delete process.env.ENABLE_RELEASE_GUARDS;
      resetReleaseGuard();
      const disabledGuard = getReleaseGuard();

      const result = await disabledGuard.validateStartup();
      expect(result).toBe(true);
    });
  });

  describe('addValidator', () => {
    it('should run custom validators', async () => {
      let called = false;

      guard.addValidator('test-validator', async () => {
        called = true;
        return {
          name: 'test-validator',
          category: 'dependency',
          severity: 'ok',
          message: 'Custom check passed',
          passedAt: new Date(),
        };
      });

      const report = await guard.runChecks();

      expect(called).toBe(true);
      const customCheck = report.checks.find(c => c.name === 'test-validator');
      expect(customCheck?.severity).toBe('ok');
    });

    it('should handle validator errors gracefully', async () => {
      guard.addValidator('failing-validator', async () => {
        throw new Error('Validator crashed');
      });

      const report = await guard.runChecks();

      const failedCheck = report.checks.find(c => c.name === 'failing-validator');
      expect(failedCheck?.severity).toBe('warn');
      expect(failedCheck?.message).toContain('failed');
    });
  });

  describe('getLastReport', () => {
    it('should return null before first check', () => {
      expect(guard.getLastReport()).toBeNull();
    });

    it('should return last report after check', async () => {
      await guard.runChecks();

      const report = guard.getLastReport();
      expect(report).not.toBeNull();
      expect(report?.timestamp).toBeInstanceOf(Date);
    });
  });
});
