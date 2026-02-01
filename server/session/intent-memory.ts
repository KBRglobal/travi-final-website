/**
 * Intent Memory (Stub)
 * Session intent tracking was simplified during cleanup.
 */

export type IntentType = 
  | 'search'
  | 'browse'
  | 'book'
  | 'explore'
  | 'compare'
  | 'plan'
  | 'navigate'
  | 'other';

export interface IntentRecord {
  type: IntentType;
  timestamp: Date;
  context?: string;
}

export function recordChatIntent(
  sessionId: string,
  intentType: IntentType,
  context?: string
): IntentRecord {
  return {
    type: intentType,
    timestamp: new Date(),
    context,
  };
}

export function getDominantIntent(sessionId: string): IntentType {
  return 'explore';
}

export function getRecentIntents(sessionId: string, limit: number = 10): IntentRecord[] {
  return [];
}

export interface EntityTypeFrequencies {
  [entityType: string]: number;
}

export function getEntityTypeFrequencies(sessionId?: string): EntityTypeFrequencies {
  return {};
}
