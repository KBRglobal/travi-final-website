/**
 * Content Backlog - Scorer
 *
 * Scores and prioritizes backlog items.
 */

import { BacklogItem, BacklogSource, ScoringFactors, SCORING_WEIGHTS } from './types';

/**
 * Calculate priority score for a backlog item.
 */
export function calculatePriorityScore(item: Partial<BacklogItem>): number {
  const factors = extractScoringFactors(item);
  return calculateWeightedScore(factors);
}

/**
 * Extract scoring factors from item.
 */
function extractScoringFactors(item: Partial<BacklogItem>): ScoringFactors {
  const details = item.sourceDetails || {};

  return {
    searchDemand: calculateSearchDemand(item.source!, details),
    rssFrequency: calculateRssFrequency(item.source!, details),
    entityImportance: calculateEntityImportance(item.source!, details),
    competitionScore: calculateCompetitionScore(item),
  };
}

/**
 * Calculate search demand score (0-100).
 */
function calculateSearchDemand(
  source: BacklogSource,
  details: Record<string, unknown>
): number {
  if (source === 'zero_result_search') {
    const searchCount = (details.searchCount as number) || 0;
    if (searchCount >= 100) return 100;
    if (searchCount >= 50) return 80;
    if (searchCount >= 20) return 60;
    if (searchCount >= 10) return 40;
    return 20;
  }

  if (source === 'low_click_search') {
    const searches = (details.searches as number) || 0;
    if (searches >= 200) return 100;
    if (searches >= 100) return 80;
    if (searches >= 50) return 60;
    return 40;
  }

  // Other sources have no direct search demand
  return 30;
}

/**
 * Calculate RSS frequency score (0-100).
 */
function calculateRssFrequency(
  source: BacklogSource,
  details: Record<string, unknown>
): number {
  if (source !== 'rss_topic') {
    return 0;
  }

  const frequency = (details.frequency as number) || 0;
  const sources = (details.sources as string[]) || [];

  let score = 0;

  // Frequency score
  if (frequency >= 20) score += 50;
  else if (frequency >= 10) score += 35;
  else if (frequency >= 5) score += 20;
  else score += 10;

  // Multi-source bonus
  if (sources.length >= 5) score += 50;
  else if (sources.length >= 3) score += 35;
  else if (sources.length >= 2) score += 20;

  return Math.min(100, score);
}

/**
 * Calculate entity importance score (0-100).
 */
function calculateEntityImportance(
  source: BacklogSource,
  details: Record<string, unknown>
): number {
  if (source !== 'entity_gap') {
    return 20; // Base score for non-entity items
  }

  const entityType = (details.entityType as string) || '';

  // Score based on entity type importance
  const typeScores: Record<string, number> = {
    attraction: 100,
    hotel: 90,
    restaurant: 85,
    beach: 80,
    mall: 75,
    museum: 70,
    park: 65,
    default: 50,
  };

  return typeScores[entityType.toLowerCase()] || typeScores.default;
}

/**
 * Calculate competition score (0-100, lower = better).
 */
function calculateCompetitionScore(item: Partial<BacklogItem>): number {
  // Simple heuristic based on keyword count
  const keywords = item.suggestedKeywords || [];

  // More specific = less competition
  if (keywords.length >= 4) return 30; // Very specific, low competition
  if (keywords.length >= 3) return 50;
  if (keywords.length >= 2) return 70;
  return 90; // Generic, high competition
}

/**
 * Calculate weighted score from factors.
 */
function calculateWeightedScore(factors: ScoringFactors): number {
  // Invert competition score (low competition = high score)
  const invertedCompetition = 100 - factors.competitionScore;

  const weightedScore =
    factors.searchDemand * SCORING_WEIGHTS.searchDemand +
    factors.rssFrequency * SCORING_WEIGHTS.rssFrequency +
    factors.entityImportance * SCORING_WEIGHTS.entityImportance +
    invertedCompetition * SCORING_WEIGHTS.competitionScore;

  return Math.round(weightedScore);
}

/**
 * Score and rank multiple items.
 */
export function scoreAndRankItems(items: Partial<BacklogItem>[]): Partial<BacklogItem>[] {
  return items
    .map(item => ({
      ...item,
      priorityScore: calculatePriorityScore(item),
    }))
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
}

/**
 * Get scoring breakdown for an item.
 */
export function getScoringBreakdown(item: Partial<BacklogItem>): {
  factors: ScoringFactors;
  weights: typeof SCORING_WEIGHTS;
  finalScore: number;
} {
  const factors = extractScoringFactors(item);
  const finalScore = calculateWeightedScore(factors);

  return {
    factors,
    weights: SCORING_WEIGHTS,
    finalScore,
  };
}
