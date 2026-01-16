/**
 * System DTOs Tests
 * Phase 1 Foundation: Tests for system info, config, and diagnostics DTOs
 */

import { describe, it, expect } from 'vitest';
import {
  VersionResponseSchema,
  UptimeResponseSchema,
  BuildInfoResponseSchema,
} from '../../../server/domains/system/dto/system-info.dto';
import {
  ConfigStatusResponseSchema,
  FeatureFlagsResponseSchema,
  DomainsStatusResponseSchema,
} from '../../../server/domains/system/dto/config-status.dto';
import { DiagnosticsResponseSchema } from '../../../server/domains/system/dto/diagnostics.dto';

describe('System Info DTOs', () => {
  describe('VersionResponseSchema', () => {
    it('should validate valid version response', () => {
      const response = {
        currentVersion: 'v1',
        supportedVersions: ['v1', 'v2'],
        deprecatedEndpoints: [],
        timestamp: new Date().toISOString(),
      };

      const result = VersionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate with deprecated endpoints', () => {
      const response = {
        currentVersion: 'v1',
        supportedVersions: ['v1'],
        deprecatedEndpoints: [
          {
            path: '/api/old',
            info: {
              deprecatedAt: '2024-01-01',
              replacement: '/api/new',
            },
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const result = VersionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate with correlationId', () => {
      const response = {
        currentVersion: 'v1',
        supportedVersions: ['v1'],
        deprecatedEndpoints: [],
        timestamp: new Date().toISOString(),
        correlationId: 'cid_123',
      };

      const result = VersionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('UptimeResponseSchema', () => {
    it('should validate valid uptime response', () => {
      const response = {
        uptimeSeconds: 12345,
        uptimeFormatted: '3h 25m 45s',
        startedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      const result = UptimeResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('BuildInfoResponseSchema', () => {
    it('should validate valid build info response', () => {
      const response = {
        version: '1.0.0',
        nodeVersion: 'v20.0.0',
        environment: 'production',
        timestamp: new Date().toISOString(),
      };

      const result = BuildInfoResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate with optional fields', () => {
      const response = {
        version: '1.0.0',
        nodeVersion: 'v20.0.0',
        environment: 'production',
        buildTime: '2024-01-01T00:00:00Z',
        gitCommit: 'abc123',
        gitBranch: 'main',
        timestamp: new Date().toISOString(),
      };

      const result = BuildInfoResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});

describe('Config Status DTOs', () => {
  describe('ConfigStatusResponseSchema', () => {
    it('should validate valid config status response', () => {
      const response = {
        timestamp: new Date().toISOString(),
        services: {
          openai: { configured: true, model: 'gpt-4' },
          replicate: { configured: false },
          freepik: { configured: false },
          gemini: { configured: false },
          openrouter: { configured: false },
          deepl: { configured: true },
          resend: { configured: false },
          cloudflare: { configured: true },
          google: {
            analyticsConfigured: true,
            searchConsoleConfigured: false,
          },
        },
        activeAIProvider: 'openai',
        features: {
          aiContentGeneration: true,
          aiImageGeneration: true,
          translations: true,
          emailCampaigns: false,
          cloudStorage: true,
        },
        safeMode: false,
      };

      const result = ConfigStatusResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('FeatureFlagsResponseSchema', () => {
    it('should validate valid feature flags response', () => {
      const response = {
        timestamp: new Date().toISOString(),
        flags: [
          {
            name: 'foundation',
            enabled: true,
            description: 'Foundation enabled',
            category: 'foundation',
          },
          {
            name: 'domain.system',
            enabled: false,
            description: 'System domain',
            category: 'domain',
          },
        ],
        summary: {
          total: 2,
          enabled: 1,
          disabled: 1,
        },
      };

      const result = FeatureFlagsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('DomainsStatusResponseSchema', () => {
    it('should validate valid domains status response', () => {
      const response = {
        timestamp: new Date().toISOString(),
        domains: [
          { name: 'content', enabled: false },
          { name: 'system', enabled: true },
        ],
      };

      const result = DomainsStatusResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate with features', () => {
      const response = {
        timestamp: new Date().toISOString(),
        domains: [
          {
            name: 'system',
            enabled: true,
            features: { health: true, diagnostics: false },
          },
        ],
      };

      const result = DomainsStatusResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});

describe('Diagnostics DTOs', () => {
  describe('DiagnosticsResponseSchema', () => {
    it('should validate valid diagnostics response', () => {
      const response = {
        timestamp: new Date().toISOString(),
        health: {
          status: 'healthy',
          checks: {
            database: { status: 'healthy', latencyMs: 5 },
            memory: {
              status: 'healthy',
              usagePercent: 45,
              heapUsedMB: 100,
              heapTotalMB: 200,
            },
          },
        },
        system: {
          version: '1.0.0',
          nodeVersion: 'v20.0.0',
          environment: 'production',
          uptimeSeconds: 12345,
          uptimeFormatted: '3h 25m 45s',
          startedAt: new Date().toISOString(),
        },
        domains: [
          { name: 'system', enabled: true },
          { name: 'content', enabled: false },
        ],
        featureFlags: {
          total: 10,
          enabled: 3,
          disabled: 7,
          foundation: {
            'foundation': false,
            'foundation.correlationId': false,
          },
        },
        services: {
          activeAIProvider: 'openai',
          configured: {
            ai: true,
            imageGeneration: true,
            translations: true,
            email: false,
            cloudStorage: true,
          },
        },
      };

      const result = DiagnosticsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate with correlationId', () => {
      const response = {
        timestamp: new Date().toISOString(),
        correlationId: 'cid_123',
        health: {
          status: 'healthy',
          checks: {},
        },
        system: {
          version: '1.0.0',
          nodeVersion: 'v20.0.0',
          environment: 'development',
          uptimeSeconds: 100,
          uptimeFormatted: '1m 40s',
          startedAt: new Date().toISOString(),
        },
        domains: [],
        featureFlags: {
          total: 0,
          enabled: 0,
          disabled: 0,
          foundation: {},
        },
        services: {
          activeAIProvider: 'none',
          configured: {
            ai: false,
            imageGeneration: false,
            translations: false,
            email: false,
            cloudStorage: false,
          },
        },
      };

      const result = DiagnosticsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject invalid health status', () => {
      const response = {
        timestamp: new Date().toISOString(),
        health: {
          status: 'broken', // Invalid
          checks: {},
        },
        system: {
          version: '1.0.0',
          nodeVersion: 'v20.0.0',
          environment: 'development',
          uptimeSeconds: 100,
          uptimeFormatted: '1m 40s',
          startedAt: new Date().toISOString(),
        },
        domains: [],
        featureFlags: {
          total: 0,
          enabled: 0,
          disabled: 0,
          foundation: {},
        },
        services: {
          activeAIProvider: 'none',
          configured: {
            ai: false,
            imageGeneration: false,
            translations: false,
            email: false,
            cloudStorage: false,
          },
        },
      };

      const result = DiagnosticsResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});
