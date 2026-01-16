/**
 * Content Dependency Graph - Graph Manager
 */

import {
  GraphNode,
  GraphEdge,
  DependencyType,
  ImpactAnalysis,
  OrphanContent,
  GraphStats,
  GraphPath,
} from './types';

// In-memory graph storage
const nodes = new Map<string, GraphNode>();
const edges = new Map<string, GraphEdge>();
const outgoingEdges = new Map<string, Set<string>>(); // nodeId -> edgeIds
const incomingEdges = new Map<string, Set<string>>(); // nodeId -> edgeIds

/**
 * Add or update a node.
 */
export function addNode(node: GraphNode): GraphNode {
  nodes.set(node.id, node);

  // Initialize edge sets if not exists
  if (!outgoingEdges.has(node.id)) {
    outgoingEdges.set(node.id, new Set());
  }
  if (!incomingEdges.has(node.id)) {
    incomingEdges.set(node.id, new Set());
  }

  return node;
}

/**
 * Get node.
 */
export function getNode(nodeId: string): GraphNode | null {
  return nodes.get(nodeId) || null;
}

/**
 * Remove node.
 */
export function removeNode(nodeId: string): boolean {
  const node = nodes.get(nodeId);
  if (!node) return false;

  // Remove all edges connected to this node
  const outgoing = outgoingEdges.get(nodeId) || new Set();
  const incoming = incomingEdges.get(nodeId) || new Set();

  for (const edgeId of [...outgoing, ...incoming]) {
    removeEdge(edgeId);
  }

  nodes.delete(nodeId);
  outgoingEdges.delete(nodeId);
  incomingEdges.delete(nodeId);

  return true;
}

/**
 * Add an edge.
 */
export function addEdge(
  sourceId: string,
  targetId: string,
  type: DependencyType,
  weight: number = 1,
  metadata?: Record<string, unknown>
): GraphEdge {
  const id = `edge-${sourceId}-${targetId}-${type}`;

  const edge: GraphEdge = {
    id,
    sourceId,
    targetId,
    type,
    weight,
    createdAt: new Date(),
    metadata,
  };

  edges.set(id, edge);

  // Update adjacency
  if (!outgoingEdges.has(sourceId)) {
    outgoingEdges.set(sourceId, new Set());
  }
  outgoingEdges.get(sourceId)!.add(id);

  if (!incomingEdges.has(targetId)) {
    incomingEdges.set(targetId, new Set());
  }
  incomingEdges.get(targetId)!.add(id);

  return edge;
}

/**
 * Remove edge.
 */
export function removeEdge(edgeId: string): boolean {
  const edge = edges.get(edgeId);
  if (!edge) return false;

  outgoingEdges.get(edge.sourceId)?.delete(edgeId);
  incomingEdges.get(edge.targetId)?.delete(edgeId);
  edges.delete(edgeId);

  return true;
}

/**
 * Get outgoing edges.
 */
export function getOutgoingEdges(nodeId: string): GraphEdge[] {
  const edgeIds = outgoingEdges.get(nodeId) || new Set();
  return Array.from(edgeIds).map(id => edges.get(id)!).filter(Boolean);
}

/**
 * Get incoming edges.
 */
export function getIncomingEdges(nodeId: string): GraphEdge[] {
  const edgeIds = incomingEdges.get(nodeId) || new Set();
  return Array.from(edgeIds).map(id => edges.get(id)!).filter(Boolean);
}

/**
 * Get direct dependents.
 */
export function getDirectDependents(nodeId: string): GraphNode[] {
  const edgeList = getIncomingEdges(nodeId);
  return edgeList.map(e => nodes.get(e.sourceId)!).filter(Boolean);
}

/**
 * Get direct dependencies.
 */
export function getDirectDependencies(nodeId: string): GraphNode[] {
  const edgeList = getOutgoingEdges(nodeId);
  return edgeList.map(e => nodes.get(e.targetId)!).filter(Boolean);
}

/**
 * Get transitive dependents (BFS).
 */
export function getTransitiveDependents(nodeId: string, maxDepth: number = 10): GraphNode[] {
  const visited = new Set<string>();
  const result: GraphNode[] = [];
  const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;
    if (visited.has(id)) continue;
    visited.add(id);

    const dependents = getDirectDependents(id);
    for (const dep of dependents) {
      if (!visited.has(dep.id)) {
        result.push(dep);
        queue.push({ id: dep.id, depth: depth + 1 });
      }
    }
  }

  return result;
}

/**
 * Analyze impact of changes.
 */
export function analyzeImpact(nodeId: string): ImpactAnalysis {
  const directDeps = getDirectDependents(nodeId);
  const transitiveDeps = getTransitiveDependents(nodeId);

  // Check for broken link risk (if node would be deleted)
  const brokenLinkRisk = directDeps.length > 0;

  // Generate suggested actions
  const suggestedActions: string[] = [];
  if (directDeps.length > 0) {
    suggestedActions.push(`Update ${directDeps.length} direct dependents before changes`);
  }
  if (transitiveDeps.length > 5) {
    suggestedActions.push('Consider staged rollout due to high impact');
  }

  return {
    nodeId,
    directDependents: directDeps,
    transitiveDependents: transitiveDeps,
    totalImpact: directDeps.length + transitiveDeps.length,
    brokenLinkRisk,
    suggestedActions,
  };
}

/**
 * Find orphan content.
 */
export function findOrphans(): OrphanContent[] {
  const orphans: OrphanContent[] = [];

  for (const [nodeId, node] of nodes) {
    const incoming = getIncomingEdges(nodeId);
    const outgoing = getOutgoingEdges(nodeId);

    if (incoming.length === 0 && outgoing.length === 0) {
      orphans.push({
        nodeId,
        title: node.title,
        reason: 'isolated',
        createdAt: new Date(),
      });
    } else if (incoming.length === 0) {
      orphans.push({
        nodeId,
        title: node.title,
        reason: 'no_incoming_links',
        createdAt: new Date(),
      });
    }
  }

  return orphans;
}

/**
 * Detect circular dependencies.
 */
export function detectCircularDependencies(): string[][] {
  const circles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      circles.push(path.slice(cycleStart));
      return;
    }

    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    for (const dep of getDirectDependencies(nodeId)) {
      dfs(dep.id, [...path]);
    }

    recursionStack.delete(nodeId);
  }

  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return circles;
}

/**
 * Find shortest path.
 */
export function findShortestPath(fromId: string, toId: string): GraphPath | null {
  if (fromId === toId) {
    return { nodes: [fromId], edges: [], length: 0 };
  }

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[]; edgePath: GraphEdge[] }> = [
    { nodeId: fromId, path: [fromId], edgePath: [] },
  ];

  while (queue.length > 0) {
    const { nodeId, path, edgePath } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    for (const edge of getOutgoingEdges(nodeId)) {
      const nextId = edge.targetId;

      if (nextId === toId) {
        return {
          nodes: [...path, nextId],
          edges: [...edgePath, edge],
          length: path.length,
        };
      }

      if (!visited.has(nextId)) {
        queue.push({
          nodeId: nextId,
          path: [...path, nextId],
          edgePath: [...edgePath, edge],
        });
      }
    }
  }

  return null;
}

/**
 * Get graph statistics.
 */
export function getGraphStats(): GraphStats {
  const nodesByType: Record<string, number> = {};
  for (const node of nodes.values()) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  }

  const edgesByType: Record<DependencyType, number> = {
    internal_link: 0,
    entity_reference: 0,
    media_embed: 0,
    content_embed: 0,
    related_content: 0,
    parent_child: 0,
    translation: 0,
  };

  for (const edge of edges.values()) {
    edgesByType[edge.type]++;
  }

  const totalConnections = Array.from(nodes.keys())
    .reduce((sum, id) => sum + getOutgoingEdges(id).length + getIncomingEdges(id).length, 0);

  const avgConnections = nodes.size > 0 ? totalConnections / nodes.size : 0;

  return {
    totalNodes: nodes.size,
    totalEdges: edges.size,
    nodesByType,
    edgesByType,
    averageConnections: Math.round(avgConnections * 100) / 100,
    orphanCount: findOrphans().length,
    circularDependencies: detectCircularDependencies().length,
  };
}

/**
 * Get all nodes.
 */
export function getAllNodes(): GraphNode[] {
  return Array.from(nodes.values());
}

/**
 * Get nodes by type.
 */
export function getNodesByType(type: GraphNode['type']): GraphNode[] {
  return Array.from(nodes.values()).filter(n => n.type === type);
}

/**
 * Build graph from content.
 */
export function buildGraphFromContent(
  contentId: string,
  title: string,
  status: string,
  locale: string,
  links: Array<{ targetId: string; type: DependencyType }>
): void {
  // Add content node
  addNode({
    id: contentId,
    type: 'content',
    title,
    status,
    locale,
    metadata: {},
  });

  // Add edges
  for (const link of links) {
    addEdge(contentId, link.targetId, link.type);
  }
}
