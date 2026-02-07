/**
 * Internal Linking Engine
 *
 * Automatically inserts relevant internal links between Travi content pages.
 * Ensures proper SEO link structure with 5-8 internal links per article.
 *
 * Phase 15C: Now supports database-driven link targets
 * - Fetches destinations and content from database
 * - Caches for 10 minutes to reduce DB load
 * - Falls back to hardcoded data if DB empty
 */

import { createLogger } from "../lib/logger";
import {
  SEO_REQUIREMENTS,
  CONTENT_TYPE_REQUIREMENTS,
  type ContentType,
} from "../lib/seo-standards";
// Dubai keywords import removed - using database-driven links instead
import { db } from "../db";
import { destinations, contents, categoryPages } from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

const logger = createLogger("internal-linking");

// Cache for database-loaded content
let dbLinksCache: LinkableContent[] = [];
let dbLinksCacheTime = 0;
const DB_LINKS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// TYPES
// ============================================================================

export interface LinkableContent {
  id: string;
  type: ContentType | "landing";
  slug: string;
  title: string;
  destination?: string;
  keywords?: string[];
  category?: string;
}

export interface InternalLink {
  url: string;
  anchorText: string;
  relevanceScore: number;
  targetId: string;
  targetType: string;
}

export interface LinkingResult {
  content: string; // Content with links inserted
  linksAdded: number;
  links: InternalLink[];
}

// ============================================================================
// LINK DATABASE (In-memory for demonstration - would be from DB in production)
// ============================================================================

// Known destinations and their pages
const DESTINATION_LINKS: LinkableContent[] = [
  {
    id: "dubai",
    type: "destination",
    slug: "/destinations/dubai",
    title: "Dubai Travel Guide",
    destination: "Dubai",
    keywords: ["dubai", "uae", "emirates", "burj khalifa", "palm jumeirah"],
  },
  {
    id: "paris",
    type: "destination",
    slug: "/destinations/paris",
    title: "Paris Travel Guide",
    destination: "Paris",
    keywords: ["paris", "france", "eiffel tower", "louvre", "champs elysees"],
  },
  {
    id: "bangkok",
    type: "destination",
    slug: "/destinations/bangkok",
    title: "Bangkok Travel Guide",
    destination: "Bangkok",
    keywords: ["bangkok", "thailand", "temples", "street food", "grand palace"],
  },
  {
    id: "istanbul",
    type: "destination",
    slug: "/destinations/istanbul",
    title: "Istanbul Travel Guide",
    destination: "Istanbul",
    keywords: ["istanbul", "turkey", "bosphorus", "hagia sophia", "blue mosque"],
  },
  {
    id: "london",
    type: "destination",
    slug: "/destinations/london",
    title: "London Travel Guide",
    destination: "London",
    keywords: ["london", "uk", "england", "big ben", "buckingham palace"],
  },
  {
    id: "new-york",
    type: "destination",
    slug: "/destinations/new-york",
    title: "New York Travel Guide",
    destination: "New York",
    keywords: ["new york", "nyc", "manhattan", "times square", "central park"],
  },
  {
    id: "singapore",
    type: "destination",
    slug: "/destinations/singapore",
    title: "Singapore Travel Guide",
    destination: "Singapore",
    keywords: ["singapore", "marina bay", "sentosa", "gardens by the bay"],
  },
];

// Category pages (destination-specific pages are loaded from database)
const CATEGORY_LINKS: LinkableContent[] = [
  {
    id: "hotels",
    type: "landing",
    slug: "/hotels",
    title: "Find Hotels",
    keywords: ["hotel", "hotels", "accommodation", "stay", "resort"],
  },
  {
    id: "attractions",
    type: "landing",
    slug: "/attractions",
    title: "Top Attractions",
    keywords: ["attraction", "attractions", "things to do", "sightseeing", "landmark"],
  },
  {
    id: "restaurants",
    type: "landing",
    slug: "/dining",
    title: "Dining Guide",
    keywords: ["restaurant", "restaurants", "dining", "food", "cuisine", "eat"],
  },
  {
    id: "transport",
    type: "landing",
    slug: "/transport",
    title: "Transport Guide",
    keywords: ["transport", "transportation", "metro", "taxi", "bus", "getting around"],
  },
];

// ============================================================================
// MAIN LINKING FUNCTIONS
// ============================================================================

/**
 * Insert internal links into content
 */
export function insertInternalLinks(
  content: string,
  options: {
    contentType: ContentType;
    currentDestination?: string;
    currentId?: string;
    minLinks?: number;
    maxLinks?: number;
  }
): LinkingResult {
  const requirements = CONTENT_TYPE_REQUIREMENTS[options.contentType];
  const minLinks = options.minLinks || requirements.internalLinks.min;
  const maxLinks = options.maxLinks || requirements.internalLinks.max;

  const links: InternalLink[] = [];
  let processedContent = content;

  // Get all potential link targets (excluding current page)
  const allTargets = [...DESTINATION_LINKS, ...CATEGORY_LINKS].filter(
    t => t.id !== options.currentId
  );

  // Find opportunities to add links
  const opportunities = findLinkOpportunities(content, allTargets);

  // Sort by relevance and select top links
  opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const selectedLinks = opportunities.slice(0, maxLinks);

  // Insert links into content (in reverse order to preserve positions)
  selectedLinks.sort((a, b) => (b.position || 0) - (a.position || 0));

  for (const link of selectedLinks) {
    if (links.length >= maxLinks) break;

    const result = insertLink(processedContent, link);
    if (result.inserted) {
      processedContent = result.content;
      links.push({
        url: link.url,
        anchorText: link.anchorText,
        relevanceScore: link.relevanceScore,
        targetId: link.targetId,
        targetType: link.targetType,
      });
    }
  }

  logger.info(`Inserted ${links.length} internal links (target: ${minLinks}-${maxLinks})`);

  return {
    content: processedContent,
    linksAdded: links.length,
    links,
  };
}

/**
 * Suggest internal links without inserting them
 */
export function suggestInternalLinks(
  content: string,
  options: {
    currentDestination?: string;
    currentId?: string;
    maxSuggestions?: number;
  }
): InternalLink[] {
  const allTargets = [...DESTINATION_LINKS, ...CATEGORY_LINKS].filter(
    t => t.id !== options.currentId
  );

  const opportunities = findLinkOpportunities(content, allTargets);
  opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return opportunities.slice(0, options.maxSuggestions || 10).map(o => ({
    url: o.url,
    anchorText: o.anchorText,
    relevanceScore: o.relevanceScore,
    targetId: o.targetId,
    targetType: o.targetType,
  }));
}

/**
 * Analyze existing internal links in content
 */
export function analyzeExistingLinks(content: string): {
  count: number;
  links: Array<{ url: string; anchorText: string }>;
  missingOpportunities: string[];
} {
  const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  const links: Array<{ url: string; anchorText: string }> = [];

  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const url = match[1];
    // Only count internal links
    if (url.startsWith("/") || url.includes("travi")) {
      links.push({ url, anchorText: match[2] });
    }
  }

  // Find missing link opportunities
  const missingOpportunities: string[] = [];
  const contentLower = content.toLowerCase();
  const allTargets = [...DESTINATION_LINKS, ...CATEGORY_LINKS];

  for (const target of allTargets) {
    const isLinked = links.some(l => l.url.includes(target.slug));
    const isMentioned = target.keywords?.some(kw => contentLower.includes(kw));

    if (isMentioned && !isLinked) {
      const contextLabel = target.destination || target.category || target.title;
      missingOpportunities.push(`Could link to ${target.title} when mentioning ${contextLabel}`);
    }
  }

  return {
    count: links.length,
    links,
    missingOpportunities,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface LinkOpportunity {
  url: string;
  anchorText: string;
  relevanceScore: number;
  targetId: string;
  targetType: string;
  position?: number;
  matchedKeyword: string;
}

function findLinkOpportunities(content: string, targets: LinkableContent[]): LinkOpportunity[] {
  const opportunities: LinkOpportunity[] = [];
  const contentLower = content.toLowerCase();

  // Track already used anchor texts to avoid duplicate links
  const usedAnchors = new Set<string>();

  for (const target of targets) {
    if (!target.keywords) continue;

    for (const keyword of target.keywords) {
      const keywordLower = keyword.toLowerCase();
      const position = contentLower.indexOf(keywordLower);

      if (position !== -1 && !usedAnchors.has(keywordLower)) {
        // Check if this position is already inside a link
        if (isInsideExistingLink(content, position)) continue;

        // Calculate relevance score
        const relevanceScore = calculateRelevance(keyword, target, content);

        opportunities.push({
          url: target.slug,
          anchorText: findBestAnchorText(content, keyword, position),
          relevanceScore,
          targetId: target.id,
          targetType: target.type,
          position,
          matchedKeyword: keyword,
        });

        usedAnchors.add(keywordLower);
      }
    }
  }

  return opportunities;
}

function isInsideExistingLink(content: string, position: number): boolean {
  // Look for opening <a tag before position without closing </a>
  const before = content.substring(0, position);
  const lastOpenA = before.lastIndexOf("<a ");
  const lastCloseA = before.lastIndexOf("</a>");

  return lastOpenA > lastCloseA;
}

function calculateRelevance(keyword: string, target: LinkableContent, content: string): number {
  let score = 50; // Base score

  // Longer keywords are more specific
  if (keyword.length > 10) score += 20;
  else if (keyword.length > 5) score += 10;

  // Destination matches are highly relevant
  if (target.type === "destination") score += 15;

  // Multiple mentions increase relevance
  const mentions = (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), "g")) || [])
    .length;
  score += Math.min(mentions * 5, 20);

  // Keyword appears early in content (likely more important)
  const position = content.toLowerCase().indexOf(keyword.toLowerCase());
  if (position < content.length * 0.3) score += 10;

  return Math.min(score, 100);
}

function findBestAnchorText(content: string, keyword: string, position: number): string {
  // Extract the actual text from content (preserving case)
  const keywordLength = keyword.length;
  const actualText = content.substring(position, position + keywordLength);

  // Try to expand to include full proper noun or phrase
  const before = content.substring(Math.max(0, position - 20), position);
  const after = content.substring(
    position + keywordLength,
    Math.min(content.length, position + keywordLength + 20)
  );

  // Check if part of a longer phrase
  const beforeWord = before.match(/\b(\w+)\s*$/)?.[1] || "";
  const afterWord = after.match(/^\s*(\w+)\b/)?.[1] || "";

  // Common travel phrase patterns
  if (beforeWord.match(/^(the|visit|explore|discover)$/i)) {
    return `${beforeWord} ${actualText}`;
  }

  if (afterWord.match(/^(guide|travel|tour|trip)$/i)) {
    return `${actualText} ${afterWord}`;
  }

  return actualText;
}

function insertLink(
  content: string,
  opportunity: LinkOpportunity
): { inserted: boolean; content: string } {
  const { anchorText, url, position } = opportunity;

  if (position === undefined) {
    return { inserted: false, content };
  }

  // Find the exact text to replace (case-insensitive match, preserve original case)
  const searchStart = Math.max(0, position - 10);
  const searchEnd = Math.min(content.length, position + anchorText.length + 10);
  const searchArea = content.substring(searchStart, searchEnd);

  // Find the anchor text in the search area
  const anchorLower = anchorText.toLowerCase();
  const matchStart = searchArea.toLowerCase().indexOf(anchorLower);

  if (matchStart === -1) {
    return { inserted: false, content };
  }

  const actualAnchor = searchArea.substring(matchStart, matchStart + anchorText.length);
  const globalPosition = searchStart + matchStart;

  // Create the link
  const link = `<a href="${url}" class="internal-link">${actualAnchor}</a>`;

  // Replace the text with the link
  const newContent =
    content.substring(0, globalPosition) +
    link +
    content.substring(globalPosition + actualAnchor.length);

  return { inserted: true, content: newContent };
}

// ============================================================================
// LINK VALIDATION
// ============================================================================

/**
 * Validate internal linking meets requirements
 */
export function validateInternalLinking(
  content: string,
  contentType: ContentType
): {
  valid: boolean;
  count: number;
  required: { min: number; max: number };
  issues: string[];
} {
  const requirements = CONTENT_TYPE_REQUIREMENTS[contentType];
  const analysis = analyzeExistingLinks(content);

  const issues: string[] = [];

  if (analysis.count < requirements.internalLinks.min) {
    issues.push(
      `Not enough internal links (${analysis.count}). Minimum: ${requirements.internalLinks.min}`
    );
  }

  if (analysis.count > requirements.internalLinks.max + 2) {
    issues.push(
      `Too many internal links (${analysis.count}). Recommended maximum: ${requirements.internalLinks.max}`
    );
  }

  // Check for missed opportunities
  if (analysis.missingOpportunities.length > 0) {
    issues.push(...analysis.missingOpportunities.slice(0, 3));
  }

  return {
    valid: analysis.count >= requirements.internalLinks.min,
    count: analysis.count,
    required: requirements.internalLinks,
    issues,
  };
}

/**
 * Add custom linkable content to the engine
 */
export function addLinkableContent(content: LinkableContent): void {
  // Add to appropriate array based on type
  if (content.type === "destination") {
    const existing = DESTINATION_LINKS.findIndex(d => d.id === content.id);
    if (existing !== -1) {
      DESTINATION_LINKS[existing] = content;
    } else {
      DESTINATION_LINKS.push(content);
    }
  } else {
    const existing = CATEGORY_LINKS.findIndex(c => c.id === content.id);
    if (existing !== -1) {
      CATEGORY_LINKS[existing] = content;
    } else {
      CATEGORY_LINKS.push(content);
    }
  }
}

/**
 * Get all registered linkable content
 */
export function getLinkableContent(): {
  destinations: LinkableContent[];
  categories: LinkableContent[];
} {
  return {
    destinations: [...DESTINATION_LINKS],
    categories: [...CATEGORY_LINKS],
  };
}

/**
 * Phase 15C: Load linkable content from database
 * Fetches destinations and published content to use as link targets
 * Results are cached for 10 minutes to reduce database load
 */
export async function loadLinkableContentFromDB(): Promise<LinkableContent[]> {
  const now = Date.now();

  // Return cached data if still fresh
  if (dbLinksCache.length > 0 && now - dbLinksCacheTime < DB_LINKS_CACHE_TTL) {
    return dbLinksCache;
  }

  try {
    const linkableContent: LinkableContent[] = [];

    // Load destinations
    const dbDestinations = await db
      .select({
        id: destinations.id,
        slug: destinations.slug,
        name: destinations.name,
      })
      .from(destinations);

    for (const dest of dbDestinations) {
      linkableContent.push({
        id: String(dest.id),
        type: "destination",
        slug: `/destinations/${dest.slug}`,
        title: `${dest.name} Travel Guide`,
        destination: dest.name,
        keywords: [dest.name.toLowerCase(), dest.slug.toLowerCase()],
      });
    }

    // Load published content (hotels, attractions, articles)
    const publishedContent = await db
      .select({
        id: contents.id,
        type: contents.type,
        slug: contents.slug,
        title: contents.title,
        primaryKeyword: contents.primaryKeyword,
      })
      .from(contents)
      .where(and(eq(contents.status, "published" as any), isNotNull(contents.slug)))
      .limit(500); // Limit to prevent memory issues

    for (const content of publishedContent) {
      if (!content.slug) continue;

      const keywords: string[] = [content.title.toLowerCase()];
      if (content.primaryKeyword) {
        keywords.push(content.primaryKeyword.toLowerCase());
      }

      let slug = content.slug;
      if (!slug.startsWith("/")) {
        // Build proper URL based on content type
        switch (content.type) {
          case "hotel":
            slug = `/hotels/${slug}`;
            break;
          case "attraction":
            slug = `/attractions/${slug}`;
            break;
          case "dining":
            slug = `/dining/${slug}`;
            break;
          case "article":
            slug = `/articles/${slug}`;
            break;
          default:
            slug = `/${slug}`;
        }
      }

      linkableContent.push({
        id: content.id,
        type: content.type as ContentType,
        slug,
        title: content.title,
        keywords,
      });
    }

    // Load category pages
    const categories = await db
      .select({
        id: categoryPages.id,
        slug: categoryPages.slug,
        name: categoryPages.name,
        description: (categoryPages as any).description,
      })
      .from(categoryPages);

    for (const cat of categories) {
      linkableContent.push({
        id: cat.id,
        type: "landing",
        slug: cat.slug.startsWith("/") ? cat.slug : `/${cat.slug}`,
        title: cat.name,
        keywords: [cat.name.toLowerCase()],
        category: cat.name,
      });
    }

    // Update cache
    dbLinksCache = linkableContent;
    dbLinksCacheTime = now;

    (logger as any).info(`Loaded ${linkableContent.length} linkable items from database`, {
      destinations: dbDestinations.length,
      content: publishedContent.length,
      categories: categories.length,
    });

    return linkableContent;
  } catch (error) {
    (logger as any).error("Failed to load linkable content from database", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return dbLinksCache; // Return stale cache if available
  }
}

/**
 * Get all link targets (combined hardcoded + database)
 * Prefers database content but falls back to hardcoded if DB is empty
 */
export async function getAllLinkTargets(excludeId?: string): Promise<LinkableContent[]> {
  // Always include hardcoded fallback data
  const hardcodedTargets = [...DESTINATION_LINKS, ...CATEGORY_LINKS];

  // Try to load from database
  const dbTargets = await loadLinkableContentFromDB();

  // Combine, preferring DB data (by deduplicating on id)
  const seenIds = new Set<string>();
  const allTargets: LinkableContent[] = [];

  // Add DB targets first (they take precedence)
  for (const target of dbTargets) {
    if (!seenIds.has(target.id) && target.id !== excludeId) {
      seenIds.add(target.id);
      allTargets.push(target);
    }
  }

  // Add hardcoded targets that aren't already in DB
  for (const target of hardcodedTargets) {
    if (!seenIds.has(target.id) && target.id !== excludeId) {
      seenIds.add(target.id);
      allTargets.push(target);
    }
  }

  return allTargets;
}

/**
 * Clear the database links cache (useful after content updates)
 */
export function clearLinksCacheFromDB(): void {
  dbLinksCache = [];
  dbLinksCacheTime = 0;
  logger.info("Internal links database cache cleared");
}

// ============================================================================
// ASYNC VERSIONS (Database-backed)
// ============================================================================

/**
 * Phase 15C: Insert internal links using database-backed link targets
 * This is the preferred method for production use
 */
export async function insertInternalLinksAsync(
  content: string,
  options: {
    contentType: ContentType;
    currentDestination?: string;
    currentId?: string;
    minLinks?: number;
    maxLinks?: number;
  }
): Promise<LinkingResult> {
  const requirements = CONTENT_TYPE_REQUIREMENTS[options.contentType];
  const minLinks = options.minLinks || requirements.internalLinks.min;
  const maxLinks = options.maxLinks || requirements.internalLinks.max;

  const links: InternalLink[] = [];
  let processedContent = content;

  // Get all potential link targets from database + hardcoded fallback
  const allTargets = await getAllLinkTargets(options.currentId);

  // Find opportunities to add links
  const opportunities = findLinkOpportunities(content, allTargets);

  // Sort by relevance and select top links
  opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const selectedLinks = opportunities.slice(0, maxLinks);

  // Insert links into content (in reverse order to preserve positions)
  selectedLinks.sort((a, b) => (b.position || 0) - (a.position || 0));

  for (const link of selectedLinks) {
    if (links.length >= maxLinks) break;

    const result = insertLink(processedContent, link);
    if (result.inserted) {
      processedContent = result.content;
      links.push({
        url: link.url,
        anchorText: link.anchorText,
        relevanceScore: link.relevanceScore,
        targetId: link.targetId,
        targetType: link.targetType,
      });
    }
  }

  (logger as any).info(
    `[Async] Inserted ${links.length} internal links (target: ${minLinks}-${maxLinks})`,
    {
      totalTargets: allTargets.length,
    }
  );

  return {
    content: processedContent,
    linksAdded: links.length,
    links,
  };
}

/**
 * Phase 15C: Suggest internal links using database-backed link targets
 */
export async function suggestInternalLinksAsync(
  content: string,
  options: {
    currentDestination?: string;
    currentId?: string;
    maxSuggestions?: number;
  }
): Promise<InternalLink[]> {
  const allTargets = await getAllLinkTargets(options.currentId);

  const opportunities = findLinkOpportunities(content, allTargets);
  opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return opportunities.slice(0, options.maxSuggestions || 10).map(o => ({
    url: o.url,
    anchorText: o.anchorText,
    relevanceScore: o.relevanceScore,
    targetId: o.targetId,
    targetType: o.targetType,
  }));
}
