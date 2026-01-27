/**
 * TRAVI Content Generation - OpenStreetMap API Client
 *
 * Fetches location data from OpenStreetMap via Overpass API.
 * All data is subject to ODbL (Open Database License) attribution.
 */

import { withRetry } from "./retry-handler";

// Overpass API endpoints (use public servers with rate limiting consideration)
const OVERPASS_API = "https://overpass-api.de/api/interpreter";

// Attribution required for all OSM content
export const OSM_ATTRIBUTION = {
  source: "openstreetmap" as const,
  license: "ODbL",
  licenseUrl: "https://opendatacommons.org/licenses/odbl/",
  requiredText: "Data from OpenStreetMap contributors",
};

export interface OSMLocation {
  id: number;
  type: "node" | "way" | "relation";
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  osmUrl: string;
}

export interface OSMSearchResult {
  locations: OSMLocation[];
  attribution: typeof OSM_ATTRIBUTION;
}

// Category to OSM tag mapping
const CATEGORY_TAGS: Record<string, string[]> = {
  attraction: [
    "tourism=attraction",
    "tourism=museum",
    "tourism=viewpoint",
    "historic=monument",
    "historic=memorial",
    "historic=castle",
    "historic=ruins",
    "leisure=park",
    "leisure=garden",
    "amenity=place_of_worship",
    "tourism=theme_park",
    "tourism=zoo",
    "tourism=aquarium",
    "tourism=gallery",
    "natural=beach",
  ],
  hotel: [
    "tourism=hotel",
    "tourism=resort",
    "tourism=motel",
    "tourism=hostel",
    "tourism=guest_house",
  ],
  restaurant: [
    "amenity=restaurant",
    "amenity=cafe",
    "amenity=fast_food",
    "amenity=bar",
    "amenity=pub",
  ],
};

// Build Overpass query for locations in bounding box
function buildOverpassQuery(
  bbox: { south: number; west: number; north: number; east: number },
  category: "attraction" | "hotel" | "restaurant",
  limit: number = 200
): string {
  const tags = CATEGORY_TAGS[category] || CATEGORY_TAGS.attraction;

  const tagQueries = tags
    .map(tag => {
      const [key, value] = tag.split("=");
      return `
      node["${key}"="${value}"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["${key}"="${value}"]["name"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    `;
    })
    .join("");

  return `
    [out:json][timeout:60];
    (
      ${tagQueries}
    );
    out center ${limit};
  `;
}

// Search locations in bounding box
export async function searchInBoundingBox(
  bbox: { south: number; west: number; north: number; east: number },
  category: "attraction" | "hotel" | "restaurant",
  limit: number = 200
): Promise<OSMSearchResult> {
  const query = buildOverpassQuery(bbox, category, limit);

  const result = await withRetry(
    async () => {
      const response = await fetch(OVERPASS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("OSM rate limit exceeded");
        }
        throw new Error(`Overpass API error: ${response.status}`);
      }

      return response.json();
    },
    {
      maxRetries: 3,
      onRetry: attempt => {},
    }
  );

  if (!result.success || !result.data) {
    return { locations: [], attribution: OSM_ATTRIBUTION };
  }

  const elements = result.data.elements || [];
  const locations: OSMLocation[] = elements
    .filter((el: any) => el.tags?.name)
    .map((el: any) => ({
      id: el.id,
      type: el.type,
      name: el.tags.name,
      lat: el.lat || el.center?.lat,
      lon: el.lon || el.center?.lon,
      tags: el.tags,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    }))
    .filter((loc: OSMLocation) => loc.lat && loc.lon);

  return {
    locations,
    attribution: OSM_ATTRIBUTION,
  };
}

// Search locations around a point
export async function searchNearPoint(
  lat: number,
  lon: number,
  radiusMeters: number,
  category: "attraction" | "hotel" | "restaurant",
  limit: number = 100
): Promise<OSMSearchResult> {
  const tags = CATEGORY_TAGS[category] || CATEGORY_TAGS.attraction;

  const tagQueries = tags
    .map(tag => {
      const [key, value] = tag.split("=");
      return `
      node["${key}"="${value}"]["name"](around:${radiusMeters},${lat},${lon});
      way["${key}"="${value}"]["name"](around:${radiusMeters},${lat},${lon});
    `;
    })
    .join("");

  const query = `
    [out:json][timeout:60];
    (
      ${tagQueries}
    );
    out center ${limit};
  `;

  const result = await withRetry(
    async () => {
      const response = await fetch(OVERPASS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("OSM rate limit exceeded");
        }
        throw new Error(`Overpass API error: ${response.status}`);
      }

      return response.json();
    },
    { maxRetries: 3 }
  );

  if (!result.success || !result.data) {
    return { locations: [], attribution: OSM_ATTRIBUTION };
  }

  const elements = result.data.elements || [];
  const locations: OSMLocation[] = elements
    .filter((el: any) => el.tags?.name)
    .map((el: any) => ({
      id: el.id,
      type: el.type,
      name: el.tags.name,
      lat: el.lat || el.center?.lat,
      lon: el.lon || el.center?.lon,
      tags: el.tags,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    }))
    .filter((loc: OSMLocation) => loc.lat && loc.lon);

  return {
    locations,
    attribution: OSM_ATTRIBUTION,
  };
}

// Get details for a specific OSM element
export async function getElementDetails(
  type: "node" | "way" | "relation",
  id: number
): Promise<OSMLocation | null> {
  const query = `
    [out:json][timeout:30];
    ${type}(${id});
    out center;
  `;

  const result = await withRetry(
    async () => {
      const response = await fetch(OVERPASS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      return response.json();
    },
    { maxRetries: 2 }
  );

  if (!result.success || !result.data?.elements?.[0]) {
    return null;
  }

  const el = result.data.elements[0];
  if (!el.tags?.name) return null;

  return {
    id: el.id,
    type: el.type,
    name: el.tags.name,
    lat: el.lat || el.center?.lat,
    lon: el.lon || el.center?.lon,
    tags: el.tags,
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

// Extract useful metadata from OSM tags
export function extractMetadata(tags: Record<string, string>): {
  address?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  wheelchair?: string;
  wikidata?: string;
  wikipedia?: string;
} {
  const metadata: any = {};

  // Address components
  const addressParts = [];
  if (tags["addr:street"]) {
    addressParts.push(tags["addr:housenumber"] || "");
    addressParts.push(tags["addr:street"]);
  }
  if (tags["addr:city"]) addressParts.push(tags["addr:city"]);
  if (tags["addr:postcode"]) addressParts.push(tags["addr:postcode"]);
  if (addressParts.length > 0) {
    metadata.address = addressParts.filter(Boolean).join(", ");
  }

  // Other useful tags
  if (tags.website || tags["contact:website"]) {
    metadata.website = tags.website || tags["contact:website"];
  }
  if (tags.phone || tags["contact:phone"]) {
    metadata.phone = tags.phone || tags["contact:phone"];
  }
  if (tags.opening_hours) {
    metadata.openingHours = tags.opening_hours;
  }
  if (tags.wheelchair) {
    metadata.wheelchair = tags.wheelchair;
  }
  if (tags.wikidata) {
    metadata.wikidata = tags.wikidata;
  }
  if (tags.wikipedia) {
    metadata.wikipedia = tags.wikipedia;
  }

  return metadata;
}

// Calculate bounding box from center point
export function getBoundingBox(
  lat: number,
  lon: number,
  radiusKm: number
): { south: number; west: number; north: number; east: number } {
  // Approximate degrees per km
  const latDegPerKm = 1 / 111;
  const lonDegPerKm = 1 / (111 * Math.cos((lat * Math.PI) / 180));

  return {
    south: lat - radiusKm * latDegPerKm,
    north: lat + radiusKm * latDegPerKm,
    west: lon - radiusKm * lonDegPerKm,
    east: lon + radiusKm * lonDegPerKm,
  };
}

// Merge Wikipedia and OSM locations by proximity
export function mergeWithWikipedia(
  osmLocations: OSMLocation[],
  wikiLocations: Array<{ title: string; coordinates?: { lat: number; lon: number } }>,
  maxDistanceMeters: number = 100
): Array<OSMLocation & { wikipediaTitle?: string }> {
  return osmLocations.map(osm => {
    // Try to find matching Wikipedia article
    const match = wikiLocations.find(wiki => {
      if (!wiki.coordinates) return false;

      const distance = haversineDistance(
        osm.lat,
        osm.lon,
        wiki.coordinates.lat,
        wiki.coordinates.lon
      );

      return distance <= maxDistanceMeters;
    });

    return {
      ...osm,
      wikipediaTitle: match?.title,
    };
  });
}

// Haversine distance calculation
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if OpenStreetMap Overpass API is available
 * OSM is a free public API that doesn't require authentication
 */
export function isOsmAvailable(): boolean {
  // Overpass API is always available (free public API)
  return true;
}
