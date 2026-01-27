/**
 * Dutch Cultural Context
 * Tier 5 - European Expansion
 */

import type { CulturalContext } from "../types";

export const dutchContext: CulturalContext = {
  locale: "nl",
  name: "Dutch",
  nativeName: "Nederlands",
  direction: "ltr",
  tier: 5,
  region: "Western Europe",

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
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Secular society; respect diversity",
    localCustoms: [
      "Direct communication valued",
      "Cycling culture",
      "Environmental awareness",
      "Budget-conscious travelers",
    ],
    avoidTopics: [],
    dateFormat: "DD-MM-YYYY",
    currencyFormat: "EUR X,XX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Reisgids 2024",
    metaKeywordPatterns: [
      "[destination] reisgids",
      "bezienswaardigheden [destination]",
      "[attraction] tickets",
      "beste tijd [destination]",
    ],
    questionStarters: ["Wat is", "Hoe kom ik", "Wanneer", "Waar", "Hoeveel kost", "Is het waard"],
    ctaPhrases: ["Nu boeken", "Tickets kopen", "Plan je reis", "Meer info", "Ontdek"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## DUTCH LANGUAGE REQUIREMENTS
Write 100% in Dutch (Nederlands). Use informal "je/jij" form. Direct, practical style.
LOCALE: nl (Dutch) | DIRECTION: LTR
`,

  version: "1.0.0",
};

export default dutchContext;
