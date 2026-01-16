/**
 * TRAVI Content Generation - TripAdvisor API Client
 * 
 * Used ONLY for location discovery (names, categories, coordinates).
 * 
 * LEGAL COMPLIANCE:
 * - ❌ DO NOT use TripAdvisor images
 * - ❌ DO NOT use TripAdvisor reviews or review text
 * - ❌ DO NOT display TripAdvisor ratings to users
 * - ✅ CAN use: location names, categories, coordinates, addresses
 */

import { withRetry } from './retry-handler';
import { recordRequestStart, recordRequestResult, canMakeRequest } from './budget-manager';

const TRIPADVISOR_API = 'https://api.content.tripadvisor.com/api/v1';

export const TRIPADVISOR_ATTRIBUTION = {
  source: 'tripadvisor' as const,
  usedFor: 'location_discovery_only',
  restrictions: [
    'NO images',
    'NO reviews',
    'NO ratings display',
  ],
};

export interface TripAdvisorLocation {
  locationId: string;
  name: string;
  category: 'attraction' | 'hotel' | 'restaurant';
  latitude: number;
  longitude: number;
  address?: string;
  subcategories?: string[];
}

export interface TripAdvisorSearchResult {
  locations: TripAdvisorLocation[];
  hasMore: boolean;
  total: number;
}

function getApiKey(): string | null {
  const key = process.env.TRIPADVISOR_API_KEY;
  if (!key) {
    console.warn('[TripAdvisor] No API key configured');
    return null;
  }
  return key;
}

type TripAdvisorCategory = 'attractions' | 'hotels' | 'restaurants';

function mapToInternalCategory(taCategory: TripAdvisorCategory): 'attraction' | 'hotel' | 'restaurant' {
  const mapping: Record<TripAdvisorCategory, 'attraction' | 'hotel' | 'restaurant'> = {
    attractions: 'attraction',
    hotels: 'hotel',
    restaurants: 'restaurant',
  };
  return mapping[taCategory];
}

function mapFromInternalCategory(category: 'attraction' | 'hotel' | 'restaurant'): TripAdvisorCategory {
  const mapping: Record<string, TripAdvisorCategory> = {
    attraction: 'attractions',
    hotel: 'hotels',
    restaurant: 'restaurants',
  };
  return mapping[category];
}

export async function searchNearbyLocations(
  latitude: number,
  longitude: number,
  category: 'attraction' | 'hotel' | 'restaurant',
  radiusKm: number = 10,
  limit: number = 50
): Promise<TripAdvisorSearchResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const budgetCheck = await canMakeRequest('tripadvisor');
  if (!budgetCheck.allowed) {
    console.warn('[TripAdvisor] Request blocked by budget:', budgetCheck.reason);
    return null;
  }

  await recordRequestStart('tripadvisor');

  const taCategory = mapFromInternalCategory(category);
  const radiusMeters = Math.min(radiusKm * 1000, 50000);
  const radiusUnit = 'm';

  const params = new URLSearchParams({
    key: apiKey,
    latLong: `${latitude},${longitude}`,
    radius: String(radiusMeters),
    radiusUnit,
    category: taCategory,
    language: 'en',
  });

  let result: any;
  let fetchError: string | null = null;
  
  try {
    result = await withRetry(
      async () => {
        const response = await fetch(
          `${TRIPADVISOR_API}/location/nearby_search?${params}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('TripAdvisor API: Invalid API key');
          }
          if (response.status === 429) {
            throw new Error('TripAdvisor API: Rate limit exceeded');
          }
          throw new Error(`TripAdvisor API error: ${response.status}`);
        }

        return response.json();
      },
      { maxRetries: 2 }
    );
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error);
    const isRateLimit = fetchError.includes('Rate limit');
    await recordRequestResult('tripadvisor', false, 0, 0, isRateLimit);
    console.error('[TripAdvisor] Search failed:', fetchError);
    return null;
  }

  // TripAdvisor API may return { data: [...] } or { success: true, data: { data: [...] } }
  await recordRequestResult('tripadvisor', true, 0, 0, false);

  // Handle both response formats: { data: [...] } or { data: { data: [...] } }
  let dataArray: any[] = [];
  if (result?.data) {
    if (Array.isArray(result.data)) {
      dataArray = result.data;
    } else if (Array.isArray(result.data?.data)) {
      dataArray = result.data.data;
    }
  }

  if (dataArray.length === 0) {
    console.log('[TripAdvisor] No locations returned for nearby search');
    return { locations: [], hasMore: false, total: 0 };
  }

  console.log(`[TripAdvisor] Raw data received: ${dataArray.length} items`);

  // Map all locations - TripAdvisor nearby_search may not include coordinates
  // They will be fetched from details API if missing
  const locations: TripAdvisorLocation[] = dataArray
    .slice(0, limit)
    .map((item: any) => ({
      locationId: String(item.location_id),
      name: item.name,
      category: mapToInternalCategory(taCategory),
      latitude: parseFloat(item.latitude) || 0,
      longitude: parseFloat(item.longitude) || 0,
      address: item.address_obj?.address_string,
      subcategories: item.subcategory?.map((s: any) => s.name) || [],
    }))
    .filter((loc: TripAdvisorLocation) => loc.name && loc.locationId);

  console.log(`[TripAdvisor] Found ${locations.length} ${category}s near ${latitude},${longitude} (some may need coords fetched)`);

  return {
    locations,
    hasMore: result.data?.length >= limit,
    total: result.data?.length || 0,
  };
}

export async function searchByCity(
  cityName: string,
  category: 'attraction' | 'hotel' | 'restaurant',
  limit: number = 50
): Promise<TripAdvisorSearchResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const budgetCheck = await canMakeRequest('tripadvisor');
  if (!budgetCheck.allowed) {
    console.warn('[TripAdvisor] Request blocked by budget:', budgetCheck.reason);
    return null;
  }

  await recordRequestStart('tripadvisor');

  const taCategory = mapFromInternalCategory(category);

  const params = new URLSearchParams({
    key: apiKey,
    searchQuery: cityName,
    category: taCategory,
    language: 'en',
  });

  let result: any;
  
  try {
    result = await withRetry(
      async () => {
        const response = await fetch(
          `${TRIPADVISOR_API}/location/search?${params}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`TripAdvisor API error: ${response.status}`);
        }

        return response.json();
      },
      { maxRetries: 2 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isRateLimit = errorMsg.includes('Rate limit');
    await recordRequestResult('tripadvisor', false, 0, 0, isRateLimit);
    console.error('[TripAdvisor] City search failed:', errorMsg);
    return null;
  }

  // TripAdvisor API may return { data: [...] } or { success: true, data: { data: [...] } }
  await recordRequestResult('tripadvisor', true, 0, 0, false);

  // Handle both response formats
  let dataArray: any[] = [];
  if (result?.data) {
    if (Array.isArray(result.data)) {
      dataArray = result.data;
    } else if (Array.isArray(result.data?.data)) {
      dataArray = result.data.data;
    }
  }

  if (dataArray.length === 0) {
    console.log('[TripAdvisor] No locations returned from city search');
    return { locations: [], hasMore: false, total: 0 };
  }

  console.log(`[TripAdvisor] City search raw data: ${dataArray.length} items`);

  const locations: TripAdvisorLocation[] = dataArray
    .slice(0, limit)
    .map((item: any) => ({
      locationId: String(item.location_id),
      name: item.name,
      category: mapToInternalCategory(taCategory),
      latitude: parseFloat(item.latitude) || 0,
      longitude: parseFloat(item.longitude) || 0,
      address: item.address_obj?.address_string,
      subcategories: [],
    }))
    .filter((loc: TripAdvisorLocation) => loc.name && loc.name.length > 0);

  console.log(`[TripAdvisor] Found ${locations.length} ${category}s in "${cityName}"`);

  return {
    locations,
    hasMore: dataArray.length >= limit,
    total: dataArray.length,
  };
}

export async function getLocationDetails(
  locationId: string
): Promise<{
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  subcategories?: string[];
} | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const budgetCheck = await canMakeRequest('tripadvisor');
  if (!budgetCheck.allowed) {
    return null;
  }

  await recordRequestStart('tripadvisor');

  const params = new URLSearchParams({
    key: apiKey,
    language: 'en',
  });

  let result: any;
  
  try {
    result = await withRetry(
      async () => {
        const response = await fetch(
          `${TRIPADVISOR_API}/location/${locationId}/details?${params}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.log(`[TripAdvisor] Details API error: ${response.status} for location ${locationId}`);
          throw new Error(`TripAdvisor API error: ${response.status}`);
        }

        return response.json();
      },
      { maxRetries: 2 }
    );
  } catch (error) {
    console.error(`[TripAdvisor] Details fetch error for ${locationId}:`, error);
    await recordRequestResult('tripadvisor', false, 0, 0, false);
    return null;
  }

  // TripAdvisor details API returns object directly (not wrapped)
  await recordRequestResult('tripadvisor', true, 0, 0, false);

  if (!result) {
    console.log(`[TripAdvisor] No result for location ${locationId}`);
    return null;
  }

  // withRetry wraps response in { success, data, ... } - unwrap it
  const data = result.data || result;

  return {
    latitude: parseFloat(data.latitude) || 0,
    longitude: parseFloat(data.longitude) || 0,
    address: data.address_obj?.address_string,
    phone: data.phone,
    website: data.website,
    subcategories: data.subcategory?.map((s: any) => s.name) || [],
  };
}

export function isTripAdvisorAvailable(): boolean {
  return !!getApiKey();
}

// Create a grid of search zones from bounding box
interface SearchZone {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  name: string;
}

function createSearchGrid(
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number },
  gridSize: number = 4
): SearchZone[] {
  const latStep = (bounds.latMax - bounds.latMin) / gridSize;
  const lngStep = (bounds.lngMax - bounds.lngMin) / gridSize;
  
  // Calculate radius to cover each zone (diagonal / 2)
  const zoneDiagonalKm = Math.sqrt(
    Math.pow(latStep * 111, 2) + Math.pow(lngStep * 111 * Math.cos(((bounds.latMin + bounds.latMax) / 2) * Math.PI / 180), 2)
  );
  const radiusKm = Math.ceil(zoneDiagonalKm / 2) + 1; // Add buffer
  
  const zones: SearchZone[] = [];
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const centerLat = bounds.latMin + (i + 0.5) * latStep;
      const centerLng = bounds.lngMin + (j + 0.5) * lngStep;
      
      zones.push({
        centerLat,
        centerLng,
        radiusKm: Math.min(radiusKm, 25), // TripAdvisor max is 50km
        name: `Zone ${i * gridSize + j + 1}/${gridSize * gridSize}`
      });
    }
  }
  
  return zones;
}

export async function discoverAllInCity(
  cityName: string,
  latitude: number,
  longitude: number,
  category: 'attraction' | 'hotel' | 'restaurant',
  options: {
    radiusKm?: number;
    maxLocations?: number;
    bounds?: { latMin: number; latMax: number; lngMin: number; lngMax: number };
  } = {}
): Promise<TripAdvisorLocation[]> {
  const allLocations: Map<string, TripAdvisorLocation> = new Map();
  const maxLocations = options.maxLocations || 300;

  // If bounds provided, use grid-based search for comprehensive coverage
  if (options.bounds) {
    console.log(`[TripAdvisor] 🗺️ Grid-based search for ${category}s in ${cityName}...`);
    
    // Create 4x4 = 16 zones for comprehensive coverage
    const zones = createSearchGrid(options.bounds, 4);
    console.log(`[TripAdvisor] Searching ${zones.length} geographic zones...`);
    
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      console.log(`[TripAdvisor] 📍 ${zone.name}: (${zone.centerLat.toFixed(4)}, ${zone.centerLng.toFixed(4)}) radius ${zone.radiusKm}km`);
      
      const nearbyResult = await searchNearbyLocations(
        zone.centerLat,
        zone.centerLng,
        category,
        zone.radiusKm,
        100 // Max per zone
      );
      
      if (nearbyResult?.locations) {
        const newCount = nearbyResult.locations.filter(loc => !allLocations.has(loc.locationId)).length;
        for (const loc of nearbyResult.locations) {
          if (!allLocations.has(loc.locationId)) {
            allLocations.set(loc.locationId, loc);
          }
        }
        console.log(`[TripAdvisor]   ✅ ${zone.name}: Found ${nearbyResult.locations.length} (${newCount} new), total: ${allLocations.size}`);
      } else {
        console.log(`[TripAdvisor]   ⚠️ ${zone.name}: No results`);
      }
      
      // Rate limit: 1 second between zone requests
      if (i < zones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[TripAdvisor] 📊 Grid search complete: ${allLocations.size} unique ${category}s found`);
  } else {
    // Fallback: Legacy multi-query approach for backwards compatibility
    const radiusKm = options.radiusKm || 15;
    
    const searchQueries = category === 'attraction' 
      ? [
          `${cityName} attractions`,
          `${cityName} things to do`,
          `${cityName} landmarks`,
          `${cityName} museums`,
          `${cityName} theme parks`,
          `${cityName} tours`,
          `${cityName} sightseeing`,
        ]
      : category === 'hotel'
      ? [
          `${cityName} hotels`,
          `${cityName} resorts`,
          `${cityName} luxury hotels`,
          `${cityName} beach hotels`,
        ]
      : [
          `${cityName} restaurants`,
          `${cityName} dining`,
          `${cityName} cafes`,
          `${cityName} fine dining`,
        ];

    console.log(`[TripAdvisor] Running ${searchQueries.length} search queries for ${category}s in ${cityName}...`);

    for (const query of searchQueries) {
      const searchResult = await searchByCity(query, category, 30);
      if (searchResult?.locations) {
        for (const loc of searchResult.locations) {
          if (!allLocations.has(loc.locationId)) {
            allLocations.set(loc.locationId, loc);
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Also do a nearby search
    const nearbyResult = await searchNearbyLocations(latitude, longitude, category, radiusKm, 100);
    if (nearbyResult?.locations) {
      for (const loc of nearbyResult.locations) {
        if (!allLocations.has(loc.locationId)) {
          allLocations.set(loc.locationId, loc);
        }
      }
    }

    console.log(`[TripAdvisor] Found ${allLocations.size} unique ${category}s from all queries`);
  }

  // Collect locations that need coordinates
  const locationsNeedingCoords: TripAdvisorLocation[] = [];
  for (const loc of allLocations.values()) {
    if (!loc.latitude || !loc.longitude) {
      locationsNeedingCoords.push(loc);
    }
  }

  console.log(`[TripAdvisor] ${locationsNeedingCoords.length} locations need coordinates, fetching details...`);

  // Fetch details for locations without coordinates (limit to 100 to avoid rate limits)
  const batchSize = 100;
  const toFetch = locationsNeedingCoords.slice(0, batchSize);
  
  for (let i = 0; i < toFetch.length; i++) {
    const loc = toFetch[i];
    try {
      const details = await getLocationDetails(loc.locationId);
      if (details && details.latitude && details.longitude) {
        loc.latitude = details.latitude;
        loc.longitude = details.longitude;
        if (details.address) loc.address = details.address;
        if (details.subcategories) loc.subcategories = details.subcategories;
      }
      // Rate limit: small delay between requests
      if (i < toFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch (error) {
      console.error(`[TripAdvisor] Failed to fetch details for ${loc.name}:`, error);
    }
  }

  // Filter to only include locations with valid coordinates
  const locationsWithCoords = Array.from(allLocations.values())
    .filter(loc => loc.latitude && loc.longitude && loc.latitude !== 0 && loc.longitude !== 0);

  const finalLocations = locationsWithCoords.slice(0, maxLocations);
  console.log(`[TripAdvisor] Total unique ${category}s with coordinates: ${finalLocations.length}`);

  return finalLocations;
}
