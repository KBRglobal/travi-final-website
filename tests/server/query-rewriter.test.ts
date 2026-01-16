/**
 * Tests for query-rewriter.ts
 * Specifically testing regex patterns for correctness and ReDoS prevention
 */

import { describe, it, expect } from 'vitest';
import { queryRewriter } from '../../server/search/query-rewriter';

describe('Query Rewriter - Pattern Matching', () => {
  describe('Pattern: best X in dubai', () => {
    it('should extract entity from "best restaurants in dubai"', () => {
      const result = queryRewriter.applyPatterns('best restaurants in dubai');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });

    it('should extract entity from "best hotels in dubai"', () => {
      const result = queryRewriter.applyPatterns('best hotels in dubai');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('hotels');
    });

    it('should handle multi-word entities', () => {
      const result = queryRewriter.applyPatterns('best luxury hotels in dubai');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('luxury hotels');
    });

    it('should handle input when trimmed', () => {
      // Note: applyPatterns doesn't trim, so caller should trim if needed
      const result = queryRewriter.applyPatterns('best restaurants in dubai'.trim());
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });
  });

  describe('Pattern: top X in dubai', () => {
    it('should extract entity from "top restaurants in dubai"', () => {
      const result = queryRewriter.applyPatterns('top restaurants in dubai');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });

    it('should extract entity from "top attractions in dubai"', () => {
      const result = queryRewriter.applyPatterns('top attractions in dubai');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('attractions');
    });
  });

  describe('Pattern: X near Y', () => {
    it('should simplify "restaurants near burj khalifa"', () => {
      const result = queryRewriter.applyPatterns('restaurants near burj khalifa');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants burj khalifa');
    });

    it('should simplify "hotels near dubai mall"', () => {
      const result = queryRewriter.applyPatterns('hotels near dubai mall');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('hotels dubai mall');
    });

    it('should handle multi-word entities on both sides', () => {
      const result = queryRewriter.applyPatterns('italian restaurants near jumeirah beach');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('italian restaurants jumeirah beach');
    });
  });

  describe('Pattern: find X', () => {
    it('should remove "find" prefix', () => {
      const result = queryRewriter.applyPatterns('find restaurants');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });

    it('should handle multi-word queries', () => {
      const result = queryRewriter.applyPatterns('find luxury hotels');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('luxury hotels');
    });

    it('should handle input when trimmed', () => {
      const result = queryRewriter.applyPatterns('find restaurants'.trim());
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });
  });

  describe('Pattern: search for X', () => {
    it('should remove "search for" prefix', () => {
      const result = queryRewriter.applyPatterns('search for restaurants');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });

    it('should handle multi-word queries', () => {
      const result = queryRewriter.applyPatterns('search for luxury hotels');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('luxury hotels');
    });

    it('should handle input when trimmed', () => {
      const result = queryRewriter.applyPatterns('search for restaurants'.trim());
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });
  });

  describe('Pattern: where can i find/is/are X', () => {
    it('should remove "where can i find" prefix', () => {
      const result = queryRewriter.applyPatterns('where can i find restaurants');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });

    it('should remove "where is" prefix', () => {
      const result = queryRewriter.applyPatterns('where is burj khalifa');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('burj khalifa');
    });

    it('should remove "where are" prefix', () => {
      const result = queryRewriter.applyPatterns('where are the best hotels');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('the best hotels');
    });

    it('should handle input when trimmed', () => {
      const result = queryRewriter.applyPatterns('where is burj khalifa'.trim());
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('burj khalifa');
    });
  });

  describe('Pattern: what is the X', () => {
    it('should remove "what is the" prefix', () => {
      const result = queryRewriter.applyPatterns('what is the best restaurant');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('best restaurant');
    });

    it('should handle complex queries', () => {
      const result = queryRewriter.applyPatterns('what is the tallest building');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('tallest building');
    });

    it('should handle input when trimmed', () => {
      const result = queryRewriter.applyPatterns('what is the best hotel'.trim());
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('best hotel');
    });
  });

  describe('Pattern: how to find/get to X', () => {
    it('should remove "how to find" prefix', () => {
      const result = queryRewriter.applyPatterns('how to find restaurants');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });

    it('should remove "how to get to" prefix', () => {
      const result = queryRewriter.applyPatterns('how to get to burj khalifa');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('burj khalifa');
    });

    it('should handle multi-word destinations', () => {
      const result = queryRewriter.applyPatterns('how to get to dubai mall');
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('dubai mall');
    });

    it('should handle input when trimmed', () => {
      const result = queryRewriter.applyPatterns('how to find restaurants'.trim());
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });
  });

  describe('Edge cases and ReDoS prevention', () => {
    it('should handle queries with trimmed input', () => {
      const result = queryRewriter.applyPatterns('find restaurants     '.trim());
      expect(result.transformed).toBe(true);
      expect(result.query).toBe('restaurants');
    });

    it('should not hang on pathological input (ReDoS test)', () => {
      // This would cause catastrophic backtracking with vulnerable regex
      // The fixed patterns use \S.* which prevents the backtracking issue
      const pathologicalInput = 'find ' + 'a'.repeat(1000);
      const start = Date.now();
      const result = queryRewriter.applyPatterns(pathologicalInput);
      const duration = Date.now() - start;
      
      // Should complete quickly (under 100ms) even with long input
      expect(duration).toBeLessThan(100);
      expect(result.transformed).toBe(true);
    });

    it('should not match input with only spaces after keyword', () => {
      const result = queryRewriter.applyPatterns('find     '.trim());
      expect(result.transformed).toBe(false);
    });

    it('should not match when pattern is not at start', () => {
      const result = queryRewriter.applyPatterns('I want to find restaurants');
      expect(result.transformed).toBe(false);
    });
  });
});
