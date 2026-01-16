/**
 * Strategic Priority Engine - Scorer
 * Computes priority scores from collected signals
 */

import {
  StrategyPriority,
  PrioritySignal,
  PriorityReason,
  StrategyWeights,
  DEFAULT_STRATEGY_WEIGHTS,
  DEFAULT_STRATEGY_CONFIG,
} from './types';
import { collectAllSignals } from './signals';

function generatePriorityId(targetType: string, targetId: string): string {
  return `priority-${targetType}-${targetId}-${Date.now()}`;
}

export function computeContributionScores(
  signals: PrioritySignal[]
): PrioritySignal[] {
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);

  return signals.map(signal => ({
    ...signal,
    contributionScore:
      totalWeight > 0
        ? ((signal.value * signal.weight) / totalWeight) * (signal.value / 100)
        : 0,
  }));
}

export function computePriorityScore(signals: PrioritySignal[]): number {
  if (signals.length === 0) return 50; // Default neutral score

  const scoredSignals = computeContributionScores(signals);
  const totalWeight = scoredSignals.reduce((sum, s) => sum + s.weight, 0);

  if (totalWeight === 0) return 50;

  const weightedSum = scoredSignals.reduce(
    (sum, s) => sum + s.value * s.weight,
    0
  );

  // Invert score: lower health/revenue = higher priority
  const rawScore = weightedSum / totalWeight;

  // Transform: content needing attention gets higher priority
  // Score 0-100 where 100 = highest priority (most needs work)
  return Math.round(100 - rawScore);
}

export function determinePrimaryReason(signals: PrioritySignal[]): PriorityReason {
  if (signals.length === 0) return 'stale_content';

  // Find the signal contributing most to priority (lowest value = highest priority)
  const scoredSignals = computeContributionScores(signals);

  // Group by concern type
  const concerns: { reason: PriorityReason; score: number }[] = [];

  // Check for orphan content
  const orphanSignal = scoredSignals.find(s => s.signalType === 'orphan_status');
  if (orphanSignal && orphanSignal.value === 0) {
    concerns.push({ reason: 'orphan_content', score: 95 });
  }

  // Check health issues
  const healthSignal = scoredSignals.find(s => s.signalType === 'overall_health');
  if (healthSignal && healthSignal.value < 50) {
    concerns.push({ reason: 'low_health_score', score: 90 - healthSignal.value });
  }

  // Check revenue potential
  const revenueSignal = scoredSignals.find(s => s.signalType === 'roi_score');
  if (revenueSignal) {
    if (revenueSignal.value < 20) {
      concerns.push({ reason: 'conversion_gap', score: 80 });
    } else if (revenueSignal.value > 70) {
      concerns.push({ reason: 'high_revenue_potential', score: 85 });
    }
  }

  // Check link deficit
  const inboundSignal = scoredSignals.find(s => s.signalType === 'inbound_links');
  if (inboundSignal && inboundSignal.value < 30) {
    concerns.push({ reason: 'link_deficit', score: 70 });
  }

  // Check authority opportunity
  const authoritySignal = scoredSignals.find(s => s.signalType === 'authority_score');
  if (authoritySignal && authoritySignal.value > 60) {
    concerns.push({ reason: 'high_authority_opportunity', score: 75 });
  }

  // Check recency
  const recencySignal = scoredSignals.find(s => s.signalType === 'recency');
  if (recencySignal && recencySignal.value < 30) {
    concerns.push({ reason: 'stale_content', score: 65 });
  }

  // Check search opportunity
  const impressionsSignal = scoredSignals.find(s => s.signalType === 'impressions');
  const ctrSignal = scoredSignals.find(s => s.signalType === 'ctr');
  if (impressionsSignal && ctrSignal) {
    if (impressionsSignal.value > 50 && ctrSignal.value < 30) {
      concerns.push({ reason: 'search_opportunity', score: 72 });
    }
    if (impressionsSignal.value < 20) {
      concerns.push({ reason: 'declining_traffic', score: 68 });
    }
  }

  // Sort by score and return top reason
  concerns.sort((a, b) => b.score - a.score);
  return concerns[0]?.reason || 'stale_content';
}

export function determineSecondaryReasons(
  signals: PrioritySignal[],
  primary: PriorityReason
): PriorityReason[] {
  const allReasons = new Set<PriorityReason>();

  for (const signal of signals) {
    if (signal.signalType === 'orphan_status' && signal.value === 0) {
      allReasons.add('orphan_content');
    }
    if (signal.signalType === 'overall_health' && signal.value < 50) {
      allReasons.add('low_health_score');
    }
    if (signal.signalType === 'recency' && signal.value < 30) {
      allReasons.add('stale_content');
    }
    if (signal.signalType === 'inbound_links' && signal.value < 30) {
      allReasons.add('link_deficit');
    }
  }

  allReasons.delete(primary);
  return Array.from(allReasons).slice(0, 3);
}

export async function computeContentPriority(
  contentId: string
): Promise<StrategyPriority> {
  const signals = await collectAllSignals(contentId);
  const scoredSignals = computeContributionScores(signals);
  const priorityScore = computePriorityScore(signals);
  const primaryReason = determinePrimaryReason(signals);
  const secondaryReasons = determineSecondaryReasons(signals, primaryReason);

  const ttlMinutes = DEFAULT_STRATEGY_CONFIG.priorityTtlMinutes;

  return {
    id: generatePriorityId('content', contentId),
    targetType: 'content',
    targetId: contentId,
    priorityScore,
    primaryReason,
    secondaryReasons,
    signals: scoredSignals,
    computedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  };
}

export function applyWeightAdjustments(
  signals: PrioritySignal[],
  adjustments: Partial<StrategyWeights>
): PrioritySignal[] {
  const sourceWeightMap: Record<string, keyof StrategyWeights> = {
    content_health: 'contentHealth',
    revenue_intel: 'revenueIntel',
    link_graph: 'linkGraph',
    search_intel: 'searchIntel',
  };

  return signals.map(signal => {
    const weightKey = sourceWeightMap[signal.source];
    if (weightKey && adjustments[weightKey] !== undefined) {
      const adjustment = adjustments[weightKey]!;
      return {
        ...signal,
        weight: signal.weight * adjustment,
      };
    }
    return signal;
  });
}
