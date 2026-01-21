import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from '@shared/schema';

// Import all locale files - 30 supported languages
// Tier 1 - Core
import enCommon from '../../locales/en/common.json';
import arCommon from '../../locales/ar/common.json';
import hiCommon from '../../locales/hi/common.json';

// Tier 2 - High ROI
import zhCommon from '../../locales/zh/common.json';
import ruCommon from '../../locales/ru/common.json';
import urCommon from '../../locales/ur/common.json';
import frCommon from '../../locales/fr/common.json';
import idCommon from '../../locales/id/common.json';

// Tier 3 - Growing (Southeast Asia focus)
import deCommon from '../../locales/de/common.json';
import faCommon from '../../locales/fa/common.json';
import bnCommon from '../../locales/bn/common.json';
import filCommon from '../../locales/fil/common.json';
import thCommon from '../../locales/th/common.json';
import viCommon from '../../locales/vi/common.json';
import msCommon from '../../locales/ms/common.json';

// Tier 4 - Niche
import esCommon from '../../locales/es/common.json';
import trCommon from '../../locales/tr/common.json';
import itCommon from '../../locales/it/common.json';
import jaCommon from '../../locales/ja/common.json';
import koCommon from '../../locales/ko/common.json';
import heCommon from '../../locales/he/common.json';
import ptCommon from '../../locales/pt/common.json';

// Tier 5 - European Expansion
import nlCommon from '../../locales/nl/common.json';
import plCommon from '../../locales/pl/common.json';
import svCommon from '../../locales/sv/common.json';
import elCommon from '../../locales/el/common.json';
import csCommon from '../../locales/cs/common.json';
import roCommon from '../../locales/ro/common.json';
import ukCommon from '../../locales/uk/common.json';
import huCommon from '../../locales/hu/common.json';

// Resources object - all 30 language translations
const resources: Record<string, { common: any }> = {
  // Tier 1
  en: { common: enCommon },
  ar: { common: arCommon },
  hi: { common: hiCommon },
  // Tier 2
  zh: { common: zhCommon },
  ru: { common: ruCommon },
  ur: { common: urCommon },
  fr: { common: frCommon },
  id: { common: idCommon },
  // Tier 3
  de: { common: deCommon },
  fa: { common: faCommon },
  bn: { common: bnCommon },
  fil: { common: filCommon },
  th: { common: thCommon },
  vi: { common: viCommon },
  ms: { common: msCommon },
  // Tier 4
  es: { common: esCommon },
  tr: { common: trCommon },
  it: { common: itCommon },
  ja: { common: jaCommon },
  ko: { common: koCommon },
  he: { common: heCommon },
  pt: { common: ptCommon },
  // Tier 5
  nl: { common: nlCommon },
  pl: { common: plCommon },
  sv: { common: svCommon },
  el: { common: elCommon },
  cs: { common: csCommon },
  ro: { common: roCommon },
  uk: { common: ukCommon },
  hu: { common: huCommon },
};

// Missing key handler - logs and returns visible marker
const missingKeyHandler = (
  lngs: readonly string[],
  ns: string,
  key: string,
  fallbackValue: string,
  updateMissing: boolean,
  options: any
) => {
  // Only log in development to avoid console spam in production
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[MISSING_TRANSLATION] locale="${lngs[0]}" ns="${ns}" key="${key}"`);
  }
};

// Initialize i18next with NO silent fallback - single locale only
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    
    // CRITICAL: Disable fallback to prevent mixed-language UI
    // Set to false to completely disable fallback
    fallbackLng: false,
    
    defaultNS: 'common',
    ns: ['common'],
    
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
      order: ['path', 'localStorage'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
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

// Helper function to change language and update document direction
export const changeLanguage = async (locale: Locale) => {
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
  localStorage.setItem('i18nextLng', locale);
};

// Get current locale
export const getCurrentLocale = (): Locale => {
  return (i18n.language || 'en') as Locale;
};

export default i18n;
