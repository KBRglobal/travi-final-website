/**
 * TRAVI Content Generation - Freepik API Client
 * 
 * Searches and retrieves image metadata from Freepik.
 * IMPORTANT: Photographer/artist credits are REQUIRED for all images.
 */

import { withRetry } from './retry-handler';

// Freepik API endpoint
const FREEPIK_API = 'https://api.freepik.com/v1';

// Attribution requirements
export const FREEPIK_ATTRIBUTION = {
  source: 'freepik' as const,
  license: 'Freepik License',
  licenseUrl: 'https://www.freepik.com/terms_of_use',
  creditRequired: true,
  creditFormat: 'Image by {author} on Freepik',
};

export interface FreepikImage {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  author: {
    name: string;
    profileUrl: string;
  };
  tags: string[];
  downloadUrl?: string;
  attribution: typeof FREEPIK_ATTRIBUTION & {
    photographerName: string;
    creditText: string;
  };
}

export interface FreepikSearchResult {
  images: FreepikImage[];
  total: number;
  page: number;
  hasMore: boolean;
}

// Get API key from environment
function getApiKey(): string | null {
  const key = process.env.FREEPIK_API_KEY;
  if (!key) {
    console.warn('[Freepik] No API key configured');
    return null;
  }
  return key;
}

// Search for images
export async function searchImages(
  query: string,
  options: {
    page?: number;
    perPage?: number;
    orientation?: 'horizontal' | 'vertical' | 'square';
    color?: string;
  } = {}
): Promise<FreepikSearchResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    term: query,
    page: String(options.page || 1),
    per_page: String(options.perPage || 20),
  });

  if (options.orientation) {
    params.set('orientation', options.orientation);
  }
  if (options.color) {
    params.set('color', options.color);
  }

  const result = await withRetry(
    async () => {
      const response = await fetch(`${FREEPIK_API}/resources?${params}`, {
        headers: {
          'Accept': 'application/json',
          'x-freepik-api-key': apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Freepik API: Invalid API key');
        }
        if (response.status === 429) {
          throw new Error('Freepik API: Rate limit exceeded');
        }
        if (response.status === 404) {
          // Treat 404 as no results (API endpoint may vary)
          console.log('[Freepik] No results found (404)');
          return { data: [], meta: { total: 0 } };
        }
        throw new Error(`Freepik API error: ${response.status}`);
      }

      return response.json();
    },
    { maxRetries: 2 }
  );

  if (!result.success) {
    // Handle failed retry - treat as no results rather than throwing
    console.log('[Freepik] Search returned no results:', result.error?.message || 'Unknown error');
    return { images: [], total: 0, page: 1, hasMore: false };
  }
  
  const data = result.data;
  if (!data || (!data.data && !Array.isArray(data))) {
    return { images: [], total: 0, page: 1, hasMore: false };
  }
  const images: FreepikImage[] = (data.data || []).map((item: any) => {
    const authorName = item.author?.name || item.contributor?.name || 'Unknown';
    
    return {
      id: String(item.id),
      title: item.title || '',
      description: item.description || '',
      url: item.url || item.image?.source?.url || '',
      thumbnailUrl: item.thumbnails?.[0]?.url || item.image?.source?.url || '',
      previewUrl: item.preview?.url || item.image?.source?.url || '',
      width: item.width || item.image?.width || 0,
      height: item.height || item.image?.height || 0,
      author: {
        name: authorName,
        profileUrl: item.author?.url || item.contributor?.url || '',
      },
      tags: item.tags || [],
      attribution: {
        ...FREEPIK_ATTRIBUTION,
        photographerName: authorName,
        creditText: FREEPIK_ATTRIBUTION.creditFormat.replace('{author}', authorName),
      },
    };
  });

  return {
    images,
    total: data.meta?.total || images.length,
    page: options.page || 1,
    hasMore: (data.meta?.pagination?.total_pages || 1) > (options.page || 1),
  };
}

// Search for images related to a location
export async function searchLocationImages(
  locationName: string,
  cityName: string,
  category: 'attraction' | 'hotel' | 'restaurant',
  limit: number = 5
): Promise<FreepikImage[]> {
  // Build search queries based on category
  const queries: string[] = [];
  
  switch (category) {
    case 'attraction':
      queries.push(`${locationName} landmark`);
      queries.push(`${locationName} ${cityName} tourism`);
      break;
    case 'hotel':
      queries.push(`${locationName} hotel`);
      queries.push(`luxury hotel ${cityName}`);
      break;
    case 'restaurant':
      queries.push(`${locationName} restaurant`);
      queries.push(`${cityName} dining food`);
      break;
  }

  const allImages: FreepikImage[] = [];

  for (const query of queries.slice(0, 2)) {
    const result = await searchImages(query, {
      perPage: Math.ceil(limit / 2),
      orientation: 'horizontal', // Better for web display
    });

    if (result?.images) {
      allImages.push(...result.images);
    }

    // Rate limit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Deduplicate by ID
  const uniqueImages = Array.from(
    new Map(allImages.map(img => [img.id, img])).values()
  );

  return uniqueImages.slice(0, limit);
}

// Get image details by ID
export async function getImageDetails(imageId: string): Promise<FreepikImage | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const result = await withRetry(
    async () => {
      const response = await fetch(`${FREEPIK_API}/resources/${imageId}`, {
        headers: {
          'Accept': 'application/json',
          'X-Freepik-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Freepik API error: ${response.status}`);
      }

      return response.json();
    },
    { maxRetries: 2 }
  );

  if (!result.success || !result.data) {
    return null;
  }

  const item = result.data;
  const authorName = item.author?.name || item.contributor?.name || 'Unknown';

  return {
    id: String(item.id),
    title: item.title || '',
    description: item.description || '',
    url: item.url || item.image?.source?.url || '',
    thumbnailUrl: item.thumbnails?.[0]?.url || item.image?.source?.url || '',
    previewUrl: item.preview?.url || item.image?.source?.url || '',
    width: item.width || item.image?.width || 0,
    height: item.height || item.image?.height || 0,
    author: {
      name: authorName,
      profileUrl: item.author?.url || item.contributor?.url || '',
    },
    tags: item.tags || [],
    downloadUrl: item.download?.url,
    attribution: {
      ...FREEPIK_ATTRIBUTION,
      photographerName: authorName,
      creditText: FREEPIK_ATTRIBUTION.creditFormat.replace('{author}', authorName),
    },
  };
}

// Validate that image has required attribution
export function validateImageAttribution(image: FreepikImage): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!image.attribution.photographerName || image.attribution.photographerName === 'Unknown') {
    errors.push('Missing photographer name for Freepik image');
  }

  if (!image.attribution.creditText) {
    errors.push('Missing credit text for Freepik image');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Check if Freepik API is available
export function isFreepikAvailable(): boolean {
  return !!getApiKey();
}

// Generate proper attribution HTML
export function generateAttributionHtml(image: FreepikImage): string {
  const { author, attribution } = image;
  
  if (author.profileUrl) {
    return `Image by <a href="${author.profileUrl}" target="_blank" rel="noopener">${author.name}</a> on <a href="https://www.freepik.com" target="_blank" rel="noopener">Freepik</a>`;
  }
  
  return attribution.creditText;
}

// Generate plain text attribution
export function generateAttributionText(image: FreepikImage): string {
  return image.attribution.creditText;
}
