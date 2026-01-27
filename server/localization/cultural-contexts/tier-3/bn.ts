/**
 * Bengali Cultural Context
 * Tier 3 - Growing Market
 */

import type { CulturalContext } from "../types";

export const bengaliContext: CulturalContext = {
  locale: "bn",
  name: "Bengali",
  nativeName: "বাংলা",
  direction: "ltr",
  tier: 3,
  region: "South Asia",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [{ start: 0x0980, end: 0x09ff, name: "Bengali" }],
    numeralStyle: "both",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Respect both Hindu and Muslim traditions (Bangladesh/West Bengal)",
    localCustoms: [
      "Family travel is common",
      "Food and culinary experiences valued",
      "Cultural/literary interests (Tagore heritage)",
      "Budget-conscious travel",
    ],
    avoidTopics: ["Communal tensions", "Political topics"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "৳X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | ২০২৪ গাইড",
    metaKeywordPatterns: [
      "[destination] ভ্রমণ গাইড",
      "[destination]-এ দেখার জায়গা",
      "[attraction] টিকেট",
      "[destination] যাওয়ার সেরা সময়",
    ],
    questionStarters: [
      "কী",
      "কীভাবে",
      "কখন যাওয়া ভালো",
      "কোথায় পাওয়া যায়",
      "খরচ কত",
      "যাওয়া কি উচিত",
    ],
    ctaPhrases: [
      "এখনই বুক করুন",
      "টিকেট নিন",
      "আপনার ভ্রমণ পরিকল্পনা করুন",
      "আরও জানুন",
      "অন্বেষণ শুরু করুন",
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
## BENGALI LANGUAGE REQUIREMENTS

Write 100% in Bengali (বাংলা) using Bengali script.
- Use respectful tone (আপনি form)
- Write for Bengali speakers from Bangladesh and West Bengal
- Include family-friendly options
- Consider budget-conscious travelers

LOCALE: bn (Bengali)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default bengaliContext;
