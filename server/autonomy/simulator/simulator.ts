/**
 * Autonomy Simulator - Core Logic
 * Replays historical traffic against hypothetical policies
 * Zero side effects - pure computation
 */

import {
  HistoricalDecision,
  HypotheticalPolicy,
  SimulatedDecision,
  SimulationResult,
  SimulationRequest,
  SimulationFinding,
  FeatureSimulationResult,
  HourlyImpact,
  DEFAULT_SIMULATOR_CONFIG,
  SimulatorConfig,
} from './types';
import { GuardedFeature } from '../enforcement/types';

type PolicyDecision = 'ALLOW' | 'BLOCK' | 'WARN';
import { getOutcomes } from '../learning/engine';

// Bounded storage for simulation results
const MAX_RESULTS = 20;
const resultCache = new Map<string, { result: SimulationResult; expiresAt: number }>();

// Active simulations tracking
const activeSimulations = new Set<string>();

function getConfig(): SimulatorConfig {
  return {
    ...DEFAULT_SIMULATOR_CONFIG,
    enabled: process.env.ENABLE_AUTONOMY_SIMULATOR === 'true',
  };
}

/**
 * Load historical decisions for simulation
 */
export function loadHistoricalDecisions(
  timeRange: { start: Date; end: Date },
  features?: GuardedFeature[],
  maxRecords?: number
): HistoricalDecision[] {
  const config = getConfig();
  const limit = Math.min(maxRecords || config.maxRecordsPerRun, config.maxRecordsPerRun);

  // Get outcomes from learning engine
  const outcomes = getOutcomes({
    since: timeRange.start,
    until: timeRange.end,
    feature: features?.[0], // Filter by first feature if specified
  } as any);

  // Convert to historical decisions
  const decisions: HistoricalDecision[] = [];

  for (const o of outcomes) {
    const rec = o as any;
    if (features && features.length > 0 && !features.includes(rec.feature)) {
      continue;
    }

    if (decisions.length >= limit) break;

    decisions.push({
      id: rec.id,
      feature: rec.feature,
      action: rec.action,
      timestamp: rec.decisionAt,
      originalDecision: rec.decision,
      context: {
        entityId: rec.entityId,
        requesterId: rec.requesterId,
        estimatedCost: (rec.metadata?.estimatedCost as number) || undefined,
        estimatedTokens: (rec.metadata?.estimatedTokens as number) || undefined,
        metadata: rec.metadata,
      },
      outcome: {
        tokensUsed: rec.tokensUsed,
        costCents: (rec.metadata?.cost as number) || 0,
        latencyMs: rec.latencyMs,
        success: rec.outcome === 'confirmed_correct' || rec.outcome === 'recovery_success',
        hadIncident: rec.outcome === 'incident_after_allow' || rec.outcome === 'recovery_failed',
        wasOverridden: rec.outcome === 'override_applied',
      },
    });
  }

  return decisions;
}

/**
 * Simulate a single decision against hypothetical policy
 * Pure function - no side effects
 */
export function simulateDecision(
  decision: HistoricalDecision,
  policy: HypotheticalPolicy,
  budgetState: Map<string, { actions: number; spend: number }>
): SimulatedDecision {
  const budgetKey = `${decision.feature}:hourly`;
  const budget = policy.budgets.get(budgetKey) || {
    period: 'hourly' as const,
    maxActions: 100,
    maxAiSpend: 1000,
    maxDbWrites: 50,
    maxContentMutations: 20,
  };

  // Get or initialize budget state
  const state = budgetState.get(budgetKey) || { actions: 0, spend: 0 };

  // Check feature override
  const featureOverride = policy.featureOverrides?.[decision.feature];
  if (featureOverride && !featureOverride.enabled) {
    return {
      originalId: decision.id,
      simulatedDecision: 'BLOCK',
      wouldChange: decision.originalDecision !== 'BLOCK',
      reason: 'Feature disabled in hypothetical policy',
      budgetState: {
        actionsUsed: state.actions,
        actionsLimit: budget.maxActions,
        spendUsed: state.spend,
        spendLimit: budget.maxAiSpend,
      },
    };
  }

  // Check budget limits
  const effectiveMaxActions = featureOverride?.maxActions ?? budget.maxActions;
  const effectiveMaxSpend = featureOverride?.maxAiSpend ?? budget.maxAiSpend;

  const estimatedCost = decision.context.estimatedCost || 1;

  let simulatedDecision: PolicyDecision = 'ALLOW';
  let reason: string | undefined;

  // Would exceed action budget?
  if (state.actions + 1 > effectiveMaxActions) {
    simulatedDecision = 'BLOCK';
    reason = `Would exceed action budget (${state.actions + 1} > ${effectiveMaxActions})`;
  }
  // Would exceed spend budget?
  else if (state.spend + estimatedCost > effectiveMaxSpend) {
    simulatedDecision = 'BLOCK';
    reason = `Would exceed spend budget (${state.spend + estimatedCost} > ${effectiveMaxSpend})`;
  }
  // Approaching limits - warn
  else if (state.actions + 1 > effectiveMaxActions * 0.8 || state.spend + estimatedCost > effectiveMaxSpend * 0.8) {
    simulatedDecision = 'WARN';
    reason = 'Approaching budget limits';
  }

  // Check risk thresholds if applicable
  if (simulatedDecision === 'ALLOW' && policy.riskThresholds) {
    // These would be checked against aggregated metrics in a real scenario
    // For simulation, we just note the threshold exists
  }

  // Update budget state (mutates the map - this is intentional for simulation tracking)
  if (simulatedDecision !== 'BLOCK') {
    state.actions += 1;
    state.spend += estimatedCost;
    budgetState.set(budgetKey, state);
  }

  return {
    originalId: decision.id,
    simulatedDecision,
    wouldChange: decision.originalDecision !== simulatedDecision,
    reason,
    budgetState: {
      actionsUsed: state.actions,
      actionsLimit: effectiveMaxActions,
      spendUsed: state.spend,
      spendLimit: effectiveMaxSpend,
    },
  };
}

/**
 * Run a full simulation
 */
export async function runSimulation(request: SimulationRequest): Promise<SimulationResult> {
  const config = getConfig();

  if (!config.enabled) {
    throw new Error('Autonomy simulator is not enabled');
  }

  if (activeSimulations.size >= config.maxConcurrentSimulations) {
    throw new Error('Too many concurrent simulations');
  }

  const simulationId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  activeSimulations.add(simulationId);

  try {
    const startedAt = new Date();

    // Load historical decisions
    const decisions = loadHistoricalDecisions(
      request.timeRange,
      request.features,
      request.maxRecords
    );

    if (decisions.length === 0) {
      throw new Error('No historical decisions found in the specified time range');
    }

    // Track budget state per hour (reset each hour for hourly budgets)
    const budgetStateByHour = new Map<string, Map<string, { actions: number; spend: number }>>();

    // Simulate each decision
    const simulatedDecisions: SimulatedDecision[] = [];
    const featureStats = new Map<GuardedFeature, {
      total: number;
      changed: number;
      originalBlocks: number;
      simulatedBlocks: number;
      originalCost: number;
      simulatedCost: number;
    }>();
    const hourlyStats = new Map<number, {
      changed: number;
      blocksChange: number;
      costChange: number;
    }>();

    // Sort by timestamp
    decisions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const decision of decisions) {
      // Get budget state for this hour
      const hourKey = decision.timestamp.toISOString().slice(0, 13);
      if (!budgetStateByHour.has(hourKey)) {
        budgetStateByHour.set(hourKey, new Map());
      }
      const budgetState = budgetStateByHour.get(hourKey)!;

      const simulated = simulateDecision(decision, request.policy, budgetState);
      simulatedDecisions.push(simulated);

      // Update feature stats
      const stats = featureStats.get(decision.feature) || {
        total: 0,
        changed: 0,
        originalBlocks: 0,
        simulatedBlocks: 0,
        originalCost: 0,
        simulatedCost: 0,
      };

      stats.total++;
      if (simulated.wouldChange) stats.changed++;
      if (decision.originalDecision === 'BLOCK') stats.originalBlocks++;
      if (simulated.simulatedDecision === 'BLOCK') stats.simulatedBlocks++;

      const cost = decision.outcome?.costCents || 0;
      stats.originalCost += decision.originalDecision !== 'BLOCK' ? cost : 0;
      stats.simulatedCost += simulated.simulatedDecision !== 'BLOCK' ? cost : 0;

      featureStats.set(decision.feature, stats);

      // Update hourly stats
      const hour = decision.timestamp.getHours();
      const hourStats = hourlyStats.get(hour) || { changed: 0, blocksChange: 0, costChange: 0 };
      if (simulated.wouldChange) hourStats.changed++;

      const blockChange = (simulated.simulatedDecision === 'BLOCK' ? 1 : 0) -
        (decision.originalDecision === 'BLOCK' ? 1 : 0);
      hourStats.blocksChange += blockChange;

      if (decision.originalDecision !== 'BLOCK' && simulated.simulatedDecision === 'BLOCK') {
        hourStats.costChange -= cost;
      } else if (decision.originalDecision === 'BLOCK' && simulated.simulatedDecision !== 'BLOCK') {
        hourStats.costChange += cost;
      }

      hourlyStats.set(hour, hourStats);
    }

    // Aggregate results
    const totalDecisions = decisions.length;
    const decisionsChanged = simulatedDecisions.filter(d => d.wouldChange).length;

    const originalBlocks = decisions.filter(d => d.originalDecision === 'BLOCK').length;
    const simulatedBlocks = simulatedDecisions.filter(d => d.simulatedDecision === 'BLOCK').length;

    const originalAllows = decisions.filter(d => d.originalDecision === 'ALLOW').length;
    const simulatedAllows = simulatedDecisions.filter(d => d.simulatedDecision === 'ALLOW').length;

    const originalWarns = decisions.filter(d => d.originalDecision === 'WARN').length;
    const simulatedWarns = simulatedDecisions.filter(d => d.simulatedDecision === 'WARN').length;

    // Predict outcomes
    const originalIncidents = decisions.filter(d => d.outcome?.hadIncident).length;
    // If we block more, we might prevent incidents. If we allow more, we might have more incidents.
    const incidentRate = originalAllows > 0 ? originalIncidents / originalAllows : 0;
    const newAllows = simulatedAllows - originalAllows;
    const predictedIncidents = Math.round(originalIncidents + (newAllows * incidentRate));

    const originalCost = decisions.reduce((sum, d) =>
      sum + (d.originalDecision !== 'BLOCK' ? (d.outcome?.costCents || 0) : 0), 0);
    const predictedCost = decisions.reduce((sum, d, i) =>
      sum + (simulatedDecisions[i].simulatedDecision !== 'BLOCK' ? (d.outcome?.costCents || 0) : 0), 0);

    const originalOverrides = decisions.filter(d => d.outcome?.wasOverridden).length;
    // If we allow more, fewer overrides needed. If we block more, more overrides might be needed.
    const overrideRate = originalBlocks > 0 ? originalOverrides / originalBlocks : 0;
    const newBlocks = simulatedBlocks - originalBlocks;
    const predictedOverrides = Math.round(Math.max(0, originalOverrides + (newBlocks * overrideRate)));

    // Build feature breakdown
    const featureBreakdown = new Map<GuardedFeature, FeatureSimulationResult>();
    for (const [feature, stats] of featureStats) {
      const riskScore = calculateRiskScore(stats);
      featureBreakdown.set(feature, {
        feature,
        totalDecisions: stats.total,
        decisionsChanged: stats.changed,
        blocksChange: stats.simulatedBlocks - stats.originalBlocks,
        costChange: stats.simulatedCost - stats.originalCost,
        riskScore,
      });
    }

    // Build hourly impact
    const hourlyImpact: HourlyImpact[] = [];
    for (let h = 0; h < 24; h++) {
      const stats = hourlyStats.get(h) || { changed: 0, blocksChange: 0, costChange: 0 };
      hourlyImpact.push({
        hour: h,
        decisionsChanged: stats.changed,
        blocksChange: stats.blocksChange,
        costChange: stats.costChange,
      });
    }

    // Generate findings
    const findings = generateFindings(
      decisionsChanged,
      totalDecisions,
      simulatedBlocks - originalBlocks,
      predictedCost - originalCost,
      predictedIncidents - originalIncidents,
      featureBreakdown
    );

    const result: SimulationResult = {
      id: simulationId,
      policyId: request.policy.id,
      policyName: request.policy.name,
      startedAt,
      completedAt: new Date(),
      inputRecords: decisions.length,
      timeRange: request.timeRange,
      features: Array.from(featureStats.keys()),
      comparison: {
        totalDecisions,
        decisionsChanged,
        changeRate: totalDecisions > 0 ? decisionsChanged / totalDecisions : 0,
        originalBlocks,
        simulatedBlocks,
        blocksChange: simulatedBlocks - originalBlocks,
        originalAllows,
        simulatedAllows,
        allowsChange: simulatedAllows - originalAllows,
        originalWarns,
        simulatedWarns,
        warnsChange: simulatedWarns - originalWarns,
        predictedIncidents,
        incidentChange: predictedIncidents - originalIncidents,
        predictedCostCents: predictedCost,
        costChange: predictedCost - originalCost,
        costChangePercent: originalCost > 0 ? ((predictedCost - originalCost) / originalCost) * 100 : 0,
        predictedOverrides,
        overrideChange: predictedOverrides - originalOverrides,
      },
      featureBreakdown,
      hourlyImpact,
      findings,
    };

    // Cache result (bounded)
    if (resultCache.size >= MAX_RESULTS) {
      const oldest = Array.from(resultCache.entries())
        .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)[0];
      if (oldest) resultCache.delete(oldest[0]);
    }
    resultCache.set(simulationId, {
      result,
      expiresAt: Date.now() + config.cacheResultsMs,
    });

    return result;
  } finally {
    activeSimulations.delete(simulationId);
  }
}

/**
 * Calculate risk score for a feature's policy change
 */
function calculateRiskScore(stats: {
  total: number;
  changed: number;
  originalBlocks: number;
  simulatedBlocks: number;
  originalCost: number;
  simulatedCost: number;
}): number {
  if (stats.total === 0) return 0;

  let risk = 0;

  // High change rate is risky
  const changeRate = stats.changed / stats.total;
  risk += changeRate * 0.3;

  // Reducing blocks significantly is risky (might allow more incidents)
  const blockReduction = stats.originalBlocks - stats.simulatedBlocks;
  if (blockReduction > 0) {
    risk += Math.min(0.4, (blockReduction / stats.total) * 2);
  }

  // Significant cost increase is risky
  if (stats.originalCost > 0) {
    const costIncrease = (stats.simulatedCost - stats.originalCost) / stats.originalCost;
    if (costIncrease > 0) {
      risk += Math.min(0.3, costIncrease * 0.5);
    }
  }

  return Math.min(1, risk);
}

/**
 * Generate simulation findings
 */
function generateFindings(
  decisionsChanged: number,
  totalDecisions: number,
  blocksChange: number,
  costChange: number,
  incidentChange: number,
  featureBreakdown: Map<GuardedFeature, FeatureSimulationResult>
): SimulationFinding[] {
  const findings: SimulationFinding[] = [];

  const changeRate = totalDecisions > 0 ? decisionsChanged / totalDecisions : 0;

  // Low change rate - policy is similar
  if (changeRate < 0.05) {
    findings.push({
      type: 'neutral',
      severity: 'low',
      message: 'Hypothetical policy would result in minimal changes (<5% of decisions affected)',
      metric: 'changeRate',
      currentValue: 0,
      simulatedValue: changeRate * 100,
    });
  }

  // High change rate - significant impact
  if (changeRate > 0.3) {
    findings.push({
      type: 'risk',
      severity: 'high',
      message: `Hypothetical policy would change ${(changeRate * 100).toFixed(0)}% of decisions - significant operational impact`,
      metric: 'changeRate',
      currentValue: 0,
      simulatedValue: changeRate * 100,
    });
  }

  // Cost savings opportunity
  if (costChange < -100) {
    findings.push({
      type: 'opportunity',
      severity: costChange < -1000 ? 'high' : 'medium',
      message: `Policy could save ${Math.abs(costChange)} cents by blocking more requests`,
      metric: 'costChange',
      currentValue: 0,
      simulatedValue: costChange,
    });
  }

  // Cost increase risk
  if (costChange > 100) {
    findings.push({
      type: 'risk',
      severity: costChange > 1000 ? 'high' : 'medium',
      message: `Policy would increase costs by ${costChange} cents by allowing more requests`,
      metric: 'costChange',
      currentValue: 0,
      simulatedValue: costChange,
    });
  }

  // Incident risk
  if (incidentChange > 0) {
    findings.push({
      type: 'risk',
      severity: incidentChange > 5 ? 'high' : 'medium',
      message: `Policy might lead to ${incidentChange} additional incidents based on historical patterns`,
      metric: 'incidentChange',
      currentValue: 0,
      simulatedValue: incidentChange,
    });
  }

  // Incident reduction opportunity
  if (incidentChange < 0) {
    findings.push({
      type: 'opportunity',
      severity: 'medium',
      message: `Policy might prevent ${Math.abs(incidentChange)} incidents by blocking more risky requests`,
      metric: 'incidentChange',
      currentValue: 0,
      simulatedValue: incidentChange,
    });
  }

  // Feature-specific findings
  for (const [feature, stats] of featureBreakdown) {
    if (stats.riskScore > 0.7) {
      findings.push({
        type: 'risk',
        severity: 'high',
        feature,
        message: `High-risk change for ${feature}: ${stats.decisionsChanged} decisions would change (${(stats.decisionsChanged / stats.totalDecisions * 100).toFixed(0)}%)`,
        metric: 'riskScore',
        currentValue: 0,
        simulatedValue: stats.riskScore * 100,
      });
    }
  }

  return findings;
}

/**
 * Get cached simulation result
 */
export function getSimulationResult(id: string): SimulationResult | null {
  const cached = resultCache.get(id);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    resultCache.delete(id);
    return null;
  }
  return cached.result;
}

/**
 * List recent simulation results
 */
export function listSimulationResults(): SimulationResult[] {
  const now = Date.now();
  const results: SimulationResult[] = [];

  for (const [id, cached] of resultCache) {
    if (cached.expiresAt < now) {
      resultCache.delete(id);
    } else {
      results.push(cached.result);
    }
  }

  return results.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
}

/**
 * Clear simulation cache
 */
export function clearSimulationCache(): void {
  resultCache.clear();
}

/**
 * Get active simulation count
 */
export function getActiveSimulationCount(): number {
  return activeSimulations.size;
}
