/**
 * Media Intelligence v2
 *
 * Production-grade media scoring, remediation, and AI alt text generation.
 *
 * Feature flags:
 * - ENABLE_MEDIA_INTELLIGENCE=true (main toggle)
 * - ENABLE_MEDIA_ALT_AI=true (AI-powered alt text)
 * - ENABLE_MEDIA_AUTO_APPLY=true (auto-apply high-confidence suggestions)
 * - ENABLE_MEDIA_DESTRUCTIVE_OPS=true (allow delete operations)
 *
 * Environment:
 * - MEDIA_CACHE_SIZE=5000 (max cached assets)
 * - MEDIA_CACHE_TTL=600000 (cache TTL in ms, default 10 min)
 * - MEDIA_ALT_AI_RATE_LIMIT=30 (max AI requests per minute)
 * - MEDIA_ALT_AI_TIMEOUT=10000 (AI call timeout in ms)
 */

// Types
export {
  isMediaIntelligenceEnabled,
  isAltAIEnabled,
  isAutoApplyEnabled,
  isDestructiveOpsEnabled,
} from './types-v2';

export type {
  IssueSeverity,
  MediaGrade,
  PlacementRole,
  IssueType,
  AssetClassifier,
  ContentLinkage,
  PerformanceSignals,
  MediaAssetV2,
  MediaIssue,
  RemediationRecommendation,
  MediaQualityScore,
  ContentMediaFitness,
  BatchScanRequest,
  BatchScanResult,
  ScanJobStatus,
  AltTextSuggestionV2,
  RemediationActionRequest,
  RemediationActionResult,
  MediaStatsV2,
  ScoringWeights,
} from './types-v2';

// LRU Cache
export { LRUCache } from './lru-cache';

// Scoring Engine
export {
  scoreMediaAsset,
  scoreToGrade,
  assessAltTextQuality,
  detectPlacementRole,
  calculateSimpleHash,
} from './scoring-engine';

// Asset Manager
export {
  registerAsset,
  getAsset,
  trackAssetUsage,
  updatePerformanceSignals,
  scoreAsset,
  batchScanAssets,
  createScanJob,
  getScanJobStatus,
  getWorstAssets,
  getOrphanedAssets,
  findDuplicates,
  getAssetsMissingAlt,
  storeAltSuggestion,
  getAltSuggestion,
  applyAltSuggestion,
  getMediaStatsV2,
  clearCaches,
  getCacheStats,
  pruneCaches,
} from './asset-manager';

// Alt Generator
export {
  generateAltText,
  batchGenerateAltText,
  getAltGenerationStats,
} from './alt-generator';

// Remediation
export {
  executeRemediation,
  batchRemediate,
  getRemediationPlan,
  generateConfirmToken,
} from './remediation';

// Routes
export { mediaIntelligenceRoutesV2 } from './routes-v2';
