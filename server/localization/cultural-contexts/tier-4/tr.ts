/**
 * Turkish Cultural Context
 * Tier 4 - Niche Market
 */

import type { CulturalContext } from "../types";

export const turkishContext: CulturalContext = {
  locale: "tr",
  name: "Turkish",
  nativeName: "Turkce",
  direction: "ltr",
  tier: 4,
  region: "Middle East / Europe",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "structured",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c7, end: 0x00e7, name: "C cedilla" },
      { start: 0x011e, end: 0x011f, name: "G breve" },
      { start: 0x0130, end: 0x0131, name: "I dotted/dotless" },
      { start: 0x015e, end: 0x015f, name: "S cedilla" },
      { start: 0x00d6, end: 0x00f6, name: "O umlaut" },
      { start: 0x00dc, end: 0x00fc, name: "U umlaut" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Secular republic but Muslim heritage; mosque etiquette",
    localCustoms: [
      "Hospitality is paramount",
      "Tea culture",
      "Family values important",
      "Respect for Ataturk's legacy",
    ],
    avoidTopics: ["Political criticism", "Kurdish issues", "Armenian history"],
    dateFormat: "DD.MM.YYYY",
    currencyFormat: "X.XXX TL",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | 2024 Rehberi",
    metaKeywordPatterns: [
      "[destination] gezi rehberi",
      "[destination] gezilecek yerler",
      "[attraction] bilet",
      "[destination] icin en iyi zaman",
    ],
    questionStarters: [
      "Nedir",
      "Nasil gidilir",
      "Ne zaman gitmeli",
      "Nerede bulunur",
      "Ne kadar",
      "Deger mi",
    ],
    ctaPhrases: [
      "Simdi rezervasyon yap",
      "Bilet al",
      "Gezini planla",
      "Daha fazla bilgi",
      "Kesfe basla",
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
## TURKISH LANGUAGE REQUIREMENTS

Write 100% in Turkish (Turkce) with proper special characters.
- Use all Turkish characters (c, g, i/I, o, s, u)
- Formal "siz" when addressing readers
- Write for Turkish travelers

LOCALE: tr (Turkish)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default turkishContext;
