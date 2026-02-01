/**
 * Unified Cognitive Layer (Stub)
 * Cognitive processing was simplified during cleanup.
 */

import type { 
  UnifiedIntentType,
  SearchResultForChat,
  SearchEnhancedChatContext 
} from '../../shared/intent-schema';

export interface UnifiedIntent {
  type: UnifiedIntentType;
  confidence: number;
  context?: string;
}

export interface EntitySuggestion {
  id: string;
  type: string;
  name: string;
  score: number;
}

export function getUnifiedIntent(message: string): UnifiedIntent {
  return {
    type: 'search' as UnifiedIntentType,
    confidence: 0.5,
  };
}

export function applySearchToChat(
  searchResults: SearchResultForChat[],
  context: SearchEnhancedChatContext
): SearchEnhancedChatContext {
  return context;
}

export function recordIntentSignal(
  sessionId: string,
  intentType: UnifiedIntentType,
  metadata?: Record<string, any>
): void {
  // Stub - no-op
}

export function getIntentBasedEntitySuggestions(
  intentType: UnifiedIntentType,
  limit: number = 5
): EntitySuggestion[] {
  return [];
}

export function describeSearchContextForChat(
  searchResults: SearchResultForChat[]
): string {
  return '';
}

export function syncSearchIntentToChat(
  searchQuery: string,
  intent: UnifiedIntentType
): void {
  // Stub - no-op
}

export function getIntentBoostForEntityType(
  entityType: string,
  intentType: UnifiedIntentType
): number {
  return 1.0;
}

export function getDominantUnifiedIntent(sessionId?: string): UnifiedIntentType {
  return 'search' as UnifiedIntentType;
}
