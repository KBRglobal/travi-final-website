/**
 * Tests for Multi-Locale Content Governance Engine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment before imports
vi.stubEnv('ENABLE_LOCALIZATION_GOVERNANCE', 'true');

import {
  calculateTranslationStatus,
  calculateVersionBehind,
  getIssueSeverity,
} from '../../../server/localization-governance/engine';
import {
  isLocalizationGovernanceEnabled,
  LOCALIZATION_CONFIG,
  getSupportedLocales,
  getTargetLocales,
  getSourceLocale,
} from '../../../server/localization-governance/config';

describe('Localization Governance Engine', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_LOCALIZATION_GOVERNANCE', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is set to true', () => {
      vi.stubEnv('ENABLE_LOCALIZATION_GOVERNANCE', 'true');
      expect(isLocalizationGovernanceEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_LOCALIZATION_GOVERNANCE', '');
      expect(isLocalizationGovernanceEnabled()).toBe(false);
    });

    it('should be disabled when env is set to false', () => {
      vi.stubEnv('ENABLE_LOCALIZATION_GOVERNANCE', 'false');
      expect(isLocalizationGovernanceEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have default source locale', () => {
      expect(getSourceLocale()).toBe('en');
    });

    it('should have supported locales', () => {
      const locales = getSupportedLocales();
      expect(locales.length).toBeGreaterThan(0);
      expect(locales.find(l => l.code === 'en')).toBeDefined();
    });

    it('should have target locales (non-default)', () => {
      const targetLocales = getTargetLocales();
      expect(targetLocales).not.toContain('en');
      expect(targetLocales.length).toBeGreaterThan(0);
    });

    it('should have severity thresholds configured', () => {
      expect(LOCALIZATION_CONFIG.severityThresholds.critical).toBe(5);
      expect(LOCALIZATION_CONFIG.severityThresholds.warning).toBe(2);
    });

    it('should have cache TTL configured', () => {
      expect(LOCALIZATION_CONFIG.cacheTtl).toBe(600);
    });
  });

  describe('calculateTranslationStatus', () => {
    it('should return missing when translation version is 0', () => {
      expect(calculateTranslationStatus(5, 0)).toBe('missing');
    });

    it('should return up_to_date when translation version equals source', () => {
      expect(calculateTranslationStatus(5, 5)).toBe('up_to_date');
    });

    it('should return up_to_date when translation version is greater than source', () => {
      expect(calculateTranslationStatus(5, 6)).toBe('up_to_date');
    });

    it('should return outdated when translation version is less than source', () => {
      expect(calculateTranslationStatus(5, 4)).toBe('outdated');
      expect(calculateTranslationStatus(10, 1)).toBe('outdated');
    });
  });

  describe('calculateVersionBehind', () => {
    it('should return 0 when translation is up to date', () => {
      expect(calculateVersionBehind(5, 5)).toBe(0);
      expect(calculateVersionBehind(5, 6)).toBe(0);
    });

    it('should return positive number when translation is behind', () => {
      expect(calculateVersionBehind(5, 3)).toBe(2);
      expect(calculateVersionBehind(10, 1)).toBe(9);
    });

    it('should never return negative numbers', () => {
      expect(calculateVersionBehind(3, 5)).toBe(0);
    });
  });

  describe('getIssueSeverity', () => {
    it('should return info for small version gaps', () => {
      expect(getIssueSeverity(0)).toBe('info');
      expect(getIssueSeverity(1)).toBe('info');
    });

    it('should return warning for moderate version gaps', () => {
      expect(getIssueSeverity(2)).toBe('warning');
      expect(getIssueSeverity(3)).toBe('warning');
      expect(getIssueSeverity(4)).toBe('warning');
    });

    it('should return critical for large version gaps', () => {
      expect(getIssueSeverity(5)).toBe('critical');
      expect(getIssueSeverity(10)).toBe('critical');
      expect(getIssueSeverity(100)).toBe('critical');
    });
  });

  describe('Supported Locales', () => {
    it('should include common languages', () => {
      const locales = getSupportedLocales();
      const codes = locales.map(l => l.code);

      expect(codes).toContain('en');
      expect(codes).toContain('de');
      expect(codes).toContain('fr');
      expect(codes).toContain('es');
    });

    it('should have English as default locale', () => {
      const locales = getSupportedLocales();
      const english = locales.find(l => l.code === 'en');

      expect(english).toBeDefined();
      expect(english?.isDefault).toBe(true);
    });

    it('should only return enabled locales', () => {
      const locales = getSupportedLocales();
      expect(locales.every(l => l.enabled)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large version numbers', () => {
      const largeVersion = Number.MAX_SAFE_INTEGER;
      expect(calculateTranslationStatus(largeVersion, largeVersion)).toBe('up_to_date');
      expect(calculateVersionBehind(largeVersion, largeVersion - 1)).toBe(1);
    });

    it('should handle version 1 translations', () => {
      expect(calculateTranslationStatus(1, 1)).toBe('up_to_date');
      expect(calculateTranslationStatus(1, 0)).toBe('missing');
    });

    it('should handle boundary values for severity', () => {
      // At exact boundary
      expect(getIssueSeverity(2)).toBe('warning');
      expect(getIssueSeverity(5)).toBe('critical');

      // Just below boundary
      expect(getIssueSeverity(1)).toBe('info');
      expect(getIssueSeverity(4)).toBe('warning');
    });
  });
});
