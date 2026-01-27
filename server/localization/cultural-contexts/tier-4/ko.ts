/**
 * Korean Cultural Context
 * Tier 4 - Niche Market
 */

import type { CulturalContext } from "../types";

export const koreanContext: CulturalContext = {
  locale: "ko",
  name: "Korean",
  nativeName: "한국어",
  direction: "ltr",
  tier: 4,
  region: "East Asia",

  writingStyle: {
    formality: "high",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "structured",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0xac00, end: 0xd7af, name: "Hangul Syllables" },
      { start: 0x1100, end: 0x11ff, name: "Hangul Jamo" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Diverse - Buddhist, Christian, secular",
    localCustoms: [
      "K-culture influences travel",
      "Social media and photography important",
      "Group travel common",
      "Food and shopping priorities",
    ],
    avoidTopics: ["North Korea politics", "Japan colonial history"],
    dateFormat: "YYYY년 MM월 DD일",
    currencyFormat: "₩X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | 2024 가이드",
    metaKeywordPatterns: [
      "[destination] 여행 가이드",
      "[destination] 관광지",
      "[attraction] 티켓",
      "[destination] 여행 최적기",
    ],
    questionStarters: [
      "무엇인가요",
      "어떻게 가나요",
      "언제가 좋나요",
      "어디서 찾나요",
      "얼마인가요",
      "가볼 만한가요",
    ],
    ctaPhrases: ["지금 예약", "티켓 구매", "여행 계획", "자세히 보기", "탐험 시작"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## KOREAN LANGUAGE REQUIREMENTS

Write 100% in Korean (한국어) using Hangul.
- Use formal polite speech (합쇼체)
- Write for South Korean travelers
- Include photo-worthy spots
- Note K-pop/K-drama connections where relevant

LOCALE: ko (Korean)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default koreanContext;
