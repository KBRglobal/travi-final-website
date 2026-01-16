/**
 * Monetization Module - Main Exports
 * 
 * This module provides monetization infrastructure for TRAVI,
 * including affiliate links, commercial zones, and premium content.
 * 
 * IMPORTANT: All monetization features are DISABLED by default.
 * Set ENABLE_MONETIZATION=true in environment to activate.
 */

// Commercial Zones - Definition and validation
export {
  COMMERCIAL_ZONES,
  FORBIDDEN_ZONES,
  SEO_CRITICAL_PATHS,
  validateZone,
  validateContentInZone,
  isSEOCriticalPath,
  getZonesForContentType,
  getMaxPlacementsForPage,
  type CommercialZone,
  type CommercialZoneType,
  type ContentType,
  type ForbiddenZone,
  type ZoneValidationResult,
} from './commercial-zones';

// Monetization Hooks - Placeholder functions (disabled by default)
export {
  isMonetizationEnabled,
  isFeatureEnabled,
  useAffiliateLink,
  useCommercialContent,
  usePremiumGate,
  useBookingCTA,
  trackCommercialEvent,
  useAffiliateDisclosure,
  affiliateDisclosureMiddleware,
  validateMonetizationConfig,
  type AffiliateLink,
  type AffiliateLinkOptions,
  type CommercialContent,
  type InjectContentOptions,
  type PremiumGate,
  type PremiumContentOptions,
  type BookingCTA,
  type BookingCTAOptions,
  type TrackingEvent,
} from './hooks';

// Affiliate Hooks - Placeholder affiliate integration (disabled by default)
export {
  isAffiliateHooksEnabled,
  useAffiliateLinkHook,
  useAffiliateInjectionHook,
  trackAffiliateEvent,
  useAffiliateDisclosureHook,
  getAffiliateHookStatus,
  type AffiliatePartner,
  type AffiliateProductType,
  type AffiliateLinkConfig,
  type AffiliateLinkResult,
  type AffiliateInjectionConfig,
  type AffiliateInjectionResult,
  type AffiliateEventType,
  type AffiliateTrackingEvent,
  type AffiliateDisclosureConfig,
  type AffiliateDisclosureResult,
  type AffiliateHookStatus,
} from './affiliate-hooks';

// Existing monetization modules (already implemented)
// Note: These are separate from the new hook-based system
// and may be integrated in future phases

// Re-export status check for easy verification
export function getMonetizationStatus() {
  const { validateMonetizationConfig, isMonetizationEnabled, isFeatureEnabled } = require('./hooks');
  
  return {
    enabled: isMonetizationEnabled(),
    features: {
      hotels: isFeatureEnabled('hotels'),
      experiences: isFeatureEnabled('experiences'),
      premium: isFeatureEnabled('premium'),
      leads: isFeatureEnabled('leads'),
    },
    validation: validateMonetizationConfig(),
  };
}
