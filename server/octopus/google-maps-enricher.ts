/**
 * Octopus Engine - Google Maps Enrichment
 * Enriches entities with Google Maps/Places data
 * GPS coordinates, ratings, photos, reviews, opening hours
 */

import { log } from '../lib/logger';
import { fetchWithTimeout } from '../lib/fetch-with-timeout';
import type { ExtractedEntity, EntityLocation } from './entity-extractor';

const GOOGLE_MAPS_TIMEOUT_MS = 15000;

const octopusLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Octopus Maps] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Octopus Maps] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Octopus Maps] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types: string[];
  openingHours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
  phoneNumber?: string;
  website?: string;
  photos?: PlacePhoto[];
  reviews?: PlaceReview[];
  vicinity?: string;
  businessStatus?: string;
}

export interface PlacePhoto {
  reference: string;
  width: number;
  height: number;
  attributions: string[];
  url?: string;
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  time: number;
  relativeTime: string;
  language?: string;
}

// EnrichedEntity combines ExtractedEntity with Google Maps data
// We use intersection type instead of extends to handle union types
export type EnrichedEntity = ExtractedEntity & {
  googleMapsData?: {
    placeId: string;
    coordinates: { lat: number; lng: number };
    rating: number;
    reviewCount: number;
    priceLevel?: number;
    photos: string[];
    topReviews: { author: string; rating: number; text: string }[];
    openingHours?: string[];
    phoneNumber?: string;
    website?: string;
    businessStatus?: string;
    enrichedAt: Date;
  };
}

export interface EnrichmentResult {
  enrichedEntities: EnrichedEntity[];
  successCount: number;
  failedCount: number;
  notFoundCount: number;
  processingTime: number;
}

export interface EnrichmentOptions {
  includePhotos?: boolean;
  includeReviews?: boolean;
  maxPhotos?: number;
  maxReviews?: number;
  searchRadius?: number; // meters
  preferExactMatch?: boolean;
}

const DEFAULT_OPTIONS: EnrichmentOptions = {
  includePhotos: true,
  includeReviews: true,
  maxPhotos: 5,
  maxReviews: 3,
  searchRadius: 5000,
  preferExactMatch: true,
};

// ============================================================================
// Main Enrichment Function
// ============================================================================

/**
 * Enrich entities with Google Maps data
 */
export async function enrichWithGoogleMaps(
  entities: ExtractedEntity[],
  destination: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    octopusLogger.warn('Google Maps API key not configured. Skipping enrichment.');
    return {
      enrichedEntities: entities as EnrichedEntity[],
      successCount: 0,
      failedCount: 0,
      notFoundCount: entities.length,
      processingTime: Date.now() - startTime,
    };
  }

  const enrichedEntities: EnrichedEntity[] = [];
  let successCount = 0;
  let failedCount = 0;
  let notFoundCount = 0;

  // Process entities in batches to respect rate limits
  const batchSize = 5;
  const delayBetweenBatches = 1000; // 1 second

  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);

    const enrichmentPromises = batch.map(entity =>
      enrichSingleEntity(entity, destination, apiKey, opts)
    );

    const results = await Promise.allSettled(enrichmentPromises);

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const originalEntity = batch[j];

      if (result.status === 'fulfilled') {
        if (result.value.googleMapsData) {
          enrichedEntities.push(result.value);
          successCount++;
        } else {
          enrichedEntities.push({ ...originalEntity } as EnrichedEntity);
          notFoundCount++;
        }
      } else {
        enrichedEntities.push({ ...originalEntity } as EnrichedEntity);
        failedCount++;
        octopusLogger.warn('Entity enrichment failed', {
          entity: originalEntity.name,
          error: result.reason,
        });
      }
    }

    // Delay between batches
    if (i + batchSize < entities.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  octopusLogger.info('Google Maps enrichment complete', {
    total: entities.length,
    success: successCount,
    notFound: notFoundCount,
    failed: failedCount,
    processingTime: Date.now() - startTime,
  });

  return {
    enrichedEntities,
    successCount,
    failedCount,
    notFoundCount,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Enrich a single entity with Google Maps data
 */
async function enrichSingleEntity(
  entity: ExtractedEntity,
  destination: string,
  apiKey: string,
  options: EnrichmentOptions
): Promise<EnrichedEntity> {
  const enrichedEntity: EnrichedEntity = { ...entity };

  try {
    // Step 1: Find place
    const searchQuery = buildSearchQuery(entity, destination);
    const placeId = await findPlace(searchQuery, apiKey, options.searchRadius || 5000);

    if (!placeId) {
      octopusLogger.info('Place not found', { entity: entity.name, query: searchQuery });
      return enrichedEntity;
    }

    // Step 2: Get place details
    const placeDetails = await getPlaceDetails(placeId, apiKey, options);

    if (!placeDetails) {
      return enrichedEntity;
    }

    // Step 3: Attach data to entity
    enrichedEntity.googleMapsData = {
      placeId: placeDetails.placeId,
      coordinates: placeDetails.location,
      rating: placeDetails.rating || 0,
      reviewCount: placeDetails.userRatingsTotal || 0,
      priceLevel: placeDetails.priceLevel,
      photos: placeDetails.photos?.slice(0, options.maxPhotos).map(p => p.url || p.reference) || [],
      topReviews: placeDetails.reviews?.slice(0, options.maxReviews).map(r => ({
        author: r.authorName,
        rating: r.rating,
        text: r.text,
      })) || [],
      openingHours: placeDetails.openingHours?.weekdayText,
      phoneNumber: placeDetails.phoneNumber,
      website: placeDetails.website,
      businessStatus: placeDetails.businessStatus,
      enrichedAt: new Date(),
    };

    // Update entity location with precise coordinates
    enrichedEntity.location = {
      ...enrichedEntity.location,
      address: placeDetails.formattedAddress,
      coordinates: placeDetails.location,
    };

    octopusLogger.info('Entity enriched', {
      name: entity.name,
      rating: placeDetails.rating,
      reviewCount: placeDetails.userRatingsTotal,
    });

    return enrichedEntity;
  } catch (error) {
    octopusLogger.error('Failed to enrich entity', { entity: entity.name, error });
    return enrichedEntity;
  }
}

// ============================================================================
// Google Maps API Functions
// ============================================================================

/**
 * Find a place using Text Search
 */
async function findPlace(
  query: string,
  apiKey: string,
  radius: number
): Promise<string | null> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
    url.searchParams.set('input', query);
    url.searchParams.set('inputtype', 'textquery');
    url.searchParams.set('fields', 'place_id,name,formatted_address');
    url.searchParams.set('key', apiKey);

    const response = await fetchWithTimeout(url.toString(), { timeoutMs: GOOGLE_MAPS_TIMEOUT_MS });
    const data = await response.json();

    if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
      return data.candidates[0].place_id;
    }

    if (data.status === 'ZERO_RESULTS') {
      return null;
    }

    if (data.status !== 'OK') {
      octopusLogger.warn('Place search failed', { status: data.status, query });
    }

    return null;
  } catch (error) {
    octopusLogger.error('Place search error', { query, error });
    return null;
  }
}

/**
 * Get detailed place information
 */
async function getPlaceDetails(
  placeId: string,
  apiKey: string,
  options: EnrichmentOptions
): Promise<PlaceDetails | null> {
  try {
    const fields = [
      'place_id',
      'name',
      'formatted_address',
      'geometry',
      'rating',
      'user_ratings_total',
      'price_level',
      'types',
      'opening_hours',
      'formatted_phone_number',
      'website',
      'business_status',
      'vicinity',
    ];

    if (options.includePhotos) {
      fields.push('photos');
    }
    if (options.includeReviews) {
      fields.push('reviews');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', fields.join(','));
    url.searchParams.set('key', apiKey);

    const response = await fetchWithTimeout(url.toString(), { timeoutMs: GOOGLE_MAPS_TIMEOUT_MS });
    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      octopusLogger.warn('Place details failed', { status: data.status, placeId });
      return null;
    }

    const result = data.result;

    return {
      placeId: result.place_id,
      name: result.name,
      formattedAddress: result.formatted_address,
      location: {
        lat: result.geometry?.location?.lat,
        lng: result.geometry?.location?.lng,
      },
      rating: result.rating,
      userRatingsTotal: result.user_ratings_total,
      priceLevel: result.price_level,
      types: result.types || [],
      openingHours: result.opening_hours ? {
        openNow: result.opening_hours.open_now,
        weekdayText: result.opening_hours.weekday_text,
      } : undefined,
      phoneNumber: result.formatted_phone_number,
      website: result.website,
      businessStatus: result.business_status,
      vicinity: result.vicinity,
      photos: result.photos?.map((p: any) => ({
        reference: p.photo_reference,
        width: p.width,
        height: p.height,
        attributions: p.html_attributions || [],
        url: getPhotoUrl(p.photo_reference, apiKey, 800),
      })),
      reviews: result.reviews?.map((r: any) => ({
        authorName: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.time,
        relativeTime: r.relative_time_description,
        language: r.language,
      })),
    };
  } catch (error) {
    octopusLogger.error('Place details error', { placeId, error });
    return null;
  }
}

/**
 * Generate photo URL from reference
 */
function getPhotoUrl(photoReference: string, apiKey: string, maxWidth: number = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build search query for entity
 */
function buildSearchQuery(entity: ExtractedEntity, destination: string): string {
  const parts = [entity.name];

  // Add type for better matching
  if (entity.type === 'hotel') {
    parts.push('hotel');
  } else if (entity.type === 'restaurant') {
    parts.push('restaurant');
  }

  // Add location context
  if (entity.location?.neighborhood) {
    parts.push(entity.location.neighborhood);
  }

  if (entity.location?.city) {
    parts.push(entity.location.city);
  } else {
    parts.push(destination);
  }

  return parts.join(' ');
}

/**
 * Batch enrich multiple entities efficiently
 */
export async function batchEnrichWithGoogleMaps(
  entities: ExtractedEntity[],
  destination: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  // Split by entity type for better caching
  const hotelEntities = entities.filter(e => e.type === 'hotel');
  const restaurantEntities = entities.filter(e => e.type === 'restaurant');
  const otherEntities = entities.filter(e => !['hotel', 'restaurant'].includes(e.type));

  const results = await Promise.all([
    enrichWithGoogleMaps(hotelEntities, destination, { ...options }),
    enrichWithGoogleMaps(restaurantEntities, destination, { ...options }),
    enrichWithGoogleMaps(otherEntities, destination, { ...options }),
  ]);

  return {
    enrichedEntities: [
      ...results[0].enrichedEntities,
      ...results[1].enrichedEntities,
      ...results[2].enrichedEntities,
    ],
    successCount: results.reduce((sum, r) => sum + r.successCount, 0),
    failedCount: results.reduce((sum, r) => sum + r.failedCount, 0),
    notFoundCount: results.reduce((sum, r) => sum + r.notFoundCount, 0),
    processingTime: Math.max(...results.map(r => r.processingTime)),
  };
}

/**
 * Get nearby places for a location
 */
export async function getNearbyPlaces(
  location: { lat: number; lng: number },
  type: string,
  radius: number = 1000
): Promise<PlaceDetails[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${location.lat},${location.lng}`);
    url.searchParams.set('radius', radius.toString());
    url.searchParams.set('type', type);
    url.searchParams.set('key', apiKey);

    const response = await fetchWithTimeout(url.toString(), { timeoutMs: GOOGLE_MAPS_TIMEOUT_MS });
    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    return data.results.map((r: any) => ({
      placeId: r.place_id,
      name: r.name,
      formattedAddress: r.vicinity,
      location: {
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
      },
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
      priceLevel: r.price_level,
      types: r.types || [],
      businessStatus: r.business_status,
    }));
  } catch (error) {
    octopusLogger.error('Nearby search error', { location, type, error });
    return [];
  }
}

/**
 * Check if Google Maps API is configured
 */
export function isGoogleMapsConfigured(): boolean {
  return !!(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY);
}

/**
 * Get enrichment stats
 */
export function getEnrichmentStats(result: EnrichmentResult): {
  totalProcessed: number;
  enriched: number;
  enrichmentRate: number;
  averageRating: number;
  topRated: { name: string; rating: number }[];
} {
  const enriched = result.enrichedEntities.filter(e => e.googleMapsData);
  const ratings = enriched
    .filter(e => e.googleMapsData?.rating)
    .map(e => e.googleMapsData!.rating);

  return {
    totalProcessed: result.enrichedEntities.length,
    enriched: enriched.length,
    enrichmentRate: Math.round((enriched.length / result.enrichedEntities.length) * 100),
    averageRating: ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0,
    topRated: enriched
      .filter(e => e.googleMapsData?.rating)
      .sort((a, b) => (b.googleMapsData?.rating || 0) - (a.googleMapsData?.rating || 0))
      .slice(0, 5)
      .map(e => ({ name: e.name, rating: e.googleMapsData!.rating })),
  };
}
