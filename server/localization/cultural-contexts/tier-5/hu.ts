/**
 * Hungarian Cultural Context
 * Tier 5 - European Expansion
 */

import type { CulturalContext } from "../types";

export const hungarianContext: CulturalContext = {
  locale: "hu",
  name: "Hungarian",
  nativeName: "Magyar",
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
      { start: 0x00c1, end: 0x0171, name: "Hungarian accents" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Christian traditions; secular approach",
    localCustoms: ["Thermal bath culture", "Food traditions", "History pride", "Hospitality"],
    avoidTopics: ["Trianon Treaty", "Political divisions"],
    dateFormat: "YYYY.MM.DD",
    currencyFormat: "X XXX Ft",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Utikalauz 2024",
    metaKeywordPatterns: [
      "utikalauz [destination]",
      "latnivatók [destination]",
      "jegyek [attraction]",
      "mikor erdemes [destination]",
    ],
    questionStarters: [
      "Mi az",
      "Hogyan jutok",
      "Mikor erdemes",
      "Hol talalok",
      "Mennyibe kerul",
      "Megeri",
    ],
    ctaPhrases: ["Foglalás", "Jegyvásárlás", "Tervezés", "Tovább", "Felfedezés"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## HUNGARIAN LANGUAGE REQUIREMENTS
Write 100% in Hungarian (Magyar) with special characters (a, e, i, o, o, u, u).
Use formal "On" when addressing readers.
LOCALE: hu (Hungarian) | DIRECTION: LTR
`,

  version: "1.0.0",
};

export default hungarianContext;
