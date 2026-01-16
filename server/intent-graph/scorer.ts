/**
 * Intent Graph Scorer
 *
 * Deterministic scoring for nodes, edges, and paths.
 */

import type {
  GraphNode,
  GraphEdge,
  NodeScore,
  EdgeScore,
  PathScore,
  IntentNode,
  ContentNode,
  OutcomeNode,
  Journey,
} from './types';
import { getIntentGraphBuilder, IntentGraphBuilder } from './graph-builder';

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

interface ScoringWeights {
  traffic: number;
  conversion: number;
  value: number;
  engagement: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  traffic: 0.25,
  conversion: 0.35,
  value: 0.25,
  engagement: 0.15,
};

// ============================================================================
// NODE SCORER
// ============================================================================

export class IntentGraphScorer {
  private builder: IntentGraphBuilder;
  private weights: ScoringWeights;
  private nodeScores: Map<string, NodeScore>;
  private edgeScores: Map<string, EdgeScore>;

  constructor(builder?: IntentGraphBuilder, weights?: Partial<ScoringWeights>) {
    this.builder = builder || getIntentGraphBuilder();
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.nodeScores = new Map();
    this.edgeScores = new Map();
  }

  // ==========================================================================
  // NODE SCORING
  // ==========================================================================

  /**
   * Score a single node
   */
  scoreNode(nodeId: string): NodeScore | undefined {
    const node = this.builder.getNode(nodeId);
    if (!node) return undefined;

    const incomingEdges = this.builder.getIncomingEdges(nodeId);
    const outgoingEdges = this.builder.getOutgoingEdges(nodeId);

    // Traffic component: incoming edge weight sum
    const trafficScore = Math.min(100, incomingEdges.reduce((sum, e) => sum + e.weight, 0));

    // Conversion component: success rate of outgoing edges
    const conversionScore = outgoingEdges.length > 0
      ? (outgoingEdges.reduce((sum, e) => sum + e.successRate, 0) / outgoingEdges.length) * 100
      : 0;

    // Value component: average value from edges
    const allEdges = [...incomingEdges, ...outgoingEdges];
    const valueScore = allEdges.length > 0
      ? Math.min(100, (allEdges.reduce((sum, e) => sum + e.avgValue, 0) / allEdges.length) * 10)
      : 0;

    // Engagement component: based on edge count and weight variance
    const engagementScore = Math.min(100, (incomingEdges.length + outgoingEdges.length) * 5);

    // Weighted final score
    const score =
      trafficScore * this.weights.traffic +
      conversionScore * this.weights.conversion +
      valueScore * this.weights.value +
      engagementScore * this.weights.engagement;

    const nodeScore: NodeScore = {
      nodeId,
      score: Math.round(score * 100) / 100,
      components: {
        traffic: Math.round(trafficScore * 100) / 100,
        conversion: Math.round(conversionScore * 100) / 100,
        value: Math.round(valueScore * 100) / 100,
        engagement: Math.round(engagementScore * 100) / 100,
      },
      rank: 0,
    };

    this.nodeScores.set(nodeId, nodeScore);
    return nodeScore;
  }

  /**
   * Score all nodes and assign ranks
   */
  scoreAllNodes(): NodeScore[] {
    const { nodes } = this.builder.exportGraph();
    const scores: NodeScore[] = [];

    for (const node of nodes) {
      const score = this.scoreNode(node.id);
      if (score) scores.push(score);
    }

    // Assign ranks
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((s, i) => {
      s.rank = i + 1;
      this.nodeScores.set(s.nodeId, s);
    });

    return scores;
  }

  /**
   * Get top performing nodes
   */
  getTopNodes(limit: number = 10): NodeScore[] {
    const scores = this.scoreAllNodes();
    return scores.slice(0, limit);
  }

  /**
   * Get worst performing nodes
   */
  getWorstNodes(limit: number = 10): NodeScore[] {
    const scores = this.scoreAllNodes();
    return scores.slice(-limit).reverse();
  }

  // ==========================================================================
  // EDGE SCORING
  // ==========================================================================

  /**
   * Score a single edge
   */
  scoreEdge(sourceId: string, targetId: string): EdgeScore | undefined {
    const edge = this.builder.getEdge(sourceId, targetId);
    if (!edge) return undefined;

    // Drop-off rate: 1 - success rate
    const dropOffRate = 1 - edge.successRate;

    // Value contribution: normalized edge value
    const valueContribution = Math.min(1, edge.avgValue / 10);

    // Friction: inverse of weight (low weight = high friction)
    const friction = Math.max(0, Math.min(1, 1 - (edge.weight / 100)));

    // Overall score (higher is better)
    const score = (edge.successRate * 0.4 + valueContribution * 0.4 + (1 - friction) * 0.2) * 100;

    const edgeScore: EdgeScore = {
      edgeId: edge.id,
      score: Math.round(score * 100) / 100,
      dropOffRate: Math.round(dropOffRate * 1000) / 1000,
      valueContribution: Math.round(valueContribution * 1000) / 1000,
      friction: Math.round(friction * 1000) / 1000,
    };

    this.edgeScores.set(edge.id, edgeScore);
    return edgeScore;
  }

  /**
   * Score all edges
   */
  scoreAllEdges(): EdgeScore[] {
    const { edges } = this.builder.exportGraph();
    const scores: EdgeScore[] = [];

    for (const edge of edges) {
      const score = this.scoreEdge(edge.sourceId, edge.targetId);
      if (score) scores.push(score);
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Get high-friction edges (bottlenecks)
   */
  getHighFrictionEdges(limit: number = 10): EdgeScore[] {
    const scores = this.scoreAllEdges();
    return scores.sort((a, b) => b.friction - a.friction).slice(0, limit);
  }

  /**
   * Get high drop-off edges
   */
  getHighDropOffEdges(limit: number = 10): EdgeScore[] {
    const scores = this.scoreAllEdges();
    return scores.sort((a, b) => b.dropOffRate - a.dropOffRate).slice(0, limit);
  }

  // ==========================================================================
  // PATH SCORING
  // ==========================================================================

  /**
   * Score a specific path
   */
  scorePath(nodeIds: string[]): PathScore {
    if (nodeIds.length === 0) {
      return {
        path: [],
        score: 0,
        conversionRate: 0,
        avgValue: 0,
        avgDuration: 0,
        bottlenecks: [],
      };
    }

    const bottlenecks: string[] = [];
    let totalEdgeScore = 0;
    let edgeCount = 0;
    let totalDropOff = 0;
    let totalValue = 0;

    for (let i = 0; i < nodeIds.length - 1; i++) {
      const edge = this.builder.getEdge(nodeIds[i], nodeIds[i + 1]);
      if (edge) {
        const edgeScore = this.scoreEdge(edge.sourceId, edge.targetId);
        if (edgeScore) {
          totalEdgeScore += edgeScore.score;
          totalDropOff += edgeScore.dropOffRate;
          totalValue += edge.avgValue;
          edgeCount++;

          // Identify bottlenecks (high friction or drop-off)
          if (edgeScore.friction > 0.5 || edgeScore.dropOffRate > 0.5) {
            bottlenecks.push(edge.id);
          }
        }
      }
    }

    const avgEdgeScore = edgeCount > 0 ? totalEdgeScore / edgeCount : 0;
    const avgDropOff = edgeCount > 0 ? totalDropOff / edgeCount : 1;
    const avgValue = edgeCount > 0 ? totalValue / edgeCount : 0;

    // Conversion rate approximation: product of (1 - dropOff) for each step
    let conversionRate = 1;
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const edge = this.builder.getEdge(nodeIds[i], nodeIds[i + 1]);
      if (edge) {
        conversionRate *= edge.successRate;
      }
    }

    return {
      path: nodeIds,
      score: Math.round(avgEdgeScore * 100) / 100,
      conversionRate: Math.round(conversionRate * 10000) / 10000,
      avgValue: Math.round(avgValue * 100) / 100,
      avgDuration: 0, // Would need journey data
      bottlenecks,
    };
  }

  /**
   * Find and score common paths from journeys
   */
  scoreCommonPaths(minOccurrences: number = 3): PathScore[] {
    const { journeys } = this.builder.exportGraph();
    const pathCounts = new Map<string, { nodes: string[]; count: number }>();

    // Count path occurrences (using path signatures)
    for (const journey of journeys) {
      if (journey.nodes.length < 2) continue;

      // Create path signature
      const signature = journey.nodes.join('->');
      const existing = pathCounts.get(signature);

      if (existing) {
        existing.count++;
      } else {
        pathCounts.set(signature, { nodes: journey.nodes, count: 1 });
      }
    }

    // Score paths that meet minimum occurrences
    const pathScores: PathScore[] = [];
    for (const [, data] of pathCounts) {
      if (data.count >= minOccurrences) {
        const score = this.scorePath(data.nodes);
        pathScores.push(score);
      }
    }

    return pathScores.sort((a, b) => b.score - a.score);
  }

  /**
   * Get highest value paths
   */
  getHighValuePaths(limit: number = 10): PathScore[] {
    const paths = this.scoreCommonPaths(2);
    return paths.sort((a, b) => b.avgValue - a.avgValue).slice(0, limit);
  }

  /**
   * Get highest conversion paths
   */
  getHighConversionPaths(limit: number = 10): PathScore[] {
    const paths = this.scoreCommonPaths(2);
    return paths.sort((a, b) => b.conversionRate - a.conversionRate).slice(0, limit);
  }

  // ==========================================================================
  // CACHED SCORES
  // ==========================================================================

  /**
   * Get cached node score
   */
  getCachedNodeScore(nodeId: string): NodeScore | undefined {
    return this.nodeScores.get(nodeId);
  }

  /**
   * Get cached edge score
   */
  getCachedEdgeScore(edgeId: string): EdgeScore | undefined {
    return this.edgeScores.get(edgeId);
  }

  /**
   * Clear all cached scores
   */
  clearCache(): void {
    this.nodeScores.clear();
    this.edgeScores.clear();
  }
}

// Singleton instance
let scorerInstance: IntentGraphScorer | null = null;

export function getIntentGraphScorer(): IntentGraphScorer {
  if (!scorerInstance) {
    scorerInstance = new IntentGraphScorer();
  }
  return scorerInstance;
}

export function resetIntentGraphScorer(): void {
  if (scorerInstance) {
    scorerInstance.clearCache();
  }
  scorerInstance = null;
}
