/**
 * Dynamic Budget Recommender - Core Logic
 * Analyzes traffic and suggests optimal budgets
 */

import {
  TrafficMetrics,
  TimePattern,
  BudgetRecommendation,
  RecommendationBatch,
  DEFAULT_RECOMMENDER_CONFIG,
  RecommenderConfig,
} from "./types";
import { GuardedFeature } from "../enforcement/types";
import { BudgetPeriod, BudgetLimit } from "../policy/types";
import { getOutcomes } from "../learning/engine";

// Bounded storage
const MAX_RECOMMENDATIONS = 100;
const recommendationCache = new Map<string, BudgetRecommendation>();
const metricsCache = new Map<string, { metrics: TrafficMetrics; expiresAt: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getConfig(): RecommenderConfig {
  return {
    ...DEFAULT_RECOMMENDER_CONFIG,
    enabled: process.env.ENABLE_AUTONOMY_RECOMMENDER === "true",
  };
}

/**
 * Compute traffic metrics for a feature
 */
export function computeTrafficMetrics(
  feature: GuardedFeature,
  period: BudgetPeriod
): TrafficMetrics {
  const config = getConfig();
  const cacheKey = `${feature}:${period}`;

  const cached = metricsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.metrics;
  }

  const now = new Date();
  const lookbackMs = config.lookbackHours * 60 * 60 * 1000;
  const since = new Date(now.getTime() - lookbackMs);

  const outcomes = getOutcomes({ feature, since });

  // Aggregate by hour for analysis
  const hourlyData = new Map<
    string,
    {
      requests: number;
      cost: number;
      latency: number[];
      failures: number;
      overrides: number;
    }
  >();

  for (const o of outcomes) {
    const hourKey = o.decisionAt.toISOString().slice(0, 13);
    const existing = hourlyData.get(hourKey) || {
      requests: 0,
      cost: 0,
      latency: [],
      failures: 0,
      overrides: 0,
    };

    existing.requests++;
    existing.cost += (o.metadata?.cost as number) || 0;
    existing.latency.push(o.latencyMs);
    if (o.outcome === "incident_after_allow" || o.outcome === "recovery_failed") {
      existing.failures++;
    }
    if (o.outcome === "override_applied") {
      existing.overrides++;
    }

    hourlyData.set(hourKey, existing);
  }

  const hourlyValues = Array.from(hourlyData.values());

  const totalRequests = hourlyValues.reduce((sum, h) => sum + h.requests, 0);
  const totalCost = hourlyValues.reduce((sum, h) => sum + h.cost, 0);
  const totalFailures = hourlyValues.reduce((sum, h) => sum + h.failures, 0);
  const totalOverrides = hourlyValues.reduce((sum, h) => sum + h.overrides, 0);

  const requestsPerHour = hourlyValues.map(h => h.requests);
  const peakRequests = Math.max(...requestsPerHour, 0);
  const avgRequests = totalRequests / (hourlyValues.length || 1);

  const allLatencies = hourlyValues.flatMap(h => h.latency);
  allLatencies.sort((a, b) => a - b);

  const metrics: TrafficMetrics = {
    feature,
    period,
    window: { start: since, end: now },
    totalRequests,
    peakRequestsPerHour: peakRequests,
    avgRequestsPerHour: avgRequests,
    requestVariance: computeVariance(requestsPerHour),
    totalAiSpendCents: Math.round(totalCost),
    avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
    peakCostPerHour: Math.max(...hourlyValues.map(h => h.cost), 0),
    avgLatencyMs:
      allLatencies.length > 0 ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length : 0,
    p95LatencyMs:
      allLatencies.length > 0 ? allLatencies[Math.floor(allLatencies.length * 0.95)] : 0,
    failureRate: totalRequests > 0 ? totalFailures / totalRequests : 0,
    overrideCount: totalOverrides,
    overrideRate: totalRequests > 0 ? totalOverrides / totalRequests : 0,
  };

  // Cache
  if (metricsCache.size >= 50) {
    const firstKey = metricsCache.keys().next().value;
    if (firstKey) metricsCache.delete(firstKey);
  }
  metricsCache.set(cacheKey, { metrics, expiresAt: Date.now() + CACHE_TTL });

  return metrics;
}

/**
 * Analyze time-of-day patterns
 */
export function analyzeTimePatterns(feature: GuardedFeature): TimePattern[] {
  const config = getConfig();
  const since = new Date(Date.now() - config.lookbackHours * 60 * 60 * 1000);
  const outcomes = getOutcomes({ feature, since });

  const patterns = new Map<
    string,
    {
      requests: number;
      cost: number;
      blocks: number;
    }
  >();

  for (const o of outcomes) {
    const hour = o.decisionAt.getHours();
    const day = o.decisionAt.getDay();
    const key = `${day}:${hour}`;

    const existing = patterns.get(key) || { requests: 0, cost: 0, blocks: 0 };
    existing.requests++;
    existing.cost += (o.metadata?.cost as number) || 0;
    if (o.decision === "BLOCK") existing.blocks++;

    patterns.set(key, existing);
  }

  return Array.from(patterns.entries()).map(([key, data]) => {
    const [day, hour] = key.split(":").map(Number);
    return {
      hour,
      dayOfWeek: day,
      avgRequests: data.requests,
      avgCost: data.cost,
      blockRate: data.requests > 0 ? data.blocks / data.requests : 0,
    };
  });
}

/**
 * Generate budget recommendation for a feature
 */
export function recommendBudget(
  feature: GuardedFeature,
  period: BudgetPeriod,
  currentLimits: BudgetLimit
): BudgetRecommendation | null {
  const config = getConfig();
  if (!config.enabled) return null;

  const metrics = computeTrafficMetrics(feature, period);

  if (metrics.totalRequests < config.minDataPoints) {
    return null; // Not enough data
  }

  const reasoning: string[] = [];
  let confidence = 0.5;

  // Calculate recommended actions based on peak + headroom
  const peakWithMargin =
    metrics.peakRequestsPerHour * (1 + config.headroomTarget + config.safetyMargin);
  let recommendedActions = Math.ceil(peakWithMargin);

  // Adjust based on override rate (over-blocking signal)
  if (metrics.overrideRate > 0.1) {
    const adjustment = 1 + metrics.overrideRate * 0.5;
    recommendedActions = Math.ceil(recommendedActions * adjustment);
    reasoning.push(
      `+${((adjustment - 1) * 100).toFixed(0)}% to reduce ${(metrics.overrideRate * 100).toFixed(0)}% override rate`
    );
    confidence += 0.1;
  }

  // Adjust based on failure rate (under-blocking signal)
  if (metrics.failureRate > 0.05) {
    const adjustment = 1 - metrics.failureRate * 0.3;
    recommendedActions = Math.ceil(recommendedActions * adjustment);
    reasoning.push(
      `-${((1 - adjustment) * 100).toFixed(0)}% due to ${(metrics.failureRate * 100).toFixed(0)}% failure rate`
    );
    confidence += 0.1;
  }

  // Calculate recommended AI spend
  const avgCostPerAction = metrics.avgCostPerRequest || 1;
  const recommendedSpend = Math.ceil(recommendedActions * avgCostPerAction * 1.2);

  // Only recommend if there's a meaningful difference
  const actionDelta = (recommendedActions - currentLimits.maxActions) / currentLimits.maxActions;
  if (Math.abs(actionDelta) < 0.1) {
    return null; // Less than 10% change, not worth recommending
  }

  // Increase confidence based on data volume
  if (metrics.totalRequests > 1000) confidence += 0.1;
  if (metrics.totalRequests > 5000) confidence += 0.1;

  confidence = Math.min(0.95, confidence);

  if (confidence < config.confidenceThreshold) {
    return null;
  }

  reasoning.push(
    `Based on ${metrics.totalRequests} requests over ${config.lookbackHours}h`,
    `Peak: ${metrics.peakRequestsPerHour}/h, Avg: ${metrics.avgRequestsPerHour.toFixed(1)}/h`
  );

  const recommendation: BudgetRecommendation = {
    id: `rec-${feature}-${period}-${Date.now()}`,
    feature,
    period,
    createdAt: new Date(),
    currentBudget: {
      maxActions: currentLimits.maxActions,
      maxAiSpendCents: currentLimits.maxAiSpend,
      maxDbWrites: currentLimits.maxDbWrites,
    },
    recommendedBudget: {
      maxActions: recommendedActions,
      maxAiSpendCents: recommendedSpend,
      maxDbWrites: Math.ceil(
        currentLimits.maxDbWrites * (recommendedActions / currentLimits.maxActions)
      ),
    },
    delta: {
      actionsChange: actionDelta * 100,
      aiSpendChange:
        ((recommendedSpend - currentLimits.maxAiSpend) / currentLimits.maxAiSpend) * 100,
      dbWritesChange: actionDelta * 100,
    },
    confidence,
    reasoning,
    dataPoints: metrics.totalRequests,
    predictedImpact: {
      blocksChange: actionDelta > 0 ? -20 : 10,
      costSavings: actionDelta < 0 ? Math.abs(actionDelta * metrics.totalAiSpendCents) : 0,
      headroomGain: actionDelta > 0 ? actionDelta * 100 : 0,
    },
  };

  // Store (bounded)
  if (recommendationCache.size >= MAX_RECOMMENDATIONS) {
    const oldest = Array.from(recommendationCache.entries()).sort(
      ([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime()
    )[0];
    if (oldest) recommendationCache.delete(oldest[0]);
  }
  recommendationCache.set(recommendation.id, recommendation);

  return recommendation;
}

/**
 * Generate batch recommendations for all features
 */
export function generateRecommendationBatch(
  features: GuardedFeature[],
  currentLimits: Map<string, BudgetLimit>
): RecommendationBatch {
  const config = getConfig();
  const recommendations: BudgetRecommendation[] = [];
  const periods: BudgetPeriod[] = ["hourly", "daily"];

  for (const feature of features) {
    for (const period of periods) {
      const key = `${feature}:${period}`;
      const limits = currentLimits.get(key) || {
        period,
        maxActions: 100,
        maxAiSpend: 1000,
        maxDbWrites: 50,
        maxContentMutations: 20,
      };

      const rec = recommendBudget(feature, period, limits);
      if (rec) {
        recommendations.push(rec);
      }

      if (recommendations.length >= config.maxRecommendationsPerRun) break;
    }
    if (recommendations.length >= config.maxRecommendationsPerRun) break;
  }

  const highConfidence = recommendations.filter(r => r.confidence >= 0.8);
  const totalSavings = recommendations
    .filter(r => r.predictedImpact.costSavings > 0)
    .reduce((sum, r) => sum + r.predictedImpact.costSavings, 0);
  const avgHeadroom =
    recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + r.predictedImpact.headroomGain, 0) /
        recommendations.length
      : 0;

  return {
    generatedAt: new Date(),
    validUntil: new Date(Date.now() + config.refreshIntervalMs),
    recommendations,
    summary: {
      totalRecommendations: recommendations.length,
      highConfidenceCount: highConfidence.length,
      estimatedSavings: Math.round(totalSavings),
      estimatedHeadroomGain: Math.round(avgHeadroom),
    },
  };
}

/**
 * Get stored recommendations
 */
export function getRecommendations(feature?: GuardedFeature): BudgetRecommendation[] {
  const all = Array.from(recommendationCache.values());
  if (feature) {
    return all.filter(r => r.feature === feature);
  }
  return all;
}

// Helper
function computeVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

export function clearRecommendationCache(): void {
  recommendationCache.clear();
  metricsCache.clear();
}
