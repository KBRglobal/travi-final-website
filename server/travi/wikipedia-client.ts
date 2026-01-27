/**
 * TRAVI Content Generation - Wikipedia API Client
 *
 * Fetches location data from Wikipedia with CC BY-SA 3.0 attribution.
 * Used for initial location discovery and basic descriptions.
 */

import { withRetry } from "./retry-handler";

// Wikipedia API endpoints
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

// Attribution required for all Wikipedia content
export const WIKIPEDIA_ATTRIBUTION = {
  source: "wikipedia" as const,
  license: "CC BY-SA 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
};

export interface WikipediaLocation {
  pageid: number;
  title: string;
  extract: string;
  fullurl: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  categories: string[];
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

export interface WikipediaSearchResult {
  locations: WikipediaLocation[];
  continue?: string;
  attribution: typeof WIKIPEDIA_ATTRIBUTION;
}

// Search for locations near coordinates
export async function searchNearbyLocations(
  lat: number,
  lon: number,
  radius: number = 10000, // meters
  limit: number = 50
): Promise<WikipediaSearchResult> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "geosearch",
    ggscoord: `${lat}|${lon}`,
    ggsradius: String(Math.min(radius, 10000)), // Max 10km
    ggslimit: String(Math.min(limit, 50)),
    prop: "coordinates|extracts|info|categories|pageimages",
    exintro: "true",
    explaintext: "true",
    exlimit: "max",
    inprop: "url",
    cllimit: "max",
    piprop: "thumbnail",
    pithumbsize: "400",
    origin: "*",
  });

  const result = await withRetry(
    async () => {
      const response = await fetch(`${WIKIPEDIA_API}?${params}`);
      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }
      return response.json();
    },
    { maxRetries: 3 }
  );

  if (!result.success || !result.data) {
    return { locations: [], attribution: WIKIPEDIA_ATTRIBUTION };
  }

  const pages = result.data.query?.pages || {};
  const locations = Object.values(pages).map((page: any) => ({
    pageid: page.pageid,
    title: page.title,
    extract: page.extract || "",
    fullurl: page.fullurl,
    coordinates: page.coordinates?.[0]
      ? {
          lat: page.coordinates[0].lat,
          lon: page.coordinates[0].lon,
        }
      : undefined,
    categories: (page.categories || []).map((c: any) => c.title.replace("Category:", "")),
    thumbnail: page.thumbnail,
  }));

  return {
    locations,
    continue: result.data.continue?.ggsoffset,
    attribution: WIKIPEDIA_ATTRIBUTION,
  };
}

// Search for attractions/points of interest in a city
export async function searchCityAttractions(
  cityName: string,
  category: "attraction" | "hotel" | "restaurant",
  limit: number = 100
): Promise<WikipediaSearchResult> {
  // Build category-specific search terms
  const categoryTerms: Record<string, string[]> = {
    attraction: ["tourist attractions", "landmarks", "museums", "monuments", "parks"],
    hotel: ["hotels", "resorts", "hospitality"],
    restaurant: ["restaurants", "cuisine", "dining"],
  };

  const searchCategories = categoryTerms[category] || categoryTerms.attraction;
  const allLocations: WikipediaLocation[] = [];

  for (const term of searchCategories.slice(0, 2)) {
    // Limit API calls
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      list: "categorymembers",
      cmtitle: `Category:${term} in ${cityName}`,
      cmlimit: String(Math.min(limit / 2, 50)),
      cmprop: "ids|title",
      origin: "*",
    });

    const result = await withRetry(
      async () => {
        const response = await fetch(`${WIKIPEDIA_API}?${params}`);
        if (!response.ok) {
          throw new Error(`Wikipedia API error: ${response.status}`);
        }
        return response.json();
      },
      { maxRetries: 2 }
    );

    if (result.success && result.data?.query?.categorymembers) {
      const pageIds = result.data.query.categorymembers.map((m: any) => m.pageid);
      if (pageIds.length > 0) {
        const details = await getPageDetails(pageIds);
        allLocations.push(...details);
      }
    }
  }

  // Deduplicate by pageid
  const uniqueLocations = Array.from(new Map(allLocations.map(l => [l.pageid, l])).values());

  return {
    locations: uniqueLocations.slice(0, limit),
    attribution: WIKIPEDIA_ATTRIBUTION,
  };
}

// Get detailed information for specific pages
export async function getPageDetails(pageIds: number[]): Promise<WikipediaLocation[]> {
  if (pageIds.length === 0) return [];

  const batchSize = 50;
  const allLocations: WikipediaLocation[] = [];

  for (let i = 0; i < pageIds.length; i += batchSize) {
    const batch = pageIds.slice(i, i + batchSize);

    const params = new URLSearchParams({
      action: "query",
      format: "json",
      pageids: batch.join("|"),
      prop: "coordinates|extracts|info|categories|pageimages",
      exintro: "true",
      explaintext: "true",
      exlimit: "max",
      inprop: "url",
      cllimit: "max",
      piprop: "thumbnail",
      pithumbsize: "400",
      origin: "*",
    });

    const result = await withRetry(
      async () => {
        const response = await fetch(`${WIKIPEDIA_API}?${params}`);
        if (!response.ok) {
          throw new Error(`Wikipedia API error: ${response.status}`);
        }
        return response.json();
      },
      { maxRetries: 2 }
    );

    if (result.success && result.data?.query?.pages) {
      const pages = result.data.query.pages;
      for (const page of Object.values(pages) as any[]) {
        if (page.pageid > 0) {
          // Skip invalid pages
          allLocations.push({
            pageid: page.pageid,
            title: page.title,
            extract: page.extract || "",
            fullurl: page.fullurl,
            coordinates: page.coordinates?.[0]
              ? {
                  lat: page.coordinates[0].lat,
                  lon: page.coordinates[0].lon,
                }
              : undefined,
            categories: (page.categories || []).map((c: any) => c.title.replace("Category:", "")),
            thumbnail: page.thumbnail,
          });
        }
      }
    }
  }

  return allLocations;
}

// Search by title for specific location
export async function searchByTitle(title: string): Promise<WikipediaLocation | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    titles: title,
    prop: "coordinates|extracts|info|categories|pageimages",
    exintro: "true",
    explaintext: "true",
    inprop: "url",
    cllimit: "max",
    piprop: "thumbnail",
    pithumbsize: "400",
    origin: "*",
  });

  const result = await withRetry(
    async () => {
      const response = await fetch(`${WIKIPEDIA_API}?${params}`);
      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }
      return response.json();
    },
    { maxRetries: 2 }
  );

  if (!result.success || !result.data?.query?.pages) {
    return null;
  }

  const pages = Object.values(result.data.query.pages) as any[];
  const page = pages[0];

  if (!page || page.pageid < 0) {
    return null;
  }

  return {
    pageid: page.pageid,
    title: page.title,
    extract: page.extract || "",
    fullurl: page.fullurl,
    coordinates: page.coordinates?.[0]
      ? {
          lat: page.coordinates[0].lat,
          lon: page.coordinates[0].lon,
        }
      : undefined,
    categories: (page.categories || []).map((c: any) => c.title.replace("Category:", "")),
    thumbnail: page.thumbnail,
  };
}

// Filter locations to tourism-relevant categories
export function filterTourismLocations(
  locations: WikipediaLocation[],
  category: "attraction" | "hotel" | "restaurant"
): WikipediaLocation[] {
  const categoryPatterns: Record<string, RegExp[]> = {
    attraction: [
      /museum/i,
      /monument/i,
      /landmark/i,
      /park/i,
      /garden/i,
      /palace/i,
      /castle/i,
      /tower/i,
      /bridge/i,
      /temple/i,
      /church/i,
      /mosque/i,
      /beach/i,
      /island/i,
      /zoo/i,
      /aquarium/i,
      /theme park/i,
      /historic/i,
      /heritage/i,
      /tourist attraction/i,
      /observation/i,
      /viewpoint/i,
    ],
    hotel: [/hotel/i, /resort/i, /inn/i, /lodge/i, /motel/i, /hospitality/i, /accommodation/i],
    restaurant: [/restaurant/i, /cafe/i, /cuisine/i, /dining/i, /food/i, /eatery/i, /bistro/i],
  };

  const patterns = categoryPatterns[category] || categoryPatterns.attraction;

  return locations.filter(loc => {
    const categoryText = loc.categories.join(" ").toLowerCase();
    const titleText = loc.title.toLowerCase();

    return patterns.some(pattern => pattern.test(categoryText) || pattern.test(titleText));
  });
}

/**
 * Check if Wikipedia API is available
 * Wikipedia is a free public API that doesn't require authentication
 */
export function isWikipediaAvailable(): boolean {
  // Wikipedia API is always available (free public API)
  return true;
}
