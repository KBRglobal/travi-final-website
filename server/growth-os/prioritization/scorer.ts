/**
 * Multi-Dimensional Scorer
 *
 * Calculates priority scores using weighted multi-dimensional analysis.
 */

import type { NormalizedSignal } from '../signals/types';
import type {
  ScoringDimensions,
  ActionType,
  ExecutionComplexity,
  Reversibility,
  WeightOverrides,
} from './types';
import { SCORING_WEIGHTS, RISK_THRESHOLDS, isPrioritizationEnabled } from '../config';

/**
 * Default weights from config
 */
const DEFAULT_WEIGHTS = SCORING_WEIGHTS;

/**
 * Complexity cost mapping (hours)
 */
const COMPLEXITY_COST: Record<ExecutionComplexity, number> = {
  trivial: 0.5,
  simple: 2,
  moderate: 8,
  complex: 24,
  expert: 80,
};

/**
 * Reversibility risk multipliers
 */
const REVERSIBILITY_RISK: Record<Reversibility, number> = {
  instant: 0.1,
  easy: 0.3,
  moderate: 0.5,
  difficult: 0.8,
  irreversible: 1.0,
};

/**
 * Calculate raw dimensions from signals
 */
export function calculateDimensions(
  signals: NormalizedSignal[],
  actionType: ActionType,
  complexity: ExecutionComplexity,
  reversibility: Reversibility
): ScoringDimensions {
  if (signals.length === 0) {
    return {
      trafficLift: 0,
      revenueLift: 0,
      confidence: 0,
      risk: 50,
      blastRadius: 0,
      executionCost: 50,
      strategicAlignment: 50,
    };
  }

  // Aggregate from signals
  let totalSeverity = 0;
  let totalImpact = 0;
  let totalConfidence = 0;
  let totalRevenueImpact = 0;
  let contentCount = 0;

  for (const signal of signals) {
    totalSeverity += signal.severity;
    totalImpact += signal.impact;
    totalConfidence += signal.confidence;
    if (signal.revenueImpact) {
      totalRevenueImpact += signal.revenueImpact;
    }
    contentCount += signal.contentIds.length;
  }

  const avgSeverity = totalSeverity / signals.length;
  const avgImpact = totalImpact / signals.length;
  const avgConfidence = totalConfidence / signals.length;

  // Traffic lift derived from severity and impact
  const trafficLift = Math.min(100, (avgSeverity + avgImpact) / 2);

  // Revenue lift from actual impact data or estimate
  const revenueLift = totalRevenueImpact > 0
    ? Math.min(100, Math.log10(totalRevenueImpact + 1) * 20)
    : avgImpact * 0.5;

  // Confidence from signal confidence
  const confidence = avgConfidence;

  // Risk from reversibility and severity
  const baseRisk = REVERSIBILITY_RISK[reversibility] * 100;
  const severityRisk = avgSeverity * 0.3;
  const risk = Math.min(100, baseRisk * 0.6 + severityRisk);

  // Blast radius from content count and signal count
  const blastRadius = Math.min(100, Math.log10(contentCount + signals.length + 1) * 30);

  // Execution cost from complexity
  const complexityCost = COMPLEXITY_COST[complexity];
  const executionCost = Math.min(100, (complexityCost / 80) * 100);

  // Strategic alignment from action type and categories
  const strategicAlignment = calculateStrategicAlignment(actionType, signals);

  return {
    trafficLift: Math.round(trafficLift),
    revenueLift: Math.round(revenueLift),
    confidence: Math.round(confidence),
    risk: Math.round(risk),
    blastRadius: Math.round(blastRadius),
    executionCost: Math.round(executionCost),
    strategicAlignment: Math.round(strategicAlignment),
  };
}

/**
 * Calculate strategic alignment score
 */
function calculateStrategicAlignment(
  actionType: ActionType,
  signals: NormalizedSignal[]
): number {
  let score = 50; // Base score

  // Boost for revenue-related actions
  if (actionType === 'revenue_action') {
    score += 20;
  }

  // Boost for SEO/AEO actions
  if (actionType === 'seo_fix' || actionType === 'aeo_enhance') {
    score += 15;
  }

  // Boost for governance compliance
  if (actionType === 'governance_compliance') {
    score += 10;
  }

  // Boost based on signal categories
  const hasRevenue = signals.some(s => s.category === 'revenue');
  const hasSeo = signals.some(s => s.category === 'seo');
  const hasAeo = signals.some(s => s.category === 'aeo');

  if (hasRevenue) score += 15;
  if (hasSeo) score += 10;
  if (hasAeo) score += 10;

  return Math.min(100, score);
}

/**
 * Calculate weighted priority score from dimensions
 */
export function calculatePriorityScore(
  dimensions: ScoringDimensions,
  overrides?: WeightOverrides
): number {
  const weights = { ...DEFAULT_WEIGHTS, ...overrides };

  // Normalize weights
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalizedWeights: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    normalizedWeights[key] = value / totalWeight;
  }

  // Calculate positive contribution (higher is better)
  const positiveScore =
    dimensions.trafficLift * normalizedWeights.trafficLift +
    dimensions.revenueLift * normalizedWeights.revenueLift +
    dimensions.confidence * normalizedWeights.confidence +
    dimensions.strategicAlignment * normalizedWeights.strategicAlignment;

  // Calculate negative contribution (higher is worse, so invert)
  const negativeScore =
    (100 - dimensions.risk) * normalizedWeights.risk +
    (100 - dimensions.blastRadius) * normalizedWeights.blastRadius +
    (100 - dimensions.executionCost) * normalizedWeights.executionCost;

  // Combine
  const rawScore = positiveScore + negativeScore;

  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

/**
 * Calculate confidence-adjusted score
 * Lower confidence reduces the effective score
 */
export function calculateConfidenceAdjustedScore(
  priorityScore: number,
  confidence: number
): number {
  // Apply confidence as a multiplier (min 0.5 to avoid zeroing out)
  const confidenceMultiplier = 0.5 + (confidence / 100) * 0.5;
  return Math.round(priorityScore * confidenceMultiplier);
}

/**
 * Get risk level from risk score
 */
export function getRiskLevel(risk: number): 'low' | 'medium' | 'high' | 'critical' {
  if (risk >= RISK_THRESHOLDS.critical) return 'critical';
  if (risk >= RISK_THRESHOLDS.high) return 'high';
  if (risk >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Calculate effort estimate in hours
 */
export function estimateEffort(
  complexity: ExecutionComplexity,
  contentCount: number
): number {
  const baseCost = COMPLEXITY_COST[complexity];
  // Scale slightly with content count
  const scaleFactor = 1 + Math.log10(contentCount + 1) * 0.2;
  return Math.round(baseCost * scaleFactor * 10) / 10;
}

/**
 * Determine complexity from action characteristics
 */
export function deriveComplexity(
  actionType: ActionType,
  contentCount: number,
  requiresManualReview: boolean
): ExecutionComplexity {
  // Base complexity by action type
  const typeComplexity: Record<ActionType, ExecutionComplexity> = {
    content_update: 'simple',
    content_create: 'moderate',
    content_archive: 'trivial',
    media_optimize: 'simple',
    media_replace: 'moderate',
    seo_fix: 'simple',
    aeo_enhance: 'moderate',
    ux_improvement: 'complex',
    revenue_action: 'moderate',
    ops_remediation: 'complex',
    governance_compliance: 'complex',
  };

  let complexity = typeComplexity[actionType];

  // Upgrade based on scale
  if (contentCount > 10) {
    complexity = upgradeComplexity(complexity);
  }
  if (contentCount > 50) {
    complexity = upgradeComplexity(complexity);
  }

  // Upgrade if manual review required
  if (requiresManualReview && complexity !== 'expert') {
    complexity = upgradeComplexity(complexity);
  }

  return complexity;
}

/**
 * Upgrade complexity one level
 */
function upgradeComplexity(current: ExecutionComplexity): ExecutionComplexity {
  const order: ExecutionComplexity[] = ['trivial', 'simple', 'moderate', 'complex', 'expert'];
  const idx = order.indexOf(current);
  return order[Math.min(idx + 1, order.length - 1)];
}

/**
 * Determine reversibility from action type
 */
export function deriveReversibility(
  actionType: ActionType,
  hasBackup: boolean
): Reversibility {
  const typeReversibility: Record<ActionType, Reversibility> = {
    content_update: 'easy',
    content_create: 'easy',
    content_archive: 'easy',
    media_optimize: 'moderate',
    media_replace: 'moderate',
    seo_fix: 'easy',
    aeo_enhance: 'easy',
    ux_improvement: 'moderate',
    revenue_action: 'moderate',
    ops_remediation: 'difficult',
    governance_compliance: 'difficult',
  };

  let reversibility = typeReversibility[actionType];

  // Downgrade if backup exists
  if (hasBackup) {
    if (reversibility === 'irreversible') reversibility = 'difficult';
    else if (reversibility === 'difficult') reversibility = 'moderate';
    else if (reversibility === 'moderate') reversibility = 'easy';
  }

  return reversibility;
}

/**
 * Score comparison result
 */
export interface ScoreBreakdown {
  dimensions: ScoringDimensions;
  weights: Record<string, number>;
  positiveContribution: number;
  negativeContribution: number;
  finalScore: number;
  confidenceAdjusted: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Get detailed score breakdown
 */
export function getScoreBreakdown(
  dimensions: ScoringDimensions,
  overrides?: WeightOverrides
): ScoreBreakdown {
  const weights = { ...DEFAULT_WEIGHTS, ...overrides };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalizedWeights: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    normalizedWeights[key] = value / totalWeight;
  }

  const positiveContribution =
    dimensions.trafficLift * normalizedWeights.trafficLift +
    dimensions.revenueLift * normalizedWeights.revenueLift +
    dimensions.confidence * normalizedWeights.confidence +
    dimensions.strategicAlignment * normalizedWeights.strategicAlignment;

  const negativeContribution =
    (100 - dimensions.risk) * normalizedWeights.risk +
    (100 - dimensions.blastRadius) * normalizedWeights.blastRadius +
    (100 - dimensions.executionCost) * normalizedWeights.executionCost;

  const finalScore = Math.round(Math.max(0, Math.min(100, positiveContribution + negativeContribution)));
  const confidenceAdjusted = calculateConfidenceAdjustedScore(finalScore, dimensions.confidence);

  return {
    dimensions,
    weights: normalizedWeights,
    positiveContribution: Math.round(positiveContribution),
    negativeContribution: Math.round(negativeContribution),
    finalScore,
    confidenceAdjusted,
    riskLevel: getRiskLevel(dimensions.risk),
  };
}
