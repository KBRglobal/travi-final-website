// Stub - Cognitive Unified Layer disabled
import type { UnifiedIntentType } from "../../shared/intent-schema";

export function syncSearchIntentToChat(_query: string, _intent?: UnifiedIntentType): void {}

export function getIntentBoostForEntityType(
  _intent: UnifiedIntentType | string,
  _entityType?: string
): number {
  return 1.0;
}

export function getDominantUnifiedIntent(_sessionId?: string): UnifiedIntentType | null {
  return null;
}

export function getUnifiedContext() {
  return null;
}

export function enhanceQuery(query: string) {
  return query;
}

export function getRelatedConcepts() {
  return [];
}

export function expandQuery(query: string) {
  return [query];
}
