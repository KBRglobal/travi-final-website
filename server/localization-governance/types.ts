/**
 * Multi-Locale Content Governance - Type Definitions
 * Feature Flag: ENABLE_LOCALIZATION_GOVERNANCE=true
 */

// ============================================================================
// Locale Types
// ============================================================================

export type LocaleCode = string; // e.g., 'en', 'de', 'fr', 'es'

export interface LocaleConfig {
  code: LocaleCode;
  name: string;
  isDefault: boolean;
  enabled: boolean;
}

// ============================================================================
// Translation Status
// ============================================================================

export type TranslationStatus =
  | 'up_to_date'
  | 'outdated'
  | 'missing'
  | 'pending_review';

export interface TranslationVersion {
  locale: LocaleCode;
  version: number;
  lastUpdatedAt: Date;
  sourceVersion: number;
  status: TranslationStatus;
  translatedBy?: string;
  wordCount: number;
}

export interface ContentTranslationStatus {
  contentId: string;
  contentTitle: string;
  contentType: string;
  sourceLocale: LocaleCode;
  sourceVersion: number;
  sourceLastUpdated: Date;
  translations: TranslationVersion[];
  missingLocales: LocaleCode[];
  outdatedLocales: LocaleCode[];
  completionPercentage: number;
}

// ============================================================================
// Governance Issues
// ============================================================================

export type GovernanceIssueType =
  | 'outdated_translation'
  | 'missing_translation'
  | 'pending_review'
  | 'version_mismatch'
  | 'untranslated_fields';

export interface GovernanceIssue {
  type: GovernanceIssueType;
  severity: 'critical' | 'warning' | 'info';
  contentId: string;
  contentTitle: string;
  locale: LocaleCode;
  description: string;
  sourceVersion: number;
  translationVersion?: number;
  recommendation: string;
}

// ============================================================================
// Summary
// ============================================================================

export interface LocalizationSummary {
  totalContent: number;
  fullyTranslated: number;
  partiallyTranslated: number;
  notTranslated: number;
  avgCompletionPercentage: number;
  byLocale: Array<{
    locale: LocaleCode;
    totalTranslations: number;
    upToDate: number;
    outdated: number;
    missing: number;
    completionPercentage: number;
  }>;
  topIssues: GovernanceIssue[];
  analyzedAt: Date;
}

// ============================================================================
// Content Details
// ============================================================================

export interface ContentLocalizationDetails {
  contentId: string;
  contentTitle: string;
  contentType: string;
  sourceLocale: LocaleCode;
  sourceVersion: number;
  sourceWordCount: number;
  sourceLastUpdated: Date;
  translations: Array<{
    locale: LocaleCode;
    status: TranslationStatus;
    version: number;
    lastUpdated: Date;
    wordCount: number;
    versionBehind: number;
    translatedBy?: string;
  }>;
  issues: GovernanceIssue[];
  analyzedAt: Date;
}
