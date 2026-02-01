/**
 * Entity Resolver (Stub)
 * Navigation functionality was simplified during cleanup.
 */

export type EntityType = 'attraction' | 'hotel' | 'destination' | 'article' | 'guide';

export function resolveEntityLink(entityType: EntityType, slug: string, locale?: string): string {
  const basePath = locale && locale !== 'en' ? `/${locale}` : '';
  
  switch (entityType) {
    case 'attraction':
      return `${basePath}/attractions/${slug}`;
    case 'hotel':
      return `${basePath}/hotels/${slug}`;
    case 'destination':
      return `${basePath}/destinations/${slug}`;
    case 'article':
      return `${basePath}/articles/${slug}`;
    case 'guide':
      return `${basePath}/guides/${slug}`;
    default:
      return `${basePath}/${slug}`;
  }
}
