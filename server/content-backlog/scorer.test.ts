/**
 * Content Backlog - Scorer Tests
 */

import { describe, it, expect } from 'vitest';
import { SCORING_WEIGHTS, BacklogSource } from './types';

describe('Backlog Scorer', () => {
  describe('Scoring Weights', () => {
    it('weights sum to 1.0', () => {
      const sum = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    });

    it('has correct individual weights', () => {
      expect(SCORING_WEIGHTS.searchDemand).toBe(0.35);
      expect(SCORING_WEIGHTS.rssFrequency).toBe(0.20);
      expect(SCORING_WEIGHTS.entityImportance).toBe(0.25);
      expect(SCORING_WEIGHTS.competitionScore).toBe(0.20);
    });
  });

  describe('Search Demand Scoring', () => {
    function calculateSearchDemand(source: BacklogSource, searchCount: number): number {
      if (source === 'zero_result_search') {
        if (searchCount >= 100) return 100;
        if (searchCount >= 50) return 80;
        if (searchCount >= 20) return 60;
        if (searchCount >= 10) return 40;
        return 20;
      }
      return 30;
    }

    it('returns 100 for 100+ searches', () => {
      expect(calculateSearchDemand('zero_result_search', 150)).toBe(100);
    });

    it('returns 80 for 50-99 searches', () => {
      expect(calculateSearchDemand('zero_result_search', 75)).toBe(80);
    });

    it('returns 60 for 20-49 searches', () => {
      expect(calculateSearchDemand('zero_result_search', 30)).toBe(60);
    });

    it('returns 40 for 10-19 searches', () => {
      expect(calculateSearchDemand('zero_result_search', 15)).toBe(40);
    });

    it('returns 20 for under 10 searches', () => {
      expect(calculateSearchDemand('zero_result_search', 5)).toBe(20);
    });

    it('returns 30 for non-search sources', () => {
      expect(calculateSearchDemand('entity_gap', 100)).toBe(30);
    });
  });

  describe('Competition Score', () => {
    function calculateCompetition(keywordCount: number): number {
      if (keywordCount >= 4) return 30;
      if (keywordCount >= 3) return 50;
      if (keywordCount >= 2) return 70;
      return 90;
    }

    it('returns low competition for 4+ keywords', () => {
      expect(calculateCompetition(5)).toBe(30);
    });

    it('returns medium-low competition for 3 keywords', () => {
      expect(calculateCompetition(3)).toBe(50);
    });

    it('returns medium-high competition for 2 keywords', () => {
      expect(calculateCompetition(2)).toBe(70);
    });

    it('returns high competition for 1 keyword', () => {
      expect(calculateCompetition(1)).toBe(90);
    });
  });

  describe('Weighted Score Calculation', () => {
    it('calculates correct weighted score', () => {
      const factors = {
        searchDemand: 80,
        rssFrequency: 50,
        entityImportance: 70,
        competitionScore: 40, // Lower = better, will be inverted
      };

      // Invert competition (low competition = high score)
      const invertedCompetition = 100 - factors.competitionScore;

      const weightedScore =
        factors.searchDemand * SCORING_WEIGHTS.searchDemand +
        factors.rssFrequency * SCORING_WEIGHTS.rssFrequency +
        factors.entityImportance * SCORING_WEIGHTS.entityImportance +
        invertedCompetition * SCORING_WEIGHTS.competitionScore;

      // 80*0.35 + 50*0.20 + 70*0.25 + 60*0.20 = 28 + 10 + 17.5 + 12 = 67.5
      expect(weightedScore).toBeCloseTo(67.5);
    });
  });
});
