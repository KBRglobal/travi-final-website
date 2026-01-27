/**
 * Italian Cultural Context
 * Tier 4 - Niche Market
 */

import type { CulturalContext } from "../types";

export const italianContext: CulturalContext = {
  locale: "it",
  name: "Italian",
  nativeName: "Italiano",
  direction: "ltr",
  tier: 4,
  region: "Southern Europe",

  writingStyle: {
    formality: "high",
    sentenceLength: "long",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c0, end: 0x00ff, name: "Italian accents" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Catholic heritage; Vatican proximity for Rome",
    localCustoms: [
      "Food and wine culture paramount",
      "Fashion and style appreciated",
      "Art and history interests",
      "Regional pride important",
    ],
    avoidTopics: ["Mafia stereotypes", "North-South divisions"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "EUR X,XX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Guida 2024",
    metaKeywordPatterns: [
      "guida turistica [destination]",
      "cosa vedere a [destination]",
      "biglietti [attraction]",
      "periodo migliore per visitare [destination]",
    ],
    questionStarters: [
      "Cos'e",
      "Come arrivare",
      "Quando andare",
      "Dove trovare",
      "Quanto costa",
      "Vale la pena",
    ],
    ctaPhrases: [
      "Prenota ora",
      "Acquista biglietti",
      "Pianifica il viaggio",
      "Scopri di piu",
      "Inizia ad esplorare",
    ],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1200,
    maxWordCount: 2400,
    minFaqCount: 5,
    minAnswerCapsuleLength: 35,
  },

  writerPromptAdditions: `
## ITALIAN LANGUAGE REQUIREMENTS

Write 100% in Italian (Italiano) with proper accents.
- Use formal "Lei" when addressing readers
- Write with elegant, flowing prose
- Emphasize culinary and cultural experiences

LOCALE: it (Italian)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default italianContext;
