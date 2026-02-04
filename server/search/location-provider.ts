/**
 * Search Location Provider
 *
 * GAP D: DB-driven location candidates for search intent classification.
 * Replaces hardcoded DUBAI_LOCATIONS with database-driven locations.
 *
 * Features:
 * - TTL-bounded cache (5 minute refresh)
 * - Size-bounded (max 1000 locations)
 * - Fallback to hardcoded list if DB unavailable
 * - Multi-language support (English, Hebrew, Arabic)
 */

import { db } from "../db";
import { destinations, contents, attractions, hotels, districts } from "@shared/schema";
import { eq, sql, or, isNotNull } from "drizzle-orm";
import { log } from "../lib/logger";

const providerLogger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[LocationProvider] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[LocationProvider] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[LocationProvider] ${msg}`, data),
};

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_LOCATIONS = 1000;

interface LocationCache {
  locations: string[];
  lastRefresh: number;
  fromDb: boolean;
}

let locationCache: LocationCache | null = null;

// ============================================================================
// Fallback Locations (Original DUBAI_LOCATIONS)
// ============================================================================

const FALLBACK_LOCATIONS = [
  // English
  "dubai marina",
  "palm jumeirah",
  "downtown dubai",
  "burj khalifa",
  "jbr",
  "jumeirah beach",
  "deira",
  "bur dubai",
  "business bay",
  "difc",
  "jumeirah",
  "al barsha",
  "dubai mall",
  "dubai creek",
  "festival city",
  "silicon oasis",
  "motor city",
  "sports city",
  "arabian ranches",
  "dubai hills",
  "city walk",
  "la mer",
  "bluewaters",
  "ain dubai",
  // Arabic
  "دبي مارينا",
  "نخلة جميرا",
  "برج خليفة",
];

// ============================================================================
// Location Fetching from Database
// ============================================================================

/**
 * Fetch location names from destinations table.
 */
async function fetchDestinationLocations(): Promise<string[]> {
  try {
    const results = await db
      .select({
        name: destinations.name,
        nameHe: (destinations as any).nameHe,
        nameAr: (destinations as any).nameAr,
      })
      .from(destinations)
      .where(eq(destinations.isActive, true))
      .limit(MAX_LOCATIONS);

    const names: string[] = [];
    for (const row of results) {
      if (row.name) names.push(row.name.toLowerCase());
      if (row.nameHe) names.push(row.nameHe);
      if (row.nameAr) names.push(row.nameAr);
    }
    return names;
  } catch (error) {
    providerLogger.error("Failed to fetch destinations", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return [];
  }
}

/**
 * Fetch location names from district content.
 */
async function fetchDistrictLocations(): Promise<string[]> {
  try {
    const results = await db
      .select({
        title: contents.title,
        name: (districts as any).name,
      })
      .from(districts)
      .innerJoin(contents, eq(districts.contentId, contents.id))
      .where(eq(contents.status, "published"))
      .limit(MAX_LOCATIONS);

    const names: string[] = [];
    for (const row of results) {
      if (row.title) names.push(row.title.toLowerCase());
      if (row.name) names.push(row.name.toLowerCase());
    }
    return names;
  } catch (error) {
    providerLogger.error("Failed to fetch districts", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return [];
  }
}

/**
 * Fetch location names from attractions (often contain area names).
 */
async function fetchAttractionLocations(): Promise<string[]> {
  try {
    const results = await db
      .select({
        location: attractions.location,
      })
      .from(attractions)
      .innerJoin(contents, eq(attractions.contentId, contents.id))
      .where(eq(contents.status, "published"))
      .limit(MAX_LOCATIONS);

    const names: string[] = [];
    for (const row of results) {
      if (row.location) names.push(row.location.toLowerCase());
    }
    return names;
  } catch (error) {
    providerLogger.error("Failed to fetch attraction locations", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return [];
  }
}

/**
 * Fetch location names from hotels.
 */
async function fetchHotelLocations(): Promise<string[]> {
  try {
    const results = await db
      .select({
        location: hotels.location,
      })
      .from(hotels)
      .innerJoin(contents, eq(hotels.contentId, contents.id))
      .where(eq(contents.status, "published"))
      .limit(MAX_LOCATIONS);

    const names: string[] = [];
    for (const row of results) {
      if (row.location) names.push(row.location.toLowerCase());
    }
    return names;
  } catch (error) {
    providerLogger.error("Failed to fetch hotel locations", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return [];
  }
}

// ============================================================================
// Main Provider Functions
// ============================================================================

/**
 * Refresh location cache from database.
 */
async function refreshLocationCache(): Promise<void> {
  providerLogger.info("Refreshing location cache from database");

  try {
    // Fetch from all sources in parallel
    const [destinationLocs, districtLocs, attractionLocs, hotelLocs] = await Promise.all([
      fetchDestinationLocations(),
      fetchDistrictLocations(),
      fetchAttractionLocations(),
      fetchHotelLocations(),
    ]);

    // Combine and deduplicate
    const allLocations = new Set<string>([
      ...destinationLocs,
      ...districtLocs,
      ...attractionLocs,
      ...hotelLocs,
      ...FALLBACK_LOCATIONS, // Always include fallbacks
    ]);

    const locations = Array.from(allLocations)
      .filter(loc => loc && loc.length >= 2) // Filter empty/too short
      .slice(0, MAX_LOCATIONS);

    locationCache = {
      locations,
      lastRefresh: Date.now(),
      fromDb: true,
    };

    providerLogger.info("Location cache refreshed", {
      totalLocations: locations.length,
      fromDestinations: destinationLocs.length,
      fromDistricts: districtLocs.length,
      fromAttractions: attractionLocs.length,
      fromHotels: hotelLocs.length,
    });
  } catch (error) {
    providerLogger.error("Failed to refresh location cache, using fallback", {
      error: error instanceof Error ? error.message : "Unknown",
    });

    // Fall back to hardcoded locations
    locationCache = {
      locations: FALLBACK_LOCATIONS,
      lastRefresh: Date.now(),
      fromDb: false,
    };
  }
}

/**
 * Check if cache needs refresh.
 */
function isCacheExpired(): boolean {
  if (!locationCache) return true;
  return Date.now() - locationCache.lastRefresh > CACHE_TTL_MS;
}

/**
 * Get search locations from cache or database.
 * Main export for intent classifier.
 */
export async function getSearchLocations(): Promise<string[]> {
  // Return cached if fresh
  if (locationCache && !isCacheExpired()) {
    return locationCache.locations;
  }

  // Refresh cache
  await refreshLocationCache();

  // Return cached locations (either from DB or fallback)
  return locationCache?.locations || FALLBACK_LOCATIONS;
}

/**
 * Get search locations synchronously (uses cache only).
 * Returns fallback if cache not initialized.
 * Useful for hot path where async is not acceptable.
 */
export function getSearchLocationsSync(): string[] {
  if (locationCache && !isCacheExpired()) {
    return locationCache.locations;
  }

  // Trigger background refresh
  refreshLocationCache().catch(console.error);

  // Return cached or fallback
  return locationCache?.locations || FALLBACK_LOCATIONS;
}

/**
 * Force cache invalidation.
 */
export function invalidateLocationCache(): void {
  locationCache = null;
  providerLogger.info("Location cache invalidated");
}

/**
 * Get cache status for debugging.
 */
export function getLocationCacheStatus(): {
  initialized: boolean;
  locationCount: number;
  fromDb: boolean;
  ageMs: number;
  expired: boolean;
} {
  if (!locationCache) {
    return {
      initialized: false,
      locationCount: 0,
      fromDb: false,
      ageMs: 0,
      expired: true,
    };
  }

  return {
    initialized: true,
    locationCount: locationCache.locations.length,
    fromDb: locationCache.fromDb,
    ageMs: Date.now() - locationCache.lastRefresh,
    expired: isCacheExpired(),
  };
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize location cache on module load.
 * Runs in background, doesn't block.
 */
export function initializeLocationProvider(): void {
  refreshLocationCache().catch(error => {
    providerLogger.error("Initial cache refresh failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
  });
}
