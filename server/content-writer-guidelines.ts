import { db } from "./db";
import { contents } from "@shared/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// INTERNAL LINKS - Get existing published content URLs for linking
// ============================================================================

let cachedInternalLinks: { title: string; slug: string; type: string; url: string }[] | null = null;
let internalLinksCacheTime = 0;
const INTERNAL_LINKS_CACHE_TTL = 300000; // 5 minutes

export const FALLBACK_INTERNAL_LINKS = [
  {
    title: "Top Attractions in Dubai",
    slug: "top-attractions-dubai",
    type: "article",
    url: "/attractions",
  },
  { title: "Best Hotels in Dubai", slug: "best-hotels-dubai", type: "article", url: "/hotels" },
  { title: "Dubai Dining Guide", slug: "dubai-dining-guide", type: "article", url: "/dining" },
  { title: "Dubai Districts", slug: "dubai-districts", type: "article", url: "/districts" },
  { title: "Dubai Events Calendar", slug: "dubai-events", type: "article", url: "/events" },
  { title: "Getting Around Dubai", slug: "dubai-transport", type: "article", url: "/transport" },
];

export const AUTHORITATIVE_EXTERNAL_LINKS = [
  {
    title: "Visit Dubai Official",
    url: "https://www.visitdubai.com",
    description: "Official Dubai Tourism Board",
  },
  {
    title: "Dubai Government Portal",
    url: "https://www.dubai.ae",
    description: "Official Government of Dubai",
  },
  {
    title: "Dubai Tourism Official",
    url: "https://www.dubaitourism.gov.ae",
    description: "Dubai Department of Economy and Tourism",
  },
  { title: "Dubai RTA", url: "https://www.rta.ae", description: "Roads and Transport Authority" },
  {
    title: "Dubai Municipality",
    url: "https://www.dm.gov.ae",
    description: "Dubai Municipality Official",
  },
  {
    title: "Emirates Airlines",
    url: "https://www.emirates.com",
    description: "UAE National Carrier",
  },
];

/**
 * Get list of published content URLs for internal linking
 * Returns URLs that the AI can use when generating content
 * Always returns at least fallback links if no published content exists
 */
export async function getInternalLinkUrls(
  excludeSlug?: string,
  limit = 30
): Promise<typeof cachedInternalLinks> {
  const now = Date.now();

  if (!cachedInternalLinks || now - internalLinksCacheTime >= INTERNAL_LINKS_CACHE_TTL) {
    try {
      const publishedContent = await db
        .select({
          title: contents.title,
          slug: contents.slug,
          type: contents.type,
        })
        .from(contents)
        .where(eq(contents.status, "published"))
        .limit(100);

      const links = publishedContent.map(c => {
        let url = "";
        switch (c.type) {
          case "attraction":
            url = `/attractions/${c.slug}`;
            break;
          case "hotel":
            url = `/hotels/${c.slug}`;
            break;
          case "article":
            url = `/articles/${c.slug}`;
            break;
          case "dining":
            url = `/dining/${c.slug}`;
            break;
          case "district":
            url = `/districts/${c.slug}`;
            break;
          case "transport":
            url = `/transport/${c.slug}`;
            break;
          case "event":
            url = `/events/${c.slug}`;
            break;
          case "itinerary":
            url = `/itineraries/${c.slug}`;
            break;
          default:
            url = `/${c.type}s/${c.slug}`;
        }
        return {
          title: c.title,
          slug: c.slug,
          type: c.type,
          url: url,
        };
      });

      cachedInternalLinks = links.length > 0 ? links : FALLBACK_INTERNAL_LINKS;
      internalLinksCacheTime = now;
    } catch (error) {
      cachedInternalLinks = FALLBACK_INTERNAL_LINKS;
    }
  }

  const filtered = excludeSlug
    ? (cachedInternalLinks || FALLBACK_INTERNAL_LINKS).filter(l => l.slug !== excludeSlug)
    : cachedInternalLinks || FALLBACK_INTERNAL_LINKS;

  return filtered.slice(0, limit);
}

export function clearInternalLinksCache() {
  cachedInternalLinks = null;
  internalLinksCacheTime = 0;
}

// ============================================================================
// LEGACY FUNCTIONS - Commented out for future redesign
// ============================================================================

/*
// TODO: Redesign content rules system
// These functions are disabled pending a simpler approach

import { contentRules, DEFAULT_CONTENT_RULES, keywordRepository } from "@shared/schema";
import { desc } from "drizzle-orm";

let cachedRules: typeof DEFAULT_CONTENT_RULES | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

export async function getActiveContentRules(): Promise<typeof DEFAULT_CONTENT_RULES> {
  const now = Date.now();
  if (cachedRules && now - cacheTime < CACHE_TTL) {
    return cachedRules;
  }
  try {
    const rules = await db.select().from(contentRules).where(eq(contentRules.isActive, true)).limit(1);
    if (rules.length > 0) {
      cachedRules = rules[0] as unknown as typeof DEFAULT_CONTENT_RULES;
      cacheTime = now;
      return cachedRules;
    }
  } catch (error) {
    
  }
  return DEFAULT_CONTENT_RULES;
}

export function clearRulesCache() {
  cachedRules = null;
  cacheTime = 0;
}

let cachedKeywords: { keyword: string; type: string; category: string | null; priority: number; relatedKeywords: string[] }[] | null = null;
let keywordCacheTime = 0;
const KEYWORD_CACHE_TTL = 300000;

export async function getActiveKeywords(category?: string, limit = 50): Promise<typeof cachedKeywords> {
  const now = Date.now();
  if (cachedKeywords && now - keywordCacheTime < KEYWORD_CACHE_TTL && !category) {
    return cachedKeywords;
  }
  try {
    let query = db
      .select({
        keyword: keywordRepository.keyword,
        type: keywordRepository.type,
        category: keywordRepository.category,
        priority: keywordRepository.priority,
        relatedKeywords: keywordRepository.relatedKeywords,
      })
      .from(keywordRepository)
      .where(eq(keywordRepository.isActive, true))
      .orderBy(desc(keywordRepository.priority))
      .limit(limit);
    const keywords = await query;
    const result = category
      ? keywords.filter(k => k.category?.toLowerCase() === category.toLowerCase())
      : keywords;
    if (!category) {
      cachedKeywords = result as typeof cachedKeywords;
      keywordCacheTime = now;
    }
    return result as typeof cachedKeywords;
  } catch (error) {
    
    return [];
  }
}

export async function getKeywordsForContentType(contentType: string): Promise<string[]> {
  const categoryMap: Record<string, string> = {
    attraction: "attractions",
    hotel: "hotels",
    article: "news",
    dining: "food",
    district: "districts",
    transport: "transport",
    event: "events",
    itinerary: "travel",
    landing_page: "seo",
    case_study: "real_estate",
    off_plan: "real_estate",
  };
  const category = categoryMap[contentType] || contentType;
  const keywords = await getActiveKeywords(category, 30);
  const allKeywords: string[] = [];
  keywords?.forEach(k => {
    allKeywords.push(k.keyword);
    if (k.relatedKeywords) {
      allKeywords.push(...k.relatedKeywords.slice(0, 3));
    }
  });
  return [...new Set(allKeywords)];
}

export function clearKeywordCache() {
  cachedKeywords = null;
  keywordCacheTime = 0;
}
*/

// ============================================================================
// STUB EXPORTS - These maintain backwards compatibility while validation is disabled
// ============================================================================

// Simple article response type (minimal structure)
export type ArticleResponse = {
  title: string;
  metaDescription: string;
  content: string;
  category?: string;
  targetAudience?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  quickFacts?: string[];
  proTips?: string[];
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  imageSearchTerms?: string[];
  urgencyLevel?: string;
  warnings?: string[];
};

// Stub personalities - uses simple writer approach
export const CONTENT_WRITER_PERSONALITIES: Record<string, { name: string; style: string }> = {
  A: { name: "Professional Guide", style: "informative and trustworthy" },
  B: { name: "Friendly Local", style: "casual and insider" },
  C: { name: "Luxury Expert", style: "sophisticated and detailed" },
  D: { name: "Budget Traveler", style: "practical and value-focused" },
};

// Default category to personality mapping
export const CATEGORY_PERSONALITY_MAPPING: Record<string, string> = {
  attractions: "A",
  hotels: "C",
  dining: "B",
  transport: "D",
  events: "B",
  districts: "A",
  news: "A",
  tips: "D",
};

// Simple article structures
export const ARTICLE_STRUCTURES: Record<string, string[]> = {
  guide: ["introduction", "main_points", "tips", "conclusion"],
  review: ["overview", "pros_cons", "details", "verdict"],
  news: ["summary", "details", "context", "outlook"],
  listicle: ["introduction", "items", "conclusion"],
};

// Stub validation function - always returns valid (validation disabled)
export async function validateArticleResponse(response: unknown): Promise<{
  isValid: boolean;
  data?: ArticleResponse;
  errors: string[];
  wordCount: number;
}> {
  // Validation disabled - just pass through the data
  const data = response as ArticleResponse;
  const wordCount = data?.content?.split(/\s+/).length || 0;
  return {
    isValid: true,
    data,
    errors: [],
    wordCount,
  };
}

// Stub retry prompt - minimal guidance
export async function buildRetryPrompt(errors: string[], wordCount: number): Promise<string> {
  return `Please retry generating the content. Previous attempt had issues: ${errors.join(", ")}. Current word count: ${wordCount}.`;
}

// Simple system prompt for content writing
export function getContentWriterSystemPrompt(personality: string = "A"): string {
  const writer = CONTENT_WRITER_PERSONALITIES[personality] || CONTENT_WRITER_PERSONALITIES.A;
  return `You are ${writer.name}, a travel content writer with a ${writer.style} writing style.
Write helpful, informative content about Dubai and travel topics.
Focus on accuracy and value for readers.`;
}

// Simple article generation prompt
export function buildArticleGenerationPrompt(
  topic: string,
  contentType: string = "article",
  category: string = "general"
): string {
  return `Write a comprehensive ${contentType} about: ${topic}

Category: ${category}

Requirements:
- Write engaging, helpful content
- Use clear headings and structure
- Include practical information
- Focus on the reader's needs

Return your response as JSON with these fields:
- title: A clear, descriptive title
- metaDescription: Brief summary (150-160 chars)
- content: Full HTML content with h2, h3, p tags
- category: The content category
- faqs: Array of {question, answer} objects
- quickFacts: Array of key facts
- proTips: Array of helpful tips`;
}

// Determine content category from topic
export function determineContentCategory(topic: string): string {
  const topicLower = topic.toLowerCase();
  if (topicLower.includes("hotel") || topicLower.includes("resort") || topicLower.includes("stay"))
    return "hotels";
  if (
    topicLower.includes("restaurant") ||
    topicLower.includes("food") ||
    topicLower.includes("dining")
  )
    return "dining";
  if (
    topicLower.includes("attraction") ||
    topicLower.includes("visit") ||
    topicLower.includes("see")
  )
    return "attractions";
  if (
    topicLower.includes("transport") ||
    topicLower.includes("metro") ||
    topicLower.includes("taxi")
  )
    return "transport";
  if (topicLower.includes("event") || topicLower.includes("festival")) return "events";
  if (
    topicLower.includes("district") ||
    topicLower.includes("area") ||
    topicLower.includes("neighborhood")
  )
    return "districts";
  return "general";
}
