/**
 * Arabic Cultural Context
 * Tier 1 - Core Language
 */

import type { CulturalContext } from "../types";

export const arabicContext: CulturalContext = {
  locale: "ar",
  name: "Arabic",
  nativeName: "العربية",
  direction: "rtl",
  tier: 1,
  region: "Middle East",

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
      { start: 0x08a0, end: 0x08ff, name: "Arabic Extended-A" },
      { start: 0xfb50, end: 0xfdff, name: "Arabic Presentation Forms-A" },
      { start: 0xfe70, end: 0xfeff, name: "Arabic Presentation Forms-B" },
    ],
    numeralStyle: "both",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "native",
  },

  sensitivities: {
    religiousReferences: "Respect Islamic traditions; include relevant mosque visiting etiquette",
    localCustoms: [
      "Dress code expectations (modest dress, especially at religious sites)",
      "Ramadan considerations for visiting times and restaurant availability",
      "Gender-specific areas in some locations",
      "Friday is the holy day - some places may have reduced hours",
    ],
    avoidTopics: [
      "Alcohol prominently featured",
      "Pork products",
      "Political commentary on regional conflicts",
      "Criticism of religious practices",
    ],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "AED X.XX درهم",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | دليل 2024",
    metaKeywordPatterns: [
      "السياحة في [destination]",
      "أماكن سياحية في [destination]",
      "تذاكر [attraction]",
      "أفضل وقت لزيارة [destination]",
    ],
    questionStarters: ["ما هو", "كيف يمكن", "متى أفضل وقت", "أين يمكنني", "كم تكلفة", "هل يستحق"],
    ctaPhrases: ["احجز الآن", "احصل على التذاكر", "خطط لزيارتك", "اكتشف المزيد", "ابدأ الاستكشاف"],
  },

  quality: {
    purityThreshold: 0.98,
    minWordCount: 1600,
    maxWordCount: 2800,
    minFaqCount: 5,
    minAnswerCapsuleLength: 40,
  },

  writerPromptAdditions: `
═══════════════════════════════════════════════════════════════════════
## CRITICAL: ARABIC LANGUAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

YOU MUST WRITE 100% IN MODERN STANDARD ARABIC (فصحى).
- All content MUST be in Arabic script
- Use natural Arabic phrasing, not translated English syntax
- Write as a native Arabic speaker would write
- Proper names (attraction names, place names) may remain in their original form or be transliterated to Arabic
- Numbers and measurements can use Western numerals with Arabic labels
- RTL formatting is handled by the system - just write the text
- Include prayer room locations where relevant
- Note Ramadan-specific considerations
- Mention halal dining options

DO NOT:
- Include any English text except proper nouns
- Use awkward translated phrases
- Mix languages within sentences

LOCALE: ar (Arabic)
DIRECTION: RTL (right-to-left)
`,

  version: "1.0.0",
};

export default arabicContext;
