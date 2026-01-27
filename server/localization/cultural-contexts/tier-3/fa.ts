/**
 * Persian (Farsi) Cultural Context
 * Tier 3 - Growing Market
 */

import type { CulturalContext } from "../types";

export const persianContext: CulturalContext = {
  locale: "fa",
  name: "Persian",
  nativeName: "فارسی",
  direction: "rtl",
  tier: 3,
  region: "Middle East / Central Asia",

  writingStyle: {
    formality: "high",
    sentenceLength: "long",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0600, end: 0x06ff, name: "Arabic" },
      { start: 0x0750, end: 0x077f, name: "Arabic Supplement" },
      { start: 0xfb50, end: 0xfdff, name: "Arabic Presentation Forms-A" },
      { start: 0xfe70, end: 0xfeff, name: "Arabic Presentation Forms-B" },
    ],
    numeralStyle: "native",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "native",
  },

  sensitivities: {
    religiousReferences: "Respect Islamic traditions; many Iranian travelers are observant",
    localCustoms: [
      "Family-oriented travel",
      "Halal food requirements",
      "Modest dress in many contexts",
      "Persian hospitality values",
    ],
    avoidTopics: ["Political topics about Iran", "Sanctions-related topics", "Religious criticism"],
    dateFormat: "YYYY/MM/DD",
    currencyFormat: "X,XXX تومان",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | راهنمای ۲۰۲۴",
    metaKeywordPatterns: [
      "راهنمای سفر [destination]",
      "جاهای دیدنی [destination]",
      "بلیط [attraction]",
      "بهترین زمان سفر به [destination]",
    ],
    questionStarters: [
      "چیست",
      "چگونه",
      "چه زمانی بهتر است",
      "کجا می‌توانم",
      "چقدر هزینه دارد",
      "آیا ارزش دارد",
    ],
    ctaPhrases: [
      "همین الان رزرو کنید",
      "بلیط بگیرید",
      "سفرتان را برنامه‌ریزی کنید",
      "بیشتر بدانید",
      "کاوش را شروع کنید",
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
## PERSIAN LANGUAGE REQUIREMENTS

Write 100% in Persian (فارسی) using Persian script.
- Use formal respectful tone
- Write for Iranian travelers
- Include halal dining options
- Use Persian numerals where appropriate
- RTL formatting handled by system

LOCALE: fa (Persian)
DIRECTION: RTL
`,

  version: "1.0.0",
};

export default persianContext;
