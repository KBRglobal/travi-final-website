/**
 * Session Utilities
 * Export all session management utilities
 */

export {
  type UserContext,
  getSessionContext,
  updateSessionContext,
  clearSessionContext,
  getActiveSessionCount,
} from "./user-context";

export {
  contextMiddleware,
  trackSearch,
  trackChat,
  trackPageVisit,
} from "./context-middleware";

export {
  type EntityType as IntentEntityType,
  type IntentType,
  type ViewedEntity,
  type IntentMemory,
  recordEntityView,
  recordChatIntent,
  getRecentEntities,
  getRecentIntents,
  getRecentChatIntents,
  getEntityTypeFrequencies,
  getDominantIntent,
  clearIntentMemory,
  getActiveMemoryCount,
  intentMemory,
} from "./intent-memory";
