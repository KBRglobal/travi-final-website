/**
 * Enterprise Intelligence Hub - Executive Summarizer
 *
 * Generates deterministic executive summaries from signals.
 */

import { log } from '../../lib/logger';
import { getSignalRegistry } from '../signals/registry';
import { runCorrelationAnalysis, getActiveAnomalies } from '../correlation';
import { getTopRisks } from './risk-scoring';
import { getTopOpportunities } from './opportunities';
import type {
  ExecutiveSummary,
  SummaryOptions,
  ActionItem,
  ActionPriority,
  HealthBreakdown,
  Risk,
  Opportunity,
} from './types';
import type { UnifiedSignal } from '../signals/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Summarizer] ${msg}`, data),
};

/**
 * Generate unique summary ID
 */
function generateSummaryId(): string {
  return `summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique action ID
 */
function generateActionId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate health breakdown from signals
 */
function calculateHealth(signals: UnifiedSignal[], previousHealth?: HealthBreakdown): HealthBreakdown {
  if (signals.length === 0) {
    return {
      overall: 100,
      components: {
        content: 100,
        infrastructure: 100,
        cost: 100,
        quality: 100,
        revenue: 100,
      },
      trend: 'stable',
      lastUpdated: new Date(),
    };
  }

  // Calculate component scores (higher signal score = worse health, so invert)
  const componentScores = {
    content: [] as number[],
    infrastructure: [] as number[],
    cost: [] as number[],
    quality: [] as number[],
    revenue: [] as number[],
  };

  for (const signal of signals) {
    const inverted = 100 - signal.score; // High severity = low health

    switch (signal.source) {
      case 'content-decay':
      case 'data-integrity':
        componentScores.content.push(inverted);
        break;
      case 'backpressure':
      case 'incidents':
        componentScores.infrastructure.push(inverted);
        break;
      case 'cost-guards':
      case 'ai-audit':
        componentScores.cost.push(inverted);
        break;
      case 'content-confidence':
        componentScores.quality.push(inverted);
        break;
      case 'revenue' as any:
      case 'growth-recommendations':
        componentScores.revenue.push(inverted);
        break;
    }
  }

  const avgOrDefault = (arr: number[], def: number) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : def;

  const components = {
    content: avgOrDefault(componentScores.content, 100),
    infrastructure: avgOrDefault(componentScores.infrastructure, 100),
    cost: avgOrDefault(componentScores.cost, 100),
    quality: avgOrDefault(componentScores.quality, 100),
    revenue: avgOrDefault(componentScores.revenue, 100),
  };

  // Weight components for overall
  const weights = {
    content: 0.2,
    infrastructure: 0.25,
    cost: 0.15,
    quality: 0.2,
    revenue: 0.2,
  };

  const overall = Math.round(
    components.content * weights.content +
    components.infrastructure * weights.infrastructure +
    components.cost * weights.cost +
    components.quality * weights.quality +
    components.revenue * weights.revenue
  );

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (previousHealth) {
    const diff = overall - previousHealth.overall;
    if (diff > 5) trend = 'improving';
    else if (diff < -5) trend = 'declining';
  }

  return {
    overall,
    components,
    trend,
    lastUpdated: new Date(),
  };
}

/**
 * Generate action items from risks and opportunities
 */
function generateActions(
  risks: Risk[],
  opportunities: Opportunity[],
  maxActions: number
): ActionItem[] {
  const actions: ActionItem[] = [];

  // Actions from risks
  for (const risk of risks.slice(0, 3)) {
    const priority: ActionPriority = risk.score >= 80 ? 'critical' :
                                      risk.score >= 60 ? 'high' :
                                      risk.score >= 40 ? 'medium' : 'low';

    actions.push({
      id: generateActionId(),
      priority,
      title: `Address: ${risk.title}`,
      description: risk.recommendation,
      category: risk.category,
      linkedRiskId: risk.id,
      estimatedEffort: priority === 'critical' ? '1-2 days' :
                       priority === 'high' ? '2-3 days' : '3-5 days',
      deadline: priority === 'critical' ? 'This week' :
                priority === 'high' ? 'This sprint' : undefined,
    });
  }

  // Actions from opportunities (only high-value, low-effort)
  const quickWins = opportunities.filter(o => o.effort === 'low' && o.potentialValue >= 50);
  for (const opp of quickWins.slice(0, 2)) {
    actions.push({
      id: generateActionId(),
      priority: 'medium',
      title: `Quick Win: ${opp.title}`,
      description: opp.recommendation,
      category: opp.category,
      linkedOpportunityId: opp.id,
      estimatedEffort: '1-2 days',
    });
  }

  // Add one high-value opportunity even if high effort
  const highValue = opportunities.find(o => o.potentialValue >= 80);
  if (highValue && !actions.some(a => a.linkedOpportunityId === highValue.id)) {
    actions.push({
      id: generateActionId(),
      priority: 'medium',
      title: `Consider: ${highValue.title}`,
      description: highValue.recommendation,
      category: highValue.category,
      linkedOpportunityId: highValue.id,
      estimatedEffort: highValue.effort === 'low' ? '1-2 days' :
                       highValue.effort === 'medium' ? '3-5 days' : '1-2 weeks',
    });
  }

  // Sort by priority
  const priorityOrder: Record<ActionPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions.slice(0, maxActions);
}

/**
 * Generate executive summary
 */
export async function generateSummary(
  options: SummaryOptions = {},
  previousHealth?: HealthBreakdown
): Promise<ExecutiveSummary> {
  const {
    lookbackMs = 7 * 24 * 3600000, // 7 days default
    maxRisks = 5,
    maxOpportunities = 5,
    maxActions = 10,
  } = options;

  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - lookbackMs);

  // Gather data
  const registry = getSignalRegistry();
  const signals = registry.querySignals({ since: periodStart, limit: 1000 });

  // Run correlation analysis
  const { correlations, anomalies } = await runCorrelationAnalysis(lookbackMs);

  // Get risks and opportunities
  const topRisks = getTopRisks(maxRisks, lookbackMs);
  const topOpportunities = getTopOpportunities(maxOpportunities, lookbackMs);

  // Calculate health
  const healthScore = calculateHealth(signals, previousHealth);

  // Generate action items
  const weeklyActions = generateActions(topRisks, topOpportunities, maxActions);

  const summary: ExecutiveSummary = {
    id: generateSummaryId(),
    generatedAt: new Date(),
    periodStart,
    periodEnd,
    healthScore,
    topRisks,
    topOpportunities,
    weeklyActions,
    signalsAnalyzed: signals.length,
    anomaliesDetected: anomalies.length,
    correlationsFound: correlations.length,
  };

  logger.info('Executive summary generated', {
    signalsAnalyzed: signals.length,
    risks: topRisks.length,
    opportunities: topOpportunities.length,
    actions: weeklyActions.length,
    healthScore: healthScore.overall,
  });

  return summary;
}

/**
 * Generate quick health check (lighter than full summary)
 */
export function getQuickHealth(lookbackMs = 24 * 3600000): HealthBreakdown {
  const registry = getSignalRegistry();
  const since = new Date(Date.now() - lookbackMs);
  const signals = registry.querySignals({ since, limit: 500 });

  return calculateHealth(signals);
}
