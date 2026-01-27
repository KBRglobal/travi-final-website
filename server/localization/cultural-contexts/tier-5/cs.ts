/**
 * Czech Cultural Context
 * Tier 5 - European Expansion
 */

import type { CulturalContext } from "../types";

export const czechContext: CulturalContext = {
  locale: "cs",
  name: "Czech",
  nativeName: "Cestina",
  direction: "ltr",
  tier: 5,
  region: "Central Europe",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "structured",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c1, end: 0x017e, name: "Czech diacritics" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Largely secular society",
    localCustoms: [
      "Beer culture",
      "History appreciation",
      "Architecture interest",
      "Practical mindset",
    ],
    avoidTopics: ["Soviet era criticism"],
    dateFormat: "DD.MM.YYYY",
    currencyFormat: "X XXX Kc",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Pruvodce 2024",
    metaKeywordPatterns: [
      "pruvodce [destination]",
      "pamatky [destination]",
      "vstupenky [attraction]",
      "kdy jet [destination]",
    ],
    questionStarters: [
      "Co je",
      "Jak se dostat",
      "Kdy jet",
      "Kde najdu",
      "Kolik stoji",
      "Stoji za to",
    ],
    ctaPhrases: ["Rezervovat", "Koupit vstupenky", "Naplanujte", "Vice info", "Objevte"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## CZECH LANGUAGE REQUIREMENTS
Write 100% in Czech (Cestina) with hacky and carky (a, c, d, e, e, i, n, o, r, s, t, u, u, y, z).
Use formal "vy" when addressing readers.
LOCALE: cs (Czech) | DIRECTION: LTR
`,

  version: "1.0.0",
};

export default czechContext;
