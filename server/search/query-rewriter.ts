/**
 * Query Rewriter
 *
 * Combines spell checking, synonym expansion, and pattern handling
 * into a unified query rewriting pipeline
 */

import { spellChecker } from "./spell-checker";
import { synonymExpander } from "./synonyms";
import { queryProcessor } from "./query-processor";

/**
 * Escape special regex characters to prevent ReDoS when building RegExp from user input
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface QueryRewriteResult {
  original: string;
  rewritten: string;
  expanded: string[];
  transformations: Transformation[];
  suggestions: string[];
  confidence: number;
  locale: string;
}

export interface Transformation {
  type: "spell" | "pattern" | "synonym" | "stopword";
  from: string;
  to: string;
  confidence: number;
}

// Common query patterns to handle
// NOTE: Patterns use (\S(?:.*\S)?) instead of (.+) or (.+?) to prevent ReDoS attacks
// This ensures capture groups start and end with non-whitespace, preventing catastrophic backtracking
const QUERY_PATTERNS = [
  {
    pattern: /^best\s+(\S(?:.*\S)?)\s+in\s+dubai$/i,
    transform: (match: RegExpMatchArray) => match[1],
    type: "pattern" as const,
    description: 'Remove "best X in dubai" wrapper',
  },
  {
    pattern: /^top\s+(\S(?:.*\S)?)\s+in\s+dubai$/i,
    transform: (match: RegExpMatchArray) => match[1],
    type: "pattern" as const,
    description: 'Remove "top X in dubai" wrapper',
  },
  {
    pattern: /^(\S(?:.*\S)?)\s+near\s+(\S(?:.*\S)?)$/i,
    transform: (match: RegExpMatchArray) => `${match[1]} ${match[2]}`,
    type: "pattern" as const,
    description: 'Simplify "X near Y" to "X Y"',
  },
  {
    pattern: /^find\s+(\S(?:.*\S)?)$/i,
    transform: (match: RegExpMatchArray) => match[1],
    type: "pattern" as const,
    description: 'Remove "find" prefix',
  },
  {
    pattern: /^search\s+for\s+(\S(?:.*\S)?)$/i,
    transform: (match: RegExpMatchArray) => match[1],
    type: "pattern" as const,
    description: 'Remove "search for" prefix',
  },
  {
    pattern: /^where\s+(?:can\s+i\s+find|is|are)\s+(\S(?:.*\S)?)$/i,
    transform: (match: RegExpMatchArray) => match[1],
    type: "pattern" as const,
    description: "Remove question words",
  },
  {
    pattern: /^what\s+is\s+the\s+(\S(?:.*\S)?)$/i,
    transform: (match: RegExpMatchArray) => match[1],
    type: "pattern" as const,
    description: 'Remove "what is the" prefix',
  },
  {
    pattern: /^how\s+to\s+(?:find|get\s+to)\s+(\S(?:.*\S)?)$/i,
    transform: (match: RegExpMatchArray) => match[1],
    type: "pattern" as const,
    description: 'Remove "how to" prefix',
  },
];

export const queryRewriter = {
  /**
   * Rewrite query using all available techniques
   */
  async rewrite(query: string, locale: string = "en"): Promise<QueryRewriteResult> {
    const transformations: Transformation[] = [];
    let currentQuery = query.trim();

    // 1. Apply pattern transformations
    const patternResult = this.applyPatterns(currentQuery);
    if (patternResult.transformed) {
      transformations.push({
        type: "pattern",
        from: currentQuery,
        to: patternResult.query,
        confidence: 1,
      });
      currentQuery = patternResult.query;
    }

    // 2. Spell check
    const spellResult = await spellChecker.check(currentQuery);
    if (spellResult.wasChanged) {
      transformations.push({
        type: "spell",
        from: currentQuery,
        to: spellResult.corrected,
        confidence: spellResult.confidence,
      });
      currentQuery = spellResult.corrected;
    }

    // 3. Process query (language detection, normalization, stop word removal)
    const processed = queryProcessor.process(currentQuery, locale);

    // 4. Expand with synonyms
    const expansion = synonymExpander.expand(processed.tokens, processed.language);

    // Track stop word removal if cleaned differs from normalized
    if (processed.cleaned !== processed.normalized) {
      transformations.push({
        type: "stopword",
        from: processed.normalized,
        to: processed.cleaned,
        confidence: 0.9,
      });
    }

    // 5. Calculate overall confidence
    const avgConfidence =
      transformations.length > 0
        ? transformations.reduce((sum, t) => sum + t.confidence, 0) / transformations.length
        : 1;

    // 6. Generate suggestions
    const suggestions = await this.generateSuggestions(query, locale, spellResult);

    return {
      original: query,
      rewritten: processed.cleaned || currentQuery,
      expanded: expansion.expanded,
      transformations,
      suggestions,
      confidence: avgConfidence,
      locale: processed.language,
    };
  },

  /**
   * Apply pattern transformations to query
   */
  applyPatterns(query: string): { query: string; transformed: boolean } {
    let currentQuery = query;
    let wasTransformed = false;

    for (const { pattern, transform } of QUERY_PATTERNS) {
      const match = pattern.exec(currentQuery);
      if (match) {
        currentQuery = transform(match);
        wasTransformed = true;
        break; // Apply only one pattern
      }
    }

    return { query: currentQuery, transformed: wasTransformed };
  },

  /**
   * Generate query suggestions
   */
  async generateSuggestions(query: string, locale: string, spellResult: any): Promise<string[]> {
    const suggestions = new Set<string>();

    // Add spell check suggestions
    if (spellResult.suggestions) {
      spellResult.suggestions.forEach((s: string) => suggestions.add(s));
    }

    // Add pattern-based suggestions
    for (const { pattern, transform } of QUERY_PATTERNS) {
      const match = pattern.exec(query);
      if (match) {
        const transformed = transform(match);
        if (transformed !== query) {
          suggestions.add(transformed);
        }
      }
    }

    // Add synonym suggestions (different term combinations)
    const processed = queryProcessor.process(query, locale);
    for (const token of processed.tokens.slice(0, 2)) {
      // Limit to first 2 tokens
      const synonyms = synonymExpander.getSynonyms(token, locale);
      if (synonyms.length > 0) {
        const suggestion = query.replaceAll(
          new RegExp(String.raw`\b` + escapeRegExp(token) + String.raw`\b`, "gi"),
          synonyms[0]
        );
        if (suggestion !== query) {
          suggestions.add(suggestion);
        }
      }
    }

    return Array.from(suggestions).slice(0, 5); // Max 5 suggestions
  },

  /**
   * Get "Did you mean?" suggestion
   */
  async getDidYouMean(query: string, locale: string = "en"): Promise<string | null> {
    const result = await this.rewrite(query, locale);

    // Only suggest if we have high confidence and the query changed
    if (result.confidence >= 0.8 && result.rewritten !== query.toLowerCase().trim()) {
      return result.rewritten;
    }

    // Check spell corrections
    const spellResult = await spellChecker.check(query);
    if (spellResult.wasChanged && spellResult.confidence >= 0.8) {
      return spellResult.corrected;
    }

    return null;
  },

  /**
   * Batch rewrite multiple queries
   */
  async rewriteBatch(queries: string[], locale: string = "en"): Promise<QueryRewriteResult[]> {
    return Promise.all(queries.map(q => this.rewrite(q, locale)));
  },

  /**
   * Get available patterns (for testing/debugging)
   */
  getPatterns(): typeof QUERY_PATTERNS {
    return QUERY_PATTERNS;
  },
};
