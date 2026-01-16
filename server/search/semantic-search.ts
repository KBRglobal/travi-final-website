/**
 * Semantic Search Engine
 * 
 * Vector similarity search using pgvector
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { embeddings } from "./embeddings";
import { cache } from "../cache";

export interface SemanticSearchOptions {
  query: string;
  limit?: number;
  threshold?: number; // Minimum similarity (0-1)
  contentTypes?: string[];
  locale?: string;
}

export interface SemanticResult {
  contentId: string;
  title: string;
  type: string;
  similarity: number;
  snippet: string;
  url: string;
  image?: string;
}

export const semanticSearch = {
  /**
   * Generate proper URL for content type
   */
  getContentUrl(type: string, contentId: string): string {
    const urlMap: Record<string, string> = {
      'attraction': '/attractions/',
      'hotel': '/hotels/',
      'article': '/articles/',
      'dining': '/dining/',
      'district': '/districts/',
      'transport': '/transport/',
      'event': '/events/',
      'itinerary': '/itineraries/',
      'landing_page': '/landing-pages/',
      'case_study': '/case-studies/',
      'off_plan': '/off-plan/',
    };
    
    return (urlMap[type] || `/${type}s/`) + contentId;
  },

  /**
   * Search by semantic similarity
   */
  async search(options: SemanticSearchOptions): Promise<SemanticResult[]> {
    const { query, limit = 20, threshold = 0.3, contentTypes, locale } = options;

    // Check cache first
    const cacheKey = `semantic:${query}:${limit}:${contentTypes?.join(",")}:${locale}`;
    const cached = await cache.get<SemanticResult[]>(cacheKey);
    if (cached) return cached;

    // Generate query embedding
    const queryEmbedding = await embeddings.generate(query);
    const vectorString = `[${queryEmbedding.vector.join(",")}]`;

    // Vector similarity search using pgvector
    // Cosine similarity: 1 - (vector <=> query_vector)
    let sqlQuery = sql`
      SELECT 
        si.content_id,
        si.title,
        si.content_type,
        si.meta_description,
        si.url,
        si.image,
        1 - (si.embedding::vector <=> ${vectorString}::vector) as similarity
      FROM search_index si
      WHERE si.embedding IS NOT NULL
    `;

    // Add content type filter
    if (contentTypes?.length) {
      sqlQuery = sql`${sqlQuery} AND si.content_type = ANY(${contentTypes})`;
    }

    // Add locale filter
    if (locale) {
      sqlQuery = sql`${sqlQuery} AND si.locale = ${locale}`;
    }

    // Add similarity threshold and ordering
    sqlQuery = sql`
      ${sqlQuery}
      AND 1 - (si.embedding::vector <=> ${vectorString}::vector) >= ${threshold}
      ORDER BY si.embedding::vector <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

    const results = await db.execute(sqlQuery);

    const semanticResults: SemanticResult[] = (results.rows as any[]).map(r => ({
      contentId: r.content_id,
      title: r.title,
      type: r.content_type,
      similarity: parseFloat(r.similarity),
      snippet: r.meta_description || "",
      url: this.getContentUrl(r.content_type, r.content_id),
      image: r.image,
    }));

    // Cache for 5 minutes
    await cache.set(cacheKey, semanticResults, 300);

    return semanticResults;
  },

  /**
   * Find similar content to a given content ID
   */
  async findSimilar(contentId: string, limit: number = 5): Promise<SemanticResult[]> {
    const cacheKey = `similar:${contentId}:${limit}`;
    const cached = await cache.get<SemanticResult[]>(cacheKey);
    if (cached) return cached;

    const results = await db.execute(sql`
      WITH source AS (
        SELECT embedding FROM search_index WHERE content_id = ${contentId}
      )
      SELECT 
        si.content_id,
        si.title,
        si.content_type,
        si.meta_description,
        si.url,
        si.image,
        1 - (si.embedding::vector <=> source.embedding::vector) as similarity
      FROM search_index si, source
      WHERE si.content_id != ${contentId}
        AND si.embedding IS NOT NULL
      ORDER BY si.embedding::vector <=> source.embedding::vector
      LIMIT ${limit}
    `);

    const similarResults: SemanticResult[] = (results.rows as any[]).map(r => ({
      contentId: r.content_id,
      title: r.title,
      type: r.content_type,
      similarity: parseFloat(r.similarity),
      snippet: r.meta_description || "",
      url: this.getContentUrl(r.content_type, r.content_id),
      image: r.image,
    }));

    await cache.set(cacheKey, similarResults, 3600); // Cache 1 hour
    return similarResults;
  },
};
