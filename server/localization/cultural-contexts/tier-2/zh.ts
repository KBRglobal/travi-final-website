/**
 * Chinese (Simplified) Cultural Context
 * Tier 2 - High ROI Language
 */

import type { CulturalContext } from "../types";

export const chineseContext: CulturalContext = {
  locale: "zh",
  name: "Chinese (Simplified)",
  nativeName: "中文",
  direction: "ltr",
  tier: 2,
  region: "East Asia",

  writingStyle: {
    formality: "medium",
    sentenceLength: "short",
    useHonorifics: false,
    paragraphStyle: "concise",
    voicePreference: "active",
  },

  script: {
    unicodeRanges: [
      { start: 0x4e00, end: 0x9fff, name: "CJK Unified Ideographs" },
      { start: 0x3400, end: 0x4dbf, name: "CJK Extension A" },
      { start: 0x3000, end: 0x303f, name: "CJK Punctuation" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "native",
  },

  sensitivities: {
    religiousReferences: "Neutral approach; Chinese travelers may have diverse beliefs",
    localCustoms: [
      "Shopping and luxury brand access are often priorities",
      "Group travel is common - mention group-friendly options",
      "Photography spots are highly valued",
      "Mention WeChat Pay / Alipay acceptance where available",
    ],
    avoidTopics: [
      "Political topics related to China",
      "Taiwan and Tibet sensitive topics",
      "Criticism of Chinese customs",
    ],
    dateFormat: "YYYY年MM月DD日",
    currencyFormat: "¥X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | 2024攻略",
    metaKeywordPatterns: [
      "[destination]旅游攻略",
      "[destination]必去景点",
      "[attraction]门票",
      "[destination]最佳旅游时间",
    ],
    questionStarters: ["什么是", "如何", "什么时候去最好", "在哪里可以", "多少钱", "值得去吗"],
    ctaPhrases: ["立即预订", "获取门票", "规划行程", "了解更多", "开始探索"],
  },

  quality: {
    purityThreshold: 0.97,
    minWordCount: 1200,
    maxWordCount: 2400,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
═══════════════════════════════════════════════════════════════════════
## CRITICAL: CHINESE LANGUAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

YOU MUST WRITE 100% IN SIMPLIFIED CHINESE (简体中文).
- All content MUST be in Chinese characters
- Use natural Chinese phrasing appropriate for mainland Chinese travelers
- Write concisely - Chinese readers prefer information-dense content
- Proper names may remain in their original form with Chinese transliteration in parentheses
- Use Chinese punctuation (。，！？)
- Mention photo opportunities (打卡点)
- Include shopping-related information where relevant
- Note mobile payment acceptance (支付宝/微信支付)

DO NOT:
- Include English text except proper nouns
- Use Traditional Chinese characters
- Use long-winded sentences

LOCALE: zh (Simplified Chinese)
DIRECTION: LTR (left-to-right)
`,

  version: "1.0.0",
};

export default chineseContext;
