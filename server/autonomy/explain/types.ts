/**
 * Executive Autonomy Explainer - Type Definitions
 * Explains autonomy decisions in human-readable language
 */

import { GuardedFeature, PolicyDecision } from '../enforcement/types';
import { BudgetPeriod } from '../policy/types';

/**
 * Audience types for explanation customization
 */
export type ExplanationAudience =
  | 'executive'     // C-suite, non-technical
  | 'manager'       // Team leads, some technical context
  | 'developer'     // Engineers, full technical detail
  | 'operator';     // Ops team, operational focus

/**
 * Explanation format
 */
export type ExplanationFormat = 'text' | 'structured' | 'markdown';

/**
 * A single decision explanation
 */
export interface DecisionExplanation {
  id: string;
  feature: GuardedFeature;
  action: string;
  decision: PolicyDecision;
  timestamp: Date;

  // Plain language explanation
  summary: string;
  details: string[];

  // Context
  context: {
    what: string;       // What was being done
    why: string;        // Why was the decision made
    impact: string;     // What's the impact
    nextSteps?: string; // What can be done
  };

  // For executives
  businessImpact?: {
    costImplication: string;
    riskLevel: 'low' | 'medium' | 'high';
    userImpact: string;
  };

  // For developers
  technicalDetails?: {
    policyMatched?: string;
    budgetState?: string;
    triggeredRules?: string[];
  };
}

/**
 * Summary of autonomy activity for a period
 */
export interface ActivitySummary {
  id: string;
  period: {
    start: Date;
    end: Date;
    label: string; // e.g., "Last 24 hours", "This week"
  };
  audience: ExplanationAudience;

  // High-level narrative
  narrative: string;

  // Key metrics in plain language
  highlights: {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'stable';
    sentiment?: 'positive' | 'neutral' | 'negative';
  }[];

  // Feature summaries
  featureSummaries: FeatureSummary[];

  // Action items (if any)
  actionItems: ActionItem[];

  // Overall health assessment
  healthAssessment: {
    status: 'healthy' | 'attention_needed' | 'critical';
    explanation: string;
  };
}

export interface FeatureSummary {
  feature: GuardedFeature;
  displayName: string;
  summary: string;
  metrics: {
    requests: string;
    blocked: string;
    cost: string;
  };
  status: 'healthy' | 'attention_needed' | 'critical';
  issues?: string[];
}

export interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  category: 'budget' | 'policy' | 'incident' | 'optimization';
  title: string;
  description: string;
  suggestedAction?: string;
  feature?: GuardedFeature;
}

/**
 * Request for generating an explanation
 */
export interface ExplanationRequest {
  // What to explain
  type: 'decision' | 'summary' | 'comparison' | 'recommendation';

  // Target audience
  audience: ExplanationAudience;

  // Output format
  format?: ExplanationFormat;

  // Context for decision explanations
  decision?: {
    id: string;
    feature: GuardedFeature;
    action: string;
    result: PolicyDecision;
    reasons: Array<{ code: string; message: string }>;
    budgetState?: {
      used: number;
      limit: number;
      period: BudgetPeriod;
    };
  };

  // Context for summaries
  summary?: {
    start: Date;
    end: Date;
    features?: GuardedFeature[];
  };
}

/**
 * Explainer configuration
 */
export interface ExplainerConfig {
  enabled: boolean;
  maxExplanationsCache: number;
  maxSummariesCache: number;
  defaultAudience: ExplanationAudience;
  defaultFormat: ExplanationFormat;
}

export const DEFAULT_EXPLAINER_CONFIG: ExplainerConfig = {
  enabled: process.env.ENABLE_AUTONOMY_EXPLAINER === 'true',
  maxExplanationsCache: 100,
  maxSummariesCache: 20,
  defaultAudience: 'manager',
  defaultFormat: 'text',
};

/**
 * Feature display names for human-readable output
 */
export const FEATURE_DISPLAY_NAMES: Record<GuardedFeature, string> = {
  chat: 'AI Chat Assistant',
  octopus: 'Content Generation',
  search: 'Search Enhancement',
  aeo: 'Answer Engine Optimization',
  translation: 'Content Translation',
  images: 'Image Processing',
  content_enrichment: 'Content Enrichment',
  seo_optimization: 'SEO Optimization',
  internal_linking: 'Internal Linking',
  background_job: 'Background Processing',
  publishing: 'Content Publishing',
};

/**
 * Decision explanations in plain language
 */
export const DECISION_TEMPLATES: Record<PolicyDecision, {
  executive: string;
  manager: string;
  developer: string;
}> = {
  ALLOW: {
    executive: 'The request was approved and completed successfully.',
    manager: 'The system processed this request normally within policy limits.',
    developer: 'Request passed policy evaluation and budget checks.',
  },
  WARN: {
    executive: 'The request was completed but flagged for review.',
    manager: 'The system processed this request but it approached policy limits.',
    developer: 'Request allowed with warning - approaching budget thresholds.',
  },
  BLOCK: {
    executive: 'The request was not completed to protect system resources.',
    manager: 'The system prevented this request due to policy or budget constraints.',
    developer: 'Request blocked by policy evaluation or budget exhaustion.',
  },
};
