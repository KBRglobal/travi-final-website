/**
 * Japanese Cultural Context
 * Tier 4 - Niche Market
 */

import type { CulturalContext } from "../types";

export const japaneseContext: CulturalContext = {
  locale: "ja",
  name: "Japanese",
  nativeName: "日本語",
  direction: "ltr",
  tier: 4,
  region: "East Asia",

  writingStyle: {
    formality: "high",
    sentenceLength: "short",
    useHonorifics: true,
    paragraphStyle: "structured",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x3040, end: 0x309f, name: "Hiragana" },
      { start: 0x30a0, end: 0x30ff, name: "Katakana" },
      { start: 0x4e00, end: 0x9fff, name: "Kanji" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "native",
  },

  sensitivities: {
    religiousReferences: "Shinto and Buddhist traditions; respectful approach",
    localCustoms: [
      "Punctuality essential",
      "Cleanliness highly valued",
      "Quiet, respectful behavior",
      "Gift-giving culture",
    ],
    avoidTopics: ["WWII in negative context", "Criticism of customs"],
    dateFormat: "YYYY年MM月DD日",
    currencyFormat: "¥X,XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | 2024年ガイド",
    metaKeywordPatterns: [
      "[destination]旅行ガイド",
      "[destination]観光スポット",
      "[attraction]チケット",
      "[destination]ベストシーズン",
    ],
    questionStarters: [
      "何ですか",
      "どうやって行く",
      "いつがベスト",
      "どこで見つける",
      "いくら",
      "価値がある",
    ],
    ctaPhrases: ["今すぐ予約", "チケットを取得", "旅行を計画", "詳細を見る", "探検を始める"],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## JAPANESE LANGUAGE REQUIREMENTS

Write 100% in Japanese (日本語) using appropriate mix of Hiragana, Katakana, and Kanji.
- Use polite desu/masu form
- Write concisely (Japanese prefers information density)
- Use Japanese punctuation (。、)
- Foreign words in Katakana

LOCALE: ja (Japanese)
DIRECTION: LTR
`,

  version: "1.0.0",
};

export default japaneseContext;
