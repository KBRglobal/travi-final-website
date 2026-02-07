/**
 * Search Debug Service
 *
 * Provides detailed debugging information for search queries.
 * Admin-only - helps understand WHY results appear (or don't).
 *
 * ZERO IMPACT on public search performance.
 */

import { searchAll } from "./search-index";
import { expandQuery } from "./query-expander";
import { queryProcessor } from "./query-processor";
import { spellChecker } from "./spell-checker";
import { synonymExpander } from "./synonyms";
import { intentClassifier, type IntentType } from "./intent-classifier";

/**
 * Debug information for a single search result
 */
export interface DebugResultInfo {
  id: string;
  title: string;
  type: string;
  slug: string;
  baseScore: number;
  adjustedScore: number;
  scoreBreakdown: {
    typeWeight: number;
    titleMatchBoost: number;
    recencyBoost: number;
    popularityBoost: number;
    intentBoost: number;
    totalMultiplier: number;
  };
  matchDetails: {
    titleMatch: boolean;
    titleContains: boolean;
    matchedTerms: string[];
  };
  metadata: {
    viewCount: number | null;
    publishedAt: string | null;
  };
}

/**
 * Query analysis details
 */
export interface DebugQueryAnalysis {
  original: string;
  normalized: string;
  tokens: string[];
  language: string;
  queryExpansion: {
    synonymsApplied: string[];
    resolvedCity: string | null;
    expandedTerms: string[];
  };
  spellCheck: {
    corrected: string;
    wasChanged: boolean;
    confidence: number;
    suggestions: string[];
  };
}

/**
 * Intent classification details
 */
export interface DebugIntentInfo {
  primary: IntentType;
  confidence: number;
  matchedPatterns: string[];
  extractedEntities: Record<string, unknown>;
  suggestedFilters: Record<string, unknown>;
  filterReasons: string[];
}

/**
 * Search execution pipeline steps
 */
export interface DebugPipelineStep {
  step: string;
  query: string;
  resultCount: number;
  durationMs: number;
  details: string;
}

/**
 * Complete debug response
 */
export interface SearchDebugResponse {
  query: string;
  timestamp: string;
  totalDurationMs: number;

  // Query analysis
  queryAnalysis: DebugQueryAnalysis;

  // Intent classification
  intentClassification: DebugIntentInfo;

  // Execution pipeline
  pipeline: DebugPipelineStep[];

  // Results with scoring breakdown
  results: DebugResultInfo[];

  // Why results might be missing
  noResultsReasons: string[];

  // Recommendations for improving results
  recommendations: string[];
}

/**
 * Entity type weights for reference
 */
const ENTITY_TYPE_WEIGHTS: Record<string, number> = {
  destination: 1.6,
  attraction: 1.4,
  hotel: 1.2,
  article: 1,
  category: 0.9,
};

/**
 * Calculate recency boost (same as search-service.ts)
 */
function calculateRecencyBoost(publishedAt: Date | string | null | undefined): number {
  if (!publishedAt) return 1;

  const now = Date.now();
  const publishedTime = new Date(publishedAt).getTime();
  const daysSincePublished = (now - publishedTime) / (1000 * 60 * 60 * 24);

  if (daysSincePublished <= 7) return 1.3;
  if (daysSincePublished >= 90) return 1;

  const decayRange = 90 - 7;
  const daysIntoDecay = daysSincePublished - 7;
  return 1 + 0.3 * (1 - daysIntoDecay / decayRange);
}

/**
 * Calculate popularity boost (same as search-service.ts)
 */
function calculatePopularityBoost(viewCount: number | null | undefined): number {
  if (!viewCount || viewCount <= 0) return 1;

  if (viewCount >= 10000) return 1.25;
  if (viewCount >= 5000) return 1.2;
  if (viewCount >= 1000) return 1.15;
  if (viewCount >= 500) return 1.1;
  if (viewCount >= 100) return 1.05;
  return 1;
}

/**
 * Analyze and debug a search query
 */
export async function debugSearch(query: string): Promise<SearchDebugResponse> {
  const startTime = Date.now();
  const pipeline: DebugPipelineStep[] = [];
  const noResultsReasons: string[] = [];
  const recommendations: string[] = [];

  // Step 1: Query processing
  const processStart = Date.now();
  const processed = queryProcessor.process(query);
  const normalized = query.trim().toLowerCase();

  pipeline.push({
    step: "query_processing",
    query: query,
    resultCount: 0,
    durationMs: Date.now() - processStart,
    details: `Tokenized into ${processed.tokens.length} tokens, detected language: ${processed.language}`,
  });

  // Step 2: Query expansion
  const expandStart = Date.now();
  const expansion = expandQuery(query);
  const synonymResult = synonymExpander.expand(processed.tokens, processed.language);

  pipeline.push({
    step: "query_expansion",
    query: expansion.original,
    resultCount: 0,
    durationMs: Date.now() - expandStart,
    details: `Expanded with ${synonymResult.expanded.length - processed.tokens.length} synonyms, city resolved: ${expansion.resolvedCity || "none"}`,
  });

  // Step 3: Spell check
  const spellStart = Date.now();
  const spellResult = await spellChecker.check(query);

  pipeline.push({
    step: "spell_check",
    query: spellResult.corrected,
    resultCount: 0,
    durationMs: Date.now() - spellStart,
    details: spellResult.wasChanged
      ? `Corrected to "${spellResult.corrected}" (confidence: ${(spellResult.confidence * 100).toFixed(0)}%)`
      : "No corrections needed",
  });

  // Step 4: Intent classification
  const intentStart = Date.now();
  const intent = intentClassifier.classify(query) as any;

  pipeline.push({
    step: "intent_classification",
    query: query,
    resultCount: 0,
    durationMs: Date.now() - intentStart,
    details: `Primary intent: ${intent.primary} (confidence: ${(intent.confidence * 100).toFixed(0)}%)`,
  });

  // Step 5: Execute search
  const searchStart = Date.now();
  const searchResults = await searchAll({
    query: query,
    limit: 20,
  });

  pipeline.push({
    step: "primary_search",
    query: query,
    resultCount: searchResults.length,
    durationMs: Date.now() - searchStart,
    details:
      searchResults.length > 0
        ? `Found ${searchResults.length} results`
        : "No direct matches found",
  });

  // Step 6: Fallback search if needed
  let allResults = searchResults;
  if (searchResults.length === 0 && spellResult.wasChanged) {
    const fallbackStart = Date.now();
    const fallbackResults = await searchAll({
      query: spellResult.corrected,
      limit: 20,
    });

    pipeline.push({
      step: "spell_corrected_search",
      query: spellResult.corrected,
      resultCount: fallbackResults.length,
      durationMs: Date.now() - fallbackStart,
      details: `Searched with corrected spelling, found ${fallbackResults.length} results`,
    });

    allResults = fallbackResults;
  }

  // Analyze why no results might be found
  if (allResults.length === 0) {
    noResultsReasons.push(`No content matches the query "${query}"`);

    if (processed.tokens.length === 1 && processed.tokens[0].length < 3) {
      noResultsReasons.push("Query is too short (less than 3 characters)");
      recommendations.push("Try using longer or more specific search terms");
    }

    if (!expansion.resolvedCity) {
      noResultsReasons.push("No location/city detected in query");
      recommendations.push("Include a destination or specific location in your query");
    }

    if (Object.keys(intent.entities).length === 0) {
      noResultsReasons.push("No entities could be extracted from the query");
      recommendations.push(
        "Be more specific about what you're looking for (hotel, restaurant, attraction)"
      );
    }
  }

  // Build result debug info
  const queryTerms = normalized.split(/\s+/).filter(Boolean);
  const debugResults: DebugResultInfo[] = allResults.map(result => {
    const typeWeight = ENTITY_TYPE_WEIGHTS[result.type] || 1;
    const recencyBoost = calculateRecencyBoost(result.publishedAt);
    const popularityBoost = calculatePopularityBoost(result.viewCount);

    const titleLower = result.title.toLowerCase();
    const titleMatch = queryTerms.some(term => titleLower === term);
    const titleContains = queryTerms.some(term => titleLower.includes(term));
    const titleMatchBoost = titleMatch ? 2 : titleContains ? 1.3 : 1;

    const matchedTerms = queryTerms.filter(
      term =>
        titleLower.includes(term) ||
        ((result as any).description?.toLowerCase().includes(term) ?? false)
    );

    const intentBoost = 1; // Simplified for debug
    const totalMultiplier =
      typeWeight * titleMatchBoost * recencyBoost * popularityBoost * intentBoost;

    return {
      id: result.id,
      title: result.title,
      type: result.type,
      slug: result.slug || "",
      baseScore: result.score,
      adjustedScore: result.score * totalMultiplier,
      scoreBreakdown: {
        typeWeight,
        titleMatchBoost,
        recencyBoost,
        popularityBoost,
        intentBoost,
        totalMultiplier,
      },
      matchDetails: {
        titleMatch,
        titleContains,
        matchedTerms,
      },
      metadata: {
        viewCount: result.viewCount || null,
        publishedAt: result.publishedAt?.toISOString() || null,
      },
    };
  });

  // Sort by adjusted score
  debugResults.sort((a, b) => b.adjustedScore - a.adjustedScore);

  // Build filter reasons
  const filterReasons: string[] = [];
  if (intent.suggestedFilters.contentTypes) {
    filterReasons.push(
      `Content types filtered to: ${intent.suggestedFilters.contentTypes.join(", ")}`
    );
  }
  if (intent.suggestedFilters.location) {
    filterReasons.push(`Location filter: ${intent.suggestedFilters.location}`);
  }
  if (intent.suggestedFilters.priceRange) {
    filterReasons.push(
      `Price range: ${intent.suggestedFilters.priceRange[0]} - ${intent.suggestedFilters.priceRange[1]}`
    );
  }

  return {
    query,
    timestamp: new Date().toISOString(),
    totalDurationMs: Date.now() - startTime,
    queryAnalysis: {
      original: query,
      normalized,
      tokens: processed.tokens,
      language: processed.language,
      queryExpansion: {
        synonymsApplied: synonymResult.expanded.filter(e => !processed.tokens.includes(e)),
        resolvedCity: expansion.resolvedCity,
        expandedTerms: synonymResult.expanded,
      },
      spellCheck: {
        corrected: spellResult.corrected,
        wasChanged: spellResult.wasChanged,
        confidence: spellResult.confidence,
        suggestions: spellResult.suggestions || [],
      },
    },
    intentClassification: {
      primary: intent.primary,
      confidence: intent.confidence,
      matchedPatterns: [], // Would need to track which patterns matched
      extractedEntities: intent.entities as Record<string, unknown>,
      suggestedFilters: intent.suggestedFilters as Record<string, unknown>,
      filterReasons,
    },
    pipeline,
    results: debugResults,
    noResultsReasons,
    recommendations,
  };
}

/**
 * Debug why a specific content item appears/doesn't appear for a query
 */
export async function debugContentForQuery(
  contentId: string,
  query: string
): Promise<{
  found: boolean;
  rank: number | null;
  matchDetails: DebugResultInfo | null;
  reasons: string[];
}> {
  const debugResult = await debugSearch(query);

  const result = debugResult.results.find(r => r.id === contentId);
  const rank = result ? debugResult.results.indexOf(result) + 1 : null;

  const reasons: string[] = [];

  if (!result) {
    reasons.push(
      "Content was not returned in search results",
      `Query "${query}" may not match the content's title or description`
    );

    // Check if content type matches intent filters
    if (debugResult.intentClassification.suggestedFilters.contentTypes) {
      reasons.push(
        `Search filtered to content types: ${(debugResult.intentClassification.suggestedFilters.contentTypes as string[]).join(", ")}`
      );
    }
  } else {
    reasons.push(
      `Content ranked #${rank} out of ${debugResult.results.length} results`,
      `Adjusted score: ${result.adjustedScore.toFixed(2)} (base: ${result.baseScore.toFixed(2)})`
    );

    if (result.matchDetails.titleMatch) {
      reasons.push("Title exactly matches a query term (+2.0x boost)");
    } else if (result.matchDetails.titleContains) {
      reasons.push("Title contains query term (+1.3x boost)");
    }
  }

  return {
    found: !!result,
    rank,
    matchDetails: result || null,
    reasons,
  };
}

/**
 * Get ranking factor explanations
 */
export function getRankingFactorExplanations(): Record<string, string> {
  return {
    typeWeight:
      "Entity type priority: destination (1.6) > attraction (1.4) > hotel (1.2) > article (1.0) > category (0.9)",
    titleMatchBoost: "Exact title match: 2.0x, title contains term: 1.3x, no match: 1.0x",
    recencyBoost:
      "Content published within 7 days: 1.3x, within 90 days: linear decay to 1.0x, older: 1.0x",
    popularityBoost: "10k+ views: 1.25x, 5k+: 1.2x, 1k+: 1.15x, 500+: 1.1x, 100+: 1.05x",
    intentBoost:
      "Boosts results matching detected user intent (e.g., hotel_search boosts hotel results)",
  };
}
