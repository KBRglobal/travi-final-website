/**
 * Spanish Cultural Context
 * Tier 4 - Niche Market
 */

import type { CulturalContext } from "../types";

export const spanishContext: CulturalContext = {
  locale: "es",
  name: "Spanish",
  nativeName: "Espanol",
  direction: "ltr",
  tier: 4,
  region: "Spain / Latin America",

  writingStyle: {
    formality: "medium",
    sentenceLength: "long",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c1, end: 0x00fa, name: "Spanish accents" },
      { start: 0x00d1, end: 0x00f1, name: "N tilde" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "native",
  },

  sensitivities: {
    religiousReferences: "Catholic heritage respected; secular approach",
    localCustoms: [
      "Family and group travel common",
      "Gastronomy is important",
      "Siesta culture awareness",
      "Regional pride (different Spanish-speaking regions)",
    ],
    avoidTopics: ["Regional political tensions", "Colonial history criticism"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "X,XX EUR / $X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Guia 2024",
    metaKeywordPatterns: [
      "guia de viaje [destination]",
      "que hacer en [destination]",
      "entradas [attraction]",
      "mejor epoca para visitar [destination]",
    ],
    questionStarters: [
      "Que es",
      "Como llegar",
      "Cuando es mejor",
      "Donde encontrar",
      "Cuanto cuesta",
      "Vale la pena",
    ],
    ctaPhrases: [
      "Reservar ahora",
      "Conseguir entradas",
      "Planificar tu viaje",
      "Saber mas",
      "Empezar a explorar",
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
## SPANISH LANGUAGE REQUIREMENTS

Write 100% in Spanish (Espanol) with proper accents.
- Use neutral Spanish accessible to Spain and Latin America
- Use formal "usted" when addressing readers
- Include all accent marks (a, e, i, o, u, n, u)
- Inverted punctuation (?, !) at sentence starts

LOCALE: es (Spanish)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default spanishContext;
