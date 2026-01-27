/**
 * Filipino Cultural Context
 * Tier 3 - Growing Market (Southeast Asia)
 */

import type { CulturalContext } from "../types";

export const filipinoContext: CulturalContext = {
  locale: "fil",
  name: "Filipino",
  nativeName: "Filipino",
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
    religiousReferences: "Catholic traditions important for many; respect diversity",
    localCustoms: [
      "Family-oriented travel (balikbayan)",
      "OFW (overseas workers) context",
      "Social media and photography valued",
      "Strong community/family ties",
    ],
    avoidTopics: ["Political topics", "Religious criticism"],
    dateFormat: "MM/DD/YYYY",
    currencyFormat: "PHP X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | 2024 Guide",
    metaKeywordPatterns: [
      "[destination] travel guide",
      "mga lugar na puntahan sa [destination]",
      "[attraction] tickets",
      "best time to visit [destination]",
    ],
    questionStarters: [
      "Ano ang",
      "Paano pumunta",
      "Kailan ang best time",
      "Saan makakakita",
      "Magkano ang",
      "Sulit ba ang",
    ],
    ctaPhrases: [
      "Mag-book na",
      "Kumuha ng tickets",
      "I-plan ang trip mo",
      "Alamin pa",
      "Magsimulang mag-explore",
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
## FILIPINO LANGUAGE REQUIREMENTS

Write 100% in Filipino (Tagalog-based).
- Use respectful po/opo where appropriate
- Write for Filipino travelers (including OFWs)
- Include family-friendly options
- Note Instagram/social media worthy spots
- Some English loan words are acceptable in natural Filipino

LOCALE: fil (Filipino)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default filipinoContext;
