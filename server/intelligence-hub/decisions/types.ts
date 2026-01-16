/**
 * Enterprise Intelligence Hub - Decision Trace Types
 *
 * Types for explaining WHY something happened in the system.
 */

export type DecisionType =
  | 'publish_blocked'
  | 'content_regenerated'
  | 'entity_recommended'
  | 'feature_degraded'
  | 'provider_disabled'
  | 'cost_limit_hit'
  | 'quality_flagged'
  | 'search_failed';

export type CauseCategory =
  | 'signal'
  | 'threshold'
  | 'rule'
  | 'user_action'
  | 'system_event'
  | 'external';

/**
 * A single cause in the causal chain
 */
export interface Cause {
  id: string;
  category: CauseCategory;
  source: string;
  description: string;
  timestamp: Date;
  confidence: number;  // 0-100
  evidence: Record<string, unknown>;
}

/**
 * The full causal chain explaining a decision
 */
export interface CausalChain {
  rootCause: Cause;
  contributingCauses: Cause[];
  totalConfidence: number;
  chainLength: number;
}

/**
 * A decision that was made by the system
 */
export interface Decision {
  id: string;
  type: DecisionType;
  entityType: string;
  entityId: string;
  outcome: string;
  timestamp: Date;
  causalChain: CausalChain;
  reversible: boolean;
  automated: boolean;
}

/**
 * Decision trace - full explanation package
 */
export interface DecisionTrace {
  decision: Decision;
  signals: string[];        // Signal IDs that contributed
  summary: string;          // Human-readable explanation
  recommendations: string[];
  createdAt: Date;
}

/**
 * Query for decisions
 */
export interface DecisionQuery {
  types?: DecisionType[];
  entityTypes?: string[];
  entityIds?: string[];
  since?: Date;
  until?: Date;
  automated?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Explanation request - what the user wants explained
 */
export interface ExplanationRequest {
  entityType: string;
  entityId: string;
  question?: 'why_blocked' | 'why_regenerated' | 'why_recommended' | 'why_failed';
}

/**
 * Explanation response
 */
export interface ExplanationResponse {
  entityType: string;
  entityId: string;
  question: string;
  answer: string;
  confidence: number;
  rootCause: Cause | null;
  contributingFactors: Cause[];
  relatedDecisions: Decision[];
  signalIds: string[];
  generatedAt: Date;
}
