/**
 * AEO (Answer Engine Optimization) Module
 * Optimizes content for AI platforms like ChatGPT, Perplexity, and Google AI Overviews
 */

// Configuration
export * from "./aeo-config";

// Static file generators (robots.txt, llms.txt)
export {
  generateRobotsTxt,
  generateLlmsTxt,
  generateLlmsFullTxt,
  identifyAICrawler,
  identifyAIReferrer,
} from "./aeo-static-files";

// Answer capsule generation
export {
  generateAnswerCapsule,
  batchGenerateCapsules,
  getCapsuleStats,
} from "./answer-capsule-generator";

// Schema generation
export {
  generateAEOSchema,
  batchGenerateSchemas,
  validateSchema,
  saveSchemaEnhancement,
} from "./aeo-schema-generator";

// Tracking and analytics
export {
  logCrawlerVisit,
  logCitation,
  trackAITraffic,
  getAEODashboard,
  getCrawlerStats,
  getCitationInsights,
  aeoTrackingMiddleware,
} from "./aeo-tracking";

// Caching
export {
  aeoCacheKeys,
  AEO_CACHE_TTL,
  getCachedCapsule,
  setCachedCapsule,
  getCachedDashboard,
  getCachedCrawlerStats,
  getCachedCitationInsights,
  invalidateCapsuleCache,
  invalidateDashboardCache,
  invalidateAllAEOCache,
  getAEOCacheStats,
} from "./aeo-cache";

// Background jobs and automation
export {
  runAutoGenerateCapsules,
  runRegenerateLowQualityCapsules,
  runCitationScan,
  runPerformanceReport,
  runCleanup,
  getJobStatuses,
  startScheduler,
  onContentPublished,
  onContentUpdated,
  registerNotificationHandler,
} from "./aeo-jobs";

// A/B Testing
export {
  createABTest,
  startABTest,
  stopABTest,
  getABTestedCapsule,
  recordABTestEvent,
  getABTestResults,
  applyWinningVariant,
  getAllABTests,
  getABTest,
  deleteABTest,
} from "./aeo-ab-testing";

// Integrations
export {
  configureSlack,
  sendSlackNotification,
  configureGSC,
  getGSCSearchAnalytics,
  getAIRelatedQueries,
  registerWebhook,
  removeWebhook,
  sendWebhookEvent,
  getWebhooks,
  configureEmail,
  sendEmailNotification,
  getIntegrationStatus,
} from "./aeo-integrations";

// Advanced Analytics
export {
  calculateROI,
  mapQueriesToContent,
  analyzeContentGaps,
  analyzePlatformPerformance,
  getAnalyticsDashboard,
} from "./aeo-analytics";

// Multi-language support
export {
  translateCapsule,
  translateToAllLocales,
  getTranslationCoverage,
  getSupportedLocales,
  LOCALE_METADATA,
} from "./aeo-multilang";

// SEO-AEO Compatibility Validator
export {
  validateSEOAEOCompatibility,
  validateContent,
  batchValidateSEOAEO,
  getValidationSummary,
} from "./seo-aeo-validator";

// Featured Snippet Optimizer
export {
  FeaturedSnippetOptimizer,
  featuredSnippetOptimizer,
  type SnippetType,
  type FeaturedSnippetOpportunity,
  type SnippetAnalysis,
} from "./featured-snippet-optimizer";

// API routes
export { default as aeoRoutes } from "./aeo-routes";
