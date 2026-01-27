/**
 * Monetization Hooks - Placeholder Functions
 *
 * All hooks are DISABLED by default and require the ENABLE_MONETIZATION
 * environment variable to be set to 'true' to activate.
 *
 * These hooks provide integration points for affiliate links,
 * premium content gates, and commercial content injection.
 */

import type { CommercialZoneType, ContentType } from "./commercial-zones";
import { validateZone, validateContentInZone, isSEOCriticalPath } from "./commercial-zones";

/**
 * Check if monetization is enabled globally.
 * Returns false by default - must be explicitly enabled.
 */
export function isMonetizationEnabled(): boolean {
  return process.env.ENABLE_MONETIZATION === "true";
}

/**
 * Check if a specific monetization feature is enabled.
 */
export function isFeatureEnabled(feature: "hotels" | "experiences" | "premium" | "leads"): boolean {
  if (!isMonetizationEnabled()) {
    return false;
  }

  const featureFlags: Record<string, string> = {
    hotels: "ENABLE_HOTEL_AFFILIATES",
    experiences: "ENABLE_EXPERIENCE_AFFILIATES",
    premium: "ENABLE_PREMIUM_CONTENT",
    leads: "ENABLE_LEAD_GENERATION",
  };

  return process.env[featureFlags[feature]] === "true";
}

export interface AffiliateLink {
  url: string;
  partnerId: string;
  trackingId: string;
  disclosure: string;
  nofollow: boolean;
}

export interface AffiliateLinkOptions {
  partnerId: string;
  productId: string;
  productType: "hotel" | "experience" | "tour";
  trackingId?: string;
}

/**
 * Hook: Generate affiliate link for a product.
 * DISABLED by default. Returns null when monetization is off.
 */
export function useAffiliateLink(options: AffiliateLinkOptions): AffiliateLink | null {
  if (!isMonetizationEnabled()) {
    return null;
  }

  if (options.productType === "hotel" && !isFeatureEnabled("hotels")) {
    return null;
  }

  if (
    (options.productType === "experience" || options.productType === "tour") &&
    !isFeatureEnabled("experiences")
  ) {
    return null;
  }

  // Placeholder implementation - returns mock affiliate link structure
  // Real implementation would integrate with partner APIs
  return {
    url: `/go/${options.partnerId}/${options.productId}`,
    partnerId: options.partnerId,
    trackingId: options.trackingId || generateTrackingId(),
    disclosure: "Affiliate link - we may earn a commission",
    nofollow: true,
  };
}

export interface CommercialContent {
  type: "affiliate" | "sponsored" | "premium-cta";
  zoneId: CommercialZoneType;
  content: unknown;
  disclosure: string;
}

export interface InjectContentOptions {
  zoneId: CommercialZoneType;
  contentType: ContentType;
  pageUrl: string;
  content: unknown;
}

/**
 * Hook: Inject commercial content into an approved zone.
 * DISABLED by default. Returns null when monetization is off.
 * Validates zone and SEO safety before injection.
 */
export function useCommercialContent(options: InjectContentOptions): CommercialContent | null {
  if (!isMonetizationEnabled()) {
    return null;
  }

  // Validate zone is approved
  const zoneValidation = validateContentInZone(options.zoneId, options.contentType);
  if (!zoneValidation.valid) {
    return null;
  }

  // Block on SEO-critical paths
  if (isSEOCriticalPath(options.pageUrl)) {
    return null;
  }

  return {
    type: "affiliate",
    zoneId: options.zoneId,
    content: options.content,
    disclosure: "This section contains affiliate links",
  };
}

export interface PremiumGate {
  isGated: boolean;
  previewContent: string;
  ctaText: string;
  ctaUrl: string;
}

export interface PremiumContentOptions {
  contentId: string;
  contentType: "guide" | "itinerary" | "map";
  userId?: string;
}

/**
 * Hook: Check if content should be premium-gated.
 * DISABLED by default. Returns ungated state when monetization is off.
 */
export function usePremiumGate(options: PremiumContentOptions): PremiumGate {
  if (!isMonetizationEnabled() || !isFeatureEnabled("premium")) {
    return {
      isGated: false,
      previewContent: "",
      ctaText: "",
      ctaUrl: "",
    };
  }

  // Placeholder implementation
  // Real implementation would check user subscription status
  return {
    isGated: false, // Always ungated in placeholder
    previewContent: "",
    ctaText: "Unlock Premium Content",
    ctaUrl: "/premium",
  };
}

export interface BookingCTA {
  enabled: boolean;
  text: string;
  url: string;
  partner: string;
  disclosure: string;
}

export interface BookingCTAOptions {
  entityType: "hotel" | "experience" | "tour";
  entityId: string;
  entityName: string;
  partner?: string;
}

/**
 * Hook: Generate booking CTA for an entity.
 * DISABLED by default. Returns disabled state when monetization is off.
 */
export function useBookingCTA(options: BookingCTAOptions): BookingCTA {
  if (!isMonetizationEnabled()) {
    return {
      enabled: false,
      text: "",
      url: "",
      partner: "",
      disclosure: "",
    };
  }

  const featureKey = options.entityType === "hotel" ? "hotels" : "experiences";
  if (!isFeatureEnabled(featureKey)) {
    return {
      enabled: false,
      text: "",
      url: "",
      partner: "",
      disclosure: "",
    };
  }

  // Placeholder implementation
  const partner = options.partner || "default";
  return {
    enabled: true,
    text: `Book ${options.entityName}`,
    url: `/go/${partner}/${options.entityId}`,
    partner,
    disclosure: "Affiliate link - we may earn a commission",
  };
}

export interface TrackingEvent {
  event: "impression" | "click" | "conversion";
  zoneId: CommercialZoneType;
  partnerId: string;
  productId: string;
  timestamp: number;
}

/**
 * Hook: Track commercial content interaction.
 * DISABLED by default. No-op when monetization is off.
 */
export function trackCommercialEvent(event: Omit<TrackingEvent, "timestamp">): void {
  if (!isMonetizationEnabled()) {
    return;
  }

  const trackingEvent: TrackingEvent = {
    ...event,
    timestamp: Date.now(),
  };

  // Placeholder implementation
  // Real implementation would send to analytics/partner APIs
}

/**
 * Hook: Get affiliate disclosure text for a page.
 * Returns empty string when monetization is off.
 */
export function useAffiliateDisclosure(hasAffiliateContent: boolean): string {
  if (!isMonetizationEnabled() || !hasAffiliateContent) {
    return "";
  }

  return "This page contains affiliate links. TRAVI may earn a commission on qualifying purchases at no additional cost to you.";
}

// Helper functions

function generateTrackingId(): string {
  return `trk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Middleware: Add affiliate disclosure to response if needed.
 * DISABLED by default. No-op when monetization is off.
 */
export function affiliateDisclosureMiddleware(
  hasAffiliateContent: boolean
): { disclosure: string } | null {
  if (!isMonetizationEnabled() || !hasAffiliateContent) {
    return null;
  }

  return {
    disclosure: useAffiliateDisclosure(hasAffiliateContent),
  };
}

/**
 * Validate that monetization is properly configured.
 * Logs warnings for misconfigured states.
 */
export function validateMonetizationConfig(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (isMonetizationEnabled()) {
    // Check for required partner configurations
    if (!process.env.AFFILIATE_PARTNER_ID) {
      warnings.push("ENABLE_MONETIZATION is true but AFFILIATE_PARTNER_ID is not set");
    }

    // Check for feature flags without master switch
    const featureFlags = [
      "ENABLE_HOTEL_AFFILIATES",
      "ENABLE_EXPERIENCE_AFFILIATES",
      "ENABLE_PREMIUM_CONTENT",
      "ENABLE_LEAD_GENERATION",
    ];

    const enabledFeatures = featureFlags.filter(flag => process.env[flag] === "true");
    if (enabledFeatures.length === 0) {
      warnings.push("ENABLE_MONETIZATION is true but no feature flags are enabled");
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
