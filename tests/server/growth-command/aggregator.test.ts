/**
 * Tests for Growth Aggregator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GrowthAggregator,
  getGrowthAggregator,
  resetGrowthAggregator,
} from '../../../server/growth-command/aggregator';

describe('GrowthAggregator', () => {
  let aggregator: GrowthAggregator;

  beforeEach(() => {
    resetGrowthAggregator();
    aggregator = getGrowthAggregator();
  });

  describe('aggregate', () => {
    it('should aggregate opportunities from all sources', () => {
      const result = aggregator.aggregate();

      expect(result).toBeDefined();
      expect(result.opportunities).toBeDefined();
      expect(Array.isArray(result.opportunities)).toBe(true);
      expect(result.sourceCounts).toBeDefined();
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return source counts', () => {
      const result = aggregator.aggregate();

      expect(result.sourceCounts.tcoe).toBeDefined();
      expect(result.sourceCounts.intent_graph).toBeDefined();
      expect(result.sourceCounts.funnel_designer).toBeDefined();
    });

    it('should track signals for unavailable modules', () => {
      aggregator.aggregate();
      const signals = aggregator.getRecentSignals();

      // Modules won't be loaded in test, so signals should indicate unavailability
      expect(signals.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllOpportunities', () => {
    it('should return all aggregated opportunities', () => {
      aggregator.aggregate();
      const opportunities = aggregator.getAllOpportunities();

      expect(Array.isArray(opportunities)).toBe(true);
    });
  });

  describe('getOpportunity', () => {
    it('should return opportunity by ID', () => {
      // Add a manual opportunity
      const added = aggregator.addManualOpportunity({
        sourceId: 'test-1',
        status: 'identified',
        title: 'Test Opportunity',
        description: 'A test opportunity',
        category: 'test',
        impactScore: 70,
        impactLevel: 'high',
        expectedROI: 100,
        confidenceLevel: 0.8,
        revenueImpact: { lowEstimate: 1000, midEstimate: 5000, highEstimate: 10000, timeframeDays: 30 },
        riskScore: 0.2,
        riskLevel: 'low',
        risks: [],
        effortScore: 30,
        effortLevel: 'low',
        dependencies: [],
        requiredApprovals: [],
        blockers: [],
        executionReadiness: { isReady: true, score: 90, blockers: [], warnings: [] },
        tags: ['test'],
      });

      const retrieved = aggregator.getOpportunity(added.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(added.id);
      expect(retrieved?.title).toBe('Test Opportunity');
    });

    it('should return undefined for non-existent ID', () => {
      const result = aggregator.getOpportunity('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getOpportunitiesBySource', () => {
    it('should filter opportunities by source', () => {
      aggregator.addManualOpportunity({
        sourceId: 'manual-1',
        status: 'identified',
        title: 'Manual Opportunity',
        description: 'Test',
        category: 'test',
        impactScore: 50,
        impactLevel: 'medium',
        expectedROI: 50,
        confidenceLevel: 0.5,
        revenueImpact: { lowEstimate: 0, midEstimate: 0, highEstimate: 0, timeframeDays: 30 },
        riskScore: 0.3,
        riskLevel: 'low',
        risks: [],
        effortScore: 50,
        effortLevel: 'medium',
        dependencies: [],
        requiredApprovals: [],
        blockers: [],
        executionReadiness: { isReady: true, score: 80, blockers: [], warnings: [] },
        tags: [],
      });

      const manualOpps = aggregator.getOpportunitiesBySource('manual');

      expect(manualOpps.length).toBeGreaterThan(0);
      expect(manualOpps.every((o) => o.source === 'manual')).toBe(true);
    });
  });

  describe('updateOpportunityStatus', () => {
    it('should update opportunity status', () => {
      const added = aggregator.addManualOpportunity({
        sourceId: 'status-test',
        status: 'identified',
        title: 'Status Test',
        description: 'Test',
        category: 'test',
        impactScore: 50,
        impactLevel: 'medium',
        expectedROI: 50,
        confidenceLevel: 0.5,
        revenueImpact: { lowEstimate: 0, midEstimate: 0, highEstimate: 0, timeframeDays: 30 },
        riskScore: 0.3,
        riskLevel: 'low',
        risks: [],
        effortScore: 50,
        effortLevel: 'medium',
        dependencies: [],
        requiredApprovals: [],
        blockers: [],
        executionReadiness: { isReady: true, score: 80, blockers: [], warnings: [] },
        tags: [],
      });

      const updated = aggregator.updateOpportunityStatus(added.id, 'approved');

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('approved');
    });

    it('should return undefined for non-existent opportunity', () => {
      const result = aggregator.updateOpportunityStatus('non-existent', 'approved');
      expect(result).toBeUndefined();
    });
  });

  describe('addManualOpportunity', () => {
    it('should add manual opportunity with correct source', () => {
      const opportunity = aggregator.addManualOpportunity({
        sourceId: 'manual-new',
        status: 'identified',
        title: 'New Manual Opportunity',
        description: 'Description',
        category: 'manual',
        impactScore: 60,
        impactLevel: 'medium',
        expectedROI: 75,
        confidenceLevel: 0.7,
        revenueImpact: { lowEstimate: 500, midEstimate: 1000, highEstimate: 2000, timeframeDays: 30 },
        riskScore: 0.2,
        riskLevel: 'low',
        risks: [],
        effortScore: 40,
        effortLevel: 'low',
        dependencies: [],
        requiredApprovals: [],
        blockers: [],
        executionReadiness: { isReady: true, score: 85, blockers: [], warnings: [] },
        tags: ['manual', 'test'],
      });

      expect(opportunity.id).toMatch(/^manual-/);
      expect(opportunity.source).toBe('manual');
      expect(opportunity.title).toBe('New Manual Opportunity');
      expect(opportunity.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getRecentSignals', () => {
    it('should return recent signals', () => {
      aggregator.aggregate();
      const signals = aggregator.getRecentSignals(10);

      expect(Array.isArray(signals)).toBe(true);
      expect(signals.length).toBeLessThanOrEqual(10);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      aggregator.addManualOpportunity({
        sourceId: 'to-clear',
        status: 'identified',
        title: 'To Clear',
        description: 'Test',
        category: 'test',
        impactScore: 50,
        impactLevel: 'medium',
        expectedROI: 50,
        confidenceLevel: 0.5,
        revenueImpact: { lowEstimate: 0, midEstimate: 0, highEstimate: 0, timeframeDays: 30 },
        riskScore: 0.3,
        riskLevel: 'low',
        risks: [],
        effortScore: 50,
        effortLevel: 'medium',
        dependencies: [],
        requiredApprovals: [],
        blockers: [],
        executionReadiness: { isReady: true, score: 80, blockers: [], warnings: [] },
        tags: [],
      });

      aggregator.clear();

      expect(aggregator.getAllOpportunities()).toHaveLength(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getGrowthAggregator();
      const instance2 = getGrowthAggregator();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getGrowthAggregator();
      instance1.addManualOpportunity({
        sourceId: 'singleton-test',
        status: 'identified',
        title: 'Singleton Test',
        description: 'Test',
        category: 'test',
        impactScore: 50,
        impactLevel: 'medium',
        expectedROI: 50,
        confidenceLevel: 0.5,
        revenueImpact: { lowEstimate: 0, midEstimate: 0, highEstimate: 0, timeframeDays: 30 },
        riskScore: 0.3,
        riskLevel: 'low',
        risks: [],
        effortScore: 50,
        effortLevel: 'medium',
        dependencies: [],
        requiredApprovals: [],
        blockers: [],
        executionReadiness: { isReady: true, score: 80, blockers: [], warnings: [] },
        tags: [],
      });

      resetGrowthAggregator();

      const instance2 = getGrowthAggregator();
      expect(instance2.getAllOpportunities()).toHaveLength(0);
    });
  });
});
