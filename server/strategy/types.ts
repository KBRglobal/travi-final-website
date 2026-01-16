/**
 * Strategic Priority Engine - Types
 * Decides what the system should work on first
 */

export interface StrategyPriority {
  id: string;
  targetType: TargetType;
  targetId: string;
  priorityScore: number; // 0-100
  primaryReason: PriorityReason;
  secondaryReasons: PriorityReason[];
  signals: PrioritySignal[];
  computedAt: Date;
  expiresAt: Date;
}

export type TargetType = 'content' | 'entity' | 'topic' | 'cluster';

export type PriorityReason =
  | 'high_revenue_potential'
  | 'declining_traffic'
  | 'orphan_content'
  | 'missing_aeo'
  | 'stale_content'
  | 'low_health_score'
  | 'high_authority_opportunity'
  | 'conversion_gap'
  | 'search_opportunity'
  | 'link_deficit'
  | 'entity_coverage_gap'
  | 'competitive_threat';

export interface PrioritySignal {
  source: SignalSource;
  signalType: string;
  value: number;
  weight: number;
  contributionScore: number;
  data?: Record<string, unknown>;
}

export type SignalSource =
  | 'content_health'
  | 'revenue_intel'
  | 'link_graph'
  | 'search_intel'
  | 'growth_tasks';

export interface StrategyWeights {
  contentHealth: number;
  revenueIntel: number;
  linkGraph: number;
  searchIntel: number;
  recency: number;
}

export interface StrategyConfig {
  enabled: boolean;
  weights: StrategyWeights;
  priorityTtlMinutes: number;
  minScoreThreshold: number;
  maxPrioritiesPerBatch: number;
  refreshIntervalMinutes: number;
}

export const DEFAULT_STRATEGY_WEIGHTS: StrategyWeights = {
  contentHealth: 0.25,
  revenueIntel: 0.30,
  linkGraph: 0.15,
  searchIntel: 0.20,
  recency: 0.10,
};

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  enabled: false,
  weights: DEFAULT_STRATEGY_WEIGHTS,
  priorityTtlMinutes: 60,
  minScoreThreshold: 20,
  maxPrioritiesPerBatch: 100,
  refreshIntervalMinutes: 30,
};

export interface ContentPriorityContext {
  contentId: string;
  contentType: string;
  healthScore?: number;
  healthSignals?: string[];
  revenueScore?: number;
  revenueValue?: number;
  linkScore?: number;
  inboundLinks?: number;
  outboundLinks?: number;
  isOrphan?: boolean;
  searchScore?: number;
  impressions?: number;
  clicks?: number;
  lastUpdated?: Date;
}

export interface StrategySnapshot {
  generatedAt: Date;
  totalPriorities: number;
  topPriorities: StrategyPriority[];
  byReason: Record<PriorityReason, number>;
  averageScore: number;
  weights: StrategyWeights;
}
