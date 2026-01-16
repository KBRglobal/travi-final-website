/**
 * Content Dependency Graph v2 - Enhanced Type Definitions
 *
 * Feature flags:
 * - ENABLE_CONTENT_GRAPH=true (main toggle)
 * - ENABLE_CONTENT_GRAPH_AUTOBUILD=true (auto-rebuild on content changes)
 */

export function isContentGraphEnabled(): boolean {
  return process.env.ENABLE_CONTENT_GRAPH === 'true';
}

export function isAutoBuildEnabled(): boolean {
  return process.env.ENABLE_CONTENT_GRAPH_AUTOBUILD === 'true';
}

// Dependency types
export type DependencyType =
  | 'internal_link'
  | 'entity_reference'
  | 'media_embed'
  | 'content_embed'
  | 'related_content'
  | 'parent_child'
  | 'translation'
  | 'canonical';

// Target types
export type TargetType = 'content' | 'entity' | 'media' | 'destination' | 'hotel' | 'attraction';

// Node status
export type NodeStatus = 'published' | 'draft' | 'archived' | 'deleted';

/**
 * Content dependency record
 */
export interface ContentDependency {
  id: string;
  sourceContentId: string;
  targetType: TargetType;
  targetId: string;
  dependencyType: DependencyType;
  confidence: number; // 0-1
  weight: number; // Edge weight for importance
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Graph node with centrality metrics
 */
export interface GraphNodeV2 {
  id: string;
  type: TargetType;
  title: string;
  status: NodeStatus;
  locale: string;
  url?: string;
  inDegree: number;
  outDegree: number;
  pageRank?: number;
  trafficSignal?: number; // If available
  revenueSignal?: number; // If available
  lastUpdated: Date;
  metadata: Record<string, unknown>;
}

/**
 * Impact analysis result
 */
export interface ImpactAnalysisV2 {
  nodeId: string;
  nodeType: TargetType;
  directDependents: GraphNodeV2[];
  transitiveDependents: Array<GraphNodeV2 & { depth: number }>;
  totalImpact: number;
  cascadeRisk: 'low' | 'medium' | 'high' | 'critical';
  fanOut: number;
  recommendedActions: RecommendedAction[];
}

/**
 * Recommended action for impact
 */
export interface RecommendedAction {
  action: 'reindex' | 'regenerate_aeo' | 'refresh_internal_links' | 'rerun_entity_extraction' | 'mark_for_review' | 'update_sitemap';
  priority: 'low' | 'medium' | 'high' | 'critical';
  affectedContentIds: string[];
  reason: string;
}

/**
 * Orphan detection result
 */
export interface OrphanResult {
  nodeId: string;
  nodeType: TargetType;
  title: string;
  reason: 'no_incoming' | 'no_outgoing' | 'isolated' | 'dead_end';
  lastUpdated: Date;
  suggestedAction: string;
}

/**
 * Hub node (high centrality)
 */
export interface HubNode {
  node: GraphNodeV2;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  pageRank: number;
  isBottleneck: boolean;
}

/**
 * Graph statistics v2
 */
export interface GraphStatsV2 {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<TargetType, number>;
  edgesByType: Record<DependencyType, number>;
  averageInDegree: number;
  averageOutDegree: number;
  orphanCount: number;
  hubCount: number;
  circularDependencyCount: number;
  lastRebuildAt?: Date;
  lastIncrementalAt?: Date;
}

/**
 * Build request
 */
export interface GraphBuildRequest {
  contentId?: string; // Single content
  contentIds?: string[]; // Batch
  fullRebuild?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Build result
 */
export interface GraphBuildResult {
  nodesCreated: number;
  nodesUpdated: number;
  edgesCreated: number;
  edgesRemoved: number;
  duration: number;
  errors: Array<{ contentId: string; error: string }>;
}

/**
 * Path between nodes
 */
export interface GraphPathV2 {
  source: string;
  target: string;
  path: string[];
  edges: ContentDependency[];
  length: number;
  totalWeight: number;
}

/**
 * Content with extracted dependencies
 */
export interface ContentWithDependencies {
  contentId: string;
  title: string;
  status: NodeStatus;
  locale: string;
  url?: string;
  blocks?: unknown[];
  internalLinks: Array<{ targetId: string; anchor?: string }>;
  entityMentions: Array<{ entityId: string; entityType: TargetType }>;
  mediaReferences: string[];
  relatedContent: string[];
  parentId?: string;
  translationGroupId?: string;
}
