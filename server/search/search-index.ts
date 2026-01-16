/**
 * Central Search Index
 * 
 * Queries across destinations, hotels, articles/contents, and categories
 * Uses PostgreSQL ILIKE for simple, deterministic full-text search
 */

import { db } from "../db";
import { sql, or, ilike, eq, desc, and, isNull } from "drizzle-orm";
import { 
  destinations, 
  contents, 
  hotels, 
  articles,
  attractions,
  categoryPages,
} from "@shared/schema";

export interface SearchResult {
  type: "destination" | "attraction" | "hotel" | "article" | "category";
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  excerpt: string | null;
  score: number;
  publishedAt?: Date | null;
  viewCount?: number | null;
}

export interface SearchIndexQuery {
  query: string;
  limit?: number;
  types?: ("destination" | "attraction" | "hotel" | "article" | "category")[];
}

/**
 * Search across destinations table
 */
async function searchDestinations(query: string, limit: number): Promise<SearchResult[]> {
  const searchPattern = `%${query}%`;
  
  const results = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
      thumbnail: destinations.cardImage,
      excerpt: destinations.summary,
      country: destinations.country,
      updatedAt: destinations.updatedAt,
    })
    .from(destinations)
    .where(
      and(
        eq(destinations.isActive, true),
        or(
          ilike(destinations.name, searchPattern),
          ilike(destinations.country, searchPattern),
          ilike(destinations.summary, searchPattern),
          ilike(destinations.metaTitle, searchPattern),
          ilike(destinations.metaDescription, searchPattern)
        )
      )
    )
    .orderBy(desc(destinations.seoScore))
    .limit(limit);

  return results.map((r, idx) => ({
    type: "destination" as const,
    id: r.id,
    title: r.name,
    slug: r.slug,
    thumbnail: r.thumbnail,
    excerpt: r.excerpt || `Explore ${r.name}, ${r.country}`,
    score: 100 - idx,
    publishedAt: r.updatedAt,
    viewCount: null,
  }));
}

/**
 * Search across hotels (via contents + hotels tables)
 */
async function searchHotels(query: string, limit: number): Promise<SearchResult[]> {
  const searchPattern = `%${query}%`;
  
  const results = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      thumbnail: contents.cardImage,
      excerpt: contents.summary,
      metaDescription: contents.metaDescription,
      viewCount: contents.viewCount,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .innerJoin(hotels, eq(hotels.contentId, contents.id))
    .where(
      and(
        eq(contents.type, "hotel"),
        eq(contents.status, "published"),
        isNull(contents.deletedAt),
        or(
          ilike(contents.title, searchPattern),
          ilike(contents.summary, searchPattern),
          ilike(contents.metaTitle, searchPattern),
          ilike(contents.metaDescription, searchPattern),
          ilike(hotels.location, searchPattern)
        )
      )
    )
    .orderBy(desc(contents.viewCount))
    .limit(limit);

  return results.map((r, idx) => ({
    type: "hotel" as const,
    id: r.id,
    title: r.title,
    slug: r.slug,
    thumbnail: r.thumbnail,
    excerpt: r.excerpt || r.metaDescription,
    score: 90 - idx,
    viewCount: r.viewCount,
    publishedAt: r.publishedAt,
  }));
}

/**
 * Search across articles (via contents + articles tables)
 */
async function searchArticles(query: string, limit: number): Promise<SearchResult[]> {
  const searchPattern = `%${query}%`;
  
  const results = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      thumbnail: contents.cardImage,
      excerpt: contents.summary,
      metaDescription: contents.metaDescription,
      articleExcerpt: articles.excerpt,
      publishedAt: contents.publishedAt,
      viewCount: contents.viewCount,
    })
    .from(contents)
    .innerJoin(articles, eq(articles.contentId, contents.id))
    .where(
      and(
        eq(contents.type, "article"),
        eq(contents.status, "published"),
        isNull(contents.deletedAt),
        or(
          ilike(contents.title, searchPattern),
          ilike(contents.summary, searchPattern),
          ilike(contents.metaTitle, searchPattern),
          ilike(contents.metaDescription, searchPattern),
          ilike(articles.excerpt, searchPattern)
        )
      )
    )
    .orderBy(desc(contents.publishedAt))
    .limit(limit);

  return results.map((r, idx) => ({
    type: "article" as const,
    id: r.id,
    title: r.title,
    slug: r.slug,
    thumbnail: r.thumbnail,
    excerpt: r.excerpt || r.articleExcerpt || r.metaDescription,
    score: 85 - idx,
    publishedAt: r.publishedAt,
    viewCount: r.viewCount,
  }));
}

/**
 * Search across category pages
 */
async function searchCategories(query: string, limit: number): Promise<SearchResult[]> {
  const searchPattern = `%${query}%`;
  
  const results = await db
    .select({
      id: categoryPages.id,
      name: categoryPages.name,
      slug: categoryPages.slug,
      thumbnail: categoryPages.headerImage,
      metaDescription: categoryPages.metaDescription,
      destinationId: categoryPages.destinationId,
    })
    .from(categoryPages)
    .where(
      or(
        ilike(categoryPages.name, searchPattern),
        ilike(categoryPages.metaTitle, searchPattern),
        ilike(categoryPages.metaDescription, searchPattern)
      )
    )
    .limit(limit);

  return results.map((r, idx) => ({
    type: "category" as const,
    id: r.id,
    title: r.name,
    slug: r.slug,
    thumbnail: r.thumbnail,
    excerpt: r.metaDescription,
    score: 80 - idx,
    publishedAt: null,
    viewCount: null,
  }));
}

/**
 * Search across attractions (via contents + attractions tables)
 */
async function searchAttractions(query: string, limit: number): Promise<SearchResult[]> {
  const searchPattern = `%${query}%`;
  
  const results = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      thumbnail: contents.cardImage,
      excerpt: contents.summary,
      metaDescription: contents.metaDescription,
      viewCount: contents.viewCount,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .innerJoin(attractions, eq(attractions.contentId, contents.id))
    .where(
      and(
        eq(contents.type, "attraction"),
        eq(contents.status, "published"),
        isNull(contents.deletedAt),
        or(
          ilike(contents.title, searchPattern),
          ilike(contents.summary, searchPattern),
          ilike(contents.metaTitle, searchPattern),
          ilike(contents.metaDescription, searchPattern),
          ilike(attractions.location, searchPattern),
          ilike(attractions.category, searchPattern)
        )
      )
    )
    .orderBy(desc(contents.viewCount))
    .limit(limit);

  return results.map((r, idx) => ({
    type: "attraction" as const,
    id: r.id,
    title: r.title,
    slug: r.slug,
    thumbnail: r.thumbnail,
    excerpt: r.excerpt || r.metaDescription,
    score: 95 - idx,
    viewCount: r.viewCount,
    publishedAt: r.publishedAt,
  }));
}

/**
 * Central search function - queries all entity types in parallel
 */
export async function searchAll(options: SearchIndexQuery): Promise<SearchResult[]> {
  const { query, limit = 20, types } = options;
  
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const limitPerType = Math.ceil(limit / 5);

  const searchPromises: Promise<SearchResult[]>[] = [];

  if (!types || types.includes("destination")) {
    searchPromises.push(searchDestinations(normalizedQuery, limitPerType));
  }
  if (!types || types.includes("attraction")) {
    searchPromises.push(searchAttractions(normalizedQuery, limitPerType));
  }
  if (!types || types.includes("hotel")) {
    searchPromises.push(searchHotels(normalizedQuery, limitPerType));
  }
  if (!types || types.includes("article")) {
    searchPromises.push(searchArticles(normalizedQuery, limitPerType));
  }
  if (!types || types.includes("category")) {
    searchPromises.push(searchCategories(normalizedQuery, limitPerType));
  }

  const results = await Promise.all(searchPromises);
  
  // Flatten and sort by score
  return results
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get popular destinations for fallback
 */
export async function getPopularDestinations(limit: number = 6): Promise<SearchResult[]> {
  const results = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
      thumbnail: destinations.cardImage,
      excerpt: destinations.summary,
      country: destinations.country,
    })
    .from(destinations)
    .where(eq(destinations.isActive, true))
    .orderBy(desc(destinations.seoScore))
    .limit(limit);

  return results.map((r, idx) => ({
    type: "destination" as const,
    id: r.id,
    title: r.name,
    slug: r.slug,
    thumbnail: r.thumbnail,
    excerpt: r.excerpt || `Explore ${r.name}, ${r.country}`,
    score: 50 - idx,
  }));
}

/**
 * Get recent articles for fallback
 */
export async function getRecentArticles(limit: number = 4): Promise<SearchResult[]> {
  const results = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      thumbnail: contents.cardImage,
      excerpt: contents.summary,
      metaDescription: contents.metaDescription,
    })
    .from(contents)
    .where(
      and(
        eq(contents.type, "article"),
        eq(contents.status, "published"),
        isNull(contents.deletedAt)
      )
    )
    .orderBy(desc(contents.publishedAt))
    .limit(limit);

  return results.map((r, idx) => ({
    type: "article" as const,
    id: r.id,
    title: r.title,
    slug: r.slug,
    thumbnail: r.thumbnail,
    excerpt: r.excerpt || r.metaDescription,
    score: 40 - idx,
  }));
}

export const searchIndex = {
  searchAll,
  searchDestinations,
  searchAttractions,
  searchHotels,
  searchArticles,
  searchCategories,
  getPopularDestinations,
  getRecentArticles,
};
