/**
 * Policy Drift Detector - Core Logic
 * Detects when policies are misaligned with operational reality
 */

import {
  DriftSignal,
  DriftType,
  DriftSeverity,
  FeatureDriftAnalysis,
  DriftDetectionResult,
  DriftDetectorConfig,
  DEFAULT_DRIFT_DETECTOR_CONFIG,
} from "./types";
import { GuardedFeature } from "../enforcement/types";
import { getOutcomes } from "../learning/engine";

// Bounded storage
const MAX_SIGNALS = 200;
const MAX_RESULTS = 10;

const signalStore = new Map<string, DriftSignal>();
const resultStore = new Map<string, DriftDetectionResult>();

function getConfig(): DriftDetectorConfig {
  return {
    ...DEFAULT_DRIFT_DETECTOR_CONFIG,
    enabled: process.env.ENABLE_AUTONOMY_DRIFT_DETECTOR === "true",
  };
}

/**
 * Analyze a single feature for drift
 */
type CurrentMetrics = ReturnType<typeof computeCurrentMetrics>;

function computeRelativeChange(currentValue: number, baselineValue: number): number {
  if (baselineValue > 0) return (currentValue - baselineValue) / baselineValue;
  if (currentValue > 0) return 1;
  return 0;
}

function detectBudgetDrifts(
  currentMetrics: CurrentMetrics,
  config: DriftDetectorConfig,
  feature: GuardedFeature,
  dataPoints: number
): DriftSignal[] {
  const drifts: DriftSignal[] = [];
  const windowHours = config.analysisWindowHours;

  if (currentMetrics.exhaustionRate > config.thresholds.budgetExhaustionRate) {
    const threshold = config.thresholds.budgetExhaustionRate;
    drifts.push(
      createDriftSignal(
        "budget_exhaustion",
        feature,
        {
          metric: "exhaustionRate",
          currentValue: currentMetrics.exhaustionRate,
          expectedValue: threshold,
          deviation: ((currentMetrics.exhaustionRate - threshold) / threshold) * 100,
          trend: "increasing",
          windowHours,
        },
        dataPoints
      )
    );
  }

  const underutilThreshold = 1 - config.thresholds.budgetUnderutilizationRate;
  if (currentMetrics.budgetUtilization < underutilThreshold) {
    drifts.push(
      createDriftSignal(
        "budget_underutilization",
        feature,
        {
          metric: "budgetUtilization",
          currentValue: currentMetrics.budgetUtilization,
          expectedValue: underutilThreshold,
          deviation:
            ((underutilThreshold - currentMetrics.budgetUtilization) / underutilThreshold) * 100,
          trend: "decreasing",
          windowHours,
        },
        dataPoints
      )
    );
  }

  return drifts;
}

function detectBaselineDrifts(
  currentMetrics: CurrentMetrics,
  baselineMetrics: CurrentMetrics,
  config: DriftDetectorConfig,
  feature: GuardedFeature,
  dataPoints: number
): DriftSignal[] {
  const drifts: DriftSignal[] = [];
  const windowHours = config.analysisWindowHours;

  // Override spike
  const overrideChange = computeRelativeChange(
    currentMetrics.overrideRate,
    baselineMetrics.overrideRate
  );
  if (overrideChange > config.thresholds.overrideSpikeThreshold) {
    drifts.push(
      createDriftSignal(
        "override_spike",
        feature,
        {
          metric: "overrideRate",
          currentValue: currentMetrics.overrideRate,
          expectedValue: baselineMetrics.overrideRate,
          deviation: overrideChange * 100,
          trend: "increasing",
          windowHours,
        },
        dataPoints,
        baselineMetrics.overrideRate
      )
    );
  }

  // Incident spike
  const incidentChange = computeRelativeChange(
    currentMetrics.incidentRate,
    baselineMetrics.incidentRate
  );
  if (incidentChange > config.thresholds.incidentSpikeThreshold) {
    drifts.push(
      createDriftSignal(
        "incident_spike",
        feature,
        {
          metric: "incidentRate",
          currentValue: currentMetrics.incidentRate,
          expectedValue: baselineMetrics.incidentRate,
          deviation: incidentChange * 100,
          trend: "increasing",
          windowHours,
        },
        dataPoints,
        baselineMetrics.incidentRate
      )
    );
  }

  // Cost drift
  const costChange =
    baselineMetrics.avgCostPerAction > 0
      ? Math.abs(currentMetrics.avgCostPerAction - baselineMetrics.avgCostPerAction) /
        baselineMetrics.avgCostPerAction
      : 0;
  if (costChange > config.thresholds.costDriftThreshold) {
    drifts.push(
      createDriftSignal(
        "cost_drift",
        feature,
        {
          metric: "avgCostPerAction",
          currentValue: currentMetrics.avgCostPerAction,
          expectedValue: baselineMetrics.avgCostPerAction,
          deviation: costChange * 100,
          trend:
            currentMetrics.avgCostPerAction > baselineMetrics.avgCostPerAction
              ? "increasing"
              : "decreasing",
          windowHours,
        },
        dataPoints,
        baselineMetrics.avgCostPerAction
      )
    );
  }

  // Latency degradation
  const latencyChange =
    baselineMetrics.avgLatencyMs > 0
      ? (currentMetrics.avgLatencyMs - baselineMetrics.avgLatencyMs) / baselineMetrics.avgLatencyMs
      : 0;
  if (latencyChange > config.thresholds.latencyDegradationThreshold) {
    drifts.push(
      createDriftSignal(
        "latency_degradation",
        feature,
        {
          metric: "avgLatencyMs",
          currentValue: currentMetrics.avgLatencyMs,
          expectedValue: baselineMetrics.avgLatencyMs,
          deviation: latencyChange * 100,
          trend: "increasing",
          windowHours,
        },
        dataPoints,
        baselineMetrics.avgLatencyMs
      )
    );
  }

  return drifts;
}

export function analyzeFeatureForDrift(
  feature: GuardedFeature,
  config: DriftDetectorConfig = getConfig()
): FeatureDriftAnalysis {
  const now = new Date();
  const analysisStart = new Date(now.getTime() - config.analysisWindowHours * 60 * 60 * 1000);
  const baselineStart = new Date(
    analysisStart.getTime() - config.baselineWindowHours * 60 * 60 * 1000
  );

  const currentOutcomes = getOutcomes({ feature, since: analysisStart, until: now } as any);
  const baselineOutcomes = getOutcomes({
    feature,
    since: baselineStart,
    until: analysisStart,
  } as any);

  const currentMetrics = computeCurrentMetrics(currentOutcomes);
  const baselineMetrics =
    baselineOutcomes.length >= config.minDataPointsForAnalysis
      ? computeCurrentMetrics(baselineOutcomes)
      : undefined;

  let drifts: DriftSignal[] = [];

  if (currentOutcomes.length >= config.minDataPointsForAnalysis) {
    drifts = detectBudgetDrifts(currentMetrics, config, feature, currentOutcomes.length);
    if (baselineMetrics) {
      drifts.push(
        ...detectBaselineDrifts(
          currentMetrics,
          baselineMetrics,
          config,
          feature,
          currentOutcomes.length
        )
      );
    }
  }

  return {
    feature,
    analyzedAt: now,
    windowHours: config.analysisWindowHours,
    dataPoints: currentOutcomes.length,
    metrics: currentMetrics,
    baseline: baselineMetrics
      ? {
          windowHours: config.baselineWindowHours,
          budgetUtilization: baselineMetrics.budgetUtilization,
          overrideRate: baselineMetrics.overrideRate,
          incidentRate: baselineMetrics.incidentRate,
          avgCostPerAction: baselineMetrics.avgCostPerAction,
          avgLatencyMs: baselineMetrics.avgLatencyMs,
        }
      : undefined,
    drifts,
    healthScore: calculateHealthScore(currentMetrics, drifts),
  };
}

/**
 * Run drift detection across all features
 */
export function runDriftDetection(features: GuardedFeature[]): DriftDetectionResult {
  const config = getConfig();
  const startTime = Date.now();

  const featureAnalyses: FeatureDriftAnalysis[] = [];
  const allSignals: DriftSignal[] = [];

  for (const feature of features) {
    const analysis = analyzeFeatureForDrift(feature, config);
    featureAnalyses.push(analysis);

    // Store signals (bounded per feature)
    const featureSignals = analysis.drifts.slice(0, config.maxSignalsPerFeature);
    allSignals.push(...featureSignals);

    for (const signal of featureSignals) {
      storeSignal(signal);
    }
  }

  // Categorize features
  const healthyFeatures: GuardedFeature[] = [];
  const driftingFeatures: GuardedFeature[] = [];
  const criticalFeatures: GuardedFeature[] = [];

  for (const analysis of featureAnalyses) {
    const criticalDrifts = analysis.drifts.filter(d => d.severity === "critical");
    const highDrifts = analysis.drifts.filter(d => d.severity === "high");

    if (criticalDrifts.length > 0) {
      criticalFeatures.push(analysis.feature);
    } else if (highDrifts.length > 0 || analysis.drifts.length > 2) {
      driftingFeatures.push(analysis.feature);
    } else if (analysis.healthScore > 0.7) {
      healthyFeatures.push(analysis.feature);
    } else {
      driftingFeatures.push(analysis.feature);
    }
  }

  const criticalDrifts = allSignals.filter(s => s.severity === "critical").length;
  const overallHealthScore =
    featureAnalyses.length > 0
      ? featureAnalyses.reduce((sum, a) => sum + a.healthScore, 0) / featureAnalyses.length
      : 1;

  const result: DriftDetectionResult = {
    id: `drift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ranAt: new Date(),
    duration: Date.now() - startTime,
    featuresAnalyzed: features.length,
    driftsDetected: allSignals.length,
    criticalDrifts,
    signals: allSignals,
    featureAnalyses,
    summary: {
      healthyFeatures,
      driftingFeatures,
      criticalFeatures,
      overallHealthScore,
    },
  };

  // Store result (bounded)
  if (resultStore.size >= MAX_RESULTS) {
    const oldest = Array.from(resultStore.entries()).sort(
      ([, a], [, b]) => a.ranAt.getTime() - b.ranAt.getTime()
    )[0];
    if (oldest) resultStore.delete(oldest[0]);
  }
  resultStore.set(result.id, result);

  return result;
}

/**
 * Compute metrics from outcomes
 */
function computeCurrentMetrics(
  outcomes: Array<{
    decision: string;
    outcome: string;
    latencyMs: number;
    metadata?: Record<string, unknown>;
  }>
): {
  budgetUtilization: number;
  exhaustionRate: number;
  overrideRate: number;
  incidentRate: number;
  avgCostPerAction: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
} {
  if (outcomes.length === 0) {
    return {
      budgetUtilization: 0,
      exhaustionRate: 0,
      overrideRate: 0,
      incidentRate: 0,
      avgCostPerAction: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
    };
  }

  const blocks = outcomes.filter(o => o.decision === "BLOCK").length;
  const overrides = outcomes.filter(o => o.outcome === "override_applied").length;
  const incidents = outcomes.filter(
    o => o.outcome === "incident_after_allow" || o.outcome === "recovery_failed"
  ).length;

  const latencies = outcomes.map(o => o.latencyMs).sort((a, b) => a - b);
  const costs = outcomes.map(o => (o.metadata?.cost as number) || 0);
  const totalCost = costs.reduce((a, b) => a + b, 0);

  // Estimate budget utilization from block rate (inverse relationship)
  const blockRate = blocks / outcomes.length;
  const budgetUtilization = 1 - blockRate;

  // Exhaustion rate: assume blocks due to budget are exhaustion events
  const exhaustionRate = blockRate > 0.3 ? blockRate - 0.1 : 0;

  return {
    budgetUtilization,
    exhaustionRate,
    overrideRate: overrides / outcomes.length,
    incidentRate: incidents / outcomes.length,
    avgCostPerAction: totalCost / outcomes.length,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] || 0,
  };
}

/**
 * Create a drift signal with appropriate severity and recommendations
 */
function createDriftSignal(
  type: DriftType,
  feature: GuardedFeature,
  observation: DriftSignal["observation"],
  dataPoints: number,
  baselineValue?: number
): DriftSignal {
  const severity = calculateSeverity(type, observation.deviation);
  const recommendation = generateRecommendation(type, severity, observation);
  const confidence = Math.min(0.95, 0.5 + (dataPoints / 1000) * 0.3);

  return {
    id: `drift-${type}-${feature}-${Date.now()}`,
    type,
    severity,
    feature,
    detectedAt: new Date(),
    observation,
    context: {
      dataPoints,
      confidence,
    },
    recommendation,
    status: "new",
  };
}

/**
 * Calculate severity based on drift type and deviation
 */
function calculateSeverity(type: DriftType, deviation: number): DriftSeverity {
  const absDeviation = Math.abs(deviation);

  // Critical thresholds by type
  const criticalThresholds: Record<DriftType, number> = {
    budget_exhaustion: 80,
    budget_underutilization: 90,
    override_spike: 100,
    incident_spike: 50,
    cost_drift: 100,
    latency_degradation: 200,
    traffic_shift: 200,
    accuracy_decline: 30,
  };

  const highThresholds: Record<DriftType, number> = {
    budget_exhaustion: 50,
    budget_underutilization: 70,
    override_spike: 75,
    incident_spike: 30,
    cost_drift: 60,
    latency_degradation: 100,
    traffic_shift: 100,
    accuracy_decline: 20,
  };

  const mediumThresholds: Record<DriftType, number> = {
    budget_exhaustion: 30,
    budget_underutilization: 50,
    override_spike: 50,
    incident_spike: 15,
    cost_drift: 30,
    latency_degradation: 50,
    traffic_shift: 50,
    accuracy_decline: 10,
  };

  if (absDeviation >= criticalThresholds[type]) return "critical";
  if (absDeviation >= highThresholds[type]) return "high";
  if (absDeviation >= mediumThresholds[type]) return "medium";
  return "low";
}

/**
 * Generate recommendation for a drift signal
 */
function generateRecommendation(
  type: DriftType,
  severity: DriftSeverity,
  observation: DriftSignal["observation"]
): DriftSignal["recommendation"] {
  const urgencyMap: Record<DriftSeverity, "immediate" | "soon" | "scheduled" | "optional"> = {
    critical: "immediate",
    high: "soon",
    medium: "scheduled",
    low: "optional",
  };

  switch (type) {
    case "budget_exhaustion":
      return {
        action: "increase_budget",
        suggestedValue: Math.ceil(observation.currentValue * 1.5 * 100), // 50% increase
        urgency: urgencyMap[severity],
        reason: `Budget is exhausted in ${observation.currentValue * 100}% of periods. Consider increasing limits.`,
      };

    case "budget_underutilization":
      return {
        action: "decrease_budget",
        suggestedValue: Math.ceil(observation.currentValue * 1.2 * 100), // Reduce to 120% of actual usage
        urgency: urgencyMap[severity],
        reason: `Only ${(observation.currentValue * 100).toFixed(0)}% of budget is being used. Consider reducing limits to save costs.`,
      };

    case "override_spike":
      return {
        action: "review_policy",
        urgency: urgencyMap[severity],
        reason: `Override rate increased by ${observation.deviation.toFixed(0)}%. Policies may be too restrictive.`,
      };

    case "incident_spike":
      return {
        action: "investigate",
        urgency: urgencyMap[severity],
        reason: `Incident rate increased by ${observation.deviation.toFixed(0)}%. Investigate root cause.`,
      };

    case "cost_drift":
      return {
        action: observation.trend === "increasing" ? "review_policy" : "no_action",
        urgency: urgencyMap[severity],
        reason: `Costs have ${observation.trend === "increasing" ? "increased" : "decreased"} by ${observation.deviation.toFixed(0)}% from baseline.`,
      };

    case "latency_degradation":
      return {
        action: "investigate",
        urgency: urgencyMap[severity],
        reason: `Latency has increased by ${observation.deviation.toFixed(0)}%. May indicate system issues.`,
      };

    case "traffic_shift":
      return {
        action: "review_policy",
        urgency: urgencyMap[severity],
        reason: `Traffic volume changed by ${observation.deviation.toFixed(0)}%. Budgets may need adjustment.`,
      };

    case "accuracy_decline":
      return {
        action: "review_policy",
        urgency: urgencyMap[severity],
        reason: `Decision accuracy declined by ${observation.deviation.toFixed(0)}%. Policies may need tuning.`,
      };

    default:
      return {
        action: "investigate",
        urgency: "scheduled",
        reason: "Unexpected drift detected. Manual investigation recommended.",
      };
  }
}

/**
 * Calculate health score for a feature
 */
function calculateHealthScore(
  metrics: {
    budgetUtilization: number;
    exhaustionRate: number;
    overrideRate: number;
    incidentRate: number;
  },
  drifts: DriftSignal[]
): number {
  let score = 1;

  // Penalize for drift signals
  for (const drift of drifts) {
    switch (drift.severity) {
      case "critical":
        score -= 0.3;
        break;
      case "high":
        score -= 0.2;
        break;
      case "medium":
        score -= 0.1;
        break;
      case "low":
        score -= 0.05;
        break;
    }
  }

  // Penalize for high override rate
  if (metrics.overrideRate > 0.1) {
    score -= (metrics.overrideRate - 0.1) * 2;
  }

  // Penalize for high incident rate
  if (metrics.incidentRate > 0.05) {
    score -= (metrics.incidentRate - 0.05) * 3;
  }

  // Penalize for budget exhaustion
  if (metrics.exhaustionRate > 0.2) {
    score -= metrics.exhaustionRate - 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Store a signal (bounded)
 */
function storeSignal(signal: DriftSignal): void {
  if (signalStore.size >= MAX_SIGNALS) {
    // Remove oldest resolved or dismissed signals first
    const resolved = Array.from(signalStore.entries())
      .filter(([, s]) => s.status === "resolved" || s.status === "dismissed")
      .sort(([, a], [, b]) => a.detectedAt.getTime() - b.detectedAt.getTime());

    if (resolved.length > 0) {
      signalStore.delete(resolved[0][0]);
    } else {
      // Remove oldest signal
      const oldest = Array.from(signalStore.entries()).sort(
        ([, a], [, b]) => a.detectedAt.getTime() - b.detectedAt.getTime()
      )[0];
      if (oldest) signalStore.delete(oldest[0]);
    }
  }
  signalStore.set(signal.id, signal);
}

/**
 * Get all signals
 */
export function getSignals(filter?: {
  feature?: GuardedFeature;
  type?: DriftType;
  severity?: DriftSeverity;
  status?: DriftSignal["status"];
}): DriftSignal[] {
  let signals = Array.from(signalStore.values());

  if (filter?.feature) {
    signals = signals.filter(s => s.feature === filter.feature);
  }
  if (filter?.type) {
    signals = signals.filter(s => s.type === filter.type);
  }
  if (filter?.severity) {
    signals = signals.filter(s => s.severity === filter.severity);
  }
  if (filter?.status) {
    signals = signals.filter(s => s.status === filter.status);
  }

  return signals.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
}

/**
 * Update signal status
 */
export function updateSignalStatus(
  id: string,
  status: DriftSignal["status"],
  acknowledgedBy?: string
): DriftSignal | null {
  const signal = signalStore.get(id);
  if (!signal) return null;

  signal.status = status;

  if (status === "acknowledged" || status === "investigating") {
    signal.acknowledgedBy = acknowledgedBy;
    signal.acknowledgedAt = new Date();
  }

  if (status === "resolved") {
    signal.resolvedAt = new Date();
  }

  signalStore.set(id, signal);
  return signal;
}

/**
 * Get drift detection results
 */
export function getDetectionResults(): DriftDetectionResult[] {
  return Array.from(resultStore.values()).sort((a, b) => b.ranAt.getTime() - a.ranAt.getTime());
}

/**
 * Get latest detection result
 */
export function getLatestDetectionResult(): DriftDetectionResult | null {
  const results = getDetectionResults();
  return results[0] || null;
}

/**
 * Clear all drift data
 */
export function clearDriftData(): void {
  signalStore.clear();
  resultStore.clear();
}
