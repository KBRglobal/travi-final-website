/**
 * Affiliate Hooks - Placeholder Affiliate Integration Points
 * 
 * IMPORTANT: All affiliate hooks are DISABLED by default.
 * Require ENABLE_MONETIZATION=true AND ENABLE_AFFILIATE_HOOKS=true to activate.
 * 
 * This module provides placeholder integration points for affiliate
 * partners (hotels, experiences, tours) without any actual monetization logic.
 * 
 * Status: DOCUMENTATION/PREPARATION PHASE - NOT ACTIVE
 * Last Updated: 2024-12-31
 */

import { validateZone, validateContentInZone, isSEOCriticalPath, FORBIDDEN_ZONES, isForbiddenZone } from './commercial-zones';
import type { CommercialZoneType, ContentType, ForbiddenZone } from './commercial-zones';

/**
 * In-Memory Affiliate Metrics Tracking
 * These are placeholder metrics that track clicks and impressions.
 * Persist to database if affiliate_metrics table exists.
 */
export interface AffiliateMetrics {
  clicks: number;
  impressions: number;
  lastClickAt: number | null;
  lastImpressionAt: number | null;
  lastUpdated: number;
  forbiddenZoneViolationsBlocked: number;
}

const affiliateMetrics: AffiliateMetrics = {
  clicks: 0,
  impressions: 0,
  lastClickAt: null,
  lastImpressionAt: null,
  lastUpdated: Date.now(),
  forbiddenZoneViolationsBlocked: 0,
};

/**
 * Increment affiliate click metric (called on link generation)
 */
export function incrementAffiliateClick(): void {
  affiliateMetrics.clicks++;
  affiliateMetrics.lastClickAt = Date.now();
  affiliateMetrics.lastUpdated = Date.now();
  console.log(`[Affiliate] Click tracked. Total: ${affiliateMetrics.clicks}`);
}

/**
 * Increment affiliate impression metric (called on CTA render)
 */
export function incrementAffiliateImpression(): void {
  affiliateMetrics.impressions++;
  affiliateMetrics.lastImpressionAt = Date.now();
  affiliateMetrics.lastUpdated = Date.now();
}

/**
 * Get current affiliate metrics snapshot
 */
export function getAffiliateMetrics(): AffiliateMetrics & { ctr: number } {
  const ctr = affiliateMetrics.impressions > 0 
    ? (affiliateMetrics.clicks / affiliateMetrics.impressions) * 100 
    : 0;
  
  return {
    ...affiliateMetrics,
    ctr: Math.round(ctr * 100) / 100,
  };
}

/**
 * Reset affiliate metrics (for testing purposes)
 */
export function resetAffiliateMetrics(): void {
  affiliateMetrics.clicks = 0;
  affiliateMetrics.impressions = 0;
  affiliateMetrics.lastClickAt = null;
  affiliateMetrics.lastImpressionAt = null;
  affiliateMetrics.lastUpdated = Date.now();
  affiliateMetrics.forbiddenZoneViolationsBlocked = 0;
}

/**
 * Forbidden Zone Violation Error
 * Thrown when affiliate content is attempted in a forbidden zone
 */
export class ForbiddenZoneViolationError extends Error {
  constructor(public zone: string) {
    super(`[Affiliate] FORBIDDEN ZONE VIOLATION BLOCKED: ${zone}`);
    this.name = 'ForbiddenZoneViolationError';
  }
}

/**
 * Assert that a zone is not forbidden.
 * Throws ForbiddenZoneViolationError if zone is in the forbidden list.
 * Logs violation attempts for security monitoring.
 */
export function assertNotForbiddenZone(zoneId: string): void {
  if (isForbiddenZone(zoneId)) {
    affiliateMetrics.forbiddenZoneViolationsBlocked++;
    affiliateMetrics.lastUpdated = Date.now();
    console.error(`[Affiliate] FORBIDDEN ZONE VIOLATION BLOCKED: ${zoneId}`);
    throw new ForbiddenZoneViolationError(zoneId);
  }
}

/**
 * Safe affiliate link generation with forbidden zone enforcement.
 * Returns error result instead of throwing for forbidden zones.
 */
export interface SafeAffiliateLinkResult {
  success: boolean;
  error?: string;
  link?: AffiliateLinkResult;
}

export function generateSafeAffiliateLink(
  config: AffiliateLinkConfig & { zoneId?: string }
): SafeAffiliateLinkResult {
  if (config.zoneId && isForbiddenZone(config.zoneId)) {
    affiliateMetrics.forbiddenZoneViolationsBlocked++;
    affiliateMetrics.lastUpdated = Date.now();
    console.error(`[Affiliate] FORBIDDEN ZONE VIOLATION BLOCKED: ${config.zoneId}`);
    return {
      success: false,
      error: `Zone "${config.zoneId}" is forbidden for affiliate content`,
    };
  }

  const link = useAffiliateLinkHook(config);
  if (link.enabled) {
    incrementAffiliateClick();
  }
  
  return {
    success: true,
    link,
  };
}

/**
 * Master switch for affiliate hooks.
 * Returns false by default - must be explicitly enabled via environment.
 */
export function isAffiliateHooksEnabled(): boolean {
  const masterEnabled = process.env.ENABLE_MONETIZATION === 'true';
  const hooksEnabled = process.env.ENABLE_AFFILIATE_HOOKS === 'true';
  
  if (masterEnabled && hooksEnabled) {
    console.log('[AffiliateHooks] Affiliate hooks are ENABLED');
    return true;
  }
  
  return false;
}

/**
 * Affiliate Partner Types
 */
export type AffiliatePartner = 
  | 'booking-com'
  | 'hotels-com'
  | 'expedia'
  | 'agoda'
  | 'tripadvisor'
  | 'getyourguide'
  | 'viator'
  | 'klook'
  | 'airbnb';

export type AffiliateProductType = 'hotel' | 'experience' | 'tour' | 'activity';

/**
 * Affiliate Link Configuration (Placeholder)
 */
export interface AffiliateLinkConfig {
  partnerId: AffiliatePartner;
  productId: string;
  productType: AffiliateProductType;
  productName: string;
  destinationSlug?: string;
  customTrackingId?: string;
}

/**
 * Affiliate Link Result (Placeholder)
 */
export interface AffiliateLinkResult {
  enabled: boolean;
  url: string | null;
  partnerId: AffiliatePartner | null;
  trackingId: string | null;
  disclosure: string;
  rel: string;
  seoSafe: boolean;
}

/**
 * Hook: Generate affiliate link for a product.
 * 
 * DISABLED by default. Returns disabled state when hooks are off.
 * Logs activation for monitoring.
 */
export function useAffiliateLinkHook(config: AffiliateLinkConfig): AffiliateLinkResult {
  const disabledResult: AffiliateLinkResult = {
    enabled: false,
    url: null,
    partnerId: null,
    trackingId: null,
    disclosure: '',
    rel: '',
    seoSafe: true,
  };

  if (!isAffiliateHooksEnabled()) {
    return disabledResult;
  }

  console.log(`[AffiliateHooks] Link requested for ${config.productType}: ${config.productId}`);

  const trackingId = config.customTrackingId || generateTrackingId();
  
  return {
    enabled: true,
    url: `/go/${config.partnerId}/${config.productId}?tid=${trackingId}`,
    partnerId: config.partnerId,
    trackingId,
    disclosure: 'Affiliate link - we may earn a commission on qualifying bookings.',
    rel: 'nofollow sponsored',
    seoSafe: true,
  };
}

/**
 * Affiliate Injection Point Configuration
 */
export interface AffiliateInjectionConfig {
  zoneId: CommercialZoneType;
  contentType: ContentType;
  pageUrl: string;
  productId: string;
  productType: AffiliateProductType;
  partnerId: AffiliatePartner;
}

/**
 * Affiliate Injection Result
 */
export interface AffiliateInjectionResult {
  allowed: boolean;
  reason: string;
  zoneId: CommercialZoneType | null;
  disclosureRequired: boolean;
}

/**
 * Hook: Check if affiliate content can be injected at a specific zone.
 * 
 * DISABLED by default. Returns blocked state when hooks are off.
 * Validates zone safety and SEO compliance.
 */
export function useAffiliateInjectionHook(config: AffiliateInjectionConfig): AffiliateInjectionResult {
  const blockedResult: AffiliateInjectionResult = {
    allowed: false,
    reason: 'Affiliate hooks are disabled',
    zoneId: null,
    disclosureRequired: false,
  };

  if (!isAffiliateHooksEnabled()) {
    return blockedResult;
  }

  if (isSEOCriticalPath(config.pageUrl)) {
    console.log(`[AffiliateHooks] Injection blocked on SEO-critical path: ${config.pageUrl}`);
    return {
      allowed: false,
      reason: `SEO-critical path: ${config.pageUrl}`,
      zoneId: null,
      disclosureRequired: false,
    };
  }

  const zoneValidation = validateContentInZone(config.zoneId, config.contentType);
  if (!zoneValidation.valid) {
    console.log(`[AffiliateHooks] Zone validation failed: ${zoneValidation.error}`);
    return {
      allowed: false,
      reason: zoneValidation.error || 'Zone validation failed',
      zoneId: null,
      disclosureRequired: false,
    };
  }

  console.log(`[AffiliateHooks] Injection approved for zone: ${config.zoneId}`);

  return {
    allowed: true,
    reason: 'Zone approved for affiliate content',
    zoneId: config.zoneId,
    disclosureRequired: zoneValidation.zone?.requiresDisclosure ?? true,
  };
}

/**
 * Affiliate Event Tracking (Placeholder)
 */
export type AffiliateEventType = 'impression' | 'click' | 'outbound' | 'conversion';

export interface AffiliateTrackingEvent {
  eventType: AffiliateEventType;
  partnerId: AffiliatePartner;
  productId: string;
  productType: AffiliateProductType;
  zoneId: CommercialZoneType;
  pageUrl: string;
  timestamp: number;
  trackingId: string;
}

/**
 * Hook: Track affiliate interaction event.
 * 
 * DISABLED by default. No-op when hooks are off.
 * Logs all events for monitoring and debugging.
 */
export function trackAffiliateEvent(
  event: Omit<AffiliateTrackingEvent, 'timestamp' | 'trackingId'> & { trackingId?: string }
): void {
  if (!isAffiliateHooksEnabled()) {
    return;
  }

  const fullEvent: AffiliateTrackingEvent = {
    ...event,
    timestamp: Date.now(),
    trackingId: event.trackingId || generateTrackingId(),
  };

  console.log(`[AffiliateHooks] Event tracked: ${fullEvent.eventType}`, {
    partner: fullEvent.partnerId,
    product: fullEvent.productId,
    zone: fullEvent.zoneId,
  });
}

/**
 * Affiliate Disclosure Configuration
 */
export interface AffiliateDisclosureConfig {
  pageHasAffiliateContent: boolean;
  disclosureStyle: 'inline' | 'footer' | 'both';
}

/**
 * Affiliate Disclosure Result
 */
export interface AffiliateDisclosureResult {
  required: boolean;
  inlineText: string;
  footerText: string;
  ftcCompliant: boolean;
}

/**
 * Hook: Get required affiliate disclosure text.
 * 
 * DISABLED by default. Returns no disclosure when hooks are off.
 */
export function useAffiliateDisclosureHook(config: AffiliateDisclosureConfig): AffiliateDisclosureResult {
  const noDisclosure: AffiliateDisclosureResult = {
    required: false,
    inlineText: '',
    footerText: '',
    ftcCompliant: true,
  };

  if (!isAffiliateHooksEnabled() || !config.pageHasAffiliateContent) {
    return noDisclosure;
  }

  const inlineText = 'Partner link';
  const footerText = 'This page contains affiliate links. TRAVI may earn a commission on qualifying purchases at no additional cost to you. See our affiliate disclosure for details.';

  return {
    required: true,
    inlineText,
    footerText,
    ftcCompliant: true,
  };
}

/**
 * Affiliate Hook Status Report
 */
export interface AffiliateHookStatus {
  enabled: boolean;
  masterSwitch: boolean;
  hooksSwitch: boolean;
  configValid: boolean;
  warnings: string[];
}

/**
 * Get current affiliate hooks status.
 * Useful for admin dashboards and debugging.
 */
export function getAffiliateHookStatus(): AffiliateHookStatus {
  const masterSwitch = process.env.ENABLE_MONETIZATION === 'true';
  const hooksSwitch = process.env.ENABLE_AFFILIATE_HOOKS === 'true';
  const warnings: string[] = [];

  if (masterSwitch && !hooksSwitch) {
    warnings.push('ENABLE_MONETIZATION is true but ENABLE_AFFILIATE_HOOKS is false');
  }

  if (hooksSwitch && !masterSwitch) {
    warnings.push('ENABLE_AFFILIATE_HOOKS is true but master switch ENABLE_MONETIZATION is false');
  }

  if (masterSwitch && hooksSwitch) {
    if (!process.env.AFFILIATE_PARTNER_ID) {
      warnings.push('Affiliate hooks enabled but AFFILIATE_PARTNER_ID is not configured');
    }
  }

  return {
    enabled: masterSwitch && hooksSwitch,
    masterSwitch,
    hooksSwitch,
    configValid: warnings.length === 0,
    warnings,
  };
}

function generateTrackingId(): string {
  return `aff_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
