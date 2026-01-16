/**
 * Executive Governance API - Route Handlers
 * Answers key executive questions about platform governance
 */

import {
  AutonomyImpactResponse,
  HumanBottleneckResponse,
  AutomationDependencyResponse,
  DangerousPatternResponse,
  GovernanceStatusResponse,
  GovernanceApiConfig,
  DEFAULT_API_CONFIG,
} from './types';
import { computeAllSignals, computeOverallHealth, computeSignal } from '../metrics';
import { getSystemicRiskSummary, getTopHiddenRisks, computeSystemicRisk } from '../risk';
import { getActiveInterventions, getInterventionStats } from '../intervention';
import { generateTrendReport, getQuickVerdict } from '../learning';

// Response cache with bounded storage
const MAX_CACHE_ENTRIES = 20;
const responseCache = new Map<string, { response: unknown; expiresAt: number }>();

function getConfig(): GovernanceApiConfig {
  return {
    ...DEFAULT_API_CONFIG,
    enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  };
}

function cacheResponse(key: string, response: unknown): void {
  const config = getConfig();
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = Array.from(responseCache.entries())
      .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)[0];
    if (oldest) responseCache.delete(oldest[0]);
  }
  responseCache.set(key, { response, expiresAt: Date.now() + config.cacheResponsesMs });
}

function getCachedResponse<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (!cached || cached.expiresAt < Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return cached.response as T;
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Answer: "Is autonomy helping or hurting?"
 */
export function getAutonomyImpact(): AutonomyImpactResponse {
  const cacheKey = 'autonomy-impact';
  const cached = getCachedResponse<AutonomyImpactResponse>(cacheKey);
  if (cached) return cached;

  const signals = computeAllSignals('week');
  const trustScore = signals.find(s => s.signal === 'autonomy_trust_score')?.value ?? 0.8;
  const overrideAccuracy = signals.find(s => s.signal === 'override_accuracy')?.value ?? 0.8;
  const incidentPrevent = signals.find(s => s.signal === 'incident_preventability')?.value ?? 0.7;
  const falseAlarmRate = signals.find(s => s.signal === 'false_alarm_rate')?.value ?? 0.2;
  const autoDegradation = signals.find(s => s.signal === 'automation_degradation_rate')?.value ?? 0.1;

  // Calculate net benefit (positive = helping, negative = hurting)
  const positiveFactors = trustScore + incidentPrevent + overrideAccuracy;
  const negativeFactors = falseAlarmRate + autoDegradation;
  const netBenefit = (positiveFactors / 3) - (negativeFactors / 2);

  // Determine answer
  let answer: AutonomyImpactResponse['answer'];
  if (netBenefit > 0.2) answer = 'helping';
  else if (netBenefit < -0.1) answer = 'hurting';
  else answer = 'neutral';

  // Find trends
  const improving = signals
    .filter(s => s.trend.direction === 'improving')
    .map(s => s.signal);
  const degrading = signals
    .filter(s => s.trend.direction === 'degrading')
    .map(s => s.signal);

  const response: AutonomyImpactResponse = {
    question: 'Is autonomy helping or hurting?',
    answer,
    confidence: 0.8,
    evidence: {
      decisionsWithoutIncident: Math.round(1000 * (1 - autoDegradation)),
      incidentsPrevented: Math.round(50 * incidentPrevent),
      timeSaved: `${Math.round(100 * trustScore)} hours/week`,
      costsSaved: Math.round(5000 * trustScore),
      falseBlocks: Math.round(100 * falseAlarmRate),
      missedIncidents: Math.round(10 * (1 - incidentPrevent)),
      overridesRequired: Math.round(50 * (1 - overrideAccuracy)),
      netBenefit,
      trustScore,
    },
    trends: {
      improving,
      degrading,
    },
    recommendation: answer === 'helping'
      ? 'Autonomy is providing value. Consider expanding scope.'
      : answer === 'hurting'
      ? 'Review autonomy policies. Consider tightening budgets or requiring more approvals.'
      : 'Autonomy is neutral. Monitor for changes.',
  };

  cacheResponse(cacheKey, response);
  return response;
}

/**
 * Answer: "Are humans the bottleneck?"
 */
export function getHumanBottleneck(): HumanBottleneckResponse {
  const cacheKey = 'human-bottleneck';
  const cached = getCachedResponse<HumanBottleneckResponse>(cacheKey);
  if (cached) return cached;

  const signals = computeAllSignals('day');
  const approvalEffectiveness = signals.find(s => s.signal === 'approval_effectiveness')?.value ?? 0.9;
  const responseTime = signals.find(s => s.signal === 'governance_response_time')?.value ?? 0.8;
  const overrideAccuracy = signals.find(s => s.signal === 'override_accuracy')?.value ?? 0.8;
  const escalationEffectiveness = signals.find(s => s.signal === 'escalation_effectiveness')?.value ?? 0.7;

  const interventions = getActiveInterventions();
  const pendingApprovals = interventions.filter(i => i.status === 'proposed').length;

  // Calculate bottleneck score
  const bottleneckScore = (1 - responseTime) + (pendingApprovals / 20) + (1 - approvalEffectiveness);

  let answer: HumanBottleneckResponse['answer'];
  if (bottleneckScore > 0.6) answer = 'yes';
  else if (bottleneckScore > 0.3) answer = 'partially';
  else answer = 'no';

  // Identify specific bottlenecks
  const bottlenecks: HumanBottleneckResponse['bottlenecks'] = [];

  if (pendingApprovals > 5) {
    bottlenecks.push({
      type: 'approval_queue',
      severity: pendingApprovals > 10 ? 'high' : 'medium',
      impact: `${pendingApprovals} approvals pending`,
      suggestedFix: 'Consider delegating approval authority or increasing automation',
    });
  }

  if (overrideAccuracy < 0.7) {
    bottlenecks.push({
      type: 'override_required',
      severity: 'high',
      impact: 'Low override accuracy indicates policy misalignment',
      suggestedFix: 'Review and adjust automation policies',
    });
  }

  if (responseTime < 0.6) {
    bottlenecks.push({
      type: 'manual_review',
      severity: 'medium',
      impact: 'Slow response times for governance decisions',
      suggestedFix: 'Streamline review process or add reviewers',
    });
  }

  const response: HumanBottleneckResponse = {
    question: 'Are humans the bottleneck?',
    answer,
    confidence: 0.75,
    evidence: {
      avgApprovalWaitHours: Math.round((1 - responseTime) * 24),
      maxApprovalWaitHours: Math.round((1 - responseTime) * 72),
      pendingApprovals,
      overrideRate: 1 - overrideAccuracy,
      overrideAccuracy,
      automationDecisionRate: 0.85,
      humanDecisionRate: 0.15,
      automationAccuracy: approvalEffectiveness,
      humanAccuracy: overrideAccuracy,
    },
    bottlenecks,
    recommendation: answer === 'yes'
      ? 'Humans are the bottleneck. Delegate authority or expand automation.'
      : answer === 'partially'
      ? 'Some bottlenecks exist. Address specific issues identified.'
      : 'Humans are not the bottleneck. Current balance is appropriate.',
  };

  cacheResponse(cacheKey, response);
  return response;
}

/**
 * Answer: "What would break if we removed automation tomorrow?"
 */
export function getAutomationDependency(): AutomationDependencyResponse {
  const cacheKey = 'automation-dependency';
  const cached = getCachedResponse<AutomationDependencyResponse>(cacheKey);
  if (cached) return cached;

  const signals = computeAllSignals('week');
  const trustScore = signals.find(s => s.signal === 'autonomy_trust_score')?.value ?? 0.8;
  const autoDegradation = signals.find(s => s.signal === 'automation_degradation_rate')?.value ?? 0.1;

  // Estimate capacity metrics
  const decisionsPerHour = Math.round(100 * trustScore);
  const humanCapacityNeeded = Math.round(decisionsPerHour * 0.1); // 10% need human review
  const currentHumanCapacity = 5; // Assumed
  const capacityGap = Math.max(0, humanCapacityNeeded - currentHumanCapacity);

  // Risk level based on gap
  let riskLevel: AutomationDependencyResponse['riskLevel'];
  if (capacityGap > 20) riskLevel = 'critical';
  else if (capacityGap > 10) riskLevel = 'high';
  else if (capacityGap > 5) riskLevel = 'moderate';
  else riskLevel = 'low';

  // Critical dependencies (example data)
  const criticalDependencies: AutomationDependencyResponse['criticalDependencies'] = [
    {
      feature: 'Content Publishing',
      automationPercentage: 85,
      dailyVolume: 500,
      fallbackPlan: 'partial',
      estimatedManualTime: '2 hours per item',
    },
    {
      feature: 'AI Content Generation',
      automationPercentage: 95,
      dailyVolume: 200,
      fallbackPlan: 'none',
      estimatedManualTime: '4 hours per item',
    },
    {
      feature: 'SEO Optimization',
      automationPercentage: 80,
      dailyVolume: 300,
      fallbackPlan: 'exists',
      estimatedManualTime: '30 minutes per item',
    },
  ];

  const response: AutomationDependencyResponse = {
    question: 'What would break if we removed automation tomorrow?',
    riskLevel,
    impact: {
      decisionsPerHour,
      humanCapacityNeeded,
      currentHumanCapacity,
      capacityGap,
      avgResponseTimeWithAutomation: 500, // ms
      estimatedResponseTimeWithout: 3600000, // 1 hour
      responseTimeMultiplier: 7200,
      automationCostPerDay: 100,
      humanCostPerDay: humanCapacityNeeded * 200,
      costMultiplier: humanCapacityNeeded * 2,
      incidentRateWithAutomation: autoDegradation,
      estimatedIncidentRateWithout: autoDegradation * 3,
      riskMultiplier: 3,
    },
    criticalDependencies,
    recommendation: riskLevel === 'critical' || riskLevel === 'high'
      ? 'High automation dependency. Develop fallback plans and cross-train staff.'
      : 'Automation dependency is manageable. Continue monitoring.',
  };

  cacheResponse(cacheKey, response);
  return response;
}

/**
 * Answer: "What is the most dangerous decision pattern right now?"
 */
export function getDangerousPattern(): DangerousPatternResponse {
  const cacheKey = 'dangerous-pattern';
  const cached = getCachedResponse<DangerousPatternResponse>(cacheKey);
  if (cached) return cached;

  const hiddenRisks = getTopHiddenRisks(5);
  const riskSummary = getSystemicRiskSummary();

  // Find most dangerous pattern
  const topRisk = hiddenRisks[0];
  const otherRisks = hiddenRisks.slice(1);

  // Default pattern if no hidden risks
  const defaultPattern: DangerousPatternResponse['topPattern'] = {
    id: 'no-patterns',
    name: 'No dangerous patterns detected',
    description: 'The system is not detecting any dangerous decision patterns.',
    dangerLevel: 'moderate',
    confidence: 0.7,
    occurrences: 0,
    timeframe: 'last 7 days',
    affectedFeatures: [],
    affectedTeams: [],
    incidentProbability: 0.1,
    estimatedImpact: 'low',
    exampleScenario: 'N/A',
  };

  const topPattern = topRisk ? {
    id: topRisk.id,
    name: topRisk.title,
    description: topRisk.description,
    dangerLevel: topRisk.severity === 'critical' ? 'critical' as const :
      topRisk.severity === 'high' ? 'high' as const : 'moderate' as const,
    confidence: topRisk.confidence,
    occurrences: topRisk.occurrences,
    timeframe: 'last 7 days',
    affectedFeatures: [topRisk.primaryAttribution.name],
    affectedTeams: [],
    incidentProbability: topRisk.incidentProbability,
    estimatedImpact: topRisk.estimatedImpact,
    timeToIncident: topRisk.timeToIncident ? `${topRisk.timeToIncident} hours` : undefined,
    exampleScenario: topRisk.description,
  } : defaultPattern;

  const response: DangerousPatternResponse = {
    question: 'What is the most dangerous decision pattern right now?',
    topPattern,
    otherPatterns: otherRisks.map(r => ({
      id: r.id,
      name: r.title,
      dangerLevel: r.severity === 'critical' ? 'critical' as const :
        r.severity === 'high' ? 'high' as const : 'moderate' as const,
      occurrences: r.occurrences,
    })),
    recommendation: topPattern.dangerLevel === 'critical'
      ? 'Immediate attention required. Review and mitigate this pattern.'
      : topPattern.dangerLevel === 'high'
      ? 'Schedule review of this pattern within 24 hours.'
      : 'Monitor this pattern. No immediate action required.',
  };

  cacheResponse(cacheKey, response);
  return response;
}

/**
 * Get full governance status
 */
export function getGovernanceStatus(): GovernanceStatusResponse {
  const cacheKey = 'governance-status';
  const cached = getCachedResponse<GovernanceStatusResponse>(cacheKey);
  if (cached) return cached;

  const overallHealth = computeOverallHealth('day');
  const interventions = getActiveInterventions();
  const interventionStats = getInterventionStats();
  const quickVerdict = getQuickVerdict('week');

  // Get quick answers
  const autonomyImpact = getAutonomyImpact();
  const humanBottleneck = getHumanBottleneck();
  const automationDep = getAutomationDependency();
  const dangerousPattern = getDangerousPattern();

  const response: GovernanceStatusResponse = {
    asOf: new Date(),
    overallHealth: {
      score: overallHealth.score,
      rating: overallHealth.rating,
      trend: quickVerdict.verdict === 'safer' ? 'improving' :
        quickVerdict.verdict === 'worse' ? 'degrading' : 'stable',
    },
    quickAnswers: {
      autonomyHelping: autonomyImpact.answer,
      humansBottleneck: humanBottleneck.answer,
      automationDependencyRisk: automationDep.riskLevel,
      dangerousPatternLevel: dangerousPattern.topPattern.dangerLevel,
    },
    keyMetrics: {
      governanceScore: overallHealth.score,
      systemicRiskScore: computeSystemicRisk(),
      interventionSuccessRate: interventionStats.effectiveRate,
      automationTrustScore: autonomyImpact.evidence.trustScore,
    },
    trendSummary: {
      verdict: quickVerdict.verdict,
      confidence: quickVerdict.confidence,
      reason: quickVerdict.topReason,
    },
    actionsNeeded: interventions.length,
    urgentActions: interventions.filter(i => i.priority === 'urgent').length,
  };

  cacheResponse(cacheKey, response);
  return response;
}

/**
 * Clear API cache
 */
export function clearApiCache(): void {
  responseCache.clear();
}
