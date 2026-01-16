/**
 * Enterprise Intelligence Hub - Risk Scoring
 *
 * Deterministic risk scoring from signals.
 */

import { log } from '../../lib/logger';
import { getSignalRegistry } from '../signals/registry';
import { getActiveAnomalies, getStrongCorrelations } from '../correlation';
import type { Risk, RiskCategory } from './types';
import type { UnifiedSignal } from '../signals/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[RiskScoring] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[RiskScoring] ${msg}`, data),
};

/**
 * Generate unique risk ID
 */
function generateRiskId(): string {
  return `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Map signal source to risk category
 */
function sourceToCategory(source: string): RiskCategory {
  const categoryMap: Record<string, RiskCategory> = {
    'revenue': 'revenue',
    'cost-guards': 'cost',
    'content-decay': 'content',
    'content-confidence': 'quality',
    'data-integrity': 'content',
    'backpressure': 'infrastructure',
    'ai-audit': 'cost',
    'incidents': 'infrastructure',
    'search-zero': 'content',
  };

  return categoryMap[source] || 'infrastructure';
}

/**
 * Generate risk title from signals
 */
function generateRiskTitle(category: RiskCategory, signals: UnifiedSignal[]): string {
  const titles: Record<RiskCategory, string> = {
    revenue: 'Revenue Impact Detected',
    content: 'Content Quality Degradation',
    infrastructure: 'Infrastructure Stability Concern',
    cost: 'Cost Overrun Risk',
    quality: 'Quality Standards Below Threshold',
    compliance: 'Compliance Gap Identified',
    security: 'Security Posture Weakened',
  };

  const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;
  const severity = avgScore >= 80 ? 'Critical' : avgScore >= 60 ? 'High' : 'Moderate';

  return `${severity} ${titles[category]}`;
}

/**
 * Generate risk description
 */
function generateDescription(category: RiskCategory, signals: UnifiedSignal[]): string {
  const count = signals.length;
  const avgScore = Math.round(signals.reduce((sum, s) => sum + s.score, 0) / signals.length);
  const sources = [...new Set(signals.map(s => s.source))].join(', ');

  return `${count} signals detected from ${sources} with average severity score of ${avgScore}/100. ` +
         `This ${category} risk requires attention.`;
}

/**
 * Generate impact statement
 */
function generateImpact(category: RiskCategory, score: number): string {
  const impacts: Record<RiskCategory, (score: number) => string> = {
    revenue: (s) => s >= 70
      ? 'Potential significant revenue loss if not addressed'
      : 'May impact revenue growth trajectory',
    content: (s) => s >= 70
      ? 'Content quality degradation affecting user experience'
      : 'Content issues may accumulate over time',
    infrastructure: (s) => s >= 70
      ? 'System stability at risk, potential outages'
      : 'Infrastructure inefficiencies may compound',
    cost: (s) => s >= 70
      ? 'Budget overruns likely without intervention'
      : 'Costs trending above optimal levels',
    quality: (s) => s >= 70
      ? 'Quality standards not being met consistently'
      : 'Quality metrics showing decline',
    compliance: (s) => s >= 70
      ? 'Compliance violations possible'
      : 'Compliance gaps may widen',
    security: (s) => s >= 70
      ? 'Security posture compromised'
      : 'Security vulnerabilities may increase',
  };

  return impacts[category](score);
}

/**
 * Generate recommendation
 */
function generateRecommendation(category: RiskCategory, signals: UnifiedSignal[]): string {
  const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;
  const urgent = avgScore >= 70;

  const recs: Record<RiskCategory, { urgent: string; normal: string }> = {
    revenue: {
      urgent: 'Investigate revenue-impacting issues immediately. Check entity availability and content quality.',
      normal: 'Review revenue signals and monitor for changes.',
    },
    content: {
      urgent: 'Audit content quality. Review decay signals and regeneration needs.',
      normal: 'Schedule content quality review.',
    },
    infrastructure: {
      urgent: 'Check system health. Review backpressure and incident logs.',
      normal: 'Monitor infrastructure metrics.',
    },
    cost: {
      urgent: 'Review AI usage and cost guards. Consider rate limiting adjustments.',
      normal: 'Track cost trends over the coming week.',
    },
    quality: {
      urgent: 'Implement quality improvements. Review failing quality checks.',
      normal: 'Monitor quality metrics.',
    },
    compliance: {
      urgent: 'Address compliance gaps immediately.',
      normal: 'Review compliance status.',
    },
    security: {
      urgent: 'Security review required. Check access logs and permissions.',
      normal: 'Continue security monitoring.',
    },
  };

  return urgent ? recs[category].urgent : recs[category].normal;
}

/**
 * Score signals into risks
 */
export function scoreRisks(lookbackMs = 7 * 24 * 3600000): Risk[] {
  const registry = getSignalRegistry();
  const since = new Date(Date.now() - lookbackMs);
  const signals = registry.querySignals({ since, limit: 1000 });

  if (signals.length === 0) {
    return [];
  }

  // Group by category
  const byCategory = new Map<RiskCategory, UnifiedSignal[]>();
  for (const signal of signals) {
    const category = sourceToCategory(signal.source);
    const existing = byCategory.get(category) || [];
    existing.push(signal);
    byCategory.set(category, existing);
  }

  const risks: Risk[] = [];

  for (const [category, categorySignals] of byCategory.entries()) {
    // Only create risk if signals indicate issues
    const highSeverity = categorySignals.filter(s => s.severity === 'high' || s.severity === 'critical');
    if (highSeverity.length === 0 && categorySignals.length < 5) {
      continue;
    }

    // Calculate risk score
    const avgScore = categorySignals.reduce((sum, s) => sum + s.score, 0) / categorySignals.length;
    const severityBonus = highSeverity.length * 5;
    const volumeBonus = Math.min(20, categorySignals.length);
    const score = Math.min(100, Math.round(avgScore + severityBonus + volumeBonus));

    // Only include if score is significant
    if (score < 30) continue;

    const sources = [...new Set(categorySignals.map(s => s.source))];

    risks.push({
      id: generateRiskId(),
      category,
      title: generateRiskTitle(category, categorySignals),
      description: generateDescription(category, categorySignals),
      score,
      impact: generateImpact(category, score),
      signalSources: sources,
      detectedAt: new Date(),
      recommendation: generateRecommendation(category, categorySignals),
    });
  }

  // Factor in anomalies
  const anomalies = getActiveAnomalies();
  for (const anomaly of anomalies) {
    const category = sourceToCategory(anomaly.signalSource);
    const existingRisk = risks.find(r => r.category === category);

    if (existingRisk) {
      // Boost existing risk score
      const anomalyBoost = anomaly.severity === 'extreme' ? 20 :
                           anomaly.severity === 'major' ? 15 :
                           anomaly.severity === 'moderate' ? 10 : 5;
      existingRisk.score = Math.min(100, existingRisk.score + anomalyBoost);
    } else {
      // Create new risk from anomaly
      const score = anomaly.severity === 'extreme' ? 90 :
                    anomaly.severity === 'major' ? 75 :
                    anomaly.severity === 'moderate' ? 55 : 40;

      risks.push({
        id: generateRiskId(),
        category,
        title: `Anomaly Detected in ${anomaly.signalSource}`,
        description: anomaly.explanation,
        score,
        impact: `Unusual behavior detected: ${anomaly.deviation}σ deviation from expected values`,
        signalSources: [anomaly.signalSource],
        detectedAt: anomaly.detectedAt,
        recommendation: `Investigate anomaly in ${anomaly.signalSource}. Expected ${anomaly.expectedValue}, got ${anomaly.actualValue}.`,
      });
    }
  }

  // Sort by score descending
  risks.sort((a, b) => b.score - a.score);

  logger.info('Risk scoring complete', {
    signalsAnalyzed: signals.length,
    risksIdentified: risks.length,
  });

  return risks;
}

/**
 * Get top N risks
 */
export function getTopRisks(n = 5, lookbackMs?: number): Risk[] {
  return scoreRisks(lookbackMs).slice(0, n);
}
