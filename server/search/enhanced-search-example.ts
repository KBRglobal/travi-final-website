/**
 * Enhanced Search Integration Example
 *
 * This example shows how to integrate the spell check and query expansion
 * features with the existing search engine.
 */

import { searchEngine, queryRewriter, spellChecker } from "./index";

/**
 * Enhanced search with automatic query rewriting
 */
export async function enhancedSearch(
  query: string,
  options: {
    locale?: string;
    limit?: number;
    page?: number;
    type?: string[];
  } = {}
) {
  const locale = options.locale || "en";

  // 1. Rewrite the query (spell check + patterns + synonyms)
  const rewritten = await queryRewriter.rewrite(query, locale);

  // 2. Perform search with the rewritten query
  const results = await searchEngine.search({
    q: rewritten.rewritten,
    limit: options.limit,
    page: options.page,
    type: options.type,
    locale,
  });

  // 3. Add enhancement information to results
  return {
    ...results,
    enhancements: {
      originalQuery: query,
      rewrittenQuery: rewritten.rewritten,
      wasRewritten: rewritten.rewritten !== query.toLowerCase().trim(),
      didYouMean: rewritten.rewritten !== query.toLowerCase().trim() ? rewritten.rewritten : null,
      suggestions: rewritten.suggestions,
      transformations: rewritten.transformations,
      confidence: rewritten.confidence,
      expandedTerms: rewritten.expanded.slice(0, 10), // Top 10 for display
    },
  };
}

/**
 * Get spell check suggestions without full search
 */
export async function getSpellingSuggestions(query: string) {
  const result = await spellChecker.check(query);

  return {
    query,
    corrected: result.corrected,
    needsCorrection: result.wasChanged,
    confidence: result.confidence,
    suggestions: result.suggestions || [],
  };
}

/**
 * Example usage:
 *
 * // Simple enhanced search
 * const results = await enhancedSearch('best hotell near merena');
 *  // "hotel marina"
 *
 * // Get spelling suggestions
 * const suggestions = await getSpellingSuggestions('burk khalifa');
 *  // "burj khalifa"
 */
