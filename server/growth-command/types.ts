/**
 * Growth Command Center Types
 *
 * Type definitions for the Executive Growth Command Center.
 */

// ============================================================================
// OPPORTUNITY TYPES
// ============================================================================

export type OpportunitySource =
  | 'tcoe'
  | 'intent_graph'
  | 'funnel_designer'
  | 'seo_analysis'
  | 'aeo_analysis'
  | 'manual';

export type OpportunityStatus =
  | 'identified'
  | 'analyzed'
  | 'prioritized'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'rejected'
  | 'expired';

export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export type ImpactLevel = 'minimal' | 'low' | 'medium' | 'high' | 'transformative';

export type EffortLevel = 'trivial' | 'low' | 'medium' | 'high' | 'major';

export interface GrowthOpportunity {
  id: string;
  source: OpportunitySource;
  sourceId: string; // ID from source system
  status: OpportunityStatus;
  title: string;
  description: string;
  category: string;
  subcategory?: string;

  // Impact metrics
  impactScore: number; // 0-100
  impactLevel: ImpactLevel;
  expectedROI: number; // Percentage
  confidenceLevel: number; // 0-1

  // Revenue estimates
  revenueImpact: {
    lowEstimate: number;
    midEstimate: number;
    highEstimate: number;
    timeframeDays: number;
  };

  // Risk assessment
  riskScore: number; // 0-1
  riskLevel: RiskLevel;
  risks: string[];

  // Effort assessment
  effortScore: number; // 0-100
  effortLevel: EffortLevel;
  estimatedHours?: number;

  // Dependencies and requirements
  dependencies: string[];
  requiredApprovals: ApprovalRequirement[];
  blockers: string[];

  // Execution readiness
  executionReadiness: ExecutionReadiness;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags: string[];
}

export interface ApprovalRequirement {
  type: 'auto' | 'manual';
  role: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ExecutionReadiness {
  isReady: boolean;
  score: number; // 0-100
  blockers: string[];
  warnings: string[];
  estimatedStartDate?: Date;
}

// ============================================================================
// SCORING TYPES
// ============================================================================

export interface ScoringWeights {
  impact: number;
  roi: number;
  effort: number;
  risk: number;
  urgency: number;
  strategicAlignment: number;
}

export interface OpportunityScore {
  opportunityId: string;
  totalScore: number; // 0-100
  components: {
    impactScore: number;
    roiScore: number;
    effortScore: number;
    riskScore: number;
    urgencyScore: number;
    alignmentScore: number;
  };
  rank: number;
  tier: 'top' | 'high' | 'medium' | 'low';
  recommendation: 'execute_now' | 'queue' | 'review' | 'defer' | 'reject';
}

// ============================================================================
// AGGREGATION TYPES
// ============================================================================

export interface AggregatedSignal {
  source: OpportunitySource;
  signalType: string;
  data: Record<string, any>;
  timestamp: Date;
  relevanceScore: number;
}

export interface AggregationResult {
  opportunities: GrowthOpportunity[];
  signals: AggregatedSignal[];
  totalFound: number;
  sourceCounts: Record<OpportunitySource, number>;
  lastUpdated: Date;
}

// ============================================================================
// PRIORITIZATION TYPES
// ============================================================================

export interface PrioritizationCriteria {
  minImpactScore?: number;
  maxRiskLevel?: RiskLevel;
  maxEffortLevel?: EffortLevel;
  requiredCategories?: string[];
  excludedCategories?: string[];
  minROI?: number;
  sources?: OpportunitySource[];
}

export interface PrioritizedList {
  id: string;
  name: string;
  criteria: PrioritizationCriteria;
  weights: ScoringWeights;
  opportunities: OpportunityScore[];
  generatedAt: Date;
  validUntil: Date;
}

// ============================================================================
// COMMAND CENTER TYPES
// ============================================================================

export interface GrowthDashboard {
  summary: {
    totalOpportunities: number;
    readyToExecute: number;
    pendingApproval: number;
    inProgress: number;
    completedThisMonth: number;
  };
  topOpportunities: GrowthOpportunity[];
  recentActivity: ActivityEntry[];
  metrics: DashboardMetrics;
  recommendations: GrowthRecommendation[];
}

export interface ActivityEntry {
  id: string;
  type: 'opportunity_created' | 'opportunity_approved' | 'execution_started' | 'execution_completed' | 'alert';
  opportunityId?: string;
  title: string;
  description: string;
  timestamp: Date;
  actor?: string;
}

export interface DashboardMetrics {
  pipelineValue: number;
  averageROI: number;
  successRate: number;
  avgTimeToExecute: number;
  riskDistribution: Record<RiskLevel, number>;
  categoryBreakdown: Record<string, number>;
}

export interface GrowthRecommendation {
  id: string;
  type: 'action' | 'warning' | 'insight';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems?: string[];
  relatedOpportunities?: string[];
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface GrowthQuery {
  type:
    | 'top_opportunities'
    | 'ready_to_execute'
    | 'high_roi'
    | 'low_risk'
    | 'quick_wins'
    | 'strategic'
    | 'by_category'
    | 'by_source';
  params?: Record<string, any>;
  limit?: number;
}

export interface QueryResult {
  query: GrowthQuery;
  opportunities: GrowthOpportunity[];
  scores: OpportunityScore[];
  executedAt: Date;
  processingTimeMs: number;
}
