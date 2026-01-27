/**
 * Polish Cultural Context
 * Tier 5 - European Expansion
 */

import type { CulturalContext } from "../types";

export const polishContext: CulturalContext = {
  locale: "pl",
  name: "Polish",
  nativeName: "Polski",
  direction: "ltr",
  tier: 5,
  region: "Central Europe",

  writingStyle: {
    formality: "high",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "structured",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x0104, end: 0x017c, name: "Polish special" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Catholic heritage important",
    localCustoms: ["Family values", "History awareness", "Hospitality", "Food culture"],
    avoidTopics: ["WWII insensitive topics", "Soviet era criticism"],
    dateFormat: "DD.MM.YYYY",
    currencyFormat: "X XXX zl",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Przewodnik 2024",
    metaKeywordPatterns: [
      "przewodnik [destination]",
      "atrakcje [destination]",
      "bilety [attraction]",
      "kiedy jechac [destination]",
    ],
    questionStarters: [
      "Co to jest",
      "Jak dojechac",
      "Kiedy jechac",
      "Gdzie znalezc",
      "Ile kosztuje",
      "Czy warto",
    ],
    ctaPhrases: ["Zarezerwuj", "Kup bilety", "Zaplanuj", "Dowiedz sie", "Odkryj"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## POLISH LANGUAGE REQUIREMENTS
Write 100% in Polish (Polski) with special characters (a, c, e, l, n, o, s, z, z).
Use formal "Pan/Pani" when addressing readers.
LOCALE: pl (Polish) | DIRECTION: LTR
`,

  version: "1.0.0",
};

export default polishContext;
