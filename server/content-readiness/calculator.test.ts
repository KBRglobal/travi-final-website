/**
 * Content Readiness - Calculator Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  READINESS_THRESHOLDS,
  DIMENSION_WEIGHTS,
  getStatusFromScore,
  getOverallStatus,
} from './types';

describe('Content Readiness Types', () => {
  describe('getStatusFromScore', () => {
    it('returns excellent for scores >= 90', () => {
      expect(getStatusFromScore(90)).toBe('excellent');
      expect(getStatusFromScore(100)).toBe('excellent');
      expect(getStatusFromScore(95)).toBe('excellent');
    });

    it('returns good for scores >= 70 and < 90', () => {
      expect(getStatusFromScore(70)).toBe('good');
      expect(getStatusFromScore(89)).toBe('good');
      expect(getStatusFromScore(75)).toBe('good');
    });

    it('returns needs_work for scores >= 50 and < 70', () => {
      expect(getStatusFromScore(50)).toBe('needs_work');
      expect(getStatusFromScore(69)).toBe('needs_work');
      expect(getStatusFromScore(55)).toBe('needs_work');
    });

    it('returns poor for scores < 50', () => {
      expect(getStatusFromScore(0)).toBe('poor');
      expect(getStatusFromScore(49)).toBe('poor');
      expect(getStatusFromScore(25)).toBe('poor');
    });
  });

  describe('getOverallStatus', () => {
    it('returns ready for scores >= 80', () => {
      expect(getOverallStatus(80)).toBe('ready');
      expect(getOverallStatus(100)).toBe('ready');
      expect(getOverallStatus(95)).toBe('ready');
    });

    it('returns almost_ready for scores >= 60 and < 80', () => {
      expect(getOverallStatus(60)).toBe('almost_ready');
      expect(getOverallStatus(79)).toBe('almost_ready');
      expect(getOverallStatus(70)).toBe('almost_ready');
    });

    it('returns needs_work for scores >= 40 and < 60', () => {
      expect(getOverallStatus(40)).toBe('needs_work');
      expect(getOverallStatus(59)).toBe('needs_work');
      expect(getOverallStatus(50)).toBe('needs_work');
    });

    it('returns not_ready for scores < 40', () => {
      expect(getOverallStatus(0)).toBe('not_ready');
      expect(getOverallStatus(39)).toBe('not_ready');
      expect(getOverallStatus(20)).toBe('not_ready');
    });
  });

  describe('DIMENSION_WEIGHTS', () => {
    it('sums to 1.0', () => {
      const sum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    });

    it('has correct weights', () => {
      expect(DIMENSION_WEIGHTS.iceScore).toBe(0.25);
      expect(DIMENSION_WEIGHTS.entityCoverage).toBe(0.20);
      expect(DIMENSION_WEIGHTS.searchIndex).toBe(0.15);
      expect(DIMENSION_WEIGHTS.aeoScore).toBe(0.20);
      expect(DIMENSION_WEIGHTS.freshness).toBe(0.10);
      expect(DIMENSION_WEIGHTS.internalLinks).toBe(0.10);
    });
  });

  describe('READINESS_THRESHOLDS', () => {
    it('has correct thresholds', () => {
      expect(READINESS_THRESHOLDS.READY).toBe(80);
      expect(READINESS_THRESHOLDS.ALMOST_READY).toBe(60);
      expect(READINESS_THRESHOLDS.NEEDS_WORK).toBe(40);
      expect(READINESS_THRESHOLDS.EXCELLENT).toBe(90);
      expect(READINESS_THRESHOLDS.GOOD).toBe(70);
      expect(READINESS_THRESHOLDS.NEEDS_WORK_DIM).toBe(50);
    });
  });
});

describe('Readiness Score Calculation', () => {
  it('calculates weighted score correctly', () => {
    // Simulate a perfect score calculation
    const dimensions = {
      iceScore: 100,
      entityCoverage: 100,
      searchIndex: 100,
      aeoScore: 100,
      freshness: 100,
      internalLinks: 100,
    };

    const weightedScore =
      dimensions.iceScore * DIMENSION_WEIGHTS.iceScore +
      dimensions.entityCoverage * DIMENSION_WEIGHTS.entityCoverage +
      dimensions.searchIndex * DIMENSION_WEIGHTS.searchIndex +
      dimensions.aeoScore * DIMENSION_WEIGHTS.aeoScore +
      dimensions.freshness * DIMENSION_WEIGHTS.freshness +
      dimensions.internalLinks * DIMENSION_WEIGHTS.internalLinks;

    expect(weightedScore).toBe(100);
  });

  it('calculates partial score correctly', () => {
    // Simulate mixed scores
    const dimensions = {
      iceScore: 80,      // 0.25 weight
      entityCoverage: 60, // 0.20 weight
      searchIndex: 100,   // 0.15 weight
      aeoScore: 40,       // 0.20 weight
      freshness: 100,     // 0.10 weight
      internalLinks: 50,  // 0.10 weight
    };

    const weightedScore =
      dimensions.iceScore * DIMENSION_WEIGHTS.iceScore +
      dimensions.entityCoverage * DIMENSION_WEIGHTS.entityCoverage +
      dimensions.searchIndex * DIMENSION_WEIGHTS.searchIndex +
      dimensions.aeoScore * DIMENSION_WEIGHTS.aeoScore +
      dimensions.freshness * DIMENSION_WEIGHTS.freshness +
      dimensions.internalLinks * DIMENSION_WEIGHTS.internalLinks;

    // 80*0.25 + 60*0.20 + 100*0.15 + 40*0.20 + 100*0.10 + 50*0.10
    // = 20 + 12 + 15 + 8 + 10 + 5 = 70
    expect(weightedScore).toBe(70);
    expect(getOverallStatus(weightedScore)).toBe('almost_ready');
  });

  it('calculates zero score correctly', () => {
    const dimensions = {
      iceScore: 0,
      entityCoverage: 0,
      searchIndex: 0,
      aeoScore: 0,
      freshness: 0,
      internalLinks: 0,
    };

    const weightedScore =
      dimensions.iceScore * DIMENSION_WEIGHTS.iceScore +
      dimensions.entityCoverage * DIMENSION_WEIGHTS.entityCoverage +
      dimensions.searchIndex * DIMENSION_WEIGHTS.searchIndex +
      dimensions.aeoScore * DIMENSION_WEIGHTS.aeoScore +
      dimensions.freshness * DIMENSION_WEIGHTS.freshness +
      dimensions.internalLinks * DIMENSION_WEIGHTS.internalLinks;

    expect(weightedScore).toBe(0);
    expect(getOverallStatus(weightedScore)).toBe('not_ready');
  });
});
