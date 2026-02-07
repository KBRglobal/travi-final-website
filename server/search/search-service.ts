/**
 * Search Service
 *
 * Provides search with GUARANTEED non-empty results
 * Uses deterministic fallback when no results match
 *
 * SEARCH INTELLIGENCE FEATURES:
 * - Query expansion with synonyms and city aliases
 * - Ranking signals: popularity, recency, entity type weighting
 * - Telemetry tracking for observability
 * - Intent-aware ranking via unified cognitive layer
 *
 * SEARCH QUALITY GUARDRAILS (Phase 14):
 * - Query normalization (lowercase, trim, special chars)
 * - Typo-tolerant fallback via spell-checker
 * - Deterministic fallback chain: exact → fuzzy → synonyms → fallback
 * - Structured response with suggestions and clear messaging
 * - Zero result rate tracking with warning logs (>20%)
 */

import {
  searchAll,
  getPopularDestinations,
  getRecentArticles,
  getPopularSearchSuggestions,
  type SearchResult,
} from "./search-index";
import { queryExpander, expandQuery } from "./query-expander";
import { queryProcessor } from "./query-processor";
import { spellChecker } from "./spell-checker";
import { synonymExpander } from "./synonyms";
import { searchTelemetry } from "./search-telemetry";
import { getEntityTypeFrequencies } from "../session/intent-memory";

type IntentEntityType = any;
import { type UnifiedIntentType, type IntentSignal } from "../../shared/intent-schema";
import {
  syncSearchIntentToChat,
  getIntentBoostForEntityType,
  getDominantUnifiedIntent,
} from "../cognitive/unified-layer";
import { recordLoopEntry, recordLoopStep } from "../analytics";

/**
 * Fallback stage tracking for debugging and metrics
 */
export type FallbackStage =
  | "exact_match" // Direct query match found
  | "fuzzy_match" // Spell-corrected query found results
  | "synonym_match" // Synonym-expanded query found results
  | "popular_fallback" // No matches, showing popular content
  | "none"; // Direct match, no fallback needed

export interface PublicSearchResponse {
  results: SearchResult[];
  fallback: boolean;
  fallbackUsed: boolean;
  fallbackStage: FallbackStage;
  query: string;
  total: number;
  suggestions: string[];
  message: string;
  expansion?: {
    original: string;
    synonymsApplied: string[];
    resolvedCity: string | null;
  };
  spellCorrection?: {
    original: string;
    corrected: string;
    wasChanged: boolean;
    confidence: number;
  };
  intentDetected?: UnifiedIntentType;
}

export interface SearchServiceOptions {
  query: string;
  limit?: number;
  types?: ("destination" | "attraction" | "hotel" | "article" | "category")[];
  sessionId?: string;
  intent?: UnifiedIntentType;
}

/**
 * Entity type weights for search ranking
 * Priority: destinations > attractions > hotels > articles > category
 * Higher weight = higher priority in results
 */
const ENTITY_TYPE_WEIGHTS: Record<SearchResult["type"], number> = {
  destination: 1.6,
  attraction: 1.4,
  hotel: 1.2,
  article: 1,
  category: 0.9,
};

/**
 * Recency decay factor - how much to boost recent content
 * Content published within 7 days gets max boost (1.3)
 * Content older than 90 days gets no boost (1.0)
 */
const RECENCY_MAX_BOOST = 1.3;
const RECENCY_DECAY_DAYS = 90;
const RECENCY_PRIME_DAYS = 7;

/**
 * Calculate recency boost for content with publishedAt date
 * Returns a multiplier between 1.0 (old) and RECENCY_MAX_BOOST (recent)
 */
function calculateRecencyBoost(publishedAt: Date | null | undefined): number {
  if (!publishedAt) return 1;

  const now = Date.now();
  const publishedTime = new Date(publishedAt).getTime();
  const daysSincePublished = (now - publishedTime) / (1000 * 60 * 60 * 24);

  if (daysSincePublished <= RECENCY_PRIME_DAYS) {
    return RECENCY_MAX_BOOST;
  }

  if (daysSincePublished >= RECENCY_DECAY_DAYS) {
    return 1;
  }

  const decayRange = RECENCY_DECAY_DAYS - RECENCY_PRIME_DAYS;
  const daysIntoDecay = daysSincePublished - RECENCY_PRIME_DAYS;
  const decayFactor = 1 - daysIntoDecay / decayRange;

  return 1 + (RECENCY_MAX_BOOST - 1) * decayFactor;
}

/**
 * Calculate popularity boost based on view count
 * Results with higher views get boosted
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
 * Calculate intent memory boost based on recent entity type views
 * Boosts results matching entity types the user has recently viewed
 * Max boost: 1.2 for frequently viewed entity types
 */
function calculateIntentMemoryBoost(
  resultType: SearchResult["type"],
  entityTypeFrequencies: Map<IntentEntityType, number>
): number {
  const frequency = entityTypeFrequencies.get(resultType as IntentEntityType) || 0;

  if (frequency === 0) return 1;
  if (frequency >= 5) return 1.2;
  if (frequency >= 3) return 1.15;
  if (frequency >= 2) return 1.1;
  return 1.05;
}

/**
 * Calculate combined ranking score for a search result
 *
 * @param result - The search result to score
 * @param queryTerms - Normalized query terms for relevance matching
 * @param entityTypeFrequencies - Map of entity type to view frequency for intent memory boost
 * @param unifiedIntent - Optional unified intent for intent-aware ranking
 * @returns Adjusted score combining multiple signals
 */
function calculateRankingScore(
  result: SearchResult,
  queryTerms: string[],
  entityTypeFrequencies?: Map<IntentEntityType, number>,
  unifiedIntent?: UnifiedIntentType | null
): number {
  let score = result.score;

  // 1. Entity type weighting (destinations > attractions > hotels > articles)
  const typeWeight = ENTITY_TYPE_WEIGHTS[result.type] || 1;
  score *= typeWeight;

  // 2. Title match boost (exact or partial)
  const titleLower = result.title.toLowerCase();
  for (const term of queryTerms) {
    if (titleLower === term) {
      score *= 2;
      break;
    } else if (titleLower.includes(term)) {
      score *= 1.3;
    }
  }

  // 3. Recency boost (newer content ranked higher)
  const recencyBoost = calculateRecencyBoost(result.publishedAt);
  score *= recencyBoost;

  // 4. Popularity boost (high view count = higher ranking)
  const popularityBoost = calculatePopularityBoost(result.viewCount);
  score *= popularityBoost;

  // 5. Intent memory boost (entity types user has recently viewed)
  if (entityTypeFrequencies && entityTypeFrequencies.size > 0) {
    const intentBoost = calculateIntentMemoryBoost(result.type, entityTypeFrequencies);
    score *= intentBoost;
  }

  // 6. Unified intent boost (cognitive layer intent-aware ranking)
  if (unifiedIntent) {
    const intentEntityBoost = getIntentBoostForEntityType(unifiedIntent, result.type as any);
    score *= intentEntityBoost;
  }

  return score;
}

/**
 * Re-rank search results using combined ranking signals
 * Now includes unified intent from cognitive layer
 */
function applyRankingSignals(
  results: SearchResult[],
  query: string,
  sessionId?: string,
  explicitIntent?: UnifiedIntentType
): SearchResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const entityTypeFrequencies = sessionId ? getEntityTypeFrequencies(sessionId) : undefined;

  // Get unified intent from cognitive layer or use explicit intent
  const unifiedIntent = explicitIntent || (sessionId ? getDominantUnifiedIntent(sessionId) : null);

  const rankedResults = results.map(result => ({
    ...result,
    score: calculateRankingScore(result, queryTerms, entityTypeFrequencies as any, unifiedIntent),
  }));

  return rankedResults.sort((a, b) => b.score - a.score);
}

/**
 * Apply intent-based boost to search results
 * Used by chat to get intent-aware results from recent chat intents
 *
 * If recent chat intent is 'compare', boost comparison-friendly entities (hotels, destinations)
 * If recent chat intent is 'plan', boost itinerary-friendly entities (destinations, attractions, hotels)
 *
 * @param results - Raw search results to boost
 * @param recentIntents - Recent intent signals from chat/search
 * @returns Boosted and re-sorted results
 */
export function applyIntentBoost(
  results: SearchResult[],
  recentIntents: IntentSignal[]
): SearchResult[] {
  if (!results.length || !recentIntents.length) {
    return results;
  }

  // Get the dominant intent from recent signals
  const freshIntents = recentIntents.filter(s => Date.now() - s.timestamp < 30 * 60 * 1000);
  if (freshIntents.length === 0) {
    return results;
  }

  const dominantIntent = freshIntents.reduce(
    (best, current) => (current.confidence > best.confidence ? current : best),
    freshIntents[0]
  );

  const boostedResults = results.map(result => {
    const boost = getIntentBoostForEntityType(dominantIntent.type, result.type as any);
    return {
      ...result,
      score: result.score * boost,
    };
  });

  return boostedResults.sort((a, b) => b.score - a.score);
}

/**
 * Generate helpful suggestions for failed queries
 * Based on spell correction and popular search terms
 */
function generateSuggestions(
  query: string,
  spellResult: { corrected: string; wasChanged: boolean; suggestions?: string[] },
  popularSuggestions: string[] = []
): string[] {
  const suggestions: string[] = [];

  // Add spell correction if different
  if (spellResult.wasChanged && spellResult.corrected !== query.toLowerCase()) {
    suggestions.push(spellResult.corrected);
  }

  // Add spell checker suggestions
  if (spellResult.suggestions) {
    suggestions.push(...spellResult.suggestions.slice(0, 2));
  }

  // Add popular suggestions
  if (popularSuggestions.length > 0) {
    suggestions.push(...popularSuggestions.slice(0, 3));
  }

  // Dedupe and limit
  return [...new Set(suggestions)].slice(0, 5);
}

/**
 * Generate user-friendly message based on fallback stage
 */
function generateFallbackMessage(
  stage: FallbackStage,
  query: string,
  spellCorrected?: string
): string {
  switch (stage) {
    case "exact_match":
    case "none":
      return `Found results for "${query}"`;
    case "fuzzy_match":
      return `Showing results for "${spellCorrected || query}" (corrected spelling)`;
    case "synonym_match":
      return `Showing related results for "${query}"`;
    case "popular_fallback":
      return `No exact matches for "${query}". Here are popular destinations you might like:`;
    default:
      return `Showing results for "${query}"`;
  }
}

/**
 * Normalize query for consistent processing
 * Handles: lowercase, trim, special characters, excessive whitespace
 */
function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Keep letters, numbers, spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Main public search function with SEARCH QUALITY GUARDRAILS
 *
 * FALLBACK CHAIN (deterministic, typo-tolerant):
 * 1. Exact match - Direct query search
 * 2. Fuzzy match - Spell-corrected query search
 * 3. Synonym match - Synonym-expanded query search
 * 4. Popular fallback - Show popular destinations/articles
 *
 * NEVER returns empty results - always provides usable content
 * ALWAYS returns structured response with suggestions and message
 */
/** Deduplicate search results into allResults and seenIds */
async function searchAndDedupe(
  queries: string[],
  types: SearchServiceOptions["types"],
  seenIds: Set<string>,
  allResults: SearchResult[]
): Promise<void> {
  for (const searchQuery of queries) {
    const results = await searchAll({ query: searchQuery, limit: 0, types });
    for (const result of results) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        allResults.push(result);
      }
    }
  }
}

/** Build common expansion info */
function buildExpansionInfo(
  expansion: { original: string; synonymsApplied: string[]; resolvedCity: string | null },
  overrideSynonyms?: string[]
) {
  return {
    original: expansion.original,
    synonymsApplied: overrideSynonyms ?? expansion.synonymsApplied,
    resolvedCity: expansion.resolvedCity,
  };
}

/** Track search telemetry */
function trackSearch(
  query: string,
  resultCount: number,
  fallback: boolean,
  startTime: number
): void {
  searchTelemetry.track({ query, resultCount, fallback, responseTimeMs: Date.now() - startTime });
}

/** Try fuzzy match via spell correction */
async function tryFuzzyMatch(
  trimmedQuery: string,
  types: SearchServiceOptions["types"],
  sessionId: string | undefined,
  activeIntent: UnifiedIntentType | undefined,
  limit: number,
  expansion: any,
  startTime: number
): Promise<PublicSearchResponse | null> {
  const spellResult = await spellChecker.check(trimmedQuery);
  if (!spellResult.wasChanged || spellResult.confidence < 0.6) return null;

  const fuzzyResults = await searchAll({ query: spellResult.corrected, limit: 0, types });
  if (fuzzyResults.length === 0) return null;

  const rankedResults = applyRankingSignals(
    fuzzyResults,
    spellResult.corrected,
    sessionId,
    activeIntent
  );
  recordLoopStep("search", 2, "content_discovery");
  trackSearch(trimmedQuery, rankedResults.slice(0, limit).length, true, startTime);

  return {
    results: rankedResults.slice(0, limit),
    fallback: true,
    fallbackUsed: true,
    fallbackStage: "fuzzy_match",
    query: trimmedQuery,
    total: rankedResults.length,
    suggestions: generateSuggestions(
      trimmedQuery,
      spellResult,
      await getPopularSearchSuggestions(3)
    ),
    message: generateFallbackMessage("fuzzy_match", trimmedQuery, spellResult.corrected),
    expansion: buildExpansionInfo(expansion),
    spellCorrection: {
      original: spellResult.original,
      corrected: spellResult.corrected,
      wasChanged: spellResult.wasChanged,
      confidence: spellResult.confidence,
    },
    intentDetected: activeIntent,
  };
}

export async function publicSearch(options: SearchServiceOptions): Promise<PublicSearchResponse> {
  const startTime = Date.now();
  const { query, limit = 10, types, sessionId, intent: explicitIntent } = options;
  const trimmedQuery = query?.trim() || "";

  recordLoopEntry("search", { source: sessionId ? "session" : "api" } as any);

  let detectedIntent: UnifiedIntentType | null = null;
  if (trimmedQuery && sessionId) {
    syncSearchIntentToChat(trimmedQuery, "search" as UnifiedIntentType);
    detectedIntent = getDominantUnifiedIntent(sessionId);
  }
  const activeIntent = explicitIntent || detectedIntent || undefined;

  // === EMPTY QUERY ===
  if (!trimmedQuery) {
    const [fallbackResults, popularSuggestions] = await Promise.all([
      getFallbackResults(limit),
      getPopularSearchSuggestions(5),
    ]);
    trackSearch("", fallbackResults.length, true, startTime);
    return {
      results: fallbackResults,
      fallback: true,
      fallbackUsed: true,
      fallbackStage: "popular_fallback",
      query: "",
      total: fallbackResults.length,
      suggestions: popularSuggestions,
      message: "Explore popular destinations:",
    };
  }

  const processed = queryProcessor.process(trimmedQuery);
  const expansion = expandQuery(trimmedQuery);
  let allResults: SearchResult[] = [];
  const seenIds = new Set<string>();

  // === STEP 1: EXACT MATCH ===
  const searchQueries = [trimmedQuery];
  if (expansion.resolvedCity && !trimmedQuery.toLowerCase().includes(expansion.resolvedCity)) {
    searchQueries.push(expansion.resolvedCity);
  }
  await searchAndDedupe(searchQueries, types, seenIds, allResults);

  if (allResults.length > 0) {
    allResults = applyRankingSignals(allResults, trimmedQuery, sessionId, activeIntent);
    recordLoopStep("search", 1, "content_discovery");
    trackSearch(trimmedQuery, allResults.slice(0, limit).length, false, startTime);
    return {
      results: allResults.slice(0, limit),
      fallback: false,
      fallbackUsed: false,
      fallbackStage: "exact_match",
      query: trimmedQuery,
      total: allResults.length,
      suggestions: [],
      message: generateFallbackMessage("exact_match", trimmedQuery),
      expansion: buildExpansionInfo(expansion),
      intentDetected: activeIntent,
    };
  }

  // === STEP 2: FUZZY MATCH ===
  const fuzzyResponse = await tryFuzzyMatch(
    trimmedQuery,
    types,
    sessionId,
    activeIntent,
    limit,
    expansion,
    startTime
  );
  if (fuzzyResponse) return fuzzyResponse;

  // === STEP 3: SYNONYM MATCH ===
  const synonymExpansion = synonymExpander.expand(processed.tokens, processed.language);
  if (synonymExpansion.expanded.length > processed.tokens.length) {
    await searchAndDedupe(synonymExpansion.expanded, types, seenIds, allResults);

    if (allResults.length > 0) {
      allResults = applyRankingSignals(allResults, trimmedQuery, sessionId, activeIntent);
      recordLoopStep("search", 3, "content_discovery");
      trackSearch(trimmedQuery, allResults.slice(0, limit).length, true, startTime);
      const spellResult = await spellChecker.check(trimmedQuery);
      return {
        results: allResults.slice(0, limit),
        fallback: true,
        fallbackUsed: true,
        fallbackStage: "synonym_match",
        query: trimmedQuery,
        total: allResults.length,
        suggestions: generateSuggestions(
          trimmedQuery,
          spellResult,
          await getPopularSearchSuggestions(3)
        ),
        message: generateFallbackMessage("synonym_match", trimmedQuery),
        expansion: buildExpansionInfo(
          expansion,
          synonymExpansion.expanded.filter(e => !processed.tokens.includes(e))
        ),
        intentDetected: activeIntent,
      };
    }
  }

  // === STEP 4: POPULAR FALLBACK ===
  const fallbackResults = await getFallbackResults(limit);
  trackSearch(trimmedQuery, 0, true, startTime);
  const spellResult = await spellChecker.check(trimmedQuery);
  return {
    results: fallbackResults,
    fallback: true,
    fallbackUsed: true,
    fallbackStage: "popular_fallback",
    query: trimmedQuery,
    total: fallbackResults.length,
    suggestions: generateSuggestions(
      trimmedQuery,
      spellResult,
      await getPopularSearchSuggestions(3)
    ),
    message: generateFallbackMessage("popular_fallback", trimmedQuery),
    expansion: buildExpansionInfo(expansion),
    spellCorrection: spellResult.wasChanged
      ? {
          original: spellResult.original,
          corrected: spellResult.corrected,
          wasChanged: spellResult.wasChanged,
          confidence: spellResult.confidence,
        }
      : undefined,
    intentDetected: activeIntent,
  };
}

/**
 * Get fallback results - popular destinations + recent articles
 * This ensures we NEVER return empty results
 */
async function getFallbackResults(limit: number): Promise<SearchResult[]> {
  const destinationLimit = Math.ceil(limit * 0.6);
  const articleLimit = limit - destinationLimit;

  const [destinations, articles] = await Promise.all([
    getPopularDestinations(destinationLimit),
    getRecentArticles(articleLimit),
  ]);

  // Interleave results for variety
  const combined: SearchResult[] = [];
  const maxLen = Math.max(destinations.length, articles.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < destinations.length) {
      combined.push(destinations[i]);
    }
    if (i < articles.length) {
      combined.push(articles[i]);
    }
  }

  return combined.slice(0, limit);
}

/**
 * Get autocomplete suggestions
 * Returns quick matches for search-as-you-type
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmed = query.trim();

  // Check for city alias first
  const resolved = queryExpander.resolveCityAlias(trimmed);
  const searchQuery = resolved || trimmed;

  // Only search destinations and categories for quick autocomplete
  const results = await searchAll({
    query: searchQuery,
    limit,
    types: ["destination", "category"],
  });

  return results;
}

export const searchService = {
  publicSearch,
  getSearchSuggestions,
  getFallbackResults,
  applyIntentBoost,
};
