/**
 * Cultural Context Types
 * =====================
 * Type definitions for locale-specific cultural contexts
 * Used by writer agents to generate culturally appropriate native content
 */

/**
 * Writing style preferences for a locale
 */
export interface WritingStyle {
  /** Level of formality in address and tone */
  formality: "high" | "medium" | "casual";
  /** Preferred sentence length */
  sentenceLength: "short" | "medium" | "long";
  /** Whether to use honorifics in addressing reader */
  useHonorifics: boolean;
  /** Preferred paragraph structure */
  paragraphStyle: "concise" | "flowing" | "structured";
  /** Use of passive vs active voice */
  voicePreference: "active" | "passive" | "mixed";
}

/**
 * Script and typography settings for a locale
 */
export interface ScriptSettings {
  /** Unicode ranges for script validation */
  unicodeRanges: Array<{ start: number; end: number; name: string }>;
  /** Numeral style preference */
  numeralStyle: "western" | "native" | "both";
  /** Additional allowed scripts (e.g., Latin for proper nouns) */
  allowedSecondaryScripts: string[];
  /** Punctuation style */
  punctuationStyle: "western" | "native" | "mixed";
}

/**
 * Cultural sensitivities and guidelines
 */
export interface CulturalSensitivities {
  /** Guidance on religious references */
  religiousReferences: string;
  /** Important local customs to respect */
  localCustoms: string[];
  /** Topics to avoid or handle carefully */
  avoidTopics: string[];
  /** Preferred time/date formats */
  dateFormat: string;
  /** Currency formatting */
  currencyFormat: string;
  /** Measurement system preference */
  measurementSystem: "metric" | "imperial" | "both";
}

/**
 * SEO patterns for locale
 */
export interface SeoPatterns {
  /** Common title suffix (e.g., "| 2024 Guide") */
  titleSuffix: string;
  /** Meta keyword patterns */
  metaKeywordPatterns: string[];
  /** Common question starters for FAQ */
  questionStarters: string[];
  /** Call-to-action phrases */
  ctaPhrases: string[];
}

/**
 * Quality thresholds for content validation
 */
export interface QualityThresholds {
  /** Minimum locale purity score (0.0 - 1.0) */
  purityThreshold: number;
  /** Minimum word count for full content */
  minWordCount: number;
  /** Maximum word count */
  maxWordCount: number;
  /** Minimum FAQ count */
  minFaqCount: number;
  /** Minimum answer capsule length */
  minAnswerCapsuleLength: number;
}

/**
 * Full cultural context definition for a locale
 */
export interface CulturalContext {
  /** ISO locale code (e.g., "en", "ar", "hi") */
  locale: string;
  /** English name of the language */
  name: string;
  /** Native name of the language */
  nativeName: string;
  /** Text direction */
  direction: "ltr" | "rtl";
  /** Tier (1-5) for prioritization */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Primary region */
  region: string;

  /** Writing style preferences */
  writingStyle: WritingStyle;

  /** Script and typography settings */
  script: ScriptSettings;

  /** Cultural sensitivities */
  sensitivities: CulturalSensitivities;

  /** SEO patterns */
  seoPatterns: SeoPatterns;

  /** Quality thresholds */
  quality: QualityThresholds;

  /** System prompt additions for AI writers */
  writerPromptAdditions: string;

  /** Version for tracking updates */
  version: string;
}

/**
 * Locale tier definitions
 */
export const LOCALE_TIERS = {
  1: { name: "Core", description: "Must-have languages for core markets", priority: "critical" },
  2: { name: "High ROI", description: "High return on investment languages", priority: "high" },
  3: {
    name: "Growing",
    description: "Growing markets with Southeast Asia focus",
    priority: "medium",
  },
  4: { name: "Niche", description: "Niche markets with specific audiences", priority: "low" },
  5: {
    name: "European Expansion",
    description: "European expansion languages",
    priority: "lowest",
  },
} as const;

/**
 * Get locale tier number
 */
export function getLocaleTier(locale: string): 1 | 2 | 3 | 4 | 5 {
  const tier1 = ["en", "ar", "hi"];
  const tier2 = ["zh", "ru", "ur", "fr", "id"];
  const tier3 = ["de", "fa", "bn", "fil", "th", "vi", "ms"];
  const tier4 = ["es", "tr", "it", "ja", "ko", "he", "pt"];
  const tier5 = ["nl", "pl", "sv", "el", "cs", "ro", "uk", "hu"];

  if (tier1.includes(locale)) return 1;
  if (tier2.includes(locale)) return 2;
  if (tier3.includes(locale)) return 3;
  if (tier4.includes(locale)) return 4;
  if (tier5.includes(locale)) return 5;

  return 5; // Default to lowest tier
}

/**
 * Check if locale uses RTL direction
 */
export function isRtlLocale(locale: string): boolean {
  return ["ar", "fa", "ur", "he"].includes(locale);
}
