/**
 * System Info Service Tests
 * Phase 1 Foundation: Tests for version, uptime, and build info
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the api-versioning module
vi.mock('../../../server/middleware/api-versioning', () => ({
  getVersionInfo: () => ({
    currentVersion: 'v1',
    supportedVersions: ['v1'],
    deprecatedEndpoints: [
      {
        path: '/api/old-endpoint',
        info: {
          deprecatedAt: '2024-01-01',
          replacement: '/api/new-endpoint',
        },
      },
    ],
  }),
}));

describe('SystemInfoService', () => {
  let systemInfoService: typeof import('../../../server/domains/system/services/system-info.service').systemInfoService;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../server/domains/system/services/system-info.service');
    systemInfoService = module.systemInfoService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getVersion', () => {
    it('should return version info with all required fields', () => {
      const response = systemInfoService.getVersion();

      expect(response.currentVersion).toBe('v1');
      expect(response.supportedVersions).toContain('v1');
      expect(response.timestamp).toBeDefined();
      expect(Array.isArray(response.deprecatedEndpoints)).toBe(true);
    });

    it('should include correlationId when provided', () => {
      const response = systemInfoService.getVersion('cid_test_123');

      expect(response.correlationId).toBe('cid_test_123');
    });

    it('should include deprecated endpoints info', () => {
      const response = systemInfoService.getVersion();

      expect(response.deprecatedEndpoints.length).toBeGreaterThan(0);
      expect(response.deprecatedEndpoints[0].path).toBe('/api/old-endpoint');
    });
  });

  describe('getUptime', () => {
    it('should return uptime info with all required fields', () => {
      const response = systemInfoService.getUptime();

      expect(response.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(response.uptimeFormatted).toBeDefined();
      expect(response.startedAt).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should include correlationId when provided', () => {
      const response = systemInfoService.getUptime('cid_test_123');

      expect(response.correlationId).toBe('cid_test_123');
    });

    it('should format uptime correctly', () => {
      const response = systemInfoService.getUptime();

      // Should contain at least seconds
      expect(response.uptimeFormatted).toMatch(/\d+s/);
    });
  });

  describe('getBuildInfo', () => {
    it('should return build info with all required fields', () => {
      const response = systemInfoService.getBuildInfo();

      expect(response.version).toBeDefined();
      expect(response.nodeVersion).toBeDefined();
      expect(response.environment).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should include correlationId when provided', () => {
      const response = systemInfoService.getBuildInfo('cid_test_123');

      expect(response.correlationId).toBe('cid_test_123');
    });

    it('should return correct node version', () => {
      const response = systemInfoService.getBuildInfo();

      expect(response.nodeVersion).toBe(process.version);
    });
  });

  describe('getStartTime', () => {
    it('should return a Date object', () => {
      const startTime = systemInfoService.getStartTime();

      expect(startTime).toBeInstanceOf(Date);
    });

    it('should return a time in the past', () => {
      const startTime = systemInfoService.getStartTime();

      expect(startTime.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
