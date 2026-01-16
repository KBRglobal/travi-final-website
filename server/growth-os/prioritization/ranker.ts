/**
 * Action Ranker
 *
 * Ranks action candidates and analyzes trade-offs between options.
 */

import { randomUUID } from 'crypto';
import type { NormalizedSignal } from '../signals/types';
import type {
  ActionCandidate,
  ActionType,
  PrioritizationResult,
  PrioritizationFilter,
  TradeOffComparison,
  ScoringDimensions,
  ExecutionComplexity,
} from './types';
import {
  calculateDimensions,
  calculatePriorityScore,
  deriveComplexity,
  deriveReversibility,
  estimateEffort,
  getScoreBreakdown,
} from './scorer';
import { getGrowthOSConfig, isPrioritizationEnabled } from '../config';
import { log } from '../../lib/logger';

/**
 * Create an action candidate from signals
 */
export function createActionCandidate(
  type: ActionType,
  title: string,
  description: string,
  signals: NormalizedSignal[],
  options: {
    entityType?: 'content' | 'asset' | 'page' | 'segment' | 'system' | 'global';
    entityId?: string;
    contentIds?: string[];
    requiresManualReview?: boolean;
    hasBackup?: boolean;
    tags?: string[];
    metadata?: Record<string, unknown>;
  } = {}
): ActionCandidate {
  const contentIds = options.contentIds || signals.flatMap(s => s.contentIds);
  const complexity = deriveComplexity(type, contentIds.length, options.requiresManualReview || false);
  const reversibility = deriveReversibility(type, options.hasBackup || false);
  const dimensions = calculateDimensions(signals, type, complexity, reversibility);
  const priorityScore = calculatePriorityScore(dimensions);

  // Estimate revenue impact
  let estimatedRevenueImpact = 0;
  for (const signal of signals) {
    if (signal.revenueImpact) {
      estimatedRevenueImpact += signal.revenueImpact;
    }
  }

  // Derive categories from signals
  const categories = [...new Set(signals.map(s => s.category))];

  return {
    id: randomUUID(),
    type,
    title,
    description,
    sourceSignalIds: signals.map(s => s.id),
    categories,
    entityType: options.entityType || 'global',
    entityId: options.entityId || null,
    contentIds,
    dimensions,
    priorityScore,
    rank: 0, // Set during ranking
    complexity,
    reversibility,
    estimatedEffortHours: estimateEffort(complexity, contentIds.length),
    estimatedRevenueImpact,
    dependsOn: [],
    blocksActions: [],
    tags: options.tags || [],
    createdAt: new Date(),
    metadata: options.metadata || {},
  };
}

/**
 * Rank a list of action candidates
 */
export function rankCandidates(candidates: ActionCandidate[]): ActionCandidate[] {
  if (candidates.length === 0) return [];

  // Sort by priority score descending
  const sorted = [...candidates].sort((a, b) => b.priorityScore - a.priorityScore);

  // Assign ranks
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].rank = i + 1;
  }

  return sorted;
}

/**
 * Filter candidates
 */
export function filterCandidates(
  candidates: ActionCandidate[],
  filter: PrioritizationFilter
): ActionCandidate[] {
  let filtered = [...candidates];

  if (filter.types && filter.types.length > 0) {
    filtered = filtered.filter(c => filter.types!.includes(c.type));
  }

  if (filter.categories && filter.categories.length > 0) {
    filtered = filtered.filter(c =>
      c.categories.some(cat => filter.categories!.includes(cat))
    );
  }

  if (filter.entityType) {
    filtered = filtered.filter(c => c.entityType === filter.entityType);
  }

  if (filter.minScore !== undefined) {
    filtered = filtered.filter(c => c.priorityScore >= filter.minScore!);
  }

  if (filter.maxComplexity) {
    const complexityOrder: ExecutionComplexity[] = ['trivial', 'simple', 'moderate', 'complex', 'expert'];
    const maxIdx = complexityOrder.indexOf(filter.maxComplexity);
    filtered = filtered.filter(c => {
      const idx = complexityOrder.indexOf(c.complexity);
      return idx <= maxIdx;
    });
  }

  if (filter.reversibleOnly) {
    filtered = filtered.filter(c => c.reversibility !== 'irreversible');
  }

  if (filter.limit) {
    filtered = filtered.slice(0, filter.limit);
  }

  return filtered;
}

/**
 * Compare two actions and analyze trade-offs
 */
export function compareActions(
  a: ActionCandidate,
  b: ActionCandidate
): TradeOffComparison {
  const favorA: (keyof ScoringDimensions)[] = [];
  const favorB: (keyof ScoringDimensions)[] = [];

  const dimensions: (keyof ScoringDimensions)[] = [
    'trafficLift', 'revenueLift', 'confidence', 'risk',
    'blastRadius', 'executionCost', 'strategicAlignment'
  ];

  // For most dimensions, higher is better
  // For risk, blastRadius, executionCost: lower is better
  const lowerIsBetter = ['risk', 'blastRadius', 'executionCost'];

  for (const dim of dimensions) {
    const aVal = a.dimensions[dim];
    const bVal = b.dimensions[dim];
    const diff = Math.abs(aVal - bVal);

    // Only count if meaningful difference (>5 points)
    if (diff < 5) continue;

    if (lowerIsBetter.includes(dim)) {
      if (aVal < bVal) favorA.push(dim);
      else favorB.push(dim);
    } else {
      if (aVal > bVal) favorA.push(dim);
      else favorB.push(dim);
    }
  }

  const scoreDifference = a.priorityScore - b.priorityScore;

  // Confidence based on dimension agreement
  const totalAdvantages = favorA.length + favorB.length;
  const dominance = Math.abs(favorA.length - favorB.length) / Math.max(totalAdvantages, 1);
  const confidence = Math.round(50 + dominance * 50);

  // Generate summary
  let summary: string;
  if (scoreDifference > 10) {
    summary = `"${a.title}" scores significantly higher (+${scoreDifference}) with advantages in ${favorA.join(', ')}.`;
  } else if (scoreDifference < -10) {
    summary = `"${b.title}" scores significantly higher (+${-scoreDifference}) with advantages in ${favorB.join(', ')}.`;
  } else {
    summary = `Close call: "${a.title}" vs "${b.title}" differ by only ${Math.abs(scoreDifference)} points. Trade-offs involve ${[...favorA, ...favorB].join(', ')}.`;
  }

  return {
    actionA: a.id,
    actionB: b.id,
    favorA,
    favorB,
    scoreDifference,
    confidence,
    summary,
  };
}

/**
 * Generate trade-off comparisons for top candidates
 */
export function generateTradeOffs(
  candidates: ActionCandidate[],
  topN = 5
): TradeOffComparison[] {
  const tradeOffs: TradeOffComparison[] = [];
  const top = candidates.slice(0, topN);

  // Compare each pair
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      tradeOffs.push(compareActions(top[i], top[j]));
    }
  }

  return tradeOffs;
}

/**
 * Run full prioritization on a set of candidates
 */
export function prioritize(
  candidates: ActionCandidate[],
  filter?: PrioritizationFilter
): PrioritizationResult {
  if (!isPrioritizationEnabled()) {
    return {
      candidates: [],
      totalConsidered: 0,
      tradeOffs: [],
      durationMs: 0,
      timestamp: new Date(),
    };
  }

  const startTime = Date.now();
  const config = getGrowthOSConfig();

  // Apply filter first
  let filtered = filter ? filterCandidates(candidates, filter) : candidates;

  // Limit candidates
  if (filtered.length > config.maxActionCandidates) {
    // Pre-rank to keep top candidates before final ranking
    filtered = rankCandidates(filtered).slice(0, config.maxActionCandidates);
  }

  // Rank candidates
  const ranked = rankCandidates(filtered);

  // Generate trade-offs for top candidates
  const tradeOffs = generateTradeOffs(ranked, 5);

  const durationMs = Date.now() - startTime;

  log.debug(`[GrowthOS] Prioritized ${ranked.length}/${candidates.length} candidates in ${durationMs}ms`);

  return {
    candidates: ranked,
    totalConsidered: candidates.length,
    tradeOffs,
    durationMs,
    timestamp: new Date(),
  };
}

/**
 * Get top N candidates
 */
export function getTopCandidates(
  candidates: ActionCandidate[],
  n = 10
): ActionCandidate[] {
  const ranked = rankCandidates(candidates);
  return ranked.slice(0, n);
}

/**
 * Group candidates by type
 */
export function groupByType(
  candidates: ActionCandidate[]
): Map<ActionType, ActionCandidate[]> {
  const groups = new Map<ActionType, ActionCandidate[]>();

  for (const candidate of candidates) {
    if (!groups.has(candidate.type)) {
      groups.set(candidate.type, []);
    }
    groups.get(candidate.type)!.push(candidate);
  }

  // Sort each group by score
  for (const [type, group] of groups) {
    group.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  return groups;
}

/**
 * Get quick wins (high score, low complexity)
 */
export function getQuickWins(
  candidates: ActionCandidate[],
  limit = 5
): ActionCandidate[] {
  return filterCandidates(rankCandidates(candidates), {
    minScore: 60,
    maxComplexity: 'simple',
    reversibleOnly: true,
    limit,
  });
}

/**
 * Get high-impact actions (regardless of effort)
 */
export function getHighImpact(
  candidates: ActionCandidate[],
  limit = 10
): ActionCandidate[] {
  return [...candidates]
    .sort((a, b) => b.dimensions.revenueLift - a.dimensions.revenueLift)
    .slice(0, limit);
}

/**
 * Get low-risk actions
 */
export function getLowRisk(
  candidates: ActionCandidate[],
  limit = 10
): ActionCandidate[] {
  return filterCandidates(
    [...candidates].sort((a, b) => a.dimensions.risk - b.dimensions.risk),
    { reversibleOnly: true, limit }
  );
}
