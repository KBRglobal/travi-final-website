/**
 * English Cultural Context
 * Tier 1 - Core Language
 */

import type { CulturalContext } from "../types";

export const englishContext: CulturalContext = {
  locale: "en",
  name: "English",
  nativeName: "English",
  direction: "ltr",
  tier: 1,
  region: "Global",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: false,
    paragraphStyle: "structured",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c0, end: 0x00ff, name: "Latin Extended-A" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Neutral and inclusive; avoid assuming reader's faith",
    localCustoms: [
      "Respect diverse cultural backgrounds of English readers globally",
      "Be inclusive of dietary restrictions and preferences",
      "Consider accessibility needs",
    ],
    avoidTopics: ["Political commentary", "Religious proselytizing"],
    dateFormat: "Month DD, YYYY",
    currencyFormat: "USD $X.XX",
    measurementSystem: "both",
  },

  seoPatterns: {
    titleSuffix: " | 2024 Guide",
    metaKeywordPatterns: [
      "[destination] travel guide",
      "things to do in [destination]",
      "[attraction] tickets",
      "best time to visit [destination]",
    ],
    questionStarters: [
      "What is",
      "How to",
      "When is the best time",
      "Where can I",
      "How much does",
      "Is it worth",
    ],
    ctaPhrases: ["Book now", "Get tickets", "Plan your visit", "Discover more", "Start exploring"],
  },

  quality: {
    purityThreshold: 0.99,
    minWordCount: 1800,
    maxWordCount: 3000,
    minFaqCount: 8,
    minAnswerCapsuleLength: 50,
  },

  writerPromptAdditions: `
LOCALE: en (English)
DIRECTION: LTR (left-to-right)

Write in clear, engaging American English. Use active voice and direct language.
Target a global audience of English speakers. Be culturally neutral and inclusive.
Include practical details like prices in USD, operating hours, and transportation options.
`,

  version: "1.0.0",
};

export default englishContext;
