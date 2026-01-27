/**
 * Malay Cultural Context
 * Tier 3 - Growing Market (Southeast Asia)
 */

import type { CulturalContext } from "../types";

export const malayContext: CulturalContext = {
  locale: "ms",
  name: "Malay",
  nativeName: "Bahasa Melayu",
  direction: "ltr",
  tier: 3,
  region: "Southeast Asia",

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
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Respect Islamic traditions (Malaysia); multicultural awareness",
    localCustoms: [
      "Halal food important for Muslim travelers",
      "Family travel common",
      "Modest dress appreciated",
      "Multicultural society (Malay, Chinese, Indian)",
    ],
    avoidTopics: ["Religious criticism", "Racial topics", "Political topics"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "RM X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Panduan 2024",
    metaKeywordPatterns: [
      "panduan pelancongan [destination]",
      "tempat menarik di [destination]",
      "tiket [attraction]",
      "masa terbaik melawat [destination]",
    ],
    questionStarters: [
      "Apa itu",
      "Bagaimana untuk",
      "Bila masa terbaik",
      "Di mana boleh",
      "Berapa harga",
      "Adakah berbaloi",
    ],
    ctaPhrases: [
      "Tempah sekarang",
      "Dapatkan tiket",
      "Rancang perjalanan",
      "Ketahui lebih lanjut",
      "Mula meneroka",
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
## MALAY LANGUAGE REQUIREMENTS

Write 100% in Malay (Bahasa Melayu).
- Use standard Malaysian Malay
- Write for Malaysian travelers
- Include halal dining options
- Note prayer facilities where relevant
- Family-friendly content

LOCALE: ms (Malay)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default malayContext;
