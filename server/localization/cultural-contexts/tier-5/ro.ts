/**
 * Romanian Cultural Context
 * Tier 5 - European Expansion
 */

import type { CulturalContext } from "../types";

export const romanianContext: CulturalContext = {
  locale: "ro",
  name: "Romanian",
  nativeName: "Romana",
  direction: "ltr",
  tier: 5,
  region: "Eastern Europe",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x0102, end: 0x021b, name: "Romanian special" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Orthodox Christian traditions",
    localCustoms: ["Hospitality", "Family values", "History interest", "Nature appreciation"],
    avoidTopics: ["Communist era in negative light"],
    dateFormat: "DD.MM.YYYY",
    currencyFormat: "X.XXX RON",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Ghid 2024",
    metaKeywordPatterns: [
      "ghid turistic [destination]",
      "obiective [destination]",
      "bilete [attraction]",
      "cea mai buna perioada [destination]",
    ],
    questionStarters: [
      "Ce este",
      "Cum ajung",
      "Cand sa merg",
      "Unde gasesc",
      "Cat costa",
      "Merita",
    ],
    ctaPhrases: ["Rezerva acum", "Cumpara bilete", "Planifica", "Afla mai multe", "Descopera"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## ROMANIAN LANGUAGE REQUIREMENTS
Write 100% in Romanian (Romana) with special characters (a, a, i, s, t).
Use formal "dumneavoastra" when addressing readers.
LOCALE: ro (Romanian) | DIRECTION: LTR
`,

  version: "1.0.0",
};

export default romanianContext;
