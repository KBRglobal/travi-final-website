/**
 * Indonesian Cultural Context
 * Tier 2 - High ROI Language
 */

import type { CulturalContext } from "../types";

export const indonesianContext: CulturalContext = {
  locale: "id",
  name: "Indonesian",
  nativeName: "Bahasa Indonesia",
  direction: "ltr",
  tier: 2,
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
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences:
      "Respect diverse religions; Indonesia is majority Muslim but multicultural",
    localCustoms: [
      "Family travel is very common",
      "Halal food options are important for many travelers",
      "Budget-conscious travel is common",
      "Social media and photography are highly valued",
    ],
    avoidTopics: ["Religious criticism", "Political topics", "Sensitive historical events"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "Rp X.XXX.XXX",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Panduan 2024",
    metaKeywordPatterns: [
      "panduan wisata [destination]",
      "tempat wisata di [destination]",
      "tiket [attraction]",
      "waktu terbaik mengunjungi [destination]",
    ],
    questionStarters: [
      "Apa itu",
      "Bagaimana cara",
      "Kapan waktu terbaik",
      "Di mana bisa",
      "Berapa harga",
      "Apakah layak",
    ],
    ctaPhrases: [
      "Pesan sekarang",
      "Dapatkan tiket",
      "Rencanakan perjalanan Anda",
      "Pelajari lebih lanjut",
      "Mulai menjelajah",
    ],
  },

  quality: {
    purityThreshold: 0.97,
    minWordCount: 1300,
    maxWordCount: 2500,
    minFaqCount: 5,
    minAnswerCapsuleLength: 40,
  },

  writerPromptAdditions: `
═══════════════════════════════════════════════════════════════════════
## CRITICAL: INDONESIAN LANGUAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

YOU MUST WRITE 100% IN INDONESIAN (Bahasa Indonesia).
- All content MUST be in proper Indonesian
- Use formal Indonesian appropriate for travel content
- Write for Indonesian travelers with practical budget considerations
- Proper names may remain in their original form
- Include family-friendly travel tips
- Mention halal dining options where available
- Note prayer facilities where relevant
- Include Instagram-worthy photo spots

DO NOT:
- Include English text except proper nouns and widely-used loan words
- Use informal slang (bahasa gaul)
- Ignore budget considerations

LOCALE: id (Indonesian)
DIRECTION: LTR (left-to-right)
`,

  version: "1.0.0",
};

export default indonesianContext;
