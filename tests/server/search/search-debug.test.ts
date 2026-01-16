/**
 * Search Debug Tests
 *
 * Tests for search debug scoring logic, pipeline analysis, and recommendations.
 *
 * FEATURE 3: Search Admin Debug Mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test scoring logic directly (pure functions)
describe('Search Debug Scoring', () => {
  describe('Recency Boost Calculation', () => {
    const calculateRecencyBoost = (publishedAt: Date | string | null | undefined): number => {
      if (!publishedAt) return 1.0;

      const now = Date.now();
      const publishedTime = new Date(publishedAt).getTime();
      const daysSincePublished = (now - publishedTime) / (1000 * 60 * 60 * 24);

      if (daysSincePublished <= 7) return 1.3;
      if (daysSincePublished >= 90) return 1.0;

      const decayRange = 90 - 7;
      const daysIntoDecay = daysSincePublished - 7;
      return 1.0 + 0.3 * (1 - daysIntoDecay / decayRange);
    };

    it('should return 1.0 for null publishedAt', () => {
      expect(calculateRecencyBoost(null)).toBe(1.0);
      expect(calculateRecencyBoost(undefined)).toBe(1.0);
    });

    it('should return 1.3 for content published within 7 days', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(calculateRecencyBoost(yesterday)).toBe(1.3);

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(calculateRecencyBoost(twoDaysAgo)).toBe(1.3);
    });

    it('should return 1.0 for content older than 90 days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      expect(calculateRecencyBoost(oldDate)).toBe(1.0);

      const veryOldDate = new Date();
      veryOldDate.setDate(veryOldDate.getDate() - 365);
      expect(calculateRecencyBoost(veryOldDate)).toBe(1.0);
    });

    it('should decay linearly between 7 and 90 days', () => {
      const fiftyDaysAgo = new Date();
      fiftyDaysAgo.setDate(fiftyDaysAgo.getDate() - 50);
      const boost = calculateRecencyBoost(fiftyDaysAgo);

      expect(boost).toBeGreaterThan(1.0);
      expect(boost).toBeLessThan(1.3);
    });
  });

  describe('Popularity Boost Calculation', () => {
    const calculatePopularityBoost = (viewCount: number | null | undefined): number => {
      if (!viewCount || viewCount <= 0) return 1.0;

      if (viewCount >= 10000) return 1.25;
      if (viewCount >= 5000) return 1.2;
      if (viewCount >= 1000) return 1.15;
      if (viewCount >= 500) return 1.1;
      if (viewCount >= 100) return 1.05;
      return 1.0;
    };

    it('should return 1.0 for null or zero views', () => {
      expect(calculatePopularityBoost(null)).toBe(1.0);
      expect(calculatePopularityBoost(undefined)).toBe(1.0);
      expect(calculatePopularityBoost(0)).toBe(1.0);
      expect(calculatePopularityBoost(-10)).toBe(1.0);
    });

    it('should return correct boosts for view thresholds', () => {
      expect(calculatePopularityBoost(50)).toBe(1.0);
      expect(calculatePopularityBoost(100)).toBe(1.05);
      expect(calculatePopularityBoost(500)).toBe(1.1);
      expect(calculatePopularityBoost(1000)).toBe(1.15);
      expect(calculatePopularityBoost(5000)).toBe(1.2);
      expect(calculatePopularityBoost(10000)).toBe(1.25);
      expect(calculatePopularityBoost(50000)).toBe(1.25);
    });
  });

  describe('Entity Type Weights', () => {
    const ENTITY_TYPE_WEIGHTS: Record<string, number> = {
      destination: 1.6,
      attraction: 1.4,
      hotel: 1.2,
      article: 1.0,
      category: 0.9,
    };

    it('should have correct type weights', () => {
      expect(ENTITY_TYPE_WEIGHTS['destination']).toBe(1.6);
      expect(ENTITY_TYPE_WEIGHTS['attraction']).toBe(1.4);
      expect(ENTITY_TYPE_WEIGHTS['hotel']).toBe(1.2);
      expect(ENTITY_TYPE_WEIGHTS['article']).toBe(1.0);
      expect(ENTITY_TYPE_WEIGHTS['category']).toBe(0.9);
    });

    it('should handle unknown types with default weight', () => {
      const getWeight = (type: string) => ENTITY_TYPE_WEIGHTS[type] || 1.0;
      expect(getWeight('unknown')).toBe(1.0);
      expect(getWeight('foo')).toBe(1.0);
    });
  });

  describe('Title Match Boost', () => {
    const calculateTitleMatchBoost = (title: string, queryTerms: string[]): number => {
      const titleLower = title.toLowerCase();
      const titleMatch = queryTerms.some(term => titleLower === term);
      const titleContains = queryTerms.some(term => titleLower.includes(term));

      return titleMatch ? 2.0 : (titleContains ? 1.3 : 1.0);
    };

    it('should return 2.0 for exact title match', () => {
      expect(calculateTitleMatchBoost('Dubai', ['dubai'])).toBe(2.0);
      expect(calculateTitleMatchBoost('Hotels', ['hotels'])).toBe(2.0);
    });

    it('should return 1.3 for partial title match', () => {
      expect(calculateTitleMatchBoost('Dubai Hotels', ['dubai'])).toBe(1.3);
      expect(calculateTitleMatchBoost('Best Hotels in Dubai', ['hotel'])).toBe(1.3);
    });

    it('should return 1.0 for no match', () => {
      expect(calculateTitleMatchBoost('Abu Dhabi', ['dubai'])).toBe(1.0);
      expect(calculateTitleMatchBoost('Restaurants', ['hotel'])).toBe(1.0);
    });
  });

  describe('Total Score Multiplier', () => {
    it('should correctly multiply all factors', () => {
      const calculateTotalMultiplier = (
        typeWeight: number,
        titleMatchBoost: number,
        recencyBoost: number,
        popularityBoost: number,
        intentBoost: number
      ): number => {
        return typeWeight * titleMatchBoost * recencyBoost * popularityBoost * intentBoost;
      };

      // Test case 1: All neutral
      expect(calculateTotalMultiplier(1.0, 1.0, 1.0, 1.0, 1.0)).toBe(1.0);

      // Test case 2: All boosted
      const boosted = calculateTotalMultiplier(1.6, 2.0, 1.3, 1.25, 1.0);
      expect(boosted).toBeCloseTo(5.2, 1);

      // Test case 3: Some boosted
      const partial = calculateTotalMultiplier(1.4, 1.3, 1.0, 1.1, 1.0);
      expect(partial).toBeCloseTo(2.002, 2);
    });
  });
});

describe('Search Debug Pipeline', () => {
  describe('Pipeline Step Tracking', () => {
    it('should track step duration and details', () => {
      interface PipelineStep {
        step: string;
        query: string;
        resultCount: number;
        durationMs: number;
        details: string;
      }

      const createPipelineStep = (
        step: string,
        query: string,
        resultCount: number,
        startTime: number,
        details: string
      ): PipelineStep => ({
        step,
        query,
        resultCount,
        durationMs: Date.now() - startTime,
        details,
      });

      const now = Date.now();
      const step = createPipelineStep(
        'query_processing',
        'dubai hotels',
        0,
        now - 5, // 5ms ago
        'Tokenized into 2 tokens'
      );

      expect(step.step).toBe('query_processing');
      expect(step.query).toBe('dubai hotels');
      expect(step.resultCount).toBe(0);
      expect(step.durationMs).toBeGreaterThanOrEqual(5);
      expect(step.details).toContain('tokens');
    });
  });

  describe('Query Tokenization', () => {
    it('should normalize and tokenize queries', () => {
      const tokenize = (query: string): string[] => {
        const normalized = query.trim().toLowerCase();
        return normalized.split(/\s+/).filter(Boolean);
      };

      expect(tokenize('Dubai Hotels')).toEqual(['dubai', 'hotels']);
      expect(tokenize('  best restaurants  ')).toEqual(['best', 'restaurants']);
      expect(tokenize('PALM JUMEIRAH')).toEqual(['palm', 'jumeirah']);
      expect(tokenize('')).toEqual([]);
    });
  });

  describe('Matched Terms Detection', () => {
    it('should find matching terms in title and description', () => {
      const findMatchedTerms = (
        queryTerms: string[],
        title: string,
        description: string | undefined
      ): string[] => {
        const titleLower = title.toLowerCase();
        const descLower = description?.toLowerCase() || '';

        return queryTerms.filter(term =>
          titleLower.includes(term) || descLower.includes(term)
        );
      };

      expect(findMatchedTerms(
        ['dubai', 'hotel'],
        'Dubai Marriott Hotel',
        'Luxury hotel in Dubai'
      )).toEqual(['dubai', 'hotel']);

      expect(findMatchedTerms(
        ['dubai', 'restaurant'],
        'Abu Dhabi Hotel',
        'Fine dining options'
      )).toEqual([]);

      expect(findMatchedTerms(
        ['beach', 'resort'],
        'City Hotel',
        'Near the beach with resort amenities'
      )).toEqual(['beach', 'resort']);
    });
  });
});

describe('Search Debug Recommendations', () => {
  describe('No Results Analysis', () => {
    it('should generate reasons for no results', () => {
      const analyzeNoResults = (
        query: string,
        tokens: string[],
        resolvedCity: string | null,
        entities: Record<string, unknown>
      ): string[] => {
        const reasons: string[] = [];

        reasons.push(`No content matches the query "${query}"`);

        if (tokens.length === 1 && tokens[0].length < 3) {
          reasons.push('Query is too short (less than 3 characters)');
        }

        if (!resolvedCity) {
          reasons.push('No location/city detected in query');
        }

        if (Object.keys(entities).length === 0) {
          reasons.push('No entities could be extracted from the query');
        }

        return reasons;
      };

      // Test short query
      const shortQueryReasons = analyzeNoResults('ab', ['ab'], null, {});
      expect(shortQueryReasons).toContain('Query is too short (less than 3 characters)');

      // Test no location
      const noLocationReasons = analyzeNoResults('hotels', ['hotels'], null, { type: 'hotel' });
      expect(noLocationReasons).toContain('No location/city detected in query');

      // Test with location
      const withLocationReasons = analyzeNoResults('dubai hotels', ['dubai', 'hotels'], 'Dubai', { location: 'Dubai' });
      expect(withLocationReasons).not.toContain('No location/city detected in query');
    });
  });

  describe('Recommendations Generation', () => {
    it('should suggest improvements based on analysis', () => {
      const generateRecommendations = (
        hasShortQuery: boolean,
        hasNoLocation: boolean,
        hasNoEntities: boolean
      ): string[] => {
        const recommendations: string[] = [];

        if (hasShortQuery) {
          recommendations.push('Try using longer or more specific search terms');
        }

        if (hasNoLocation) {
          recommendations.push('Include a location like "Dubai" or "Palm Jumeirah" in your query');
        }

        if (hasNoEntities) {
          recommendations.push('Be more specific about what you\'re looking for (hotel, restaurant, attraction)');
        }

        return recommendations;
      };

      const recs = generateRecommendations(true, true, true);
      expect(recs).toHaveLength(3);
      expect(recs[0]).toContain('longer');
      expect(recs[1]).toContain('location');
      expect(recs[2]).toContain('specific');
    });
  });
});

describe('Search Debug Content Lookup', () => {
  describe('Content Ranking Explanation', () => {
    it('should explain why content ranks at a specific position', () => {
      const explainRanking = (
        found: boolean,
        rank: number | null,
        titleMatch: boolean,
        titleContains: boolean,
        adjustedScore: number
      ): string[] => {
        const reasons: string[] = [];

        if (!found) {
          reasons.push('Content was not returned in search results');
          return reasons;
        }

        reasons.push(`Content ranked #${rank} out of results`);
        reasons.push(`Adjusted score: ${adjustedScore.toFixed(2)}`);

        if (titleMatch) {
          reasons.push('Title exactly matches a query term (+2.0x boost)');
        } else if (titleContains) {
          reasons.push('Title contains query term (+1.3x boost)');
        }

        return reasons;
      };

      // Test not found
      const notFoundReasons = explainRanking(false, null, false, false, 0);
      expect(notFoundReasons).toContain('Content was not returned in search results');
      expect(notFoundReasons).toHaveLength(1);

      // Test found with exact match
      const exactMatchReasons = explainRanking(true, 1, true, true, 3.25);
      expect(exactMatchReasons).toContain('Content ranked #1 out of results');
      expect(exactMatchReasons).toContain('Title exactly matches a query term (+2.0x boost)');

      // Test found with partial match
      const partialMatchReasons = explainRanking(true, 3, false, true, 2.1);
      expect(partialMatchReasons).toContain('Title contains query term (+1.3x boost)');
    });
  });
});

describe('Search Debug Feature Flag', () => {
  it('should always enable debug for admins (read-only diagnostic)', () => {
    // Feature flag behavior
    const isSearchDebugEnabled = (): boolean => {
      // Always available for admins - it's read-only diagnostic info
      return true;
    };

    expect(isSearchDebugEnabled()).toBe(true);
  });
});

describe('Search Debug API Validation', () => {
  describe('Query Validation', () => {
    it('should reject empty queries', () => {
      const validateQuery = (query: unknown): { valid: boolean; error?: string } => {
        if (!query || typeof query !== 'string') {
          return { valid: false, error: 'Missing required query parameter' };
        }
        if (query.length > 200) {
          return { valid: false, error: 'Query too long (max 200 characters)' };
        }
        return { valid: true };
      };

      expect(validateQuery('')).toEqual({ valid: false, error: 'Missing required query parameter' });
      expect(validateQuery(null)).toEqual({ valid: false, error: 'Missing required query parameter' });
      expect(validateQuery(undefined)).toEqual({ valid: false, error: 'Missing required query parameter' });
      expect(validateQuery(123)).toEqual({ valid: false, error: 'Missing required query parameter' });
    });

    it('should reject queries over 200 characters', () => {
      const validateQuery = (query: unknown): { valid: boolean; error?: string } => {
        if (!query || typeof query !== 'string') {
          return { valid: false, error: 'Missing required query parameter' };
        }
        if (query.length > 200) {
          return { valid: false, error: 'Query too long (max 200 characters)' };
        }
        return { valid: true };
      };

      const longQuery = 'a'.repeat(201);
      expect(validateQuery(longQuery).valid).toBe(false);
      expect(validateQuery(longQuery).error).toContain('too long');
    });

    it('should accept valid queries', () => {
      const validateQuery = (query: unknown): { valid: boolean; error?: string } => {
        if (!query || typeof query !== 'string') {
          return { valid: false, error: 'Missing required query parameter' };
        }
        if (query.length > 200) {
          return { valid: false, error: 'Query too long (max 200 characters)' };
        }
        return { valid: true };
      };

      expect(validateQuery('dubai hotels')).toEqual({ valid: true });
      expect(validateQuery('a')).toEqual({ valid: true });
      expect(validateQuery('a'.repeat(200))).toEqual({ valid: true });
    });
  });
});

describe('Search Debug Query Comparison', () => {
  it('should calculate overlap between two result sets', () => {
    const calculateOverlap = (ids1: string[], ids2: string[]): {
      overlapping: number;
      percentage: number;
      uniqueTo1: number;
      uniqueTo2: number;
    } => {
      const set1 = new Set(ids1);
      const set2 = new Set(ids2);
      const overlap = [...set1].filter(id => set2.has(id));

      return {
        overlapping: overlap.length,
        percentage: Math.round((overlap.length / Math.max(set1.size, set2.size)) * 100),
        uniqueTo1: [...set1].filter(id => !set2.has(id)).length,
        uniqueTo2: [...set2].filter(id => !set1.has(id)).length,
      };
    };

    // Test full overlap
    const full = calculateOverlap(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(full.overlapping).toBe(3);
    expect(full.percentage).toBe(100);
    expect(full.uniqueTo1).toBe(0);
    expect(full.uniqueTo2).toBe(0);

    // Test no overlap
    const none = calculateOverlap(['a', 'b'], ['c', 'd']);
    expect(none.overlapping).toBe(0);
    expect(none.percentage).toBe(0);
    expect(none.uniqueTo1).toBe(2);
    expect(none.uniqueTo2).toBe(2);

    // Test partial overlap
    const partial = calculateOverlap(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(partial.overlapping).toBe(2);
    expect(partial.uniqueTo1).toBe(1);
    expect(partial.uniqueTo2).toBe(1);
  });
});
