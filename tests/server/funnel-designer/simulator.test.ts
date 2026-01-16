/**
 * Funnel Simulator - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FunnelSimulator,
  getFunnelSimulator,
  resetFunnelSimulator,
  Funnel,
  FunnelChange,
} from '../../../server/funnel-designer';

describe('FunnelSimulator', () => {
  let simulator: FunnelSimulator;

  // Helper to create a test funnel
  function createTestFunnel(): Funnel {
    return {
      id: 'test-funnel-1',
      name: 'Test Funnel',
      type: 'conversion',
      steps: [
        {
          id: 'step-1',
          name: 'Landing',
          stage: 'awareness',
          contentIds: ['landing-page'],
          entryCount: 1000,
          exitCount: 200,
          dropOffRate: 0.2,
          avgTimeInStep: 30,
          conversionRate: 0.8,
          value: 0,
        },
        {
          id: 'step-2',
          name: 'Product',
          stage: 'consideration',
          contentIds: ['product-page'],
          entryCount: 800,
          exitCount: 300,
          dropOffRate: 0.375,
          avgTimeInStep: 60,
          conversionRate: 0.625,
          value: 0,
        },
        {
          id: 'step-3',
          name: 'Checkout',
          stage: 'action',
          contentIds: ['checkout-page'],
          entryCount: 500,
          exitCount: 400,
          dropOffRate: 0.8,
          avgTimeInStep: 90,
          conversionRate: 0.2,
          value: 100,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      isAutoDetected: true,
      totalEntries: 1000,
      totalConversions: 100,
      overallConversionRate: 0.1,
      avgCompletionTime: 180,
      totalValue: 10000,
      score: 50,
      healthScore: 60,
      bottlenecks: [
        {
          stepId: 'step-3',
          stepName: 'Checkout',
          dropOffRate: 0.8,
          severity: 'critical',
          potentialLift: 400,
          suggestedActions: ['Simplify checkout'],
        },
      ],
    };
  }

  beforeEach(() => {
    simulator = new FunnelSimulator();
  });

  afterEach(() => {
    simulator.clear();
  });

  describe('createScenario', () => {
    it('should create a simulation scenario', () => {
      const funnel = createTestFunnel();
      const changes: FunnelChange[] = [
        {
          type: 'remove_step',
          targetStepId: 'step-2',
          rationale: 'Simplify funnel',
        },
      ];

      const scenario = simulator.createScenario('Test Scenario', funnel, changes);

      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBe('Test Scenario');
      expect(scenario.baselineFunnel).toBe(funnel);
      expect(scenario.proposedChanges).toBe(changes);
    });
  });

  describe('simulate', () => {
    it('should run simulation and return results', () => {
      const funnel = createTestFunnel();
      const changes: FunnelChange[] = [
        {
          type: 'modify_content',
          targetStepId: 'step-3',
          rationale: 'Optimize checkout',
        },
      ];

      const scenario = simulator.createScenario('Checkout Optimization', funnel, changes);
      const result = simulator.simulate(scenario.id);

      expect(result).toBeDefined();
      expect(result?.scenarioId).toBe(scenario.id);
      expect(result?.baselineMetrics).toBeDefined();
      expect(result?.projectedMetrics).toBeDefined();
      expect(result?.expectedLift).toBeDefined();
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });

    it('should project improved metrics for optimization changes', () => {
      const funnel = createTestFunnel();
      const changes: FunnelChange[] = [
        {
          type: 'remove_step',
          targetStepId: 'step-2',
          rationale: 'Remove friction',
        },
      ];

      const scenario = simulator.createScenario('Remove Friction', funnel, changes);
      const result = simulator.simulate(scenario.id);

      expect(result?.expectedLift.conversionRate).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent scenario', () => {
      const result = simulator.simulate('non-existent');
      expect(result).toBeUndefined();
    });

    it('should assess risks for multiple changes', () => {
      const funnel = createTestFunnel();
      const changes: FunnelChange[] = [
        { type: 'add_step', rationale: 'Add step 1' },
        { type: 'add_step', rationale: 'Add step 2' },
        { type: 'add_step', rationale: 'Add step 3' },
        { type: 'modify_content', rationale: 'Change content' },
      ];

      const scenario = simulator.createScenario('Many Changes', funnel, changes);
      const result = simulator.simulate(scenario.id);

      expect(result?.risks.length).toBeGreaterThan(0);
      expect(result?.risks.some((r) => r.includes('simultaneous'))).toBe(true);
    });

    it('should generate recommendations', () => {
      const funnel = createTestFunnel();
      const changes: FunnelChange[] = [
        {
          type: 'modify_content',
          targetStepId: 'step-1',
          rationale: 'Improve landing',
        },
      ];

      const scenario = simulator.createScenario('Landing Optimization', funnel, changes);
      const result = simulator.simulate(scenario.id);

      expect(result?.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('quickSimulate', () => {
    it('should run quick simulation without storing', () => {
      const funnel = createTestFunnel();
      const changes: FunnelChange[] = [
        {
          type: 'reorder_steps',
          targetStepId: 'step-1',
          newPosition: 2,
          rationale: 'Reorder',
        },
      ];

      const result = simulator.quickSimulate(funnel, changes);

      expect(result).toBeDefined();
      expect(result.expectedLift).toBeDefined();
    });
  });

  describe('compareScenarios', () => {
    it('should compare multiple scenarios', () => {
      simulator.clear(); // Clear any previous scenarios
      const funnel = createTestFunnel();

      const scenario1 = simulator.createScenario('Option A', funnel, [
        { type: 'remove_step', targetStepId: 'step-2', rationale: 'Remove step' },
      ]);

      const scenario2 = simulator.createScenario('Option B', funnel, [
        { type: 'modify_content', targetStepId: 'step-3', rationale: 'Modify' },
      ]);

      const comparison = simulator.compareScenarios([scenario1.id, scenario2.id]);

      expect(comparison.scenarios.length).toBe(2);
      expect(comparison.results.length).toBe(2);
      expect(comparison.recommendation).toBeDefined();
    });

    it('should recommend best scenario', () => {
      simulator.clear(); // Clear any previous scenarios
      const funnel = createTestFunnel();

      // Better option (remove step = higher lift)
      const scenario1 = simulator.createScenario('Better Option', funnel, [
        { type: 'remove_step', targetStepId: 'step-2', rationale: 'Simplify' },
      ]);

      // Worse option (add step = lower lift)
      const scenario2 = simulator.createScenario('Worse Option', funnel, [
        { type: 'add_step', rationale: 'Add complexity' },
      ]);

      const comparison = simulator.compareScenarios([scenario1.id, scenario2.id]);

      expect(comparison.recommendation).toContain('Recommend');
    });
  });

  describe('Data Management', () => {
    it('should get scenario by ID', () => {
      const funnel = createTestFunnel();
      const scenario = simulator.createScenario('Test', funnel, []);

      const retrieved = simulator.getScenario(scenario.id);
      expect(retrieved).toBe(scenario);
    });

    it('should get result by scenario ID', () => {
      const funnel = createTestFunnel();
      const scenario = simulator.createScenario('Test', funnel, []);
      simulator.simulate(scenario.id);

      const result = simulator.getResult(scenario.id);
      expect(result).toBeDefined();
    });

    it('should get all scenarios', () => {
      simulator.clear(); // Clear any previous scenarios
      const funnel = createTestFunnel();
      simulator.createScenario('Test 1', funnel, []);
      simulator.createScenario('Test 2', funnel, []);

      const scenarios = simulator.getAllScenarios();
      expect(scenarios.length).toBe(2);
    });

    it('should clear all data', () => {
      const funnel = createTestFunnel();
      simulator.createScenario('Test', funnel, []);

      simulator.clear();

      expect(simulator.getAllScenarios().length).toBe(0);
      expect(simulator.getAllResults().length).toBe(0);
    });
  });
});

describe('Singleton', () => {
  afterEach(() => {
    resetFunnelSimulator();
  });

  it('should return same instance', () => {
    const s1 = getFunnelSimulator();
    const s2 = getFunnelSimulator();
    expect(s1).toBe(s2);
  });
});
