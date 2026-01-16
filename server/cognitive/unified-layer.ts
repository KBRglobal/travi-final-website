/**
 * Unified Cognitive Layer - Search ↔ Chat Symbiosis
 * 
 * This module unifies search and chat into a single cognitive layer,
 * enabling seamless context passing and intent-aware operations.
 * 
 * FUNCTIONS:
 * - getUnifiedIntent(sessionId): Get all intent signals for a session
 * - applyIntentToSearch(intent, searchOptions): Modify search based on intent
 * - applySearchToChat(searchResults, chatContext): Enhance chat with search results
 * 
 * HARD CONSTRAINTS:
 * - No PII storage (session-scoped only)
 * - Additive integration only (no breaking changes)
 * - All entity links validated via entity-resolver
 */

import { log } from '../lib/logger';
import {
  type UnifiedIntentType,
  type IntentSignal,
  type IntentSource,
  type EntityType,
  type IntentAwareSearchOptions,
  type SearchEnhancedChatContext,
  type SearchResultForChat,
  createIntentSignal,
  getDominantIntentSignal,
  mergeIntentSignals,
  isIntentFresh,
  INTENT_ENTITY_BOOSTS,
} from '../../shared/intent-schema';
import {
  getRecentChatIntents,
  getRecentEntities,
  getDominantIntent as getSessionDominantIntent,
  recordChatIntent,
  type IntentType,
} from '../session/intent-memory';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[UnifiedLayer] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.debug(`[UnifiedLayer] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[UnifiedLayer] ${msg}`, data),
};

const intentSignalStore = new Map<string, IntentSignal[]>();

const MAX_SIGNALS_PER_SESSION = 20;
const SIGNAL_TTL_MS = 30 * 60 * 1000;

function pruneExpiredSignals(): void {
  const now = Date.now();
  intentSignalStore.forEach((signals, sessionId) => {
    const freshSignals = signals.filter(s => now - s.timestamp < SIGNAL_TTL_MS);
    if (freshSignals.length === 0) {
      intentSignalStore.delete(sessionId);
    } else if (freshSignals.length !== signals.length) {
      intentSignalStore.set(sessionId, freshSignals);
    }
  });
}

// Only run background pruning when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== 'true' && process.env.REPLIT_DEPLOYMENT !== '1') {
  setInterval(pruneExpiredSignals, 5 * 60 * 1000);
}

/**
 * Record an intent signal from search or chat
 */
export function recordIntentSignal(
  sessionId: string,
  type: UnifiedIntentType,
  confidence: number,
  source: IntentSource
): void {
  if (!sessionId) return;

  const signal = createIntentSignal(type, confidence, source);
  
  let signals = intentSignalStore.get(sessionId) || [];
  signals.push(signal);
  
  if (signals.length > MAX_SIGNALS_PER_SESSION) {
    signals = signals.slice(-MAX_SIGNALS_PER_SESSION);
  }
  
  intentSignalStore.set(sessionId, signals);
  
  if (source === 'chat') {
    recordChatIntent(sessionId, type as IntentType);
  }
  
  logger.debug('Recorded intent signal', {
    sessionId: sessionId.substring(0, 8) + '...',
    type,
    confidence,
    source,
  });
}

/**
 * Get all unified intent signals for a session
 * Combines signals from both search and chat sources
 * 
 * @param sessionId - The session identifier
 * @returns Array of IntentSignal objects, sorted by confidence
 */
export function getUnifiedIntent(sessionId: string): IntentSignal[] {
  if (!sessionId) return [];

  const storedSignals = intentSignalStore.get(sessionId) || [];
  
  const recentChatIntents = getRecentChatIntents(sessionId);
  const chatSignals: IntentSignal[] = recentChatIntents.map((intentType, index) => ({
    type: intentType as UnifiedIntentType,
    confidence: 0.7 - (index * 0.1),
    source: 'chat' as IntentSource,
    timestamp: Date.now() - (index * 60000),
  }));
  
  const allSignals = [...storedSignals, ...chatSignals];
  
  const mergedSignals = mergeIntentSignals(allSignals);
  
  logger.debug('Retrieved unified intent', {
    sessionId: sessionId.substring(0, 8) + '...',
    signalCount: mergedSignals.length,
    dominantIntent: mergedSignals[0]?.type || 'none',
  });
  
  return mergedSignals;
}

/**
 * Get the dominant intent for a session
 * Returns the highest confidence intent or 'browse' as default
 */
export function getDominantUnifiedIntent(sessionId: string): UnifiedIntentType {
  const signals = getUnifiedIntent(sessionId);
  const dominant = getDominantIntentSignal(signals);
  return dominant?.type || 'browse';
}

/**
 * Apply intent to search options
 * Modifies search ranking weights based on detected intent
 * 
 * @param intent - The detected intent type
 * @param searchOptions - Original search options
 * @returns Modified search options with intent-aware ranking
 */
export function applyIntentToSearch(
  intent: UnifiedIntentType | null,
  searchOptions: IntentAwareSearchOptions
): IntentAwareSearchOptions {
  if (!intent) {
    return searchOptions;
  }

  const enhancedOptions: IntentAwareSearchOptions = {
    ...searchOptions,
    intent,
    intentConfidence: 0.8,
  };

  const boosts = INTENT_ENTITY_BOOSTS[intent];
  if (boosts && searchOptions.types) {
    const sortedTypes = [...searchOptions.types].sort((a, b) => {
      const boostA = boosts[a] || 1.0;
      const boostB = boosts[b] || 1.0;
      return boostB - boostA;
    });
    enhancedOptions.types = sortedTypes;
  }

  logger.debug('Applied intent to search', {
    intent,
    originalTypes: searchOptions.types,
    enhancedTypes: enhancedOptions.types,
  });

  return enhancedOptions;
}

/**
 * Calculate intent-based boost multiplier for a specific entity type
 * Used by search ranking to adjust scores based on intent
 */
export function getIntentBoostForEntityType(
  intent: UnifiedIntentType | null,
  entityType: EntityType
): number {
  if (!intent) return 1.0;
  
  const boosts = INTENT_ENTITY_BOOSTS[intent];
  return boosts?.[entityType] || 1.0;
}

/**
 * Apply search results to chat context
 * Enhances chat context with relevant search results for better suggestions
 * 
 * @param searchResults - Results from search service
 * @param chatContext - Original chat context
 * @returns Enhanced chat context with search results
 */
export function applySearchToChat(
  searchResults: SearchResultForChat[],
  chatContext: SearchEnhancedChatContext,
  sessionId?: string
): SearchEnhancedChatContext {
  const intentSignals = sessionId ? getUnifiedIntent(sessionId) : [];
  
  const enhancedContext: SearchEnhancedChatContext = {
    ...chatContext,
    searchResults: searchResults.slice(0, 5),
    intentSignals: intentSignals.slice(0, 3),
  };

  logger.debug('Applied search to chat', {
    searchResultCount: searchResults.length,
    includedResults: enhancedContext.searchResults?.length || 0,
    intentSignalCount: intentSignals.length,
  });

  return enhancedContext;
}

/**
 * Build search context description for chat prompts
 * Creates a natural language description of search context
 */
export function describeSearchContextForChat(
  searchResults: SearchResultForChat[],
  intentSignals: IntentSignal[]
): string {
  if (searchResults.length === 0 && intentSignals.length === 0) {
    return '';
  }

  const parts: string[] = [];

  if (intentSignals.length > 0) {
    const dominant = intentSignals[0];
    parts.push(`User's current intent appears to be: ${dominant.type} (confidence: ${(dominant.confidence * 100).toFixed(0)}%)`);
  }

  if (searchResults.length > 0) {
    const resultTypes = new Map<EntityType, number>();
    searchResults.forEach(r => {
      resultTypes.set(r.type, (resultTypes.get(r.type) || 0) + 1);
    });
    
    const typeDescriptions: string[] = [];
    resultTypes.forEach((count, type) => {
      typeDescriptions.push(`${count} ${type}${count > 1 ? 's' : ''}`);
    });
    
    parts.push(`Recent search context includes: ${typeDescriptions.join(', ')}`);
    
    const topResults = searchResults.slice(0, 3).map(r => r.title);
    if (topResults.length > 0) {
      parts.push(`Top results: ${topResults.join(', ')}`);
    }
  }

  return parts.join('\n');
}

/**
 * Get entity suggestions based on unified intent
 * Returns recommended entity types for suggestions
 */
export function getIntentBasedEntitySuggestions(
  intent: UnifiedIntentType
): EntityType[] {
  switch (intent) {
    case 'browse':
      return ['destination', 'attraction', 'category'];
    case 'compare':
      return ['hotel', 'destination', 'attraction'];
    case 'plan':
      return ['destination', 'hotel', 'attraction', 'article'];
    case 'learn':
      return ['article', 'destination', 'attraction'];
    case 'search':
      return ['destination', 'attraction', 'hotel', 'article'];
    case 'discover':
      return ['destination', 'attraction', 'article'];
    default:
      return ['destination', 'attraction', 'article'];
  }
}

/**
 * Detect intent from search query patterns
 * Lightweight pattern matching for search queries
 */
export function detectIntentFromSearchQuery(query: string): IntentSignal | null {
  if (!query || query.trim().length < 2) return null;
  
  const normalizedQuery = query.toLowerCase().trim();
  
  // Compare intent - comparing options
  if (/\bvs\b|versus|compare|difference|better|which\s+(is|one)/i.test(normalizedQuery)) {
    return createIntentSignal('compare', 0.85, 'search');
  }
  
  // Plan intent - trip planning
  if (/\d+\s+days?|\bitinerary\b|trip\s+to|plan\s+(a|my)|vacation|holiday/i.test(normalizedQuery)) {
    return createIntentSignal('plan', 0.8, 'search');
  }
  
  // Learn intent - informational queries
  if (/\bwhat\s+(is|are)\b|\bhow\s+(do|does|to)\b|history|culture|about|learn/i.test(normalizedQuery)) {
    return createIntentSignal('learn', 0.75, 'search');
  }
  
  // Search intent - explicit search action
  if (/\bsearch\b|find\s+(me\s+)?|looking\s+for|where\s+(can|is|are)/i.test(normalizedQuery)) {
    return createIntentSignal('search', 0.75, 'search');
  }
  
  // Discover intent - serendipitous exploration
  if (/\bdiscover\b|hidden|secret|unique|unusual|surprise/i.test(normalizedQuery)) {
    return createIntentSignal('discover', 0.7, 'search');
  }
  
  // Browse intent - general exploration
  if (/\bshow\b|explore|best|top\s+\d*|recommend/i.test(normalizedQuery)) {
    return createIntentSignal('browse', 0.7, 'search');
  }
  
  return createIntentSignal('browse', 0.5, 'search');
}

/**
 * Sync intent from search to chat
 * Records search-detected intent for chat context awareness
 */
export function syncSearchIntentToChat(
  sessionId: string,
  query: string
): IntentSignal | null {
  const signal = detectIntentFromSearchQuery(query);
  
  if (signal && sessionId) {
    recordIntentSignal(sessionId, signal.type, signal.confidence, 'search');
    
    logger.debug('Synced search intent to chat', {
      sessionId: sessionId.substring(0, 8) + '...',
      query: query.substring(0, 30) + '...',
      intent: signal.type,
      confidence: signal.confidence,
    });
  }
  
  return signal;
}

/**
 * Get ranked suggestions based on entities and search context
 * Used by chat to provide intent-aware entity suggestions
 * 
 * @param entities - Array of entities to rank
 * @param searchContext - Current search context with query and intent
 * @returns Ranked and filtered entity suggestions
 */
export function getRankedSuggestions(
  entities: Array<{ id: string; type: EntityType; name: string; slug: string; score?: number }>,
  searchContext: { query?: string; intentSignals?: IntentSignal[]; sessionId?: string }
): Array<{ id: string; type: EntityType; name: string; slug: string; score: number }> {
  if (!entities.length) {
    return [];
  }

  const { query, intentSignals = [], sessionId } = searchContext;
  
  // Get intent signals from session if not provided
  const activeIntents = intentSignals.length > 0 
    ? intentSignals 
    : (sessionId ? getUnifiedIntent(sessionId) : []);

  // Get dominant intent for boosting
  const dominantSignal = getDominantIntentSignal(activeIntents);
  const dominantIntent = dominantSignal?.type || 'browse';

  // Calculate scores for each entity
  const scoredEntities = entities.map(entity => {
    let score = entity.score ?? 1.0;
    
    // Apply intent-based entity type boost
    const intentBoost = INTENT_ENTITY_BOOSTS[dominantIntent]?.[entity.type] || 1.0;
    score *= intentBoost;
    
    // Apply query relevance boost if query provided
    if (query) {
      const queryLower = query.toLowerCase();
      const nameLower = entity.name.toLowerCase();
      
      if (nameLower === queryLower) {
        score *= 2.0;
      } else if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
        score *= 1.5;
      }
    }

    return {
      id: entity.id,
      type: entity.type,
      name: entity.name,
      slug: entity.slug,
      score,
    };
  });

  // Sort by score descending
  return scoredEntities.sort((a, b) => b.score - a.score);
}

/**
 * Process an intent-aware query
 * Single entry point for unified search and chat intent coordination
 * 
 * @param sessionId - Session identifier
 * @param query - Search/chat query
 * @param source - Source of the query ('search' | 'chat')
 * @returns Unified intent context for processing
 */
export function processIntentAwareQuery(
  sessionId: string,
  query: string,
  source: IntentSource
): {
  dominantIntent: UnifiedIntentType;
  intentSignals: IntentSignal[];
  suggestedEntityTypes: EntityType[];
  queryIntent: IntentSignal | null;
} {
  // Detect intent from the query
  const queryIntent = detectIntentFromSearchQuery(query);
  
  // Record the detected intent
  if (queryIntent && sessionId) {
    recordIntentSignal(sessionId, queryIntent.type, queryIntent.confidence, source);
  }
  
  // Get all unified intent signals
  const intentSignals = getUnifiedIntent(sessionId);
  
  // Get dominant intent
  const dominantIntent = getDominantUnifiedIntent(sessionId);
  
  // Get suggested entity types based on intent
  const suggestedEntityTypes = getIntentBasedEntitySuggestions(dominantIntent);
  
  logger.debug('Processed intent-aware query', {
    sessionId: sessionId.substring(0, 8) + '...',
    query: query.substring(0, 30) + (query.length > 30 ? '...' : ''),
    source,
    dominantIntent,
    queryIntentType: queryIntent?.type,
    signalCount: intentSignals.length,
  });
  
  return {
    dominantIntent,
    intentSignals,
    suggestedEntityTypes,
    queryIntent,
  };
}

export const unifiedCognitiveLayer = {
  recordIntentSignal,
  getUnifiedIntent,
  getDominantUnifiedIntent,
  applyIntentToSearch,
  applySearchToChat,
  getIntentBoostForEntityType,
  getIntentBasedEntitySuggestions,
  detectIntentFromSearchQuery,
  syncSearchIntentToChat,
  describeSearchContextForChat,
  getRankedSuggestions,
  processIntentAwareQuery,
};
