/**
 * Unit Tests - Admin Dashboard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../server/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Dashboard Service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ADMIN_DASHBOARD = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_ADMIN_DASHBOARD;
  });

  it('should initialize when enabled', async () => {
    const { getDashboardService, resetDashboardService } = await import(
      '../../../server/dashboard/service'
    );

    resetDashboardService();
    const service = getDashboardService();
    expect(service.isEnabled()).toBe(true);
  });

  it('should get summary', async () => {
    const { getDashboardService, resetDashboardService } = await import(
      '../../../server/dashboard/service'
    );

    resetDashboardService();
    const service = getDashboardService();
    const summary = await service.getSummary();

    expect(summary.timestamp).toBeDefined();
    expect(summary.content).toBeDefined();
    expect(summary.content.total).toBeGreaterThanOrEqual(0);
    expect(summary.issues).toBeDefined();
    expect(summary.system).toBeDefined();
    expect(summary.upcoming).toBeDefined();
  });

  it('should get content dashboard', async () => {
    const { getDashboardService, resetDashboardService } = await import(
      '../../../server/dashboard/service'
    );

    resetDashboardService();
    const service = getDashboardService();
    const dashboard = await service.getContentDashboard();

    expect(dashboard.timestamp).toBeDefined();
    expect(dashboard.counts).toBeDefined();
    expect(dashboard.counts.byStatus).toBeDefined();
    expect(Array.isArray(dashboard.recentlyPublished)).toBe(true);
    expect(Array.isArray(dashboard.blocked)).toBe(true);
  });

  it('should get system dashboard', async () => {
    const { getDashboardService, resetDashboardService } = await import(
      '../../../server/dashboard/service'
    );

    resetDashboardService();
    const service = getDashboardService();
    const dashboard = await service.getSystemDashboard();

    expect(dashboard.timestamp).toBeDefined();
    expect(dashboard.health).toBeDefined();
    expect(dashboard.health.overallStatus).toBeDefined();
    expect(dashboard.health.components).toBeDefined();
    expect(Array.isArray(dashboard.features)).toBe(true);
    expect(Array.isArray(dashboard.recentIssues)).toBe(true);
  });

  it('should include health score', async () => {
    const { getDashboardService, resetDashboardService } = await import(
      '../../../server/dashboard/service'
    );

    resetDashboardService();
    const service = getDashboardService();
    const dashboard = await service.getSystemDashboard();

    expect(dashboard.health.score).toBeGreaterThanOrEqual(0);
    expect(dashboard.health.score).toBeLessThanOrEqual(100);
  });

  it('should list features', async () => {
    const { getDashboardService, resetDashboardService } = await import(
      '../../../server/dashboard/service'
    );

    resetDashboardService();
    const service = getDashboardService();
    const dashboard = await service.getSystemDashboard();

    expect(dashboard.features.length).toBeGreaterThan(0);
    expect(dashboard.features[0]).toHaveProperty('name');
    expect(dashboard.features[0]).toHaveProperty('enabled');
    expect(dashboard.features[0]).toHaveProperty('status');
  });
});
