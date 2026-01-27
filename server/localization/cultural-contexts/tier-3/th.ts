/**
 * Thai Cultural Context
 * Tier 3 - Growing Market (Southeast Asia)
 */

import type { CulturalContext } from "../types";

export const thaiContext: CulturalContext = {
  locale: "th",
  name: "Thai",
  nativeName: "ไทย",
  direction: "ltr",
  tier: 3,
  region: "Southeast Asia",

  writingStyle: {
    formality: "high",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [{ start: 0x0e00, end: 0x0e7f, name: "Thai" }],
    numeralStyle: "both",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "mixed",
  },

  sensitivities: {
    religiousReferences: "Buddhist traditions important; respect for monarchy",
    localCustoms: [
      "Respect for monarchy and religious sites",
      "Temple etiquette",
      "Social hierarchy and politeness",
      "Photography at temples requires respect",
    ],
    avoidTopics: ["Criticism of monarchy", "Political topics", "Disrespect to Buddhism"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "฿X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | ไกด์ 2024",
    metaKeywordPatterns: [
      "คู่มือเที่ยว [destination]",
      "ที่เที่ยว [destination]",
      "ตั๋ว [attraction]",
      "ช่วงเวลาที่ดีที่สุดในการไป [destination]",
    ],
    questionStarters: [
      "อะไรคือ",
      "จะไปยังไง",
      "ช่วงไหนดีที่สุด",
      "หาได้ที่ไหน",
      "ราคาเท่าไหร่",
      "คุ้มไหม",
    ],
    ctaPhrases: ["จองเลย", "ซื้อตั๋ว", "วางแผนทริป", "ดูเพิ่มเติม", "เริ่มสำรวจ"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1200,
    maxWordCount: 2400,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## THAI LANGUAGE REQUIREMENTS

Write 100% in Thai (ไทย) using Thai script.
- Use polite particles (ครับ/ค่ะ) appropriately
- Write respectfully, especially about religious sites
- Include temple etiquette tips where relevant
- Thai script has no spaces between words - system handles formatting

LOCALE: th (Thai)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default thaiContext;
