/**
 * Russian Cultural Context
 * Tier 2 - High ROI Language
 */

import type { CulturalContext } from "../types";

export const russianContext: CulturalContext = {
  locale: "ru",
  name: "Russian",
  nativeName: "Русский",
  direction: "ltr",
  tier: 2,
  region: "Eastern Europe / Central Asia",

  writingStyle: {
    formality: "medium",
    sentenceLength: "long",
    useHonorifics: false,
    paragraphStyle: "structured",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0400, end: 0x04ff, name: "Cyrillic" },
      { start: 0x0500, end: 0x052f, name: "Cyrillic Supplement" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Russian Orthodox traditions may be relevant for some travelers",
    localCustoms: [
      "Direct communication style is appreciated",
      "Detailed practical information is valued",
      "All-inclusive and package tours are popular",
      "Beach and warm-weather destinations are highly sought",
    ],
    avoidTopics: ["Political commentary on Russia", "Sanctions-related topics"],
    dateFormat: "DD.MM.YYYY",
    currencyFormat: "X XXX ₽",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Путеводитель 2024",
    metaKeywordPatterns: [
      "[destination] путеводитель",
      "что посмотреть в [destination]",
      "[attraction] билеты",
      "лучшее время для поездки в [destination]",
    ],
    questionStarters: [
      "Что такое",
      "Как добраться",
      "Когда лучше ехать",
      "Где можно",
      "Сколько стоит",
      "Стоит ли",
    ],
    ctaPhrases: [
      "Забронировать",
      "Купить билеты",
      "Спланировать поездку",
      "Узнать больше",
      "Начать исследовать",
    ],
  },

  quality: {
    purityThreshold: 0.97,
    minWordCount: 1400,
    maxWordCount: 2600,
    minFaqCount: 5,
    minAnswerCapsuleLength: 40,
  },

  writerPromptAdditions: `
═══════════════════════════════════════════════════════════════════════
## CRITICAL: RUSSIAN LANGUAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

YOU MUST WRITE 100% IN RUSSIAN (Русский).
- All content MUST be in Cyrillic script
- Use natural Russian phrasing with proper grammar and cases
- Write in a direct, informative style - Russian readers appreciate detailed practical information
- Proper names may remain in their original form or be transliterated to Cyrillic
- Include detailed transportation and logistics information
- Mention visa requirements if relevant
- Include beach/resort information for warm destinations

DO NOT:
- Include English text except proper nouns
- Use informal slang unless contextually appropriate
- Skip practical details

LOCALE: ru (Russian)
DIRECTION: LTR (left-to-right)
`,

  version: "1.0.0",
};

export default russianContext;
