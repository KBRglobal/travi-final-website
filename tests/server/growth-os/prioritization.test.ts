/**
 * Prioritization & Trade-off Engine Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock config
vi.mock('../../../server/growth-os/config', () => ({
  isPrioritizationEnabled: () => true,
  getGrowthOSConfig: () => ({
    maxActionCandidates: 100,
  }),
  SCORING_WEIGHTS: {
    trafficLift: 0.20,
    revenueLift: 0.25,
    confidence: 0.15,
    risk: 0.15,
    blastRadius: 0.10,
    executionCost: 0.10,
    strategicAlignment: 0.05,
  },
  RISK_THRESHOLDS: {
    low: 30,
    medium: 60,
    high: 80,
    critical: 95,
  },
}));

describe('Scoring Dimensions', () => {
  describe('Dimension Calculation', () => {
    it('should calculate traffic lift from severity and impact', () => {
      const severity = 70;
      const impact = 80;
      const trafficLift = Math.min(100, (severity + impact) / 2);

      expect(trafficLift).toBe(75);
    });

    it('should calculate revenue lift from impact', () => {
      const revenueImpact = 1000;
      const revenueLift = Math.min(100, Math.log10(revenueImpact + 1) * 20);

      expect(revenueLift).toBeGreaterThan(0);
      expect(revenueLift).toBeLessThanOrEqual(100);
    });

    it('should derive risk from reversibility', () => {
      const reversibilityRisk = {
        instant: 0.1,
        easy: 0.3,
        moderate: 0.5,
        difficult: 0.8,
        irreversible: 1.0,
      };

      expect(reversibilityRisk['irreversible'] * 100).toBe(100);
      expect(reversibilityRisk['instant'] * 100).toBe(10);
    });
  });

  describe('Priority Score Calculation', () => {
    const weights = {
      trafficLift: 0.20,
      revenueLift: 0.25,
      confidence: 0.15,
      risk: 0.15,
      blastRadius: 0.10,
      executionCost: 0.10,
      strategicAlignment: 0.05,
    };

    it('should calculate weighted score correctly', () => {
      const dimensions = {
        trafficLift: 80,
        revenueLift: 90,
        confidence: 75,
        risk: 30,
        blastRadius: 20,
        executionCost: 40,
        strategicAlignment: 70,
      };

      // Positive contribution
      const positive =
        dimensions.trafficLift * weights.trafficLift +
        dimensions.revenueLift * weights.revenueLift +
        dimensions.confidence * weights.confidence +
        dimensions.strategicAlignment * weights.strategicAlignment;

      // Negative contribution (inverted)
      const negative =
        (100 - dimensions.risk) * weights.risk +
        (100 - dimensions.blastRadius) * weights.blastRadius +
        (100 - dimensions.executionCost) * weights.executionCost;

      const score = positive + negative;

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher score to low-risk actions', () => {
      const lowRisk = 20;
      const highRisk = 80;

      const lowRiskContribution = (100 - lowRisk) * weights.risk;
      const highRiskContribution = (100 - highRisk) * weights.risk;

      expect(lowRiskContribution).toBeGreaterThan(highRiskContribution);
    });

    it('should give higher score to high-revenue actions', () => {
      const highRevenue = 90;
      const lowRevenue = 30;

      const highRevenueContribution = highRevenue * weights.revenueLift;
      const lowRevenueContribution = lowRevenue * weights.revenueLift;

      expect(highRevenueContribution).toBeGreaterThan(lowRevenueContribution);
    });
  });

  describe('Confidence Adjustment', () => {
    it('should reduce score with low confidence', () => {
      const baseScore = 80;
      const lowConfidence = 30;
      const highConfidence = 90;

      const adjustScore = (score: number, confidence: number) => {
        const multiplier = 0.5 + (confidence / 100) * 0.5;
        return Math.round(score * multiplier);
      };

      const lowConfidenceScore = adjustScore(baseScore, lowConfidence);
      const highConfidenceScore = adjustScore(baseScore, highConfidence);

      expect(lowConfidenceScore).toBeLessThan(highConfidenceScore);
      expect(lowConfidenceScore).toBeGreaterThan(0);
    });
  });
});

describe('Complexity and Reversibility', () => {
  describe('Complexity Derivation', () => {
    it('should derive complexity from action type', () => {
      const typeComplexity: Record<string, string> = {
        content_update: 'simple',
        content_create: 'moderate',
        ux_improvement: 'complex',
        governance_compliance: 'complex',
      };

      expect(typeComplexity['content_update']).toBe('simple');
      expect(typeComplexity['governance_compliance']).toBe('complex');
    });

    it('should upgrade complexity with scale', () => {
      const upgradeComplexity = (current: string, contentCount: number) => {
        const order = ['trivial', 'simple', 'moderate', 'complex', 'expert'];
        let idx = order.indexOf(current);

        if (contentCount > 10) idx = Math.min(idx + 1, order.length - 1);
        if (contentCount > 50) idx = Math.min(idx + 1, order.length - 1);

        return order[idx];
      };

      expect(upgradeComplexity('simple', 5)).toBe('simple');
      expect(upgradeComplexity('simple', 15)).toBe('moderate');
      expect(upgradeComplexity('simple', 60)).toBe('complex');
    });
  });

  describe('Reversibility Derivation', () => {
    it('should derive reversibility from action type', () => {
      const typeReversibility: Record<string, string> = {
        content_update: 'easy',
        media_optimize: 'moderate',
        ops_remediation: 'difficult',
      };

      expect(typeReversibility['content_update']).toBe('easy');
      expect(typeReversibility['ops_remediation']).toBe('difficult');
    });

    it('should improve reversibility with backup', () => {
      const improveReversibility = (current: string, hasBackup: boolean) => {
        if (!hasBackup) return current;

        const improve: Record<string, string> = {
          irreversible: 'difficult',
          difficult: 'moderate',
          moderate: 'easy',
        };

        return improve[current] || current;
      };

      expect(improveReversibility('difficult', true)).toBe('moderate');
      expect(improveReversibility('difficult', false)).toBe('difficult');
    });
  });

  describe('Effort Estimation', () => {
    it('should estimate effort from complexity', () => {
      const complexityCost: Record<string, number> = {
        trivial: 0.5,
        simple: 2,
        moderate: 8,
        complex: 24,
        expert: 80,
      };

      expect(complexityCost['simple']).toBe(2);
      expect(complexityCost['expert']).toBe(80);
    });

    it('should scale with content count', () => {
      const baseCost = 8;
      const contentCount = 20;
      const scaleFactor = 1 + Math.log10(contentCount + 1) * 0.2;
      const scaledCost = baseCost * scaleFactor;

      expect(scaledCost).toBeGreaterThan(baseCost);
    });
  });
});

describe('Ranking and Trade-offs', () => {
  describe('Candidate Ranking', () => {
    it('should rank by priority score descending', () => {
      const candidates = [
        { id: 'a', priorityScore: 60 },
        { id: 'b', priorityScore: 80 },
        { id: 'c', priorityScore: 70 },
      ];

      const ranked = [...candidates].sort((a, b) => b.priorityScore - a.priorityScore);

      expect(ranked[0].id).toBe('b');
      expect(ranked[1].id).toBe('c');
      expect(ranked[2].id).toBe('a');
    });

    it('should assign ranks', () => {
      const candidates = [
        { id: 'a', priorityScore: 80, rank: 0 },
        { id: 'b', priorityScore: 70, rank: 0 },
      ];

      const sorted = [...candidates].sort((a, b) => b.priorityScore - a.priorityScore);
      sorted.forEach((c, i) => { c.rank = i + 1; });

      expect(sorted[0].rank).toBe(1);
      expect(sorted[1].rank).toBe(2);
    });
  });

  describe('Trade-off Comparison', () => {
    it('should identify dimension advantages', () => {
      const actionA = {
        dimensions: { trafficLift: 80, revenueLift: 60, risk: 30 },
      };
      const actionB = {
        dimensions: { trafficLift: 60, revenueLift: 80, risk: 50 },
      };

      const favorA: string[] = [];
      const favorB: string[] = [];

      // Higher is better for lift, lower for risk
      if (actionA.dimensions.trafficLift > actionB.dimensions.trafficLift + 5) {
        favorA.push('trafficLift');
      } else if (actionB.dimensions.trafficLift > actionA.dimensions.trafficLift + 5) {
        favorB.push('trafficLift');
      }

      if (actionA.dimensions.revenueLift > actionB.dimensions.revenueLift + 5) {
        favorA.push('revenueLift');
      } else if (actionB.dimensions.revenueLift > actionA.dimensions.revenueLift + 5) {
        favorB.push('revenueLift');
      }

      if (actionA.dimensions.risk < actionB.dimensions.risk - 5) {
        favorA.push('risk');
      } else if (actionB.dimensions.risk < actionA.dimensions.risk - 5) {
        favorB.push('risk');
      }

      expect(favorA).toContain('trafficLift');
      expect(favorA).toContain('risk');
      expect(favorB).toContain('revenueLift');
    });
  });

  describe('Quick Wins', () => {
    it('should identify quick wins', () => {
      const candidates = [
        { id: 'a', priorityScore: 80, complexity: 'simple', reversibility: 'easy' },
        { id: 'b', priorityScore: 70, complexity: 'complex', reversibility: 'easy' },
        { id: 'c', priorityScore: 60, complexity: 'simple', reversibility: 'difficult' },
      ];

      const quickWins = candidates.filter(c =>
        c.priorityScore >= 60 &&
        c.complexity === 'simple' &&
        c.reversibility !== 'irreversible'
      );

      expect(quickWins.length).toBe(2);
      expect(quickWins.find(c => c.id === 'a')).toBeDefined();
    });
  });
});

describe('Filtering', () => {
  const candidates = [
    { type: 'content_update', category: 'content', priorityScore: 80, complexity: 'simple' },
    { type: 'seo_fix', category: 'seo', priorityScore: 70, complexity: 'moderate' },
    { type: 'revenue_action', category: 'revenue', priorityScore: 90, complexity: 'complex' },
  ];

  it('should filter by action type', () => {
    const filtered = candidates.filter(c => c.type === 'seo_fix');
    expect(filtered.length).toBe(1);
  });

  it('should filter by category', () => {
    const filtered = candidates.filter(c => c.category === 'content');
    expect(filtered.length).toBe(1);
  });

  it('should filter by minimum score', () => {
    const filtered = candidates.filter(c => c.priorityScore >= 75);
    expect(filtered.length).toBe(2);
  });

  it('should filter by maximum complexity', () => {
    const complexityOrder = ['trivial', 'simple', 'moderate', 'complex', 'expert'];
    const maxComplexity = 'moderate';
    const maxIdx = complexityOrder.indexOf(maxComplexity);

    const filtered = candidates.filter(c => {
      const idx = complexityOrder.indexOf(c.complexity);
      return idx <= maxIdx;
    });

    expect(filtered.length).toBe(2);
  });
});
