/**
 * User Context & Memory (Lightweight)
 * Session-based personalization without PII storage
 * 
 * HARD CONSTRAINTS:
 * - No PII storage (no emails, names, IPs)
 * - Session-based only (ephemeral)
 * - Lightweight in-memory storage
 * - Max 10 items per list
 * - 1-hour expiry
 */

export interface UserContext {
  lastSearches: string[];
  lastChats: string[];
  visitedPages: string[];
}

interface StoredContext {
  context: UserContext;
  lastActivity: number;
}

const MAX_ITEMS_PER_LIST = 10;
const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const contextStore = new Map<string, StoredContext>();

function createEmptyContext(): UserContext {
  return {
    lastSearches: [],
    lastChats: [],
    visitedPages: [],
  };
}

function pruneExpiredSessions(): void {
  const now = Date.now();
  const expiredIds: string[] = [];
  contextStore.forEach((stored, sessionId) => {
    if (now - stored.lastActivity > SESSION_EXPIRY_MS) {
      expiredIds.push(sessionId);
    }
  });
  expiredIds.forEach((id) => contextStore.delete(id));
}

// Only run background pruning when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== 'true' && process.env.REPLIT_DEPLOYMENT !== '1') {
  setInterval(pruneExpiredSessions, 5 * 60 * 1000);
}

export function getSessionContext(sessionId: string): UserContext {
  const stored = contextStore.get(sessionId);
  
  if (!stored) {
    return createEmptyContext();
  }
  
  const now = Date.now();
  if (now - stored.lastActivity > SESSION_EXPIRY_MS) {
    contextStore.delete(sessionId);
    return createEmptyContext();
  }
  
  stored.lastActivity = now;
  return { ...stored.context };
}

function enforceFifoLimit(arr: string[], maxItems: number): string[] {
  if (arr.length > maxItems) {
    return arr.slice(-maxItems);
  }
  return arr;
}

export function updateSessionContext(
  sessionId: string,
  update: Partial<UserContext>
): void {
  const now = Date.now();
  let stored = contextStore.get(sessionId);
  
  if (!stored || now - stored.lastActivity > SESSION_EXPIRY_MS) {
    stored = {
      context: createEmptyContext(),
      lastActivity: now,
    };
  }
  
  if (update.lastSearches !== undefined) {
    const combined = [...stored.context.lastSearches, ...update.lastSearches];
    stored.context.lastSearches = enforceFifoLimit(combined, MAX_ITEMS_PER_LIST);
  }
  
  if (update.lastChats !== undefined) {
    const combined = [...stored.context.lastChats, ...update.lastChats];
    stored.context.lastChats = enforceFifoLimit(combined, MAX_ITEMS_PER_LIST);
  }
  
  if (update.visitedPages !== undefined) {
    const combined = [...stored.context.visitedPages, ...update.visitedPages];
    stored.context.visitedPages = enforceFifoLimit(combined, MAX_ITEMS_PER_LIST);
  }
  
  stored.lastActivity = now;
  contextStore.set(sessionId, stored);
}

export function clearSessionContext(sessionId: string): void {
  contextStore.delete(sessionId);
}

export function getActiveSessionCount(): number {
  pruneExpiredSessions();
  return contextStore.size;
}
