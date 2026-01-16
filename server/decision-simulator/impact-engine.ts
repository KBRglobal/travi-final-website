/**
 * Platform Decision Simulator - Impact Propagation Engine
 *
 * Computes predicted impacts using intelligence signals.
 * Pure functions only — no side effects.
 */

import { log } from '../lib/logger';
import type {
  Scenario,
  ScenarioChange,
  SubsystemImpact,
  SubsystemId,
  ImpactLevel,
  RiskAssessment,
  CascadeEffect,
  SimulationResult,
  SimulationOptions,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ImpactEngine] ${msg}`, data),
};

/**
 * Subsystem dependency graph (read-only)
 */
const SUBSYSTEM_DEPENDENCIES: Record<SubsystemId, SubsystemId[]> = {
  publishing: ['content', 'search', 'infrastructure'],
  search: ['content', 'infrastructure'],
  revenue: ['publishing', 'content', 'search'],
  content: ['infrastructure'],
  infrastructure: [],
  cost: ['infrastructure', 'content'],
  compliance: ['content', 'publishing'],
  intelligence: ['publishing', 'search', 'revenue', 'content'],
};

/**
 * Impact multipliers for change types
 */
const IMPACT_MULTIPLIERS: Record<string, Record<SubsystemId, number>> = {
  traffic_spike: {
    publishing: 0.8,
    search: 0.9,
    revenue: 0.3,
    content: 0.4,
    infrastructure: 1.0,
    cost: 0.7,
    compliance: 0.1,
    intelligence: 0.5,
  },
  cost_increase: {
    publishing: 0.3,
    search: 0.2,
    revenue: 0.6,
    content: 0.5,
    infrastructure: 0.2,
    cost: 1.0,
    compliance: 0.1,
    intelligence: 0.3,
  },
  content_surge: {
    publishing: 1.0,
    search: 0.7,
    revenue: 0.4,
    content: 0.9,
    infrastructure: 0.6,
    cost: 0.5,
    compliance: 0.3,
    intelligence: 0.6,
  },
  incident_injection: {
    publishing: 0.8,
    search: 0.7,
    revenue: 0.6,
    content: 0.5,
    infrastructure: 1.0,
    cost: 0.4,
    compliance: 0.6,
    intelligence: 0.8,
  },
  search_degradation: {
    publishing: 0.4,
    search: 1.0,
    revenue: 0.7,
    content: 0.3,
    infrastructure: 0.2,
    cost: 0.1,
    compliance: 0.2,
    intelligence: 0.5,
  },
  provider_outage: {
    publishing: 0.9,
    search: 0.3,
    revenue: 0.5,
    content: 0.8,
    infrastructure: 0.7,
    cost: 0.3,
    compliance: 0.4,
    intelligence: 0.6,
  },
  feature_flag_change: {
    publishing: 0.5,
    search: 0.4,
    revenue: 0.3,
    content: 0.4,
    infrastructure: 0.3,
    cost: 0.2,
    compliance: 0.5,
    intelligence: 0.4,
  },
  load_increase: {
    publishing: 0.6,
    search: 0.7,
    revenue: 0.2,
    content: 0.3,
    infrastructure: 1.0,
    cost: 0.6,
    compliance: 0.1,
    intelligence: 0.4,
  },
};

/**
 * Get current subsystem state (simulated baseline)
 */
function getCurrentSubsystemState(subsystemId: SubsystemId): number {
  // In production, this would read from intelligence hub
  // For simulation, use baseline values
  const baselines: Record<SubsystemId, number> = {
    publishing: 85,
    search: 90,
    revenue: 80,
    content: 88,
    infrastructure: 92,
    cost: 75,
    compliance: 95,
    intelligence: 87,
  };
  return baselines[subsystemId];
}

/**
 * Calculate impact level from delta
 */
function deltaToLevel(delta: number): ImpactLevel {
  const absDelta = Math.abs(delta);
  if (absDelta < 5) return 'none';
  if (absDelta < 15) return 'low';
  if (absDelta < 30) return 'medium';
  if (absDelta < 50) return 'high';
  return 'critical';
}

/**
 * Calculate change magnitude
 */
function getChangeMagnitude(change: ScenarioChange): number {
  const value = change.value;

  if (typeof value === 'number') {
    // For multipliers, magnitude is how far from 1.0
    if (value > 1) return (value - 1) * 100;
    if (value < 1) return (1 - value) * 100;
    return 0;
  }

  if (typeof value === 'boolean') {
    return value ? 50 : 25;
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.severity === 'critical') return 80;
    if (obj.severity === 'high') return 60;
    if (obj.severity === 'medium') return 40;
    return 30;
  }

  return 30; // Default magnitude
}

/**
 * Calculate subsystem impact (pure function)
 */
function calculateSubsystemImpact(
  subsystemId: SubsystemId,
  changes: ScenarioChange[]
): SubsystemImpact {
  const currentState = getCurrentSubsystemState(subsystemId);
  let totalDelta = 0;
  const reasons: string[] = [];

  for (const change of changes) {
    const multipliers = IMPACT_MULTIPLIERS[change.type] || {};
    const multiplier = multipliers[subsystemId] || 0.3;
    const magnitude = getChangeMagnitude(change);

    const impact = magnitude * multiplier;

    // Negative impacts (degradation)
    if (change.type === 'incident_injection' ||
        change.type === 'search_degradation' ||
        change.type === 'provider_outage') {
      totalDelta -= impact;
      reasons.push(`${change.type}: -${impact.toFixed(1)} impact`);
    }
    // Load-based impacts
    else if (change.type === 'traffic_spike' ||
             change.type === 'content_surge' ||
             change.type === 'load_increase') {
      totalDelta -= impact * 0.5; // Load strains systems
      reasons.push(`${change.type}: -${(impact * 0.5).toFixed(1)} (load stress)`);
    }
    // Cost impacts
    else if (change.type === 'cost_increase') {
      if (subsystemId === 'cost' || subsystemId === 'revenue') {
        totalDelta -= impact;
        reasons.push(`${change.type}: -${impact.toFixed(1)} (budget impact)`);
      }
    }
    // Feature changes can go either way
    else if (change.type === 'feature_flag_change') {
      const delta = change.value ? -impact * 0.3 : impact * 0.2;
      totalDelta += delta;
      reasons.push(`${change.type}: ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`);
    }
  }

  const predictedState = Math.max(0, Math.min(100, currentState + totalDelta));

  return {
    subsystemId,
    currentState,
    predictedState: Math.round(predictedState),
    delta: Math.round(totalDelta),
    level: deltaToLevel(totalDelta),
    reasons,
  };
}

/**
 * Calculate cascade effects (pure function)
 */
function calculateCascadeEffects(
  impacts: SubsystemImpact[],
  maxDepth: number = 2
): CascadeEffect[] {
  const cascades: CascadeEffect[] = [];

  for (const impact of impacts) {
    if (impact.level === 'none' || impact.level === 'low') continue;

    const dependents = Object.entries(SUBSYSTEM_DEPENDENCIES)
      .filter(([_, deps]) => deps.includes(impact.subsystemId))
      .map(([id]) => id as SubsystemId);

    for (const dependent of dependents) {
      const probability = Math.min(95, Math.abs(impact.delta) + 20);
      const cascadeImpact = deltaToLevel(impact.delta * 0.6);

      if (cascadeImpact !== 'none') {
        cascades.push({
          source: impact.subsystemId,
          target: dependent,
          probability,
          impact: cascadeImpact,
          pathway: `${impact.subsystemId} → ${dependent}`,
        });
      }
    }
  }

  return cascades.slice(0, 20); // Limit cascade effects
}

/**
 * Calculate risk assessment (pure function)
 */
function calculateRiskAssessment(
  impacts: SubsystemImpact[],
  changes: ScenarioChange[]
): RiskAssessment {
  const recommendations: string[] = [];

  // Calculate overall level
  const severeLevels = impacts.filter(
    i => i.level === 'high' || i.level === 'critical'
  );
  let overallLevel: ImpactLevel = 'none';

  if (severeLevels.length >= 3) overallLevel = 'critical';
  else if (severeLevels.length >= 2) overallLevel = 'high';
  else if (severeLevels.length >= 1) overallLevel = 'medium';
  else if (impacts.some(i => i.level === 'medium')) overallLevel = 'low';

  // Calculate specific impacts
  const infraImpact = impacts.find(i => i.subsystemId === 'infrastructure');
  const costImpact = impacts.find(i => i.subsystemId === 'cost');
  const revenueImpact = impacts.find(i => i.subsystemId === 'revenue');
  const complianceImpact = impacts.find(i => i.subsystemId === 'compliance');

  const readinessImpact = Math.round(
    impacts.reduce((sum, i) => sum + i.delta, 0) / impacts.length
  );

  const stabilityImpact = infraImpact?.delta || 0;

  // Estimate cost/revenue in dollars (simplified)
  const costDelta = (costImpact?.delta || 0) * -100; // $100 per point
  const revenueDelta = (revenueImpact?.delta || 0) * 500; // $500 per point

  const complianceRisk = (complianceImpact?.delta || 0) < -10;

  // Generate recommendations
  if (overallLevel === 'critical') {
    recommendations.push('CRITICAL: Do not proceed without mitigation plan');
  }

  if (stabilityImpact < -20) {
    recommendations.push('Scale infrastructure before implementing changes');
  }

  if (costDelta > 5000) {
    recommendations.push('Review budget allocation for increased costs');
  }

  if (complianceRisk) {
    recommendations.push('Consult compliance team before proceeding');
  }

  const hasTrafficChange = changes.some(
    c => c.type === 'traffic_spike' || c.type === 'load_increase'
  );
  if (hasTrafficChange) {
    recommendations.push('Enable auto-scaling before traffic increase');
    recommendations.push('Verify CDN and caching layers');
  }

  const hasProviderOutage = changes.some(c => c.type === 'provider_outage');
  if (hasProviderOutage) {
    recommendations.push('Verify failover providers are configured');
  }

  return {
    overallLevel,
    readinessImpact,
    stabilityImpact,
    costImpact: costDelta,
    revenueImpact: revenueDelta,
    complianceRisk,
    recommendations: recommendations.slice(0, 10),
  };
}

/**
 * Calculate confidence score (pure function)
 */
function calculateConfidence(
  changes: ScenarioChange[],
  impacts: SubsystemImpact[]
): { score: number; factors: string[] } {
  let score = 80; // Base confidence
  const factors: string[] = [];

  // More changes = less confidence
  if (changes.length > 3) {
    score -= 10;
    factors.push('Multiple simultaneous changes reduce prediction accuracy');
  }

  // Severe impacts = less confidence
  const severeCount = impacts.filter(
    i => i.level === 'high' || i.level === 'critical'
  ).length;
  if (severeCount > 0) {
    score -= severeCount * 5;
    factors.push('Severe impacts have higher uncertainty');
  }

  // Incident injection has lower confidence
  if (changes.some(c => c.type === 'incident_injection')) {
    score -= 15;
    factors.push('Incident scenarios have inherent unpredictability');
  }

  // Long duration events have lower confidence
  const longDuration = changes.some(c => (c.duration || 0) > 7200000);
  if (longDuration) {
    score -= 10;
    factors.push('Long-duration events may compound unpredictably');
  }

  if (factors.length === 0) {
    factors.push('Simulation based on historical patterns and current state');
  }

  return {
    score: Math.max(20, Math.min(95, score)),
    factors,
  };
}

/**
 * Generate unique result ID
 */
function generateResultId(): string {
  return `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Run simulation (pure function - no side effects)
 */
export function runSimulation(
  scenario: Scenario,
  options: SimulationOptions = {}
): SimulationResult {
  const startTime = Date.now();

  const {
    includeCascades = true,
    maxCascadeDepth = 2,
    includeRecommendations = true,
  } = options;

  // Calculate impacts for all subsystems
  const subsystems: SubsystemId[] = [
    'publishing', 'search', 'revenue', 'content',
    'infrastructure', 'cost', 'compliance', 'intelligence',
  ];

  const subsystemImpacts = subsystems.map(id =>
    calculateSubsystemImpact(id, scenario.changes)
  );

  // Calculate cascades
  const cascadeEffects = includeCascades
    ? calculateCascadeEffects(subsystemImpacts, maxCascadeDepth)
    : [];

  // Calculate risk assessment
  const riskAssessment = calculateRiskAssessment(
    subsystemImpacts,
    scenario.changes
  );

  if (!includeRecommendations) {
    riskAssessment.recommendations = [];
  }

  // Calculate confidence
  const { score: confidence, factors: confidenceFactors } = calculateConfidence(
    scenario.changes,
    subsystemImpacts
  );

  // Determine affected subsystems
  const affectedSubsystems = subsystemImpacts
    .filter(i => i.level !== 'none')
    .map(i => i.subsystemId);

  const simulationDurationMs = Date.now() - startTime;

  logger.info('Simulation completed', {
    scenarioId: scenario.id,
    affectedCount: affectedSubsystems.length,
    overallRisk: riskAssessment.overallLevel,
    confidence,
    durationMs: simulationDurationMs,
  });

  return {
    id: generateResultId(),
    scenarioId: scenario.id,
    scenario,
    timestamp: new Date(),
    subsystemImpacts,
    riskAssessment,
    confidence,
    confidenceFactors,
    affectedSubsystems,
    cascadeEffects,
    simulationDurationMs,
    signalsAnalyzed: subsystems.length * scenario.changes.length,
  };
}

/**
 * Quick impact check (lightweight simulation)
 */
export function quickImpactCheck(
  changes: ScenarioChange[]
): { level: ImpactLevel; summary: string } {
  let maxImpact: ImpactLevel = 'none';

  for (const change of changes) {
    const magnitude = getChangeMagnitude(change);

    if (magnitude >= 70) maxImpact = 'critical';
    else if (magnitude >= 50 && maxImpact !== 'critical') maxImpact = 'high';
    else if (magnitude >= 30 && maxImpact !== 'critical' && maxImpact !== 'high')
      maxImpact = 'medium';
    else if (magnitude >= 10 && maxImpact === 'none') maxImpact = 'low';
  }

  const summary = `${changes.length} change(s) with ${maxImpact} potential impact`;

  return { level: maxImpact, summary };
}
