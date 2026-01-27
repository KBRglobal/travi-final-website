/**
 * Hindi Cultural Context
 * Tier 1 - Core Language
 */

import type { CulturalContext } from "../types";

export const hindiContext: CulturalContext = {
  locale: "hi",
  name: "Hindi",
  nativeName: "हिन्दी",
  direction: "ltr",
  tier: 1,
  region: "South Asia",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [
      { start: 0x0900, end: 0x097f, name: "Devanagari" },
      { start: 0xa8e0, end: 0xa8ff, name: "Devanagari Extended" },
    ],
    numeralStyle: "both",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences:
      "Respect Hindu, Muslim, Sikh, and other religious traditions common in India",
    localCustoms: [
      "Family-oriented travel is common - include family-friendly options",
      "Vegetarian options are important - many travelers are vegetarian",
      "Respect for elders is paramount",
      "Festival dates can affect travel (Diwali, Holi, Eid)",
    ],
    avoidTopics: [
      "Beef prominently featured",
      "Religious comparisons or criticism",
      "Political commentary",
    ],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "₹X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | 2024 गाइड",
    metaKeywordPatterns: [
      "[destination] यात्रा गाइड",
      "[destination] में घूमने की जगहें",
      "[attraction] टिकट",
      "[destination] जाने का सबसे अच्छा समय",
    ],
    questionStarters: [
      "क्या है",
      "कैसे करें",
      "कब जाना चाहिए",
      "कहाँ मिलेगा",
      "कितना खर्च होगा",
      "क्या यह सही है",
    ],
    ctaPhrases: [
      "अभी बुक करें",
      "टिकट प्राप्त करें",
      "अपनी यात्रा की योजना बनाएं",
      "और जानें",
      "अन्वेषण शुरू करें",
    ],
  },

  quality: {
    purityThreshold: 0.98,
    minWordCount: 1500,
    maxWordCount: 2600,
    minFaqCount: 5,
    minAnswerCapsuleLength: 40,
  },

  writerPromptAdditions: `
═══════════════════════════════════════════════════════════════════════
## CRITICAL: HINDI LANGUAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

YOU MUST WRITE 100% IN HINDI (हिन्दी) using Devanagari script.
- All content MUST be in Devanagari script
- Use natural Hindi phrasing, not translated English syntax
- Write as a native Hindi speaker would write for Indian travelers
- Proper names (attraction names, place names) may remain in their original form or be transliterated to Hindi
- Numbers can use Western numerals
- Include family-friendly travel tips
- Mention vegetarian dining options where available
- Consider budget-conscious Indian travelers

DO NOT:
- Include any English text except proper nouns and widely-used English terms
- Use Hinglish (mixed Hindi-English) - keep content purely in Hindi
- Mix scripts within sentences

LOCALE: hi (Hindi)
DIRECTION: LTR (left-to-right)
`,

  version: "1.0.0",
};

export default hindiContext;
