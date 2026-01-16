/**
 * Octopus Engine - Internal Linker
 * Smart internal linking based on geographic proximity
 *
 * Rules (from TRAVI SEO guidelines):
 * - Hotel links: 1 neighborhood + 3-5 attractions (1km) + 1 restaurant
 * - 5-8 links per page (less = weak, more = dilutes)
 * - Priority: Geographic proximity > Price > Style
 * - Never link to competing entities of same type
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Internal Linker] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export interface LinkableEntity {
  id: string;
  name: string;
  type: 'hotel' | 'restaurant' | 'attraction' | 'neighborhood' | 'guide' | 'article';
  url: string;
  neighborhood?: string;
  geo?: {
    latitude: number;
    longitude: number;
  };
  priceLevel?: number; // 1-5
  style?: string; // 'luxury', 'boutique', 'family', etc.
  targetAudience?: string[];
}

export interface InternalLink {
  text: string;
  url: string;
  title?: string;
  rel?: string;
  priority: number;
  reason: 'neighborhood' | 'nearby' | 'price' | 'style' | 'audience' | 'related';
}

export interface LinkingPlan {
  entity: LinkableEntity;
  links: InternalLink[];
  htmlLinks: string[];
  relatedContent: InternalLink[];
  breadcrumbs: InternalLink[];
  totalLinks: number;
}

export interface LinkingConfig {
  minLinks: number;
  maxLinks: number;
  nearbyRadius: number; // in km
  sameTypeLimit: number; // max links to same entity type
  priceVariance: number; // 0.2 = 20%
}

const DEFAULT_CONFIG: LinkingConfig = {
  minLinks: 5,
  maxLinks: 8,
  nearbyRadius: 1, // 1km
  sameTypeLimit: 0, // Don't link to competing entities
  priceVariance: 0.2,
};

// ============================================================================
// Core Linking Functions
// ============================================================================

/**
 * Generate internal links for an entity
 */
export function generateInternalLinks(
  entity: LinkableEntity,
  allEntities: LinkableEntity[],
  config: Partial<LinkingConfig> = {}
): LinkingPlan {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const links: InternalLink[] = [];

  // Filter out self and same-type entities (competitors)
  const candidates = allEntities.filter(e =>
    e.id !== entity.id &&
    (cfg.sameTypeLimit > 0 || e.type !== entity.type)
  );

  // 1. Add neighborhood link (priority 1)
  if (entity.neighborhood) {
    const neighborhoodEntity = candidates.find(
      e => e.type === 'neighborhood' && e.name === entity.neighborhood
    );
    if (neighborhoodEntity) {
      links.push({
        text: neighborhoodEntity.name,
        url: neighborhoodEntity.url,
        priority: 1,
        reason: 'neighborhood',
      });
    }
  }

  // 2. Add nearby attractions (priority 2)
  if (entity.geo) {
    const nearbyAttractions = candidates
      .filter(e => e.type === 'attraction' && e.geo)
      .map(e => ({
        entity: e,
        distance: calculateDistance(entity.geo!, e.geo!),
      }))
      .filter(e => e.distance <= cfg.nearbyRadius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    for (const { entity: attraction } of nearbyAttractions) {
      links.push({
        text: attraction.name,
        url: attraction.url,
        priority: 2,
        reason: 'nearby',
      });
    }
  }

  // 3. Add one restaurant (priority 3) - for hotels
  if (entity.type === 'hotel' && entity.geo) {
    const nearbyRestaurant = candidates
      .filter(e => e.type === 'restaurant' && e.geo)
      .map(e => ({
        entity: e,
        distance: calculateDistance(entity.geo!, e.geo!),
      }))
      .filter(e => e.distance <= 0.5) // walking distance
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearbyRestaurant) {
      links.push({
        text: nearbyRestaurant.entity.name,
        url: nearbyRestaurant.entity.url,
        priority: 3,
        reason: 'nearby',
      });
    }
  }

  // 4. Add related guides/articles (priority 4)
  const relatedGuides = candidates
    .filter(e => e.type === 'guide' || e.type === 'article')
    .filter(e => {
      // Match by neighborhood or audience
      if (entity.neighborhood && e.name.includes(entity.neighborhood)) return true;
      if (entity.targetAudience && e.targetAudience) {
        return entity.targetAudience.some(a => e.targetAudience!.includes(a));
      }
      return false;
    })
    .slice(0, 2);

  for (const guide of relatedGuides) {
    links.push({
      text: guide.name,
      url: guide.url,
      priority: 4,
      reason: 'related',
    });
  }

  // Enforce limits
  const finalLinks = links
    .sort((a, b) => a.priority - b.priority)
    .slice(0, cfg.maxLinks);

  // Generate Related Content (same neighborhood > same price > same style)
  const relatedContent = generateRelatedContent(entity, candidates, cfg);

  // Generate Breadcrumbs
  const breadcrumbs = generateBreadcrumbs(entity);

  // Generate HTML
  const htmlLinks = finalLinks.map(link => generateLinkHTML(link));

  return {
    entity,
    links: finalLinks,
    htmlLinks,
    relatedContent,
    breadcrumbs,
    totalLinks: finalLinks.length,
  };
}

/**
 * Generate related content recommendations
 */
function generateRelatedContent(
  entity: LinkableEntity,
  candidates: LinkableEntity[],
  config: LinkingConfig
): InternalLink[] {
  const related: InternalLink[] = [];

  // Priority 1: Same neighborhood (different type)
  if (entity.neighborhood) {
    const sameNeighborhood = candidates
      .filter(e => e.neighborhood === entity.neighborhood && e.type !== entity.type)
      .slice(0, 3);

    for (const e of sameNeighborhood) {
      related.push({
        text: e.name,
        url: e.url,
        priority: 1,
        reason: 'neighborhood',
      });
    }
  }

  // Priority 2: Same price range (+/- 20%)
  if (entity.priceLevel) {
    const minPrice = entity.priceLevel * (1 - config.priceVariance);
    const maxPrice = entity.priceLevel * (1 + config.priceVariance);

    const samePrice = candidates
      .filter(e =>
        e.priceLevel &&
        e.priceLevel >= minPrice &&
        e.priceLevel <= maxPrice &&
        e.type !== entity.type
      )
      .slice(0, 2);

    for (const e of samePrice) {
      related.push({
        text: e.name,
        url: e.url,
        priority: 2,
        reason: 'price',
      });
    }
  }

  // Priority 3: Same style
  if (entity.style) {
    const sameStyle = candidates
      .filter(e => e.style === entity.style && e.type !== entity.type)
      .slice(0, 2);

    for (const e of sameStyle) {
      related.push({
        text: e.name,
        url: e.url,
        priority: 3,
        reason: 'style',
      });
    }
  }

  // Priority 4: Same target audience (only for very specific audiences)
  const specificAudiences = ['LGBTQ+', 'accessible', 'pet-friendly'];
  if (entity.targetAudience?.some(a => specificAudiences.includes(a))) {
    const sameAudience = candidates
      .filter(e =>
        e.targetAudience &&
        entity.targetAudience!.some(a => e.targetAudience!.includes(a) && specificAudiences.includes(a))
      )
      .slice(0, 2);

    for (const e of sameAudience) {
      related.push({
        text: e.name,
        url: e.url,
        priority: 4,
        reason: 'audience',
      });
    }
  }

  // Remove duplicates and sort by priority
  const uniqueRelated = Array.from(
    new Map(related.map(r => [r.url, r])).values()
  ).sort((a, b) => a.priority - b.priority);

  return uniqueRelated.slice(0, 5);
}

/**
 * Generate breadcrumb links for an entity
 */
function generateBreadcrumbs(entity: LinkableEntity): InternalLink[] {
  const breadcrumbs: InternalLink[] = [];

  // Home
  breadcrumbs.push({
    text: 'Home',
    url: '/',
    priority: 1,
    reason: 'related',
  });

  // Extract destination from URL (e.g., /bangkok/hotels/capella -> bangkok)
  const urlParts = entity.url.split('/').filter(Boolean);
  if (urlParts.length > 0) {
    const destination = urlParts[0];
    breadcrumbs.push({
      text: formatBreadcrumbText(destination),
      url: `/${destination}`,
      priority: 2,
      reason: 'related',
    });
  }

  // Category
  if (urlParts.length > 1) {
    const category = urlParts[1];
    breadcrumbs.push({
      text: getCategoryLabel(category),
      url: `/${urlParts[0]}/${category}`,
      priority: 3,
      reason: 'related',
    });
  }

  // Current entity (no link)
  breadcrumbs.push({
    text: entity.name,
    url: entity.url,
    priority: 4,
    reason: 'related',
  });

  return breadcrumbs;
}

// ============================================================================
// HTML Generators
// ============================================================================

/**
 * Generate anchor tag HTML for a link
 */
export function generateLinkHTML(link: InternalLink): string {
  const titleAttr = link.title ? ` title="${escapeHtml(link.title)}"` : '';
  const relAttr = link.rel ? ` rel="${link.rel}"` : '';

  return `<a href="${link.url}"${titleAttr}${relAttr}>${escapeHtml(link.text)}</a>`;
}

/**
 * Generate related content section HTML
 */
export function generateRelatedContentHTML(
  related: InternalLink[],
  heading: string = 'תוכן קשור'
): string {
  if (related.length === 0) return '';

  return `<section class="related-content">
  <h3>${heading}</h3>
  <ul>
${related.map(link => `    <li>${generateLinkHTML(link)}</li>`).join('\n')}
  </ul>
</section>`;
}

/**
 * Generate breadcrumb navigation HTML
 */
export function generateBreadcrumbHTML(breadcrumbs: InternalLink[]): string {
  const items = breadcrumbs.map((crumb, index) => {
    const isLast = index === breadcrumbs.length - 1;

    if (isLast) {
      return `<li aria-current="page"><span>${escapeHtml(crumb.text)}</span></li>`;
    }

    return `<li><a href="${crumb.url}">${escapeHtml(crumb.text)}</a></li>`;
  });

  return `<nav aria-label="Breadcrumb" class="breadcrumbs">
  <ol>
    ${items.join('\n    ')}
  </ol>
</nav>`;
}

/**
 * Generate inline links within content (1 link per 150-200 words)
 */
export function insertContentLinks(
  content: string,
  availableLinks: InternalLink[],
  targetLinkDensity: number = 175 // words per link
): string {
  const words = content.split(/\s+/);
  const targetLinkCount = Math.floor(words.length / targetLinkDensity);
  const linksToInsert = availableLinks.slice(0, targetLinkCount);

  if (linksToInsert.length === 0) return content;

  // Find natural insertion points (after sentences containing keywords)
  let result = content;

  for (const link of linksToInsert) {
    // Try to find the entity name in the content
    const pattern = new RegExp(`\\b(${escapeRegExp(link.text)})\\b`, 'i');
    const match = result.match(pattern);

    if (match && match.index !== undefined) {
      // Replace first occurrence with linked version
      result = result.replace(pattern, generateLinkHTML(link));
    }
  }

  return result;
}

// ============================================================================
// Bulk Linking
// ============================================================================

/**
 * Generate internal links for all entities
 */
export function generateBulkInternalLinks(
  entities: LinkableEntity[],
  config: Partial<LinkingConfig> = {}
): Map<string, LinkingPlan> {
  const plans = new Map<string, LinkingPlan>();

  for (const entity of entities) {
    const plan = generateInternalLinks(entity, entities, config);
    plans.set(entity.id, plan);
  }

  logger.info('Generated bulk internal links', {
    entityCount: entities.length,
    totalLinks: Array.from(plans.values()).reduce((sum, p) => sum + p.totalLinks, 0),
  });

  return plans;
}

/**
 * Get linking statistics
 */
export function getLinkingStats(plans: Map<string, LinkingPlan>): {
  totalEntities: number;
  totalLinks: number;
  avgLinksPerPage: number;
  pagesWithMinLinks: number;
  pagesWithMaxLinks: number;
  linksByReason: Record<string, number>;
} {
  const allPlans = Array.from(plans.values());

  const linksByReason: Record<string, number> = {};
  let totalLinks = 0;

  for (const plan of allPlans) {
    totalLinks += plan.totalLinks;

    for (const link of plan.links) {
      linksByReason[link.reason] = (linksByReason[link.reason] || 0) + 1;
    }
  }

  return {
    totalEntities: allPlans.length,
    totalLinks,
    avgLinksPerPage: totalLinks / allPlans.length,
    pagesWithMinLinks: allPlans.filter(p => p.totalLinks >= 5).length,
    pagesWithMaxLinks: allPlans.filter(p => p.totalLinks >= 8).length,
    linksByReason,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate distance between two points in km (Haversine formula)
 */
function calculateDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.latitude)) *
      Math.cos(toRad(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatBreadcrumbText(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    hotels: 'Hotels',
    restaurants: 'Restaurants',
    attractions: 'Attractions',
    neighborhoods: 'Neighborhoods',
    guides: 'Guides',
    itineraries: 'Itineraries',
  };

  return labels[category] || formatBreadcrumbText(category);
}

function escapeHtml(text: string): string {
  const escapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, char => escapes[char] || char);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
