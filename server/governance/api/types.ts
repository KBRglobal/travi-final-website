/**
 * Executive Governance API - Type Definitions
 * API responses for executive governance questions
 */

import { GovernanceSignal, GovernanceScore } from '../metrics/types';
import { SystemicRiskSummary, LatentRisk, RiskContributor } from '../risk/types';
import { Intervention, AutoAdjustment } from '../intervention/types';
import { GovernanceTrendReport, ComparisonPeriod } from '../learning/types';

/**
 * Response: "Is autonomy helping or hurting?"
 */
export interface AutonomyImpactResponse {
  question: 'Is autonomy helping or hurting?';
  answer: 'helping' | 'neutral' | 'hurting';
  confidence: number;

  evidence: {
    // Positive indicators
    decisionsWithoutIncident: number;
    incidentsPrevented: number;
    timeSaved: string;
    costsSaved: number;

    // Negative indicators
    falseBlocks: number;
    missedIncidents: number;
    overridesRequired: number;

    // Net assessment
    netBenefit: number; // Positive = helping, negative = hurting
    trustScore: number;
  };

  trends: {
    improving: string[];
    degrading: string[];
  };

  recommendation: string;
}

/**
 * Response: "Are humans the bottleneck?"
 */
export interface HumanBottleneckResponse {
  question: 'Are humans the bottleneck?';
  answer: 'yes' | 'partially' | 'no';
  confidence: number;

  evidence: {
    // Queue metrics
    avgApprovalWaitHours: number;
    maxApprovalWaitHours: number;
    pendingApprovals: number;

    // Override patterns
    overrideRate: number;
    overrideAccuracy: number;

    // Comparison
    automationDecisionRate: number;
    humanDecisionRate: number;
    automationAccuracy: number;
    humanAccuracy: number;
  };

  bottlenecks: Array<{
    type: 'approval_queue' | 'override_required' | 'manual_review' | 'escalation';
    severity: 'low' | 'medium' | 'high';
    impact: string;
    suggestedFix?: string;
  }>;

  recommendation: string;
}

/**
 * Response: "What would break if we removed automation tomorrow?"
 */
export interface AutomationDependencyResponse {
  question: 'What would break if we removed automation tomorrow?';
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';

  impact: {
    // Capacity impact
    decisionsPerHour: number;
    humanCapacityNeeded: number;
    currentHumanCapacity: number;
    capacityGap: number;

    // Time impact
    avgResponseTimeWithAutomation: number;
    estimatedResponseTimeWithout: number;
    responseTimeMultiplier: number;

    // Cost impact
    automationCostPerDay: number;
    humanCostPerDay: number;
    costMultiplier: number;

    // Risk impact
    incidentRateWithAutomation: number;
    estimatedIncidentRateWithout: number;
    riskMultiplier: number;
  };

  criticalDependencies: Array<{
    feature: string;
    automationPercentage: number;
    dailyVolume: number;
    fallbackPlan: 'exists' | 'partial' | 'none';
    estimatedManualTime: string;
  }>;

  recommendation: string;
}

/**
 * Response: "What is the most dangerous decision pattern right now?"
 */
export interface DangerousPatternResponse {
  question: 'What is the most dangerous decision pattern right now?';

  topPattern: {
    id: string;
    name: string;
    description: string;
    dangerLevel: 'moderate' | 'high' | 'critical';
    confidence: number;

    // Pattern details
    occurrences: number;
    timeframe: string;
    affectedFeatures: string[];
    affectedTeams: string[];

    // Risk assessment
    incidentProbability: number;
    estimatedImpact: string;
    timeToIncident?: string;

    // Example
    exampleScenario: string;
  };

  otherPatterns: Array<{
    id: string;
    name: string;
    dangerLevel: 'moderate' | 'high' | 'critical';
    occurrences: number;
  }>;

  recommendation: string;
}

/**
 * Full governance status response
 */
export interface GovernanceStatusResponse {
  asOf: Date;

  // Overall health
  overallHealth: {
    score: number;
    rating: 'excellent' | 'good' | 'acceptable' | 'concerning' | 'critical';
    trend: 'improving' | 'stable' | 'degrading';
  };

  // Quick answers
  quickAnswers: {
    autonomyHelping: AutonomyImpactResponse['answer'];
    humansBottleneck: HumanBottleneckResponse['answer'];
    automationDependencyRisk: AutomationDependencyResponse['riskLevel'];
    dangerousPatternLevel: DangerousPatternResponse['topPattern']['dangerLevel'];
  };

  // Key metrics
  keyMetrics: {
    governanceScore: number;
    systemicRiskScore: number;
    interventionSuccessRate: number;
    automationTrustScore: number;
  };

  // Trend summary
  trendSummary: {
    verdict: 'safer' | 'same' | 'worse';
    confidence: number;
    reason: string;
  };

  // Actions needed
  actionsNeeded: number;
  urgentActions: number;
}

/**
 * API configuration
 */
export interface GovernanceApiConfig {
  enabled: boolean;
  cacheResponsesMs: number;
  maxConcurrentRequests: number;
  timeoutMs: number;
}

export const DEFAULT_API_CONFIG: GovernanceApiConfig = {
  enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  cacheResponsesMs: 60 * 1000, // 1 minute
  maxConcurrentRequests: 10,
  timeoutMs: 30 * 1000, // 30 seconds
};
