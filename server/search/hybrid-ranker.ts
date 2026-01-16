/**
 * Hybrid Ranker
 * 
 * Combines multiple ranking signals:
 * - BM25 (full-text relevance)
 * - Semantic similarity (vector)
 * - Popularity (views)
 * - Freshness (recency)
 * - Quality (content score)
 * - Intent match
 */

import type { Intent } from "./intent-classifier";

export interface RankingSignals {
  bm25Score: number;       // Full-text relevance (0-1)
  semanticScore: number;   // Vector similarity (0-1)
  popularityScore: number; // Normalized views (0-1)
  freshnessScore: number;  // How recent (0-1)
  qualityScore: number;    // Content quality (0-1)
  intentMatch: number;     // Intent alignment (0-1)
}

export interface SearchResultItem {
  contentId: string;
  title: string;
  type: string;
  snippet: string;
  url: string;
  image?: string;
  score: number;
  highlights?: { title?: string[]; content?: string[] };
  metadata?: Record<string, any>;
}

export interface RankerConfig {
  weights: {
    bm25: number;
    semantic: number;
    popularity: number;
    freshness: number;
    quality: number;
    intent: number;
  };
  boosts: {
    exactTitleMatch: number;
    partialTitleMatch: number;
    featuredContent: number;
    recentContent: number; // < 7 days
  };
}

const DEFAULT_CONFIG: RankerConfig = {
  weights: {
    bm25: 0.25,
    semantic: 0.35,
    popularity: 0.15,
    freshness: 0.10,
    quality: 0.10,
    intent: 0.05,
  },
  boosts: {
    exactTitleMatch: 2.0,
    partialTitleMatch: 1.3,
    featuredContent: 1.5,
    recentContent: 1.2,
  },
};

export const hybridRanker = {
  /**
   * Calculate final score from signals
   */
  calculateScore(signals: RankingSignals, config: RankerConfig = DEFAULT_CONFIG): number {
    const { weights } = config;
    
    return (
      (signals.bm25Score || 0) * weights.bm25 +
      (signals.semanticScore || 0) * weights.semantic +
      (signals.popularityScore || 0) * weights.popularity +
      (signals.freshnessScore || 0) * weights.freshness +
      (signals.qualityScore || 0) * weights.quality +
      (signals.intentMatch || 0) * weights.intent
    );
  },

  /**
   * Merge results from full-text and semantic search
   */
  fuseResults(
    textResults: SearchResultItem[],
    semanticResults: Array<{ contentId: string; title: string; type: string; similarity: number; snippet: string; url: string; image?: string }>,
    query: string,
    intent: Intent,
    config: RankerConfig = DEFAULT_CONFIG
  ): SearchResultItem[] {
    // Build combined result map
    const resultMap = new Map<string, {
      item: SearchResultItem;
      signals: Partial<RankingSignals>;
    }>();

    // Add text search results
    for (const result of textResults) {
      resultMap.set(result.contentId, {
        item: result,
        signals: {
          bm25Score: result.score,
          popularityScore: 0.5, // Default
          freshnessScore: 0.5,
          qualityScore: 0.5,
        },
      });
    }

    // Merge semantic results
    for (const semResult of semanticResults) {
      const existing = resultMap.get(semResult.contentId);
      if (existing) {
        existing.signals.semanticScore = semResult.similarity;
      } else {
        resultMap.set(semResult.contentId, {
          item: {
            contentId: semResult.contentId,
            title: semResult.title,
            type: semResult.type,
            snippet: semResult.snippet,
            url: semResult.url,
            image: semResult.image,
            score: 0,
          },
          signals: {
            bm25Score: 0,
            semanticScore: semResult.similarity,
            popularityScore: 0.5,
            freshnessScore: 0.5,
            qualityScore: 0.5,
          },
        });
      }
    }

    // Calculate final scores with boosts
    const normalizedQuery = query.toLowerCase().trim();
    
    const rankedResults = [...resultMap.values()].map(({ item, signals }) => {
      // Calculate intent match
      const intentMatch = this.calculateIntentMatch(item, intent);
      
      // Calculate base score
      let score = this.calculateScore(
        { ...signals, intentMatch } as RankingSignals,
        config
      );

      // Apply boosts
      const titleLower = item.title.toLowerCase();
      if (titleLower === normalizedQuery) {
        score *= config.boosts.exactTitleMatch;
      } else if (titleLower.includes(normalizedQuery) || normalizedQuery.includes(titleLower)) {
        score *= config.boosts.partialTitleMatch;
      }

      return {
        ...item,
        score,
      };
    });

    // Sort by final score
    return rankedResults.sort((a, b) => b.score - a.score);
  },

  /**
   * Calculate how well result matches detected intent
   */
  calculateIntentMatch(result: SearchResultItem, intent: Intent): number {
    let score = 0.5; // Base score

    // Content type matches intent
    if (intent.suggestedFilters.contentTypes?.includes(result.type)) {
      score += 0.3;
    }

    // Location in title/snippet matches extracted locations
    if (intent.entities.locations?.length) {
      const combined = (result.title + " " + result.snippet).toLowerCase();
      const locationMatch = intent.entities.locations.some(loc => 
        combined.includes(loc.toLowerCase())
      );
      if (locationMatch) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  },

  /**
   * Normalize a raw score to 0-1 range
   */
  normalize(value: number, min: number, max: number): number {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  },
};
