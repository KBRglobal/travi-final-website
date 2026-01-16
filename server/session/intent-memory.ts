/**
 * Intent Memory - Session-based User Intent & Entity Tracking
 * 
 * Makes the platform feel "aware" without storing PII.
 * Tracks entity views and chat intents for personalization.
 * 
 * HARD CONSTRAINTS:
 * - No PII storage (only entity IDs and intent types)
 * - Session-scoped only (ephemeral)
 * - Hard TTL: 1 hour expiry
 * - Max 10 entities, 5 intents per session
 */

export type EntityType = 'destination' | 'attraction' | 'hotel' | 'article' | 'category';
export type IntentType = 'browse' | 'compare' | 'plan' | 'learn';

export interface ViewedEntity {
  type: EntityType;
  id: string;
  timestamp: number;
}

export interface IntentMemory {
  entities: ViewedEntity[];
  intents: IntentType[];
}

interface StoredMemory {
  memory: IntentMemory;
  lastActivity: number;
}

const MAX_ENTITIES = 10;
const MAX_INTENTS = 5;
const TTL_MS = 60 * 60 * 1000; // 1 hour hard TTL

const memoryStore = new Map<string, StoredMemory>();

function createEmptyMemory(): IntentMemory {
  return {
    entities: [],
    intents: [],
  };
}

function pruneExpiredSessions(): void {
  const now = Date.now();
  const expiredIds: string[] = [];
  memoryStore.forEach((stored, sessionId) => {
    if (now - stored.lastActivity > TTL_MS) {
      expiredIds.push(sessionId);
    }
  });
  expiredIds.forEach((id) => memoryStore.delete(id));
}

// Only run background pruning when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== 'true' && process.env.REPLIT_DEPLOYMENT !== '1') {
  setInterval(pruneExpiredSessions, 5 * 60 * 1000);
}

function getOrCreateMemory(sessionId: string): StoredMemory {
  const now = Date.now();
  let stored = memoryStore.get(sessionId);
  
  if (!stored || now - stored.lastActivity > TTL_MS) {
    stored = {
      memory: createEmptyMemory(),
      lastActivity: now,
    };
    memoryStore.set(sessionId, stored);
  }
  
  stored.lastActivity = now;
  return stored;
}

/**
 * Record an entity view (destination, attraction, hotel, article, category)
 * Maintains FIFO queue with max 10 entities
 * 
 * @param sessionId - Session identifier
 * @param entityId - Entity ID (e.g., 'dubai', 'burj-khalifa')
 * @param entityType - Type of entity being viewed
 */
export function recordEntityView(
  sessionId: string,
  entityId: string,
  entityType: EntityType
): void {
  if (!sessionId || !entityType || !entityId) return;
  
  const stored = getOrCreateMemory(sessionId);
  const now = Date.now();
  
  const existing = stored.memory.entities.findIndex(
    (e) => e.type === entityType && e.id === entityId
  );
  if (existing !== -1) {
    stored.memory.entities.splice(existing, 1);
  }
  
  stored.memory.entities.push({
    type: entityType,
    id: entityId,
    timestamp: now,
  });
  
  if (stored.memory.entities.length > MAX_ENTITIES) {
    stored.memory.entities = stored.memory.entities.slice(-MAX_ENTITIES);
  }
}

/**
 * Record a chat intent (browse, compare, plan, learn)
 * Maintains FIFO queue with max 5 intents
 */
export function recordChatIntent(
  sessionId: string,
  intent: IntentType
): void {
  if (!sessionId || !intent) return;
  
  const stored = getOrCreateMemory(sessionId);
  
  stored.memory.intents.push(intent);
  
  if (stored.memory.intents.length > MAX_INTENTS) {
    stored.memory.intents = stored.memory.intents.slice(-MAX_INTENTS);
  }
}

/**
 * Get recent entities viewed by the session
 * Returns array of ViewedEntity with type and id (no PII)
 */
export function getRecentEntities(sessionId: string): ViewedEntity[] {
  if (!sessionId) return [];
  
  const stored = memoryStore.get(sessionId);
  if (!stored) return [];
  
  const now = Date.now();
  if (now - stored.lastActivity > TTL_MS) {
    memoryStore.delete(sessionId);
    return [];
  }
  
  stored.lastActivity = now;
  return [...stored.memory.entities];
}

/**
 * Get recent chat intents for the session (internal use)
 * Returns array of IntentType (browse, compare, plan, learn)
 */
export function getRecentChatIntents(sessionId: string): IntentType[] {
  if (!sessionId) return [];
  
  const stored = memoryStore.get(sessionId);
  if (!stored) return [];
  
  const now = Date.now();
  if (now - stored.lastActivity > TTL_MS) {
    memoryStore.delete(sessionId);
    return [];
  }
  
  stored.lastActivity = now;
  return [...stored.memory.intents];
}

/**
 * Get recent intents for personalization (public API)
 * Returns both entities viewed and chat intents
 * 
 * Used ONLY for:
 * - Ranking boost (not filtering)
 * - Suggestions (not required content)
 * 
 * @param sessionId - Session identifier
 * @returns Object with entities array and intents array
 */
export function getRecentIntents(sessionId: string): { 
  entities: ViewedEntity[]; 
  intents: IntentType[]; 
} {
  if (!sessionId) {
    return { entities: [], intents: [] };
  }
  
  const stored = memoryStore.get(sessionId);
  if (!stored) {
    return { entities: [], intents: [] };
  }
  
  const now = Date.now();
  if (now - stored.lastActivity > TTL_MS) {
    memoryStore.delete(sessionId);
    return { entities: [], intents: [] };
  }
  
  stored.lastActivity = now;
  return {
    entities: [...stored.memory.entities],
    intents: [...stored.memory.intents],
  };
}

/**
 * Get entity type frequencies for search boosting
 * Returns map of entity type to frequency count
 */
export function getEntityTypeFrequencies(
  sessionId: string
): Map<EntityType, number> {
  const entities = getRecentEntities(sessionId);
  const frequencies = new Map<EntityType, number>();
  
  for (const entity of entities) {
    const current = frequencies.get(entity.type) || 0;
    frequencies.set(entity.type, current + 1);
  }
  
  return frequencies;
}

/**
 * Get dominant intent for chat context
 * Returns the most frequent recent intent or 'browse' as default
 */
export function getDominantIntent(sessionId: string): IntentType {
  const intents = getRecentIntents(sessionId);
  if (intents.length === 0) return 'browse';
  
  const counts = new Map<IntentType, number>();
  for (const intent of intents) {
    const current = counts.get(intent) || 0;
    counts.set(intent, current + 1);
  }
  
  let dominant: IntentType = 'browse';
  let maxCount = 0;
  counts.forEach((count, intent) => {
    if (count > maxCount) {
      maxCount = count;
      dominant = intent;
    }
  });
  
  return dominant;
}

/**
 * Clear memory for a session
 */
export function clearIntentMemory(sessionId: string): void {
  memoryStore.delete(sessionId);
}

/**
 * Get active memory session count (for monitoring)
 */
export function getActiveMemoryCount(): number {
  pruneExpiredSessions();
  return memoryStore.size;
}

export const intentMemory = {
  recordEntityView,
  recordChatIntent,
  getRecentEntities,
  getRecentIntents,
  getRecentChatIntents,
  getEntityTypeFrequencies,
  getDominantIntent,
  clearIntentMemory,
  getActiveMemoryCount,
};
