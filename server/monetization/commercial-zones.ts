/**
 * Commercial Zones - Monetization Safe Zones Definition
 * 
 * This module defines the approved locations where commercial content
 * (affiliate links, sponsored content, premium CTAs) may appear.
 * 
 * CRITICAL: All zones must be validated before content injection.
 * NEVER inject commercial content outside approved zones.
 */

export type CommercialZoneType = 
  | 'hotel-detail-footer'
  | 'hotel-comparison-widget'
  | 'experience-inline'
  | 'experience-detail-cta'
  | 'article-sidebar'
  | 'article-footer'
  | 'newsletter-promo'
  | 'itinerary-booking';

export type ContentType = 'hotel' | 'experience' | 'guide' | 'article' | 'itinerary' | 'newsletter';

export interface CommercialZone {
  id: CommercialZoneType;
  name: string;
  description: string;
  allowedContentTypes: ContentType[];
  maxPlacements: number;
  requiresDisclosure: boolean;
  seoSafe: boolean;
  placement: 'inline' | 'footer' | 'sidebar' | 'widget';
}

export const COMMERCIAL_ZONES: Record<CommercialZoneType, CommercialZone> = {
  'hotel-detail-footer': {
    id: 'hotel-detail-footer',
    name: 'Hotel Detail Page Footer',
    description: 'After main hotel content, before page footer',
    allowedContentTypes: ['hotel'],
    maxPlacements: 3,
    requiresDisclosure: true,
    seoSafe: true,
    placement: 'footer',
  },
  'hotel-comparison-widget': {
    id: 'hotel-comparison-widget',
    name: 'Hotel Comparison Widget',
    description: 'Inline "Where to Stay" comparison sections',
    allowedContentTypes: ['hotel', 'guide'],
    maxPlacements: 1,
    requiresDisclosure: true,
    seoSafe: true,
    placement: 'widget',
  },
  'experience-inline': {
    id: 'experience-inline',
    name: 'Experience Inline Recommendations',
    description: 'Between experience cards in listings',
    allowedContentTypes: ['experience'],
    maxPlacements: 2,
    requiresDisclosure: true,
    seoSafe: true,
    placement: 'inline',
  },
  'experience-detail-cta': {
    id: 'experience-detail-cta',
    name: 'Experience Detail CTA',
    description: 'After experience description, before reviews',
    allowedContentTypes: ['experience'],
    maxPlacements: 1,
    requiresDisclosure: true,
    seoSafe: true,
    placement: 'inline',
  },
  'article-sidebar': {
    id: 'article-sidebar',
    name: 'Article Sidebar',
    description: 'Related products widget in article sidebar',
    allowedContentTypes: ['article', 'guide'],
    maxPlacements: 2,
    requiresDisclosure: true,
    seoSafe: true,
    placement: 'sidebar',
  },
  'article-footer': {
    id: 'article-footer',
    name: 'Article Footer',
    description: '"Book experiences mentioned" section after article',
    allowedContentTypes: ['article', 'guide'],
    maxPlacements: 5,
    requiresDisclosure: true,
    seoSafe: true,
    placement: 'footer',
  },
  'newsletter-promo': {
    id: 'newsletter-promo',
    name: 'Newsletter Promotions',
    description: 'Curated deals section in email newsletters',
    allowedContentTypes: ['newsletter'],
    maxPlacements: 3,
    requiresDisclosure: true,
    seoSafe: true,
    placement: 'inline',
  },
  'itinerary-booking': {
    id: 'itinerary-booking',
    name: 'Itinerary Booking CTAs',
    description: '"Book this trip" CTAs on itinerary pages',
    allowedContentTypes: ['itinerary'],
    maxPlacements: 1,
    requiresDisclosure: true,
    seoSafe: true,
    placement: 'footer',
  },
};

/**
 * Zones where commercial content is NEVER allowed.
 * These are SEO-critical or UX-sensitive areas.
 */
export const FORBIDDEN_ZONES = [
  'hero-section',
  'navigation',
  'search-results-ranking',
  'above-the-fold',
  'meta-description',
  'schema-markup',
  'breadcrumbs',
  'mobile-sticky-header',
  'page-title',
  'canonical-url',
] as const;

export type ForbiddenZone = typeof FORBIDDEN_ZONES[number];

/**
 * SEO-critical paths where affiliate tracking parameters
 * should NEVER be added to URLs.
 */
export const SEO_CRITICAL_PATHS = [
  '/',
  '/destinations',
  '/destinations/*',
  '/guides',
  '/guides/*',
  '/search',
  '/about',
  '/contact',
] as const;

export interface ZoneValidationResult {
  valid: boolean;
  zone?: CommercialZone;
  error?: string;
}

/**
 * Validates if a zone ID is approved for commercial content.
 */
export function validateZone(zoneId: string): ZoneValidationResult {
  if (FORBIDDEN_ZONES.includes(zoneId as ForbiddenZone)) {
    return {
      valid: false,
      error: `Zone "${zoneId}" is forbidden for commercial content`,
    };
  }

  const zone = COMMERCIAL_ZONES[zoneId as CommercialZoneType];
  if (!zone) {
    return {
      valid: false,
      error: `Zone "${zoneId}" is not a recognized commercial zone`,
    };
  }

  return {
    valid: true,
    zone,
  };
}

/**
 * Validates if content type is allowed in a specific zone.
 */
export function validateContentInZone(
  zoneId: CommercialZoneType,
  contentType: ContentType
): ZoneValidationResult {
  const zoneResult = validateZone(zoneId);
  if (!zoneResult.valid) {
    return zoneResult;
  }

  const zone = zoneResult.zone!;
  if (!zone.allowedContentTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Content type "${contentType}" is not allowed in zone "${zoneId}"`,
    };
  }

  return {
    valid: true,
    zone,
  };
}

/**
 * Checks if a URL path is SEO-critical (no affiliate tracking allowed).
 */
export function isSEOCriticalPath(path: string): boolean {
  const normalizedPath = path.toLowerCase().replace(/\/$/, '');
  
  for (const criticalPath of SEO_CRITICAL_PATHS) {
    if (criticalPath.endsWith('/*')) {
      const basePath = criticalPath.slice(0, -2);
      if (normalizedPath === basePath || normalizedPath.startsWith(basePath + '/')) {
        return true;
      }
    } else if (normalizedPath === criticalPath) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets all available zones for a content type.
 */
export function getZonesForContentType(contentType: ContentType): CommercialZone[] {
  return Object.values(COMMERCIAL_ZONES).filter(zone =>
    zone.allowedContentTypes.includes(contentType)
  );
}

/**
 * Gets the maximum number of commercial placements allowed on a page.
 */
export function getMaxPlacementsForPage(zones: CommercialZoneType[]): number {
  return zones.reduce((total, zoneId) => {
    const zone = COMMERCIAL_ZONES[zoneId];
    return total + (zone?.maxPlacements || 0);
  }, 0);
}

/**
 * Checks if a zone ID is in the forbidden zones list.
 */
export function isForbiddenZone(zoneId: string): boolean {
  return FORBIDDEN_ZONES.includes(zoneId as ForbiddenZone);
}

/**
 * Zone Audit Result for validation endpoint
 */
export interface ZoneAuditResult {
  zonesAudited: number;
  commercialZones: Array<{
    id: CommercialZoneType;
    name: string;
    status: 'active' | 'inactive';
    seoSafe: boolean;
    requiresDisclosure: boolean;
    placement: string;
  }>;
  forbiddenZones: Array<{
    id: string;
    enforced: boolean;
  }>;
  forbiddenZonesEnforced: boolean;
  seoCompliant: boolean;
  seoCriticalPaths: string[];
}

/**
 * Perform a complete zone audit for the validation endpoint.
 * Returns detailed status of all zones and SEO compliance.
 */
export function performZoneAudit(): ZoneAuditResult {
  const commercialZonesList = Object.values(COMMERCIAL_ZONES).map(zone => ({
    id: zone.id,
    name: zone.name,
    status: 'active' as const,
    seoSafe: zone.seoSafe,
    requiresDisclosure: zone.requiresDisclosure,
    placement: zone.placement,
  }));

  const forbiddenZonesList = FORBIDDEN_ZONES.map(zone => ({
    id: zone,
    enforced: true,
  }));

  const allZonesSeoSafe = commercialZonesList.every(z => z.seoSafe);
  const allZonesRequireDisclosure = commercialZonesList.every(z => z.requiresDisclosure);
  const allForbiddenEnforced = forbiddenZonesList.every(z => z.enforced);

  return {
    zonesAudited: commercialZonesList.length + forbiddenZonesList.length,
    commercialZones: commercialZonesList,
    forbiddenZones: forbiddenZonesList,
    forbiddenZonesEnforced: allForbiddenEnforced,
    seoCompliant: allZonesSeoSafe && allZonesRequireDisclosure && allForbiddenEnforced,
    seoCriticalPaths: [...SEO_CRITICAL_PATHS],
  };
}
