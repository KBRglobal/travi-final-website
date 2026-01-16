/**
 * Prioritization & Trade-off Engine (Subsystem 2)
 *
 * Multi-dimensional scoring and ranking of action candidates
 * with trade-off analysis for decision support.
 */

// Types
export type {
  ActionType,
  ExecutionComplexity,
  Reversibility,
  ScoringDimensions,
  ActionCandidate,
  TradeOffComparison,
  PrioritizationResult,
  PrioritizationFilter,
  WeightOverrides,
} from './types';

// Scoring
export {
  calculateDimensions,
  calculatePriorityScore,
  calculateConfidenceAdjustedScore,
  getRiskLevel,
  estimateEffort,
  deriveComplexity,
  deriveReversibility,
  getScoreBreakdown,
  type ScoreBreakdown,
} from './scorer';

// Ranking
export {
  createActionCandidate,
  rankCandidates,
  filterCandidates,
  compareActions,
  generateTradeOffs,
  prioritize,
  getTopCandidates,
  groupByType,
  getQuickWins,
  getHighImpact,
  getLowRisk,
} from './ranker';
