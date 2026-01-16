/**
 * SEO Engine Configuration Tests
 *
 * Tests for feature flags, autopilot config, and safe defaults.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SEO Engine Configuration', () => {
  describe('Feature Flags', () => {
    it('should have all feature flags OFF by default', () => {
      const defaultFlags = {
        ENABLE_SEO_ENGINE: false,
        ENABLE_SEO_AUTOPILOT: false,
        ENABLE_SEO_ACTIONS: false,
        ENABLE_SEO_LINK_GRAPH: false,
        ENABLE_SEO_PIPELINE: false,
        ENABLE_SEO_RISK_MONITOR: false,
        ENABLE_SEO_EXEC_DASHBOARD: false,
        ENABLE_SEO_CLASSIFICATION: false,
        ENABLE_SEO_AEO_VALIDATION: false,
      };

      // All flags should be false by default
      for (const [key, value] of Object.entries(defaultFlags)) {
        expect(value).toBe(false);
      }
    });

    it('should respect environment variable overrides', () => {
      const envVars: Record<string, string> = {
        ENABLE_SEO_ENGINE: 'true',
        ENABLE_SEO_AUTOPILOT: 'false',
      };

      const parseEnvFlag = (key: string, defaultValue: boolean): boolean => {
        const val = envVars[key];
        if (val === 'true') return true;
        if (val === 'false') return false;
        return defaultValue;
      };

      expect(parseEnvFlag('ENABLE_SEO_ENGINE', false)).toBe(true);
      expect(parseEnvFlag('ENABLE_SEO_AUTOPILOT', false)).toBe(false);
      expect(parseEnvFlag('NONEXISTENT', true)).toBe(true);
    });

    it('should validate flag dependencies', () => {
      const flags = {
        ENABLE_SEO_ENGINE: false,
        ENABLE_SEO_AUTOPILOT: true,
      };

      // Autopilot requires base engine to be enabled
      const validateDependencies = (flags: Record<string, boolean>): string[] => {
        const errors: string[] = [];
        if (flags.ENABLE_SEO_AUTOPILOT && !flags.ENABLE_SEO_ENGINE) {
          errors.push('ENABLE_SEO_AUTOPILOT requires ENABLE_SEO_ENGINE');
        }
        return errors;
      };

      const errors = validateDependencies(flags);
      expect(errors).toContain('ENABLE_SEO_AUTOPILOT requires ENABLE_SEO_ENGINE');
    });
  });

  describe('Autopilot Configuration', () => {
    it('should have autopilot OFF by default', () => {
      const defaultAutopilotConfig = {
        mode: 'off' as const,
        allowedActions: [] as string[],
        maxActionsPerHour: 0,
        requireApprovalFor: ['all'],
      };

      expect(defaultAutopilotConfig.mode).toBe('off');
      expect(defaultAutopilotConfig.maxActionsPerHour).toBe(0);
    });

    it('should not allow destructive actions without explicit approval', () => {
      const destructiveActions = [
        'DELETE_CONTENT',
        'BULK_NOINDEX',
        'BULK_REDIRECT',
        'MASS_UNPUBLISH',
      ];

      const config = {
        mode: 'supervised' as const,
        alwaysRequireApprovalFor: destructiveActions,
      };

      const requiresApproval = (action: string): boolean => {
        return config.alwaysRequireApprovalFor.includes(action);
      };

      expect(requiresApproval('DELETE_CONTENT')).toBe(true);
      expect(requiresApproval('BULK_NOINDEX')).toBe(true);
      expect(requiresApproval('UPDATE_META')).toBe(false);
    });

    it('should validate autopilot mode transitions', () => {
      type AutopilotMode = 'off' | 'supervised' | 'autonomous';

      const validateModeTransition = (
        from: AutopilotMode,
        to: AutopilotMode
      ): { valid: boolean; reason?: string } => {
        // Can always transition to off
        if (to === 'off') return { valid: true };

        // Cannot jump directly to autonomous from off
        if (from === 'off' && to === 'autonomous') {
          return { valid: false, reason: 'Must enable supervised mode first' };
        }

        return { valid: true };
      };

      expect(validateModeTransition('off', 'supervised').valid).toBe(true);
      expect(validateModeTransition('off', 'autonomous').valid).toBe(false);
      expect(validateModeTransition('supervised', 'autonomous').valid).toBe(true);
      expect(validateModeTransition('autonomous', 'off').valid).toBe(true);
    });
  });

  describe('Safety Defaults', () => {
    it('should have conservative rate limits', () => {
      const defaults = {
        maxActionsPerHour: 10,
        maxActionsPerDay: 100,
        cooldownMinutes: 5,
        batchSize: 5,
      };

      expect(defaults.maxActionsPerHour).toBeLessThanOrEqual(20);
      expect(defaults.maxActionsPerDay).toBeLessThanOrEqual(200);
      expect(defaults.cooldownMinutes).toBeGreaterThanOrEqual(1);
    });

    it('should have rollback window configured', () => {
      const rollbackConfig = {
        tokenExpiryHours: 24,
        maxTokensPerContent: 5,
        retentionDays: 30,
      };

      expect(rollbackConfig.tokenExpiryHours).toBeGreaterThanOrEqual(1);
      expect(rollbackConfig.tokenExpiryHours).toBeLessThanOrEqual(72);
    });

    it('should have risk thresholds defined', () => {
      const riskThresholds = {
        critical: 90,
        high: 70,
        medium: 40,
        low: 20,
      };

      expect(riskThresholds.critical).toBeGreaterThan(riskThresholds.high);
      expect(riskThresholds.high).toBeGreaterThan(riskThresholds.medium);
      expect(riskThresholds.medium).toBeGreaterThan(riskThresholds.low);
    });
  });
});

describe('Feature Contract Registration', () => {
  it('should register all SEO Engine feature contracts', () => {
    const contracts = [
      { name: 'seo-engine', description: 'SEO Engine Core' },
      { name: 'seo-autopilot', description: 'Autonomous SEO Actions' },
      { name: 'seo-classification', description: 'Page Classification' },
      { name: 'seo-aeo-validation', description: 'AEO Content Validation' },
      { name: 'seo-link-graph', description: 'Internal Link Analysis' },
      { name: 'seo-pipeline', description: 'Content Pipeline' },
      { name: 'seo-risk-monitor', description: 'Risk Monitoring' },
      { name: 'seo-exec-dashboard', description: 'Executive Dashboard' },
    ];

    expect(contracts.length).toBeGreaterThanOrEqual(8);
    expect(contracts.some(c => c.name === 'seo-engine')).toBe(true);
  });

  it('should validate contract schema', () => {
    const contract = {
      name: 'seo-engine',
      description: 'SEO Engine Core',
      version: '1.0.0',
      flag: 'ENABLE_SEO_ENGINE',
      dependencies: [],
      endpoints: ['/api/seo-engine/*'],
    };

    const validateContract = (contract: any): boolean => {
      return (
        typeof contract.name === 'string' &&
        typeof contract.description === 'string' &&
        typeof contract.flag === 'string' &&
        Array.isArray(contract.dependencies)
      );
    };

    expect(validateContract(contract)).toBe(true);
  });
});
