/**
 * Enterprise Intelligence Hub - Opportunity Detection
 *
 * Deterministic opportunity identification from signals.
 */

import { log } from '../../lib/logger';
import { getSignalRegistry } from '../signals/registry';
import { getStrongCorrelations } from '../correlation';
import type { Opportunity, OpportunityCategory } from './types';
import type { UnifiedSignal } from '../signals/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Opportunities] ${msg}`, data),
};

/**
 * Generate unique opportunity ID
 */
function generateOpportunityId(): string {
  return `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Opportunity pattern definitions
 */
interface OpportunityPattern {
  id: string;
  category: OpportunityCategory;
  title: string;
  description: (signals: UnifiedSignal[]) => string;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
  check: (signals: UnifiedSignal[]) => { matches: boolean; value: number; sources: string[] };
}

const OPPORTUNITY_PATTERNS: OpportunityPattern[] = [
  {
    id: 'growth_from_quality',
    category: 'growth',
    title: 'Growth Opportunity from High-Quality Content',
    description: (signals) => {
      const count = signals.length;
      return `${count} content items showing strong quality signals. Consider expanding these topics.`;
    },
    recommendation: 'Identify top-performing content patterns and replicate for growth.',
    effort: 'medium',
    check: (signals) => {
      const highQuality = signals.filter(
        s => s.source === 'content-confidence' && s.score >= 80
      );
      return {
        matches: highQuality.length >= 3,
        value: Math.min(100, highQuality.length * 15),
        sources: ['content-confidence'],
      };
    },
  },
  {
    id: 'cost_optimization',
    category: 'cost-savings',
    title: 'AI Cost Optimization Available',
    description: (signals) => {
      const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;
      return `AI usage patterns suggest ${Math.round(100 - avgScore)}% potential cost reduction.`;
    },
    recommendation: 'Review AI provider usage. Consider caching, batching, or provider switching.',
    effort: 'low',
    check: (signals) => {
      const costSignals = signals.filter(s => s.source === 'cost-guards');
      if (costSignals.length < 2) return { matches: false, value: 0, sources: [] };

      // Lower cost scores = more room for optimization
      const avgScore = costSignals.reduce((sum, s) => sum + s.score, 0) / costSignals.length;
      return {
        matches: avgScore < 70,
        value: Math.min(100, (100 - avgScore) + 20),
        sources: ['cost-guards'],
      };
    },
  },
  {
    id: 'automation_potential',
    category: 'automation',
    title: 'Automation Opportunity Detected',
    description: () => 'Repeated manual patterns detected. Automation could reduce overhead.',
    recommendation: 'Review repetitive tasks for automation candidates.',
    effort: 'high',
    check: (signals) => {
      // High volume of similar signals suggests automation opportunity
      const bySource = new Map<string, number>();
      for (const signal of signals) {
        bySource.set(signal.source, (bySource.get(signal.source) || 0) + 1);
      }

      const highVolumeSources = Array.from(bySource.entries())
        .filter(([_, count]) => count >= 20)
        .map(([source]) => source);

      return {
        matches: highVolumeSources.length >= 2,
        value: Math.min(100, highVolumeSources.length * 25),
        sources: highVolumeSources,
      };
    },
  },
  {
    id: 'quality_quick_wins',
    category: 'quality-improvement',
    title: 'Quick Quality Wins Available',
    description: (signals) => {
      const count = signals.filter(s => s.score >= 40 && s.score < 70).length;
      return `${count} items near quality threshold. Small improvements could push them over.`;
    },
    recommendation: 'Focus on near-threshold content for quick quality improvements.',
    effort: 'low',
    check: (signals) => {
      const nearThreshold = signals.filter(
        s => s.source === 'content-confidence' && s.score >= 40 && s.score < 70
      );
      return {
        matches: nearThreshold.length >= 5,
        value: Math.min(100, nearThreshold.length * 10),
        sources: ['content-confidence'],
      };
    },
  },
  {
    id: 'infrastructure_efficiency',
    category: 'optimization',
    title: 'Infrastructure Efficiency Gains',
    description: () => 'System resources showing optimization potential.',
    recommendation: 'Review backpressure patterns and optimize resource allocation.',
    effort: 'medium',
    check: (signals) => {
      const infraSignals = signals.filter(s => s.source === 'backpressure');
      if (infraSignals.length < 3) return { matches: false, value: 0, sources: [] };

      // Moderate backpressure = optimization possible
      const avgScore = infraSignals.reduce((sum, s) => sum + s.score, 0) / infraSignals.length;
      return {
        matches: avgScore >= 30 && avgScore < 70,
        value: Math.min(100, 50 + (70 - avgScore)),
        sources: ['backpressure'],
      };
    },
  },
];

/**
 * Detect opportunities from signals
 */
export function detectOpportunities(lookbackMs = 7 * 24 * 3600000): Opportunity[] {
  const registry = getSignalRegistry();
  const since = new Date(Date.now() - lookbackMs);
  const signals = registry.querySignals({ since, limit: 1000 });

  if (signals.length === 0) {
    return [];
  }

  const opportunities: Opportunity[] = [];

  for (const pattern of OPPORTUNITY_PATTERNS) {
    const result = pattern.check(signals);

    if (result.matches) {
      opportunities.push({
        id: generateOpportunityId(),
        category: pattern.category,
        title: pattern.title,
        description: pattern.description(signals),
        potentialValue: result.value,
        effort: pattern.effort,
        signalSources: result.sources,
        detectedAt: new Date(),
        recommendation: pattern.recommendation,
      });
    }
  }

  // Check correlations for additional opportunities
  const correlations = getStrongCorrelations(70);
  for (const correlation of correlations) {
    if (correlation.direction === 'positive' && correlation.strength >= 80) {
      opportunities.push({
        id: generateOpportunityId(),
        category: 'optimization',
        title: `Leverage ${correlation.signalA.source} - ${correlation.signalB.source} Correlation`,
        description: correlation.explanation,
        potentialValue: Math.round(correlation.strength * 0.8),
        effort: 'medium',
        signalSources: [correlation.signalA.source, correlation.signalB.source],
        detectedAt: new Date(),
        recommendation: `This strong correlation can be used to predict and optimize outcomes.`,
      });
    }
  }

  // Sort by value descending
  opportunities.sort((a, b) => b.potentialValue - a.potentialValue);

  logger.info('Opportunity detection complete', {
    signalsAnalyzed: signals.length,
    opportunitiesFound: opportunities.length,
  });

  return opportunities;
}

/**
 * Get top N opportunities
 */
export function getTopOpportunities(n = 5, lookbackMs?: number): Opportunity[] {
  return detectOpportunities(lookbackMs).slice(0, n);
}

/**
 * Get quick wins (low effort, high value)
 */
export function getQuickWins(lookbackMs?: number): Opportunity[] {
  return detectOpportunities(lookbackMs)
    .filter(o => o.effort === 'low' && o.potentialValue >= 50)
    .slice(0, 5);
}
