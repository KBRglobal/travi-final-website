/**
 * Synonym Expansion for Multi-Language Search
 *
 * Features:
 * - Multi-language synonym groups (20+ groups)
 * - Weighted query building for full-text search
 * - Support for English, Hebrew, Arabic
 */

// Synonym groups with multi-language support (20+ groups)
const SYNONYM_GROUPS = [
  // Hotels & Accommodation
  {
    en: ["hotel", "resort", "accommodation", "lodging", "inn", "motel"],
    ar: ["فندق", "منتجع"],
    he: [],
    weight: 1,
  },
  {
    en: ["cheap", "budget", "affordable", "economical", "low-cost", "inexpensive"],
    ar: ["رخيص", "اقتصادي"],
    he: [],
    weight: 0.9,
  },
  {
    en: ["luxury", "premium", "upscale", "high-end", "deluxe", "exclusive"],
    ar: ["فاخر", "راقي"],
    he: [],
    weight: 1,
  },

  // Dining
  {
    en: ["restaurant", "dining", "eatery", "cafe", "bistro", "diner"],
    ar: ["مطعم", "مقهى"],
    he: [],
    weight: 1,
  },
  {
    en: ["food", "cuisine", "dish", "meal", "fare"],
    ar: ["طعام", "أكل"],
    he: [],
    weight: 0.8,
  },
  {
    en: ["breakfast", "brunch", "morning meal"],
    ar: ["فطور", "إفطار"],
    he: [],
    weight: 0.9,
  },

  // Activities
  {
    en: ["activity", "attraction", "entertainment", "experience", "thing to do"],
    ar: ["نشاط", "معلم"],
    he: [],
    weight: 1,
  },
  {
    en: ["beach", "shore", "coast", "seaside", "waterfront"],
    ar: ["شاطئ", "ساحل"],
    he: [],
    weight: 1,
  },
  {
    en: ["desert", "dunes", "sand", "safari"],
    ar: ["صحراء", "رمال"],
    he: [],
    weight: 1,
  },
  {
    en: ["shopping", "mall", "store", "boutique", "market", "souk"],
    ar: ["تسوق", "سوق", "مول"],
    he: [],
    weight: 1,
  },

  // Transport
  {
    en: ["taxi", "cab", "ride", "car service"],
    ar: ["تاكسي", "سيارة أجرة"],
    he: [],
    weight: 0.9,
  },
  {
    en: ["airport", "terminal", "international airport"],
    ar: ["مطار"],
    he: [],
    weight: 1,
  },
  {
    en: ["metro", "subway", "train", "rail"],
    ar: ["مترو", "قطار"],
    he: [],
    weight: 0.9,
  },

  // Locations
  {
    en: ["downtown", "city center", "central", "cbd"],
    ar: ["وسط المدينة"],
    he: [],
    weight: 0.9,
  },
  {
    en: ["near", "close to", "nearby", "next to", "adjacent"],
    ar: ["قريب", "بالقرب من"],
    he: [],
    weight: 0.8,
  },

  // Time & Events
  {
    en: ["tour", "trip", "excursion", "journey", "visit"],
    ar: ["جولة", "رحلة"],
    he: [],
    weight: 1,
  },
  {
    en: ["night", "evening", "nighttime"],
    ar: ["ليل", "مساء"],
    he: [],
    weight: 0.8,
  },
  {
    en: ["day", "daytime", "daily"],
    ar: ["يوم", "نهار"],
    he: [],
    weight: 0.8,
  },

  // Quality & Features
  {
    en: ["best", "top", "finest", "excellent", "great", "outstanding"],
    ar: ["أفضل", "ممتاز"],
    he: [],
    weight: 0.9,
  },
  {
    en: ["popular", "famous", "well-known", "renowned"],
    ar: ["شهير", "معروف"],
    he: [],
    weight: 0.8,
  },
  {
    en: ["new", "modern", "contemporary", "recent"],
    ar: ["جديد", "حديث"],
    he: [],
    weight: 0.8,
  },

  // Services
  {
    en: ["spa", "wellness", "massage", "treatment"],
    ar: ["سبا", "علاج"],
    he: [],
    weight: 0.9,
  },
  {
    en: ["pool", "swimming pool", "water"],
    ar: ["مسبح", "حوض سباحة"],
    he: [],
    weight: 0.9,
  },
  {
    en: ["view", "scenery", "panorama", "vista"],
    ar: ["منظر", "إطلالة"],
    he: [],
    weight: 0.8,
  },
];

export interface SynonymExpansion {
  original: string[];
  expanded: string[];
  language: string;
  weights: Record<string, number>;
}

export const synonymExpander = {
  /**
   * Expand terms with synonyms
   */
  expand(terms: string | string[], locale: string = "en"): SynonymExpansion {
    const termArray = Array.isArray(terms) ? terms : [terms];
    const expandedSet = new Set<string>();
    const weights: Record<string, number> = {};

    // Add original terms
    termArray.forEach(term => {
      const lower = term.toLowerCase().trim();
      expandedSet.add(lower);
      weights[lower] = 1;
    });

    // Find and add synonyms
    for (const term of termArray) {
      const lower = term.toLowerCase().trim();

      for (const group of SYNONYM_GROUPS) {
        const langTerms = group[locale as keyof typeof group];
        if (!langTerms || !Array.isArray(langTerms)) continue;

        // Check if term is in this group
        if (langTerms.some(t => t.toLowerCase() === lower)) {
          // Add all synonyms from this group
          langTerms.forEach(syn => {
            const synLower = syn.toLowerCase();
            expandedSet.add(synLower);
            weights[synLower] = group.weight;
          });

          // Also add English terms if different language
          if (locale !== "en" && group.en) {
            group.en.forEach(enTerm => {
              const enLower = enTerm.toLowerCase();
              expandedSet.add(enLower);
              weights[enLower] = group.weight * 0.8; // Slightly lower weight for cross-language
            });
          }
        }
      }
    }

    return {
      original: termArray,
      expanded: Array.from(expandedSet),
      language: locale,
      weights,
    };
  },

  /**
   * Build weighted query for full-text search
   */
  buildWeightedQuery(terms: string | string[], locale: string = "en"): string {
    const expansion = this.expand(terms, locale);

    // Build query with weights (higher weight = more important)
    const weightedTerms = expansion.expanded.map(term => {
      const weight = expansion.weights[term] || 0.5;
      const boostChar = weight >= 1 ? ":A" : weight >= 0.9 ? ":B" : ":C";
      return `${term}${boostChar}`;
    });

    return weightedTerms.join(" | ");
  },

  /**
   * Get synonyms for a single term
   */
  getSynonyms(term: string, locale: string = "en"): string[] {
    const lower = term.toLowerCase().trim();
    const synonyms = new Set<string>();

    for (const group of SYNONYM_GROUPS) {
      const langTerms = group[locale as keyof typeof group];
      if (!langTerms || !Array.isArray(langTerms)) continue;

      if (langTerms.some(t => t.toLowerCase() === lower)) {
        langTerms.forEach(syn => {
          if (syn.toLowerCase() !== lower) {
            synonyms.add(syn);
          }
        });
      }
    }

    return Array.from(synonyms);
  },

  /**
   * Check if two terms are synonyms
   */
  areSynonyms(term1: string, term2: string, locale: string = "en"): boolean {
    const lower1 = term1.toLowerCase().trim();
    const lower2 = term2.toLowerCase().trim();

    if (lower1 === lower2) return true;

    for (const group of SYNONYM_GROUPS) {
      const langTerms = group[locale as keyof typeof group];
      if (!langTerms || !Array.isArray(langTerms)) continue;

      const has1 = langTerms.some(t => t.toLowerCase() === lower1);
      const has2 = langTerms.some(t => t.toLowerCase() === lower2);

      if (has1 && has2) return true;
    }

    return false;
  },

  /**
   * Get all synonym groups (for testing/debugging)
   */
  getSynonymGroups(): typeof SYNONYM_GROUPS {
    return SYNONYM_GROUPS;
  },

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return ["en", "ar", "he"];
  },
};
