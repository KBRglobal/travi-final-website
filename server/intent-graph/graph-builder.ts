/**
 * Intent Graph Builder
 *
 * Builds and maintains a directed graph of user intents, content, actions, and outcomes.
 * Supports incremental updates from traffic signals and TCOE data.
 */

import type {
  GraphNode,
  GraphEdge,
  IntentNode,
  ContentNode,
  ActionNode,
  OutcomeNode,
  IntentType,
  ActionType,
  OutcomeType,
  Journey,
  TrafficSignal,
  GraphStats,
} from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface GraphBuilderConfig {
  maxNodes: number;
  maxEdges: number;
  maxJourneys: number;
  edgeDecayFactor: number;
  pruneThreshold: number;
  updateTimeoutMs: number;
}

const DEFAULT_CONFIG: GraphBuilderConfig = {
  maxNodes: 10000,
  maxEdges: 50000,
  maxJourneys: 5000,
  edgeDecayFactor: 0.99,
  pruneThreshold: 0.01,
  updateTimeoutMs: 5000,
};

// ============================================================================
// GRAPH BUILDER CLASS
// ============================================================================

export class IntentGraphBuilder {
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, GraphEdge>;
  private journeys: Map<string, Journey>;
  private activeJourneys: Map<string, Journey>;
  private config: GraphBuilderConfig;
  private lastPruneTime: number;

  constructor(config?: Partial<GraphBuilderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nodes = new Map();
    this.edges = new Map();
    this.journeys = new Map();
    this.activeJourneys = new Map();
    this.lastPruneTime = Date.now();
  }

  // ==========================================================================
  // NODE MANAGEMENT
  // ==========================================================================

  /**
   * Create or get an intent node
   */
  getOrCreateIntentNode(intentType: IntentType, source?: string, keywords?: string[]): IntentNode {
    const id = `intent:${intentType}:${source || "direct"}`;

    let node = this.nodes.get(id) as IntentNode | undefined;
    if (node) {
      node.updatedAt = new Date();
      return node;
    }

    node = {
      id,
      type: "intent",
      intentType,
      source,
      keywords,
      confidence: 1.0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.addNode(node);
    return node;
  }

  /**
   * Create or get a content node
   */
  getOrCreateContentNode(
    contentId: string,
    contentType: string,
    slug?: string,
    title?: string
  ): ContentNode {
    const id = `content:${contentId}`;

    let node = this.nodes.get(id) as ContentNode | undefined;
    if (node) {
      node.updatedAt = new Date();
      if (slug) node.slug = slug;
      if (title) node.title = title;
      return node;
    }

    node = {
      id,
      type: "content",
      contentId,
      contentType,
      slug,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.addNode(node);
    return node;
  }

  /**
   * Create or get an action node
   */
  getOrCreateActionNode(actionType: ActionType, value?: number): ActionNode {
    const id = `action:${actionType}`;

    let node = this.nodes.get(id) as ActionNode | undefined;
    if (node) {
      node.updatedAt = new Date();
      return node;
    }

    node = {
      id,
      type: "action",
      actionType,
      value,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.addNode(node);
    return node;
  }

  /**
   * Create or get an outcome node
   */
  getOrCreateOutcomeNode(
    outcomeType: OutcomeType,
    isPositive: boolean,
    value?: number
  ): OutcomeNode {
    const id = `outcome:${outcomeType}`;

    let node = this.nodes.get(id) as OutcomeNode | undefined;
    if (node) {
      node.updatedAt = new Date();
      return node;
    }

    node = {
      id,
      type: "outcome",
      outcomeType,
      isPositive,
      value,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.addNode(node);
    return node;
  }

  /**
   * Add a node to the graph
   */
  private addNode(node: GraphNode): void {
    if (this.nodes.size >= this.config.maxNodes) {
      this.pruneOldNodes();
    }
    this.nodes.set(node.id, node);
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type: GraphNode["type"]): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  // ==========================================================================
  // EDGE MANAGEMENT
  // ==========================================================================

  /**
   * Create or update an edge between nodes
   */
  addOrUpdateEdge(
    sourceId: string,
    targetId: string,
    value: number = 1,
    success: boolean = true
  ): GraphEdge {
    const edgeId = `${sourceId}->${targetId}`;

    let edge = this.edges.get(edgeId);
    if (edge) {
      edge.count++;
      edge.weight = edge.weight * this.config.edgeDecayFactor + value;
      edge.avgValue = (edge.avgValue * (edge.count - 1) + value) / edge.count;
      edge.successRate = (edge.successRate * (edge.count - 1) + (success ? 1 : 0)) / edge.count;
      edge.updatedAt = new Date();
      return edge;
    }

    if (this.edges.size >= this.config.maxEdges) {
      this.pruneWeakEdges();
    }

    edge = {
      id: edgeId,
      sourceId,
      targetId,
      weight: value,
      count: 1,
      avgValue: value,
      successRate: success ? 1 : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.edges.set(edgeId, edge);
    return edge;
  }

  /**
   * Get edge by ID
   */
  getEdge(sourceId: string, targetId: string): GraphEdge | undefined {
    return this.edges.get(`${sourceId}->${targetId}`);
  }

  /**
   * Get all outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): GraphEdge[] {
    return Array.from(this.edges.values()).filter(e => e.sourceId === nodeId);
  }

  /**
   * Get all incoming edges to a node
   */
  getIncomingEdges(nodeId: string): GraphEdge[] {
    return Array.from(this.edges.values()).filter(e => e.targetId === nodeId);
  }

  // ==========================================================================
  // JOURNEY MANAGEMENT
  // ==========================================================================

  /**
   * Start or continue a journey
   */
  recordJourneyStep(sessionId: string, nodeId: string, previousNodeId?: string): Journey {
    let journey = this.activeJourneys.get(sessionId);

    if (!journey) {
      journey = {
        id: `journey:${sessionId}:${Date.now().toString(36)}`,
        sessionId,
        nodes: [],
        edges: [],
        startedAt: new Date(),
        value: 0,
        isComplete: false,
      };
      this.activeJourneys.set(sessionId, journey);
    }

    journey.nodes.push(nodeId);

    if (previousNodeId) {
      const edgeId = `${previousNodeId}->${nodeId}`;
      journey.edges.push(edgeId);
    }

    return journey;
  }

  /**
   * Complete a journey with outcome
   */
  completeJourney(sessionId: string, outcome: OutcomeType, value: number = 0): Journey | undefined {
    const journey = this.activeJourneys.get(sessionId);
    if (!journey) return undefined;

    journey.endedAt = new Date();
    journey.outcome = outcome;
    journey.value = value;
    journey.isComplete = true;

    this.activeJourneys.delete(sessionId);

    if (this.journeys.size >= this.config.maxJourneys) {
      this.pruneOldJourneys();
    }
    this.journeys.set(journey.id, journey);

    return journey;
  }

  /**
   * Get journey by session
   */
  getActiveJourney(sessionId: string): Journey | undefined {
    return this.activeJourneys.get(sessionId);
  }

  // ==========================================================================
  // SIGNAL PROCESSING
  // ==========================================================================

  /**
   * Process a traffic signal and update the graph
   */
  processSignal(signal: TrafficSignal): void {
    const startTime = Date.now();

    try {
      let previousNodeId: string | undefined;
      const journey = this.activeJourneys.get(signal.sessionId);
      if (journey && journey.nodes.length > 0) {
        previousNodeId = journey.nodes[journey.nodes.length - 1];
      }

      // Create intent node if present
      if (signal.intent) {
        const intentNode = this.getOrCreateIntentNode(signal.intent, signal.source);
        this.recordJourneyStep(signal.sessionId, intentNode.id, previousNodeId);
        if (previousNodeId) {
          this.addOrUpdateEdge(previousNodeId, intentNode.id, 1, true);
        }
        previousNodeId = intentNode.id;
      }

      // Create content node if present
      if (signal.contentId) {
        const contentNode = this.getOrCreateContentNode(signal.contentId, "article");
        this.recordJourneyStep(signal.sessionId, contentNode.id, previousNodeId);
        if (previousNodeId) {
          this.addOrUpdateEdge(previousNodeId, contentNode.id, 1, true);
        }
        previousNodeId = contentNode.id;
      }

      // Create action node if present
      if (signal.action) {
        const actionNode = this.getOrCreateActionNode(signal.action, signal.value);
        this.recordJourneyStep(signal.sessionId, actionNode.id, previousNodeId);
        if (previousNodeId) {
          this.addOrUpdateEdge(previousNodeId, actionNode.id, 1, true);
        }
        previousNodeId = actionNode.id;
      }

      // Create outcome node and complete journey if present
      if (signal.outcome) {
        const isPositive = ["signup", "affiliate_click", "purchase", "engagement"].includes(
          signal.outcome
        );
        const outcomeNode = this.getOrCreateOutcomeNode(signal.outcome, isPositive, signal.value);
        this.recordJourneyStep(signal.sessionId, outcomeNode.id, previousNodeId);
        if (previousNodeId) {
          this.addOrUpdateEdge(previousNodeId, outcomeNode.id, signal.value || 1, isPositive);
        }
        this.completeJourney(signal.sessionId, signal.outcome, signal.value || 0);
      }

      // Timeout check
      if (Date.now() - startTime > this.config.updateTimeoutMs) {
      }
    } catch (error) {}
  }

  /**
   * Process multiple signals in batch
   */
  processSignals(signals: TrafficSignal[]): number {
    let processed = 0;
    const startTime = Date.now();

    for (const signal of signals) {
      if (Date.now() - startTime > this.config.updateTimeoutMs) {
        break;
      }
      this.processSignal(signal);
      processed++;
    }

    return processed;
  }

  // ==========================================================================
  // PRUNING
  // ==========================================================================

  /**
   * Prune old/inactive nodes
   */
  private pruneOldNodes(): void {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    const toRemove: string[] = [];

    for (const [id, node] of this.nodes) {
      if (node.updatedAt.getTime() < threshold) {
        toRemove.push(id);
      }
    }

    // Remove oldest 10%
    const sortedNodes = Array.from(this.nodes.entries()).sort(
      (a, b) => a[1].updatedAt.getTime() - b[1].updatedAt.getTime()
    );

    const removeCount = Math.max(toRemove.length, Math.floor(this.nodes.size * 0.1));
    for (let i = 0; i < removeCount && i < sortedNodes.length; i++) {
      this.nodes.delete(sortedNodes[i][0]);
    }
  }

  /**
   * Prune weak edges
   */
  private pruneWeakEdges(): void {
    const toRemove: string[] = [];

    for (const [id, edge] of this.edges) {
      if (edge.weight < this.config.pruneThreshold) {
        toRemove.push(id);
      }
    }

    // Also remove oldest 10%
    const sortedEdges = Array.from(this.edges.entries()).sort((a, b) => a[1].weight - b[1].weight);

    const removeCount = Math.max(toRemove.length, Math.floor(this.edges.size * 0.1));
    for (let i = 0; i < removeCount && i < sortedEdges.length; i++) {
      this.edges.delete(sortedEdges[i][0]);
    }
  }

  /**
   * Prune old journeys
   */
  private pruneOldJourneys(): void {
    const sortedJourneys = Array.from(this.journeys.entries()).sort(
      (a, b) => (a[1].endedAt?.getTime() || 0) - (b[1].endedAt?.getTime() || 0)
    );

    const removeCount = Math.floor(this.journeys.size * 0.2);
    for (let i = 0; i < removeCount && i < sortedJourneys.length; i++) {
      this.journeys.delete(sortedJourneys[i][0]);
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Generate graph statistics
   */
  getStats(): GraphStats {
    const intentCounts = new Map<string, number>();
    const outcomeCounts = new Map<string, number>();

    for (const node of this.nodes.values()) {
      if (node.type === "intent") {
        const key = (node as IntentNode).intentType;
        intentCounts.set(key, (intentCounts.get(key) || 0) + 1);
      } else if (node.type === "outcome") {
        const key = (node as OutcomeNode).outcomeType;
        outcomeCounts.set(key, (outcomeCounts.get(key) || 0) + 1);
      }
    }

    const completedJourneys = Array.from(this.journeys.values()).filter(j => j.isComplete);
    const totalPathLength = completedJourneys.reduce((sum, j) => sum + j.nodes.length, 0);
    const conversions = completedJourneys.filter(
      j => j.outcome && ["signup", "affiliate_click", "purchase"].includes(j.outcome)
    ).length;

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      journeyCount: this.journeys.size,
      avgPathLength: completedJourneys.length > 0 ? totalPathLength / completedJourneys.length : 0,
      conversionRate: completedJourneys.length > 0 ? conversions / completedJourneys.length : 0,
      topIntents: Array.from(intentCounts.entries())
        .map(([intent, count]) => ({ intent: intent as IntentType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topOutcomes: Array.from(outcomeCounts.entries())
        .map(([outcome, count]) => ({ outcome: outcome as OutcomeType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      generatedAt: new Date(),
    };
  }

  /**
   * Export graph data
   */
  exportGraph(): { nodes: GraphNode[]; edges: GraphEdge[]; journeys: Journey[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      journeys: Array.from(this.journeys.values()),
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.journeys.clear();
    this.activeJourneys.clear();
  }
}

// Singleton instance
let builderInstance: IntentGraphBuilder | null = null;

export function getIntentGraphBuilder(): IntentGraphBuilder {
  if (!builderInstance) {
    builderInstance = new IntentGraphBuilder();
  }
  return builderInstance;
}

export function resetIntentGraphBuilder(): void {
  if (builderInstance) {
    builderInstance.clear();
  }
  builderInstance = null;
}
