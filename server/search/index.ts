/**
 * Main Search Engine
 * 
 * Orchestrates full-text, semantic, and hybrid search
 * Includes direct tiqets_attractions search for global coverage
 */

import { db } from "../db";
import { sql, ilike, or, desc } from "drizzle-orm";
import { searchIndex, tiqetsAttractions, destinations } from "@shared/schema";
import { semanticSearch } from "./semantic-search";
import { intentClassifier } from "./intent-classifier";
import { hybridRanker, type SearchResultItem } from "./hybrid-ranker";
import { queryProcessor } from "./query-processor";
import { cache } from "../cache";
import searchAnalytics from "../search-analytics";

// Export new modules for spell check and query expansion
export { spellChecker } from "./spell-checker";
export { synonymExpander } from "./synonyms";
export { queryRewriter } from "./query-rewriter";
export { queryProcessor } from "./query-processor";

export interface SearchQuery {
  q: string;
  limit?: number;
  page?: number;
  type?: string[];
  locale?: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  totalPages: number;
  query: {
    original: string;
    normalized: string;
    language: string;
    intent: string;
  };
  intent: {
    type: string;
    confidence: number;
    entities: any;
  };
  responseTimeMs: number;
}

export const searchEngine = {
  /**
   * Main search function - combines full-text, tiqets, destinations, and semantic search
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    // 1. Process query
    const processedQuery = queryProcessor.process(query.q, query.locale);

    // 2. Classify intent
    const intent = await intentClassifier.classify(query.q, query.locale);

    // 3. Run parallel searches (text + tiqets + destinations + semantic)
    const [textResults, tiqetsResults, destinationResults, semanticResults] = await Promise.all([
      this.fullTextSearch(processedQuery.normalized, query),
      this.searchTiqetsAttractions(processedQuery.normalized, query.limit || 20),
      this.searchDestinations(processedQuery.normalized, query.limit || 20),
      semanticSearch.search({
        query: query.q,
        limit: Math.min((query.limit || 20) * 2, 50),
        contentTypes: intent.suggestedFilters.contentTypes || query.type,
        locale: query.locale,
        threshold: 0.3,
      }).catch(err => {
        console.error('[Search] Semantic search failed:', err);
        return [];
      }),
    ]);

    // 4. Merge all text-based results (prioritize destinations, then tiqets, then search_index)
    const allTextResults = [
      ...destinationResults.map(r => ({ ...r, score: r.score + 100 })),
      ...tiqetsResults.map(r => ({ ...r, score: r.score + 50 })),
      ...textResults,
    ];

    // 5. Fuse and rank results
    const fusedResults = hybridRanker.fuseResults(
      allTextResults,
      semanticResults,
      query.q,
      intent
    );

    // 5. Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    const paginatedResults = fusedResults.slice(start, start + limit);

    // 6. Log search for analytics
    await this.logSearch(query, fusedResults.length, Date.now() - startTime);

    return {
      results: paginatedResults,
      total: fusedResults.length,
      page,
      totalPages: Math.ceil(fusedResults.length / limit),
      query: {
        original: query.q,
        normalized: processedQuery.normalized,
        language: processedQuery.language,
        intent: intent.primary,
      },
      intent: {
        type: intent.primary,
        confidence: intent.confidence,
        entities: intent.entities,
      },
      responseTimeMs: Date.now() - startTime,
    };
  },

  /**
   * Full-text search using PostgreSQL text search
   */
  async fullTextSearch(query: string, options: SearchQuery): Promise<SearchResultItem[]> {
    const { limit = 20, type, locale } = options;

    // Build full-text search query
    let sqlQuery = sql`
      SELECT 
        content_id,
        title,
        content_type,
        meta_description,
        url,
        image,
        ts_rank(to_tsvector('english', searchable_text), plainto_tsquery('english', ${query})) as rank
      FROM search_index
      WHERE to_tsvector('english', searchable_text) @@ plainto_tsquery('english', ${query})
    `;

    // Add filters
    if (type?.length) {
      sqlQuery = sql`${sqlQuery} AND content_type = ANY(${type})`;
    }

    if (locale) {
      sqlQuery = sql`${sqlQuery} AND locale = ${locale}`;
    }

    // Order and limit
    sqlQuery = sql`${sqlQuery} ORDER BY rank DESC LIMIT ${limit * 2}`;

    const results = await db.execute(sqlQuery);

    return (results.rows as any[]).map(r => ({
      contentId: r.content_id,
      title: r.title,
      type: r.content_type,
      snippet: r.meta_description || "",
      url: r.url,
      image: r.image,
      score: parseFloat(r.rank),
    }));
  },

  /**
   * Search Tiqets attractions directly (3400+ attractions across 16 cities)
   * Pure PostgreSQL ILIKE - no OpenAI dependency
   */
  async searchTiqetsAttractions(query: string, limit: number): Promise<SearchResultItem[]> {
    try {
      const searchPattern = `%${query}%`;
      
      const results = await db
        .select({
          id: tiqetsAttractions.id,
          title: tiqetsAttractions.title,
          seoSlug: tiqetsAttractions.seoSlug,
          cityName: tiqetsAttractions.cityName,
          metaDescription: tiqetsAttractions.metaDescription,
          description: tiqetsAttractions.description,
          tiqetsImages: tiqetsAttractions.tiqetsImages,
          tiqetsRating: tiqetsAttractions.tiqetsRating,
          tiqetsReviewCount: tiqetsAttractions.tiqetsReviewCount,
        })
        .from(tiqetsAttractions)
        .where(
          or(
            ilike(tiqetsAttractions.title, searchPattern),
            ilike(tiqetsAttractions.cityName, searchPattern),
            ilike(tiqetsAttractions.metaTitle, searchPattern),
            ilike(tiqetsAttractions.metaDescription, searchPattern),
            ilike(tiqetsAttractions.venueName, searchPattern),
            ilike(tiqetsAttractions.primaryCategory, searchPattern)
          )
        )
        .orderBy(desc(tiqetsAttractions.tiqetsReviewCount))
        .limit(limit);

      return results.map((r, idx) => {
        const images = r.tiqetsImages as Array<{ medium?: string; large?: string }> | null;
        const thumbnail = images?.[0]?.medium || images?.[0]?.large || null;
        const citySlug = r.cityName?.toLowerCase().replace(/\s+/g, '-') || 'attraction';
        
        return {
          contentId: r.id,
          title: r.title || 'Attraction',
          type: 'attraction',
          snippet: r.metaDescription || r.description?.substring(0, 160) || `Explore ${r.title} in ${r.cityName}`,
          url: `/attractions/${citySlug}/${r.seoSlug || r.id}`,
          image: thumbnail,
          score: 90 - idx,
        };
      });
    } catch (error) {
      console.error('[Search] Tiqets search failed:', error);
      return [];
    }
  },

  /**
   * Search destinations directly
   * Pure PostgreSQL ILIKE - no OpenAI dependency
   */
  async searchDestinations(query: string, limit: number): Promise<SearchResultItem[]> {
    try {
      const searchPattern = `%${query}%`;
      
      const results = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          slug: destinations.slug,
          country: destinations.country,
          summary: destinations.summary,
          cardImage: destinations.cardImage,
        })
        .from(destinations)
        .where(
          or(
            ilike(destinations.name, searchPattern),
            ilike(destinations.country, searchPattern),
            ilike(destinations.slug, searchPattern)
          )
        )
        .orderBy(desc(destinations.seoScore))
        .limit(limit);

      return results.map((r, idx) => {
        const slug = r.slug?.startsWith('/') ? r.slug : `/destinations/${r.slug}`;
        return {
          contentId: r.id.toString(),
          title: r.name || 'Destination',
          type: 'destination',
          snippet: r.summary || `Explore ${r.name}, ${r.country}`,
          url: slug,
          image: r.cardImage,
          score: 95 - idx,
        };
      });
    } catch (error) {
      console.error('[Search] Destinations search failed:', error);
      return [];
    }
  },

  /**
   * Log search for analytics
   */
  async logSearch(query: SearchQuery, resultsCount: number, responseTime: number): Promise<void> {
    try {
      await searchAnalytics.logSearch(
        query.q,
        resultsCount,
        query.locale || "en"
      );
    } catch (error) {
      console.error('[Search] Failed to log search:', error);
      // Don't fail the search if logging fails
    }
  },
};
