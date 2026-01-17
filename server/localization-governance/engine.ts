/**
 * Multi-Locale Content Governance - Core Engine
 * Feature Flag: ENABLE_LOCALIZATION_GOVERNANCE=true
 */

import { createLogger } from '../lib/logger';
import { db } from '../db';
import { contents, translations } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  isLocalizationGovernanceEnabled,
  LOCALIZATION_CONFIG,
  getSupportedLocales,
  getTargetLocales,
  getSourceLocale,
} from './config';
import type {
  ContentTranslationStatus,
  TranslationVersion,
  TranslationStatus,
  GovernanceIssue,
  GovernanceIssueType,
  LocalizationSummary,
  ContentLocalizationDetails,
  LocaleCode,
} from './types';

const logger = createLogger('localization-governance');

// ============================================================================
// Cache
// ============================================================================

class LocalizationCache {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize = 500;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  clear(): void {
    this.cache.clear();
  }
}

const localizationCache = new LocalizationCache();

// ============================================================================
// Version and Status Calculation
// ============================================================================

export function calculateTranslationStatus(
  sourceVersion: number,
  translationVersion: number
): TranslationStatus {
  if (translationVersion === 0) return 'missing';
  if (translationVersion >= sourceVersion) return 'up_to_date';
  return 'outdated';
}

export function calculateVersionBehind(
  sourceVersion: number,
  translationVersion: number
): number {
  return Math.max(0, sourceVersion - translationVersion);
}

export function getIssueSeverity(
  versionsBehind: number
): 'critical' | 'warning' | 'info' {
  const { severityThresholds } = LOCALIZATION_CONFIG;
  if (versionsBehind >= severityThresholds.critical) return 'critical';
  if (versionsBehind >= severityThresholds.warning) return 'warning';
  return 'info';
}

// ============================================================================
// Analyze Content
// ============================================================================

export async function analyzeContentLocalization(
  contentId: string
): Promise<ContentLocalizationDetails | null> {
  if (!isLocalizationGovernanceEnabled()) {
    return null;
  }

  const cacheKey = `loc:${contentId}`;
  const cached = localizationCache.get<ContentLocalizationDetails>(cacheKey);
  if (cached) return cached;

  try {
    // Get source content
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (!content) return null;

    const sourceLocale = getSourceLocale();
    const targetLocales = getTargetLocales();

    // Get content version (using updatedAt as version proxy)
    const sourceVersion = content.updatedAt
      ? Math.floor(content.updatedAt.getTime() / 1000)
      : Math.floor(content.createdAt.getTime() / 1000);

    // Calculate word count
    const blocks = content.blocks as Array<{ data?: { text?: string } }> || [];
    const sourceWordCount = blocks.reduce((count, block) => {
      return count + (block.data?.text?.split(/\s+/).length || 0);
    }, 0);

    // Get translations
    const contentTranslations = await db
      .select()
      .from(translations)
      .where(eq(translations.contentId, contentId));

    const translationMap = new Map<string, typeof contentTranslations[0]>();
    for (const t of contentTranslations) {
      translationMap.set(t.locale, t);
    }

    const translationDetails: ContentLocalizationDetails['translations'] = [];
    const issues: GovernanceIssue[] = [];

    for (const locale of targetLocales) {
      const translation = translationMap.get(locale);

      if (!translation) {
        // Missing translation
        translationDetails.push({
          locale,
          status: 'missing',
          version: 0,
          lastUpdated: new Date(0),
          wordCount: 0,
          versionBehind: sourceVersion,
        });

        issues.push({
          type: 'missing_translation',
          severity: 'critical',
          contentId,
          contentTitle: content.title,
          locale,
          description: `Translation missing for locale: ${locale}`,
          sourceVersion,
          recommendation: `Create translation for ${locale}`,
        });
      } else {
        const translationVersion = translation.updatedAt
          ? Math.floor(translation.updatedAt.getTime() / 1000)
          : Math.floor(translation.createdAt!.getTime() / 1000);

        const status = calculateTranslationStatus(sourceVersion, translationVersion);
        const versionBehind = calculateVersionBehind(sourceVersion, translationVersion);

        // Calculate translation word count
        const translatedBlocks = (translation as any).translatedBlocks as Array<{ data?: { text?: string } }> || [];
        const translationWordCount = translatedBlocks.reduce((count, block) => {
          return count + (block.data?.text?.split(/\s+/).length || 0);
        }, 0);

        translationDetails.push({
          locale,
          status,
          version: translationVersion,
          lastUpdated: translation.updatedAt || translation.createdAt!,
          wordCount: translationWordCount,
          versionBehind,
        });

        if (status === 'outdated') {
          issues.push({
            type: 'outdated_translation',
            severity: getIssueSeverity(versionBehind),
            contentId,
            contentTitle: content.title,
            locale,
            description: `Translation is ${versionBehind} version(s) behind source`,
            sourceVersion,
            translationVersion,
            recommendation: `Update ${locale} translation to match source version`,
          });
        }
      }
    }

    const result: ContentLocalizationDetails = {
      contentId,
      contentTitle: content.title,
      contentType: content.type,
      sourceLocale,
      sourceVersion,
      sourceWordCount,
      sourceLastUpdated: content.updatedAt || content.createdAt,
      translations: translationDetails,
      issues,
      analyzedAt: new Date(),
    };

    localizationCache.set(cacheKey, result, LOCALIZATION_CONFIG.cacheTtl);

    return result;
  } catch (error) {
    logger.error({ error, contentId }, 'Failed to analyze content localization');
    return null;
  }
}

// ============================================================================
// Get Content Translation Status
// ============================================================================

export async function getContentTranslationStatus(
  contentId: string
): Promise<ContentTranslationStatus | null> {
  const details = await analyzeContentLocalization(contentId);
  if (!details) return null;

  const targetLocales = getTargetLocales();
  const translatedLocales = details.translations.filter(t => t.status !== 'missing');
  const missingLocales = details.translations.filter(t => t.status === 'missing').map(t => t.locale);
  const outdatedLocales = details.translations.filter(t => t.status === 'outdated').map(t => t.locale);

  const translationVersions: TranslationVersion[] = details.translations.map(t => ({
    locale: t.locale,
    version: t.version,
    lastUpdatedAt: t.lastUpdated,
    sourceVersion: details.sourceVersion,
    status: t.status,
    wordCount: t.wordCount,
  }));

  return {
    contentId,
    contentTitle: details.contentTitle,
    contentType: details.contentType,
    sourceLocale: details.sourceLocale,
    sourceVersion: details.sourceVersion,
    sourceLastUpdated: details.sourceLastUpdated,
    translations: translationVersions,
    missingLocales,
    outdatedLocales,
    completionPercentage: targetLocales.length > 0
      ? Math.round((translatedLocales.length / targetLocales.length) * 100)
      : 100,
  };
}

// ============================================================================
// Get Localization Summary
// ============================================================================

export async function getLocalizationSummary(): Promise<LocalizationSummary | null> {
  if (!isLocalizationGovernanceEnabled()) {
    return null;
  }

  const cacheKey = 'loc:summary';
  const cached = localizationCache.get<LocalizationSummary>(cacheKey);
  if (cached) return cached;

  try {
    const contentList = await db
      .select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, 'published'))
      .limit(500);

    const targetLocales = getTargetLocales();
    let totalCompletion = 0;
    let fullyTranslated = 0;
    let partiallyTranslated = 0;
    let notTranslated = 0;
    const allIssues: GovernanceIssue[] = [];

    const localeCounts = new Map<string, {
      total: number;
      upToDate: number;
      outdated: number;
      missing: number;
    }>();

    for (const locale of targetLocales) {
      localeCounts.set(locale, { total: 0, upToDate: 0, outdated: 0, missing: 0 });
    }

    for (const content of contentList) {
      const details = await analyzeContentLocalization(content.id);
      if (!details) continue;

      // Collect issues (limited)
      if (allIssues.length < 50) {
        allIssues.push(...details.issues);
      }

      // Calculate completion
      const upToDateCount = details.translations.filter(t => t.status === 'up_to_date').length;
      const missingCount = details.translations.filter(t => t.status === 'missing').length;

      if (upToDateCount === targetLocales.length) {
        fullyTranslated++;
      } else if (missingCount === targetLocales.length) {
        notTranslated++;
      } else {
        partiallyTranslated++;
      }

      const completion = targetLocales.length > 0
        ? ((targetLocales.length - missingCount) / targetLocales.length) * 100
        : 100;
      totalCompletion += completion;

      // Update locale counts
      for (const t of details.translations) {
        const counts = localeCounts.get(t.locale);
        if (counts) {
          counts.total++;
          if (t.status === 'up_to_date') counts.upToDate++;
          else if (t.status === 'outdated') counts.outdated++;
          else if (t.status === 'missing') counts.missing++;
        }
      }
    }

    const totalContent = contentList.length;

    // Sort issues by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const result: LocalizationSummary = {
      totalContent,
      fullyTranslated,
      partiallyTranslated,
      notTranslated,
      avgCompletionPercentage: totalContent > 0
        ? Math.round(totalCompletion / totalContent)
        : 0,
      byLocale: Array.from(localeCounts.entries()).map(([locale, counts]) => ({
        locale,
        totalTranslations: counts.total - counts.missing,
        upToDate: counts.upToDate,
        outdated: counts.outdated,
        missing: counts.missing,
        completionPercentage: counts.total > 0
          ? Math.round(((counts.total - counts.missing) / counts.total) * 100)
          : 0,
      })),
      topIssues: allIssues.slice(0, 20),
      analyzedAt: new Date(),
    };

    localizationCache.set(cacheKey, result, LOCALIZATION_CONFIG.cacheTtl);

    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to get localization summary');
    return null;
  }
}

// ============================================================================
// Engine Status
// ============================================================================

export function getLocalizationGovernanceStatus() {
  return {
    enabled: isLocalizationGovernanceEnabled(),
    sourceLocale: getSourceLocale(),
    targetLocales: getTargetLocales(),
    supportedLocales: getSupportedLocales(),
    config: LOCALIZATION_CONFIG,
  };
}

export function clearLocalizationCache(): void {
  localizationCache.clear();
}
