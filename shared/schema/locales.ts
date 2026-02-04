/**
 * Locale-related constants and types for the Travi platform
 * 30 supported languages for global travel market coverage
 */

// Global languages (30 languages for maximum SEO reach)
export type Locale =
  | "en"
  | "ar"
  | "hi" // Tier 1 - Core
  | "zh"
  | "ru"
  | "ur"
  | "fr"
  | "id" // Tier 2 - High ROI
  | "de"
  | "fa"
  | "bn"
  | "fil"
  | "th"
  | "vi"
  | "ms" // Tier 3 - Growing (Southeast Asia focus)
  | "es"
  | "tr"
  | "it"
  | "ja"
  | "ko"
  | "he"
  | "pt" // Tier 4 - Niche
  | "nl"
  | "pl"
  | "sv"
  | "el"
  | "cs"
  | "ro"
  | "uk"
  | "hu"
  | "da"
  | "no"; // Tier 5 - European expansion

export type TranslationStatus = "pending" | "in_progress" | "completed" | "needs_review";

// RTL languages (right-to-left)
export const RTL_LOCALES: Locale[] = ["ar", "fa", "ur", "he"];

// 30 Supported Languages for Global Travel Market
export const SUPPORTED_LOCALES: {
  code: Locale;
  name: string;
  nativeName: string;
  region: string;
  tier: number;
}[] = [
  // TIER 1 - Core Markets (Must Have)
  { code: "en", name: "English", nativeName: "English", region: "Global", tier: 1 },
  { code: "ar", name: "Arabic", nativeName: "العربية", region: "Middle East", tier: 1 },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", region: "South Asia", tier: 1 },

  // TIER 2 - High ROI Markets
  { code: "zh", name: "Chinese", nativeName: "简体中文", region: "East Asia", tier: 2 },
  { code: "ru", name: "Russian", nativeName: "Русский", region: "CIS", tier: 2 },
  { code: "ur", name: "Urdu", nativeName: "اردو", region: "South Asia", tier: 2 },
  { code: "fr", name: "French", nativeName: "Français", region: "Europe", tier: 2 },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    region: "Southeast Asia",
    tier: 2,
  },

  // TIER 3 - Growing Markets (Southeast Asia focus)
  { code: "de", name: "German", nativeName: "Deutsch", region: "Europe", tier: 3 },
  { code: "fa", name: "Persian", nativeName: "فارسی", region: "Middle East", tier: 3 },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", region: "South Asia", tier: 3 },
  { code: "fil", name: "Filipino", nativeName: "Filipino", region: "Southeast Asia", tier: 3 },
  { code: "th", name: "Thai", nativeName: "ไทย", region: "Southeast Asia", tier: 3 },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", region: "Southeast Asia", tier: 3 },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", region: "Southeast Asia", tier: 3 },

  // TIER 4 - Niche Markets
  { code: "es", name: "Spanish", nativeName: "Español", region: "Americas", tier: 4 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", region: "Middle East", tier: 4 },
  { code: "it", name: "Italian", nativeName: "Italiano", region: "Europe", tier: 4 },
  { code: "ja", name: "Japanese", nativeName: "日本語", region: "East Asia", tier: 4 },
  { code: "ko", name: "Korean", nativeName: "한국어", region: "East Asia", tier: 4 },
  { code: "he", name: "Hebrew", nativeName: "עברית", region: "Middle East", tier: 4 },
  { code: "pt", name: "Portuguese", nativeName: "Português", region: "Europe/Brazil", tier: 4 },

  // TIER 5 - European Expansion
  { code: "nl", name: "Dutch", nativeName: "Nederlands", region: "Europe", tier: 5 },
  { code: "pl", name: "Polish", nativeName: "Polski", region: "Europe", tier: 5 },
  { code: "sv", name: "Swedish", nativeName: "Svenska", region: "Europe", tier: 5 },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", region: "Europe", tier: 5 },
  { code: "cs", name: "Czech", nativeName: "Čeština", region: "Europe", tier: 5 },
  { code: "ro", name: "Romanian", nativeName: "Română", region: "Europe", tier: 5 },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", region: "CIS", tier: 5 },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", region: "Europe", tier: 5 },
  { code: "da", name: "Danish", nativeName: "Dansk", region: "Europe", tier: 5 },
  { code: "no", name: "Norwegian", nativeName: "Norsk", region: "Europe", tier: 5 },
];

// All 30 supported locales for Zod validation - matches SUPPORTED_LOCALES array
export const supportedLocales = [
  // Tier 1 - Core
  "en",
  "ar",
  "hi",
  // Tier 2 - High ROI
  "zh",
  "ru",
  "ur",
  "fr",
  "id",
  // Tier 3 - Growing (Southeast Asia focus)
  "de",
  "fa",
  "bn",
  "fil",
  "th",
  "vi",
  "ms",
  // Tier 4 - Niche
  "es",
  "tr",
  "it",
  "ja",
  "ko",
  "he",
  "pt",
  // Tier 5 - European Expansion
  "nl",
  "pl",
  "sv",
  "el",
  "cs",
  "ro",
  "uk",
  "hu",
  "da",
  "no",
] as const;

// All 30 supported locales for native content
export const nativeLocales = [
  // Tier 1 - Core
  "en",
  "ar",
  "hi",
  // Tier 2 - High ROI
  "zh",
  "ru",
  "ur",
  "fr",
  "id",
  // Tier 3 - Growing (Southeast Asia focus)
  "de",
  "fa",
  "bn",
  "fil",
  "th",
  "vi",
  "ms",
  // Tier 4 - Niche
  "es",
  "tr",
  "it",
  "ja",
  "ko",
  "he",
  "pt",
  // Tier 5 - European expansion
  "nl",
  "pl",
  "sv",
  "el",
  "cs",
  "ro",
  "uk",
  "hu",
  "da",
  "no",
] as const;

// Pilot locales for initial rollout
export const pilotLocales = ["en", "ar", "fr"] as const;
