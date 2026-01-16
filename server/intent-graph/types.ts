/**
 * User Intent & Decision Graph - Type Definitions
 *
 * Models: User Intent → Content → Actions → Outcomes
 */

// ============================================================================
// NODE TYPES
// ============================================================================

export type IntentType = 'search' | 'browse' | 'compare' | 'decide' | 'purchase' | 'return';
export type ActionType = 'click' | 'scroll' | 'read' | 'conversion' | 'exit' | 'bounce' | 'navigate';
export type OutcomeType = 'signup' | 'affiliate_click' | 'bounce' | 'dwell' | 'purchase' | 'engagement' | 'share';

export type NodeType = 'intent' | 'content' | 'action' | 'outcome';

export interface BaseNode {
  id: string;
  type: NodeType;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface IntentNode extends BaseNode {
  type: 'intent';
  intentType: IntentType;
  keywords?: string[];
  source?: string;
  confidence: number;
}

export interface ContentNode extends BaseNode {
  type: 'content';
  contentId: string;
  contentType: string;
  slug?: string;
  title?: string;
  category?: string;
}

export interface ActionNode extends BaseNode {
  type: 'action';
  actionType: ActionType;
  value?: number;
  duration?: number;
  depth?: number;
}

export interface OutcomeNode extends BaseNode {
  type: 'outcome';
  outcomeType: OutcomeType;
  value?: number;
  isPositive: boolean;
  attribution?: string;
}

export type GraphNode = IntentNode | ContentNode | ActionNode | OutcomeNode;

// ============================================================================
// EDGE TYPES
// ============================================================================

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  count: number;
  avgValue: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// ============================================================================
// JOURNEY TYPES
// ============================================================================

export interface Journey {
  id: string;
  sessionId: string;
  userId?: string;
  nodes: string[];
  edges: string[];
  startedAt: Date;
  endedAt?: Date;
  outcome?: OutcomeType;
  value: number;
  isComplete: boolean;
}

export interface JourneyPattern {
  id: string;
  pattern: string[];
  occurrences: number;
  avgValue: number;
  successRate: number;
  avgDuration: number;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export type QueryType =
  | 'failing_intents'
  | 'breaking_content'
  | 'high_value_paths'
  | 'drop_off_points'
  | 'conversion_paths'
  | 'intent_flow';

export interface GraphQuery {
  type: QueryType;
  filters?: {
    intentType?: IntentType;
    outcomeType?: OutcomeType;
    contentId?: string;
    minWeight?: number;
    timeRange?: { start: Date; end: Date };
  };
  limit?: number;
}

export interface QueryResult {
  query: GraphQuery;
  results: unknown[];
  executedAt: Date;
  duration: number;
  metadata: Record<string, unknown>;
}

// ============================================================================
// SCORING TYPES
// ============================================================================

export interface NodeScore {
  nodeId: string;
  score: number;
  components: {
    traffic: number;
    conversion: number;
    value: number;
    engagement: number;
  };
  rank: number;
}

export interface EdgeScore {
  edgeId: string;
  score: number;
  dropOffRate: number;
  valueContribution: number;
  friction: number;
}

export interface PathScore {
  path: string[];
  score: number;
  conversionRate: number;
  avgValue: number;
  avgDuration: number;
  bottlenecks: string[];
}

// ============================================================================
// GRAPH STATISTICS
// ============================================================================

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  journeyCount: number;
  avgPathLength: number;
  conversionRate: number;
  topIntents: { intent: IntentType; count: number }[];
  topOutcomes: { outcome: OutcomeType; count: number }[];
  generatedAt: Date;
}

// ============================================================================
// SIGNALS (from TCOE integration)
// ============================================================================

export interface TrafficSignal {
  type: 'visit' | 'conversion' | 'bounce' | 'engagement';
  sessionId: string;
  contentId?: string;
  source?: string;
  intent?: IntentType;
  action?: ActionType;
  outcome?: OutcomeType;
  value?: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
