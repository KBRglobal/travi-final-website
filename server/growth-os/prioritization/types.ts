/**
 * Prioritization Types
 *
 * Types for action candidates, scoring dimensions, and trade-off analysis.
 */

import type { NormalizedSignal, SignalCategory } from '../signals/types';

/**
 * Action types that can be synthesized
 */
export type ActionType =
  | 'content_update'
  | 'content_create'
  | 'content_archive'
  | 'media_optimize'
  | 'media_replace'
  | 'seo_fix'
  | 'aeo_enhance'
  | 'ux_improvement'
  | 'revenue_action'
  | 'ops_remediation'
  | 'governance_compliance';

/**
 * Execution complexity levels
 */
export type ExecutionComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';

/**
 * Reversibility of an action
 */
export type Reversibility = 'instant' | 'easy' | 'moderate' | 'difficult' | 'irreversible';

/**
 * Raw scoring dimensions before weighting
 */
export interface ScoringDimensions {
  /** Expected traffic lift (0-100) */
  trafficLift: number;
  /** Expected revenue lift (0-100) */
  revenueLift: number;
  /** Confidence in estimates (0-100) */
  confidence: number;
  /** Risk level (0-100, higher = more risky) */
  risk: number;
  /** Blast radius / scope of impact (0-100, higher = wider impact) */
  blastRadius: number;
  /** Execution cost in effort units (0-100, higher = more expensive) */
  executionCost: number;
  /** Alignment with strategic goals (0-100) */
  strategicAlignment: number;
}

/**
 * Action candidate from prioritization
 */
export interface ActionCandidate {
  /** Unique candidate ID */
  id: string;
  /** Action type */
  type: ActionType;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Signal IDs that triggered this action */
  sourceSignalIds: string[];
  /** Categories involved */
  categories: SignalCategory[];
  /** Target entity type */
  entityType: 'content' | 'asset' | 'page' | 'segment' | 'system' | 'global';
  /** Target entity ID */
  entityId: string | null;
  /** Related content IDs */
  contentIds: string[];
  /** Raw scoring dimensions */
  dimensions: ScoringDimensions;
  /** Final weighted score (0-100) */
  priorityScore: number;
  /** Rank position (1 = highest priority) */
  rank: number;
  /** Execution complexity */
  complexity: ExecutionComplexity;
  /** Reversibility */
  reversibility: Reversibility;
  /** Estimated effort in hours */
  estimatedEffortHours: number;
  /** Estimated revenue impact in dollars */
  estimatedRevenueImpact: number;
  /** Dependencies on other actions */
  dependsOn: string[];
  /** Actions that depend on this */
  blocksActions: string[];
  /** Tags for filtering */
  tags: string[];
  /** Created timestamp */
  createdAt: Date;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Trade-off comparison between two actions
 */
export interface TradeOffComparison {
  /** First action ID */
  actionA: string;
  /** Second action ID */
  actionB: string;
  /** Which dimensions favor action A */
  favorA: (keyof ScoringDimensions)[];
  /** Which dimensions favor action B */
  favorB: (keyof ScoringDimensions)[];
  /** Net score difference (positive = A wins) */
  scoreDifference: number;
  /** Confidence in comparison */
  confidence: number;
  /** Human-readable summary */
  summary: string;
}

/**
 * Batch prioritization result
 */
export interface PrioritizationResult {
  /** Ranked action candidates */
  candidates: ActionCandidate[];
  /** Total candidates considered */
  totalConsidered: number;
  /** Trade-off comparisons for top candidates */
  tradeOffs: TradeOffComparison[];
  /** Processing duration in ms */
  durationMs: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Prioritization filter options
 */
export interface PrioritizationFilter {
  /** Action types to include */
  types?: ActionType[];
  /** Categories to include */
  categories?: SignalCategory[];
  /** Entity type filter */
  entityType?: string;
  /** Minimum priority score */
  minScore?: number;
  /** Maximum complexity */
  maxComplexity?: ExecutionComplexity;
  /** Require reversible only */
  reversibleOnly?: boolean;
  /** Maximum results */
  limit?: number;
}

/**
 * Dimension weight overrides
 */
export interface WeightOverrides {
  trafficLift?: number;
  revenueLift?: number;
  confidence?: number;
  risk?: number;
  blastRadius?: number;
  executionCost?: number;
  strategicAlignment?: number;
}
