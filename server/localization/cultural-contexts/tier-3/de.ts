/**
 * German Cultural Context
 * Tier 3 - Growing Market
 */

import type { CulturalContext } from "../types";

export const germanContext: CulturalContext = {
  locale: "de",
  name: "German",
  nativeName: "Deutsch",
  direction: "ltr",
  tier: 3,
  region: "Central Europe",

  writingStyle: {
    formality: "high",
    sentenceLength: "long",
    useHonorifics: true,
    paragraphStyle: "structured",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c4, end: 0x00dc, name: "Umlauts uppercase" },
      { start: 0x00e4, end: 0x00fc, name: "Umlauts lowercase" },
      { start: 0x00df, end: 0x00df, name: "Eszett" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Secular approach; respect diverse backgrounds",
    localCustoms: [
      "Punctuality and efficiency are highly valued",
      "Detailed, factual information is preferred",
      "Environmental consciousness is important",
      "Quality and value for money matter",
    ],
    avoidTopics: ["WWII comparisons", "Political stereotypes"],
    dateFormat: "DD.MM.YYYY",
    currencyFormat: "X,XX EUR",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Reisefuhrer 2024",
    metaKeywordPatterns: [
      "[destination] Reisefuhrer",
      "Sehenswurdigkeiten [destination]",
      "[attraction] Tickets",
      "Beste Reisezeit [destination]",
    ],
    questionStarters: [
      "Was ist",
      "Wie komme ich",
      "Wann ist die beste Zeit",
      "Wo kann ich",
      "Wie viel kostet",
      "Lohnt sich",
    ],
    ctaPhrases: ["Jetzt buchen", "Tickets holen", "Reise planen", "Mehr erfahren", "Entdecken"],
  },

  quality: {
    purityThreshold: 0.96,
    minWordCount: 1200,
    maxWordCount: 2400,
    minFaqCount: 5,
    minAnswerCapsuleLength: 40,
  },

  writerPromptAdditions: `
## GERMAN LANGUAGE REQUIREMENTS

Write 100% in German (Deutsch) with proper umlauts and eszett.
- Use formal "Sie" form when addressing readers
- Write in precise, informative German
- Include detailed practical information
- Proper names may remain in original form

LOCALE: de (German)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default germanContext;
