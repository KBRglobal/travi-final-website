/**
 * Octopus Engine - Content Generation System
 * Transform research documents into comprehensive travel content
 *
 * The Octopus Engine processes research documents (PDF/Word) and generates:
 * - Entity pages (hotels, restaurants, attractions, neighborhoods)
 * - Articles (listicles, comparisons, guides, itineraries)
 * - SEO and AEO optimized content
 *
 * Pipeline:
 * 1. Document Parsing - Extract text from PDF/Word files
 * 2. Entity Extraction - AI-powered entity identification
 * 3. Google Maps Enrichment - GPS, ratings, photos, reviews
 * 4. Web Search Enrichment - Additional data from web
 * 5. Page Generation - Individual entity pages
 * 6. Article Generation - Aggregated content articles
 */

// Document Parser
export {
  parseDocument,
  parseDocumentBuffer,
  getDocumentStats,
  type ParsedDocument,
  type DocumentSection,
  type DocumentMetadata,
  type ParseOptions,
} from './document-parser';

// Entity Extraction
export {
  extractEntities,
  getExtractionStats,
  type ExtractionResult,
  type ExtractionOptions,
  type ExtractedEntity,
  type HotelEntity,
  type RestaurantEntity,
  type AttractionEntity,
  type NeighborhoodEntity,
  type EntityType,
  type EntityLocation,
} from './entity-extractor';

// Google Maps Enrichment
export {
  enrichWithGoogleMaps,
  batchEnrichWithGoogleMaps,
  getNearbyPlaces,
  isGoogleMapsConfigured,
  getEnrichmentStats,
  type EnrichedEntity,
  type PlaceDetails,
  type PlacePhoto,
  type PlaceReview,
  type EnrichmentResult,
  type EnrichmentOptions,
} from './google-maps-enricher';

// Web Search Enrichment
export {
  enrichWithWebSearch,
  isWebSearchConfigured,
  getWebEnrichmentStats,
  type WebEnrichedEntity,
  type WebEnrichedData,
  type WebEnrichmentResult,
  type WebEnrichmentOptions,
  type WebSearchResult,
  type ReviewSummary,
  type PriceInfo,
} from './web-search-enricher';

// Content Page Generators
export {
  generateContentPages,
  getGenerationStats,
  type GeneratedPage,
  type PageContent,
  type PageMetadata,
  type SEOData,
  type AEOData,
  type GenerationOptions,
  type BatchGenerationResult,
} from './content-generators';

// Article Generators
export {
  generateAllArticles,
  generateListicle,
  generateComparison,
  generateNeighborhoodGuide,
  generateDestinationGuide,
  generateFoodGuide,
  generateItinerary,
  getArticleStats,
  type GeneratedArticle,
  type ArticleType,
  type ArticleContent,
  type ArticleMetadata,
  type ArticleSEO,
  type ArticleAEO,
  type ArticleGenerationOptions,
} from './article-generators';

// Orchestrator
export {
  startProcessingJob,
  startProcessingJobFromFile,
  getJob,
  getAllJobs,
  deleteJob,
  getOctopusStats,
  getOctopusCapabilities,
  startJobWatchdog,
  stopJobWatchdog,
  initializeQueueSystem,
  shutdownQueueSystem,
  getQueueStatus,
  startQueuedJob,
  TIMEOUT_CONFIG,
  JobTimeoutError,
  type OctopusJob,
  type JobStatus,
  type JobInput,
  type JobProgress,
  type OctopusOptions,
  type OctopusResult,
  type OctopusStats,
} from './orchestrator';

// Queue Manager
export {
  QueueManager,
  type QueueTask,
  type QueueStage,
  type QueueStats,
  type ConcurrencyConfig,
} from './queue-manager';

// API Routes
export { default as octopusRoutes } from './routes';

// ============================================================================
// Enhanced Research Processing (TRAVI Upgrade)
// ============================================================================

// Research Document Parser - Hebrew structured documents
export {
  parseResearchDocument,
  getResearchStats,
  type ParsedResearch,
  type DestinationOverview,
  type HotelData,
  type AttractionData,
  type RestaurantData,
  type FreeActivityData,
  type LocalLawData,
  type PracticalInfo,
  type NeighborhoodData,
} from './research-parser';

// Auto Tagger - Automatic content tagging for website sections
export {
  tagAllEntities,
  getTagsByType,
  getEntitiesBySection,
  generateSitemap,
  WEBSITE_SECTIONS,
  type ContentTag,
  type TaggedEntity,
  type WebsiteSection,
} from './auto-tagger';

// Bulk Generator - Maximum content generation plans
export {
  generateContentPlan,
  getContentPlanStats,
  exportSitemap as exportContentSitemap,
  type ContentPlan,
  type EntityPagePlan,
  type ArticlePagePlan,
  type ListingPagePlan,
  type GuidePagePlan,
  type ComparisonPagePlan,
  type ArticleType as BulkArticleType,
} from './bulk-generator';

// Content Templates - Hebrew content generation
export {
  generateHotelPageContent,
  generateRestaurantPageContent,
  generateAttractionPageContent,
  generateTopListArticle,
  generateItineraryArticle,
  generateNeighborhoodGuide as generateNeighborhoodGuideFromTemplate,
  generateAllContent,
  getContentStats,
  type GeneratedContent as TemplateGeneratedContent,
  type ContentSection,
  type ContentMetadata,
  type SEOContent,
  type AEOContent,
  type ContentType as TemplateContentType,
} from './content-templates';

// ============================================================================
// AEO Optimization Layer (SEO/AEO Upgrade)
// ============================================================================

// AEO Optimizer - FAQ, Quick Answer, Featured Snippets
export {
  detectQuestionType,
  getOptimalFormat,
  generateQuickAnswer,
  formatForFeaturedSnippet,
  generateWorthItSnippet,
  generateFAQSection,
  generateFAQSchema,
  generateComparisonTable,
  optimizeForAEO,
  getAEOStats,
  type QuickAnswer,
  type FAQItem,
  type FAQSection,
  type FeaturedSnippetContent,
  type QuestionType,
  type ComparisonTable,
  type AEOOptimizedContent,
} from './aeo-optimizer';

// Schema Generator - Full Schema.org markup
export {
  generateHotelSchema,
  generateRestaurantSchema,
  generateAttractionSchema,
  generateEventSchema,
  generateHowToSchema,
  generateTouristTripSchema,
  generateFAQPageSchema,
  generateBreadcrumbSchema,
  generateBreadcrumbsFromPath,
  generateItemListSchema,
  generatePlaceSchema,
  generatePageSchemas,
  validateSchema,
  generateBreadcrumbHTML,
  generateJsonLdScript,
  type SchemaMarkup,
  type BreadcrumbItem,
  type HotelSchemaData,
  type RestaurantSchemaData,
  type AttractionSchemaData,
  type EventSchemaData,
  type HowToSchemaData,
  type TouristTripSchemaData,
  type FAQSchemaItem,
  type CombinedSchemas,
} from './schema-generator';

// Internal Linker - Geographic proximity based linking
export {
  generateInternalLinks,
  generateLinkHTML,
  generateRelatedContentHTML,
  generateBreadcrumbHTML as generateLinkBreadcrumbHTML,
  insertContentLinks,
  generateBulkInternalLinks,
  getLinkingStats,
  type LinkableEntity,
  type InternalLink,
  type LinkingPlan,
  type LinkingConfig,
} from './internal-linker';

// PAA Researcher - Serper integration for People Also Ask
export {
  isSerperConfigured,
  getPAAQuestions,
  researchEntityKeywords,
  batchResearchKeywords,
  generateCommonQuestions,
  analyzeCompetitorSnippet,
  performFullKeywordResearch,
  getPAAResearchStats,
  type SerperSearchResult,
  type SerperPAAResult,
  type PAAQuestion,
  type KeywordResearch,
  type FullKeywordResearch,
} from './paa-researcher';

// ============================================================================
// Content Factory - Self-Sustaining Content Engine
// ============================================================================

// Content Multiplier - Generate ALL possible content from entities
export {
  multiplyContent,
  getNextTasks,
  getTasksByTier,
  getImmediateTasks,
  getDraftTasks,
  type ContentTask,
  type ContentType,
  type ContentPriority,
  type PublishTier,
  type MultiplicationResult,
  type MultiplicationConfig,
} from './content-multiplier';

// Content Factory - The main orchestrator (infinite content loop)
export {
  ContentFactory,
  getContentFactory,
  resetContentFactory,
  type FactoryConfig,
  type FactoryState,
  type FactoryError,
  type GeneratedContent,
  type FactoryStats,
} from './content-factory';

// Engine Optimizer - Smart model routing (cheap vs expensive)
export {
  determineEngineTier,
  optimizeBatch,
  detectAvailableProviders,
  getEngineStats,
  resetEngineStats,
  generateCostReport,
  applyProfile,
  runQACheck,
  OPTIMIZATION_PROFILES,
  type EngineTier,
  type TaskType,
  type ModelConfig,
  type EngineDecision,
  type TaskRequest,
  type EngineStats,
  type OptimizationProfile,
  type QAStatus,
} from './engine-optimizer';

// Localizer - One-click 17 language translation
export {
  localizeToAllLanguages,
  translateContent,
  batchLocalize,
  getSupportedLanguages,
  getEnabledLanguages,
  getRTLLanguages,
  setLanguageEnabled,
  getLocalizationStats,
  generateHreflangTags,
  getLanguageSwitcherData,
  SUPPORTED_LANGUAGES,
  type Language,
  type LocalizedContent,
  type LocalizationJob,
  type ContentToLocalize,
  type LocalizationStats,
} from './localizer';

// ============================================================================
// AEO Generator - Answer Engine Optimization Specialist
// ============================================================================

// AEO Generator - Quick Answers, FAQs, Schema Markup, Voice Search
export {
  generateAEOContent,
  generateQuickAnswer as generateAEOQuickAnswer,
  generateFAQs,
  generateFeaturedSnippet as generateAEOFeaturedSnippet,
  generateSchemaMarkup as generateAEOSchemaMarkup,
  optimizeForVoiceSearch,
  generateFAQSchema as generateAEOFAQSchema,
  generateArticleSchema,
  generateBatchAEOContent,
  type AEOContent as AEOGeneratorContent,
  type QuickAnswerCapsule,
  type FeaturedSnippetContent as AEOFeaturedSnippetContent,
  type FAQ,
  type SchemaMarkup as AEOSchemaMarkup,
} from './aeo-generator';

// ============================================================================
// Fact-Checking Validation Agent
// ============================================================================

// Fact Checker - Validate factual claims in generated content
export {
  validateFacts,
  extractClaims,
  getFactCheckSummary,
  formatValidationResults,
  getCorrectionSuggestions,
  type ClaimType,
  type FactualClaim,
  type ValidationResult,
  type FactCheckReport,
  type FactCheckOptions,
} from './fact-checker';

// ============================================================================
// Content Correction Workflow
// ============================================================================

// Content Corrector - Apply corrections based on fact-check results
export {
  suggestCorrections,
  applyCorrections,
  suggestionsToCorrections,
  createCorrectionFromValidation,
  batchSuggestCorrections,
  batchApplyCorrections,
  updateCorrectionStatus,
  approveCorrections,
  getPendingCorrections,
  getCorrectionsByStatus,
  validateCorrection,
  generateCorrectionReport,
  type ContentCorrection,
  type CorrectionStatus,
  type CorrectionField,
  type CorrectionSuggestion,
  type ContentForCorrection,
  type CorrectedContent,
  type CorrectionSummary,
  type SuggestCorrectionsOptions,
  type ApplyCorrectionsOptions,
} from './content-corrector';

// ============================================================================
// IMAGE USAGE ORCHESTRATION LAYER
// ============================================================================

// Image Usage Persistence
export {
  createImageUsage,
  getImageUsage,
  getImageUsageByEntity,
  getImageUsageByPage,
  getImageUsageByAsset,
  getImageUsageByAssetAndPage,
  getPendingImageUsages,
  updateImageUsage,
  batchUpdateImageUsages,
  deleteImageUsage,
  findReusableImages,
  getImageUsageStats,
  type ImageRole,
  type ImageUsageDecision,
  type CreateImageUsageParams,
  type UpdateImageUsageParams,
} from './image-usage-persistence';

// Image Placement Decision Engine
export {
  evaluatePlacementDecision,
  batchEvaluatePlacements,
  calculateHeroRejectionRate,
  calculateReuseCount,
  calculateAverageRelevance,
  defaultRules as defaultImagePlacementRules,
  type PlacementDecisionResult,
  type ImageUsageDraft,
  type ImagePlacementRule,
  type ImagePlacementConditions,
  type PlacementAction,
} from './image-placement-engine';

// Intelligence Client
export {
  fetchRelevance,
  fetchUsage,
  fetchIntelligenceSnapshot,
  batchFetchIntelligence,
  mockIntelligenceSnapshot,
  type RelevanceRequest,
  type RelevanceResponse,
  type UsageRequest,
  type UsageResponse,
} from './intelligence-client';

// E2E Test Harness
export {
  runE2EFlow as runImageUsageE2ETest,
} from './image-usage-e2e-test';

// Entity Type Image Presets
export {
  getEntityPreset,
  isRoleAllowed,
  getMaxImagesForRole,
  hasExceededReuseLimit,
  ENTITY_PRESETS,
  type EntityType as ImageEntityType,
  type ImageRole as EntityImageRole,
  type EntityImagePreset,
} from './image-entity-presets';

// Image Orchestrator - MANDATORY SINGLE FLOW
export {
  octopusAcquireImageAndPlace,
  octopusBatchAcquireImages,
  canRenderImage,
  getImageRenderingDecision,
  imageUsageGuard,
  ImageUsageGuard,
  ImageUsageViolationError,
  type OctopusImageRequest,
  type ImageEngineAsset,
  type OctopusImageResult,
  type AuditLogEntry,
} from './image-orchestrator';

// E2E Validation Tests
export {
  runAllE2ETests,
  testNoUsageRecordFails,
  testPendingStatusBlocksRender,
  testReuseLimitEnforced,
  testConcurrentRequestsSafe,
  testRepeatAcquireDeterministic,
} from './image-orchestration-e2e';

// Fallback Strategy
export {
  getFallbackAsset,
  getEntityFallbackConfig,
  ENTITY_FALLBACKS,
  type FallbackConfig,
  type FallbackAsset,
} from './image-fallback-strategy';
