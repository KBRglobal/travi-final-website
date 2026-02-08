/**
 * Autonomy Learning Engine - Core Logic
 * Ingests decisions, tracks outcomes, produces recommendations
 */

import {
  OutcomeRecord,
  LearningMetrics,
  FeatureLearning,
  LearningPattern,
  LearningRecommendation,
  DecisionOutcome,
  DEFAULT_LEARNING_CONFIG,
  LearningConfig,
  AggregationWindow,
  RecommendationType,
} from "./types";
import { GuardedFeature } from "../enforcement/types";
import { PolicyDecision } from "../policy/types";

// Bounded in-memory storage
const MAX_OUTCOMES = 10000;
const MAX_PATTERNS = 100;
const MAX_RECOMMENDATIONS = 50;

const outcomeStore: OutcomeRecord[] = [];
const patternStore = new Map<string, LearningPattern>();
const recommendationStore = new Map<string, LearningRecommendation>();
const metricsCache = new Map<string, { metrics: LearningMetrics; expiresAt: number }>();

const METRICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getConfig(): LearningConfig {
  return {
    ...DEFAULT_LEARNING_CONFIG,
    enabled: process.env.ENABLE_AUTONOMY_LEARNING === "true",
  };
}

/**
 * Record a decision outcome
 */
export function recordOutcome(outcome: Omit<OutcomeRecord, "latencyMs">): void {
  if (!getConfig().enabled) return;

  const record: OutcomeRecord = {
    ...outcome,
    latencyMs: outcome.outcomeAt.getTime() - outcome.decisionAt.getTime(),
  };

  // Bounded storage
  if (outcomeStore.length >= MAX_OUTCOMES) {
    outcomeStore.shift();
  }
  outcomeStore.push(record);
}

/**
 * Get outcomes for analysis
 */
export function getOutcomes(filter?: {
  feature?: GuardedFeature;
  decision?: PolicyDecision;
  outcome?: DecisionOutcome;
  since?: Date;
  limit?: number;
}): OutcomeRecord[] {
  let results = [...outcomeStore];

  if (filter?.feature) {
    results = results.filter(o => o.feature === filter.feature);
  }
  if (filter?.decision) {
    results = results.filter(o => o.decision === filter.decision);
  }
  if (filter?.outcome) {
    results = results.filter(o => o.outcome === filter.outcome);
  }
  if (filter?.since) {
    results = results.filter(o => o.decisionAt >= filter.since!);
  }

  return results.slice(-(filter?.limit || 1000));
}

/**
 * Compute learning metrics for a time window
 */
interface ConfusionMatrix {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  overrides: number;
  degradedRecoveries: number;
  degradedTotal: number;
}

function computeConfusionMatrix(outcomes: OutcomeRecord[]): ConfusionMatrix {
  const matrix: ConfusionMatrix = {
    tp: 0,
    tn: 0,
    fp: 0,
    fn: 0,
    overrides: 0,
    degradedRecoveries: 0,
    degradedTotal: 0,
  };

  for (const o of outcomes) {
    switch (o.outcome) {
      case "confirmed_correct":
        if (o.decision === "BLOCK") matrix.tp++;
        else matrix.tn++;
        break;
      case "override_applied":
        matrix.fp++;
        matrix.overrides++;
        break;
      case "incident_after_allow":
        matrix.fn++;
        break;
      case "recovery_success":
        matrix.degradedRecoveries++;
        matrix.degradedTotal++;
        matrix.tn++;
        break;
      case "recovery_failed":
        matrix.degradedTotal++;
        matrix.fn++;
        break;
    }
  }

  return matrix;
}

function safeDiv(numerator: number, denominator: number, fallback: number = 1): number {
  const result = numerator / (denominator || 1);
  return Number.isNaN(result) ? fallback : result;
}

export function computeMetrics(
  window: AggregationWindow,
  feature?: GuardedFeature
): LearningMetrics {
  const cacheKey = `${window.start.toISOString()}-${window.end.toISOString()}-${feature || "all"}`;
  const cached = metricsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.metrics;
  }

  const outcomes = getOutcomes({
    feature,
    since: window.start,
  }).filter(o => o.decisionAt <= window.end);

  const m = computeConfusionMatrix(outcomes);
  const total = outcomes.length || 1;

  const accuracy = safeDiv(m.tp + m.tn, total);
  const precision = safeDiv(m.tp, m.tp + m.fp);
  const recall = safeDiv(m.tp, m.tp + m.fn);
  const f1Score = safeDiv(2 * (precision * recall), precision + recall);

  const metrics: LearningMetrics = {
    period: { start: window.start, end: window.end },
    totalDecisions: outcomes.length,
    truePositives: m.tp,
    trueNegatives: m.tn,
    falsePositives: m.fp,
    falseNegatives: m.fn,
    accuracy,
    precision,
    recall,
    f1Score,
    overBlockingRate: m.fp / total,
    incidentRate: m.fn / total,
    overrideRate: m.overrides / total,
    degradedRecoveryRate: m.degradedTotal > 0 ? m.degradedRecoveries / m.degradedTotal : 1,
  };

  // Cache
  if (metricsCache.size >= 100) {
    const firstKey = metricsCache.keys().next().value;
    if (firstKey) metricsCache.delete(firstKey);
  }
  metricsCache.set(cacheKey, { metrics, expiresAt: Date.now() + METRICS_CACHE_TTL });

  return metrics;
}

/**
 * Detect patterns in learning data
 */
export function detectPatterns(
  feature: GuardedFeature,
  window: AggregationWindow
): LearningPattern[] {
  const config = getConfig();
  const outcomes = getOutcomes({ feature, since: window.start });
  const patterns: LearningPattern[] = [];

  // Pattern 1: Time clustering
  const timeCluster = detectTimeCluster(outcomes);
  if (timeCluster && timeCluster.confidence >= config.patternConfidenceThreshold) {
    patterns.push(timeCluster);
  }

  // Pattern 2: Override patterns
  const overridePattern = detectOverridePattern(outcomes);
  if (overridePattern && overridePattern.confidence >= config.patternConfidenceThreshold) {
    patterns.push(overridePattern);
  }

  // Pattern 3: Budget exhaustion patterns
  const exhaustionPattern = detectExhaustionPattern(outcomes);
  if (exhaustionPattern && exhaustionPattern.confidence >= config.patternConfidenceThreshold) {
    patterns.push(exhaustionPattern);
  }

  // Pattern 4: Degraded frequency
  const degradedPattern = detectDegradedPattern(outcomes);
  if (degradedPattern && degradedPattern.confidence >= config.patternConfidenceThreshold) {
    patterns.push(degradedPattern);
  }

  // Store patterns (bounded)
  for (const pattern of patterns.slice(0, config.maxPatternsPerFeature)) {
    const key = `${feature}:${pattern.type}:${pattern.id}`;
    if (patternStore.size >= MAX_PATTERNS) {
      const oldest = Array.from(patternStore.entries()).sort(
        ([, a], [, b]) => a.lastSeen.getTime() - b.lastSeen.getTime()
      )[0];
      if (oldest) patternStore.delete(oldest[0]);
    }
    patternStore.set(key, pattern);
  }

  return patterns;
}

/**
 * Generate recommendations based on patterns and metrics
 */
interface MakeRecommendationOptions {
  id: string;
  type: RecommendationType;
  priority: "critical" | "high" | "medium" | "low";
  confidence: number;
  description: string;
  rationale: string;
  suggestedChange: LearningRecommendation["suggestedChange"];
  estimatedImpact: LearningRecommendation["estimatedImpact"];
  now: Date;
}

function makeRecommendation(opts: MakeRecommendationOptions): LearningRecommendation {
  return {
    id: opts.id,
    type: opts.type,
    priority: opts.priority,
    confidence: opts.confidence,
    description: opts.description,
    rationale: opts.rationale,
    suggestedChange: opts.suggestedChange,
    estimatedImpact: opts.estimatedImpact,
    createdAt: opts.now,
    expiresAt: new Date(opts.now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: "pending",
  };
}

function buildLoosenRecommendation(
  feature: GuardedFeature,
  metrics: LearningMetrics,
  threshold: number,
  now: Date
): LearningRecommendation | null {
  if (metrics.falsePositives === 0 || metrics.overBlockingRate <= 0.1) return null;
  const confidence = Math.min(0.95, 0.5 + metrics.overBlockingRate);
  if (confidence < threshold) return null;

  return makeRecommendation({
    id: `rec-loosen-${feature}-${now.getTime()}`,
    type: "loosen_budget",
    priority: metrics.overBlockingRate > 0.3 ? "high" : "medium",
    confidence,
    description: `Consider loosening budget for ${feature}`,
    rationale: `${(metrics.overBlockingRate * 100).toFixed(1)}% of blocks were overridden, suggesting over-blocking`,
    suggestedChange: {
      targetFeature: feature,
      field: "budgetLimits.maxActions",
      currentValue: 100,
      suggestedValue: Math.round(100 * (1 + metrics.overBlockingRate)),
      delta: metrics.overBlockingRate,
    },
    estimatedImpact: {
      blocksChange: -metrics.overBlockingRate * 100,
      incidentsChange: 5,
      costChange: 10,
      overridesChange: -50,
      confidence: confidence * 0.8,
    },
    now,
  });
}

function buildTightenRecommendation(
  feature: GuardedFeature,
  metrics: LearningMetrics,
  threshold: number,
  now: Date
): LearningRecommendation | null {
  if (metrics.falseNegatives === 0 || metrics.incidentRate <= 0.05) return null;
  const confidence = Math.min(0.95, 0.6 + metrics.incidentRate * 2);
  if (confidence < threshold) return null;

  return makeRecommendation({
    id: `rec-tighten-${feature}-${now.getTime()}`,
    type: "tighten_budget",
    priority: metrics.incidentRate > 0.15 ? "critical" : "high",
    confidence,
    description: `Consider tightening budget for ${feature}`,
    rationale: `${(metrics.incidentRate * 100).toFixed(1)}% of allowed operations caused incidents`,
    suggestedChange: {
      targetFeature: feature,
      field: "budgetLimits.maxActions",
      currentValue: 100,
      suggestedValue: Math.round(100 * (1 - metrics.incidentRate)),
      delta: -metrics.incidentRate,
    },
    estimatedImpact: {
      blocksChange: 20,
      incidentsChange: -metrics.incidentRate * 100,
      costChange: -15,
      overridesChange: 10,
      confidence: confidence * 0.85,
    },
    now,
  });
}

function buildTimeWindowRecommendation(
  feature: GuardedFeature,
  patterns: LearningPattern[],
  threshold: number,
  now: Date
): LearningRecommendation | null {
  const timePattern = patterns.find(p => p.type === "time_cluster");
  if (!timePattern || timePattern.confidence < threshold) return null;

  return makeRecommendation({
    id: `rec-window-${feature}-${now.getTime()}`,
    type: "shorten_window",
    priority: "medium",
    confidence: timePattern.confidence,
    description: `Adjust time window for ${feature}`,
    rationale: timePattern.description,
    suggestedChange: {
      targetFeature: feature,
      field: "allowedHours",
      currentValue: { startHour: 0, endHour: 24 },
      suggestedValue: { startHour: 9, endHour: 18 },
    },
    estimatedImpact: {
      blocksChange: -10,
      incidentsChange: 0,
      costChange: -20,
      overridesChange: -15,
      confidence: timePattern.confidence * 0.7,
    },
    now,
  });
}

function storeRecommendations(recommendations: LearningRecommendation[], max: number): void {
  for (const rec of recommendations.slice(0, max)) {
    if (recommendationStore.size >= MAX_RECOMMENDATIONS) {
      const oldest = Array.from(recommendationStore.entries()).sort(
        ([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime()
      )[0];
      if (oldest) recommendationStore.delete(oldest[0]);
    }
    recommendationStore.set(rec.id, rec);
  }
}

export function generateRecommendations(
  feature: GuardedFeature,
  metrics: LearningMetrics,
  patterns: LearningPattern[]
): LearningRecommendation[] {
  const config = getConfig();
  const now = new Date();
  const threshold = config.recommendationConfidenceThreshold;

  const recommendations: LearningRecommendation[] = [];

  const loosen = buildLoosenRecommendation(feature, metrics, threshold, now);
  if (loosen) recommendations.push(loosen);

  const tighten = buildTightenRecommendation(feature, metrics, threshold, now);
  if (tighten) recommendations.push(tighten);

  const timeWindow = buildTimeWindowRecommendation(feature, patterns, threshold, now);
  if (timeWindow) recommendations.push(timeWindow);

  storeRecommendations(recommendations, config.maxRecommendationsPerFeature);

  return recommendations;
}

/**
 * Get full learning analysis for a feature
 */
export function analyzeFeature(
  feature: GuardedFeature,
  window?: AggregationWindow
): FeatureLearning {
  const now = new Date();
  const analysisWindow = window || {
    start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    end: now,
    granularity: "hour" as const,
  };

  const metrics = computeMetrics(analysisWindow, feature);
  const patterns = detectPatterns(feature, analysisWindow);
  const recommendations = generateRecommendations(feature, metrics, patterns);

  return { feature, metrics, patterns, recommendations };
}

/**
 * Get all pending recommendations
 */
export function getPendingRecommendations(): LearningRecommendation[] {
  const now = new Date();
  return Array.from(recommendationStore.values())
    .filter(r => r.status === "pending" && r.expiresAt > now)
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Update recommendation status
 */
export function updateRecommendationStatus(id: string, status: "applied" | "rejected"): boolean {
  const rec = recommendationStore.get(id);
  if (!rec) return false;
  rec.status = status;
  return true;
}

// Pattern detection helpers

function detectTimeCluster(outcomes: OutcomeRecord[]): LearningPattern | null {
  if (outcomes.length < 20) return null;

  const hourCounts = new Array(24).fill(0);
  for (const o of outcomes) {
    if (o.decision === "BLOCK") {
      hourCounts[o.decisionAt.getHours()]++;
    }
  }

  const total = hourCounts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
  const maxCount = hourCounts[maxHour];
  const concentration = maxCount / total;

  if (concentration < 0.2) return null;

  return {
    id: `time-${maxHour}`,
    type: "time_cluster",
    description: `${(concentration * 100).toFixed(0)}% of blocks occur at hour ${maxHour}:00`,
    confidence: Math.min(0.95, concentration + 0.3),
    significance: concentration,
    firstDetected: new Date(),
    lastSeen: new Date(),
    occurrences: maxCount,
    evidence: [{ timestamp: new Date(), dataPoint: `hour_${maxHour}`, value: maxCount }],
  };
}

function detectOverridePattern(outcomes: OutcomeRecord[]): LearningPattern | null {
  const overrides = outcomes.filter(o => o.outcome === "override_applied");
  if (overrides.length < 5) return null;

  const targetCounts = new Map<string, number>();
  for (const o of overrides) {
    targetCounts.set(o.targetKey, (targetCounts.get(o.targetKey) || 0) + 1);
  }

  const sorted = Array.from(targetCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0 || sorted[0][1] < 3) return null;

  const [topTarget, count] = sorted[0];
  const rate = count / overrides.length;

  return {
    id: `override-${topTarget.slice(0, 20)}`,
    type: "override_pattern",
    description: `Target "${topTarget}" overridden ${count} times (${(rate * 100).toFixed(0)}% of overrides)`,
    confidence: Math.min(0.95, 0.5 + rate * 0.5),
    significance: rate,
    firstDetected: new Date(),
    lastSeen: new Date(),
    occurrences: count,
    evidence: [{ timestamp: new Date(), dataPoint: topTarget, value: count }],
  };
}

function detectExhaustionPattern(outcomes: OutcomeRecord[]): LearningPattern | null {
  // Look for blocks with budget exhaustion reasons
  const budgetBlocks = outcomes.filter(
    o => o.decision === "BLOCK" && o.metadata?.reason?.toString().includes("budget")
  );

  if (budgetBlocks.length < 5) return null;

  const concentration = budgetBlocks.length / outcomes.length;

  return {
    id: "budget-exhaustion",
    type: "budget_exhaustion",
    description: `${(concentration * 100).toFixed(0)}% of blocks are due to budget exhaustion`,
    confidence: Math.min(0.95, 0.6 + concentration * 0.4),
    significance: concentration,
    firstDetected: new Date(),
    lastSeen: new Date(),
    occurrences: budgetBlocks.length,
    evidence: [{ timestamp: new Date(), dataPoint: "budget_blocks", value: budgetBlocks.length }],
  };
}

function detectDegradedPattern(outcomes: OutcomeRecord[]): LearningPattern | null {
  const degraded = outcomes.filter(
    o => o.outcome === "recovery_success" || o.outcome === "recovery_failed"
  );

  if (degraded.length < 5) return null;

  const rate = degraded.length / outcomes.length;

  return {
    id: "degraded-frequency",
    type: "degraded_frequency",
    description: `${(rate * 100).toFixed(0)}% of decisions resulted in degraded mode`,
    confidence: Math.min(0.95, 0.5 + rate),
    significance: rate,
    firstDetected: new Date(),
    lastSeen: new Date(),
    occurrences: degraded.length,
    evidence: [{ timestamp: new Date(), dataPoint: "degraded_count", value: degraded.length }],
  };
}

// Cleanup
export function clearLearningData(): void {
  outcomeStore.length = 0;
  patternStore.clear();
  recommendationStore.clear();
  metricsCache.clear();
}
