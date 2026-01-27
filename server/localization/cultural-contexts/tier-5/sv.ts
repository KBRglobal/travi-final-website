/**
 * Swedish Cultural Context
 * Tier 5 - European Expansion
 */

import type { CulturalContext } from "../types";

export const swedishContext: CulturalContext = {
  locale: "sv",
  name: "Swedish",
  nativeName: "Svenska",
  direction: "ltr",
  tier: 5,
  region: "Northern Europe",

  writingStyle: {
    formality: "casual",
    sentenceLength: "short",
    useHonorifics: false,
    paragraphStyle: "concise",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c4, end: 0x00f6, name: "Swedish vowels" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Secular society",
    localCustoms: [
      "Environmental consciousness",
      "Equality values",
      "Nature appreciation",
      "Fika culture",
    ],
    avoidTopics: [],
    dateFormat: "YYYY-MM-DD",
    currencyFormat: "X XXX kr",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Guide 2024",
    metaKeywordPatterns: [
      "reseguide [destination]",
      "sevardheter [destination]",
      "[attraction] biljetter",
      "basta tid [destination]",
    ],
    questionStarters: [
      "Vad ar",
      "Hur tar man sig",
      "Nar ar bast",
      "Var hittar man",
      "Vad kostar",
      "Ar det vart",
    ],
    ctaPhrases: ["Boka nu", "Kop biljetter", "Planera din resa", "Las mer", "Utforska"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## SWEDISH LANGUAGE REQUIREMENTS
Write 100% in Swedish (Svenska) with a, a, o. Use informal "du" form.
Concise, practical style. LOCALE: sv (Swedish) | DIRECTION: LTR
`,

  version: "1.0.0",
};

export default swedishContext;
