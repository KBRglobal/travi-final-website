/**
 * Content Dependency Graph v2 - Graph Engine
 *
 * Bounded memory graph storage with LRU caching and impact analysis
 */

import { LRUCache } from '../media-intelligence/lru-cache';
import {
  ContentDependency,
  GraphNodeV2,
  TargetType,
  DependencyType,
  NodeStatus,
  ImpactAnalysisV2,
  RecommendedAction,
  OrphanResult,
  HubNode,
  GraphStatsV2,
  GraphBuildRequest,
  GraphBuildResult,
  GraphPathV2,
  ContentWithDependencies,
} from './types-v2';

// Cache configuration
const CACHE_SIZE = parseInt(process.env.GRAPH_CACHE_SIZE || '10000', 10);
const CACHE_TTL = parseInt(process.env.GRAPH_CACHE_TTL || '1800000', 10); // 30 min

// Bounded stores
const nodeCache = new LRUCache<string, GraphNodeV2>(CACHE_SIZE, CACHE_TTL);
const edgeCache = new LRUCache<string, ContentDependency>(CACHE_SIZE * 2, CACHE_TTL);

// Adjacency indices (bounded)
const outgoingIndex = new LRUCache<string, Set<string>>(CACHE_SIZE, CACHE_TTL);
const incomingIndex = new LRUCache<string, Set<string>>(CACHE_SIZE, CACHE_TTL);

// PageRank cache
const pageRankCache = new LRUCache<string, number>(CACHE_SIZE, CACHE_TTL);

// Build timestamps
let lastFullRebuild: Date | undefined;
let lastIncremental: Date | undefined;

/**
 * Generate edge ID
 */
function generateEdgeId(sourceId: string, targetId: string, depType: DependencyType): string {
  return `${sourceId}:${depType}:${targetId}`;
}

/**
 * Add or update a node
 */
export function upsertNode(
  id: string,
  type: TargetType,
  title: string,
  status: NodeStatus,
  locale: string,
  metadata: Record<string, unknown> = {},
  url?: string
): GraphNodeV2 {
  const existing = nodeCache.get(id);

  const node: GraphNodeV2 = {
    id,
    type,
    title,
    status,
    locale,
    url,
    inDegree: existing?.inDegree || 0,
    outDegree: existing?.outDegree || 0,
    pageRank: existing?.pageRank,
    trafficSignal: metadata.traffic as number | undefined,
    revenueSignal: metadata.revenue as number | undefined,
    lastUpdated: new Date(),
    metadata,
  };

  nodeCache.set(id, node);
  return node;
}

/**
 * Get node by ID
 */
export function getNode(id: string): GraphNodeV2 | undefined {
  return nodeCache.get(id);
}

/**
 * Remove node and all its edges
 */
export function removeNode(id: string): boolean {
  const node = nodeCache.get(id);
  if (!node) return false;

  // Remove outgoing edges
  const outgoing = outgoingIndex.get(id);
  if (outgoing) {
    for (const edgeId of outgoing) {
      edgeCache.delete(edgeId);
    }
    outgoingIndex.delete(id);
  }

  // Remove incoming edges
  const incoming = incomingIndex.get(id);
  if (incoming) {
    for (const edgeId of incoming) {
      edgeCache.delete(edgeId);
    }
    incomingIndex.delete(id);
  }

  nodeCache.delete(id);
  pageRankCache.delete(id);

  return true;
}

/**
 * Add or update an edge (idempotent)
 */
export function upsertEdge(
  sourceId: string,
  targetId: string,
  dependencyType: DependencyType,
  confidence: number = 1.0,
  weight: number = 1.0,
  metadata?: Record<string, unknown>
): ContentDependency {
  const edgeId = generateEdgeId(sourceId, targetId, dependencyType);

  const edge: ContentDependency = {
    id: edgeId,
    sourceContentId: sourceId,
    targetType: determineTargetType(targetId),
    targetId,
    dependencyType,
    confidence,
    weight,
    metadata,
    createdAt: edgeCache.get(edgeId)?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  edgeCache.set(edgeId, edge);

  // Update adjacency indices
  const outgoing = outgoingIndex.get(sourceId) || new Set();
  outgoing.add(edgeId);
  outgoingIndex.set(sourceId, outgoing);

  const incoming = incomingIndex.get(targetId) || new Set();
  incoming.add(edgeId);
  incomingIndex.set(targetId, incoming);

  // Update degree counts
  updateDegrees(sourceId);
  updateDegrees(targetId);

  return edge;
}

/**
 * Remove an edge
 */
export function removeEdge(edgeId: string): boolean {
  const edge = edgeCache.get(edgeId);
  if (!edge) return false;

  const outgoing = outgoingIndex.get(edge.sourceContentId);
  if (outgoing) {
    outgoing.delete(edgeId);
    outgoingIndex.set(edge.sourceContentId, outgoing);
  }

  const incoming = incomingIndex.get(edge.targetId);
  if (incoming) {
    incoming.delete(edgeId);
    incomingIndex.set(edge.targetId, incoming);
  }

  edgeCache.delete(edgeId);

  updateDegrees(edge.sourceContentId);
  updateDegrees(edge.targetId);

  return true;
}

/**
 * Determine target type from ID (heuristic)
 */
function determineTargetType(targetId: string): TargetType {
  if (targetId.startsWith('content-') || targetId.match(/^[a-f0-9-]{36}$/i)) return 'content';
  if (targetId.startsWith('entity-')) return 'entity';
  if (targetId.startsWith('media-') || targetId.startsWith('img-')) return 'media';
  if (targetId.startsWith('dest-')) return 'destination';
  if (targetId.startsWith('hotel-')) return 'hotel';
  if (targetId.startsWith('attr-')) return 'attraction';
  return 'content'; // Default
}

/**
 * Update degree counts for a node
 */
function updateDegrees(nodeId: string): void {
  const node = nodeCache.get(nodeId);
  if (!node) return;

  const outgoing = outgoingIndex.get(nodeId);
  const incoming = incomingIndex.get(nodeId);

  node.outDegree = outgoing?.size || 0;
  node.inDegree = incoming?.size || 0;

  nodeCache.set(nodeId, node);
}

/**
 * Get outgoing edges for a node
 */
export function getOutgoingEdges(nodeId: string): ContentDependency[] {
  const edgeIds = outgoingIndex.get(nodeId);
  if (!edgeIds) return [];

  const edges: ContentDependency[] = [];
  for (const id of edgeIds) {
    const edge = edgeCache.get(id);
    if (edge) edges.push(edge);
  }
  return edges;
}

/**
 * Get incoming edges for a node
 */
export function getIncomingEdges(nodeId: string): ContentDependency[] {
  const edgeIds = incomingIndex.get(nodeId);
  if (!edgeIds) return [];

  const edges: ContentDependency[] = [];
  for (const id of edgeIds) {
    const edge = edgeCache.get(id);
    if (edge) edges.push(edge);
  }
  return edges;
}

/**
 * Get direct dependents (nodes that depend on this one)
 */
export function getDirectDependents(nodeId: string): GraphNodeV2[] {
  const edges = getIncomingEdges(nodeId);
  const dependents: GraphNodeV2[] = [];

  for (const edge of edges) {
    const node = nodeCache.get(edge.sourceContentId);
    if (node) dependents.push(node);
  }

  return dependents;
}

/**
 * Get direct dependencies (nodes this one depends on)
 */
export function getDirectDependencies(nodeId: string): GraphNodeV2[] {
  const edges = getOutgoingEdges(nodeId);
  const dependencies: GraphNodeV2[] = [];

  for (const edge of edges) {
    const node = nodeCache.get(edge.targetId);
    if (node) dependencies.push(node);
  }

  return dependencies;
}

/**
 * BFS traversal for transitive dependents
 */
export function getTransitiveDependents(
  nodeId: string,
  maxDepth: number = 5,
  maxNodes: number = 100
): Array<GraphNodeV2 & { depth: number }> {
  const visited = new Set<string>();
  const result: Array<GraphNodeV2 & { depth: number }> = [];
  const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];

  while (queue.length > 0 && result.length < maxNodes) {
    const { id, depth } = queue.shift()!;

    if (visited.has(id)) continue;
    if (depth > maxDepth) continue;

    visited.add(id);

    const dependents = getDirectDependents(id);
    for (const dep of dependents) {
      if (!visited.has(dep.id)) {
        result.push({ ...dep, depth: depth + 1 });
        queue.push({ id: dep.id, depth: depth + 1 });
      }
    }
  }

  // Sort by depth, then by traffic signal
  return result.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return (b.trafficSignal || 0) - (a.trafficSignal || 0);
  });
}

/**
 * Analyze impact of changes to a node
 */
export function analyzeImpact(nodeId: string, maxDepth: number = 5): ImpactAnalysisV2 {
  const node = nodeCache.get(nodeId);
  const directDeps = getDirectDependents(nodeId);
  const transitiveDeps = getTransitiveDependents(nodeId, maxDepth);

  const totalImpact = directDeps.length + transitiveDeps.length;
  const fanOut = directDeps.length;

  // Determine cascade risk
  let cascadeRisk: ImpactAnalysisV2['cascadeRisk'] = 'low';
  if (totalImpact > 50) cascadeRisk = 'critical';
  else if (totalImpact > 20) cascadeRisk = 'high';
  else if (totalImpact > 5) cascadeRisk = 'medium';

  // Generate recommended actions
  const actions = generateRecommendedActions(nodeId, directDeps, transitiveDeps, cascadeRisk);

  return {
    nodeId,
    nodeType: node?.type || 'content',
    directDependents: directDeps,
    transitiveDependents: transitiveDeps,
    totalImpact,
    cascadeRisk,
    fanOut,
    recommendedActions: actions,
  };
}

/**
 * Generate recommended actions based on impact
 */
function generateRecommendedActions(
  _nodeId: string,
  directDeps: GraphNodeV2[],
  transitiveDeps: Array<GraphNodeV2 & { depth: number }>,
  cascadeRisk: string
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  const allAffected = [...directDeps.map(d => d.id), ...transitiveDeps.map(d => d.id)];
  const uniqueAffected = [...new Set(allAffected)].slice(0, 50);

  // Always recommend reindex for direct dependents
  if (directDeps.length > 0) {
    actions.push({
      action: 'reindex',
      priority: cascadeRisk === 'critical' ? 'critical' : 'high',
      affectedContentIds: directDeps.map(d => d.id).slice(0, 20),
      reason: `${directDeps.length} direct dependents need reindexing`,
    });
  }

  // Recommend AEO regeneration for high-traffic dependents
  const highTraffic = [...directDeps, ...transitiveDeps].filter(d => (d.trafficSignal || 0) > 1000);
  if (highTraffic.length > 0) {
    actions.push({
      action: 'regenerate_aeo',
      priority: 'high',
      affectedContentIds: highTraffic.map(d => d.id).slice(0, 10),
      reason: `${highTraffic.length} high-traffic pages may need AEO updates`,
    });
  }

  // Recommend internal link refresh for cascade scenarios
  if (cascadeRisk !== 'low') {
    actions.push({
      action: 'refresh_internal_links',
      priority: 'medium',
      affectedContentIds: uniqueAffected.slice(0, 30),
      reason: 'Internal links may need updating due to content change cascade',
    });
  }

  // Manual review for critical cascade
  if (cascadeRisk === 'critical') {
    actions.push({
      action: 'mark_for_review',
      priority: 'critical',
      affectedContentIds: uniqueAffected.slice(0, 10),
      reason: 'Critical cascade risk - manual review recommended before changes',
    });
  }

  return actions;
}

/**
 * Find orphan nodes
 */
export function findOrphans(limit: number = 100): OrphanResult[] {
  const orphans: OrphanResult[] = [];

  for (const node of nodeCache.values()) {
    if (orphans.length >= limit) break;

    const hasIncoming = (incomingIndex.get(node.id)?.size || 0) > 0;
    const hasOutgoing = (outgoingIndex.get(node.id)?.size || 0) > 0;

    let reason: OrphanResult['reason'] | null = null;

    if (!hasIncoming && !hasOutgoing) {
      reason = 'isolated';
    } else if (!hasIncoming) {
      reason = 'no_incoming';
    } else if (!hasOutgoing && node.type === 'content') {
      reason = 'dead_end';
    }

    if (reason) {
      orphans.push({
        nodeId: node.id,
        nodeType: node.type,
        title: node.title,
        reason,
        lastUpdated: node.lastUpdated,
        suggestedAction: getSuggestedOrphanAction(reason, node.type),
      });
    }
  }

  return orphans;
}

/**
 * Get suggested action for orphan
 */
function getSuggestedOrphanAction(reason: OrphanResult['reason'], type: TargetType): string {
  switch (reason) {
    case 'isolated':
      return type === 'content' ? 'Add internal links to and from this content' : 'Link this resource from relevant content';
    case 'no_incoming':
      return 'Add links from other content to make this page discoverable';
    case 'dead_end':
      return 'Add outgoing links to improve user navigation and SEO';
    default:
      return 'Review content structure';
  }
}

/**
 * Find hub nodes (high centrality)
 */
export function findHubs(limit: number = 20): HubNode[] {
  const nodes: Array<{ node: GraphNodeV2; totalDegree: number }> = [];

  for (const node of nodeCache.values()) {
    const totalDegree = node.inDegree + node.outDegree;
    if (totalDegree > 2) { // Only consider nodes with some connections
      nodes.push({ node, totalDegree });
    }
  }

  // Sort by total degree
  nodes.sort((a, b) => b.totalDegree - a.totalDegree);

  // Take top N and calculate PageRank if needed
  const hubs: HubNode[] = [];
  for (const { node, totalDegree } of nodes.slice(0, limit)) {
    const pageRank = pageRankCache.get(node.id) || calculateSimplePageRank(node.id);
    pageRankCache.set(node.id, pageRank);

    hubs.push({
      node,
      inDegree: node.inDegree,
      outDegree: node.outDegree,
      totalDegree,
      pageRank,
      isBottleneck: node.inDegree > 10 && node.outDegree < 3,
    });
  }

  return hubs;
}

/**
 * Simple PageRank calculation (single node)
 */
function calculateSimplePageRank(nodeId: string, damping: number = 0.85): number {
  const incoming = getIncomingEdges(nodeId);
  if (incoming.length === 0) return 1 - damping;

  let rank = 0;
  for (const edge of incoming) {
    const sourceNode = nodeCache.get(edge.sourceContentId);
    if (sourceNode && sourceNode.outDegree > 0) {
      const sourceRank = pageRankCache.get(edge.sourceContentId) || 1;
      rank += (sourceRank / sourceNode.outDegree) * edge.weight;
    }
  }

  return (1 - damping) + damping * rank;
}

/**
 * Build graph from content
 */
export function buildFromContent(content: ContentWithDependencies): GraphBuildResult {
  const startTime = Date.now();
  let nodesCreated = 0;
  let nodesUpdated = 0;
  let edgesCreated = 0;
  let edgesRemoved = 0;

  const existing = nodeCache.get(content.contentId);
  if (existing) {
    nodesUpdated = 1;
  } else {
    nodesCreated = 1;
  }

  // Upsert content node
  upsertNode(
    content.contentId,
    'content',
    content.title,
    content.status,
    content.locale,
    {},
    content.url
  );

  // Remove old edges for this content
  const oldOutgoing = outgoingIndex.get(content.contentId);
  if (oldOutgoing) {
    for (const edgeId of oldOutgoing) {
      if (removeEdge(edgeId)) edgesRemoved++;
    }
  }

  // Add internal links
  for (const link of content.internalLinks) {
    upsertEdge(content.contentId, link.targetId, 'internal_link', 1.0, 1.0, { anchor: link.anchor });
    edgesCreated++;
  }

  // Add entity references
  for (const entity of content.entityMentions) {
    upsertEdge(content.contentId, entity.entityId, 'entity_reference', 0.9, 0.8);
    edgesCreated++;
  }

  // Add media references
  for (const mediaId of content.mediaReferences) {
    upsertEdge(content.contentId, mediaId, 'media_embed', 1.0, 0.5);
    edgesCreated++;
  }

  // Add related content
  for (const relatedId of content.relatedContent) {
    upsertEdge(content.contentId, relatedId, 'related_content', 0.7, 0.6);
    edgesCreated++;
  }

  // Add parent relationship
  if (content.parentId) {
    upsertEdge(content.contentId, content.parentId, 'parent_child', 1.0, 1.0);
    edgesCreated++;
  }

  // Add translation relationship
  if (content.translationGroupId) {
    upsertEdge(content.contentId, content.translationGroupId, 'translation', 1.0, 0.3);
    edgesCreated++;
  }

  lastIncremental = new Date();

  return {
    nodesCreated,
    nodesUpdated,
    edgesCreated,
    edgesRemoved,
    duration: Date.now() - startTime,
    errors: [],
  };
}

/**
 * Batch build graph
 */
export function batchBuild(contents: ContentWithDependencies[]): GraphBuildResult {
  const startTime = Date.now();
  let nodesCreated = 0;
  let nodesUpdated = 0;
  let edgesCreated = 0;
  let edgesRemoved = 0;
  const errors: Array<{ contentId: string; error: string }> = [];

  for (const content of contents) {
    try {
      const result = buildFromContent(content);
      nodesCreated += result.nodesCreated;
      nodesUpdated += result.nodesUpdated;
      edgesCreated += result.edgesCreated;
      edgesRemoved += result.edgesRemoved;
    } catch (err) {
      errors.push({
        contentId: content.contentId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  if (contents.length > 10) {
    lastFullRebuild = new Date();
  }

  return {
    nodesCreated,
    nodesUpdated,
    edgesCreated,
    edgesRemoved,
    duration: Date.now() - startTime,
    errors,
  };
}

/**
 * Find shortest path between nodes
 */
export function findPath(sourceId: string, targetId: string, maxDepth: number = 10): GraphPathV2 | null {
  if (sourceId === targetId) {
    return { source: sourceId, target: targetId, path: [sourceId], edges: [], length: 0, totalWeight: 0 };
  }

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[]; edges: ContentDependency[]; weight: number }> = [
    { nodeId: sourceId, path: [sourceId], edges: [], weight: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, path, edges, weight } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    if (path.length > maxDepth) continue;

    visited.add(nodeId);

    for (const edge of getOutgoingEdges(nodeId)) {
      if (edge.targetId === targetId) {
        return {
          source: sourceId,
          target: targetId,
          path: [...path, targetId],
          edges: [...edges, edge],
          length: path.length,
          totalWeight: weight + edge.weight,
        };
      }

      if (!visited.has(edge.targetId)) {
        queue.push({
          nodeId: edge.targetId,
          path: [...path, edge.targetId],
          edges: [...edges, edge],
          weight: weight + edge.weight,
        });
      }
    }
  }

  return null;
}

/**
 * Detect circular dependencies
 */
export function detectCircularDependencies(limit: number = 10): string[][] {
  const circles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    if (circles.length >= limit) return;

    if (recursionStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      if (cycleStart >= 0) {
        circles.push(path.slice(cycleStart));
      }
      return;
    }

    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    for (const dep of getDirectDependencies(nodeId)) {
      dfs(dep.id, [...path, nodeId]);
    }

    recursionStack.delete(nodeId);
  }

  for (const node of nodeCache.values()) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }

  return circles;
}

/**
 * Get graph statistics
 */
export function getGraphStats(): GraphStatsV2 {
  const nodesByType: Record<TargetType, number> = {
    content: 0,
    entity: 0,
    media: 0,
    destination: 0,
    hotel: 0,
    attraction: 0,
  };

  const edgesByType: Record<DependencyType, number> = {
    internal_link: 0,
    entity_reference: 0,
    media_embed: 0,
    content_embed: 0,
    related_content: 0,
    parent_child: 0,
    translation: 0,
    canonical: 0,
  };

  let totalInDegree = 0;
  let totalOutDegree = 0;

  for (const node of nodeCache.values()) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    totalInDegree += node.inDegree;
    totalOutDegree += node.outDegree;
  }

  for (const edge of edgeCache.values()) {
    edgesByType[edge.dependencyType] = (edgesByType[edge.dependencyType] || 0) + 1;
  }

  const nodeCount = nodeCache.size();
  const orphans = findOrphans(1000);
  const hubs = findHubs(100);

  return {
    totalNodes: nodeCount,
    totalEdges: edgeCache.size(),
    nodesByType,
    edgesByType,
    averageInDegree: nodeCount > 0 ? totalInDegree / nodeCount : 0,
    averageOutDegree: nodeCount > 0 ? totalOutDegree / nodeCount : 0,
    orphanCount: orphans.length,
    hubCount: hubs.length,
    circularDependencyCount: detectCircularDependencies(100).length,
    lastRebuildAt: lastFullRebuild,
    lastIncrementalAt: lastIncremental,
  };
}

/**
 * Clear all caches (for testing)
 */
export function clearGraph(): void {
  nodeCache.clear();
  edgeCache.clear();
  outgoingIndex.clear();
  incomingIndex.clear();
  pageRankCache.clear();
  lastFullRebuild = undefined;
  lastIncremental = undefined;
}

/**
 * Get cache stats
 */
export function getGraphCacheStats(): {
  nodes: { size: number; maxSize: number };
  edges: { size: number; maxSize: number };
} {
  return {
    nodes: nodeCache.stats(),
    edges: edgeCache.stats(),
  };
}
