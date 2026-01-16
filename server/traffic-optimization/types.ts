/**
 * Traffic → Conversion Optimization Engine (TCOE) - Type Definitions
 *
 * Feature Flags:
 * - ENABLE_TRAFFIC_OPTIMIZATION (main toggle)
 * - ENABLE_TRAFFIC_OPTIMIZATION_PROPOSALS (proposal generation)
 * - ENABLE_TRAFFIC_OPTIMIZATION_EXPERIMENTS (A/B test recommendations)
 */

// ============================================================================
// TRAFFIC SEGMENTS
// ============================================================================

export type TrafficSourceType = 'organic_search' | 'ai_search' | 'referral' | 'social' | 'direct' | 'paid' | 'email';
export type UserIntent = 'informational' | 'transactional' | 'navigational' | 'commercial';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export interface TrafficSegment {
  id: string;
  source: TrafficSourceType;
  intent: UserIntent;
  device: DeviceType;
  subSource?: string; // e.g., 'chatgpt', 'perplexity', 'google'
}

export interface SegmentMetrics {
  segment: TrafficSegment;
  visits: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgTimeOnPage: number;
  conversionRate: number;
  engagementScore: number; // 0-100
  aiVisibilityScore?: number; // 0-100
  period: { start: string; end: string };
}

export interface SegmentPerformance {
  segment: TrafficSegment;
  metrics: SegmentMetrics;
  benchmarkComparison: {
    vsOverall: number; // -100 to +100 (percentage diff from average)
    vsSameSource: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  isUnderperforming: boolean;
  underperformingReasons: string[];
}

export interface SegmentPerformanceReport {
  generatedAt: Date;
  period: { start: string; end: string };
  totalSegments: number;
  segments: SegmentPerformance[];
  topPerformers: SegmentPerformance[];
  underperformers: SegmentPerformance[];
  insights: string[];
}

// ============================================================================
// BOTTLENECKS
// ============================================================================

export type BottleneckType =
  | 'high_impressions_low_engagement'
  | 'high_impressions_low_ctr'
  | 'high_ctr_low_dwell'
  | 'weak_content_landing'
  | 'ai_traffic_non_aeo'
  | 'high_bounce_rate'
  | 'low_conversion'
  | 'missed_internal_links'
  | 'poor_mobile_experience'
  | 'content_freshness_decay';

export type BottleneckSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Bottleneck {
  id: string;
  type: BottleneckType;
  severity: BottleneckSeverity;
  confidence: number; // 0-1
  detectedAt: Date;
  affectedContent: Array<{
    contentId: string;
    slug?: string;
    title?: string;
    impactScore: number;
  }>;
  affectedSegments: TrafficSegment[];
  metrics: {
    current: Record<string, number>;
    benchmark: Record<string, number>;
    gap: Record<string, number>;
  };
  description: string;
  suggestedActions: string[];
}

export interface BottleneckReport {
  generatedAt: Date;
  period: { start: string; end: string };
  totalBottlenecks: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  bottlenecks: Bottleneck[];
  topPriority: Bottleneck[];
}

// ============================================================================
// OPTIMIZATION PROPOSALS
// ============================================================================

export type ProposalType =
  | 'rewrite_title'
  | 'rewrite_meta_description'
  | 'add_aeo_capsule'
  | 'update_aeo_capsule'
  | 'insert_internal_links'
  | 'restructure_content'
  | 'add_schema_markup'
  | 'improve_cta'
  | 'add_monetization'
  | 'optimize_images'
  | 'improve_mobile_layout'
  | 'add_faq_section'
  | 'recommend_ab_test';

export type ProposalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'implemented'
  | 'rolled_back'
  | 'expired';

export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface ProposalChange {
  field: string;
  currentValue?: unknown;
  proposedValue: unknown;
  rationale: string;
}

export interface OptimizationProposal {
  id: string;
  type: ProposalType;
  status: ProposalStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;

  // Target
  contentId: string;
  contentSlug?: string;
  contentTitle?: string;
  entityType?: string;

  // Source
  triggeredBy: {
    bottleneckId?: string;
    segmentId?: string;
    automatedAnalysis: boolean;
  };

  // Changes
  changes: ProposalChange[];

  // Impact Assessment
  expectedImpact: {
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidenceInterval: { low: number; high: number };
  }[];

  // Risk & Reversibility
  riskLevel: RiskLevel;
  isReversible: boolean;
  rollbackProcedure?: string;
  dependencies: string[];

  // Experiment Recommendation
  shouldExperiment: boolean;
  experimentConfig?: ExperimentConfig;

  // Audit
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  implementedAt?: Date;
  rolledBackAt?: Date;
  rollbackReason?: string;
}

// ============================================================================
// EXPERIMENTS
// ============================================================================

export type ExperimentType = 'ab_test' | 'multivariate' | 'holdout';

export interface ExperimentConfig {
  type: ExperimentType;
  name: string;
  description: string;
  hypothesis: string;
  variants: Array<{
    id: string;
    name: string;
    weight: number; // 0-100
    changes: ProposalChange[];
  }>;
  targetSegments?: TrafficSegment[];
  primaryMetric: string;
  secondaryMetrics: string[];
  minimumSampleSize: number;
  durationDays: number;
  confidenceThreshold: number; // e.g., 0.95
}

export interface ExperimentRecommendation {
  proposalId: string;
  shouldExperiment: boolean;
  reason: string;
  config?: ExperimentConfig;
  conflictsWith: string[]; // IDs of conflicting experiments
  riskIfSkipped: RiskLevel;
}

// ============================================================================
// ADMIN API RESPONSES
// ============================================================================

export interface OptimizationSummary {
  generatedAt: Date;
  status: {
    enabled: boolean;
    proposalsEnabled: boolean;
    experimentsEnabled: boolean;
  };
  metrics: {
    totalProposals: number;
    pendingProposals: number;
    approvedProposals: number;
    implementedProposals: number;
    activeExperiments: number;
  };
  recentBottlenecks: Bottleneck[];
  pendingProposals: OptimizationProposal[];
  performanceHighlights: {
    topImprovement: { contentId: string; metric: string; change: number } | null;
    biggestOpportunity: { contentId: string; potentialGain: number } | null;
  };
}

export interface ContentOptimizationView {
  contentId: string;
  contentSlug?: string;
  contentTitle?: string;
  currentPerformance: {
    visits: number;
    bounceRate: number;
    avgTimeOnPage: number;
    conversionRate: number;
    aiVisibilityScore: number;
  };
  bottlenecks: Bottleneck[];
  proposals: OptimizationProposal[];
  experiments: ExperimentConfig[];
  segmentBreakdown: SegmentMetrics[];
  recommendations: string[];
}
