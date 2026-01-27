/**
 * Urdu Cultural Context
 * Tier 2 - High ROI Language
 */

import type { CulturalContext } from "../types";

export const urduContext: CulturalContext = {
  locale: "ur",
  name: "Urdu",
  nativeName: "اردو",
  direction: "rtl",
  tier: 2,
  region: "South Asia",

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
    numeralStyle: "both",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "mixed",
  },

  sensitivities: {
    religiousReferences:
      "Islamic traditions are important; include prayer times and mosque locations",
    localCustoms: [
      "Family travel is very common",
      "Halal food is essential",
      "Modest dress expectations",
      "Religious festivals affect travel patterns",
    ],
    avoidTopics: [
      "Pork and alcohol prominently featured",
      "Political India-Pakistan topics",
      "Religious criticism",
    ],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "Rs. X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | 2024 گائیڈ",
    metaKeywordPatterns: [
      "[destination] سیاحت گائیڈ",
      "[destination] میں گھومنے کی جگہیں",
      "[attraction] ٹکٹ",
      "[destination] جانے کا بہترین وقت",
    ],
    questionStarters: [
      "کیا ہے",
      "کیسے جائیں",
      "کب جانا چاہیے",
      "کہاں ملے گا",
      "کتنا خرچ ہوگا",
      "کیا یہ قابل دید ہے",
    ],
    ctaPhrases: [
      "ابھی بک کریں",
      "ٹکٹ حاصل کریں",
      "اپنا سفر پلان کریں",
      "مزید جانیں",
      "دریافت شروع کریں",
    ],
  },

  quality: {
    purityThreshold: 0.96,
    minWordCount: 1400,
    maxWordCount: 2600,
    minFaqCount: 5,
    minAnswerCapsuleLength: 40,
  },

  writerPromptAdditions: `
═══════════════════════════════════════════════════════════════════════
## CRITICAL: URDU LANGUAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

YOU MUST WRITE 100% IN URDU (اردو) using Nastaliq/Arabic script.
- All content MUST be in Urdu script
- Use natural Urdu phrasing with respectful tone (آپ form)
- Write for Pakistani and Indian Urdu-speaking travelers
- Proper names may remain in their original form
- Include family-friendly travel information
- Mention halal dining options
- Note prayer facilities where available
- RTL formatting is handled by the system

DO NOT:
- Include English text except proper nouns
- Use Roman Urdu - keep content in Nastaliq script
- Ignore Islamic considerations for travelers

LOCALE: ur (Urdu)
DIRECTION: RTL (right-to-left)
`,

  version: "1.0.0",
};

export default urduContext;
