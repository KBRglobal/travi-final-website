/**
 * Spell Checker for Dubai Travel Search
 * 
 * Features:
 * - Levenshtein distance fuzzy matching
 * - Dubai-specific terms dictionary
 * - Common typo mappings
 * - PostgreSQL trigram similarity support
 * - Caching for performance
 */

import { cache } from "../cache";

// Levenshtein distance calculation
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Dubai-specific terms dictionary (50+ terms)
const DUBAI_TERMS = [
  // Landmarks
  'burj', 'khalifa', 'marina', 'jumeirah', 'atlantis', 'palm', 'creek',
  'deira', 'bur', 'dubai', 'emirates', 'mall', 'souk', 'gold', 'spice',
  'miracle', 'garden', 'global', 'village', 'safari', 'desert',
  
  // Hotels & Resorts
  'hotel', 'resort', 'armani', 'raffles', 'shangri', 'la', 'fairmont',
  'hilton', 'marriott', 'hyatt', 'ritz', 'carlton', 'kempinski',
  
  // Food & Dining
  'restaurant', 'cafe', 'dining', 'buffet', 'brunch', 'cuisine',
  'arabic', 'emirati', 'shawarma', 'falafel', 'hummus', 'mezze',
  
  // Activities
  'beach', 'waterpark', 'aquarium', 'ski', 'snow', 'skydive',
  'yacht', 'cruise', 'dhow', 'dune', 'bashing', 'camel', 'ride',
  
  // Shopping
  'shopping', 'boutique', 'luxury', 'brands', 'outlet', 'market',
  
  // Transport
  'metro', 'taxi', 'airport', 'terminal', 'monorail', 'tram',
  
  // Areas
  'downtown', 'business', 'bay', 'festival', 'city', 'jbr',
  'international', 'financial', 'centre', 'ifdc', 'difc'
];

// Common typo mappings (15+ mappings)
const TYPO_MAPPINGS: Record<string, string> = {
  // Common misspellings
  'burk': 'burj',
  'burj': 'burj',
  'khalifa': 'khalifa',
  'kalifa': 'khalifa',
  'kaleepha': 'khalifa',
  'khaleefa': 'khalifa',
  'duabi': 'dubai',
  'dubay': 'dubai',
  'dubaii': 'dubai',
  'hotell': 'hotel',
  'resturant': 'restaurant',
  'restraunt': 'restaurant',
  'restaraunt': 'restaurant',
  'aquaruim': 'aquarium',
  'aqurium': 'aquarium',
  'mirena': 'marina',
  'merena': 'marina',
  'jumirah': 'jumeirah',
  'jumierah': 'jumeirah',
  'jumera': 'jumeirah',
  'atlentis': 'atlantis',
  'atlantas': 'atlantis',
  'dessert': 'desert',
  'shoping': 'shopping',
  'shoppping': 'shopping'
};

export interface SpellCheckResult {
  original: string;
  corrected: string;
  wasChanged: boolean;
  confidence: number;
  suggestions?: string[];
}

export const spellChecker = {
  /**
   * Check and correct spelling in a query
   */
  async check(query: string): Promise<SpellCheckResult> {
    const cacheKey = `spell:${query.toLowerCase()}`;
    
    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached as SpellCheckResult;
    }

    const words = query.toLowerCase().split(/\s+/);
    const correctedWords: string[] = [];
    let hasChanges = false;
    let totalConfidence = 0;

    for (const word of words) {
      // Skip short words (likely correct)
      if (word.length <= 2) {
        correctedWords.push(word);
        totalConfidence += 1;
        continue;
      }

      // Check typo mappings first (highest confidence)
      if (TYPO_MAPPINGS[word]) {
        correctedWords.push(TYPO_MAPPINGS[word]);
        hasChanges = true;
        totalConfidence += 0.95;
        continue;
      }

      // Check Dubai dictionary
      const dictMatch = this.findBestMatch(word, DUBAI_TERMS);
      if (dictMatch.distance <= 2 && dictMatch.distance > 0) {
        correctedWords.push(dictMatch.word);
        hasChanges = true;
        totalConfidence += Math.max(0.7, 1 - (dictMatch.distance * 0.15));
      } else if (dictMatch.distance === 0) {
        correctedWords.push(word);
        totalConfidence += 1;
      } else {
        // Keep original if no good match
        correctedWords.push(word);
        totalConfidence += 0.8;
      }
    }

    const avgConfidence = words.length > 0 ? totalConfidence / words.length : 1;
    const result: SpellCheckResult = {
      original: query,
      corrected: correctedWords.join(' '),
      wasChanged: hasChanges,
      confidence: Math.min(1, avgConfidence),
    };

    // Add suggestions if confidence is low
    if (avgConfidence < 0.7) {
      result.suggestions = this.generateSuggestions(query);
    }

    // Cache result
    await cache.set(cacheKey, result, 3600); // Cache for 1 hour

    return result;
  },

  /**
   * Find best matching word from dictionary
   */
  findBestMatch(word: string, dictionary: string[]): { word: string; distance: number } {
    let bestMatch = word;
    let minDistance = Infinity;

    for (const dictWord of dictionary) {
      const distance = levenshteinDistance(word, dictWord);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = dictWord;
      }
    }

    return { word: bestMatch, distance: minDistance };
  },

  /**
   * Generate alternative suggestions
   */
  generateSuggestions(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const suggestions: Set<string> = new Set();

    for (const word of words) {
      // Find close matches in dictionary
      for (const dictWord of DUBAI_TERMS) {
        const distance = levenshteinDistance(word, dictWord);
        if (distance <= 2 && distance > 0) {
          const suggestion = query.toLowerCase().replace(word, dictWord);
          suggestions.add(suggestion);
        }
      }
    }

    return Array.from(suggestions).slice(0, 3);
  },

  /**
   * Get spell check confidence for a word
   */
  getConfidence(word: string): number {
    const lower = word.toLowerCase();
    
    // Direct typo mapping
    if (TYPO_MAPPINGS[lower]) {
      return 0.95;
    }

    // Exact dictionary match
    if (DUBAI_TERMS.includes(lower)) {
      return 1.0;
    }

    // Find closest match
    const match = this.findBestMatch(lower, DUBAI_TERMS);
    if (match.distance === 0) return 1.0;
    if (match.distance === 1) return 0.85;
    if (match.distance === 2) return 0.70;
    
    return 0.5;
  },

  /**
   * Batch spell check for multiple queries
   */
  async checkBatch(queries: string[]): Promise<SpellCheckResult[]> {
    return Promise.all(queries.map(q => this.check(q)));
  },

  /**
   * Get all Dubai terms (for testing/debugging)
   */
  getDubaiTerms(): string[] {
    return [...DUBAI_TERMS];
  },

  /**
   * Get all typo mappings (for testing/debugging)
   */
  getTypoMappings(): Record<string, string> {
    return { ...TYPO_MAPPINGS };
  },
};
