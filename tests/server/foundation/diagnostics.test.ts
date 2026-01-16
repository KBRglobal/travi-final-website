/**
 * Diagnostics Service Tests
 * Phase 1 Foundation: Tests for aggregated diagnostics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database
vi.mock('../../../server/db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
  },
}));

// Mock the AI providers
vi.mock('../../../server/ai/providers', () => ({
  getAIClient: () => ({ client: {}, provider: 'openai' }),
}));

// Mock the security module
vi.mock('../../../server/security', () => ({
  safeMode: false,
}));

// Mock the api-versioning module
vi.mock('../../../server/middleware/api-versioning', () => ({
  getVersionInfo: () => ({
    currentVersion: 'v1',
    supportedVersions: ['v1'],
    deprecatedEndpoints: [],
  }),
}));

// Mock the domains module
vi.mock('../../../server/domains/index', () => ({
  domains: {
    content: { name: 'content', enabled: false },
    system: { name: 'system', enabled: true },
  },
  getEnabledDomains: () => ['system'],
}));

describe('DiagnosticsService', () => {
  let diagnosticsService: typeof import('../../../server/domains/system/services/diagnostics.service').diagnosticsService;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../server/domains/system/services/diagnostics.service');
    diagnosticsService = module.diagnosticsService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDiagnostics', () => {
    it('should return aggregated diagnostics with all sections', async () => {
      const response = await diagnosticsService.getDiagnostics();

      expect(response.timestamp).toBeDefined();
      expect(response.health).toBeDefined();
      expect(response.system).toBeDefined();
      expect(response.domains).toBeDefined();
      expect(response.featureFlags).toBeDefined();
      expect(response.services).toBeDefined();
    });

    it('should include correlationId when provided', async () => {
      const response = await diagnosticsService.getDiagnostics('cid_test_123');

      expect(response.correlationId).toBe('cid_test_123');
    });

    it('should include health status', async () => {
      const response = await diagnosticsService.getDiagnostics();

      expect(response.health.status).toBeDefined();
      expect(['healthy', 'unhealthy', 'degraded']).toContain(response.health.status);
      expect(response.health.checks).toBeDefined();
    });

    it('should include system info', async () => {
      const response = await diagnosticsService.getDiagnostics();

      expect(response.system.version).toBeDefined();
      expect(response.system.nodeVersion).toBeDefined();
      expect(response.system.environment).toBeDefined();
      expect(response.system.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(response.system.uptimeFormatted).toBeDefined();
      expect(response.system.startedAt).toBeDefined();
    });

    it('should include domains list', async () => {
      const response = await diagnosticsService.getDiagnostics();

      expect(Array.isArray(response.domains)).toBe(true);
      expect(response.domains.length).toBeGreaterThan(0);

      const domain = response.domains[0];
      expect(domain.name).toBeDefined();
      expect(typeof domain.enabled).toBe('boolean');
    });

    it('should include feature flags summary', async () => {
      const response = await diagnosticsService.getDiagnostics();

      expect(response.featureFlags.total).toBeGreaterThan(0);
      expect(typeof response.featureFlags.enabled).toBe('number');
      expect(typeof response.featureFlags.disabled).toBe('number');
      expect(response.featureFlags.foundation).toBeDefined();
    });

    it('should include services status', async () => {
      const response = await diagnosticsService.getDiagnostics();

      expect(response.services.activeAIProvider).toBe('openai');
      expect(response.services.configured).toBeDefined();
      expect(typeof response.services.configured.ai).toBe('boolean');
    });

    it('should include memory info in health checks', async () => {
      const response = await diagnosticsService.getDiagnostics();

      if (response.health.checks.memory) {
        expect(response.health.checks.memory.status).toBeDefined();
        expect(typeof response.health.checks.memory.usagePercent).toBe('number');
        expect(typeof response.health.checks.memory.heapUsedMB).toBe('number');
        expect(typeof response.health.checks.memory.heapTotalMB).toBe('number');
      }
    });
  });
});
