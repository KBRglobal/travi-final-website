/**
 * Query Processor
 *
 * Normalizes and processes search queries for better matching
 * Enhanced with stop word removal and advanced cleaning
 */

// Stop words by language
const STOP_WORDS: Record<string, Set<string>> = {
  en: new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "he",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "that",
    "the",
    "to",
    "was",
    "will",
    "with",
    "the",
    "this",
    "but",
    "they",
    "have",
    "had",
    "what",
    "when",
    "where",
    "who",
    "which",
    "why",
    "how",
  ]),
  ar: new Set([
    "في",
    "من",
    "إلى",
    "على",
    "هذا",
    "هذه",
    "ذلك",
    "التي",
    "الذي",
    "أن",
    "إن",
    "كان",
    "لم",
    "لن",
    "ما",
    "لا",
    "نعم",
  ]),
  he: new Set([
    // Hebrew stop words removed
  ]),
};

export interface ProcessedQuery {
  original: string;
  normalized: string;
  tokens: string[];
  language: string;
  cleaned: string;
}

export const queryProcessor = {
  /**
   * Process and normalize a search query
   */
  process(query: string, locale?: string): ProcessedQuery {
    const original = query.trim();

    // Basic normalization
    let normalized = original
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ") // Keep letters, numbers, spaces
      .replace(/\s+/g, " ")
      .trim();

    // Detect language
    const language = this.detectLanguage(original, locale);

    // Tokenize
    const tokens = normalized.split(" ").filter(t => t.length > 0);

    // Remove stop words for cleaned version
    const cleaned = this.removeStopWords(tokens, language).join(" ");

    return {
      original,
      normalized,
      tokens,
      language,
      cleaned: cleaned || normalized, // Fallback to normalized if all words removed
    };
  },

  /**
   * Remove stop words from tokens
   */
  removeStopWords(tokens: string[], language: string): string[] {
    const stopWords = STOP_WORDS[language] || STOP_WORDS.en;
    return tokens.filter(token => {
      // Keep tokens that are not stop words and longer than 2 chars
      return !stopWords.has(token.toLowerCase()) && token.length > 2;
    });
  },

  /**
   * Clean query by removing common patterns
   */
  cleanQuery(query: string): string {
    let cleaned = query.toLowerCase().trim();

    // Remove common search patterns
    cleaned = cleaned.replace(/\b(best|top|good|great|find|search|show|get)\s+/gi, "");
    cleaned = cleaned.replace(/\b(in|at|near)\s+dubai\b/gi, "dubai");
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned;
  },

  /**
   * Simple language detection
   */
  detectLanguage(text: string, locale?: string): string {
    if (locale) return locale;

    // Hebrew detection
    if (/[\u0590-\u05FF]/.test(text)) return "he";

    // Arabic detection
    if (/[\u0600-\u06FF]/.test(text)) return "ar";

    // Chinese detection
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh";

    // Russian detection
    if (/[\u0400-\u04FF]/.test(text)) return "ru";

    return "en";
  },

  /**
   * Normalize whitespace and special characters
   */
  normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  },

  /**
   * Get stop words for a language
   */
  getStopWords(language: string): Set<string> {
    return STOP_WORDS[language] || STOP_WORDS.en;
  },
};
