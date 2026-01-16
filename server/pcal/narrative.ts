/**
 * PCAL Phase 4: Executive Narrative Generator
 *
 * Generates human-readable answers to executive questions:
 * - Why did rollout X fail?
 * - Why was feature Y blocked?
 * - What is the riskiest area?
 * - Are we safer than last month?
 */

import { createLogger } from '../lib/logger';
import { isPCALEnabled } from './config';
import { getRecentDecisions, getDecisionsByOutcome, getDecisionStats } from './decision-stream';
import { getPatterns, getRepeatedMistakes, getSilentRegressions, getAllSubsystemHealth } from './platform-memory';
import { getAuthorityStats, getActiveOverrides } from './authority-chain';
import type {
  NarrativeRequest,
  ExecutiveNarrative,
  TimelineEvent,
  SystemicRisk,
  ImprovementOpportunity,
  PlatformRiskReport,
} from './types';

const logger = createLogger('pcal-narrative');

// Narrative history
const narrativeHistory: ExecutiveNarrative[] = [];
const riskReportHistory: PlatformRiskReport[] = [];

// ============================================================================
// Narrative Generation
// ============================================================================

export function generateNarrative(request: NarrativeRequest): ExecutiveNarrative {
  if (!isPCALEnabled()) {
    throw new Error('PCAL is not enabled');
  }

  let narrative: ExecutiveNarrative;

  switch (request.query) {
    case 'why_rollout_failed':
      narrative = generateRolloutFailureNarrative(request.context?.rolloutId);
      break;
    case 'why_feature_blocked':
      narrative = generateFeatureBlockedNarrative(request.context?.featureId);
      break;
    case 'riskiest_area':
      narrative = generateRiskiestAreaNarrative();
      break;
    case 'safety_trend':
      narrative = generateSafetyTrendNarrative(request.timeRange);
      break;
    default:
      narrative = generateCustomNarrative(request);
  }

  narrativeHistory.push(narrative);
  if (narrativeHistory.length > 100) {
    narrativeHistory.shift();
  }

  logger.info({ query: request.query, id: narrative.id }, 'Narrative generated');
  return narrative;
}

function generateRolloutFailureNarrative(rolloutId?: string): ExecutiveNarrative {
  const blockedDecisions = getDecisionsByOutcome('blocked', 50);
  const escalatedDecisions = getDecisionsByOutcome('escalated', 50);
  const patterns = getPatterns(10);

  const relevantDecisions = rolloutId
    ? blockedDecisions.filter(d => d.scopeId === rolloutId || d.sourceId === rolloutId)
    : blockedDecisions;

  const timeline: TimelineEvent[] = relevantDecisions.slice(0, 10).map(d => ({
    timestamp: d.timestamp,
    event: `${d.source}: ${d.reason}`,
    significance: d.confidence < 50 ? 'high' : d.confidence < 75 ? 'medium' : 'low',
    relatedDecisions: [d.id],
  }));

  const rootCauses = extractRootCauses(relevantDecisions);
  const contributingFactors = extractContributingFactors(relevantDecisions, patterns);

  return {
    id: `nar_${Date.now()}`,
    query: 'why_rollout_failed',
    generatedAt: new Date(),
    headline: rolloutId
      ? `Rollout ${rolloutId} was blocked due to ${rootCauses[0] || 'multiple factors'}`
      : `Recent rollouts blocked: ${blockedDecisions.length} decisions`,
    summary: buildRolloutSummary(relevantDecisions, rootCauses),
    timeline,
    rootCauses,
    contributingFactors,
    recommendations: generateRecommendations('rollout_failure', rootCauses, contributingFactors),
  };
}

function generateFeatureBlockedNarrative(featureId?: string): ExecutiveNarrative {
  const blockedDecisions = getDecisionsByOutcome('blocked', 100)
    .filter(d => d.scope === 'feature');

  const relevantDecisions = featureId
    ? blockedDecisions.filter(d => d.scopeId === featureId)
    : blockedDecisions;

  const patterns = getPatterns(10);

  const timeline: TimelineEvent[] = relevantDecisions.slice(0, 10).map(d => ({
    timestamp: d.timestamp,
    event: `${d.source}: ${d.reason}`,
    significance: 'medium',
    relatedDecisions: [d.id],
  }));

  const rootCauses = extractRootCauses(relevantDecisions);
  const contributingFactors = extractContributingFactors(relevantDecisions, patterns);

  return {
    id: `nar_${Date.now()}`,
    query: 'why_feature_blocked',
    generatedAt: new Date(),
    headline: featureId
      ? `Feature ${featureId} was blocked by ${relevantDecisions[0]?.source || 'platform controls'}`
      : `${relevantDecisions.length} features currently blocked`,
    summary: buildFeatureBlockedSummary(relevantDecisions),
    timeline,
    rootCauses,
    contributingFactors,
    recommendations: generateRecommendations('feature_blocked', rootCauses, contributingFactors),
  };
}

function generateRiskiestAreaNarrative(): ExecutiveNarrative {
  const patterns = getPatterns(20);
  const regressions = getSilentRegressions();
  const health = getAllSubsystemHealth();
  const overrides = getActiveOverrides();

  // Score each area
  const areaScores = new Map<string, number>();

  for (const pattern of patterns) {
    for (const system of pattern.affectedSystems) {
      const current = areaScores.get(system) || 0;
      areaScores.set(system, current + pattern.occurrences * (pattern.severity === 'critical' ? 10 : pattern.severity === 'high' ? 5 : 1));
    }
  }

  for (const regression of regressions) {
    const current = areaScores.get(regression.subsystem) || 0;
    areaScores.set(regression.subsystem, current + Math.abs(regression.degradationPercent));
  }

  for (const h of health) {
    if (h.mttrTrend === 'worsening') {
      const current = areaScores.get(h.subsystem) || 0;
      areaScores.set(h.subsystem, current + 20);
    }
  }

  const sortedAreas = Array.from(areaScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const riskiestArea = sortedAreas[0]?.[0] || 'No clear risk area identified';

  const rootCauses = sortedAreas.map(([area, score]) => `${area}: risk score ${score}`);

  return {
    id: `nar_${Date.now()}`,
    query: 'riskiest_area',
    generatedAt: new Date(),
    headline: `Highest risk: ${riskiestArea}`,
    summary: buildRiskSummary(sortedAreas, patterns, regressions),
    timeline: [],
    rootCauses,
    contributingFactors: [
      `${patterns.length} failure patterns detected`,
      `${regressions.length} silent regressions active`,
      `${overrides.length} overrides currently active`,
    ],
    recommendations: generateRecommendations('risk', rootCauses, []),
  };
}

function generateSafetyTrendNarrative(timeRange?: { start: Date; end: Date }): ExecutiveNarrative {
  const stats = getDecisionStats();
  const patterns = getPatterns(20);
  const mistakes = getRepeatedMistakes();

  // Calculate trend indicators
  const improvingPatterns = patterns.filter(p => p.trend === 'improving').length;
  const worseningPatterns = patterns.filter(p => p.trend === 'worsening').length;

  const overallTrend = improvingPatterns > worseningPatterns ? 'improving'
    : worseningPatterns > improvingPatterns ? 'worsening'
    : 'stable';

  const rootCauses = [
    `${improvingPatterns} patterns improving`,
    `${worseningPatterns} patterns worsening`,
    `Average decision confidence: ${stats.avgConfidence}%`,
    `${mistakes.length} repeated mistakes identified`,
  ];

  return {
    id: `nar_${Date.now()}`,
    query: 'safety_trend',
    generatedAt: new Date(),
    headline: overallTrend === 'improving'
      ? 'Platform safety is improving'
      : overallTrend === 'worsening'
      ? 'Platform safety is declining - attention needed'
      : 'Platform safety is stable',
    summary: buildSafetyTrendSummary(stats, patterns, overallTrend),
    timeline: [],
    rootCauses,
    contributingFactors: [
      `${stats.total} total decisions tracked`,
      `${stats.reversiblePercent}% decisions are reversible`,
    ],
    recommendations: generateRecommendations('safety', rootCauses, []),
  };
}

function generateCustomNarrative(request: NarrativeRequest): ExecutiveNarrative {
  const stats = getDecisionStats();

  return {
    id: `nar_${Date.now()}`,
    query: 'custom',
    generatedAt: new Date(),
    headline: 'Platform Status Overview',
    summary: `Tracking ${stats.total} decisions across ${Object.keys(stats.bySource).length} sources. Average confidence: ${stats.avgConfidence}%.`,
    timeline: [],
    rootCauses: [],
    contributingFactors: [],
    recommendations: ['Review dashboard for detailed status'],
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractRootCauses(decisions: ReturnType<typeof getRecentDecisions>): string[] {
  const causes = new Map<string, number>();

  for (const d of decisions) {
    const key = `${d.source}: ${d.reason.split(' ').slice(0, 5).join(' ')}`;
    causes.set(key, (causes.get(key) || 0) + 1);
  }

  return Array.from(causes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cause, count]) => `${cause} (${count}x)`);
}

function extractContributingFactors(
  decisions: ReturnType<typeof getRecentDecisions>,
  patterns: ReturnType<typeof getPatterns>
): string[] {
  const factors: string[] = [];

  const lowConfidence = decisions.filter(d => d.confidence < 70);
  if (lowConfidence.length > 0) {
    factors.push(`${lowConfidence.length} decisions had low confidence`);
  }

  const overrides = decisions.filter(d => d.overrideOf);
  if (overrides.length > 0) {
    factors.push(`${overrides.length} decisions were overrides`);
  }

  const relatedPatterns = patterns.filter(p =>
    p.linkedDecisions.some(id => decisions.some(d => d.id === id))
  );
  if (relatedPatterns.length > 0) {
    factors.push(`Related to ${relatedPatterns.length} known patterns`);
  }

  return factors;
}

function buildRolloutSummary(decisions: ReturnType<typeof getRecentDecisions>, rootCauses: string[]): string {
  if (decisions.length === 0) {
    return 'No blocked rollouts found in the analysis window.';
  }

  const sources = [...new Set(decisions.map(d => d.source))];
  return `${decisions.length} rollout(s) were blocked by ${sources.join(', ')}. Primary causes: ${rootCauses.slice(0, 3).join('; ')}.`;
}

function buildFeatureBlockedSummary(decisions: ReturnType<typeof getRecentDecisions>): string {
  if (decisions.length === 0) {
    return 'No blocked features found.';
  }

  const sources = [...new Set(decisions.map(d => d.source))];
  return `${decisions.length} feature decision(s) blocked by ${sources.join(', ')}.`;
}

function buildRiskSummary(
  areas: [string, number][],
  patterns: ReturnType<typeof getPatterns>,
  regressions: ReturnType<typeof getSilentRegressions>
): string {
  if (areas.length === 0) {
    return 'No significant risk areas identified.';
  }

  const top = areas[0];
  return `${top[0]} has the highest risk score (${top[1]}). ${patterns.length} failure patterns and ${regressions.length} silent regressions are being tracked.`;
}

function buildSafetyTrendSummary(
  stats: ReturnType<typeof getDecisionStats>,
  patterns: ReturnType<typeof getPatterns>,
  trend: string
): string {
  return `Platform is ${trend}. ${stats.total} decisions tracked with ${stats.avgConfidence}% average confidence. ${patterns.filter(p => p.trend === 'worsening').length} patterns are worsening.`;
}

function generateRecommendations(
  context: string,
  rootCauses: string[],
  contributingFactors: string[]
): string[] {
  const recommendations: string[] = [];

  if (context === 'rollout_failure') {
    recommendations.push('Review blocking conditions before next rollout');
    if (rootCauses.some(c => c.includes('readiness'))) {
      recommendations.push('Address platform readiness issues');
    }
  }

  if (context === 'feature_blocked') {
    recommendations.push('Check governor restrictions');
    recommendations.push('Review publish gate requirements');
  }

  if (context === 'risk') {
    recommendations.push('Prioritize highest-risk subsystems for review');
    recommendations.push('Address silent regressions before they become incidents');
  }

  if (context === 'safety') {
    recommendations.push('Continue monitoring worsening patterns');
    recommendations.push('Address repeated mistakes systematically');
  }

  if (contributingFactors.some(f => f.includes('override'))) {
    recommendations.push('Review override frequency - consider policy adjustments');
  }

  return recommendations.slice(0, 5);
}

// ============================================================================
// Risk Report Generation
// ============================================================================

export function generateRiskReport(): PlatformRiskReport {
  const patterns = getPatterns(20);
  const regressions = getSilentRegressions();
  const mistakes = getRepeatedMistakes();
  const health = getAllSubsystemHealth();
  const stats = getDecisionStats();

  // Generate top risks
  const topRisks: SystemicRisk[] = [];

  // From patterns
  for (const pattern of patterns.filter(p => p.severity === 'high' || p.severity === 'critical')) {
    topRisks.push({
      id: `risk_pattern_${pattern.id}`,
      area: pattern.affectedSystems[0] || 'unknown',
      description: pattern.description,
      severity: pattern.severity,
      likelihood: pattern.occurrences > 5 ? 0.8 : 0.5,
      impact: `${pattern.occurrences} occurrences, ${pattern.linkedIncidents.length} incidents`,
      mitigations: [pattern.trend === 'worsening' ? 'Urgent attention needed' : 'Monitor closely'],
      trend: pattern.trend,
    });
  }

  // From regressions
  for (const reg of regressions.filter(r => Math.abs(r.degradationPercent) > 20)) {
    topRisks.push({
      id: `risk_reg_${reg.id}`,
      area: reg.subsystem,
      description: reg.description,
      severity: Math.abs(reg.degradationPercent) > 50 ? 'high' : 'medium',
      likelihood: 0.7,
      impact: `${reg.metric} degraded by ${reg.degradationPercent.toFixed(1)}%`,
      mitigations: ['Investigate root cause', 'Consider rollback'],
      trend: 'worsening',
    });
  }

  // Generate improvement opportunities
  const topOpportunities: ImprovementOpportunity[] = [];

  const authorityStats = getAuthorityStats();
  if (authorityStats.activeOverrides > 3) {
    topOpportunities.push({
      id: 'opp_overrides',
      area: 'Governance',
      description: 'High number of active overrides suggests policies may be too restrictive',
      expectedImpact: 'medium',
      effort: 'medium',
      recommendation: 'Review and adjust policies to reduce override frequency',
    });
  }

  if (stats.avgConfidence < 70) {
    topOpportunities.push({
      id: 'opp_confidence',
      area: 'Decision Quality',
      description: 'Average decision confidence is low',
      expectedImpact: 'high',
      effort: 'high',
      recommendation: 'Improve signal quality for decision systems',
    });
  }

  if (mistakes.length > 0) {
    topOpportunities.push({
      id: 'opp_mistakes',
      area: 'Learning',
      description: `${mistakes.length} repeated mistakes identified`,
      expectedImpact: 'high',
      effort: 'medium',
      recommendation: 'Address top repeated mistakes systematically',
    });
  }

  // Calculate safety trend
  const improvingCount = patterns.filter(p => p.trend === 'improving').length;
  const worseningCount = patterns.filter(p => p.trend === 'worsening').length;
  const safetyTrend = improvingCount > worseningCount ? 'safer'
    : worseningCount > improvingCount ? 'riskier'
    : 'same';

  const safetyScore = Math.max(0, Math.min(100,
    100 - (worseningCount * 10) - (regressions.length * 5) - (mistakes.length * 3)
  ));

  const report: PlatformRiskReport = {
    id: `risk_${Date.now()}`,
    generatedAt: new Date(),
    topRisks: topRisks.slice(0, 5),
    topOpportunities: topOpportunities.slice(0, 5),
    safetyTrend,
    safetyScore,
    comparisonPeriod: 'last 7 days',
  };

  riskReportHistory.push(report);
  if (riskReportHistory.length > 50) {
    riskReportHistory.shift();
  }

  return report;
}

// ============================================================================
// Query API
// ============================================================================

export function getNarrativeHistory(limit = 20): ExecutiveNarrative[] {
  return narrativeHistory.slice(-limit);
}

export function getRiskReportHistory(limit = 10): PlatformRiskReport[] {
  return riskReportHistory.slice(-limit);
}

export function clearAll(): void {
  narrativeHistory.length = 0;
  riskReportHistory.length = 0;
}
