/**
 * Link Graph Engine - Types
 * Internal link graph management and optimization
 */

export interface LinkNode {
  id: string;
  contentId: string;
  slug: string;
  title: string;
  type: string;
  inboundLinks: number;
  outboundLinks: number;
  authorityScore: number;
  isOrphan: boolean;
  clusterId?: string;
  lastUpdated: Date;
}

export interface LinkEdge {
  id: string;
  sourceId: string;
  targetId: string;
  anchorText: string;
  context: LinkContext;
  strength: number;
  createdAt: Date;
}

export type LinkContext = 'body' | 'sidebar' | 'navigation' | 'footer' | 'related';

export interface LinkGraph {
  nodes: Map<string, LinkNode>;
  edges: Map<string, LinkEdge>;
  lastBuilt: Date;
  version: number;
}

export interface LinkSuggestion {
  id: string;
  sourceContentId: string;
  targetContentId: string;
  reason: SuggestionReason;
  confidence: number;
  suggestedAnchorText: string;
  priority: number;
  createdAt: Date;
  status: SuggestionStatus;
}

export type SuggestionReason =
  | 'topical_relevance'
  | 'orphan_rescue'
  | 'authority_boost'
  | 'cluster_connection'
  | 'entity_match'
  | 'keyword_match';

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  orphanCount: number;
  averageInbound: number;
  averageOutbound: number;
  maxInbound: number;
  maxOutbound: number;
  averageAuthority: number;
  clusterCount: number;
  density: number;
}

export interface CentralityScores {
  contentId: string;
  pageRank: number;
  hubScore: number;
  authorityScore: number;
  betweenness: number;
  closeness: number;
}

export interface LinkOpportunity {
  sourceId: string;
  sourceTitle: string;
  targetId: string;
  targetTitle: string;
  matchType: string;
  matchScore: number;
  suggestedAnchor: string;
  insertionPoint?: string;
}

export interface LinkGraphConfig {
  enabled: boolean;
  buildIntervalHours: number;
  maxSuggestionsPerContent: number;
  minConfidenceThreshold: number;
  orphanThreshold: number;
  authorityDecayFactor: number;
  pageRankDamping: number;
  maxIterations: number;
}

export const DEFAULT_LINK_GRAPH_CONFIG: LinkGraphConfig = {
  enabled: true,
  buildIntervalHours: 6,
  maxSuggestionsPerContent: 5,
  minConfidenceThreshold: 0.6,
  orphanThreshold: 1,
  authorityDecayFactor: 0.85,
  pageRankDamping: 0.85,
  maxIterations: 100,
};
