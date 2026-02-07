/**
 * Phase 6: Fallback Hierarchy
 *
 * Defines the locale fallback hierarchy for content resolution.
 * Hierarchy: requested_locale -> en -> empty (NEVER null)
 *
 * HARD CONSTRAINTS:
 * - Fallback hierarchy is DETERMINISTIC
 * - English (en) is ALWAYS the final fallback before empty
 * - Never return null - always return empty content structure
 * - No circular dependencies in fallback chain
 */

import { db } from "../db";
import { contents, translations, type Translation } from "@shared/schema";

import { eq, and } from "drizzle-orm";
import { log } from "../lib/logger";
import { CANONICAL_LOCALE } from "./canonical-rules";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[FallbackHierarchy] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[FallbackHierarchy] ${msg}`, data),
};

export interface LocaleResolution {
  resolvedLocale: string;
  content: ResolvedContent;
  fallbackChain: string[];
  usedFallback: boolean;
  originalRequestedLocale: string;
}

export interface ResolvedContent {
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  blocks: unknown[];
  answerCapsule: string | null;
  isEmpty: boolean;
  sourceId: string;
  sourceType: "translation" | "canonical" | "empty";
}

const EMPTY_CONTENT: Omit<ResolvedContent, "sourceId" | "sourceType"> = {
  title: "",
  metaTitle: null,
  metaDescription: null,
  blocks: [],
  answerCapsule: null,
  isEmpty: true,
};

/**
 * Resolve content for a locale using the deterministic fallback hierarchy.
 *
 * Hierarchy: requested_locale -> en -> empty
 *
 * @param contentId - The ID of the content
 * @param requestedLocale - The requested locale
 * @returns LocaleResolution with resolved content and fallback information
 */
export async function resolveLocale(
  contentId: string,
  requestedLocale: string
): Promise<LocaleResolution> {
  const fallbackChain: string[] = [requestedLocale];

  if (requestedLocale !== CANONICAL_LOCALE) {
    fallbackChain.push(CANONICAL_LOCALE);
  }
  fallbackChain.push("empty");

  const [sourceContent] = await db.select().from(contents).where(eq(contents.id, contentId));

  if (!sourceContent) {
    logger.debug("Content not found, returning empty", { contentId, requestedLocale });
    return {
      resolvedLocale: "empty",
      content: {
        ...EMPTY_CONTENT,
        sourceId: contentId,
        sourceType: "empty",
      },
      fallbackChain,
      usedFallback: true,
      originalRequestedLocale: requestedLocale,
    };
  }

  if (requestedLocale === CANONICAL_LOCALE) {
    return {
      resolvedLocale: CANONICAL_LOCALE,
      content: {
        title: sourceContent.title,
        metaTitle: sourceContent.metaTitle,
        metaDescription: sourceContent.metaDescription,
        blocks: sourceContent.blocks || [],
        answerCapsule: sourceContent.answerCapsule,
        isEmpty: false,
        sourceId: contentId,
        sourceType: "canonical",
      },
      fallbackChain: [CANONICAL_LOCALE],
      usedFallback: false,
      originalRequestedLocale: requestedLocale,
    };
  }

  const [translation] = await db
    .select()
    .from(translations)
    .where(
      and(eq(translations.contentId, contentId), eq(translations.locale, requestedLocale as any))
    );

  if (translation && isTranslationComplete(translation)) {
    logger.debug("Translation found", { contentId, locale: requestedLocale });
    return {
      resolvedLocale: requestedLocale,
      content: {
        title: translation.title || sourceContent.title,
        metaTitle: translation.metaTitle || sourceContent.metaTitle,
        metaDescription: translation.metaDescription || sourceContent.metaDescription,
        blocks: translation.blocks || sourceContent.blocks || [],
        answerCapsule: translation.answerCapsule || sourceContent.answerCapsule,
        isEmpty: false,
        sourceId: translation.id,
        sourceType: "translation",
      },
      fallbackChain: [requestedLocale],
      usedFallback: false,
      originalRequestedLocale: requestedLocale,
    };
  }

  logger.debug("Falling back to English", { contentId, requestedLocale });
  return {
    resolvedLocale: CANONICAL_LOCALE,
    content: {
      title: sourceContent.title,
      metaTitle: sourceContent.metaTitle,
      metaDescription: sourceContent.metaDescription,
      blocks: sourceContent.blocks || [],
      answerCapsule: sourceContent.answerCapsule,
      isEmpty: false,
      sourceId: contentId,
      sourceType: "canonical",
    },
    fallbackChain: [requestedLocale, CANONICAL_LOCALE],
    usedFallback: true,
    originalRequestedLocale: requestedLocale,
  };
}

/**
 * Check if a translation has enough content to be considered complete.
 */
function isTranslationComplete(translation: Translation): boolean {
  return Boolean(translation.title && translation.title.trim().length > 0);
}

/**
 * Resolve multiple locales in batch for efficiency.
 */
export async function resolveLocalesBatch(
  contentId: string,
  requestedLocales: string[]
): Promise<Map<string, LocaleResolution>> {
  const results = new Map<string, LocaleResolution>();

  const [sourceContent] = await db.select().from(contents).where(eq(contents.id, contentId));

  if (!sourceContent) {
    for (const locale of requestedLocales) {
      results.set(locale, {
        resolvedLocale: "empty",
        content: {
          ...EMPTY_CONTENT,
          sourceId: contentId,
          sourceType: "empty",
        },
        fallbackChain: [locale, CANONICAL_LOCALE, "empty"],
        usedFallback: true,
        originalRequestedLocale: locale,
      });
    }
    return results;
  }

  const nonCanonicalLocales = requestedLocales.filter(l => l !== CANONICAL_LOCALE);

  const existingTranslations =
    nonCanonicalLocales.length > 0
      ? await db.select().from(translations).where(eq(translations.contentId, contentId))
      : [];

  const translationMap = new Map(existingTranslations.map(t => [t.locale, t]));

  for (const locale of requestedLocales) {
    if (locale === CANONICAL_LOCALE) {
      results.set(locale, {
        resolvedLocale: CANONICAL_LOCALE,
        content: {
          title: sourceContent.title,
          metaTitle: sourceContent.metaTitle,
          metaDescription: sourceContent.metaDescription,
          blocks: sourceContent.blocks || [],
          answerCapsule: sourceContent.answerCapsule,
          isEmpty: false,
          sourceId: contentId,
          sourceType: "canonical",
        },
        fallbackChain: [CANONICAL_LOCALE],
        usedFallback: false,
        originalRequestedLocale: locale,
      });
      continue;
    }

    const translation = translationMap.get(locale as any);

    if (translation && isTranslationComplete(translation)) {
      results.set(locale, {
        resolvedLocale: locale,
        content: {
          title: translation.title || sourceContent.title,
          metaTitle: translation.metaTitle || sourceContent.metaTitle,
          metaDescription: translation.metaDescription || sourceContent.metaDescription,
          blocks: translation.blocks || sourceContent.blocks || [],
          answerCapsule: translation.answerCapsule || sourceContent.answerCapsule,
          isEmpty: false,
          sourceId: translation.id,
          sourceType: "translation",
        },
        fallbackChain: [locale],
        usedFallback: false,
        originalRequestedLocale: locale,
      });
    } else {
      results.set(locale, {
        resolvedLocale: CANONICAL_LOCALE,
        content: {
          title: sourceContent.title,
          metaTitle: sourceContent.metaTitle,
          metaDescription: sourceContent.metaDescription,
          blocks: sourceContent.blocks || [],
          answerCapsule: sourceContent.answerCapsule,
          isEmpty: false,
          sourceId: contentId,
          sourceType: "canonical",
        },
        fallbackChain: [locale, CANONICAL_LOCALE],
        usedFallback: true,
        originalRequestedLocale: locale,
      });
    }
  }

  return results;
}

/**
 * Get the fallback chain for a locale.
 * This is a pure function that doesn't require database access.
 */
export function getFallbackChain(locale: string): string[] {
  if (locale === CANONICAL_LOCALE) {
    return [CANONICAL_LOCALE, "empty"];
  }
  return [locale, CANONICAL_LOCALE, "empty"];
}

/**
 * Get locale fallback hierarchy for regional locales.
 *
 * DETERMINISTIC FALLBACK ORDER:
 * - Regional variant → Base language → English (canonical)
 * - Examples:
 *   - he-IL → he → en
 *   - ar-AE → ar → en
 *   - zh-TW → zh → en
 *   - pt-BR → pt → en
 *   - en-US → en
 *   - en → en (no fallback needed)
 *
 * HARD CONSTRAINTS:
 * - English (en) is ALWAYS the final fallback
 * - Fallback order is DETERMINISTIC
 * - No circular dependencies
 *
 * @param locale - The locale code (e.g., 'he-IL', 'ar-AE', 'en')
 * @returns Array of fallback locales in priority order
 */
export function getLocaleFallback(locale: string): string[] {
  if (!locale || typeof locale !== "string") {
    return [CANONICAL_LOCALE];
  }

  const normalizedLocale = locale.toLowerCase().trim();

  if (normalizedLocale === CANONICAL_LOCALE || normalizedLocale.startsWith("en-")) {
    return [CANONICAL_LOCALE];
  }

  if (normalizedLocale.includes("-")) {
    const [baseLanguage] = normalizedLocale.split("-");

    if (baseLanguage === CANONICAL_LOCALE) {
      return [CANONICAL_LOCALE];
    }

    return [normalizedLocale, baseLanguage, CANONICAL_LOCALE];
  }

  return [normalizedLocale, CANONICAL_LOCALE];
}

/**
 * Validate that a locale is supported.
 */
export function isValidLocale(locale: string): boolean {
  const validLocales = [
    "en",
    "ar",
    "hi",
    "zh",
    "ru",
    "ur",
    "fr",
    "de",
    "fa",
    "bn",
    "fil",
    "es",
    "tr",
    "pt",
    "it",
    "ja",
    "ko",
    "he",
  ];
  return validLocales.includes(locale);
}

/**
 * Get locale availability status for a content item.
 */
export async function getLocaleAvailability(contentId: string): Promise<{
  canonical: boolean;
  translations: Map<string, boolean>;
  availableLocales: string[];
  fallbackCount: number;
}> {
  const [sourceContent] = await db.select().from(contents).where(eq(contents.id, contentId));

  if (!sourceContent) {
    return {
      canonical: false,
      translations: new Map(),
      availableLocales: [],
      fallbackCount: 0,
    };
  }

  const allTranslations = await db
    .select()
    .from(translations)
    .where(eq(translations.contentId, contentId));

  const translationsMap = new Map<string, boolean>();
  const availableLocales: string[] = [CANONICAL_LOCALE];

  for (const translation of allTranslations) {
    const isComplete = isTranslationComplete(translation);
    translationsMap.set(translation.locale, isComplete);
    if (isComplete) {
      availableLocales.push(translation.locale);
    }
  }

  const supportedLocales = [
    "en",
    "ar",
    "hi",
    "zh",
    "ru",
    "ur",
    "fr",
    "de",
    "fa",
    "bn",
    "fil",
    "es",
    "tr",
    "pt",
    "it",
    "ja",
    "ko",
    "he",
  ];

  const fallbackCount = supportedLocales.filter(
    l => l !== CANONICAL_LOCALE && !availableLocales.includes(l)
  ).length;

  return {
    canonical: true,
    translations: translationsMap,
    availableLocales,
    fallbackCount,
  };
}
