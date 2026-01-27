/**
 * French Cultural Context
 * Tier 2 - High ROI Language
 */

import type { CulturalContext } from "../types";

export const frenchContext: CulturalContext = {
  locale: "fr",
  name: "French",
  nativeName: "Français",
  direction: "ltr",
  tier: 2,
  region: "Western Europe / Africa",

  writingStyle: {
    formality: "high",
    sentenceLength: "long",
    useHonorifics: true,
    paragraphStyle: "flowing",
    voicePreference: "mixed",
  },

  script: {
    unicodeRanges: [
      { start: 0x0041, end: 0x005a, name: "Latin uppercase" },
      { start: 0x0061, end: 0x007a, name: "Latin lowercase" },
      { start: 0x00c0, end: 0x00ff, name: "Latin Extended-A" },
      { start: 0x0152, end: 0x0153, name: "OE ligature" },
    ],
    numeralStyle: "western",
    allowedSecondaryScripts: [],
    punctuationStyle: "native",
  },

  sensitivities: {
    religiousReferences: "Secular approach; France values laicite",
    localCustoms: [
      "Cultural experiences and gastronomy are priorities",
      "Quality over quantity is valued",
      "Art, history, and architecture are popular interests",
      "Polite formality is expected in service interactions",
    ],
    avoidTopics: ["Stereotypes about French culture", "Political topics"],
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "X,XX EUR",
    measurementSystem: "metric",
  },

  seoPatterns: {
    titleSuffix: " | Guide 2024",
    metaKeywordPatterns: [
      "guide voyage [destination]",
      "que faire a [destination]",
      "billets [attraction]",
      "meilleure periode pour visiter [destination]",
    ],
    questionStarters: [
      "Qu'est-ce que",
      "Comment",
      "Quand visiter",
      "Ou trouver",
      "Combien coute",
      "Vaut-il la peine",
    ],
    ctaPhrases: [
      "Reserver maintenant",
      "Obtenir des billets",
      "Planifier votre visite",
      "En savoir plus",
      "Commencer a explorer",
    ],
  },

  quality: {
    purityThreshold: 0.97,
    minWordCount: 1500,
    maxWordCount: 2800,
    minFaqCount: 5,
    minAnswerCapsuleLength: 45,
  },

  writerPromptAdditions: `
═══════════════════════════════════════════════════════════════════════
## CRITICAL: FRENCH LANGUAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

YOU MUST WRITE 100% IN FRENCH (Français).
- All content MUST be in French with proper accents (e, a, u, i, c, oe, etc.)
- Use formal "vous" form when addressing readers
- Write in elegant, flowing prose appropriate for cultured French travelers
- Proper names may remain in their original form
- Use French punctuation (spaces before : ; ! ?)
- Emphasize cultural and gastronomic experiences
- Include practical information for French tourists

DO NOT:
- Include English text except proper nouns
- Use informal "tu" form
- Use Anglicisms when French alternatives exist
- Skip accents on letters (use e not e)

LOCALE: fr (French)
DIRECTION: LTR (left-to-right)
`,

  version: "1.0.0",
};

export default frenchContext;
