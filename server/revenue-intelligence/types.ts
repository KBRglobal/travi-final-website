/**
 * Revenue Intelligence System - Core Types
 *
 * Central type definitions for the monetization and revenue intelligence system.
 * All types are designed for deterministic, feature-flagged operations.
 */

// ============================================================================
// Commercial Zones Types
// ============================================================================

export type CommercialZonePosition = 'inline' | 'sidebar' | 'footer' | 'intent-based';

export interface CommercialZone {
  id: string;
  position: CommercialZonePosition;
  priority: number;
  maxPlacements: number;
  allowedContentTypes: string[];
  requiresDisclosure: boolean;
  minContentLength?: number;
  intentTriggers?: string[];
}

export interface ZoneResolutionContext {
  contentId: string;
  contentType: string;
  contentLength: number;
  userIntent?: string;
  entities: EntityReference[];
  pageUrl: string;
  viewportSize?: 'mobile' | 'tablet' | 'desktop';
}

export interface ResolvedZone {
  zone: CommercialZone;
  placements: ZonePlacement[];
  disclosureRequired: boolean;
}

export interface ZonePlacement {
  zoneId: string;
  position: number;
  affiliateId?: string;
  productId?: string;
  productType?: string;
}

// ============================================================================
// Affiliate Types
// ============================================================================

export type AffiliatePartnerType =
  | 'booking-com'
  | 'hotels-com'
  | 'expedia'
  | 'agoda'
  | 'tripadvisor'
  | 'getyourguide'
  | 'viator'
  | 'klook'
  | 'airbnb'
  | 'amazon'
  | 'generic';

export interface AffiliatePartner {
  id: AffiliatePartnerType;
  name: string;
  baseUrl: string;
  commissionRate: number;
  priority: number;
  supportedEntityTypes: string[];
  trackingParams: Record<string, string>;
  active: boolean;
}

export interface AffiliateDecisionContext {
  contentId: string;
  contentType: string;
  entities: EntityReference[];
  userIntent?: string;
  requestedProductType?: string;
  excludePartners?: AffiliatePartnerType[];
}

export interface AffiliateDecision {
  partnerId: AffiliatePartnerType;
  partnerName: string;
  link: string;
  trackingId: string;
  priority: number;
  disclosure: string;
  rel: string;
  entityId?: string;
  productType?: string;
  confidence: number;
}

export interface AffiliateFallback {
  type: 'no-affiliate' | 'generic-link' | 'internal-search';
  reason: string;
  alternativeLink?: string;
}

export interface AffiliateDecisionResult {
  decisions: AffiliateDecision[];
  fallback?: AffiliateFallback;
  decisionTimestamp: number;
  contextHash: string;
}

// ============================================================================
// Entity Types
// ============================================================================

export interface EntityReference {
  id: string;
  type: string;
  name: string;
  monetizable: boolean;
  affiliateEligible: boolean;
  preferredPartners?: AffiliatePartnerType[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Revenue Attribution Types
// ============================================================================

export type RevenueEventType = 'impression' | 'click' | 'conversion';

export interface RevenueEvent {
  id: string;
  eventType: RevenueEventType;
  contentId: string;
  entityId?: string;
  affiliateId: AffiliatePartnerType;
  zoneId: string;
  trackingId: string;
  sessionId?: string;
  userId?: string;
  value?: number;
  currency?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AttributionSummary {
  contentId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  conversionRate: number;
  revenuePerImpression: number;
  topAffiliates: Array<{
    affiliateId: AffiliatePartnerType;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
  byEntity: Array<{
    entityId: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
  period: {
    start: Date;
    end: Date;
  };
}

// ============================================================================
// Revenue Scoring Types
// ============================================================================

export interface ContentRevenueScore {
  contentId: string;
  overallScore: number;
  components: {
    entityMonetizability: number;
    trafficSignals: number;
    conversionHistory: number;
    contentQuality: number;
    intentAlignment: number;
  };
  factors: {
    monetizableEntityCount: number;
    affiliateEligibleEntityCount: number;
    historicalClicks: number;
    historicalConversions: number;
    historicalRevenue: number;
    avgSessionDuration?: number;
    bounceRate?: number;
  };
  recommendations: string[];
  calculatedAt: Date;
}

export interface RevenueScoringConfig {
  weights: {
    entityMonetizability: number;
    trafficSignals: number;
    conversionHistory: number;
    contentQuality: number;
    intentAlignment: number;
  };
  thresholds: {
    highPotential: number;
    mediumPotential: number;
  };
}

// ============================================================================
// Admin Dashboard Types
// ============================================================================

export interface MonetizationSummary {
  overview: {
    totalRevenue: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    avgCTR: number;
    avgConversionRate: number;
    revenueGrowth: number;
  };
  byAffiliate: Array<{
    affiliateId: AffiliatePartnerType;
    affiliateName: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    conversionRate: number;
  }>;
  byZone: Array<{
    zoneId: string;
    zoneName: string;
    impressions: number;
    clicks: number;
    revenue: number;
  }>;
  topContent: Array<{
    contentId: string;
    title: string;
    revenue: number;
    conversions: number;
    revenueScore: number;
  }>;
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
}

export interface ContentMonetizationDetails {
  contentId: string;
  title: string;
  contentType: string;
  revenueScore: ContentRevenueScore;
  attribution: AttributionSummary;
  activeZones: ResolvedZone[];
  affiliateDecisions: AffiliateDecision[];
  recommendations: string[];
}

export interface AffiliatePerformance {
  affiliateId: AffiliatePartnerType;
  affiliateName: string;
  status: 'active' | 'inactive' | 'paused';
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    conversionRate: number;
    avgOrderValue: number;
  };
  topContent: Array<{
    contentId: string;
    title: string;
    clicks: number;
    revenue: number;
  }>;
  trend: Array<{
    date: string;
    impressions: number;
    clicks: number;
    revenue: number;
  }>;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}
