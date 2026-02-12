import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from "@shared/schema/locales";

// Only English is bundled statically - all other languages are lazy-loaded on demand.
// This saves ~1.3MB from the initial bundle (28 language JSON files).
import enCommon from "../../locales/en/common.json";

type TranslationResource = Record<string, unknown>;

// Dynamic import map for lazy-loaded locale files.
// Locale bundles removed — will be re-added when localization is rebuilt.
const localeImporters: Record<string, () => Promise<{ default: TranslationResource }>> = {};

// Track which locales have already been loaded to avoid redundant fetches
const loadedLocales = new Set<string>(["en"]);

// Initial resources - only English bundled
const resources: Record<string, { common: TranslationResource }> = {
  en: { common: enCommon },
};

/**
 * Load a locale's translation bundle on demand.
 * Returns immediately if already loaded or if the locale is English.
 */
export async function loadLocaleResources(locale: string): Promise<void> {
  if (loadedLocales.has(locale)) return;

  const importer = localeImporters[locale];
  if (!importer) return;

  try {
    const module = await importer();
    i18n.addResourceBundle(locale, "common", module.default, true, true);
    loadedLocales.add(locale);
  } catch (err) {
    console.error(`[i18n] Failed to load locale "${locale}":`, err);
  }
}

// Missing key handler - logs and returns visible marker
const missingKeyHandler = (
  lngs: readonly string[],
  ns: string,
  key: string,
  fallbackValue: string,
  updateMissing: boolean,
  _options: Record<string, unknown>
) => {
  // Only log in development to avoid console spam in production
  if (process.env.NODE_ENV === "development") {
    // empty
  }
};

// Initialize i18next with English as fallback.
// Since only English is bundled, it serves as a safe fallback while
// other locale bundles are being lazy-loaded.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,

    // English is always available as the bundled fallback
    fallbackLng: "en",

    defaultNS: "common",
    ns: ["common"],

    // Return the key itself when missing (we format it below)
    returnNull: false,
    returnEmptyString: false,

    // Show visible marker for missing keys instead of silent fallback
    saveMissing: true,
    missingKeyHandler,

    // Format missing keys as visible markers
    parseMissingKeyHandler: (key: string) => {
      return `[MISSING:${key}]`;
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ["path", "localStorage"],
      lookupFromPathIndex: 0,
      caches: ["localStorage"],
    },

    react: {
      useSuspense: false,
    },
  });

// Helper function to check if locale is RTL
export const isRTL = (locale: Locale): boolean => {
  return RTL_LOCALES.includes(locale);
};

// Helper function to get locale info
export const getLocaleInfo = (code: Locale) => {
  return SUPPORTED_LOCALES.find(l => l.code === code);
};

// Helper function to get all locales by tier
export const getLocalesByTier = (tier: number) => {
  return SUPPORTED_LOCALES.filter(l => l.tier === tier);
};

// Helper function to change language and update document direction.
// Lazy-loads the locale bundle before switching so translations are available immediately.
export const changeLanguage = async (locale: Locale) => {
  await loadLocaleResources(locale);
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = isRTL(locale) ? "rtl" : "ltr";
  localStorage.setItem("i18nextLng", locale);
};

// Get current locale
export const getCurrentLocale = (): Locale => {
  return (i18n.language || "en") as Locale;
};

export default i18n;
