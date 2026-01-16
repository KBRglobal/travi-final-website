/**
 * Cost & Usage Guardrails Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCostGuards,
  resetCostGuards,
  CostGuards,
  checkFeatureCost,
  recordFeatureUsage,
} from '../../../server/ops/cost-guards';
import { setOpsConfigForTest, resetOpsConfig } from '../../../server/ops/config';
import type { Feature } from '../../../server/ops/types';

describe('CostGuards', () => {
  let guards: CostGuards;

  beforeEach(() => {
    resetCostGuards();
    resetOpsConfig();
    setOpsConfigForTest({
      costGuardsEnabled: true,
      cost: {
        defaultDailyLimitUsd: 50,
        defaultMonthlyLimitUsd: 500,
        warningThresholdPercent: 80,
        hardCeilingPercent: 100,
      },
    });
    guards = getCostGuards();
  });

  afterEach(() => {
    guards.stop();
    resetCostGuards();
    resetOpsConfig();
  });

  describe('checkCost', () => {
    it('should allow requests when under budget', () => {
      const result = guards.checkCost('search', 1);

      expect(result.allowed).toBe(true);
      expect(result.degraded).toBe(false);
      expect(result.usagePercent).toBeLessThan(80);
    });

    it('should track warning threshold', () => {
      // Set up usage near warning (80% of 20 daily = 16)
      guards.setFeatureLimits('search', 20, 200);
      guards.recordUsage('search', 15, 100);

      const result = guards.checkCost('search', 1);

      expect(result.allowed).toBe(true);
      expect(result.degraded).toBe(false);
      expect(result.usagePercent).toBeGreaterThanOrEqual(80);
    });

    it('should block requests at hard ceiling', () => {
      // Set up usage at ceiling (100% of 10 daily)
      guards.setFeatureLimits('aeo', 10, 100);
      guards.recordUsage('aeo', 10, 100);

      const result = guards.checkCost('aeo', 1);

      expect(result.allowed).toBe(false);
      expect(result.degraded).toBe(true);
      expect(result.reason).toContain('limit exceeded');
    });

    it('should return correct remaining budget', () => {
      guards.setFeatureLimits('chat', 100, 1000);
      guards.recordUsage('chat', 25, 100);

      const result = guards.checkCost('chat', 0);

      expect(result.remainingDailyUsd).toBe(75);
      expect(result.remainingMonthlyUsd).toBe(975);
    });

    it('should allow all requests when feature is disabled', () => {
      resetOpsConfig();
      setOpsConfigForTest({ costGuardsEnabled: false });

      // Even with high usage
      guards.setFeatureLimits('octopus', 10, 100);
      guards.recordUsage('octopus', 100, 100);

      const result = guards.checkCost('octopus', 1);

      expect(result.allowed).toBe(true);
      expect(result.remainingDailyUsd).toBe(Infinity);
    });
  });

  describe('recordUsage', () => {
    it('should accumulate daily usage', () => {
      guards.recordUsage('search', 5, 100);
      guards.recordUsage('search', 3, 50);

      const usage = guards.getFeatureUsage('search');

      expect(usage?.dailyUsedUsd).toBe(8);
    });

    it('should accumulate monthly usage', () => {
      guards.recordUsage('aeo', 10, 100);
      guards.recordUsage('aeo', 20, 200);

      const usage = guards.getFeatureUsage('aeo');

      expect(usage?.monthlyUsedUsd).toBe(30);
    });

    it('should maintain bounded history', () => {
      // Record many usage events
      for (let i = 0; i < 1500; i++) {
        guards.recordUsage('search', 0.01, 1);
      }

      const history = guards.getUsageHistory();

      // Should be bounded at MAX_USAGE_HISTORY (1000)
      expect(history.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getFeatureUsage', () => {
    it('should return usage for valid feature', () => {
      guards.recordUsage('chat', 15, 100);

      const usage = guards.getFeatureUsage('chat');

      expect(usage).toBeDefined();
      expect(usage?.feature).toBe('chat');
      expect(usage?.dailyUsedUsd).toBe(15);
      expect(usage?.monthlyUsedUsd).toBe(15);
    });

    it('should return undefined for unknown feature', () => {
      const usage = guards.getFeatureUsage('nonexistent' as Feature);

      expect(usage).toBeUndefined();
    });
  });

  describe('getAllUsage', () => {
    it('should return usage for all features', () => {
      guards.recordUsage('search', 10, 100);
      guards.recordUsage('aeo', 20, 200);

      const allUsage = guards.getAllUsage();

      expect(allUsage).toHaveLength(4); // search, aeo, chat, octopus

      const searchUsage = allUsage.find(u => u.feature === 'search');
      const aeoUsage = allUsage.find(u => u.feature === 'aeo');

      expect(searchUsage?.dailyUsedUsd).toBe(10);
      expect(aeoUsage?.dailyUsedUsd).toBe(20);
    });
  });

  describe('getTotalSpending', () => {
    it('should sum spending across all features', () => {
      guards.recordUsage('search', 10, 100);
      guards.recordUsage('aeo', 15, 100);
      guards.recordUsage('chat', 5, 100);

      const totals = guards.getTotalSpending();

      expect(totals.daily).toBe(30);
      expect(totals.monthly).toBe(30);
    });
  });

  describe('isFeatureDegraded', () => {
    it('should return false when under budget', () => {
      expect(guards.isFeatureDegraded('search')).toBe(false);
    });

    it('should return true when at ceiling', () => {
      guards.setFeatureLimits('aeo', 10, 100);
      guards.recordUsage('aeo', 10, 100);

      // Need to trigger check to update degraded status
      guards.checkCost('aeo', 1);

      expect(guards.isFeatureDegraded('aeo')).toBe(true);
    });
  });

  describe('getDegradedFeatures', () => {
    it('should return empty array when no features degraded', () => {
      expect(guards.getDegradedFeatures()).toEqual([]);
    });

    it('should return list of degraded features', () => {
      guards.setFeatureLimits('search', 10, 100);
      guards.setFeatureLimits('aeo', 10, 100);

      guards.recordUsage('search', 10, 100);
      guards.recordUsage('aeo', 10, 100);

      // Trigger checks
      guards.checkCost('search', 1);
      guards.checkCost('aeo', 1);

      const degraded = guards.getDegradedFeatures();

      expect(degraded).toContain('search');
      expect(degraded).toContain('aeo');
    });
  });

  describe('setFeatureLimits', () => {
    it('should update daily and monthly limits', () => {
      guards.setFeatureLimits('chat', 100, 1000);

      const usage = guards.getFeatureUsage('chat');

      expect(usage?.dailyLimitUsd).toBe(100);
      expect(usage?.monthlyLimitUsd).toBe(1000);
    });

    it('should restore feature when limits increase', () => {
      guards.setFeatureLimits('octopus', 10, 100);
      guards.recordUsage('octopus', 10, 100);
      guards.checkCost('octopus', 1);

      expect(guards.isFeatureDegraded('octopus')).toBe(true);

      // Increase limits
      guards.setFeatureLimits('octopus', 100, 1000);

      expect(guards.isFeatureDegraded('octopus')).toBe(false);
    });
  });

  describe('resetDaily', () => {
    it('should reset daily usage to zero', () => {
      guards.recordUsage('search', 20, 100);
      guards.recordUsage('aeo', 30, 100);

      guards.resetDaily();

      const searchUsage = guards.getFeatureUsage('search');
      const aeoUsage = guards.getFeatureUsage('aeo');

      expect(searchUsage?.dailyUsedUsd).toBe(0);
      expect(aeoUsage?.dailyUsedUsd).toBe(0);
    });

    it('should preserve monthly usage', () => {
      guards.recordUsage('chat', 50, 100);

      guards.resetDaily();

      const usage = guards.getFeatureUsage('chat');

      expect(usage?.dailyUsedUsd).toBe(0);
      expect(usage?.monthlyUsedUsd).toBe(50);
    });

    it('should restore daily-degraded features', () => {
      guards.setFeatureLimits('search', 10, 1000);
      guards.recordUsage('search', 10, 100);
      guards.checkCost('search', 1);

      expect(guards.isFeatureDegraded('search')).toBe(true);

      guards.resetDaily();

      expect(guards.isFeatureDegraded('search')).toBe(false);
    });
  });

  describe('resetMonthly', () => {
    it('should reset both daily and monthly usage', () => {
      guards.recordUsage('search', 50, 100);
      guards.recordUsage('aeo', 100, 100);

      guards.resetMonthly();

      const searchUsage = guards.getFeatureUsage('search');
      const aeoUsage = guards.getFeatureUsage('aeo');

      expect(searchUsage?.dailyUsedUsd).toBe(0);
      expect(searchUsage?.monthlyUsedUsd).toBe(0);
      expect(aeoUsage?.dailyUsedUsd).toBe(0);
      expect(aeoUsage?.monthlyUsedUsd).toBe(0);
    });

    it('should restore all degraded features', () => {
      guards.setFeatureLimits('search', 10, 10);
      guards.setFeatureLimits('aeo', 10, 10);

      guards.recordUsage('search', 10, 100);
      guards.recordUsage('aeo', 10, 100);

      guards.checkCost('search', 1);
      guards.checkCost('aeo', 1);

      expect(guards.getDegradedFeatures().length).toBe(2);

      guards.resetMonthly();

      expect(guards.getDegradedFeatures()).toEqual([]);
    });
  });

  describe('convenience functions', () => {
    it('checkFeatureCost should work', () => {
      const result = checkFeatureCost('search', 1);

      expect(result.allowed).toBe(true);
    });

    it('recordFeatureUsage should work', () => {
      recordFeatureUsage('aeo', 5, 100);

      const usage = guards.getFeatureUsage('aeo');
      expect(usage?.dailyUsedUsd).toBe(5);
    });
  });
});
