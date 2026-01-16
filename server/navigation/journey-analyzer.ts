/**
 * Journey Analyzer - Analyzes user journey coherence through the site
 * Maps: entry → exploration → deep dive → retention
 * Detects dead ends and suggests related links
 */

import { db } from "../db";
import { destinations, contents, attractions, hotels, categoryPages } from "@shared/schema";
import { eq, and, sql, ne, isNull } from "drizzle-orm";
import { resolveEntityLink, type EntityType } from "./entity-resolver";
import { parseUrl, buildUrl } from "./url-mapper";

/**
 * Journey stage definitions
 * - entry: Homepage, destination landing pages
 * - exploration: Category pages, destination detail pages
 * - deep_dive: Individual attractions, hotels, articles
 * - retention: Related content, newsletter signup, saved items
 */
export type JourneyStage = 'entry' | 'exploration' | 'deep_dive' | 'retention';

interface JourneyStageConfig {
  stage: JourneyStage;
  patterns: RegExp[];
  nextStages: JourneyStage[];
}

const JOURNEY_STAGES: JourneyStageConfig[] = [
  {
    stage: 'entry',
    patterns: [
      /^\/$/,
      /^\/destinations\/?$/,
      /^\/about\/?$/,
    ],
    nextStages: ['exploration', 'deep_dive'],
  },
  {
    stage: 'exploration',
    patterns: [
      /^\/destinations\/[^/]+\/?$/,
      /^\/categories\/[^/]+\/?$/,
      /^\/hotels\/?$/,
      /^\/attractions\/?$/,
      /^\/articles\/?$/,
    ],
    nextStages: ['deep_dive', 'exploration', 'retention'],
  },
  {
    stage: 'deep_dive',
    patterns: [
      /^\/hotels\/[^/]+\/?$/,
      /^\/attractions\/[^/]+\/?$/,
      /^\/articles\/[^/]+\/?$/,
    ],
    nextStages: ['retention', 'deep_dive', 'exploration'],
  },
  {
    stage: 'retention',
    patterns: [
      /^\/saved\/?$/,
      /^\/newsletter\/?$/,
      /^\/compare\/?$/,
    ],
    nextStages: ['exploration', 'deep_dive'],
  },
];

/**
 * Determine the journey stage for a given URL path
 */
export function getJourneyStage(path: string): JourneyStage | null {
  const normalizedPath = path.toLowerCase().replace(/\/+$/, '') || '/';
  
  for (const config of JOURNEY_STAGES) {
    for (const pattern of config.patterns) {
      if (pattern.test(normalizedPath)) {
        return config.stage;
      }
    }
  }
  
  return null;
}

/**
 * Check if a transition between two stages is valid
 */
function isValidTransition(fromStage: JourneyStage, toStage: JourneyStage): boolean {
  const config = JOURNEY_STAGES.find(s => s.stage === fromStage);
  if (!config) return false;
  return config.nextStages.includes(toStage);
}

export interface JourneyAnalysisResult {
  coherent: boolean;
  gaps: string[];
}

/**
 * Analyze a user journey path for coherence
 * Checks if the sequence of pages follows a logical flow
 * 
 * @param pages - Array of URL paths in order visited
 * @returns Analysis result with coherence flag and identified gaps
 */
export function analyzeJourneyPath(pages: string[]): JourneyAnalysisResult {
  const gaps: string[] = [];
  
  if (pages.length === 0) {
    return { coherent: true, gaps: [] };
  }
  
  if (pages.length === 1) {
    const stage = getJourneyStage(pages[0]);
    if (!stage) {
      gaps.push(`Unknown page type: ${pages[0]}`);
      return { coherent: false, gaps };
    }
    return { coherent: true, gaps: [] };
  }
  
  let previousStage: JourneyStage | null = null;
  
  for (let i = 0; i < pages.length; i++) {
    const currentPath = pages[i];
    const currentStage = getJourneyStage(currentPath);
    
    if (!currentStage) {
      gaps.push(`Unknown page type at position ${i + 1}: ${currentPath}`);
      continue;
    }
    
    if (previousStage) {
      if (!isValidTransition(previousStage, currentStage)) {
        gaps.push(
          `Invalid transition: ${previousStage} → ${currentStage} ` +
          `(from ${pages[i - 1]} to ${currentPath})`
        );
      }
    }
    
    previousStage = currentStage;
  }
  
  const hasEntryPoint = pages.some(p => getJourneyStage(p) === 'entry');
  if (!hasEntryPoint && pages.length > 2) {
    gaps.push('Journey missing entry point (homepage or main landing page)');
  }
  
  const hasDeepDive = pages.some(p => getJourneyStage(p) === 'deep_dive');
  if (!hasDeepDive && pages.length > 3) {
    gaps.push('Journey missing deep dive content (individual attractions, hotels, or articles)');
  }
  
  return {
    coherent: gaps.length === 0,
    gaps,
  };
}

export interface DeadEndResult {
  page: string;
  reason: string;
}

/**
 * Detect pages that are dead ends (no onward paths)
 * A dead end is a page that has no links to other content
 * 
 * @returns Array of dead end pages with reasons
 */
export async function detectDeadEnds(): Promise<DeadEndResult[]> {
  const deadEnds: DeadEndResult[] = [];
  
  const contentItems = await db
    .select({
      id: contents.id,
      slug: contents.slug,
      type: contents.type,
      title: contents.title,
      blocks: contents.blocks,
    })
    .from(contents)
    .where(
      and(
        eq(contents.status, 'published'),
        isNull(contents.deletedAt)
      )
    );
  
  for (const item of contentItems) {
    const hasRelatedContent = await checkHasRelatedContent(item.id, item.type);
    
    const hasInternalLinks = hasLinksInBlocks(item.blocks);
    
    if (!hasRelatedContent && !hasInternalLinks) {
      const entityType = mapContentTypeToEntityType(item.type);
      if (entityType) {
        deadEnds.push({
          page: buildUrl(entityType, item.slug),
          reason: `No related ${item.type}s or internal links found. Consider adding related content.`,
        });
      }
    }
  }
  
  const allDestinations = await db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
    })
    .from(destinations)
    .where(eq(destinations.isActive, true));
  
  for (const dest of allDestinations) {
    const contentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(attractions)
      .where(eq(attractions.destinationId, dest.id));
    
    const hotelCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(hotels)
      .where(eq(hotels.destinationId, dest.id));
    
    const totalContent = Number(contentCount[0]?.count || 0) + Number(hotelCount[0]?.count || 0);
    
    if (totalContent === 0) {
      deadEnds.push({
        page: `/destinations/${dest.slug}`,
        reason: `Destination "${dest.name}" has no attractions or hotels. Users have nowhere to go from here.`,
      });
    }
  }
  
  return deadEnds;
}

function mapContentTypeToEntityType(contentType: string): EntityType | null {
  const mapping: Record<string, EntityType> = {
    hotel: 'hotel',
    attraction: 'attraction',
    article: 'article',
  };
  return mapping[contentType] || null;
}

async function checkHasRelatedContent(contentId: string, contentType: string): Promise<boolean> {
  if (contentType === 'attraction') {
    const attr = await db
      .select({ relatedAttractions: attractions.relatedAttractions })
      .from(attractions)
      .where(eq(attractions.contentId, contentId))
      .limit(1);
    
    const related = attr[0]?.relatedAttractions as unknown[];
    return Array.isArray(related) && related.length > 0;
  }
  
  if (contentType === 'hotel') {
    const hotel = await db
      .select({ relatedHotels: hotels.relatedHotels })
      .from(hotels)
      .where(eq(hotels.contentId, contentId))
      .limit(1);
    
    const related = hotel[0]?.relatedHotels as unknown[];
    return Array.isArray(related) && related.length > 0;
  }
  
  return false;
}

function hasLinksInBlocks(blocks: unknown): boolean {
  if (!blocks || !Array.isArray(blocks)) return false;
  
  const blocksJson = JSON.stringify(blocks);
  
  const linkPatterns = [
    /href\s*[=:]\s*["'][^"']*["']/i,
    /"link"\s*:\s*"[^"]+"/i,
    /"url"\s*:\s*"[^"]+"/i,
    /\[\[.*?\]\]/,
  ];
  
  return linkPatterns.some(pattern => pattern.test(blocksJson));
}

export interface SuggestedLink {
  type: string;
  id: string;
  name: string;
  slug: string;
  reason: string;
}

/**
 * Get suggested links for an entity to prevent dead ends
 * Returns related destinations, nearby attractions, or similar hotels
 * 
 * @param entityId - The ID of the entity
 * @param entityType - The type of entity (destination, hotel, attraction, article)
 * @returns Array of suggested links with reasons
 */
export async function getSuggestedLinks(
  entityId: string,
  entityType: string
): Promise<SuggestedLink[]> {
  const suggestions: SuggestedLink[] = [];
  
  try {
    switch (entityType) {
      case 'destination':
        await addDestinationSuggestions(entityId, suggestions);
        break;
      case 'hotel':
        await addHotelSuggestions(entityId, suggestions);
        break;
      case 'attraction':
        await addAttractionSuggestions(entityId, suggestions);
        break;
      case 'article':
        await addArticleSuggestions(entityId, suggestions);
        break;
      default:
        break;
    }
    
    const validatedSuggestions: SuggestedLink[] = [];
    for (const suggestion of suggestions) {
      const url = await resolveEntityLink(
        suggestion.type as EntityType,
        suggestion.slug
      );
      if (url) {
        validatedSuggestions.push(suggestion);
      }
    }
    
    return validatedSuggestions.slice(0, 10);
  } catch (error) {
    console.error('Error getting suggested links:', error);
    return [];
  }
}

async function addDestinationSuggestions(
  destinationId: string,
  suggestions: SuggestedLink[]
): Promise<void> {
  const attractionResults = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
    })
    .from(contents)
    .innerJoin(attractions, eq(attractions.contentId, contents.id))
    .where(
      and(
        eq(attractions.destinationId, destinationId),
        eq(contents.status, 'published'),
        isNull(contents.deletedAt)
      )
    )
    .limit(5);
  
  for (const attr of attractionResults) {
    suggestions.push({
      type: 'attraction',
      id: attr.id,
      name: attr.title,
      slug: attr.slug,
      reason: 'Top attraction in this destination',
    });
  }
  
  const hotelResults = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
    })
    .from(contents)
    .innerJoin(hotels, eq(hotels.contentId, contents.id))
    .where(
      and(
        eq(hotels.destinationId, destinationId),
        eq(contents.status, 'published'),
        isNull(contents.deletedAt)
      )
    )
    .limit(3);
  
  for (const hotel of hotelResults) {
    suggestions.push({
      type: 'hotel',
      id: hotel.id,
      name: hotel.title,
      slug: hotel.slug,
      reason: 'Popular hotel in this destination',
    });
  }
  
  const siblingDestinations = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
    })
    .from(destinations)
    .where(
      and(
        eq(destinations.isActive, true),
        ne(destinations.id, destinationId)
      )
    )
    .limit(3);
  
  for (const dest of siblingDestinations) {
    suggestions.push({
      type: 'destination',
      id: dest.id,
      name: dest.name,
      slug: dest.slug,
      reason: 'Explore another destination',
    });
  }
}

async function addHotelSuggestions(
  contentId: string,
  suggestions: SuggestedLink[]
): Promise<void> {
  const hotelData = await db
    .select({
      destinationId: hotels.destinationId,
      relatedHotels: hotels.relatedHotels,
    })
    .from(hotels)
    .where(eq(hotels.contentId, contentId))
    .limit(1);
  
  const hotel = hotelData[0];
  if (!hotel) return;
  
  const relatedHotels = hotel.relatedHotels as Array<{ id?: string; name?: string; slug?: string }> | null;
  if (Array.isArray(relatedHotels)) {
    for (const related of relatedHotels.slice(0, 3)) {
      if (related.slug && related.name) {
        suggestions.push({
          type: 'hotel',
          id: related.id || '',
          name: related.name,
          slug: related.slug,
          reason: 'Similar hotel nearby',
        });
      }
    }
  }
  
  if (hotel.destinationId) {
    const nearbyAttractions = await db
      .select({
        id: contents.id,
        title: contents.title,
        slug: contents.slug,
      })
      .from(contents)
      .innerJoin(attractions, eq(attractions.contentId, contents.id))
      .where(
        and(
          eq(attractions.destinationId, hotel.destinationId),
          eq(contents.status, 'published'),
          isNull(contents.deletedAt)
        )
      )
      .limit(4);
    
    for (const attr of nearbyAttractions) {
      suggestions.push({
        type: 'attraction',
        id: attr.id,
        name: attr.title,
        slug: attr.slug,
        reason: 'Nearby attraction to explore',
      });
    }
    
    const destData = await db
      .select({
        id: destinations.id,
        name: destinations.name,
        slug: destinations.slug,
      })
      .from(destinations)
      .where(eq(destinations.id, hotel.destinationId))
      .limit(1);
    
    if (destData[0]) {
      suggestions.push({
        type: 'destination',
        id: destData[0].id,
        name: destData[0].name,
        slug: destData[0].slug,
        reason: 'Explore more of this destination',
      });
    }
  }
}

async function addAttractionSuggestions(
  contentId: string,
  suggestions: SuggestedLink[]
): Promise<void> {
  const attractionData = await db
    .select({
      destinationId: attractions.destinationId,
      relatedAttractions: attractions.relatedAttractions,
    })
    .from(attractions)
    .where(eq(attractions.contentId, contentId))
    .limit(1);
  
  const attraction = attractionData[0];
  if (!attraction) return;
  
  const relatedAttractions = attraction.relatedAttractions as Array<{ id?: string; name?: string; slug?: string }> | null;
  if (Array.isArray(relatedAttractions)) {
    for (const related of relatedAttractions.slice(0, 3)) {
      if (related.slug && related.name) {
        suggestions.push({
          type: 'attraction',
          id: related.id || '',
          name: related.name,
          slug: related.slug,
          reason: 'Related attraction',
        });
      }
    }
  }
  
  if (attraction.destinationId) {
    const nearbyHotels = await db
      .select({
        id: contents.id,
        title: contents.title,
        slug: contents.slug,
      })
      .from(contents)
      .innerJoin(hotels, eq(hotels.contentId, contents.id))
      .where(
        and(
          eq(hotels.destinationId, attraction.destinationId),
          eq(contents.status, 'published'),
          isNull(contents.deletedAt)
        )
      )
      .limit(3);
    
    for (const hotel of nearbyHotels) {
      suggestions.push({
        type: 'hotel',
        id: hotel.id,
        name: hotel.title,
        slug: hotel.slug,
        reason: 'Hotel near this attraction',
      });
    }
    
    const destData = await db
      .select({
        id: destinations.id,
        name: destinations.name,
        slug: destinations.slug,
      })
      .from(destinations)
      .where(eq(destinations.id, attraction.destinationId))
      .limit(1);
    
    if (destData[0]) {
      suggestions.push({
        type: 'destination',
        id: destData[0].id,
        name: destData[0].name,
        slug: destData[0].slug,
        reason: 'Explore more of this destination',
      });
    }
  }
}

async function addArticleSuggestions(
  contentId: string,
  suggestions: SuggestedLink[]
): Promise<void> {
  const recentArticles = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
    })
    .from(contents)
    .where(
      and(
        eq(contents.type, 'article'),
        eq(contents.status, 'published'),
        ne(contents.id, contentId),
        isNull(contents.deletedAt)
      )
    )
    .orderBy(sql`${contents.publishedAt} DESC NULLS LAST`)
    .limit(4);
  
  for (const article of recentArticles) {
    suggestions.push({
      type: 'article',
      id: article.id,
      name: article.title,
      slug: article.slug,
      reason: 'Related article',
    });
  }
  
  const topDestinations = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
    })
    .from(destinations)
    .where(eq(destinations.isActive, true))
    .limit(3);
  
  for (const dest of topDestinations) {
    suggestions.push({
      type: 'destination',
      id: dest.id,
      name: dest.name,
      slug: dest.slug,
      reason: 'Explore destinations',
    });
  }
}
