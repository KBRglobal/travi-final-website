/**
 * TRAVI Content Generation - Google Places API Client
 * 
 * Enriches location data with Google Places details:
 * - Precise GPS coordinates
 * - Formatted address
 * - Phone number
 * - Opening hours
 * - Rating and review count
 * 
 * Note: Costs tracked per request. Attribution handled automatically by Google.
 */

import { withRetry } from './retry-handler';
import { recordRequestStart, recordRequestResult, canMakeRequest } from './budget-manager';
import { getApiKey } from './api-key-resolver';

// Google Places API endpoints
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

// Cost per request (as of 2024 pricing)
const PLACES_COSTS = {
  findPlace: 0.017,      // Find Place From Text: $17/1000
  details: 0.017,        // Place Details (Basic): $17/1000
  detailsContact: 0.003, // Contact Data: $3/1000
  detailsAtmosphere: 0.005, // Atmosphere Data: $5/1000
  nearbySearch: 0.032,   // Nearby Search: $32/1000
  textSearch: 0.032,     // Text Search: $32/1000
} as const;

export interface GooglePlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  phoneNumber?: string;
  internationalPhoneNumber?: string;
  website?: string;
  googleMapsUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  openingHours?: {
    weekdayText: string[];
    isOpenNow?: boolean;
  };
  types: string[];
  businessStatus?: string;
}

export interface PlaceSearchResult {
  place: GooglePlaceDetails | null;
  cost: number;
  source: 'google_places';
}

// Search for a place by name and location
export async function findPlace(
  query: string,
  near?: { lat: number; lng: number }
): Promise<PlaceSearchResult> {
  // Get API key from database or env vars
  const apiKey = await getApiKey('google_places');
  if (!apiKey) {
    console.warn('[GooglePlaces] No API key configured - add it via Admin > TRAVI > API Keys');
    return { place: null, cost: 0, source: 'google_places' };
  }

  // Check budget
  const budgetCheck = await canMakeRequest('google_places');
  if (!budgetCheck.allowed) {
    console.warn('[GooglePlaces] Request blocked by budget:', budgetCheck.reason);
    return { place: null, cost: 0, source: 'google_places' };
  }

  await recordRequestStart('google_places');

  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    fields: 'place_id,name,formatted_address,geometry',
    key: apiKey,
  });

  if (near) {
    params.set('locationbias', `point:${near.lat},${near.lng}`);
  }

  const result = await withRetry(
    async () => {
      const response = await fetch(`${PLACES_API_BASE}/findplacefromtext/json?${params}`);
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }
      return response.json();
    },
    { maxRetries: 2 }
  );

  const cost = PLACES_COSTS.findPlace;
  // Record cost for budget tracking (stored in tokens * costPerToken format, so pass raw cost)
  await recordRequestResult('google_places', result.success, Math.round(cost * 1000000), 1, false);

  if (!result.success || !result.data?.candidates?.[0]) {
    return { place: null, cost, source: 'google_places' };
  }

  const candidate = result.data.candidates[0];
  
  return {
    place: {
      placeId: candidate.place_id,
      name: candidate.name,
      formattedAddress: candidate.formatted_address,
      latitude: candidate.geometry?.location?.lat,
      longitude: candidate.geometry?.location?.lng,
      types: [],
    },
    cost,
    source: 'google_places',
  };
}

// Get detailed place information
export async function getPlaceDetails(
  placeId: string,
  includeContact: boolean = true,
  includeAtmosphere: boolean = false
): Promise<PlaceSearchResult> {
  // Get API key from database or env vars
  const apiKey = await getApiKey('google_places');
  if (!apiKey) {
    console.warn('[GooglePlaces] No API key configured - add it via Admin > TRAVI > API Keys');
    return { place: null, cost: 0, source: 'google_places' };
  }

  // Check budget
  const budgetCheck = await canMakeRequest('google_places');
  if (!budgetCheck.allowed) {
    console.warn('[GooglePlaces] Request blocked by budget:', budgetCheck.reason);
    return { place: null, cost: 0, source: 'google_places' };
  }

  await recordRequestStart('google_places');

  // Build fields list based on what we need
  const basicFields = [
    'place_id', 'name', 'formatted_address', 'geometry',
    'types', 'business_status', 'url',
  ];
  
  const contactFields = includeContact ? [
    'formatted_phone_number', 'international_phone_number',
    'opening_hours', 'website',
  ] : [];
  
  const atmosphereFields = includeAtmosphere ? [
    'rating', 'user_ratings_total', 'price_level',
  ] : [];

  const allFields = [...basicFields, ...contactFields, ...atmosphereFields];

  const params = new URLSearchParams({
    place_id: placeId,
    fields: allFields.join(','),
    key: apiKey,
  });

  const result = await withRetry(
    async () => {
      const response = await fetch(`${PLACES_API_BASE}/details/json?${params}`);
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }
      return response.json();
    },
    { maxRetries: 2 }
  );

  // Calculate cost based on fields requested
  let cost = PLACES_COSTS.details;
  if (includeContact) cost += PLACES_COSTS.detailsContact;
  if (includeAtmosphere) cost += PLACES_COSTS.detailsAtmosphere;

  // Record cost for budget tracking
  await recordRequestResult('google_places', result.success, Math.round(cost * 1000000), 1, false);

  if (!result.success || !result.data?.result) {
    return { place: null, cost, source: 'google_places' };
  }

  const place = result.data.result;

  return {
    place: {
      placeId: place.place_id,
      name: place.name,
      formattedAddress: place.formatted_address,
      latitude: place.geometry?.location?.lat,
      longitude: place.geometry?.location?.lng,
      phoneNumber: place.formatted_phone_number,
      internationalPhoneNumber: place.international_phone_number,
      website: place.website,
      googleMapsUrl: place.url,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      openingHours: place.opening_hours ? {
        weekdayText: place.opening_hours.weekday_text || [],
        isOpenNow: place.opening_hours.open_now,
      } : undefined,
      types: place.types || [],
      businessStatus: place.business_status,
    },
    cost,
    source: 'google_places',
  };
}

// Search nearby for specific type
export async function nearbySearch(
  location: { lat: number; lng: number },
  type: string,
  radiusMeters: number = 5000,
  limit: number = 20
): Promise<{ places: GooglePlaceDetails[]; cost: number }> {
  // Get API key from database or env vars
  const apiKey = await getApiKey('google_places');
  if (!apiKey) {
    console.warn('[GooglePlaces] No API key configured - add it via Admin > TRAVI > API Keys');
    return { places: [], cost: 0 };
  }

  // Check budget
  const budgetCheck = await canMakeRequest('google_places');
  if (!budgetCheck.allowed) {
    console.warn('[GooglePlaces] Request blocked by budget:', budgetCheck.reason);
    return { places: [], cost: 0 };
  }

  await recordRequestStart('google_places');

  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    radius: String(radiusMeters),
    type: type,
    key: apiKey,
  });

  const result = await withRetry(
    async () => {
      const response = await fetch(`${PLACES_API_BASE}/nearbysearch/json?${params}`);
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }
      return response.json();
    },
    { maxRetries: 2 }
  );

  const cost = PLACES_COSTS.nearbySearch;
  // Record cost for budget tracking
  await recordRequestResult('google_places', result.success, Math.round(cost * 1000000), 1, false);

  if (!result.success || !result.data?.results) {
    return { places: [], cost };
  }

  const places = result.data.results.slice(0, limit).map((p: any) => ({
    placeId: p.place_id,
    name: p.name,
    formattedAddress: p.vicinity || p.formatted_address || '',
    latitude: p.geometry?.location?.lat,
    longitude: p.geometry?.location?.lng,
    rating: p.rating,
    userRatingsTotal: p.user_ratings_total,
    priceLevel: p.price_level,
    types: p.types || [],
    businessStatus: p.business_status,
  }));

  return { places, cost };
}

// Enrich a discovered location with Google Places data
export async function enrichWithGooglePlaces(
  locationName: string,
  cityName: string,
  coordinates?: { lat: number; lng: number }
): Promise<{
  enriched: Partial<GooglePlaceDetails> | null;
  totalCost: number;
}> {
  let totalCost = 0;

  // First, find the place
  const searchQuery = `${locationName}, ${cityName}`;
  const findResult = await findPlace(searchQuery, coordinates);
  totalCost += findResult.cost;

  if (!findResult.place?.placeId) {
    console.log(`[GooglePlaces] No place found for: ${searchQuery}`);
    return { enriched: null, totalCost };
  }

  // Then get detailed information
  const detailsResult = await getPlaceDetails(
    findResult.place.placeId,
    true,  // include contact info
    true   // include atmosphere (rating)
  );
  totalCost += detailsResult.cost;

  if (!detailsResult.place) {
    return { enriched: null, totalCost };
  }

  console.log(`[GooglePlaces] Enriched: ${locationName} (cost: $${totalCost.toFixed(4)})`);

  return {
    enriched: detailsResult.place,
    totalCost,
  };
}

// Map Google Place types to our categories
export function mapGoogleTypeToCategory(
  types: string[]
): 'attraction' | 'hotel' | 'restaurant' | null {
  const attractionTypes = [
    'tourist_attraction', 'museum', 'park', 'amusement_park',
    'aquarium', 'art_gallery', 'church', 'hindu_temple',
    'mosque', 'synagogue', 'stadium', 'zoo', 'casino',
    'bowling_alley', 'night_club', 'spa', 'movie_theater',
    'shopping_mall', 'point_of_interest',
  ];

  const hotelTypes = [
    'lodging', 'hotel', 'resort', 'motel', 'hostel',
    'bed_and_breakfast', 'campground', 'rv_park',
  ];

  const restaurantTypes = [
    'restaurant', 'cafe', 'bar', 'bakery', 'meal_delivery',
    'meal_takeaway', 'food',
  ];

  for (const type of types) {
    if (hotelTypes.includes(type)) return 'hotel';
    if (restaurantTypes.includes(type)) return 'restaurant';
    if (attractionTypes.includes(type)) return 'attraction';
  }

  return null;
}

// Check if Google Places API is available
export function isGooglePlacesAvailable(): boolean {
  return !!(getApiKey as any)();
}

// Get cost summary
export function getPlacesCostSummary(): typeof PLACES_COSTS {
  return { ...PLACES_COSTS };
}
