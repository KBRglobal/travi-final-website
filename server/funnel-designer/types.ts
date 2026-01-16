/**
 * Autonomous Funnel Designer - Type Definitions
 *
 * Auto-detect, score, and iterate funnels based on real traffic data.
 */

// ============================================================================
// FUNNEL TYPES
// ============================================================================

export type FunnelStage = 'awareness' | 'interest' | 'consideration' | 'decision' | 'action' | 'retention';
export type FunnelType = 'acquisition' | 'conversion' | 'engagement' | 'retention' | 'monetization';

export interface FunnelStep {
  id: string;
  name: string;
  stage: FunnelStage;
  contentIds: string[];
  entryCount: number;
  exitCount: number;
  dropOffRate: number;
  avgTimeInStep: number;
  conversionRate: number;
  value: number;
}

export interface Funnel {
  id: string;
  name: string;
  type: FunnelType;
  steps: FunnelStep[];
  createdAt: Date;
  updatedAt: Date;
  isAutoDetected: boolean;

  // Metrics
  totalEntries: number;
  totalConversions: number;
  overallConversionRate: number;
  avgCompletionTime: number;
  totalValue: number;

  // Scoring
  score: number;
  healthScore: number;
  bottlenecks: FunnelBottleneck[];
}

export interface FunnelBottleneck {
  stepId: string;
  stepName: string;
  dropOffRate: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  potentialLift: number;
  suggestedActions: string[];
}

// ============================================================================
// DETECTION TYPES
// ============================================================================

export interface DetectedPath {
  nodes: string[];
  occurrences: number;
  conversionRate: number;
  avgValue: number;
  avgDuration: number;
}

export interface FunnelCandidate {
  id: string;
  paths: DetectedPath[];
  entryNode: string;
  exitNode: string;
  intermediateNodes: string[];
  score: number;
  confidence: number;
}

// ============================================================================
// SIMULATION TYPES
// ============================================================================

export interface SimulationScenario {
  id: string;
  name: string;
  baselineFunnel: Funnel;
  proposedChanges: FunnelChange[];
  createdAt: Date;
}

export interface FunnelChange {
  type: 'add_step' | 'remove_step' | 'reorder_steps' | 'modify_content' | 'add_content' | 'remove_content';
  targetStepId?: string;
  newStepData?: Partial<FunnelStep>;
  newPosition?: number;
  contentId?: string;
  rationale: string;
}

export interface SimulationResult {
  scenarioId: string;
  baselineMetrics: FunnelMetrics;
  projectedMetrics: FunnelMetrics;
  expectedLift: {
    conversionRate: number;
    value: number;
    completionTime: number;
  };
  confidence: number;
  risks: string[];
  recommendations: string[];
}

export interface FunnelMetrics {
  conversionRate: number;
  avgValue: number;
  avgCompletionTime: number;
  dropOffByStep: { stepId: string; rate: number }[];
  bottleneckCount: number;
}

// ============================================================================
// PROPOSAL TYPES
// ============================================================================

export type FunnelProposalType =
  | 'restructure'
  | 'add_touchpoint'
  | 'remove_friction'
  | 'optimize_step'
  | 'merge_steps'
  | 'split_step'
  | 'reorder_content';

export interface FunnelProposal {
  id: string;
  funnelId: string;
  type: FunnelProposalType;
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'rolled_back';
  createdAt: Date;
  updatedAt: Date;

  changes: FunnelChange[];
  simulation: SimulationResult;

  expectedLift: number;
  riskLevel: 'minimal' | 'low' | 'medium' | 'high';
  isReversible: boolean;

  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
}

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

export interface FunnelAnalysis {
  funnelId: string;
  analyzedAt: Date;

  // Health metrics
  healthScore: number;
  efficiency: number;
  valuePerEntry: number;

  // Issues
  bottlenecks: FunnelBottleneck[];
  friction: FrictionPoint[];
  leakage: LeakagePoint[];

  // Opportunities
  opportunities: FunnelOpportunity[];
  quickWins: FunnelOpportunity[];
}

export interface FrictionPoint {
  stepId: string;
  type: 'cognitive' | 'technical' | 'trust' | 'motivation';
  severity: number;
  description: string;
}

export interface LeakagePoint {
  stepId: string;
  leakRate: number;
  destination: string;
  isRecoverable: boolean;
}

export interface FunnelOpportunity {
  id: string;
  type: 'optimization' | 'expansion' | 'simplification';
  description: string;
  expectedLift: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface FunnelReport {
  generatedAt: Date;
  period: { start: string; end: string };

  funnelCount: number;
  totalConversions: number;
  totalValue: number;

  topFunnels: Funnel[];
  underperformingFunnels: Funnel[];
  proposals: FunnelProposal[];

  insights: string[];
}
