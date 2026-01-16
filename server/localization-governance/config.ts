/**
 * Multi-Locale Content Governance - Configuration
 * Feature Flag: ENABLE_LOCALIZATION_GOVERNANCE=true
 */

import type { LocaleConfig } from './types';

// ============================================================================
// Feature Flag
// ============================================================================

export function isLocalizationGovernanceEnabled(): boolean {
  return process.env.ENABLE_LOCALIZATION_GOVERNANCE === 'true';
}

// ============================================================================
// Configuration
// ============================================================================

export const LOCALIZATION_CONFIG = {
  // Default source locale
  sourceLocale: process.env.SOURCE_LOCALE || 'en',

  // Version tolerance before marking as outdated
  versionTolerance: 0, // Any version behind is outdated

  // Cache TTL
  cacheTtl: 600, // 10 minutes

  // Severity thresholds
  severityThresholds: {
    critical: 5, // 5+ versions behind
    warning: 2,  // 2-4 versions behind
  },
} as const;

// ============================================================================
// Supported Locales
// ============================================================================

export const DEFAULT_LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', isDefault: true, enabled: true },
  { code: 'de', name: 'German', isDefault: false, enabled: true },
  { code: 'fr', name: 'French', isDefault: false, enabled: true },
  { code: 'es', name: 'Spanish', isDefault: false, enabled: true },
  { code: 'it', name: 'Italian', isDefault: false, enabled: true },
  { code: 'pt', name: 'Portuguese', isDefault: false, enabled: true },
  { code: 'nl', name: 'Dutch', isDefault: false, enabled: true },
  { code: 'ja', name: 'Japanese', isDefault: false, enabled: true },
  { code: 'zh', name: 'Chinese', isDefault: false, enabled: true },
  { code: 'ko', name: 'Korean', isDefault: false, enabled: true },
];

export function getSupportedLocales(): LocaleConfig[] {
  // Check for custom locales from env
  const customLocales = process.env.SUPPORTED_LOCALES;
  if (customLocales) {
    try {
      return JSON.parse(customLocales) as LocaleConfig[];
    } catch {
      // Fall back to defaults
    }
  }
  return DEFAULT_LOCALES.filter(l => l.enabled);
}

export function getTargetLocales(): string[] {
  return getSupportedLocales()
    .filter(l => !l.isDefault)
    .map(l => l.code);
}

export function getSourceLocale(): string {
  return LOCALIZATION_CONFIG.sourceLocale;
}
