/**
 * Octopus v2 - Image Fallback Strategy
 * 
 * PHASE 2: FALLBACK STRATEGY (SEO CRITICAL)
 * Goal: No broken pages. Ever.
 * 
 * Deterministic fallback system per entity type.
 * Fallbacks are:
 * - Pre-approved
 * - Non-AI
 * - Reusable safely
 * 
 * In production mode, return fallback instead of throwing.
 * In strict/dev mode, still throw.
 */

import { log } from '../lib/logger';
import { type EntityType } from './image-entity-presets';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[ImageFallback] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => 
    log.warn(`[ImageFallback] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[ImageFallback] ${msg}`, undefined, data),
};

/**
 * Fallback asset definition
 */
export interface FallbackAsset {
  assetId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  alt: string;
}

/**
 * Fallback configuration per entity type and role
 */
export interface FallbackConfig {
  entityType: EntityType;
  role: string;
  fallbackAssetId: string;
  fallbackUrl: string;
  fallbackReason: string;
  preApproved: true;
  safeForReuse: true;
}

/**
 * Entity fallback configurations
 * SINGLE SOURCE OF TRUTH for fallback images
 * 
 * These images are:
 * - Pre-approved for use
 * - Not AI-generated
 * - Safe for unlimited reuse
 * - Branded/generic enough to work anywhere
 */
export const ENTITY_FALLBACKS: Record<EntityType, Record<string, FallbackConfig>> = {
  destination: {
    hero: {
      entityType: 'destination',
      role: 'hero',
      fallbackAssetId: 'fallback-destination-hero',
      fallbackUrl: '/fallbacks/destination-default-hero.webp',
      fallbackReason: 'Default hero for destination pages',
      preApproved: true,
      safeForReuse: true,
    },
    card: {
      entityType: 'destination',
      role: 'card',
      fallbackAssetId: 'fallback-destination-card',
      fallbackUrl: '/fallbacks/destination-default-card.webp',
      fallbackReason: 'Default card image for destination',
      preApproved: true,
      safeForReuse: true,
    },
    thumbnail: {
      entityType: 'destination',
      role: 'thumbnail',
      fallbackAssetId: 'fallback-destination-thumbnail',
      fallbackUrl: '/fallbacks/destination-default-thumbnail.webp',
      fallbackReason: 'Default thumbnail for destination',
      preApproved: true,
      safeForReuse: true,
    },
    og_image: {
      entityType: 'destination',
      role: 'og_image',
      fallbackAssetId: 'fallback-destination-og',
      fallbackUrl: '/fallbacks/destination-default-og.webp',
      fallbackReason: 'Default Open Graph image for destination',
      preApproved: true,
      safeForReuse: true,
    },
    gallery: {
      entityType: 'destination',
      role: 'gallery',
      fallbackAssetId: 'fallback-destination-gallery',
      fallbackUrl: '/fallbacks/destination-default-gallery.webp',
      fallbackReason: 'Default gallery image for destination',
      preApproved: true,
      safeForReuse: true,
    },
  },
  hotel: {
    hero: {
      entityType: 'hotel',
      role: 'hero',
      fallbackAssetId: 'fallback-hotel-hero',
      fallbackUrl: '/fallbacks/generic-hotel-exterior.webp',
      fallbackReason: 'Default hero for hotel pages',
      preApproved: true,
      safeForReuse: true,
    },
    interior: {
      entityType: 'hotel',
      role: 'interior',
      fallbackAssetId: 'fallback-hotel-interior',
      fallbackUrl: '/fallbacks/generic-hotel-interior.webp',
      fallbackReason: 'Default interior image for hotel',
      preApproved: true,
      safeForReuse: true,
    },
    exterior: {
      entityType: 'hotel',
      role: 'exterior',
      fallbackAssetId: 'fallback-hotel-exterior',
      fallbackUrl: '/fallbacks/generic-hotel-exterior.webp',
      fallbackReason: 'Default exterior image for hotel',
      preApproved: true,
      safeForReuse: true,
    },
    card: {
      entityType: 'hotel',
      role: 'card',
      fallbackAssetId: 'fallback-hotel-card',
      fallbackUrl: '/fallbacks/generic-hotel-card.webp',
      fallbackReason: 'Default card image for hotel',
      preApproved: true,
      safeForReuse: true,
    },
    thumbnail: {
      entityType: 'hotel',
      role: 'thumbnail',
      fallbackAssetId: 'fallback-hotel-thumbnail',
      fallbackUrl: '/fallbacks/generic-hotel-thumbnail.webp',
      fallbackReason: 'Default thumbnail for hotel',
      preApproved: true,
      safeForReuse: true,
    },
    og_image: {
      entityType: 'hotel',
      role: 'og_image',
      fallbackAssetId: 'fallback-hotel-og',
      fallbackUrl: '/fallbacks/generic-hotel-og.webp',
      fallbackReason: 'Default Open Graph image for hotel',
      preApproved: true,
      safeForReuse: true,
    },
    gallery: {
      entityType: 'hotel',
      role: 'gallery',
      fallbackAssetId: 'fallback-hotel-gallery',
      fallbackUrl: '/fallbacks/generic-hotel-gallery.webp',
      fallbackReason: 'Default gallery image for hotel',
      preApproved: true,
      safeForReuse: true,
    },
  },
  restaurant: {
    hero: {
      entityType: 'restaurant',
      role: 'hero',
      fallbackAssetId: 'fallback-restaurant-hero',
      fallbackUrl: '/fallbacks/generic-restaurant-interior.webp',
      fallbackReason: 'Default hero for restaurant pages',
      preApproved: true,
      safeForReuse: true,
    },
    food: {
      entityType: 'restaurant',
      role: 'food',
      fallbackAssetId: 'fallback-restaurant-food',
      fallbackUrl: '/fallbacks/generic-dish.webp',
      fallbackReason: 'Default food image for restaurant',
      preApproved: true,
      safeForReuse: true,
    },
    interior: {
      entityType: 'restaurant',
      role: 'interior',
      fallbackAssetId: 'fallback-restaurant-interior',
      fallbackUrl: '/fallbacks/generic-restaurant-interior.webp',
      fallbackReason: 'Default interior image for restaurant',
      preApproved: true,
      safeForReuse: true,
    },
    card: {
      entityType: 'restaurant',
      role: 'card',
      fallbackAssetId: 'fallback-restaurant-card',
      fallbackUrl: '/fallbacks/generic-dish.webp',
      fallbackReason: 'Default card image for restaurant',
      preApproved: true,
      safeForReuse: true,
    },
    thumbnail: {
      entityType: 'restaurant',
      role: 'thumbnail',
      fallbackAssetId: 'fallback-restaurant-thumbnail',
      fallbackUrl: '/fallbacks/generic-restaurant-thumbnail.webp',
      fallbackReason: 'Default thumbnail for restaurant',
      preApproved: true,
      safeForReuse: true,
    },
    og_image: {
      entityType: 'restaurant',
      role: 'og_image',
      fallbackAssetId: 'fallback-restaurant-og',
      fallbackUrl: '/fallbacks/generic-restaurant-og.webp',
      fallbackReason: 'Default Open Graph image for restaurant',
      preApproved: true,
      safeForReuse: true,
    },
    gallery: {
      entityType: 'restaurant',
      role: 'gallery',
      fallbackAssetId: 'fallback-restaurant-gallery',
      fallbackUrl: '/fallbacks/generic-restaurant-gallery.webp',
      fallbackReason: 'Default gallery image for restaurant',
      preApproved: true,
      safeForReuse: true,
    },
  },
  attraction: {
    hero: {
      entityType: 'attraction',
      role: 'hero',
      fallbackAssetId: 'fallback-attraction-hero',
      fallbackUrl: '/fallbacks/generic-attraction-hero.webp',
      fallbackReason: 'Default hero for attraction pages',
      preApproved: true,
      safeForReuse: true,
    },
    exterior: {
      entityType: 'attraction',
      role: 'exterior',
      fallbackAssetId: 'fallback-attraction-exterior',
      fallbackUrl: '/fallbacks/generic-attraction-exterior.webp',
      fallbackReason: 'Default exterior image for attraction',
      preApproved: true,
      safeForReuse: true,
    },
    card: {
      entityType: 'attraction',
      role: 'card',
      fallbackAssetId: 'fallback-attraction-card',
      fallbackUrl: '/fallbacks/generic-attraction-card.webp',
      fallbackReason: 'Default card image for attraction',
      preApproved: true,
      safeForReuse: true,
    },
    thumbnail: {
      entityType: 'attraction',
      role: 'thumbnail',
      fallbackAssetId: 'fallback-attraction-thumbnail',
      fallbackUrl: '/fallbacks/generic-attraction-thumbnail.webp',
      fallbackReason: 'Default thumbnail for attraction',
      preApproved: true,
      safeForReuse: true,
    },
    og_image: {
      entityType: 'attraction',
      role: 'og_image',
      fallbackAssetId: 'fallback-attraction-og',
      fallbackUrl: '/fallbacks/generic-attraction-og.webp',
      fallbackReason: 'Default Open Graph image for attraction',
      preApproved: true,
      safeForReuse: true,
    },
    gallery: {
      entityType: 'attraction',
      role: 'gallery',
      fallbackAssetId: 'fallback-attraction-gallery',
      fallbackUrl: '/fallbacks/generic-attraction-gallery.webp',
      fallbackReason: 'Default gallery image for attraction',
      preApproved: true,
      safeForReuse: true,
    },
  },
  news: {
    hero: {
      entityType: 'news',
      role: 'hero',
      fallbackAssetId: 'fallback-news-hero',
      fallbackUrl: '/fallbacks/generic-news-hero.webp',
      fallbackReason: 'Default hero for news articles',
      preApproved: true,
      safeForReuse: true,
    },
    cover: {
      entityType: 'news',
      role: 'cover',
      fallbackAssetId: 'fallback-news-cover',
      fallbackUrl: '/fallbacks/generic-news-cover.webp',
      fallbackReason: 'Default cover image for news',
      preApproved: true,
      safeForReuse: true,
    },
    card: {
      entityType: 'news',
      role: 'card',
      fallbackAssetId: 'fallback-news-card',
      fallbackUrl: '/fallbacks/generic-news-card.webp',
      fallbackReason: 'Default card image for news',
      preApproved: true,
      safeForReuse: true,
    },
    thumbnail: {
      entityType: 'news',
      role: 'thumbnail',
      fallbackAssetId: 'fallback-news-thumbnail',
      fallbackUrl: '/fallbacks/generic-news-thumbnail.webp',
      fallbackReason: 'Default thumbnail for news',
      preApproved: true,
      safeForReuse: true,
    },
    og_image: {
      entityType: 'news',
      role: 'og_image',
      fallbackAssetId: 'fallback-news-og',
      fallbackUrl: '/fallbacks/generic-news-og.webp',
      fallbackReason: 'Default Open Graph image for news',
      preApproved: true,
      safeForReuse: true,
    },
  },
};

/**
 * Get fallback configuration for an entity type and role
 */
export function getEntityFallbackConfig(
  entityType: string,
  role: string
): FallbackConfig | null {
  const entityFallbacks = ENTITY_FALLBACKS[entityType as EntityType];
  if (!entityFallbacks) {
    logger.warn('No fallback config for entity type', { entityType });
    return null;
  }
  
  const config = entityFallbacks[role];
  if (!config) {
    // Try to find a generic fallback (hero or card)
    const genericFallback = entityFallbacks['hero'] || entityFallbacks['card'];
    if (genericFallback) {
      logger.info('Using generic fallback for role', { entityType, role, using: genericFallback.role });
      return genericFallback;
    }
    logger.warn('No fallback config for role', { entityType, role });
    return null;
  }
  
  return config;
}

/**
 * Get a fallback asset for an entity type and role
 */
export function getFallbackAsset(
  entityType: string,
  role: string
): FallbackAsset | null {
  const config = getEntityFallbackConfig(entityType, role);
  if (!config) {
    return null;
  }
  
  logger.info('Returning fallback asset', {
    entityType,
    role,
    assetId: config.fallbackAssetId,
    reason: config.fallbackReason,
  });
  
  return {
    assetId: config.fallbackAssetId,
    url: config.fallbackUrl,
    width: 1200,
    height: 800,
    format: 'webp',
    alt: `Default ${role} image for ${entityType}`,
  };
}

/**
 * Check if strict mode is enabled
 * In strict mode, we throw errors instead of using fallbacks
 */
export function isStrictModeEnabled(): boolean {
  return process.env.IMAGE_USAGE_STRICT === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Get fallback or throw based on mode
 * - Production: Return fallback, log as WARN
 * - Strict/Dev: Throw error
 */
export function getFallbackOrThrow(
  entityType: string,
  role: string,
  originalError: Error
): FallbackAsset {
  if (isStrictModeEnabled()) {
    logger.error('Strict mode: throwing error instead of fallback', {
      entityType,
      role,
      error: originalError.message,
    });
    throw originalError;
  }
  
  const fallback = getFallbackAsset(entityType, role);
  if (!fallback) {
    // Even in production, if there's no fallback configured, we must throw
    logger.error('No fallback available, must throw', { entityType, role });
    throw originalError;
  }
  
  logger.warn('Using fallback in production mode', {
    entityType,
    role,
    fallbackAssetId: fallback.assetId,
    originalError: originalError.message,
  });
  
  return fallback;
}

/**
 * Get all available fallbacks
 */
export function getAllFallbacks(): Record<string, FallbackConfig[]> {
  const result: Record<string, FallbackConfig[]> = {};
  
  for (const [entityType, roles] of Object.entries(ENTITY_FALLBACKS)) {
    result[entityType] = Object.values(roles);
  }
  
  return result;
}
