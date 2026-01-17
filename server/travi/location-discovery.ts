/**
 * TRAVI Content Generation - Location Discovery Service
 * 
 * Combines Wikipedia, OpenStreetMap, and TripAdvisor to discover locations
 * for each destination with proper attribution tracking.
 */

import { 
  searchNearbyLocations, 
  searchCityAttractions, 
  filterTourismLocations,
  WIKIPEDIA_ATTRIBUTION,
  type WikipediaLocation 
} from './wikipedia-client';
import { 
  searchInBoundingBox, 
  searchNearPoint, 
  getBoundingBox, 
  extractMetadata,
  mergeWithWikipedia,
  OSM_ATTRIBUTION,
  type OSMLocation 
} from './osm-client';
import {
  discoverAllInCity as discoverTripAdvisorLocations,
  isTripAdvisorAvailable,
  TRIPADVISOR_ATTRIBUTION,
  type TripAdvisorLocation
} from './tripadvisor-client';
import { 
  DESTINATION_METADATA, 
  getDestinationBySlug,
  type DestinationSlug 
} from './destination-seeder';
import { validateLocation, generateSlug } from './validation';

export type LocationCategory = 'attraction' | 'hotel' | 'restaurant';

export interface DiscoveredLocation {
  externalId: string;
  name: string;
  slug: string;
  category: LocationCategory;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  destinationSlug: DestinationSlug;
  sources: {
    wikipedia?: {
      pageid: number;
      url: string;
      extract: string;
      categories: string[];
      thumbnailUrl?: string;
    };
    osm?: {
      id: number;
      type: 'node' | 'way' | 'relation';
      url: string;
      tags: Record<string, string>;
      metadata: ReturnType<typeof extractMetadata>;
    };
    tripadvisor?: {
      locationId: string;
      address?: string;
      subcategories?: string[];
    };
  };
  attribution: {
    wikipedia?: typeof WIKIPEDIA_ATTRIBUTION;
    osm?: typeof OSM_ATTRIBUTION;
    tripadvisor?: typeof TRIPADVISOR_ATTRIBUTION;
  };
  validationErrors: string[];
  validationWarnings: string[];
}

export interface DiscoveryResult {
  destinationSlug: DestinationSlug;
  category: LocationCategory;
  locations: DiscoveredLocation[];
  stats: {
    wikipediaCount: number;
    osmCount: number;
    tripAdvisorCount: number;
    mergedCount: number;
    validCount: number;
  };
  attribution: {
    wikipedia: typeof WIKIPEDIA_ATTRIBUTION;
    osm: typeof OSM_ATTRIBUTION;
    tripadvisor: typeof TRIPADVISOR_ATTRIBUTION;
  };
}

// Discover locations for a destination
export async function discoverLocations(
  destinationSlug: DestinationSlug,
  category: LocationCategory,
  options: {
    radiusKm?: number;
    limit?: number;
    skipWikipedia?: boolean;
    skipOSM?: boolean;
    skipTripAdvisor?: boolean;
  } = {}
): Promise<DiscoveryResult> {
  const rawDestination = getDestinationBySlug(destinationSlug);
  if (!rawDestination) {
    console.error(`[Discovery] Unknown destination: ${destinationSlug}`);
    return {
      destinationSlug,
      category,
      locations: [],
      stats: { wikipediaCount: 0, osmCount: 0, tripAdvisorCount: 0, mergedCount: 0, validCount: 0 },
      attribution: { wikipedia: WIKIPEDIA_ATTRIBUTION, osm: OSM_ATTRIBUTION, tripadvisor: TRIPADVISOR_ATTRIBUTION },
    };
  }

  // Map the raw destination to expected format
  const destination = {
    slug: rawDestination.slug,
    cityName: rawDestination.city,
    countryName: rawDestination.country,
    latitude: (rawDestination.lat.min + rawDestination.lat.max) / 2,
    longitude: (rawDestination.lng.min + rawDestination.lng.max) / 2,
  };

  const radiusKm = options.radiusKm || 15;
  const limit = options.limit || 200;

  console.log(`[Discovery] Starting discovery for ${destination.cityName}, ${category}`);

  // Fetch from Wikipedia
  let wikiLocations: WikipediaLocation[] = [];
  if (!options.skipWikipedia) {
    try {
      // Search by coordinates
      const nearbyResult = await searchNearbyLocations(
        destination.latitude,
        destination.longitude,
        radiusKm * 1000,
        Math.min(limit, 50)
      );
      
      // Also search by city name for category-specific results
      const cityResult = await searchCityAttractions(
        destination.cityName,
        category,
        limit
      );

      // Combine and filter
      const allWiki = [...nearbyResult.locations, ...cityResult.locations];
      const uniqueWiki = Array.from(
        new Map(allWiki.map(l => [l.pageid, l])).values()
      );
      wikiLocations = filterTourismLocations(uniqueWiki, category);

      console.log(`[Discovery] Wikipedia: ${wikiLocations.length} ${category}s found`);
    } catch (error) {
      console.error('[Discovery] Wikipedia search failed:', error);
    }
  }

  // Fetch from OpenStreetMap
  let osmLocations: OSMLocation[] = [];
  if (!options.skipOSM) {
    try {
      const bbox = getBoundingBox(
        destination.latitude,
        destination.longitude,
        radiusKm
      );
      
      const osmResult = await searchInBoundingBox(bbox, category, limit);
      osmLocations = osmResult.locations;

      console.log(`[Discovery] OSM: ${osmLocations.length} ${category}s found`);
    } catch (error) {
      console.error('[Discovery] OSM search failed:', error);
    }
  }

  // Fetch from TripAdvisor
  let tripAdvisorLocations: TripAdvisorLocation[] = [];
  if (!options.skipTripAdvisor && isTripAdvisorAvailable()) {
    try {
      tripAdvisorLocations = await discoverTripAdvisorLocations(
        destination.cityName,
        destination.latitude,
        destination.longitude,
        category,
        { radiusKm, maxLocations: limit }
      );

      console.log(`[Discovery] TripAdvisor: ${tripAdvisorLocations.length} ${category}s found`);
    } catch (error) {
      console.error('[Discovery] TripAdvisor search failed:', error);
    }
  } else if (!options.skipTripAdvisor) {
    console.log('[Discovery] TripAdvisor: Skipped (API not available)');
  }

  // Merge locations from all sources
  const mergedLocations = mergeLocations(
    wikiLocations,
    osmLocations,
    tripAdvisorLocations,
    destination as any,
    category
  );

  // Validate and enrich
  const validatedLocations: DiscoveredLocation[] = [];
  for (const loc of mergedLocations) {
    const validation = validateLocation({
      name: loc.name,
      slug: loc.slug,
      category: loc.category,
      city: loc.city,
      country: loc.country,
    });

    validatedLocations.push({
      ...loc,
      validationErrors: validation.errors.map(e => e.message),
      validationWarnings: validation.warnings.map(w => w.message),
    });
  }

  const validCount = validatedLocations.filter(l => l.validationErrors.length === 0).length;

  console.log(`[Discovery] Merged: ${mergedLocations.length}, Valid: ${validCount}`);

  return {
    destinationSlug,
    category,
    locations: validatedLocations,
    stats: {
      wikipediaCount: wikiLocations.length,
      osmCount: osmLocations.length,
      tripAdvisorCount: tripAdvisorLocations.length,
      mergedCount: mergedLocations.length,
      validCount,
    },
    attribution: {
      wikipedia: WIKIPEDIA_ATTRIBUTION,
      osm: OSM_ATTRIBUTION,
      tripadvisor: TRIPADVISOR_ATTRIBUTION,
    },
  };
}

// Merge Wikipedia, OSM, and TripAdvisor locations, deduplicating by proximity
function mergeLocations(
  wikiLocations: WikipediaLocation[],
  osmLocations: OSMLocation[],
  tripAdvisorLocations: TripAdvisorLocation[],
  destination: typeof DESTINATION_METADATA[0],
  category: LocationCategory
): DiscoveredLocation[] {
  const merged: Map<string, DiscoveredLocation> = new Map();
  const MERGE_DISTANCE_METERS = 100;

  // Process Wikipedia locations first
  for (const wiki of wikiLocations) {
    if (!wiki.coordinates) continue;

    const slug = generateSlug(wiki.title, (destination as any).cityName);
    const externalId = `wiki-${wiki.pageid}`;

    merged.set(externalId, {
      externalId,
      name: wiki.title,
      slug,
      category,
      latitude: wiki.coordinates.lat,
      longitude: wiki.coordinates.lon,
      city: (destination as any).cityName,
      country: (destination as any).countryName,
      destinationSlug: destination.slug,
      sources: {
        wikipedia: {
          pageid: wiki.pageid,
          url: wiki.fullurl,
          extract: wiki.extract,
          categories: wiki.categories,
          thumbnailUrl: wiki.thumbnail?.source,
        },
      },
      attribution: {
        wikipedia: WIKIPEDIA_ATTRIBUTION,
      },
      validationErrors: [],
      validationWarnings: [],
    });
  }

  // Process OSM locations, merging with nearby Wikipedia entries
  for (const osm of osmLocations) {
    const slug = generateSlug(osm.name, (destination as any).cityName);
    const metadata = extractMetadata(osm.tags);

    // Check if there's a nearby Wikipedia location
    let foundMatch = false;
    for (const [key, existing] of merged.entries()) {
      if (!existing.sources.wikipedia) continue;

      const distance = haversineDistance(
        osm.lat, osm.lon,
        existing.latitude, existing.longitude
      );

      if (distance <= MERGE_DISTANCE_METERS) {
        // Merge OSM data into existing Wikipedia entry
        existing.sources.osm = {
          id: osm.id,
          type: osm.type,
          url: osm.osmUrl,
          tags: osm.tags,
          metadata,
        };
        existing.attribution.osm = OSM_ATTRIBUTION;
        
        // Use OSM coordinates if more precise
        if (osm.lat && osm.lon) {
          existing.latitude = osm.lat;
          existing.longitude = osm.lon;
        }
        
        foundMatch = true;
        break;
      }
    }

    // Add as new location if no match found
    if (!foundMatch) {
      const externalId = `osm-${osm.type}-${osm.id}`;
      
      merged.set(externalId, {
        externalId,
        name: osm.name,
        slug,
        category,
        latitude: osm.lat,
        longitude: osm.lon,
        city: (destination as any).cityName,
        country: (destination as any).countryName,
        destinationSlug: destination.slug,
        sources: {
          osm: {
            id: osm.id,
            type: osm.type,
            url: osm.osmUrl,
            tags: osm.tags,
            metadata,
          },
        },
        attribution: {
          osm: OSM_ATTRIBUTION,
        },
        validationErrors: [],
        validationWarnings: [],
      });
    }
  }

  // Process TripAdvisor locations, merging with nearby Wikipedia entries
  for (const ta of tripAdvisorLocations) {
    if (!ta.latitude || !ta.longitude) continue;

    const slug = generateSlug(ta.name, (destination as any).cityName);

    // Check if there's a nearby existing location (Wikipedia or OSM)
    let foundMatch = false;
    for (const [key, existing] of merged.entries()) {
      const distance = haversineDistance(
        ta.latitude, ta.longitude,
        existing.latitude, existing.longitude
      );

      if (distance <= MERGE_DISTANCE_METERS) {
        // Merge TripAdvisor data into existing entry
        existing.sources.tripadvisor = {
          locationId: ta.locationId,
          address: ta.address,
          subcategories: ta.subcategories,
        };
        existing.attribution.tripadvisor = TRIPADVISOR_ATTRIBUTION;
        
        foundMatch = true;
        break;
      }
    }

    // Add as new location if no match found
    if (!foundMatch) {
      const externalId = `ta-${ta.locationId}`;
      
      merged.set(externalId, {
        externalId,
        name: ta.name,
        slug,
        category,
        latitude: ta.latitude,
        longitude: ta.longitude,
        city: (destination as any).cityName,
        country: (destination as any).countryName,
        destinationSlug: destination.slug,
        sources: {
          tripadvisor: {
            locationId: ta.locationId,
            address: ta.address,
            subcategories: ta.subcategories,
          },
        },
        attribution: {
          tripadvisor: TRIPADVISOR_ATTRIBUTION,
        },
        validationErrors: [],
        validationWarnings: [],
      });
    }
  }

  return Array.from(merged.values());
}

// Haversine distance calculation
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Discover all categories for a destination
export async function discoverAllCategories(
  destinationSlug: DestinationSlug,
  options: {
    radiusKm?: number;
    limit?: number;
  } = {}
): Promise<{
  attraction: DiscoveryResult;
  hotel: DiscoveryResult;
  restaurant: DiscoveryResult;
}> {
  const categories: LocationCategory[] = ['attraction', 'hotel', 'restaurant'];
  const results: Record<string, DiscoveryResult> = {};

  for (const category of categories) {
    results[category] = await discoverLocations(destinationSlug, category, options);
    
    // Add delay between categories to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return {
    attraction: results.attraction,
    hotel: results.hotel,
    restaurant: results.restaurant,
  };
}

// Get discovery statistics for all destinations
export function getDiscoveryStats(): {
  destinations: Array<{
    slug: DestinationSlug;
    name: string;
    hasCoordinates: boolean;
  }>;
  totalDestinations: number;
} {
  return {
    destinations: DESTINATION_METADATA.map(d => ({
      slug: d.slug,
      name: `${(d as any).cityName}, ${(d as any).countryName}`,
      hasCoordinates: !!((d as any).latitude && (d as any).longitude),
    })),
    totalDestinations: DESTINATION_METADATA.length,
  };
}
