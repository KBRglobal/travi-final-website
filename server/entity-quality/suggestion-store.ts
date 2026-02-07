/**
 * Entity Quality: Dedup Scanner - Suggestion Store
 * Storage and management of merge suggestions
 */

import { ENTITY_QUALITY_CONFIG } from "./config";
import type { MergeSuggestion, SuggestionQueryOptions, EntityType } from "./types";

// In-memory storage (bounded)
const suggestions: MergeSuggestion[] = [];
const maxSize = ENTITY_QUALITY_CONFIG.maxSuggestionsStored;

// ============================================================================
// Helpers
// ============================================================================

function enforceMaxSize(): void {
  while (suggestions.length > maxSize) {
    // Remove oldest non-open suggestions first
    const closedIndex = suggestions.findIndex(s => s.status !== "open");
    if (closedIndex >= 0) {
      suggestions.splice(closedIndex, 1);
    } else {
      suggestions.shift();
    }
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

export function addSuggestions(newSuggestions: MergeSuggestion[]): number {
  for (const suggestion of newSuggestions) {
    // Check for existing suggestion with same pair
    const exists = suggestions.some(
      s =>
        (s.primaryEntity.id === suggestion.primaryEntity.id &&
          s.duplicateEntity.id === suggestion.duplicateEntity.id) ||
        (s.primaryEntity.id === suggestion.duplicateEntity.id &&
          s.duplicateEntity.id === suggestion.primaryEntity.id)
    );

    if (!exists) {
      suggestions.push(suggestion);
    }
  }

  enforceMaxSize();
  return newSuggestions.length;
}

export function getSuggestionById(id: string): MergeSuggestion | null {
  return suggestions.find(s => s.id === id) || null;
}

export function querySuggestions(options?: SuggestionQueryOptions): MergeSuggestion[] {
  let result = [...suggestions];

  if (options?.entityType) {
    result = result.filter(s => s.entityType === options.entityType);
  }

  if (options?.status) {
    result = result.filter(s => s.status === options.status);
  }

  if (options?.minConfidence) {
    result = result.filter(s => s.confidenceScore >= options.minConfidence);
  }

  // Sort by confidence descending
  result.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const offset = options?.offset || 0;
  const limit = options?.limit || 50;

  return result.slice(offset, offset + limit);
}

export function ignoreSuggestion(id: string, actorId: string): MergeSuggestion | null {
  const suggestion = suggestions.find(s => s.id === id);
  if (!suggestion) return null;

  suggestion.status = "ignored";
  suggestion.ignoredBy = actorId;
  suggestion.ignoredAt = new Date();
  suggestion.updatedAt = new Date();

  return suggestion;
}

export function markAsMerged(id: string, actorId: string): MergeSuggestion | null {
  const suggestion = suggestions.find(s => s.id === id);
  if (!suggestion) return null;

  suggestion.status = "merged";
  suggestion.mergedBy = actorId;
  suggestion.mergedAt = new Date();
  suggestion.updatedAt = new Date();

  return suggestion;
}

// ============================================================================
// Statistics
// ============================================================================

export function getSuggestionStats(): {
  total: number;
  open: number;
  ignored: number;
  merged: number;
  byEntityType: Partial<Record<EntityType, number>>;
} {
  const byStatus = { open: 0, ignored: 0, merged: 0 };
  const byEntityType: Partial<Record<EntityType, number>> = {};

  for (const suggestion of suggestions) {
    byStatus[suggestion.status]++;
    byEntityType[suggestion.entityType] = (byEntityType[suggestion.entityType] || 0) + 1;
  }

  return {
    total: suggestions.length,
    ...byStatus,
    byEntityType,
  };
}

export function getOpenCount(): number {
  return suggestions.filter(s => s.status === "open").length;
}

// ============================================================================
// Clear (for testing)
// ============================================================================

export function clearAllSuggestions(): void {
  suggestions.length = 0;
}
