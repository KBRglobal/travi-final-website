/**
 * Hebrew Cultural Context
 * Tier 4 - Niche Market
 */

import type { CulturalContext } from "../types";

export const hebrewContext: CulturalContext = {
  locale: "he",
  name: "Hebrew",
  nativeName: "עברית",
  direction: "rtl",
  tier: 4,
  region: "Middle East",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: false,
    paragraphStyle: "structured",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [
      { start: 0x0590, end: 0x05ff, name: "Hebrew" },
      { start: 0xfb1d, end: 0xfb4f, name: "Hebrew Presentation Forms" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Respect Jewish traditions; Shabbat considerations",
    localCustoms: [
      "Shabbat hours (Friday evening to Saturday evening)",
      "Kosher food options important",
      "Security awareness",
      "Direct communication style",
    ],
    avoidTopics: ["Political Israel-Palestine topics", "Holocaust comparisons"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "₪X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | מדריך 2024",
    metaKeywordPatterns: [
      "מדריך טיולים [destination]",
      "אטרקציות ב[destination]",
      "כרטיסים [attraction]",
      "הזמן הטוב לבקר ב[destination]",
    ],
    questionStarters: ["מה זה", "איך להגיע", "מתי כדאי", "איפה אפשר", "כמה עולה", "האם שווה"],
    ctaPhrases: ["הזמן עכשיו", "קנה כרטיסים", "תכנן את הטיול", "למידע נוסף", "התחל לחקור"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1200,
    maxWordCount: 2400,
    minFaqCount: 5,
    minAnswerCapsuleLength: 35,
  },

  writerPromptAdditions: `
## HEBREW LANGUAGE REQUIREMENTS

Write 100% in Hebrew (עברית) using Hebrew script.
- Write in modern Hebrew
- Direct, informal tone is appropriate
- Note Shabbat hours where relevant
- Mention kosher dining options
- RTL formatting handled by system

LOCALE: he (Hebrew)
DIRECTION: RTL
`,

  version: "1.0.0",
};

export default hebrewContext;
