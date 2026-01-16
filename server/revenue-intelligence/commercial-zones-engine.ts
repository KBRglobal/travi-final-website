/**
 * Commercial Zones Engine
 * Feature Flag: ENABLE_COMMERCIAL_ZONES=true
 *
 * Defines and resolves commercial zones per content at request time.
 * Zones include: inline, sidebar, footer, intent-based.
 */

import { createLogger } from '../lib/logger';
import {
  isCommercialZonesEnabled,
  COMMERCIAL_ZONES_CONFIG,
  CACHE_CONFIG,
  TIMEOUTS,
  isForbiddenZone,
} from './config';
import type {
  CommercialZone,
  ZoneResolutionContext,
  ResolvedZone,
  ZonePlacement,
  CacheEntry,
  CacheStats,
} from './types';

const logger = createLogger('commercial-zones-engine');

// ============================================================================
// Bounded LRU Cache for Zone Resolution
// ============================================================================

class ZoneResolutionCache {
  private cache = new Map<string, CacheEntry<ResolvedZone[]>>();
  private stats = { hits: 0, misses: 0 };
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): ResolvedZone[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: ResolvedZone[]): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      createdAt: Date.now(),
    });
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
}

const resolutionCache = new ZoneResolutionCache(
  CACHE_CONFIG.zoneResolution.maxSize,
  CACHE_CONFIG.zoneResolution.ttlMs
);

// ============================================================================
// Zone Resolution Engine
// ============================================================================

/**
 * Generate a deterministic cache key for zone resolution context
 */
function generateCacheKey(context: ZoneResolutionContext): string {
  const parts = [
    context.contentId,
    context.contentType,
    context.contentLength.toString(),
    context.userIntent || 'none',
    context.viewportSize || 'desktop',
    context.entities.map(e => e.id).sort().join(','),
  ];
  return `zone:${parts.join(':')}`;
}

/**
 * Check if a zone is applicable for the given context
 */
function isZoneApplicable(zone: CommercialZone, context: ZoneResolutionContext): boolean {
  // Check content type
  if (!zone.allowedContentTypes.includes(context.contentType)) {
    return false;
  }

  // Check minimum content length
  if (zone.minContentLength && context.contentLength < zone.minContentLength) {
    return false;
  }

  // Check intent triggers for intent-based zones
  if (zone.position === 'intent-based' && zone.intentTriggers) {
    if (!context.userIntent) {
      return false;
    }
    const intentLower = context.userIntent.toLowerCase();
    const hasMatchingTrigger = zone.intentTriggers.some(trigger =>
      intentLower.includes(trigger.toLowerCase())
    );
    if (!hasMatchingTrigger) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate placements for a zone based on context
 */
function calculatePlacements(
  zone: CommercialZone,
  context: ZoneResolutionContext
): ZonePlacement[] {
  const placements: ZonePlacement[] = [];
  const eligibleEntities = context.entities.filter(e => e.affiliateEligible);

  // Determine number of placements based on eligible entities and zone max
  const placementCount = Math.min(zone.maxPlacements, Math.max(1, eligibleEntities.length));

  for (let i = 0; i < placementCount; i++) {
    const entity = eligibleEntities[i];
    placements.push({
      zoneId: zone.id,
      position: i,
      entityId: entity?.id,
      productType: entity?.type,
    });
  }

  return placements;
}

/**
 * Resolve commercial zones for a given context
 * Returns zones sorted by priority
 */
export async function resolveZones(
  context: ZoneResolutionContext
): Promise<ResolvedZone[]> {
  if (!isCommercialZonesEnabled()) {
    logger.debug({ contentId: context.contentId }, 'Commercial zones disabled');
    return [];
  }

  // Check cache first
  const cacheKey = generateCacheKey(context);
  const cached = resolutionCache.get(cacheKey);
  if (cached) {
    logger.debug({ contentId: context.contentId, cached: true }, 'Zone resolution cache hit');
    return cached;
  }

  // Timeout wrapper for resolution
  const resolveWithTimeout = new Promise<ResolvedZone[]>((resolve) => {
    const timeoutId = setTimeout(() => {
      logger.warn({ contentId: context.contentId }, 'Zone resolution timeout');
      resolve([]);
    }, TIMEOUTS.zoneResolution);

    try {
      const zones = Object.values(COMMERCIAL_ZONES_CONFIG);
      const resolvedZones: ResolvedZone[] = [];

      for (const zone of zones) {
        // Skip forbidden zones
        if (isForbiddenZone(zone.id)) {
          continue;
        }

        if (isZoneApplicable(zone, context)) {
          const placements = calculatePlacements(zone, context);
          resolvedZones.push({
            zone,
            placements,
            disclosureRequired: zone.requiresDisclosure,
          });
        }
      }

      // Sort by priority (lower = higher priority)
      resolvedZones.sort((a, b) => a.zone.priority - b.zone.priority);

      clearTimeout(timeoutId);
      resolve(resolvedZones);
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error({ contentId: context.contentId, error }, 'Zone resolution error');
      resolve([]);
    }
  });

  const result = await resolveWithTimeout;

  // Cache the result
  resolutionCache.set(cacheKey, result);

  logger.info({
    contentId: context.contentId,
    zonesResolved: result.length,
    zoneIds: result.map(r => r.zone.id),
  }, 'Zones resolved');

  return result;
}

/**
 * Get available zones for a content type
 */
export function getZonesForContentType(contentType: string): CommercialZone[] {
  if (!isCommercialZonesEnabled()) {
    return [];
  }

  return Object.values(COMMERCIAL_ZONES_CONFIG).filter(zone =>
    zone.allowedContentTypes.includes(contentType) && !isForbiddenZone(zone.id)
  );
}

/**
 * Get all zone configurations
 */
export function getAllZones(): CommercialZone[] {
  if (!isCommercialZonesEnabled()) {
    return [];
  }

  return Object.values(COMMERCIAL_ZONES_CONFIG).filter(zone =>
    !isForbiddenZone(zone.id)
  );
}

/**
 * Get a specific zone by ID
 */
export function getZoneById(zoneId: string): CommercialZone | null {
  if (!isCommercialZonesEnabled()) {
    return null;
  }

  if (isForbiddenZone(zoneId)) {
    return null;
  }

  return COMMERCIAL_ZONES_CONFIG[zoneId] || null;
}

/**
 * Validate zone placement request
 */
export function validateZonePlacement(
  zoneId: string,
  contentType: string,
  contentLength: number
): { valid: boolean; error?: string } {
  if (!isCommercialZonesEnabled()) {
    return { valid: false, error: 'Commercial zones feature is disabled' };
  }

  if (isForbiddenZone(zoneId)) {
    return { valid: false, error: `Zone "${zoneId}" is forbidden for commercial content` };
  }

  const zone = COMMERCIAL_ZONES_CONFIG[zoneId];
  if (!zone) {
    return { valid: false, error: `Unknown zone: ${zoneId}` };
  }

  if (!zone.allowedContentTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Content type "${contentType}" is not allowed in zone "${zoneId}"`,
    };
  }

  if (zone.minContentLength && contentLength < zone.minContentLength) {
    return {
      valid: false,
      error: `Content must be at least ${zone.minContentLength} characters for zone "${zoneId}"`,
    };
  }

  return { valid: true };
}

/**
 * Get cache statistics
 */
export function getZoneCacheStats(): CacheStats {
  return resolutionCache.getStats();
}

/**
 * Clear zone resolution cache
 */
export function clearZoneCache(): void {
  resolutionCache.clear();
  logger.info({}, 'Zone resolution cache cleared');
}

// ============================================================================
// Zone Engine Status
// ============================================================================

export interface ZoneEngineStatus {
  enabled: boolean;
  zonesConfigured: number;
  forbiddenZones: number;
  cacheStats: CacheStats;
}

export function getZoneEngineStatus(): ZoneEngineStatus {
  return {
    enabled: isCommercialZonesEnabled(),
    zonesConfigured: Object.keys(COMMERCIAL_ZONES_CONFIG).length,
    forbiddenZones: Object.keys(COMMERCIAL_ZONES_CONFIG).filter(id => isForbiddenZone(id)).length,
    cacheStats: getZoneCacheStats(),
  };
}
