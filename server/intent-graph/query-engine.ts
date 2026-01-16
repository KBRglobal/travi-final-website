/**
 * Intent Graph Query Engine
 *
 * Supports complex queries like:
 * - "What intents usually fail before conversion?"
 * - "Which content breaks high-value journeys?"
 */

import type {
  GraphQuery,
  QueryResult,
  QueryType,
  IntentType,
  OutcomeType,
  GraphNode,
  GraphEdge,
  Journey,
  IntentNode,
  ContentNode,
  OutcomeNode,
} from './types';
import { getIntentGraphBuilder, IntentGraphBuilder } from './graph-builder';
import { getIntentGraphScorer, IntentGraphScorer } from './scorer';

// ============================================================================
// QUERY ENGINE
// ============================================================================

export class IntentGraphQueryEngine {
  private builder: IntentGraphBuilder;
  private scorer: IntentGraphScorer;
  private queryTimeoutMs: number;

  constructor(
    builder?: IntentGraphBuilder,
    scorer?: IntentGraphScorer,
    queryTimeoutMs: number = 5000
  ) {
    this.builder = builder || getIntentGraphBuilder();
    this.scorer = scorer || getIntentGraphScorer();
    this.queryTimeoutMs = queryTimeoutMs;
  }

  /**
   * Execute a query
   */
  execute(query: GraphQuery): QueryResult {
    const startTime = Date.now();

    try {
      let results: unknown[];

      switch (query.type) {
        case 'failing_intents':
          results = this.queryFailingIntents(query);
          break;
        case 'breaking_content':
          results = this.queryBreakingContent(query);
          break;
        case 'high_value_paths':
          results = this.queryHighValuePaths(query);
          break;
        case 'drop_off_points':
          results = this.queryDropOffPoints(query);
          break;
        case 'conversion_paths':
          results = this.queryConversionPaths(query);
          break;
        case 'intent_flow':
          results = this.queryIntentFlow(query);
          break;
        default:
          results = [];
      }

      return {
        query,
        results,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        metadata: { count: results.length },
      };
    } catch (error) {
      return {
        query,
        results: [],
        executedAt: new Date(),
        duration: Date.now() - startTime,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  // ==========================================================================
  // QUERY IMPLEMENTATIONS
  // ==========================================================================

  /**
   * Query: What intents usually fail before conversion?
   */
  private queryFailingIntents(query: GraphQuery): unknown[] {
    const { journeys } = this.builder.exportGraph();
    const limit = query.limit || 10;

    // Group journeys by starting intent
    const intentStats = new Map<string, {
      intentType: IntentType;
      total: number;
      failed: number;
      avgValue: number;
    }>();

    for (const journey of journeys) {
      if (!journey.isComplete || journey.nodes.length === 0) continue;

      // Find the intent node
      const firstNode = this.builder.getNode(journey.nodes[0]);
      if (!firstNode || firstNode.type !== 'intent') continue;

      const intentNode = firstNode as IntentNode;
      const key = intentNode.intentType;

      const stats = intentStats.get(key) || {
        intentType: intentNode.intentType,
        total: 0,
        failed: 0,
        avgValue: 0,
      };

      stats.total++;

      // Check if journey ended with a positive outcome
      const isSuccess = journey.outcome &&
        ['signup', 'affiliate_click', 'purchase', 'engagement'].includes(journey.outcome);

      if (!isSuccess) {
        stats.failed++;
      }

      stats.avgValue = (stats.avgValue * (stats.total - 1) + journey.value) / stats.total;
      intentStats.set(key, stats);
    }

    // Calculate failure rates and sort
    const results = Array.from(intentStats.values())
      .map((stats) => ({
        ...stats,
        failureRate: stats.total > 0 ? stats.failed / stats.total : 0,
      }))
      .filter((r) => r.total >= 3) // Minimum sample size
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, limit);

    return results;
  }

  /**
   * Query: Which content breaks high-value journeys?
   */
  private queryBreakingContent(query: GraphQuery): unknown[] {
    const { journeys, edges } = this.builder.exportGraph();
    const limit = query.limit || 10;

    // Find content nodes that appear before negative outcomes
    const contentBreakdowns = new Map<string, {
      contentId: string;
      title?: string;
      breakCount: number;
      totalAppearances: number;
      avgValueLost: number;
    }>();

    for (const journey of journeys) {
      if (!journey.isComplete) continue;

      const isNegativeOutcome = journey.outcome &&
        ['bounce', 'exit'].includes(journey.outcome);

      if (!isNegativeOutcome) continue;

      // Find content nodes in this journey
      for (let i = 0; i < journey.nodes.length - 1; i++) {
        const node = this.builder.getNode(journey.nodes[i]);
        if (!node || node.type !== 'content') continue;

        const contentNode = node as ContentNode;
        const key = contentNode.contentId;

        const stats = contentBreakdowns.get(key) || {
          contentId: contentNode.contentId,
          title: contentNode.title,
          breakCount: 0,
          totalAppearances: 0,
          avgValueLost: 0,
        };

        stats.breakCount++;
        stats.totalAppearances++;
        // Estimate value lost (could be improved with actual value tracking)
        stats.avgValueLost = (stats.avgValueLost * (stats.breakCount - 1) + 5) / stats.breakCount;
        contentBreakdowns.set(key, stats);
      }
    }

    // Also count total appearances in successful journeys
    for (const journey of journeys) {
      if (!journey.isComplete) continue;

      const isPositiveOutcome = journey.outcome &&
        ['signup', 'affiliate_click', 'purchase', 'engagement'].includes(journey.outcome);

      if (!isPositiveOutcome) continue;

      for (const nodeId of journey.nodes) {
        const node = this.builder.getNode(nodeId);
        if (!node || node.type !== 'content') continue;

        const contentNode = node as ContentNode;
        const stats = contentBreakdowns.get(contentNode.contentId);
        if (stats) {
          stats.totalAppearances++;
        }
      }
    }

    // Calculate break rate and sort
    const results = Array.from(contentBreakdowns.values())
      .map((stats) => ({
        ...stats,
        breakRate: stats.totalAppearances > 0 ? stats.breakCount / stats.totalAppearances : 0,
      }))
      .filter((r) => r.totalAppearances >= 3)
      .sort((a, b) => b.breakRate - a.breakRate)
      .slice(0, limit);

    return results;
  }

  /**
   * Query: High value paths
   */
  private queryHighValuePaths(query: GraphQuery): unknown[] {
    const limit = query.limit || 10;
    return this.scorer.getHighValuePaths(limit);
  }

  /**
   * Query: Drop-off points
   */
  private queryDropOffPoints(query: GraphQuery): unknown[] {
    const limit = query.limit || 10;
    const highDropOffEdges = this.scorer.getHighDropOffEdges(limit);

    return highDropOffEdges.map((edge) => {
      const [sourceId, targetId] = edge.edgeId.split('->');
      const sourceNode = this.builder.getNode(sourceId);
      const targetNode = this.builder.getNode(targetId);

      return {
        edgeId: edge.edgeId,
        from: {
          id: sourceId,
          type: sourceNode?.type,
          label: this.getNodeLabel(sourceNode),
        },
        to: {
          id: targetId,
          type: targetNode?.type,
          label: this.getNodeLabel(targetNode),
        },
        dropOffRate: edge.dropOffRate,
        friction: edge.friction,
        score: edge.score,
      };
    });
  }

  /**
   * Query: Conversion paths
   */
  private queryConversionPaths(query: GraphQuery): unknown[] {
    const limit = query.limit || 10;
    return this.scorer.getHighConversionPaths(limit);
  }

  /**
   * Query: Intent flow (Sankey-style data)
   */
  private queryIntentFlow(query: GraphQuery): unknown[] {
    const { edges } = this.builder.exportGraph();
    const intentFilter = query.filters?.intentType;

    // Build flow data
    const flows: {
      source: string;
      target: string;
      value: number;
      successRate: number;
    }[] = [];

    for (const edge of edges) {
      const sourceNode = this.builder.getNode(edge.sourceId);
      const targetNode = this.builder.getNode(edge.targetId);

      if (!sourceNode || !targetNode) continue;

      // Filter by intent if specified
      if (intentFilter) {
        if (sourceNode.type === 'intent' && (sourceNode as IntentNode).intentType !== intentFilter) {
          continue;
        }
      }

      flows.push({
        source: this.getNodeLabel(sourceNode) || edge.sourceId,
        target: this.getNodeLabel(targetNode) || edge.targetId,
        value: edge.weight,
        successRate: edge.successRate,
      });
    }

    // Sort by value and limit
    return flows
      .sort((a, b) => b.value - a.value)
      .slice(0, query.limit || 50);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get human-readable label for a node
   */
  private getNodeLabel(node: GraphNode | undefined): string | undefined {
    if (!node) return undefined;

    switch (node.type) {
      case 'intent':
        return `Intent: ${(node as IntentNode).intentType}`;
      case 'content':
        return (node as ContentNode).title || `Content: ${(node as ContentNode).contentId}`;
      case 'action':
        return `Action: ${(node as import('./types').ActionNode).actionType}`;
      case 'outcome':
        return `Outcome: ${(node as OutcomeNode).outcomeType}`;
      default:
        return node.id;
    }
  }

  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================

  /**
   * What intents fail before conversion?
   */
  getFailingIntents(limit: number = 10): QueryResult {
    return this.execute({ type: 'failing_intents', limit });
  }

  /**
   * Which content breaks journeys?
   */
  getBreakingContent(limit: number = 10): QueryResult {
    return this.execute({ type: 'breaking_content', limit });
  }

  /**
   * Get high value paths
   */
  getHighValuePaths(limit: number = 10): QueryResult {
    return this.execute({ type: 'high_value_paths', limit });
  }

  /**
   * Get drop-off points
   */
  getDropOffPoints(limit: number = 10): QueryResult {
    return this.execute({ type: 'drop_off_points', limit });
  }

  /**
   * Get conversion paths
   */
  getConversionPaths(limit: number = 10): QueryResult {
    return this.execute({ type: 'conversion_paths', limit });
  }

  /**
   * Get intent flow data
   */
  getIntentFlow(intentType?: IntentType, limit: number = 50): QueryResult {
    return this.execute({
      type: 'intent_flow',
      filters: intentType ? { intentType } : undefined,
      limit,
    });
  }
}

// Singleton instance
let queryEngineInstance: IntentGraphQueryEngine | null = null;

export function getIntentGraphQueryEngine(): IntentGraphQueryEngine {
  if (!queryEngineInstance) {
    queryEngineInstance = new IntentGraphQueryEngine();
  }
  return queryEngineInstance;
}

export function resetIntentGraphQueryEngine(): void {
  queryEngineInstance = null;
}
