/**
 * Cultural Contexts Index
 * =======================
 * Exports all 30 locale cultural contexts for native content generation
 */

import type { CulturalContext } from "./types";

// Tier 1 - Core
import { englishContext } from "./tier-1/en";
import { arabicContext } from "./tier-1/ar";
import { hindiContext } from "./tier-1/hi";

// Tier 2 - High ROI
import { chineseContext } from "./tier-2/zh";
import { russianContext } from "./tier-2/ru";
import { urduContext } from "./tier-2/ur";
import { frenchContext } from "./tier-2/fr";
import { indonesianContext } from "./tier-2/id";

// Tier 3 - Growing (Southeast Asia focus)
import { germanContext } from "./tier-3/de";
import { persianContext } from "./tier-3/fa";
import { bengaliContext } from "./tier-3/bn";
import { filipinoContext } from "./tier-3/fil";
import { thaiContext } from "./tier-3/th";
import { vietnameseContext } from "./tier-3/vi";
import { malayContext } from "./tier-3/ms";

// Tier 4 - Niche
import { spanishContext } from "./tier-4/es";
import { turkishContext } from "./tier-4/tr";
import { italianContext } from "./tier-4/it";
import { japaneseContext } from "./tier-4/ja";
import { koreanContext } from "./tier-4/ko";
import { hebrewContext } from "./tier-4/he";
import { portugueseContext } from "./tier-4/pt";

// Tier 5 - European Expansion
import { dutchContext } from "./tier-5/nl";
import { polishContext } from "./tier-5/pl";
import { swedishContext } from "./tier-5/sv";
import { greekContext } from "./tier-5/el";
import { czechContext } from "./tier-5/cs";
import { romanianContext } from "./tier-5/ro";
import { ukrainianContext } from "./tier-5/uk";
import { hungarianContext } from "./tier-5/hu";

// Re-export types
export * from "./types";

/**
 * All cultural contexts indexed by locale code
 */
export const CULTURAL_CONTEXTS: Record<string, CulturalContext> = {
  // Tier 1
  en: englishContext,
  ar: arabicContext,
  hi: hindiContext,
  // Tier 2
  zh: chineseContext,
  ru: russianContext,
  ur: urduContext,
  fr: frenchContext,
  id: indonesianContext,
  // Tier 3
  de: germanContext,
  fa: persianContext,
  bn: bengaliContext,
  fil: filipinoContext,
  th: thaiContext,
  vi: vietnameseContext,
  ms: malayContext,
  // Tier 4
  es: spanishContext,
  tr: turkishContext,
  it: italianContext,
  ja: japaneseContext,
  ko: koreanContext,
  he: hebrewContext,
  pt: portugueseContext,
  // Tier 5
  nl: dutchContext,
  pl: polishContext,
  sv: swedishContext,
  el: greekContext,
  cs: czechContext,
  ro: romanianContext,
  uk: ukrainianContext,
  hu: hungarianContext,
};

/**
 * Get cultural context for a locale
 */
export function getCulturalContext(locale: string): CulturalContext | undefined {
  return CULTURAL_CONTEXTS[locale];
}

/**
 * Get all locales for a specific tier
 */
export function getLocalesForTier(tier: 1 | 2 | 3 | 4 | 5): string[] {
  return Object.entries(CULTURAL_CONTEXTS)
    .filter(([_, context]) => context.tier === tier)
    .map(([locale]) => locale);
}

/**
 * Get all RTL locales
 */
export function getRtlLocales(): string[] {
  return Object.entries(CULTURAL_CONTEXTS)
    .filter(([_, context]) => context.direction === "rtl")
    .map(([locale]) => locale);
}

/**
 * Get all supported locales
 */
export function getAllSupportedLocales(): string[] {
  return Object.keys(CULTURAL_CONTEXTS);
}

/**
 * Get quality thresholds for a locale
 */
export function getQualityThresholds(locale: string) {
  const context = CULTURAL_CONTEXTS[locale];
  if (!context) {
    // Default thresholds for unknown locales
    return {
      purityThreshold: 0.95,
      minWordCount: 1000,
      maxWordCount: 2200,
      minFaqCount: 5,
      minAnswerCapsuleLength: 30,
    };
  }
  return context.quality;
}

/**
 * Get writer prompt additions for a locale
 */
export function getWriterPromptAdditions(locale: string): string {
  const context = CULTURAL_CONTEXTS[locale];
  return context?.writerPromptAdditions || "";
}

/**
 * Check if locale is supported
 */
export function isLocaleSupported(locale: string): boolean {
  return locale in CULTURAL_CONTEXTS;
}

// Export individual contexts for direct imports
// Tier 1 - Core
export { englishContext } from "./tier-1/en";
export { arabicContext } from "./tier-1/ar";
export { hindiContext } from "./tier-1/hi";
// Tier 2 - High ROI
export { chineseContext } from "./tier-2/zh";
export { russianContext } from "./tier-2/ru";
export { urduContext } from "./tier-2/ur";
export { frenchContext } from "./tier-2/fr";
export { indonesianContext } from "./tier-2/id";
// Tier 3 - Growing
export { germanContext } from "./tier-3/de";
export { persianContext } from "./tier-3/fa";
export { bengaliContext } from "./tier-3/bn";
export { filipinoContext } from "./tier-3/fil";
export { thaiContext } from "./tier-3/th";
export { vietnameseContext } from "./tier-3/vi";
export { malayContext } from "./tier-3/ms";
// Tier 4 - Niche
export { spanishContext } from "./tier-4/es";
export { turkishContext } from "./tier-4/tr";
export { italianContext } from "./tier-4/it";
export { japaneseContext } from "./tier-4/ja";
export { koreanContext } from "./tier-4/ko";
export { hebrewContext } from "./tier-4/he";
export { portugueseContext } from "./tier-4/pt";
// Tier 5 - European Expansion
export { dutchContext } from "./tier-5/nl";
export { polishContext } from "./tier-5/pl";
export { swedishContext } from "./tier-5/sv";
export { greekContext } from "./tier-5/el";
export { czechContext } from "./tier-5/cs";
export { romanianContext } from "./tier-5/ro";
export { ukrainianContext } from "./tier-5/uk";
export { hungarianContext } from "./tier-5/hu";
