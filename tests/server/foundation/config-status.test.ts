/**
 * Config Status Service Tests
 * Phase 1 Foundation: Tests for configuration and feature flags
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the AI providers
vi.mock('../../../server/ai/providers', () => ({
  getAIClient: () => ({ client: {}, provider: 'openai' }),
}));

// Mock the security module
vi.mock('../../../server/security', () => ({
  safeMode: false,
}));

// Mock the domains module
vi.mock('../../../server/domains/index', () => ({
  domains: {
    content: { name: 'content', enabled: false },
    search: { name: 'search', enabled: false },
    system: { name: 'system', enabled: true },
  },
  getEnabledDomains: () => ['system'],
}));

describe('ConfigStatusService', () => {
  let configStatusService: typeof import('../../../server/domains/system/services/config-status.service').configStatusService;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../server/domains/system/services/config-status.service');
    configStatusService = module.configStatusService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfigStatus', () => {
    it('should return config status with all required fields', () => {
      const response = configStatusService.getConfigStatus();

      expect(response.timestamp).toBeDefined();
      expect(response.services).toBeDefined();
      expect(response.features).toBeDefined();
      expect(response.activeAIProvider).toBe('openai');
      expect(response.safeMode).toBe(false);
    });

    it('should include correlationId when provided', () => {
      const response = configStatusService.getConfigStatus('cid_test_123');

      expect(response.correlationId).toBe('cid_test_123');
    });

    it('should return service configuration status', () => {
      const response = configStatusService.getConfigStatus();

      expect(response.services.openai).toBeDefined();
      expect(response.services.openai.configured).toBeDefined();
      expect(response.services.google).toBeDefined();
    });

    it('should return features status', () => {
      const response = configStatusService.getConfigStatus();

      expect(response.features.aiContentGeneration).toBeDefined();
      expect(response.features.translations).toBeDefined();
      expect(response.features.cloudStorage).toBeDefined();
    });
  });

  describe('getFeatureFlags', () => {
    it('should return feature flags with summary', () => {
      const response = configStatusService.getFeatureFlags();

      expect(response.timestamp).toBeDefined();
      expect(Array.isArray(response.flags)).toBe(true);
      expect(response.summary).toBeDefined();
      expect(response.summary.total).toBeGreaterThan(0);
    });

    it('should include correlationId when provided', () => {
      const response = configStatusService.getFeatureFlags('cid_test_123');

      expect(response.correlationId).toBe('cid_test_123');
    });

    it('should include flag details', () => {
      const response = configStatusService.getFeatureFlags();

      const firstFlag = response.flags[0];
      expect(firstFlag.name).toBeDefined();
      expect(typeof firstFlag.enabled).toBe('boolean');
      expect(firstFlag.description).toBeDefined();
      expect(firstFlag.category).toBeDefined();
    });

    it('should calculate summary correctly', () => {
      const response = configStatusService.getFeatureFlags();

      const enabledCount = response.flags.filter((f) => f.enabled).length;
      expect(response.summary.enabled).toBe(enabledCount);
      expect(response.summary.disabled).toBe(response.summary.total - enabledCount);
    });
  });

  describe('getFoundationFlags', () => {
    it('should return foundation flags as record', () => {
      const flags = configStatusService.getFoundationFlags();

      expect(typeof flags).toBe('object');
      expect(Object.keys(flags).length).toBeGreaterThan(0);
    });

    it('should only include foundation category flags', () => {
      const flags = configStatusService.getFoundationFlags();

      // All keys should start with 'foundation'
      for (const key of Object.keys(flags)) {
        expect(key.startsWith('foundation')).toBe(true);
      }
    });
  });

  describe('getDomainsStatus', () => {
    it('should return domains status', () => {
      const response = configStatusService.getDomainsStatus();

      expect(response.timestamp).toBeDefined();
      expect(Array.isArray(response.domains)).toBe(true);
    });

    it('should include correlationId when provided', () => {
      const response = configStatusService.getDomainsStatus('cid_test_123');

      expect(response.correlationId).toBe('cid_test_123');
    });

    it('should include domain details', () => {
      const response = configStatusService.getDomainsStatus();

      expect(response.domains.length).toBeGreaterThan(0);
      const firstDomain = response.domains[0];
      expect(firstDomain.name).toBeDefined();
      expect(typeof firstDomain.enabled).toBe('boolean');
    });
  });

  describe('isFlagEnabled', () => {
    it('should return false for unknown flag', () => {
      expect(configStatusService.isFlagEnabled('unknown.flag')).toBe(false);
    });

    it('should return boolean for known flag', () => {
      const result = configStatusService.isFlagEnabled('foundation');
      expect(typeof result).toBe('boolean');
    });
  });
});
