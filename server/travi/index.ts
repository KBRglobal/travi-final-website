/**
 * TRAVI Content Generation System
 * 
 * Phase 2: Automated content generation for travel locations using:
 * - Wikipedia for historical/educational content (CC BY-SA 3.0)
 * - OpenStreetMap for geographic data (ODbL)
 * - Google Places for business details
 * - Freepik for images (with photographer credits)
 * - AI models (Gemini, GPT-4o Mini, Claude Haiku) for content generation
 */

export * from './validation';
export * from './budget-manager';
export * from './retry-handler';
export * from './checkpoint-manager';
export * from './ai-orchestrator';
export * from './destination-seeder';
export * from './wikipedia-client';
export {
  OSM_ATTRIBUTION,
  searchInBoundingBox,
  searchNearPoint,
  getElementDetails,
  extractMetadata,
  getBoundingBox,
  mergeWithWikipedia,
  isOsmAvailable,
} from './osm-client';
export type { OSMLocation, OSMSearchResult } from './osm-client';
export {
  TRIPADVISOR_ATTRIBUTION,
  searchByCity,
  getLocationDetails,
  isTripAdvisorAvailable,
  discoverAllInCity,
} from './tripadvisor-client';
export type { TripAdvisorLocation, TripAdvisorSearchResult } from './tripadvisor-client';
export {
  discoverLocations,
  discoverAllCategories,
  getDiscoveryStats,
} from './location-discovery';
export type {
  DiscoveredLocation,
  DiscoveryResult,
  LocationCategory,
} from './location-discovery';
export * from './google-places-client';
export * from './freepik-client';
export * from './processing-orchestrator';

// Re-export types for convenience
export type { ValidationResult, ValidationError, DestinationSlug } from './validation';
export type { UsageStats, BudgetStatus, ServiceType } from './budget-manager';
export type { RetryResult, RetryOptions } from './retry-handler';
export type { CheckpointData, JobState } from './checkpoint-manager';
export type { WikipediaLocation, WikipediaSearchResult } from './wikipedia-client';
export type { GooglePlaceDetails, PlaceSearchResult } from './google-places-client';
export type { FreepikImage, FreepikSearchResult } from './freepik-client';

// Re-export key validation functions
export { 
  validateNoPrices, 
  validateAffiliateLink, 
  LOCKED_AFFILIATE_LINK,
  WHITELISTED_DESTINATIONS 
} from './validation';

// Re-export budget control functions
export { 
  isProcessingPaused, 
  isProcessingThrottled, 
  pauseProcessing, 
  resumeProcessing,
  getThrottleMultiplier 
} from './budget-manager';

// System configuration
export const TRAVI_CONFIG = {
  // Processing limits
  batchSize: 10,           // Locations per batch
  parallelCalls: 5,        // Concurrent API calls
  checkpointInterval: 10,  // Save every N locations
  checkpointTimeMs: 300000, // Save every 5 minutes
  
  // Retry configuration
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  
  // Content requirements
  minFaqQuestions: 7,
  minDescriptionWords: 50,
  metaTitleMaxLength: 60,
  metaDescMaxLength: 160,
  
  // Budget thresholds (USD)
  budgetWarning: 100,
  budgetCritical: 500,
  budgetStop: 1000,
  
  // Affiliate link (locked)
  affiliateLink: 'https://tiqets.tpo.lu/k16k6RXU',
  
  // Legal requirements
  noPricesDisplayed: true,
  attributionRequired: true,
} as const;

// Log system initialization
console.log('[TRAVI] Content generation system loaded');
console.log('[TRAVI] Budget limit: $' + TRAVI_CONFIG.budgetStop);
console.log('[TRAVI] Affiliate link locked to:', TRAVI_CONFIG.affiliateLink);
