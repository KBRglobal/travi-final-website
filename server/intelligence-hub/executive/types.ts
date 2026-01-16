/**
 * Enterprise Intelligence Hub - Executive Summary Types
 *
 * Types for executive-level intelligence summaries.
 * No AI text generation — deterministic summaries only.
 */

export type RiskCategory =
  | 'revenue'
  | 'content'
  | 'infrastructure'
  | 'cost'
  | 'quality'
  | 'compliance'
  | 'security';

export type OpportunityCategory =
  | 'growth'
  | 'optimization'
  | 'cost-savings'
  | 'quality-improvement'
  | 'automation';

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * A risk with scoring and explanation
 */
export interface Risk {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  score: number;           // 0-100, higher = more severe
  impact: string;          // What happens if ignored
  signalSources: string[]; // Which signals contributed
  detectedAt: Date;
  recommendation: string;
}

/**
 * An opportunity for improvement
 */
export interface Opportunity {
  id: string;
  category: OpportunityCategory;
  title: string;
  description: string;
  potentialValue: number;  // 0-100, higher = more valuable
  effort: 'low' | 'medium' | 'high';
  signalSources: string[];
  detectedAt: Date;
  recommendation: string;
}

/**
 * Action item for "what to do this week"
 */
export interface ActionItem {
  id: string;
  priority: ActionPriority;
  title: string;
  description: string;
  category: RiskCategory | OpportunityCategory;
  linkedRiskId?: string;
  linkedOpportunityId?: string;
  estimatedEffort: string;
  deadline?: string;
}

/**
 * System health breakdown
 */
export interface HealthBreakdown {
  overall: number;         // 0-100
  components: {
    content: number;
    infrastructure: number;
    cost: number;
    quality: number;
    revenue: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

/**
 * Complete executive summary
 */
export interface ExecutiveSummary {
  id: string;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;

  // Core outputs
  healthScore: HealthBreakdown;
  topRisks: Risk[];           // Top 5
  topOpportunities: Opportunity[]; // Top 5
  weeklyActions: ActionItem[]; // What to do this week

  // Stats
  signalsAnalyzed: number;
  anomaliesDetected: number;
  correlationsFound: number;
}

/**
 * Summary generation options
 */
export interface SummaryOptions {
  lookbackMs?: number;     // Default 7 days
  maxRisks?: number;       // Default 5
  maxOpportunities?: number; // Default 5
  maxActions?: number;     // Default 10
}

/**
 * Summary query
 */
export interface SummaryQuery {
  since?: Date;
  limit?: number;
}
