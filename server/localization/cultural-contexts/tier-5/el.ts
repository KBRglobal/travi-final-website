/**
 * Greek Cultural Context
 * Tier 5 - European Expansion
 */

import type { CulturalContext } from "../types";

export const greekContext: CulturalContext = {
  locale: "el",
  name: "Greek",
  nativeName: "Ελληνικά",
  direction: "ltr",
  tier: 5,
  region: "Southern Europe",

  writingStyle: {
    formality: "medium",
    sentenceLength: "medium",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0370, end: 0x03ff, name: "Greek" },
      { start: 0x1f00, end: 0x1fff, name: "Greek Extended" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: ["latin"],
    punctuationStyle: "western",
  },

  sensitivities: {
    religiousReferences: "Greek Orthodox traditions important",
    localCustoms: ["Hospitality (philoxenia)", "Family values", "Food culture", "Siesta hours"],
    avoidTopics: ["Cyprus dispute", "Macedonia naming"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "X,XX EUR",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Οδηγός 2024",
    metaKeywordPatterns: [
      "ταξιδιωτικός οδηγός [destination]",
      "αξιοθέατα [destination]",
      "εισιτήρια [attraction]",
      "καλύτερη εποχή [destination]",
    ],
    questionStarters: [
      "Τι είναι",
      "Πώς πάω",
      "Πότε να πάω",
      "Πού βρίσκω",
      "Πόσο κοστίζει",
      "Αξίζει",
    ],
    ctaPhrases: [
      "Κράτηση τώρα",
      "Αγορά εισιτηρίων",
      "Σχεδίασε το ταξίδι",
      "Μάθε περισσότερα",
      "Εξερεύνησε",
    ],
  },

  quality: {
    purityThreshold: 0.95,
    minWordCount: 1000,
    maxWordCount: 2200,
    minFaqCount: 5,
    minAnswerCapsuleLength: 30,
  },

  writerPromptAdditions: `
## GREEK LANGUAGE REQUIREMENTS
Write 100% in Greek (Ελληνικά) using Greek script with proper accents.
Use formal plural "εσείς" when addressing readers.
LOCALE: el (Greek) | DIRECTION: LTR
`,

  version: "1.0.0",
};

export default greekContext;
