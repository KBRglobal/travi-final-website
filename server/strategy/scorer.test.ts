/**
 * Strategic Priority Engine - Scorer Tests
 */

import { describe, it, expect } from 'vitest';
import {
  computePriorityScore,
  computeContributionScores,
  determinePrimaryReason,
  determineSecondaryReasons,
} from './scorer';
import { PrioritySignal, PriorityReason } from './types';

describe('Strategy Scorer', () => {
  describe('computeContributionScores', () => {
    it('should calculate contribution scores based on weight', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'content_health',
          signalType: 'overall_health',
          value: 80,
          weight: 0.25,
          contributionScore: 0,
        },
        {
          source: 'revenue_intel',
          signalType: 'roi_score',
          value: 60,
          weight: 0.30,
          contributionScore: 0,
        },
      ];

      const scored = computeContributionScores(signals);

      expect(scored).toHaveLength(2);
      expect(scored[0].contributionScore).toBeGreaterThan(0);
      expect(scored[1].contributionScore).toBeGreaterThan(0);
    });

    it('should handle empty signals array', () => {
      const scored = computeContributionScores([]);
      expect(scored).toHaveLength(0);
    });

    it('should handle zero weights', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'content_health',
          signalType: 'test',
          value: 50,
          weight: 0,
          contributionScore: 0,
        },
      ];

      const scored = computeContributionScores(signals);
      expect(scored[0].contributionScore).toBe(0);
    });
  });

  describe('computePriorityScore', () => {
    it('should return neutral score for empty signals', () => {
      const score = computePriorityScore([]);
      expect(score).toBe(50);
    });

    it('should return high priority for low-scoring content', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'content_health',
          signalType: 'overall_health',
          value: 20, // Low health = high priority
          weight: 0.5,
          contributionScore: 0,
        },
        {
          source: 'revenue_intel',
          signalType: 'roi_score',
          value: 30,
          weight: 0.5,
          contributionScore: 0,
        },
      ];

      const score = computePriorityScore(signals);
      expect(score).toBeGreaterThan(60); // High priority
    });

    it('should return low priority for high-scoring content', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'content_health',
          signalType: 'overall_health',
          value: 90,
          weight: 0.5,
          contributionScore: 0,
        },
        {
          source: 'revenue_intel',
          signalType: 'roi_score',
          value: 85,
          weight: 0.5,
          contributionScore: 0,
        },
      ];

      const score = computePriorityScore(signals);
      expect(score).toBeLessThan(30); // Low priority
    });

    it('should be deterministic', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'link_graph',
          signalType: 'authority_score',
          value: 55,
          weight: 0.25,
          contributionScore: 0,
        },
      ];

      const score1 = computePriorityScore(signals);
      const score2 = computePriorityScore(signals);
      expect(score1).toBe(score2);
    });
  });

  describe('determinePrimaryReason', () => {
    it('should identify orphan content', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'link_graph',
          signalType: 'orphan_status',
          value: 0, // Is orphan
          weight: 0.3,
          contributionScore: 0,
        },
      ];

      const reason = determinePrimaryReason(signals);
      expect(reason).toBe('orphan_content');
    });

    it('should identify low health score', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'content_health',
          signalType: 'overall_health',
          value: 30,
          weight: 0.25,
          contributionScore: 0,
        },
      ];

      const reason = determinePrimaryReason(signals);
      expect(reason).toBe('low_health_score');
    });

    it('should identify conversion gap', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'revenue_intel',
          signalType: 'roi_score',
          value: 10,
          weight: 0.3,
          contributionScore: 0,
        },
      ];

      const reason = determinePrimaryReason(signals);
      expect(reason).toBe('conversion_gap');
    });

    it('should identify stale content', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'search_intel',
          signalType: 'recency',
          value: 10,
          weight: 0.1,
          contributionScore: 0,
        },
      ];

      const reason = determinePrimaryReason(signals);
      expect(reason).toBe('stale_content');
    });

    it('should default to stale_content for empty signals', () => {
      const reason = determinePrimaryReason([]);
      expect(reason).toBe('stale_content');
    });
  });

  describe('determineSecondaryReasons', () => {
    it('should identify multiple reasons', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'link_graph',
          signalType: 'orphan_status',
          value: 0,
          weight: 0.3,
          contributionScore: 0,
        },
        {
          source: 'content_health',
          signalType: 'overall_health',
          value: 30,
          weight: 0.25,
          contributionScore: 0,
        },
        {
          source: 'search_intel',
          signalType: 'recency',
          value: 20,
          weight: 0.1,
          contributionScore: 0,
        },
      ];

      const primary: PriorityReason = 'orphan_content';
      const secondary = determineSecondaryReasons(signals, primary);

      expect(secondary).not.toContain('orphan_content');
      expect(secondary.length).toBeLessThanOrEqual(3);
    });

    it('should exclude primary reason', () => {
      const signals: PrioritySignal[] = [
        {
          source: 'link_graph',
          signalType: 'orphan_status',
          value: 0,
          weight: 0.3,
          contributionScore: 0,
        },
      ];

      const primary: PriorityReason = 'orphan_content';
      const secondary = determineSecondaryReasons(signals, primary);

      expect(secondary).not.toContain('orphan_content');
    });
  });
});
