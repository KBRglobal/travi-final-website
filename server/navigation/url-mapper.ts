/**
 * URL Mapper - Maps entity types to URL patterns
 * Used by the navigation intelligence system to generate valid URLs
 */

export type EntityType = 'destination' | 'hotel' | 'attraction' | 'article' | 'category';

const URL_PATTERNS: Record<EntityType, string> = {
  destination: '/destinations/{slug}',
  hotel: '/hotels/{slug}',
  attraction: '/attractions/{slug}',
  article: '/articles/{slug}',
  category: '/categories/{slug}',
};

/**
 * Get the URL pattern for a given entity type
 */
export function getUrlPattern(type: EntityType): string {
  return URL_PATTERNS[type];
}

/**
 * Build a URL from an entity type and slug
 * Does NOT validate if the entity exists - use resolveEntityLink for that
 */
export function buildUrl(type: EntityType, slug: string): string {
  const pattern = URL_PATTERNS[type];
  return pattern.replace('{slug}', slug);
}

/**
 * Parse a URL to extract entity type and slug
 * Returns null if the URL doesn't match any known pattern
 */
export function parseUrl(url: string): { type: EntityType; slug: string } | null {
  const patterns: Array<{ type: EntityType; regex: RegExp }> = [
    { type: 'destination', regex: /^\/destinations\/([^/]+)\/?$/ },
    { type: 'hotel', regex: /^\/hotels\/([^/]+)\/?$/ },
    { type: 'attraction', regex: /^\/attractions\/([^/]+)\/?$/ },
    { type: 'article', regex: /^\/articles\/([^/]+)\/?$/ },
    { type: 'category', regex: /^\/categories\/([^/]+)\/?$/ },
  ];

  for (const { type, regex } of patterns) {
    const match = url.match(regex);
    if (match) {
      return { type, slug: match[1] };
    }
  }

  return null;
}

/**
 * Check if a given entity type is valid
 */
export function isValidEntityType(type: string): type is EntityType {
  return ['destination', 'hotel', 'attraction', 'article', 'category'].includes(type);
}

/**
 * Get all supported entity types
 */
export function getSupportedEntityTypes(): EntityType[] {
  return Object.keys(URL_PATTERNS) as EntityType[];
}
