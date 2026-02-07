/**
 * Phase 6: Freshness Checker
 *
 * Detects stale translations by comparing translation.lastUpdated vs source.lastUpdated.
 * Flags translations that need to be regenerated when the source has been updated.
 *
 * HARD CONSTRAINTS:
 * - English (en) is ALWAYS the source of truth
 * - Translations are stale if source updated after translation
 * - Source hash changes also indicate staleness
 */

import { db } from "../db";
import { contents, translations, type Content, type Translation } from "@shared/schema";

import { eq, and } from "drizzle-orm";
import { log } from "../lib/logger";
import { CANONICAL_LOCALE, computeCanonicalHash } from "./canonical-rules";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[FreshnessChecker] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[FreshnessChecker] WARN: ${msg}`, data),
};

export interface FreshnessResult {
  fresh: boolean;
  isStale: boolean;
  staleDays: number;
  needsRetranslation: boolean;
  sourceUpdatedAt: Date;
  translationUpdatedAt: Date | null;
  sourceLastUpdated: Date;
  translationLastUpdated: Date | null;
  sourceHashMatch: boolean;
  reason?: string;
}

export interface BatchFreshnessResult {
  contentId: string;
  locale: string;
  result: FreshnessResult;
}

/**
 * Check the freshness of a translation compared to its English source.
 *
 * @param contentId - The ID of the content
 * @param locale - The locale of the translation to check
 * @returns FreshnessResult with staleness information
 */
export async function checkTranslationFreshness(
  contentId: string,
  locale: string
): Promise<FreshnessResult> {
  if (locale === CANONICAL_LOCALE) {
    const now = new Date();
    return {
      fresh: true,
      isStale: false,
      staleDays: 0,
      needsRetranslation: false,
      sourceUpdatedAt: now,
      translationUpdatedAt: now,
      sourceLastUpdated: now,
      translationLastUpdated: now,
      sourceHashMatch: true,
      reason: "English is the canonical source, always fresh",
    };
  }

  const [sourceContent] = await db.select().from(contents).where(eq(contents.id, contentId));

  if (!sourceContent) {
    const now = new Date();
    return {
      fresh: false,
      isStale: true,
      staleDays: 0,
      needsRetranslation: false,
      sourceUpdatedAt: now,
      translationUpdatedAt: null,
      sourceLastUpdated: now,
      translationLastUpdated: null,
      sourceHashMatch: false,
      reason: "Source content not found",
    };
  }

  const [translation] = await db
    .select()
    .from(translations)
    .where(and(eq(translations.contentId, contentId), eq(translations.locale, locale as any)));

  const sourceLastUpdated = sourceContent.updatedAt || sourceContent.createdAt || new Date();
  const currentSourceHash = computeCanonicalHash(sourceContent);

  if (!translation) {
    return {
      fresh: false,
      isStale: true,
      staleDays: calculateStaleDays(sourceLastUpdated, null),
      needsRetranslation: true,
      sourceUpdatedAt: sourceLastUpdated,
      translationUpdatedAt: null,
      sourceLastUpdated,
      translationLastUpdated: null,
      sourceHashMatch: false,
      reason: "Translation does not exist",
    };
  }

  const translationLastUpdated = translation.updatedAt || translation.createdAt || new Date();
  const sourceHashMatch = translation.sourceHash === currentSourceHash;

  const isTimestampStale = sourceLastUpdated > translationLastUpdated;
  const isHashStale = !sourceHashMatch;
  const isStale = isTimestampStale || isHashStale;

  let reason: string | undefined;
  if (isTimestampStale && isHashStale) {
    reason = "Source updated after translation and content hash changed";
  } else if (isTimestampStale) {
    reason = "Source updated after translation";
  } else if (isHashStale) {
    reason = "Source content hash changed";
  }

  const staleDays = isStale ? calculateStaleDays(sourceLastUpdated, translationLastUpdated) : 0;
  const needsRetranslation = isStale && staleDays > 0;

  return {
    fresh: !isStale,
    isStale,
    staleDays,
    needsRetranslation,
    sourceUpdatedAt: sourceLastUpdated,
    translationUpdatedAt: translationLastUpdated,
    sourceLastUpdated,
    translationLastUpdated,
    sourceHashMatch,
    reason,
  };
}

/**
 * Calculate the number of days a translation has been stale.
 */
function calculateStaleDays(sourceDate: Date, translationDate: Date | null): number {
  if (!translationDate) {
    const now = new Date();
    const diffMs = now.getTime() - sourceDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  if (sourceDate <= translationDate) {
    return 0;
  }

  const diffMs = sourceDate.getTime() - translationDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check freshness for all translations of a content item.
 *
 * @param contentId - The ID of the content
 * @returns Array of freshness results for all locales
 */
export async function checkAllTranslationsFreshness(
  contentId: string
): Promise<BatchFreshnessResult[]> {
  const allTranslations = await db
    .select()
    .from(translations)
    .where(eq(translations.contentId, contentId));

  const results: BatchFreshnessResult[] = [];

  for (const translation of allTranslations) {
    const result = await checkTranslationFreshness(contentId, translation.locale);
    results.push({
      contentId,
      locale: translation.locale,
      result,
    });
  }

  return results;
}

/**
 * Find all stale translations across the system.
 *
 * @param limit - Maximum number of stale translations to return
 * @returns Array of stale translations with their freshness results
 */
export async function findStaleTranslations(limit: number = 100): Promise<BatchFreshnessResult[]> {
  const allTranslations = await db
    .select({
      translation: translations,
      content: contents,
    })
    .from(translations)
    .innerJoin(contents, eq(translations.contentId, contents.id))
    .limit(limit * 2);

  const staleResults: BatchFreshnessResult[] = [];

  for (const { translation, content } of allTranslations) {
    const sourceLastUpdated = content.updatedAt || content.createdAt || new Date();
    const translationLastUpdated = translation.updatedAt || translation.createdAt || new Date();
    const currentSourceHash = computeCanonicalHash(content);
    const sourceHashMatch = translation.sourceHash === currentSourceHash;

    const isTimestampStale = sourceLastUpdated > translationLastUpdated;
    const isHashStale = !sourceHashMatch;
    const isStale = isTimestampStale || isHashStale;

    if (isStale) {
      staleResults.push({
        contentId: content.id,
        locale: translation.locale,
        result: {
          fresh: false,
          isStale: true,
          staleDays: calculateStaleDays(sourceLastUpdated, translationLastUpdated),
          needsRetranslation: true,
          sourceUpdatedAt: sourceLastUpdated,
          translationUpdatedAt: translationLastUpdated,
          sourceLastUpdated,
          translationLastUpdated,
          sourceHashMatch,
          reason:
            isTimestampStale && isHashStale
              ? "Source updated and hash changed"
              : isTimestampStale
                ? "Source updated after translation"
                : "Source hash changed",
        } as any,
      });

      if (staleResults.length >= limit) {
        break;
      }
    }
  }

  logger.info("Stale translations scan completed", {
    scanned: allTranslations.length,
    staleFound: staleResults.length,
  });

  return staleResults;
}

/**
 * Get freshness summary statistics for all translations.
 */
export async function getFreshnessSummary(): Promise<{
  totalTranslations: number;
  freshCount: number;
  staleCount: number;
  averageStaleDays: number;
  oldestStaleDate: Date | null;
}> {
  const allTranslations = await db
    .select({
      translation: translations,
      content: contents,
    })
    .from(translations)
    .innerJoin(contents, eq(translations.contentId, contents.id));

  let freshCount = 0;
  let staleCount = 0;
  let totalStaleDays = 0;
  let oldestStaleDate: Date | null = null;

  for (const { translation, content } of allTranslations) {
    const sourceLastUpdated = content.updatedAt || content.createdAt || new Date();
    const translationLastUpdated = translation.updatedAt || translation.createdAt || new Date();
    const currentSourceHash = computeCanonicalHash(content);
    const isStale =
      sourceLastUpdated > translationLastUpdated || translation.sourceHash !== currentSourceHash;

    if (isStale) {
      staleCount++;
      const staleDays = calculateStaleDays(sourceLastUpdated, translationLastUpdated);
      totalStaleDays += staleDays;

      if (!oldestStaleDate || translationLastUpdated < oldestStaleDate) {
        oldestStaleDate = translationLastUpdated;
      }
    } else {
      freshCount++;
    }
  }

  return {
    totalTranslations: allTranslations.length,
    freshCount,
    staleCount,
    averageStaleDays: staleCount > 0 ? Math.round(totalStaleDays / staleCount) : 0,
    oldestStaleDate,
  };
}
