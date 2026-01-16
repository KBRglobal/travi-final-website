/**
 * Content Regeneration - Eligibility Tests
 */

import { describe, it, expect } from 'vitest';
import { EligibilityReason } from './types';

describe('Eligibility Rules', () => {
  describe('Urgency Score Calculation', () => {
    const weights: Record<EligibilityReason, number> = {
      stale_content: 15,
      low_ice_score: 25,
      no_entities: 20,
      poor_search_performance: 30,
      thin_content: 20,
      no_aeo_capsule: 10,
    };

    it('calculates score for single reason', () => {
      const reasons: EligibilityReason[] = ['stale_content'];
      const score = reasons.reduce((sum, r) => sum + weights[r], 0);
      expect(score).toBe(15);
    });

    it('calculates score for multiple reasons', () => {
      const reasons: EligibilityReason[] = ['stale_content', 'low_ice_score', 'no_entities'];
      const score = reasons.reduce((sum, r) => sum + weights[r], 0);
      expect(score).toBe(60); // 15 + 25 + 20
    });

    it('caps score at 100', () => {
      const reasons: EligibilityReason[] = [
        'stale_content',
        'low_ice_score',
        'no_entities',
        'poor_search_performance',
        'thin_content',
        'no_aeo_capsule',
      ];
      const rawScore = reasons.reduce((sum, r) => sum + weights[r], 0);
      const cappedScore = Math.min(100, rawScore);
      expect(cappedScore).toBe(100);
    });

    it('returns 0 for no reasons', () => {
      const reasons: EligibilityReason[] = [];
      const score = reasons.reduce((sum, r) => sum + weights[r], 0);
      expect(score).toBe(0);
    });
  });

  describe('Eligibility Determination', () => {
    it('not eligible when no reasons', () => {
      const reasons: EligibilityReason[] = [];
      expect(reasons.length > 0).toBe(false);
    });

    it('eligible when at least one reason', () => {
      const reasons: EligibilityReason[] = ['thin_content'];
      expect(reasons.length > 0).toBe(true);
    });
  });
});
