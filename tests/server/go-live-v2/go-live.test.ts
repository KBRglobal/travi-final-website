/**
 * Unit Tests - Go-Live Switch v2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger
vi.mock('../../../server/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Go-Live Service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_GO_LIVE_V2 = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_GO_LIVE_V2;
    delete process.env.ENABLE_SITEMAP;
    delete process.env.ENABLE_SEARCH;
    delete process.env.ENABLE_PLATFORM_READINESS;
    delete process.env.ENABLE_COMPLIANCE_ENGINE;
  });

  it('should initialize when enabled', async () => {
    const { getGoLiveService, resetGoLiveService } = await import(
      '../../../server/go-live-v2/service'
    );

    resetGoLiveService();
    const service = getGoLiveService();
    expect(service.isEnabled()).toBe(true);
  });

  describe('runChecks', () => {
    it('should run all checks', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const checks = await service.runChecks();

      expect(checks.length).toBe(8);
      expect(checks.find(c => c.id === 'no-incidents')).toBeDefined();
      expect(checks.find(c => c.id === 'no-blocked-publishes')).toBeDefined();
      expect(checks.find(c => c.id === 'sitemap-enabled')).toBeDefined();
      expect(checks.find(c => c.id === 'search-enabled')).toBeDefined();
      expect(checks.find(c => c.id === 'autonomy-not-blocking')).toBeDefined();
      expect(checks.find(c => c.id === 'platform-readiness')).toBeDefined();
      expect(checks.find(c => c.id === 'compliance')).toBeDefined();
      expect(checks.find(c => c.id === 'database-healthy')).toBeDefined();
    });

    it('should pass sitemap check when not explicitly disabled', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const checks = await service.runChecks();
      const sitemapCheck = checks.find(c => c.id === 'sitemap-enabled');

      expect(sitemapCheck?.status).toBe('pass');
    });

    it('should warn when sitemap is disabled', async () => {
      process.env.ENABLE_SITEMAP = 'false';

      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const checks = await service.runChecks();
      const sitemapCheck = checks.find(c => c.id === 'sitemap-enabled');

      expect(sitemapCheck?.status).toBe('warn');
    });

    it('should skip platform readiness when not enabled', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const checks = await service.runChecks();
      const readinessCheck = checks.find(c => c.id === 'platform-readiness');

      expect(readinessCheck?.status).toBe('skip');
    });

    it('should check platform readiness when enabled', async () => {
      process.env.ENABLE_PLATFORM_READINESS = 'true';

      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const checks = await service.runChecks();
      const readinessCheck = checks.find(c => c.id === 'platform-readiness');

      expect(readinessCheck?.status).toBe('pass');
    });

    it('should skip compliance when not enabled', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const checks = await service.runChecks();
      const complianceCheck = checks.find(c => c.id === 'compliance');

      expect(complianceCheck?.status).toBe('skip');
    });
  });

  describe('getStatus', () => {
    it('should return ready status when all checks pass', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const status = await service.getStatus();

      expect(status.timestamp).toBeDefined();
      expect(status.status).toBe('ready');
      expect(status.ready).toBe(true);
      expect(status.blockers.length).toBe(0);
      expect(status.summary.total).toBe(8);
    });

    it('should include summary counts', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const status = await service.getStatus();

      expect(status.summary).toHaveProperty('total');
      expect(status.summary).toHaveProperty('passed');
      expect(status.summary).toHaveProperty('failed');
      expect(status.summary).toHaveProperty('warned');
      expect(status.summary).toHaveProperty('skipped');
    });

    it('should include recommendation', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const status = await service.getStatus();

      expect(status.recommendation).toBeDefined();
      expect(status.recommendation.length).toBeGreaterThan(0);
    });

    it('should record check in history', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      await service.getStatus();
      const history = service.getHistory();

      expect(history.length).toBe(1);
      expect(history[0].status).toBe('ready');
    });
  });

  describe('Override', () => {
    it('should set override', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const override = service.setOverride({
        reason: 'Emergency launch',
        overriddenBy: 'admin@example.com',
      });

      expect(override.active).toBe(true);
      expect(override.reason).toBe('Emergency launch');
      expect(override.overriddenBy).toBe('admin@example.com');
    });

    it('should set override with expiration', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const override = service.setOverride({
        reason: 'Temporary override',
        overriddenBy: 'admin@example.com',
        expiresInHours: 24,
      });

      expect(override.expiresAt).toBeDefined();
      expect(override.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return overridden status when override is active', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      service.setOverride({
        reason: 'Test override',
        overriddenBy: 'admin',
      });

      const status = await service.getStatus();

      expect(status.status).toBe('overridden');
      expect(status.ready).toBe(true);
      expect(status.override?.active).toBe(true);
    });

    it('should get current override', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      expect(service.getOverride()).toBeNull();

      service.setOverride({
        reason: 'Test',
        overriddenBy: 'admin',
      });

      expect(service.getOverride()).not.toBeNull();
    });

    it('should clear override', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      service.setOverride({
        reason: 'Test',
        overriddenBy: 'admin',
      });

      expect(service.getOverride()).not.toBeNull();

      const cleared = service.clearOverride();

      expect(cleared).toBe(true);
      expect(service.getOverride()).toBeNull();
    });

    it('should return false when clearing non-existent override', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      const cleared = service.clearOverride();

      expect(cleared).toBe(false);
    });
  });

  describe('History', () => {
    it('should track status checks in history', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      await service.getStatus();
      await service.getStatus();
      await service.getStatus();

      const history = service.getHistory();

      expect(history.length).toBe(3);
    });

    it('should limit history retrieval', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      for (let i = 0; i < 10; i++) {
        await service.getStatus();
      }

      const history = service.getHistory(5);

      expect(history.length).toBe(5);
    });

    it('should include check summary in history', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      await service.getStatus();
      const history = service.getHistory();

      expect(history[0].checksSummary).toBeDefined();
      expect(history[0].checksSummary.passed).toBeDefined();
      expect(history[0].checksSummary.failed).toBeDefined();
    });

    it('should clear history on reset', async () => {
      const { getGoLiveService, resetGoLiveService } = await import(
        '../../../server/go-live-v2/service'
      );

      resetGoLiveService();
      const service = getGoLiveService();

      await service.getStatus();
      expect(service.getHistory().length).toBe(1);

      service.clear();
      expect(service.getHistory().length).toBe(0);
    });
  });
});
