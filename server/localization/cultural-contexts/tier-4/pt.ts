/**
 * Portuguese Cultural Context
 * Tier 4 - Niche Market
 */

import type { CulturalContext } from "../types";

export const portugueseContext: CulturalContext = {
  locale: "pt",
  name: "Portuguese",
  nativeName: "Portugues",
  direction: "ltr",
  tier: 4,
  region: "Southern Europe / South America",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c0, end: 0x00ff, name: "Portuguese accents" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Catholic heritage; secular approach",
    localCustoms: [
      "Brazil vs Portugal differences",
      "Family travel common",
      "Food and beach culture",
      "Friendly, warm communication",
    ],
    avoidTopics: ["Colonial history criticism", "Brazil-Portugal stereotypes"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "R$ X.XXX / EUR X,XX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Guia 2024",
    metaKeywordPatterns: [
      "guia de viagem [destination]",
      "o que fazer em [destination]",
      "ingressos [attraction]",
      "melhor epoca para visitar [destination]",
    ],
    questionStarters: [
      "O que e",
      "Como chegar",
      "Quando ir",
      "Onde encontrar",
      "Quanto custa",
      "Vale a pena",
    ],
    ctaPhrases: [
      "Reserve agora",
      "Comprar ingressos",
      "Planeje sua viagem",
      "Saiba mais",
      "Comece a explorar",
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
## PORTUGUESE LANGUAGE REQUIREMENTS

Write 100% in Portuguese (Portugues) with proper accents.
- Use Brazilian Portuguese as primary (larger audience)
- Use formal "voce" when addressing readers
- Include all accent marks and cedilla

LOCALE: pt (Portuguese)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default portugueseContext;
