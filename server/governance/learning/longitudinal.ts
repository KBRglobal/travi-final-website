/**
 * Longitudinal Learning System - Core Logic
 * Answers: "Are we governing ourselves better over time?"
 */

import {
  ComparisonPeriod,
  LearningDimension,
  PeriodComparison,
  RuleLearning,
  TeamLearning,
  AutomationHealth,
  RecurringRisk,
  GovernanceTrendReport,
  LongitudinalLearningConfig,
  DEFAULT_LEARNING_CONFIG,
} from './types';
import { computeAllSignals, getHistoricalScores, GovernanceSignal } from '../metrics';
import { getSystemicRiskSummary, getTopHiddenRisks, LatentRisk } from '../risk';
import { getInterventionRules, getInterventionStats } from '../intervention';

// Bounded storage
const MAX_PERIODS = 12;
const MAX_LEARNINGS = 50;

const ruleLearnings = new Map<string, RuleLearning>();
const teamLearnings = new Map<string, TeamLearning>();
const automationHealthRecords = new Map<string, AutomationHealth>();
const recurringRisks = new Map<string, RecurringRisk>();

function getConfig(): LongitudinalLearningConfig {
  return {
    ...DEFAULT_LEARNING_CONFIG,
    enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PERIOD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getPeriodBounds(period: ComparisonPeriod, offset: number = 0): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (period) {
    case 'week':
      end.setDate(end.getDate() - (7 * offset));
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      end.setMonth(end.getMonth() - offset);
      start.setMonth(end.getMonth() - 1);
      break;
    case 'quarter':
      end.setMonth(end.getMonth() - (3 * offset));
      start.setMonth(end.getMonth() - 3);
      break;
  }

  const label = period === 'week'
    ? `Week of ${start.toISOString().slice(0, 10)}`
    : period === 'month'
    ? `${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}`
    : `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;

  return { start, end, label };
}

function getPeriodKey(date: Date, period: ComparisonPeriod): string {
  const year = date.getFullYear();
  if (period === 'week') {
    const weekNum = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
  } else if (period === 'month') {
    return `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  } else {
    return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION COMPARISONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compare governance quality between periods
 */
export function compareGovernanceQuality(period: ComparisonPeriod): PeriodComparison {
  const current = getPeriodBounds(period, 0);
  const previous = getPeriodBounds(period, 1);
  const config = getConfig();

  // Get signals for both periods
  const currentSignals = computeAllSignals(period === 'week' ? 'week' : 'month');
  const previousScores = new Map<GovernanceSignal, number>();

  // Get historical scores for previous period
  for (const signal of currentSignals) {
    const history = getHistoricalScores(signal.signal, 10);
    const prevScore = history.find(h =>
      new Date(h.recordedAt) >= previous.start && new Date(h.recordedAt) <= previous.end
    );
    previousScores.set(signal.signal, prevScore?.value ?? signal.value);
  }

  // Compute components
  const components = currentSignals.map(s => {
    const prevValue = previousScores.get(s.signal) ?? s.value;
    const delta = s.value - prevValue;
    const isInverted = ['readiness_volatility', 'budget_waste_ratio', 'decision_latency_drift',
      'executive_surprise_index', 'automation_degradation_rate', 'false_alarm_rate'].includes(s.signal);

    return {
      name: s.signal,
      currentValue: s.value,
      previousValue: prevValue,
      delta,
      trend: Math.abs(delta) < config.significanceThreshold ? 'stable' as const :
        (isInverted ? delta < 0 : delta > 0) ? 'improving' as const : 'degrading' as const,
      weight: 1 / currentSignals.length,
    };
  });

  // Calculate overall
  const improvingCount = components.filter(c => c.trend === 'improving').length;
  const degradingCount = components.filter(c => c.trend === 'degrading').length;
  const avgDelta = components.reduce((sum, c) => sum + c.delta * c.weight, 0);

  const verdict: 'safer' | 'same' | 'worse' =
    improvingCount > degradingCount * 2 ? 'safer' :
    degradingCount > improvingCount * 2 ? 'worse' : 'same';

  // Generate reasons
  const reasons: string[] = [];
  const topImproving = components.filter(c => c.trend === 'improving').slice(0, 2);
  const topDegrading = components.filter(c => c.trend === 'degrading').slice(0, 2);

  if (topImproving.length > 0) {
    reasons.push(`Improved: ${topImproving.map(c => `${c.name} (+${(c.delta * 100).toFixed(0)}%)`).join(', ')}`);
  }
  if (topDegrading.length > 0) {
    reasons.push(`Degraded: ${topDegrading.map(c => `${c.name} (${(c.delta * 100).toFixed(0)}%)`).join(', ')}`);
  }
  if (verdict === 'same') {
    reasons.push('Most signals remained stable within threshold');
  }

  return {
    dimension: 'governance_quality',
    currentPeriod: current,
    previousPeriod: previous,
    verdict,
    confidence: Math.min(0.95, 0.6 + (currentSignals.length / 20)),
    delta: {
      value: avgDelta,
      percentChange: avgDelta * 100,
      isSignificant: Math.abs(avgDelta) >= config.significanceThreshold,
    },
    components,
    reasons,
  };
}

/**
 * Analyze rule effectiveness over time
 */
export function analyzeRuleEffectiveness(period: ComparisonPeriod): RuleLearning[] {
  const rules = getInterventionRules();
  const learnings: RuleLearning[] = [];

  for (const rule of rules) {
    const periodKey = getPeriodKey(new Date(), period);
    const existing = ruleLearnings.get(rule.id) || {
      ruleId: rule.id,
      ruleName: rule.name,
      periods: [],
      trend: 'stable' as const,
      trendConfidence: 0.5,
    };

    // Add/update current period
    const currentPeriodData = {
      period: periodKey,
      triggerCount: rule.triggerCount,
      acceptedCount: 0, // Would come from intervention history
      effectiveCount: 0,
      effectivenessRate: 0,
    };

    // Update periods (bounded)
    const existingPeriodIndex = existing.periods.findIndex(p => p.period === periodKey);
    if (existingPeriodIndex >= 0) {
      existing.periods[existingPeriodIndex] = currentPeriodData;
    } else {
      if (existing.periods.length >= MAX_PERIODS) {
        existing.periods.shift();
      }
      existing.periods.push(currentPeriodData);
    }

    // Calculate trend
    if (existing.periods.length >= 3) {
      const recent = existing.periods.slice(-3);
      const avgRecent = recent.reduce((sum, p) => sum + p.effectivenessRate, 0) / recent.length;
      const older = existing.periods.slice(0, -3);
      const avgOlder = older.length > 0
        ? older.reduce((sum, p) => sum + p.effectivenessRate, 0) / older.length
        : avgRecent;

      if (avgRecent > avgOlder + 0.1) {
        existing.trend = 'improving';
      } else if (avgRecent < avgOlder - 0.1) {
        existing.trend = 'degrading';
      } else {
        existing.trend = 'stable';
      }
      existing.trendConfidence = Math.min(0.9, 0.5 + existing.periods.length * 0.05);
    }

    // Generate recommendation
    if (existing.trend === 'degrading' && rule.triggerCount > 5) {
      existing.recommendation = 'review';
      existing.recommendationReason = 'Rule effectiveness declining while frequently triggered';
    } else if (rule.triggerCount === 0 && existing.periods.length > 3) {
      existing.recommendation = 'review';
      existing.recommendationReason = 'Rule never triggers - may be obsolete';
    }

    ruleLearnings.set(rule.id, existing);
    learnings.push(existing);
  }

  return learnings;
}

/**
 * Analyze team learning patterns
 */
export function analyzeTeamLearning(period: ComparisonPeriod): TeamLearning[] {
  // In a real implementation, this would pull from actual team data
  // For now, we'll use risk attribution data
  const riskSummary = getSystemicRiskSummary();
  const learnings: TeamLearning[] = [];

  for (const contributor of riskSummary.topContributors) {
    if (contributor.attributionType !== 'team') continue;

    const existing = teamLearnings.get(contributor.attributionId) || {
      teamId: contributor.attributionId,
      teamName: contributor.attributionName,
      periods: [],
      trend: 'stable' as const,
      learningRate: 0,
      strengths: [],
      areasForImprovement: [],
    };

    const periodKey = getPeriodKey(new Date(), period);
    const currentPeriodData = {
      period: periodKey,
      incidentCount: 0,
      overrideCount: 0,
      approvalSuccessRate: 0.9,
      riskContribution: contributor.riskScore,
      governanceScore: 1 - (contributor.riskScore / 100),
    };

    // Update periods
    const existingIndex = existing.periods.findIndex(p => p.period === periodKey);
    if (existingIndex >= 0) {
      existing.periods[existingIndex] = currentPeriodData;
    } else {
      if (existing.periods.length >= MAX_PERIODS) {
        existing.periods.shift();
      }
      existing.periods.push(currentPeriodData);
    }

    // Calculate learning rate
    if (existing.periods.length >= 2) {
      const recent = existing.periods[existing.periods.length - 1];
      const older = existing.periods[0];
      existing.learningRate = recent.governanceScore - older.governanceScore;
      existing.trend = existing.learningRate > 0.05 ? 'improving' :
        existing.learningRate < -0.05 ? 'degrading' : 'stable';
    }

    // Generate insights
    if (contributor.trend === 'decreasing') {
      existing.strengths.push('Reducing risk contribution');
    }
    if (contributor.riskScore > 20) {
      existing.areasForImprovement.push('High risk contribution needs attention');
    }

    teamLearnings.set(contributor.attributionId, existing);
    learnings.push(existing);
  }

  return learnings;
}

/**
 * Analyze automation health over time
 */
export function analyzeAutomationHealth(period: ComparisonPeriod): AutomationHealth[] {
  const signals = computeAllSignals(period === 'week' ? 'week' : 'month');
  const automationSignal = signals.find(s => s.signal === 'automation_degradation_rate');
  const trustSignal = signals.find(s => s.signal === 'autonomy_trust_score');

  const existing = automationHealthRecords.get('global') || {
    featureId: 'global',
    featureName: 'Platform Automation',
    periods: [],
    trend: 'stable' as const,
    degradationRate: 0,
    verdict: 'healthy' as const,
    verdictReason: 'Automation performing within normal parameters',
  };

  const periodKey = getPeriodKey(new Date(), period);
  const currentPeriodData = {
    period: periodKey,
    decisionCount: 0,
    accuracyRate: trustSignal?.value ?? 0.8,
    revertRate: 1 - (trustSignal?.value ?? 0.8),
    incidentRate: automationSignal?.value ?? 0.1,
    humanTrustScore: trustSignal?.value ?? 0.8,
  };

  // Update periods
  const existingIndex = existing.periods.findIndex(p => p.period === periodKey);
  if (existingIndex >= 0) {
    existing.periods[existingIndex] = currentPeriodData;
  } else {
    if (existing.periods.length >= MAX_PERIODS) {
      existing.periods.shift();
    }
    existing.periods.push(currentPeriodData);
  }

  // Calculate degradation rate
  if (existing.periods.length >= 2) {
    const recent = existing.periods[existing.periods.length - 1];
    const older = existing.periods[0];
    existing.degradationRate = older.accuracyRate - recent.accuracyRate;
    existing.trend = existing.degradationRate < -0.05 ? 'improving' :
      existing.degradationRate > 0.05 ? 'degrading' : 'stable';
  }

  // Determine verdict
  const currentAccuracy = currentPeriodData.accuracyRate;
  if (currentAccuracy < 0.6) {
    existing.verdict = 'critical';
    existing.verdictReason = 'Automation accuracy critically low';
  } else if (currentAccuracy < 0.75 || existing.trend === 'degrading') {
    existing.verdict = 'degrading';
    existing.verdictReason = 'Automation performance declining';
  } else if (currentAccuracy < 0.85) {
    existing.verdict = 'concerning';
    existing.verdictReason = 'Automation accuracy below target';
  } else {
    existing.verdict = 'healthy';
    existing.verdictReason = 'Automation performing well';
  }

  automationHealthRecords.set('global', existing);
  return [existing];
}

/**
 * Analyze recurring risk patterns
 */
export function analyzeRecurringRisks(period: ComparisonPeriod): RecurringRisk[] {
  const hiddenRisks = getTopHiddenRisks(10);
  const patterns: RecurringRisk[] = [];

  for (const risk of hiddenRisks) {
    const existing = recurringRisks.get(risk.id) || {
      patternId: risk.id,
      description: risk.title,
      occurrences: [],
      isRecurring: false,
      recurrenceInterval: 0,
      lastOccurred: new Date(),
      mitigationAttempts: 0,
      successfulMitigations: 0,
      mitigationEffectiveness: 0,
    };

    const periodKey = getPeriodKey(new Date(), period);

    // Add occurrence
    const existingOccurrence = existing.occurrences.find(o => o.period === periodKey);
    if (!existingOccurrence) {
      if (existing.occurrences.length >= MAX_PERIODS) {
        existing.occurrences.shift();
      }
      existing.occurrences.push({
        period: periodKey,
        count: risk.occurrences,
        severity: risk.severity,
        wasMitigated: risk.status === 'mitigated',
      });
    }

    // Determine if recurring
    existing.isRecurring = existing.occurrences.length >= 2;
    if (existing.isRecurring) {
      existing.recurrenceInterval = existing.occurrences.length > 1
        ? existing.occurrences.length / (existing.occurrences.filter(o => o.count > 0).length || 1)
        : 0;
    }

    existing.lastOccurred = risk.lastUpdated;

    // Calculate mitigation effectiveness
    const mitigated = existing.occurrences.filter(o => o.wasMitigated).length;
    existing.successfulMitigations = mitigated;
    existing.mitigationAttempts = existing.occurrences.length;
    existing.mitigationEffectiveness = existing.mitigationAttempts > 0
      ? mitigated / existing.mitigationAttempts
      : 0;

    recurringRisks.set(risk.id, existing);
    patterns.push(existing);
  }

  return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════
// TREND REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate comprehensive governance trend report
 */
export function generateTrendReport(period: ComparisonPeriod): GovernanceTrendReport {
  const governanceComparison = compareGovernanceQuality(period);
  const ruleLearningsList = analyzeRuleEffectiveness(period);
  const teamLearningsList = analyzeTeamLearning(period);
  const automationHealthList = analyzeAutomationHealth(period);
  const recurringRisksList = analyzeRecurringRisks(period);

  // Determine overall verdict
  const verdicts = [governanceComparison.verdict];

  // Add automation verdict
  const autoHealth = automationHealthList[0];
  if (autoHealth?.verdict === 'critical') verdicts.push('worse');
  else if (autoHealth?.verdict === 'healthy') verdicts.push('safer');
  else verdicts.push('same');

  // Add risk verdict
  const criticalRisks = recurringRisksList.filter(r => r.isRecurring && r.mitigationEffectiveness < 0.5);
  if (criticalRisks.length > 2) verdicts.push('worse');

  // Calculate overall
  const saferCount = verdicts.filter(v => v === 'safer').length;
  const worseCount = verdicts.filter(v => v === 'worse').length;
  const overallVerdict: 'safer' | 'same' | 'worse' =
    saferCount > worseCount ? 'safer' :
    worseCount > saferCount ? 'worse' : 'same';

  // Generate reasons
  const overallReasons: string[] = [...governanceComparison.reasons];
  if (autoHealth) {
    overallReasons.push(`Automation: ${autoHealth.verdictReason}`);
  }
  if (criticalRisks.length > 0) {
    overallReasons.push(`${criticalRisks.length} recurring risks with low mitigation effectiveness`);
  }

  // Generate key findings
  const keyFindings: GovernanceTrendReport['keyFindings'] = [];

  // Positive findings
  const improvingSignals = governanceComparison.components.filter(c => c.trend === 'improving');
  if (improvingSignals.length > 0) {
    keyFindings.push({
      type: 'positive',
      finding: `${improvingSignals.length} governance signals improved`,
      evidence: improvingSignals.map(s => s.name).join(', '),
      actionable: false,
    });
  }

  // Negative findings
  const degradingSignals = governanceComparison.components.filter(c => c.trend === 'degrading');
  if (degradingSignals.length > 0) {
    keyFindings.push({
      type: 'negative',
      finding: `${degradingSignals.length} governance signals degraded`,
      evidence: degradingSignals.map(s => s.name).join(', '),
      actionable: true,
      suggestedAction: 'Review degrading signals and consider policy adjustments',
    });
  }

  // Recurring risks finding
  if (criticalRisks.length > 0) {
    keyFindings.push({
      type: 'negative',
      finding: 'Recurring risks not being effectively mitigated',
      evidence: criticalRisks.map(r => r.description).slice(0, 3).join(', '),
      actionable: true,
      suggestedAction: 'Review root causes of recurring risks',
    });
  }

  // Generate predictions
  const predictions: GovernanceTrendReport['predictions'] = [];

  if (overallVerdict === 'worse') {
    predictions.push({
      prediction: 'Incident probability may increase in next period',
      probability: 0.6,
      timeframe: period,
      basis: 'Based on degrading governance signals',
    });
  }

  if (autoHealth?.trend === 'degrading') {
    predictions.push({
      prediction: 'Automation trust erosion likely to continue',
      probability: 0.7,
      timeframe: period,
      basis: `Degradation rate: ${(autoHealth.degradationRate * 100).toFixed(1)}%`,
    });
  }

  return {
    generatedAt: new Date(),
    period,
    overallVerdict,
    overallConfidence: governanceComparison.confidence,
    overallReasons,
    dimensionComparisons: [governanceComparison],
    ruleLearnings: ruleLearningsList,
    teamLearnings: teamLearningsList,
    automationHealth: automationHealthList,
    recurringRisks: recurringRisksList,
    keyFindings,
    predictions,
  };
}

/**
 * Get quick verdict: "safer", "same", or "worse"
 */
export function getQuickVerdict(period: ComparisonPeriod): {
  verdict: 'safer' | 'same' | 'worse';
  confidence: number;
  topReason: string;
} {
  const comparison = compareGovernanceQuality(period);
  return {
    verdict: comparison.verdict,
    confidence: comparison.confidence,
    topReason: comparison.reasons[0] || 'No significant changes detected',
  };
}

/**
 * Clear all learning data (for testing)
 */
export function clearLearningData(): void {
  ruleLearnings.clear();
  teamLearnings.clear();
  automationHealthRecords.clear();
  recurringRisks.clear();
}
