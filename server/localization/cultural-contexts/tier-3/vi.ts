/**
 * Vietnamese Cultural Context
 * Tier 3 - Growing Market (Southeast Asia)
 */

import type { CulturalContext } from "../types";

export const vietnameseContext: CulturalContext = {
  locale: "vi",
  name: "Vietnamese",
  nativeName: "Tieng Viet",
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
      { start: 0x00c0, end: 0x00ff, name: "Latin Extended" },
      { start: 0x0102, end: 0x0103, name: "A breve" },
      { start: 0x0110, end: 0x0111, name: "D stroke" },
      { start: 0x01a0, end: 0x01b4, name: "Vietnamese vowels" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Respect Buddhist, Catholic, and traditional beliefs",
    localCustoms: [
      "Family values important",
      "Food and culinary experiences highly valued",
      "Growing middle class tourism",
      "Photography and social media important",
    ],
    avoidTopics: ["War history in negative light", "Political criticism"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "X.XXX.XXX VND",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Cam Nang 2024",
    metaKeywordPatterns: [
      "du lich [destination]",
      "dia diem du lich [destination]",
      "ve [attraction]",
      "thoi gian tot nhat di [destination]",
    ],
    questionStarters: ["La gi", "Lam sao de", "Khi nao nen", "O dau co", "Gia bao nhieu", "Co nen"],
    ctaPhrases: ["Dat ngay", "Mua ve", "Len ke hoach", "Tim hieu them", "Bat dau kham pha"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1200,
    maxWordCount: 2400,
    minFaqCount: 5,
    minAnswerCapsuleLength: 35,
  },

  writerPromptAdditions: `
## VIETNAMESE LANGUAGE REQUIREMENTS

Write 100% in Vietnamese (Tieng Viet) with proper diacritics.
- Use all Vietnamese tone marks and special characters
- Write for Vietnamese travelers
- Include food/culinary recommendations
- Consider growing middle-class tourism audience

LOCALE: vi (Vietnamese)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default vietnameseContext;
