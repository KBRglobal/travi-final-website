/**
 * Link Graph Engine - Centrality
 * Calculates authority and centrality scores
 */

import {
  LinkGraph,
  LinkNode,
  CentralityScores,
  GraphMetrics,
  DEFAULT_LINK_GRAPH_CONFIG,
} from './types';
import { getGraph } from './graph-builder';

const CONVERGENCE_THRESHOLD = 0.0001;

export function calculatePageRank(graph: LinkGraph): Map<string, number> {
  const { nodes, edges } = graph;
  const damping = DEFAULT_LINK_GRAPH_CONFIG.pageRankDamping;
  const maxIterations = DEFAULT_LINK_GRAPH_CONFIG.maxIterations;
  const nodeCount = nodes.size;

  if (nodeCount === 0) return new Map();

  // Initialize PageRank
  const pr = new Map<string, number>();
  const initialRank = 1 / nodeCount;
  for (const id of nodes.keys()) {
    pr.set(id, initialRank);
  }

  // Build outbound links map
  const outboundMap = new Map<string, string[]>();
  for (const edge of edges.values()) {
    const list = outboundMap.get(edge.sourceId) || [];
    list.push(edge.targetId);
    outboundMap.set(edge.sourceId, list);
  }

  // Iterate until convergence
  for (let i = 0; i < maxIterations; i++) {
    const newPr = new Map<string, number>();
    let maxDiff = 0;

    for (const nodeId of nodes.keys()) {
      // Calculate incoming PageRank
      let incomingRank = 0;

      for (const edge of edges.values()) {
        if (edge.targetId === nodeId) {
          const sourceOutbound = outboundMap.get(edge.sourceId)?.length || 1;
          const sourcePr = pr.get(edge.sourceId) || 0;
          incomingRank += sourcePr / sourceOutbound;
        }
      }

      const newRank = (1 - damping) / nodeCount + damping * incomingRank;
      newPr.set(nodeId, newRank);

      const diff = Math.abs(newRank - (pr.get(nodeId) || 0));
      maxDiff = Math.max(maxDiff, diff);
    }

    // Update ranks
    for (const [id, rank] of newPr) {
      pr.set(id, rank);
    }

    // Check convergence
    if (maxDiff < CONVERGENCE_THRESHOLD) {
      break;
    }
  }

  return pr;
}

export function calculateHITS(graph: LinkGraph): {
  hubs: Map<string, number>;
  authorities: Map<string, number>;
} {
  const { nodes, edges } = graph;
  const maxIterations = DEFAULT_LINK_GRAPH_CONFIG.maxIterations;

  const hubs = new Map<string, number>();
  const authorities = new Map<string, number>();

  // Initialize scores
  for (const id of nodes.keys()) {
    hubs.set(id, 1);
    authorities.set(id, 1);
  }

  // Build adjacency maps
  const inboundMap = new Map<string, string[]>();
  const outboundMap = new Map<string, string[]>();

  for (const edge of edges.values()) {
    const inList = inboundMap.get(edge.targetId) || [];
    inList.push(edge.sourceId);
    inboundMap.set(edge.targetId, inList);

    const outList = outboundMap.get(edge.sourceId) || [];
    outList.push(edge.targetId);
    outboundMap.set(edge.sourceId, outList);
  }

  for (let i = 0; i < maxIterations; i++) {
    // Update authority scores
    let authNorm = 0;
    for (const nodeId of nodes.keys()) {
      const inbound = inboundMap.get(nodeId) || [];
      const authScore = inbound.reduce((sum, srcId) => sum + (hubs.get(srcId) || 0), 0);
      authorities.set(nodeId, authScore);
      authNorm += authScore * authScore;
    }
    authNorm = Math.sqrt(authNorm) || 1;

    // Normalize authority scores
    for (const [id, score] of authorities) {
      authorities.set(id, score / authNorm);
    }

    // Update hub scores
    let hubNorm = 0;
    for (const nodeId of nodes.keys()) {
      const outbound = outboundMap.get(nodeId) || [];
      const hubScore = outbound.reduce((sum, tgtId) => sum + (authorities.get(tgtId) || 0), 0);
      hubs.set(nodeId, hubScore);
      hubNorm += hubScore * hubScore;
    }
    hubNorm = Math.sqrt(hubNorm) || 1;

    // Normalize hub scores
    for (const [id, score] of hubs) {
      hubs.set(id, score / hubNorm);
    }
  }

  return { hubs, authorities };
}

export function calculateCentralityScores(contentId: string): CentralityScores | null {
  const graph = getGraph();
  const node = graph.nodes.get(contentId);
  if (!node) return null;

  const pageRanks = calculatePageRank(graph);
  const { hubs, authorities } = calculateHITS(graph);

  return {
    contentId,
    pageRank: pageRanks.get(contentId) || 0,
    hubScore: hubs.get(contentId) || 0,
    authorityScore: authorities.get(contentId) || 0,
    betweenness: 0, // Simplified - full betweenness calculation is expensive
    closeness: 0,
  };
}

export function updateAuthorityScores(): void {
  const graph = getGraph();
  const { authorities } = calculateHITS(graph);
  const pageRanks = calculatePageRank(graph);

  for (const [id, node] of graph.nodes) {
    // Combine HITS authority with PageRank
    const hitsAuth = authorities.get(id) || 0;
    const pr = pageRanks.get(id) || 0;
    node.authorityScore = (hitsAuth * 0.5 + pr * 0.5) * 100;
  }
}

export function getGraphMetrics(): GraphMetrics {
  const graph = getGraph();
  const nodes = Array.from(graph.nodes.values());
  const nodeCount = nodes.length;
  const edgeCount = graph.edges.size;

  if (nodeCount === 0) {
    return {
      totalNodes: 0,
      totalEdges: 0,
      orphanCount: 0,
      averageInbound: 0,
      averageOutbound: 0,
      maxInbound: 0,
      maxOutbound: 0,
      averageAuthority: 0,
      clusterCount: 0,
      density: 0,
    };
  }

  const orphanCount = nodes.filter(n => n.isOrphan).length;
  const totalInbound = nodes.reduce((sum, n) => sum + n.inboundLinks, 0);
  const totalOutbound = nodes.reduce((sum, n) => sum + n.outboundLinks, 0);
  const totalAuthority = nodes.reduce((sum, n) => sum + n.authorityScore, 0);

  const maxInbound = Math.max(...nodes.map(n => n.inboundLinks));
  const maxOutbound = Math.max(...nodes.map(n => n.outboundLinks));

  const clusters = new Set(nodes.map(n => n.clusterId).filter(Boolean));

  // Graph density: actual edges / possible edges
  const possibleEdges = nodeCount * (nodeCount - 1);
  const density = possibleEdges > 0 ? edgeCount / possibleEdges : 0;

  return {
    totalNodes: nodeCount,
    totalEdges: edgeCount,
    orphanCount,
    averageInbound: totalInbound / nodeCount,
    averageOutbound: totalOutbound / nodeCount,
    maxInbound,
    maxOutbound,
    averageAuthority: totalAuthority / nodeCount,
    clusterCount: clusters.size,
    density,
  };
}
