/**
 * Tests for Growth Prioritizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GrowthPrioritizer,
  getGrowthPrioritizer,
  resetGrowthPrioritizer,
} from '../../../server/growth-command/prioritizer';
import {
  getGrowthAggregator,
  resetGrowthAggregator,
} from '../../../server/growth-command/aggregator';
import { resetGrowthScorer } from '../../../server/growth-command/scorer';
import type { GrowthOpportunity, GrowthQuery } from '../../../server/growth-command/types';

describe('GrowthPrioritizer', () => {
  let prioritizer: GrowthPrioritizer;

  const addTestOpportunity = (overrides: Partial<GrowthOpportunity> = {}): GrowthOpportunity => {
    const aggregator = getGrowthAggregator();
    return aggregator.addManualOpportunity({
      sourceId: `test-${Date.now()}`,
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
      tags: ['test'],
      ...overrides,
    });
  };

  beforeEach(() => {
    resetGrowthAggregator();
    resetGrowthScorer();
    resetGrowthPrioritizer();
    prioritizer = getGrowthPrioritizer();
  });

  describe('createPrioritizedList', () => {
    it('should create a prioritized list', () => {
      addTestOpportunity({ title: 'Opp 1' });
      addTestOpportunity({ title: 'Opp 2' });

      const list = prioritizer.createPrioritizedList('Test List');

      expect(list).toBeDefined();
      expect(list.id).toBeDefined();
      expect(list.name).toBe('Test List');
      expect(list.opportunities.length).toBeGreaterThan(0);
      expect(list.generatedAt).toBeInstanceOf(Date);
      expect(list.validUntil).toBeInstanceOf(Date);
    });

    it('should apply criteria filters', () => {
      addTestOpportunity({ impactScore: 80, category: 'conversion_optimization' });
      addTestOpportunity({ impactScore: 30, category: 'other' });

      const list = prioritizer.createPrioritizedList('Filtered List', {
        minImpactScore: 50,
        requiredCategories: ['conversion_optimization'],
      });

      expect(list.opportunities.length).toBe(1);
    });

    it('should respect max risk level filter', () => {
      addTestOpportunity({ riskLevel: 'low' });
      addTestOpportunity({ riskLevel: 'critical' });

      const list = prioritizer.createPrioritizedList('Low Risk Only', {
        maxRiskLevel: 'medium',
      });

      // Critical risk should be filtered out
      expect(list.opportunities.length).toBe(1);
    });

    it('should apply custom weights', () => {
      addTestOpportunity({ impactScore: 90, expectedROI: 50 });
      addTestOpportunity({ impactScore: 50, expectedROI: 500 });

      const impactWeighted = prioritizer.createPrioritizedList('Impact Weighted', {}, {
        impact: 0.9,
        roi: 0.1,
      });

      const roiWeighted = prioritizer.createPrioritizedList('ROI Weighted', {}, {
        impact: 0.1,
        roi: 0.9,
      });

      // Different weights should affect ranking
      expect(impactWeighted.weights.impact).toBe(0.9);
      expect(roiWeighted.weights.roi).toBe(0.9);
    });
  });

  describe('executeQuery', () => {
    it('should execute top_opportunities query', () => {
      addTestOpportunity({ title: 'Top 1', impactScore: 90 });
      addTestOpportunity({ title: 'Top 2', impactScore: 80 });
      addTestOpportunity({ title: 'Low', impactScore: 30 });

      const result = prioritizer.executeQuery({
        type: 'top_opportunities',
        limit: 2,
      });

      expect(result.opportunities.length).toBe(2);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute ready_to_execute query', () => {
      addTestOpportunity({
        title: 'Ready',
        executionReadiness: { isReady: true, score: 90, blockers: [], warnings: [] },
      });
      addTestOpportunity({
        title: 'Not Ready',
        executionReadiness: { isReady: false, score: 30, blockers: ['Pending'], warnings: [] },
      });

      const result = prioritizer.executeQuery({
        type: 'ready_to_execute',
        limit: 10,
      });

      expect(result.opportunities.every((o) => o.executionReadiness.isReady)).toBe(true);
    });

    it('should execute high_roi query', () => {
      addTestOpportunity({ title: 'High ROI', expectedROI: 300 });
      addTestOpportunity({ title: 'Low ROI', expectedROI: 20 });

      const result = prioritizer.executeQuery({
        type: 'high_roi',
        params: { minROI: 100 },
        limit: 10,
      });

      expect(result.opportunities.every((o) => o.expectedROI >= 100)).toBe(true);
    });

    it('should execute low_risk query', () => {
      addTestOpportunity({ title: 'Low Risk', riskLevel: 'low' });
      addTestOpportunity({ title: 'High Risk', riskLevel: 'high' });

      const result = prioritizer.executeQuery({
        type: 'low_risk',
        limit: 10,
      });

      expect(result.opportunities.every((o) =>
        o.riskLevel === 'minimal' || o.riskLevel === 'low'
      )).toBe(true);
    });

    it('should execute quick_wins query', () => {
      addTestOpportunity({ title: 'Quick Win', effortLevel: 'low', impactScore: 60 });
      addTestOpportunity({ title: 'Big Effort', effortLevel: 'major', impactScore: 60 });

      const result = prioritizer.executeQuery({
        type: 'quick_wins',
        limit: 10,
      });

      expect(result.opportunities.every((o) =>
        o.effortLevel === 'trivial' || o.effortLevel === 'low'
      )).toBe(true);
    });

    it('should execute by_category query', () => {
      addTestOpportunity({ category: 'conversion_optimization' });
      addTestOpportunity({ category: 'funnel_optimization' });

      const result = prioritizer.executeQuery({
        type: 'by_category',
        params: { category: 'conversion_optimization' },
        limit: 10,
      });

      expect(result.opportunities.every((o) =>
        o.category === 'conversion_optimization'
      )).toBe(true);
    });

    it('should execute by_source query', () => {
      addTestOpportunity({ title: 'Manual' }); // source is 'manual'

      const result = prioritizer.executeQuery({
        type: 'by_source',
        params: { source: 'manual' },
        limit: 10,
      });

      expect(result.opportunities.every((o) => o.source === 'manual')).toBe(true);
    });
  });

  describe('getList', () => {
    it('should retrieve list by ID', () => {
      addTestOpportunity();
      const created = prioritizer.createPrioritizedList('My List');

      const retrieved = prioritizer.getList(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent list', () => {
      const result = prioritizer.getList('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllLists', () => {
    it('should return all lists', () => {
      addTestOpportunity();
      prioritizer.createPrioritizedList('List 1');
      prioritizer.createPrioritizedList('List 2');

      const lists = prioritizer.getAllLists();

      expect(lists).toHaveLength(2);
    });
  });

  describe('isListValid', () => {
    it('should return true for valid list', () => {
      addTestOpportunity();
      const list = prioritizer.createPrioritizedList('Valid List');

      expect(prioritizer.isListValid(list.id)).toBe(true);
    });

    it('should return false for non-existent list', () => {
      expect(prioritizer.isListValid('non-existent')).toBe(false);
    });
  });

  describe('refreshList', () => {
    it('should refresh a list', () => {
      addTestOpportunity();
      const original = prioritizer.createPrioritizedList('To Refresh');

      // Add another opportunity
      addTestOpportunity({ title: 'New Opportunity' });

      const refreshed = prioritizer.refreshList(original.id);

      expect(refreshed).toBeDefined();
      expect(refreshed?.generatedAt.getTime()).toBeGreaterThanOrEqual(
        original.generatedAt.getTime()
      );
    });

    it('should return undefined for non-existent list', () => {
      const result = prioritizer.refreshList('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteList', () => {
    it('should delete a list', () => {
      addTestOpportunity();
      const list = prioritizer.createPrioritizedList('To Delete');

      const deleted = prioritizer.deleteList(list.id);

      expect(deleted).toBe(true);
      expect(prioritizer.getList(list.id)).toBeUndefined();
    });

    it('should return false for non-existent list', () => {
      const result = prioritizer.deleteList('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getNextAction', () => {
    it('should return next action with opportunity', () => {
      addTestOpportunity({
        title: 'Best Opportunity',
        impactScore: 90,
        expectedROI: 200,
        executionReadiness: { isReady: true, score: 95, blockers: [], warnings: [] },
      });

      const nextAction = prioritizer.getNextAction();

      expect(nextAction.opportunity).not.toBeNull();
      expect(nextAction.score).not.toBeNull();
      expect(nextAction.reasoning.length).toBeGreaterThan(0);
    });

    it('should return null opportunity when none available', () => {
      const nextAction = prioritizer.getNextAction();

      expect(nextAction.opportunity).toBeNull();
      expect(nextAction.score).toBeNull();
      expect(nextAction.reasoning.some((r) => r.includes('No opportunities'))).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      addTestOpportunity();
      prioritizer.createPrioritizedList('To Clear');

      prioritizer.clear();

      expect(prioritizer.getAllLists()).toHaveLength(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getGrowthPrioritizer();
      const instance2 = getGrowthPrioritizer();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      addTestOpportunity();
      const instance1 = getGrowthPrioritizer();
      instance1.createPrioritizedList('Test');

      resetGrowthPrioritizer();

      const instance2 = getGrowthPrioritizer();
      expect(instance2.getAllLists()).toHaveLength(0);
    });
  });
});
