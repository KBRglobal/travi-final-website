/**
 * Ukrainian Cultural Context
 * Tier 5 - European Expansion
 */

import type { CulturalContext } from "../types";

export const ukrainianContext: CulturalContext = {
  locale: "uk",
  name: "Ukrainian",
  nativeName: "Українська",
  direction: "ltr",
  tier: 5,
  region: "Eastern Europe",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: true,
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
    religiousReferences: "Orthodox Christian traditions",
    localCustoms: ["Hospitality", "Cultural pride", "Family values", "Resilience"],
    avoidTopics: ["War in insensitive context", "Russia-related politics"],
    dateFormat: "DD.MM.YYYY",
    currencyFormat: "X XXX грн",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Путівник 2024",
    metaKeywordPatterns: [
      "путівник [destination]",
      "пам'ятки [destination]",
      "квитки [attraction]",
      "коли їхати [destination]",
    ],
    questionStarters: [
      "Що це",
      "Як дістатися",
      "Коли їхати",
      "Де знайти",
      "Скільки коштує",
      "Чи варто",
    ],
    ctaPhrases: ["Забронювати", "Купити квитки", "Спланувати", "Дізнатися більше", "Відкрити"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## UKRAINIAN LANGUAGE REQUIREMENTS
Write 100% in Ukrainian (Українська) using Cyrillic script.
Use formal "Ви" when addressing readers.
LOCALE: uk (Ukrainian) | DIRECTION: LTR
`,

  version: "1.0.0",
};

export default ukrainianContext;
