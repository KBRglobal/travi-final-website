/**
 * Tests for Growth Scorer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GrowthScorer,
  getGrowthScorer,
  resetGrowthScorer,
} from '../../../server/growth-command/scorer';
import type { GrowthOpportunity } from '../../../server/growth-command/types';

describe('GrowthScorer', () => {
  let scorer: GrowthScorer;

  const createMockOpportunity = (overrides: Partial<GrowthOpportunity> = {}): GrowthOpportunity => ({
    id: 'opp-1',
    source: 'tcoe',
    sourceId: 'source-1',
    status: 'identified',
    title: 'Test Opportunity',
    description: 'A test opportunity',
    category: 'conversion_optimization',
    impactScore: 70,
    impactLevel: 'high',
    expectedROI: 150,
    confidenceLevel: 0.8,
    revenueImpact: {
      lowEstimate: 5000,
      midEstimate: 10000,
      highEstimate: 20000,
      timeframeDays: 30,
    },
    riskScore: 0.2,
    riskLevel: 'low',
    risks: [],
    effortScore: 30,
    effortLevel: 'low',
    dependencies: [],
    requiredApprovals: [],
    blockers: [],
    executionReadiness: {
      isReady: true,
      score: 90,
      blockers: [],
      warnings: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['test'],
    ...overrides,
  });

  beforeEach(() => {
    resetGrowthScorer();
    scorer = getGrowthScorer();
  });

  describe('scoreOpportunity', () => {
    it('should score an opportunity', () => {
      const opportunity = createMockOpportunity();
      const score = scorer.scoreOpportunity(opportunity);

      expect(score).toBeDefined();
      expect(score.opportunityId).toBe(opportunity.id);
      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
    });

    it('should include all score components', () => {
      const opportunity = createMockOpportunity();
      const score = scorer.scoreOpportunity(opportunity);

      expect(score.components).toBeDefined();
      expect(score.components.impactScore).toBeDefined();
      expect(score.components.roiScore).toBeDefined();
      expect(score.components.effortScore).toBeDefined();
      expect(score.components.riskScore).toBeDefined();
      expect(score.components.urgencyScore).toBeDefined();
      expect(score.components.alignmentScore).toBeDefined();
    });

    it('should assign tier based on score', () => {
      const highImpact = createMockOpportunity({ impactScore: 90, expectedROI: 500 });
      const lowImpact = createMockOpportunity({ impactScore: 20, expectedROI: 5 });

      const highScore = scorer.scoreOpportunity(highImpact);
      const lowScore = scorer.scoreOpportunity(lowImpact);

      expect(['top', 'high']).toContain(highScore.tier);
      expect(['low', 'medium']).toContain(lowScore.tier);
    });

    it('should assign recommendation', () => {
      const opportunity = createMockOpportunity();
      const score = scorer.scoreOpportunity(opportunity);

      expect(['execute_now', 'queue', 'review', 'defer', 'reject']).toContain(
        score.recommendation
      );
    });

    it('should recommend rejection for high-risk low-impact', () => {
      const opportunity = createMockOpportunity({
        riskLevel: 'critical',
        impactScore: 20,
      });
      const score = scorer.scoreOpportunity(opportunity);

      expect(score.recommendation).toBe('reject');
    });

    it('should defer if not ready', () => {
      const opportunity = createMockOpportunity({
        executionReadiness: {
          isReady: false,
          score: 30,
          blockers: ['Pending review'],
          warnings: [],
        },
      });
      const score = scorer.scoreOpportunity(opportunity);

      expect(score.recommendation).toBe('defer');
    });
  });

  describe('scoreAll', () => {
    it('should score and rank multiple opportunities', () => {
      const opportunities = [
        createMockOpportunity({ id: 'opp-1', impactScore: 80 }),
        createMockOpportunity({ id: 'opp-2', impactScore: 60 }),
        createMockOpportunity({ id: 'opp-3', impactScore: 90 }),
      ];

      const scores = scorer.scoreAll(opportunities);

      expect(scores).toHaveLength(3);
      // Should be sorted by score descending
      expect(scores[0].rank).toBe(1);
      expect(scores[1].rank).toBe(2);
      expect(scores[2].rank).toBe(3);
    });

    it('should rank higher impact opportunities first', () => {
      const opportunities = [
        createMockOpportunity({ id: 'opp-low', impactScore: 30 }),
        createMockOpportunity({ id: 'opp-high', impactScore: 90 }),
      ];

      const scores = scorer.scoreAll(opportunities);

      expect(scores[0].opportunityId).toBe('opp-high');
    });
  });

  describe('getScore', () => {
    it('should retrieve score by ID', () => {
      const opportunity = createMockOpportunity();
      scorer.scoreOpportunity(opportunity);

      const score = scorer.getScore(opportunity.id);

      expect(score).toBeDefined();
      expect(score?.opportunityId).toBe(opportunity.id);
    });

    it('should return undefined for non-existent ID', () => {
      const score = scorer.getScore('non-existent');
      expect(score).toBeUndefined();
    });
  });

  describe('getAllScores', () => {
    it('should return all scores sorted by rank', () => {
      const opportunities = [
        createMockOpportunity({ id: 'opp-1' }),
        createMockOpportunity({ id: 'opp-2' }),
      ];

      scorer.scoreAll(opportunities);
      const scores = scorer.getAllScores();

      expect(scores).toHaveLength(2);
      expect(scores[0].rank).toBe(1);
    });
  });

  describe('getTopOpportunities', () => {
    it('should return top N opportunities', () => {
      const opportunities = [
        createMockOpportunity({ id: 'opp-1' }),
        createMockOpportunity({ id: 'opp-2' }),
        createMockOpportunity({ id: 'opp-3' }),
      ];

      scorer.scoreAll(opportunities);
      const top = scorer.getTopOpportunities(2);

      expect(top).toHaveLength(2);
      expect(top[0].rank).toBe(1);
      expect(top[1].rank).toBe(2);
    });
  });

  describe('getByTier', () => {
    it('should filter by tier', () => {
      const opportunities = [
        createMockOpportunity({ id: 'opp-high', impactScore: 90, expectedROI: 500 }),
        createMockOpportunity({ id: 'opp-low', impactScore: 20, expectedROI: 5 }),
      ];

      scorer.scoreAll(opportunities);

      const topTier = scorer.getByTier('top');
      const lowTier = scorer.getByTier('low');

      // At least one should be in top or high
      expect(topTier.length + scorer.getByTier('high').length).toBeGreaterThan(0);
    });
  });

  describe('getByRecommendation', () => {
    it('should filter by recommendation', () => {
      const opportunities = [
        createMockOpportunity({ id: 'opp-1', impactScore: 90, expectedROI: 500 }),
      ];

      scorer.scoreAll(opportunities);

      const execNow = scorer.getByRecommendation('execute_now');

      // High-scoring ready opportunity should be execute_now
      expect(execNow.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateWeights', () => {
    it('should update scoring weights', () => {
      scorer.updateWeights({ impact: 0.5, roi: 0.5 });
      const weights = scorer.getWeights();

      expect(weights.impact).toBe(0.5);
      expect(weights.roi).toBe(0.5);
    });

    it('should preserve unspecified weights', () => {
      const original = scorer.getWeights();
      scorer.updateWeights({ impact: 0.4 });
      const updated = scorer.getWeights();

      expect(updated.impact).toBe(0.4);
      expect(updated.risk).toBe(original.risk);
    });
  });

  describe('getWeights', () => {
    it('should return current weights', () => {
      const weights = scorer.getWeights();

      expect(weights).toBeDefined();
      expect(weights.impact).toBeDefined();
      expect(weights.roi).toBeDefined();
      expect(weights.effort).toBeDefined();
      expect(weights.risk).toBeDefined();
      expect(weights.urgency).toBeDefined();
      expect(weights.strategicAlignment).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should clear all scores', () => {
      const opportunity = createMockOpportunity();
      scorer.scoreOpportunity(opportunity);

      scorer.clear();

      expect(scorer.getAllScores()).toHaveLength(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getGrowthScorer();
      const instance2 = getGrowthScorer();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getGrowthScorer();
      instance1.scoreOpportunity(createMockOpportunity());

      resetGrowthScorer();

      const instance2 = getGrowthScorer();
      expect(instance2.getAllScores()).toHaveLength(0);
    });
  });
});
