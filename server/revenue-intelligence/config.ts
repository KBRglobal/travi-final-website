/**
 * Revenue Intelligence System - Configuration & Feature Flags
 *
 * Centralized configuration for all monetization features.
 * All features are DISABLED by default and require explicit env flags.
 */

import type {
  AffiliatePartner,
  AffiliatePartnerType,
  CommercialZone,
  RevenueScoringConfig,
} from './types';

// ============================================================================
// Feature Flags
// ============================================================================

export function isCommercialZonesEnabled(): boolean {
  return process.env.ENABLE_COMMERCIAL_ZONES === 'true';
}

export function isAffiliateEngineEnabled(): boolean {
  return process.env.ENABLE_AFFILIATE_ENGINE === 'true';
}

export function isRevenueTrackingEnabled(): boolean {
  return process.env.ENABLE_REVENUE_TRACKING === 'true';
}

export function isRevenueScoringEnabled(): boolean {
  return process.env.ENABLE_REVENUE_SCORING === 'true';
}

export function isMonetizationDashboardEnabled(): boolean {
  return process.env.ENABLE_MONETIZATION_DASHBOARD === 'true';
}

export function getFeatureFlags() {
  return {
    commercialZones: isCommercialZonesEnabled(),
    affiliateEngine: isAffiliateEngineEnabled(),
    revenueTracking: isRevenueTrackingEnabled(),
    revenueScoring: isRevenueScoringEnabled(),
    monetizationDashboard: isMonetizationDashboardEnabled(),
  };
}

// ============================================================================
// Timeouts
// ============================================================================

export const TIMEOUTS = {
  zoneResolution: 100,       // ms - zone resolution should be fast
  affiliateDecision: 200,    // ms - affiliate decision with caching
  attributionWrite: 1000,    // ms - DB write for attribution
  scoringCalculation: 500,   // ms - revenue score calculation
  dashboardQuery: 5000,      // ms - admin dashboard queries
} as const;

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE_CONFIG = {
  zoneResolution: {
    ttlMs: 60_000,          // 1 minute
    maxSize: 1000,
  },
  affiliateDecision: {
    ttlMs: 300_000,         // 5 minutes
    maxSize: 5000,
  },
  revenueScores: {
    ttlMs: 600_000,         // 10 minutes
    maxSize: 2000,
  },
  dashboardSummary: {
    ttlMs: 60_000,          // 1 minute
    maxSize: 50,
  },
} as const;

// ============================================================================
// Commercial Zones Configuration
// ============================================================================

export const COMMERCIAL_ZONES_CONFIG: Record<string, CommercialZone> = {
  'inline-primary': {
    id: 'inline-primary',
    position: 'inline',
    priority: 1,
    maxPlacements: 2,
    allowedContentTypes: ['article', 'guide', 'destination'],
    requiresDisclosure: true,
    minContentLength: 500,
  },
  'inline-secondary': {
    id: 'inline-secondary',
    position: 'inline',
    priority: 2,
    maxPlacements: 3,
    allowedContentTypes: ['article', 'guide', 'destination', 'itinerary'],
    requiresDisclosure: true,
    minContentLength: 1000,
  },
  'sidebar-widget': {
    id: 'sidebar-widget',
    position: 'sidebar',
    priority: 1,
    maxPlacements: 2,
    allowedContentTypes: ['article', 'guide', 'hotel', 'destination'],
    requiresDisclosure: true,
  },
  'footer-recommendations': {
    id: 'footer-recommendations',
    position: 'footer',
    priority: 1,
    maxPlacements: 5,
    allowedContentTypes: ['article', 'guide', 'destination', 'itinerary', 'experience'],
    requiresDisclosure: true,
  },
  'intent-booking': {
    id: 'intent-booking',
    position: 'intent-based',
    priority: 1,
    maxPlacements: 1,
    allowedContentTypes: ['hotel', 'experience', 'tour'],
    requiresDisclosure: true,
    intentTriggers: ['book', 'reserve', 'buy', 'purchase', 'price'],
  },
  'intent-comparison': {
    id: 'intent-comparison',
    position: 'intent-based',
    priority: 2,
    maxPlacements: 1,
    allowedContentTypes: ['hotel', 'experience', 'destination'],
    requiresDisclosure: true,
    intentTriggers: ['compare', 'best', 'top', 'vs', 'review'],
  },
};

// ============================================================================
// Affiliate Partners Configuration
// ============================================================================

export const AFFILIATE_PARTNERS: Record<AffiliatePartnerType, AffiliatePartner> = {
  'booking-com': {
    id: 'booking-com',
    name: 'Booking.com',
    baseUrl: 'https://www.booking.com',
    commissionRate: 0.04,
    priority: 1,
    supportedEntityTypes: ['hotel', 'accommodation', 'apartment'],
    trackingParams: { aid: 'AFFILIATE_ID' },
    active: true,
  },
  'hotels-com': {
    id: 'hotels-com',
    name: 'Hotels.com',
    baseUrl: 'https://www.hotels.com',
    commissionRate: 0.05,
    priority: 2,
    supportedEntityTypes: ['hotel', 'accommodation'],
    trackingParams: { pos: 'HCOM_US', locale: 'en_US' },
    active: true,
  },
  'expedia': {
    id: 'expedia',
    name: 'Expedia',
    baseUrl: 'https://www.expedia.com',
    commissionRate: 0.03,
    priority: 3,
    supportedEntityTypes: ['hotel', 'flight', 'car', 'package'],
    trackingParams: { affcid: 'AFFILIATE_ID' },
    active: true,
  },
  'agoda': {
    id: 'agoda',
    name: 'Agoda',
    baseUrl: 'https://www.agoda.com',
    commissionRate: 0.05,
    priority: 4,
    supportedEntityTypes: ['hotel', 'accommodation'],
    trackingParams: { cid: 'AFFILIATE_ID' },
    active: true,
  },
  'tripadvisor': {
    id: 'tripadvisor',
    name: 'TripAdvisor',
    baseUrl: 'https://www.tripadvisor.com',
    commissionRate: 0.02,
    priority: 5,
    supportedEntityTypes: ['hotel', 'restaurant', 'attraction'],
    trackingParams: { m: 'AFFILIATE_ID' },
    active: true,
  },
  'getyourguide': {
    id: 'getyourguide',
    name: 'GetYourGuide',
    baseUrl: 'https://www.getyourguide.com',
    commissionRate: 0.08,
    priority: 1,
    supportedEntityTypes: ['experience', 'tour', 'activity'],
    trackingParams: { partner_id: 'AFFILIATE_ID' },
    active: true,
  },
  'viator': {
    id: 'viator',
    name: 'Viator',
    baseUrl: 'https://www.viator.com',
    commissionRate: 0.08,
    priority: 2,
    supportedEntityTypes: ['experience', 'tour', 'activity'],
    trackingParams: { pid: 'AFFILIATE_ID' },
    active: true,
  },
  'klook': {
    id: 'klook',
    name: 'Klook',
    baseUrl: 'https://www.klook.com',
    commissionRate: 0.06,
    priority: 3,
    supportedEntityTypes: ['experience', 'tour', 'activity', 'transport'],
    trackingParams: { aid: 'AFFILIATE_ID' },
    active: true,
  },
  'airbnb': {
    id: 'airbnb',
    name: 'Airbnb',
    baseUrl: 'https://www.airbnb.com',
    commissionRate: 0.03,
    priority: 5,
    supportedEntityTypes: ['accommodation', 'experience'],
    trackingParams: { c: 'AFFILIATE_ID' },
    active: true,
  },
  'amazon': {
    id: 'amazon',
    name: 'Amazon',
    baseUrl: 'https://www.amazon.com',
    commissionRate: 0.04,
    priority: 10,
    supportedEntityTypes: ['product', 'gear', 'equipment'],
    trackingParams: { tag: 'AFFILIATE_TAG' },
    active: true,
  },
  'generic': {
    id: 'generic',
    name: 'Generic Partner',
    baseUrl: '',
    commissionRate: 0,
    priority: 100,
    supportedEntityTypes: [],
    trackingParams: {},
    active: false,
  },
};

// ============================================================================
// Revenue Scoring Configuration
// ============================================================================

export const REVENUE_SCORING_CONFIG: RevenueScoringConfig = {
  weights: {
    entityMonetizability: 0.25,
    trafficSignals: 0.20,
    conversionHistory: 0.30,
    contentQuality: 0.15,
    intentAlignment: 0.10,
  },
  thresholds: {
    highPotential: 70,
    mediumPotential: 40,
  },
};

// ============================================================================
// Forbidden Zones (Never place ads here)
// ============================================================================

export const FORBIDDEN_ZONES = [
  'hero-section',
  'navigation',
  'meta-description',
  'breadcrumbs',
  'page-title',
  'above-fold-primary',
] as const;

export type ForbiddenZone = (typeof FORBIDDEN_ZONES)[number];

export function isForbiddenZone(zoneId: string): boolean {
  return FORBIDDEN_ZONES.includes(zoneId as ForbiddenZone);
}

// ============================================================================
// Validation
// ============================================================================

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that weights sum to 1
  const weightSum = Object.values(REVENUE_SCORING_CONFIG.weights).reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1.0) > 0.001) {
    errors.push(`Revenue scoring weights must sum to 1.0, got ${weightSum}`);
  }

  // Check that all zones have valid positions
  for (const [id, zone] of Object.entries(COMMERCIAL_ZONES_CONFIG)) {
    if (!['inline', 'sidebar', 'footer', 'intent-based'].includes(zone.position)) {
      errors.push(`Zone ${id} has invalid position: ${zone.position}`);
    }
    if (zone.maxPlacements < 1) {
      errors.push(`Zone ${id} must allow at least 1 placement`);
    }
  }

  // Check affiliate partners
  for (const [id, partner] of Object.entries(AFFILIATE_PARTNERS)) {
    if (partner.commissionRate < 0 || partner.commissionRate > 1) {
      errors.push(`Partner ${id} has invalid commission rate: ${partner.commissionRate}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
