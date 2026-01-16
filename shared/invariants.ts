/**
 * Platform Invariants - System-wide constants
 * 
 * These values define hard limits and constraints that MUST be enforced
 * across the entire platform (client, server, workers).
 * 
 * NEVER modify these without explicit approval and impact analysis.
 * Changing these values can break existing sessions, invalidate cached data,
 * or cause resource exhaustion.
 */

// Session limits
export const MAX_ENTITIES_PER_SESSION = 10;
export const MAX_INTENTS_PER_SESSION = 5;
export const SESSION_TTL_MS = 3600000; // 1 hour

// Content performance
export const HIGH_PERFORMING_SCORE = 80;

// Background job limits
export const MAX_CONCURRENT_BACKGROUND_JOBS = 2;

// Search and suggestions limits
export const MAX_SEARCH_RESULTS = 50;
export const MAX_CHAT_SUGGESTIONS = 10;

// Image engine enforcement - all image requests MUST go through Image Engine
export const IMAGE_ENGINE_ONLY = true;
export const IMAGE_TASK_MUST_USE_ENGINE = IMAGE_ENGINE_ONLY; // Alias for backwards compatibility

// Localization constraints - English is the canonical source for translations
export const CANONICAL_LOCALE = 'en';
export const SUPPORTED_LOCALES = [
  'en', 'ar', 'bn', 'de', 'es', 'fa', 'fil', 'fr', 'he', 
  'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'tr', 'ur', 'zh'
] as const;

// API rate limits
export const MAX_API_REQUESTS_PER_MINUTE = 60;
export const MAX_AI_REQUESTS_PER_HOUR = 100;

// Content limits
export const MAX_CONTENT_BLOCKS = 100;
export const MAX_GALLERY_IMAGES = 50;
export const MAX_FAQ_ITEMS = 30;

export const INVARIANTS = {
  MAX_ENTITIES_PER_SESSION,
  MAX_INTENTS_PER_SESSION,
  SESSION_TTL_MS,
  HIGH_PERFORMING_SCORE,
  MAX_CONCURRENT_BACKGROUND_JOBS,
  MAX_SEARCH_RESULTS,
  MAX_CHAT_SUGGESTIONS,
  IMAGE_ENGINE_ONLY,
  IMAGE_TASK_MUST_USE_ENGINE,
  CANONICAL_LOCALE,
  SUPPORTED_LOCALES,
  MAX_API_REQUESTS_PER_MINUTE,
  MAX_AI_REQUESTS_PER_HOUR,
  MAX_CONTENT_BLOCKS,
  MAX_GALLERY_IMAGES,
  MAX_FAQ_ITEMS,
} as const;

export type InvariantKey = keyof typeof INVARIANTS;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
