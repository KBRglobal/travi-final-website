/**
 * Funnel Simulator
 *
 * Simulates expected lift BEFORE applying changes.
 * All projections are deterministic and explainable.
 */

import type {
  Funnel,
  FunnelStep,
  FunnelChange,
  SimulationScenario,
  SimulationResult,
  FunnelMetrics,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface SimulatorConfig {
  confidenceDecayPerStep: number;
  maxConfidence: number;
  minConfidence: number;
  defaultLiftMultiplier: number;
}

const DEFAULT_CONFIG: SimulatorConfig = {
  confidenceDecayPerStep: 0.05,
  maxConfidence: 0.95,
  minConfidence: 0.3,
  defaultLiftMultiplier: 1.0,
};

// ============================================================================
// LIFT ESTIMATORS
// ============================================================================

interface LiftEstimate {
  conversionLift: number;
  valueLift: number;
  timeLift: number;
  confidence: number;
}

const CHANGE_LIFT_ESTIMATES: Record<FunnelChange['type'], (change: FunnelChange) => LiftEstimate> = {
  add_step: () => ({
    conversionLift: -0.05, // Adding steps typically reduces conversion
    valueLift: 0.1, // But can increase value through better qualification
    timeLift: 0.2, // Increases time
    confidence: 0.6,
  }),

  remove_step: () => ({
    conversionLift: 0.15, // Removing friction increases conversion
    valueLift: -0.05, // May slightly reduce value
    timeLift: -0.15, // Faster completion
    confidence: 0.7,
  }),

  reorder_steps: () => ({
    conversionLift: 0.05,
    valueLift: 0,
    timeLift: -0.05,
    confidence: 0.5,
  }),

  modify_content: () => ({
    conversionLift: 0.1,
    valueLift: 0.05,
    timeLift: 0,
    confidence: 0.6,
  }),

  add_content: () => ({
    conversionLift: 0.05,
    valueLift: 0.08,
    timeLift: 0.05,
    confidence: 0.55,
  }),

  remove_content: () => ({
    conversionLift: 0.08,
    valueLift: -0.03,
    timeLift: -0.1,
    confidence: 0.65,
  }),
};

// ============================================================================
// FUNNEL SIMULATOR CLASS
// ============================================================================

export class FunnelSimulator {
  private config: SimulatorConfig;
  private scenarios: Map<string, SimulationScenario>;
  private results: Map<string, SimulationResult>;

  constructor(config?: Partial<SimulatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scenarios = new Map();
    this.results = new Map();
  }

  /**
   * Create a simulation scenario
   */
  createScenario(
    name: string,
    baselineFunnel: Funnel,
    proposedChanges: FunnelChange[]
  ): SimulationScenario {
    const scenario: SimulationScenario = {
      id: `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      baselineFunnel,
      proposedChanges,
      createdAt: new Date(),
    };

    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  /**
   * Run simulation for a scenario
   */
  simulate(scenarioId: string): SimulationResult | undefined {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return undefined;

    // Calculate baseline metrics
    const baselineMetrics = this.calculateMetrics(scenario.baselineFunnel);

    // Calculate combined lift from all changes
    const combinedLift = this.calculateCombinedLift(scenario.proposedChanges);

    // Project new metrics
    const projectedMetrics = this.projectMetrics(baselineMetrics, combinedLift);

    // Assess risks
    const risks = this.assessRisks(scenario.proposedChanges, combinedLift);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      scenario.baselineFunnel,
      scenario.proposedChanges,
      combinedLift
    );

    const result: SimulationResult = {
      scenarioId,
      baselineMetrics,
      projectedMetrics,
      expectedLift: {
        conversionRate: combinedLift.conversionLift,
        value: combinedLift.valueLift,
        completionTime: combinedLift.timeLift,
      },
      confidence: combinedLift.confidence,
      risks,
      recommendations,
    };

    this.results.set(scenarioId, result);
    return result;
  }

  /**
   * Calculate metrics from funnel
   */
  private calculateMetrics(funnel: Funnel): FunnelMetrics {
    return {
      conversionRate: funnel.overallConversionRate,
      avgValue: funnel.totalValue / Math.max(funnel.totalConversions, 1),
      avgCompletionTime: funnel.avgCompletionTime,
      dropOffByStep: funnel.steps.map((s) => ({
        stepId: s.id,
        rate: s.dropOffRate,
      })),
      bottleneckCount: funnel.bottlenecks.length,
    };
  }

  /**
   * Calculate combined lift from multiple changes
   */
  private calculateCombinedLift(changes: FunnelChange[]): LiftEstimate {
    if (changes.length === 0) {
      return {
        conversionLift: 0,
        valueLift: 0,
        timeLift: 0,
        confidence: 1,
      };
    }

    let totalConversionLift = 0;
    let totalValueLift = 0;
    let totalTimeLift = 0;
    let combinedConfidence = 1;

    for (const change of changes) {
      const estimator = CHANGE_LIFT_ESTIMATES[change.type];
      const estimate = estimator(change);

      // Combine lifts (multiplicative for conversion, additive for others)
      totalConversionLift += estimate.conversionLift;
      totalValueLift += estimate.valueLift;
      totalTimeLift += estimate.timeLift;

      // Confidence decays with each change
      combinedConfidence *= estimate.confidence;
    }

    // Apply diminishing returns for many changes
    const changeCount = changes.length;
    const diminishingFactor = 1 / (1 + changeCount * 0.1);

    return {
      conversionLift: totalConversionLift * diminishingFactor,
      valueLift: totalValueLift * diminishingFactor,
      timeLift: totalTimeLift,
      confidence: Math.max(
        this.config.minConfidence,
        Math.min(this.config.maxConfidence, combinedConfidence)
      ),
    };
  }

  /**
   * Project metrics with lift applied
   */
  private projectMetrics(baseline: FunnelMetrics, lift: LiftEstimate): FunnelMetrics {
    return {
      conversionRate: baseline.conversionRate * (1 + lift.conversionLift),
      avgValue: baseline.avgValue * (1 + lift.valueLift),
      avgCompletionTime: baseline.avgCompletionTime * (1 + lift.timeLift),
      dropOffByStep: baseline.dropOffByStep.map((step) => ({
        stepId: step.id,
        rate: step.rate * (1 - lift.conversionLift * 0.3), // Proportional improvement
      })),
      bottleneckCount: Math.max(0, baseline.bottleneckCount - Math.floor(lift.conversionLift * 5)),
    };
  }

  /**
   * Assess risks of changes
   */
  private assessRisks(changes: FunnelChange[], lift: LiftEstimate): string[] {
    const risks: string[] = [];

    // Too many changes
    if (changes.length > 3) {
      risks.push('Multiple simultaneous changes increase unpredictability');
    }

    // Low confidence
    if (lift.confidence < 0.5) {
      risks.push('Low confidence in projected outcomes - consider phased rollout');
    }

    // Negative conversion impact
    if (lift.conversionLift < 0) {
      risks.push('Changes may negatively impact conversion rate');
    }

    // Adding steps
    const addSteps = changes.filter((c) => c.type === 'add_step');
    if (addSteps.length > 1) {
      risks.push('Adding multiple steps may increase friction significantly');
    }

    // Removing content
    const removeContent = changes.filter((c) => c.type === 'remove_content');
    if (removeContent.length > 2) {
      risks.push('Removing significant content may impact user experience');
    }

    return risks;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    funnel: Funnel,
    changes: FunnelChange[],
    lift: LiftEstimate
  ): string[] {
    const recommendations: string[] = [];

    // Confidence-based recommendations
    if (lift.confidence >= 0.7) {
      recommendations.push('High confidence - suitable for direct implementation');
    } else if (lift.confidence >= 0.5) {
      recommendations.push('Moderate confidence - consider A/B testing first');
    } else {
      recommendations.push('Low confidence - run small-scale experiment before full rollout');
    }

    // Lift-based recommendations
    if (lift.conversionLift > 0.2) {
      recommendations.push('Significant conversion lift expected - prioritize this change');
    }

    if (lift.valueLift > 0.15) {
      recommendations.push('Strong value increase projected - monitor revenue impact');
    }

    // Funnel-specific recommendations
    if (funnel.bottlenecks.length > 0) {
      const topBottleneck = funnel.bottlenecks[0];
      const addressesBottleneck = changes.some(
        (c) => c.targetStepId === topBottleneck.stepId
      );

      if (!addressesBottleneck) {
        recommendations.push(
          `Consider also addressing the bottleneck at "${topBottleneck.stepName}"`
        );
      }
    }

    return recommendations.slice(0, 5);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get scenario by ID
   */
  getScenario(id: string): SimulationScenario | undefined {
    return this.scenarios.get(id);
  }

  /**
   * Get result by scenario ID
   */
  getResult(scenarioId: string): SimulationResult | undefined {
    return this.results.get(scenarioId);
  }

  /**
   * Get all scenarios
   */
  getAllScenarios(): SimulationScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Get all results
   */
  getAllResults(): SimulationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Quick simulation without storing scenario
   */
  quickSimulate(funnel: Funnel, changes: FunnelChange[]): SimulationResult {
    const scenario = this.createScenario('Quick Simulation', funnel, changes);
    return this.simulate(scenario.id)!;
  }

  /**
   * Compare multiple scenarios
   */
  compareScenarios(scenarioIds: string[]): {
    scenarios: SimulationScenario[];
    results: SimulationResult[];
    recommendation: string;
  } {
    const scenarios: SimulationScenario[] = [];
    const results: SimulationResult[] = [];

    for (const id of scenarioIds) {
      const scenario = this.scenarios.get(id);
      if (scenario) {
        scenarios.push(scenario);

        let result = this.results.get(id);
        if (!result) {
          result = this.simulate(id);
        }
        if (result) {
          results.push(result);
        }
      }
    }

    // Find best scenario
    let bestScenario: SimulationResult | undefined;
    let bestScore = -Infinity;

    for (const result of results) {
      const score =
        result.expectedLift.conversionRate * 50 +
        result.expectedLift.value * 30 +
        result.confidence * 20;

      if (score > bestScore) {
        bestScore = score;
        bestScenario = result;
      }
    }

    const recommendation = bestScenario
      ? `Recommend scenario "${this.scenarios.get(bestScenario.scenarioId)?.name}" with ${(bestScenario.expectedLift.conversionRate * 100).toFixed(1)}% expected conversion lift`
      : 'No scenarios to compare';

    return { scenarios, results, recommendation };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.scenarios.clear();
    this.results.clear();
  }
}

// Singleton instance
let simulatorInstance: FunnelSimulator | null = null;

export function getFunnelSimulator(): FunnelSimulator {
  if (!simulatorInstance) {
    simulatorInstance = new FunnelSimulator();
  }
  return simulatorInstance;
}

export function resetFunnelSimulator(): void {
  if (simulatorInstance) {
    simulatorInstance.clear();
  }
  simulatorInstance = null;
}
