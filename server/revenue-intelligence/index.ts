/**
 * Revenue Intelligence System - Main Module
 *
 * Complete Monetization & Revenue Intelligence system providing:
 * - Commercial Zones Engine (ENABLE_COMMERCIAL_ZONES=true)
 * - Affiliate Decision Engine (ENABLE_AFFILIATE_ENGINE=true)
 * - Revenue Attribution Tracking (ENABLE_REVENUE_TRACKING=true)
 * - Revenue-Aware Content Scoring (ENABLE_REVENUE_SCORING=true)
 * - Admin Monetization Dashboard (ENABLE_MONETIZATION_DASHBOARD=true)
 *
 * All features are DISABLED by default and require explicit environment flags.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Commercial Zones
  CommercialZone,
  CommercialZonePosition,
  ZoneResolutionContext,
  ResolvedZone,
  ZonePlacement,

  // Affiliate
  AffiliatePartner,
  AffiliatePartnerType,
  AffiliateDecisionContext,
  AffiliateDecision,
  AffiliateDecisionResult,
  AffiliateFallback,

  // Entities
  EntityReference,

  // Attribution
  RevenueEvent,
  RevenueEventType,
  AttributionSummary,

  // Scoring
  ContentRevenueScore,
  RevenueScoringConfig,

  // Admin Dashboard
  MonetizationSummary,
  ContentMonetizationDetails,
  AffiliatePerformance,

  // Cache
  CacheEntry,
  CacheStats,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export {
  // Feature flags
  isCommercialZonesEnabled,
  isAffiliateEngineEnabled,
  isRevenueTrackingEnabled,
  isRevenueScoringEnabled,
  isMonetizationDashboardEnabled,
  getFeatureFlags,

  // Timeouts
  TIMEOUTS,

  // Cache config
  CACHE_CONFIG,

  // Zone config
  COMMERCIAL_ZONES_CONFIG,

  // Affiliate config
  AFFILIATE_PARTNERS,

  // Scoring config
  REVENUE_SCORING_CONFIG,

  // Forbidden zones
  FORBIDDEN_ZONES,
  isForbiddenZone,

  // Validation
  validateConfig,
} from './config';

// ============================================================================
// Commercial Zones Engine
// ============================================================================

export {
  resolveZones,
  getZonesForContentType,
  getAllZones,
  getZoneById,
  validateZonePlacement,
  getZoneCacheStats,
  clearZoneCache,
  getZoneEngineStatus,
  type ZoneEngineStatus,
} from './commercial-zones-engine';

// ============================================================================
// Affiliate Decision Engine
// ============================================================================

export {
  makeAffiliateDecisions,
  getDecisionForEntity,
  getAvailablePartners,
  getAllActivePartners,
  getPartnerById,
  getDecisionCacheStats,
  clearDecisionCache,
  getAffiliateEngineStatus,
  testDecision,
  type AffiliateEngineStatus,
} from './affiliate-decision-engine';

// ============================================================================
// Revenue Attribution Tracking
// ============================================================================

export {
  trackRevenueEvent,
  trackImpression,
  trackClick,
  trackConversion,
  getAttributionSummary,
  getRecentEvents,
  getAggregateStats,
  getEventsByTrackingId,
  getBufferStats,
  clearEventBuffer,
  getTrackingStatus,
  type TrackingStatus,
} from './attribution-tracking';

// ============================================================================
// Revenue Scoring
// ============================================================================

export {
  calculateRevenueScore,
  calculateBatchScores,
  getTopRevenueContent,
  getScoreCacheStats,
  clearScoreCache,
  invalidateScore,
  getScoringStatus,
  classifyScore,
  getScoreColor,
  type ScoringStatus,
} from './revenue-scoring';

// ============================================================================
// Admin Routes
// ============================================================================

export {
  monetizationAdminRouter,
} from './admin-routes';

// ============================================================================
// System Status
// ============================================================================

import { getFeatureFlags, validateConfig } from './config';
import { getZoneEngineStatus } from './commercial-zones-engine';
import { getAffiliateEngineStatus } from './affiliate-decision-engine';
import { getTrackingStatus } from './attribution-tracking';
import { getScoringStatus } from './revenue-scoring';

/**
 * Get complete system status
 */
export function getRevenueIntelligenceStatus() {
  return {
    features: getFeatureFlags(),
    configValid: validateConfig(),
    engines: {
      zones: getZoneEngineStatus(),
      affiliate: getAffiliateEngineStatus(),
      tracking: getTrackingStatus(),
      scoring: getScoringStatus(),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if any revenue intelligence feature is enabled
 */
export function isAnyFeatureEnabled(): boolean {
  const flags = getFeatureFlags();
  return Object.values(flags).some(v => v);
}
