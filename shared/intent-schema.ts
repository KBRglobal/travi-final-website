/**
 * Intent Schema - Unified Intent Types for Search ↔ Chat Symbiosis
 *
 * This module defines shared intent types that unify search and chat
 * into a single cognitive layer, enabling seamless context passing.
 *
 * INTENT TYPES:
 * - browse: User wants to explore/see destinations, hotels, attractions
 * - compare: User wants to compare two or more options
 * - plan: User wants help planning a trip
 * - learn: User wants information/knowledge about something
 * - search: User wants to find specific content (explicit search action)
 * - discover: User wants to find new/unexpected content (serendipity)
 */

/**
 * Unified intent types shared between search and chat
 * Extended with 'search' for explicit search actions and 'discover' for serendipity
 */
export type UnifiedIntentType = "browse" | "compare" | "plan" | "learn" | "search" | "discover";

/**
 * Source of the intent signal
 * - search: Intent detected from search query patterns
 * - chat: Intent detected from chat message analysis
 */
export type IntentSource = "search" | "chat";

/**
 * Intent signal interface for tracking intent across search and chat
 * Enables bi-directional context sharing between systems
 */
export interface IntentSignal {
  type: UnifiedIntentType;
  confidence: number;
  source: IntentSource;
  timestamp: number;
}

/**
 * Entity type for search/chat context
 */
export type EntityType = "destination" | "attraction" | "hotel" | "article" | "category";

/**
 * Viewed entity record for intent memory
 */
export interface ViewedEntity {
  type: EntityType;
  id: string;
  timestamp: number;
}

/**
 * Unified context passed between search and chat
 */
export interface UnifiedContext {
  intents: IntentSignal[];
  recentEntities: ViewedEntity[];
  dominantIntent: UnifiedIntentType;
}

/**
 * Search options that can be modified by intent
 */
export interface IntentAwareSearchOptions {
  query: string;
  limit?: number;
  types?: EntityType[];
  sessionId?: string;
  intent?: UnifiedIntentType;
  intentConfidence?: number;
}

/**
 * Chat context enhanced with search results
 */
export interface SearchEnhancedChatContext {
  page: string;
  entityId?: string;
  entityName?: string;
  searchResults?: SearchResultForChat[];
  intentSignals?: IntentSignal[];
}

/**
 * Simplified search result for chat context
 */
export interface SearchResultForChat {
  id: string;
  type: EntityType;
  title: string;
  slug: string;
  score: number;
}

/**
 * Intent boost configuration for search ranking
 * Defines how each intent type affects entity type weights
 */
export const INTENT_ENTITY_BOOSTS: Record<
  UnifiedIntentType,
  Partial<Record<EntityType, number>>
> = {
  browse: {
    destination: 1.3,
    attraction: 1.2,
    article: 1,
    hotel: 0.9,
    category: 1.1,
  },
  compare: {
    hotel: 1.4,
    destination: 1.3,
    attraction: 1.2,
    article: 1,
    category: 0.8,
  },
  plan: {
    destination: 1.4,
    attraction: 1.3,
    hotel: 1.3,
    article: 1.1,
    category: 0.9,
  },
  learn: {
    article: 1.5,
    destination: 1.2,
    attraction: 1.1,
    hotel: 0.8,
    category: 1,
  },
  search: {
    destination: 1.2,
    attraction: 1.2,
    hotel: 1.1,
    article: 1.1,
    category: 1,
  },
  discover: {
    destination: 1.2,
    attraction: 1.3,
    article: 1.2,
    hotel: 1,
    category: 1.1,
  },
};

/**
 * Entity reference schema with scoring for ranked suggestions
 */
export interface EntityReference {
  id: string;
  type: EntityType;
  slug: string;
  name: string;
  score: number;
  metadata?: {
    imageUrl?: string;
    description?: string;
  };
}

/**
 * Intent confidence schema for tracking intent reliability
 */
export interface IntentConfidence {
  type: UnifiedIntentType;
  confidence: number;
  source: IntentSource;
  factors: {
    keywordMatch: number;
    historyMatch: number;
    entityTypeMatch: number;
  };
}

/**
 * Search context for chat integration
 */
export interface SearchContext {
  query: string;
  results: EntityReference[];
  intentSignals: IntentSignal[];
  sessionId?: string;
}

/**
 * Calculate intent confidence from multiple factors
 */
export function calculateIntentConfidence(
  keywordMatch: number,
  historyMatch: number,
  entityTypeMatch: number
): number {
  const weights = { keyword: 0.5, history: 0.3, entityType: 0.2 };
  return Math.min(
    1,
    Math.max(
      0,
      keywordMatch * weights.keyword +
        historyMatch * weights.history +
        entityTypeMatch * weights.entityType
    )
  );
}

/**
 * Create a new intent signal
 */
export function createIntentSignal(
  type: UnifiedIntentType,
  confidence: number,
  source: IntentSource
): IntentSignal {
  return {
    type,
    confidence: Math.max(0, Math.min(1, confidence)),
    source,
    timestamp: Date.now(),
  };
}

/**
 * Check if an intent signal is still fresh (within TTL)
 * Default TTL: 30 minutes
 */
export function isIntentFresh(signal: IntentSignal, ttlMs: number = 30 * 60 * 1000): boolean {
  return Date.now() - signal.timestamp < ttlMs;
}

/**
 * Get the highest confidence intent from a list of signals
 */
export function getDominantIntentSignal(signals: IntentSignal[]): IntentSignal | null {
  if (signals.length === 0) return null;

  const freshSignals = signals.filter(s => isIntentFresh(s));
  if (freshSignals.length === 0) return null;

  return freshSignals.reduce(
    (dominant, current) => (current.confidence > dominant.confidence ? current : dominant),
    freshSignals[0]
  );
}

/**
 * Merge intent signals from different sources
 * Combines confidence scores and deduplicates by type
 */
export function mergeIntentSignals(signals: IntentSignal[]): IntentSignal[] {
  const byType = new Map<UnifiedIntentType, IntentSignal[]>();

  for (const signal of signals) {
    if (!isIntentFresh(signal)) continue;
    const existing = byType.get(signal.type) || [];
    existing.push(signal);
    byType.set(signal.type, existing);
  }

  const merged: IntentSignal[] = [];
  byType.forEach((typeSignals, type) => {
    const avgConfidence =
      typeSignals.reduce((sum, s) => sum + s.confidence, 0) / typeSignals.length;
    const latestTimestamp = Math.max(...typeSignals.map(s => s.timestamp));
    const hasSearchSource = typeSignals.some(s => s.source === "search");

    merged.push({
      type,
      confidence: avgConfidence,
      source: hasSearchSource ? "search" : "chat",
      timestamp: latestTimestamp,
    });
  });

  return merged.sort((a, b) => b.confidence - a.confidence);
}
