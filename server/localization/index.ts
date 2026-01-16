/**
 * Localization Module - Multi-Language Strategy
 * 
 * Central export for all localization functionality including:
 * - Canonical rules (English as source of truth)
 * - Translation freshness checking
 * - Locale fallback hierarchy
 * - Translation queue management
 * - AEO generation
 */

export {
  CANONICAL_LOCALE,
  getCanonicalContent,
  computeCanonicalHash,
  validateTranslationChain,
  enforceCanonicalSource,
  isCanonicalLocale,
  getTranslatableFields,
  type CanonicalContent,
  type CanonicalValidation,
} from './canonical-rules';

export {
  checkTranslationFreshness,
  checkAllTranslationsFreshness,
  findStaleTranslations,
  getFreshnessSummary,
  type FreshnessResult,
  type BatchFreshnessResult,
} from './freshness-checker';

export {
  resolveLocale,
  resolveLocalesBatch,
  getFallbackChain,
  getLocaleFallback,
  isValidLocale,
  getLocaleAvailability,
  type LocaleResolution,
  type ResolvedContent,
} from './fallback-hierarchy';

export {
  enqueueTranslationJobs,
  getQueueStatus,
  getJobsForContent,
  getJobsByStatus,
  retryJob,
  cancelJob,
  startQueue,
  stopQueue,
  manualPause,
  resumeQueue,
  computeSourceHash,
  QUEUE_CONFIG,
} from './translation-queue';

export {
  generateFullAeo,
  calculateAeoScore,
} from './aeo-generator';

export {
  onContentStatusChange,
  triggerHooksManually,
  batchProcessPublishedContent,
  updateSearchIndex,
} from './publish-hooks';
