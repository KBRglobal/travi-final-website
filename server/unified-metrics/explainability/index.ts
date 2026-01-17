/**
 * Explainability Layer
 *
 * Provides transparent explanations for why the system makes recommendations.
 * Every recommendation must be traceable to data and methodology.
 *
 * Principles:
 * - Every recommendation has a clear rationale
 * - All contributing factors are visible
 * - Confidence levels are always communicated
 * - Alternative options are presented when available
 */

import { log } from '../../lib/logger';
import { getMetricsRegistry, getMetricDefinition } from '../registry';
import type {
  RecommendationExplanation,
  ExplainabilityFactor,
  ActionRecommendation,
  MetricSignal,
} from '../registry/types';
import type { GrowthOpportunity } from '../opportunities';
import type { ContentPerformanceResult, PerformanceIssue, PerformanceOpportunity } from '../models/content-performance';
import type { FunnelAnalysis, FunnelInsight } from '../funnel';
import type { Anomaly } from '../anomaly';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Explainability] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) =>
    log.debug(`[Explainability] ${msg}`, data),
};

// =====================================================
// TYPES
// =====================================================

export interface ExplanationContext {
  source: 'performance' | 'funnel' | 'opportunity' | 'anomaly' | 'signal';
  entityType: 'content' | 'system' | 'campaign';
  entityId?: string;
  timestamp: Date;
}

export interface DetailedExplanation {
  id: string;
  context: ExplanationContext;

  // What is being explained
  title: string;
  summary: string;                // One-sentence explanation

  // The reasoning
  primaryReason: string;          // Main reason for this recommendation
  supportingReasons: string[];    // Additional supporting reasons
  dataEvidence: DataEvidence[];   // Data that supports this

  // Confidence
  confidence: number;             // 0-100
  confidenceFactors: Array<{
    factor: string;
    impact: 'increases' | 'decreases';
    weight: number;
  }>;

  // Impact
  expectedOutcome: string;
  riskAssessment: string;
  alternativeApproaches: string[];

  // Methodology
  methodology: string;            // How we arrived at this conclusion
  limitations: string[];          // Known limitations
  assumptions: string[];          // Assumptions made

  // Traceability
  dataSourcesUsed: string[];
  metricsAnalyzed: string[];
  timeRangeAnalyzed: {
    start: Date;
    end: Date;
  };
}

export interface DataEvidence {
  metric: string;
  metricName: string;
  value: number;
  benchmark?: number;
  comparison: 'above' | 'below' | 'at' | 'trending_up' | 'trending_down';
  significance: 'low' | 'medium' | 'high';
  explanation: string;
}

export interface WhyExplanation {
  question: string;               // "Why should I..."
  answer: string;                 // Direct answer
  because: string[];              // Supporting reasons
  evidence: DataEvidence[];       // Data backing it up
  whatIf: Array<{                 // "What if I don't?"
    scenario: string;
    outcome: string;
    probability: 'likely' | 'possible' | 'unlikely';
  }>;
}

// =====================================================
// EXPLANATION TEMPLATES
// =====================================================

const METHODOLOGY_DESCRIPTIONS: Record<string, string> = {
  performance_score: 'Content performance is calculated using a weighted model that combines engagement metrics (25%), SEO metrics (25%), AEO metrics (15%), quality metrics (20%), and revenue metrics (15%). Each component is normalized to a 0-100 scale based on industry benchmarks.',

  anomaly_detection: 'Anomalies are detected using statistical methods including Z-score analysis (identifying values more than 2-3 standard deviations from the mean), IQR analysis (values outside the interquartile range), and trend break detection (sudden changes in direction).',

  funnel_analysis: 'Funnel conversion rates are calculated by tracking unique sessions through each stage. Drop-off rates identify where users leave. Bottlenecks are stages with the highest relative drop-off compared to expected conversion rates.',

  opportunity_scoring: 'Opportunities are scored based on estimated impact (35%), confidence in our estimate (20%), effort required (25% - inverted, so easier = higher), and urgency (20%). This produces a priority score from 0-100.',

  trend_analysis: 'Trends are analyzed using linear regression to calculate slope (rate of change), comparing first-half vs second-half averages, and measuring volatility (standard deviation of period-over-period changes).',
};

const CONFIDENCE_EXPLANATIONS: Record<string, string> = {
  high: 'High confidence indicates strong data support with consistent patterns across multiple signals.',
  medium: 'Medium confidence indicates reasonable data support but some uncertainty remains.',
  low: 'Low confidence indicates limited data or conflicting signals. Treat as directional guidance.',
};

// =====================================================
// EXPLAINABILITY SERVICE
// =====================================================

export class ExplainabilityService {
  private static instance: ExplainabilityService | null = null;

  // Cache for generated explanations
  private explanations: Map<string, DetailedExplanation> = new Map();

  private constructor() {
    logger.info('Explainability Service initialized');
  }

  static getInstance(): ExplainabilityService {
    if (!ExplainabilityService.instance) {
      ExplainabilityService.instance = new ExplainabilityService();
    }
    return ExplainabilityService.instance;
  }

  static reset(): void {
    ExplainabilityService.instance = null;
  }

  // =====================================================
  // EXPLAIN CONTENT PERFORMANCE
  // =====================================================

  /**
   * Explain a content performance result
   */
  explainContentPerformance(
    performance: ContentPerformanceResult
  ): DetailedExplanation {
    const { scores, issues, opportunities, signals } = performance;

    // Build data evidence
    const evidence: DataEvidence[] = [];

    // Add engagement evidence
    if (signals.bounceRate > 50) {
      evidence.push({
        metric: 'engagement.bounce_rate',
        metricName: 'Bounce Rate',
        value: signals.bounceRate,
        benchmark: 50,
        comparison: 'above',
        significance: signals.bounceRate > 70 ? 'high' : 'medium',
        explanation: `Bounce rate of ${signals.bounceRate.toFixed(1)}% indicates visitors are leaving quickly`,
      });
    }

    if (signals.avgDwellTime < 60) {
      evidence.push({
        metric: 'engagement.dwell_time',
        metricName: 'Dwell Time',
        value: signals.avgDwellTime,
        benchmark: 60,
        comparison: 'below',
        significance: signals.avgDwellTime < 30 ? 'high' : 'medium',
        explanation: `Average dwell time of ${signals.avgDwellTime}s is below the 60s target`,
      });
    }

    // Add SEO evidence
    if (signals.searchCtr < 3) {
      evidence.push({
        metric: 'seo.ctr',
        metricName: 'Search CTR',
        value: signals.searchCtr,
        benchmark: 3,
        comparison: 'below',
        significance: 'high',
        explanation: `CTR of ${signals.searchCtr.toFixed(2)}% is below the 3% benchmark for good performance`,
      });
    }

    // Calculate confidence
    const dataPoints = [
      signals.pageViews > 0,
      signals.searchImpressions > 0,
      signals.contentFreshness < 365,
    ].filter(Boolean).length;

    const confidence = Math.min(100, 40 + dataPoints * 20);

    // Build explanation
    const explanation: DetailedExplanation = {
      id: `explain-perf-${performance.contentId}-${Date.now()}`,
      context: {
        source: 'performance',
        entityType: 'content',
        entityId: performance.contentId,
        timestamp: new Date(),
      },

      title: `Performance Score: ${scores.overall}/100 (Grade ${performance.grade})`,
      summary: this.generatePerformanceSummary(scores, performance.trend),

      primaryReason: this.getPrimaryReason(issues, scores),
      supportingReasons: issues.map(i => i.description),
      dataEvidence: evidence,

      confidence,
      confidenceFactors: [
        {
          factor: signals.pageViews > 100 ? 'Sufficient traffic data' : 'Limited traffic data',
          impact: signals.pageViews > 100 ? 'increases' : 'decreases',
          weight: 30,
        },
        {
          factor: signals.searchImpressions > 500 ? 'Strong search data' : 'Limited search data',
          impact: signals.searchImpressions > 500 ? 'increases' : 'decreases',
          weight: 25,
        },
        {
          factor: signals.contentFreshness < 180 ? 'Recent content' : 'Older content',
          impact: signals.contentFreshness < 180 ? 'increases' : 'decreases',
          weight: 15,
        },
      ],

      expectedOutcome: opportunities.length > 0
        ? `Addressing top opportunities could improve score by ${opportunities[0].potentialGain}+ points`
        : 'Content is performing well within expectations',
      riskAssessment: this.getRiskAssessment(issues),
      alternativeApproaches: opportunities.slice(0, 3).map(o => o.title),

      methodology: METHODOLOGY_DESCRIPTIONS.performance_score,
      limitations: [
        'Score is relative to historical data and may not reflect recent changes',
        'External factors (seasonality, algorithm updates) are not directly measured',
        'Revenue metrics depend on affiliate tracking completeness',
      ],
      assumptions: [
        'Benchmark values represent industry averages for travel content',
        'All data sources are accurate and complete',
        'User behavior patterns are consistent',
      ],

      dataSourcesUsed: ['Analytics', 'Search Console', 'Content Database'],
      metricsAnalyzed: [
        'engagement.page_views', 'engagement.bounce_rate', 'engagement.dwell_time',
        'seo.impressions', 'seo.ctr', 'seo.average_position',
        'aeo.citations', 'content.quality_score',
      ],
      timeRangeAnalyzed: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };

    this.explanations.set(explanation.id, explanation);
    return explanation;
  }

  /**
   * Explain why a specific issue was detected
   */
  explainIssue(issue: PerformanceIssue): WhyExplanation {
    return {
      question: `Why is "${issue.title}" flagged as an issue?`,
      answer: issue.description,
      because: [
        `Current value (${issue.currentValue}) is ${issue.severity} below target (${issue.targetValue})`,
        `This impacts overall content performance by approximately ${issue.impact} points`,
        ...(issue as any).recommendations.map((r: any) => r.description),
      ],
      evidence: [
        {
          metric: issue.metric,
          metricName: issue.title,
          value: issue.currentValue,
          benchmark: issue.targetValue,
          comparison: issue.currentValue < issue.targetValue ? 'below' : 'above',
          significance: issue.severity === 'critical' ? 'high' :
                       issue.severity === 'high' ? 'high' : 'medium',
          explanation: issue.description,
        },
      ],
      whatIf: [
        {
          scenario: 'Issue is not addressed',
          outcome: `Performance will likely remain at current level or decline further`,
          probability: 'likely',
        },
        {
          scenario: 'Issue is partially addressed',
          outcome: 'Moderate improvement expected, full potential not realized',
          probability: 'possible',
        },
        {
          scenario: 'Issue is fully addressed',
          outcome: `Potential score improvement of ${issue.impact}+ points`,
          probability: 'likely',
        },
      ],
    };
  }

  // =====================================================
  // EXPLAIN OPPORTUNITIES
  // =====================================================

  /**
   * Explain a growth opportunity
   */
  explainOpportunity(opportunity: GrowthOpportunity): DetailedExplanation {
    const evidence: DataEvidence[] = [];

    // Add evidence from estimated impact
    evidence.push({
      metric: opportunity.estimatedImpact.metric,
      metricName: opportunity.estimatedImpact.metric.split('.').pop() || '',
      value: opportunity.estimatedImpact.currentValue,
      benchmark: opportunity.estimatedImpact.projectedValue,
      comparison: 'below',
      significance: opportunity.priority === 'critical' ? 'high' :
                   opportunity.priority === 'high' ? 'high' : 'medium',
      explanation: `Current value can be improved with ${opportunity.effort} effort`,
    });

    const explanation: DetailedExplanation = {
      id: `explain-opp-${opportunity.id}`,
      context: {
        source: 'opportunity',
        entityType: opportunity.affectedEntities[0]?.type as any || 'system',
        entityId: opportunity.affectedEntities[0]?.id,
        timestamp: new Date(),
      },

      title: opportunity.title,
      summary: opportunity.description,

      primaryReason: opportunity.rationale,
      supportingReasons: opportunity.suggestedActions.slice(0, 3),
      dataEvidence: evidence,

      confidence: opportunity.estimatedImpact.confidence,
      confidenceFactors: [
        {
          factor: `Based on ${opportunity.relatedMetrics.length} related metrics`,
          impact: 'increases',
          weight: 40,
        },
        {
          factor: opportunity.automatable ? 'Can be automated' : 'Requires manual work',
          impact: 'increases',
          weight: 20,
        },
      ],

      expectedOutcome: `Potential score increase of ${opportunity.score} points`,
      riskAssessment: opportunity.effort === 'quick' ? 'Low risk, quick implementation' :
                     opportunity.effort === 'moderate' ? 'Moderate risk, requires planning' :
                     'Higher risk, significant investment required',
      alternativeApproaches: [],

      methodology: METHODOLOGY_DESCRIPTIONS.opportunity_scoring,
      limitations: [
        'Projected impact is estimated based on similar improvements',
        'Actual results may vary based on implementation quality',
        'External factors may affect outcomes',
      ],
      assumptions: [
        'Implementation will follow best practices',
        'No conflicting changes will occur',
        'Baseline metrics are accurate',
      ],

      dataSourcesUsed: opportunity.relatedMetrics.map(m => m.split('.')[0]),
      metricsAnalyzed: opportunity.relatedMetrics,
      timeRangeAnalyzed: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };

    this.explanations.set(explanation.id, explanation);
    return explanation;
  }

  // =====================================================
  // EXPLAIN ANOMALIES
  // =====================================================

  /**
   * Explain an anomaly detection
   */
  explainAnomaly(anomaly: Anomaly): DetailedExplanation {
    const evidence: DataEvidence[] = [
      {
        metric: anomaly.metricId,
        metricName: getMetricDefinition(anomaly.metricId)?.name || anomaly.metricId,
        value: anomaly.currentValue,
        benchmark: anomaly.expectedValue,
        comparison: anomaly.type === 'spike' ? 'above' : 'below',
        significance: anomaly.severity === 'critical' ? 'high' : 'medium',
        explanation: anomaly.description,
      },
    ];

    const explanation: DetailedExplanation = {
      id: `explain-anomaly-${anomaly.id}`,
      context: {
        source: 'anomaly',
        entityType: anomaly.entityType as any,
        entityId: anomaly.entityId,
        timestamp: anomaly.detectedAt,
      },

      title: anomaly.title,
      summary: anomaly.description,

      primaryReason: `Value of ${anomaly.currentValue.toFixed(2)} deviates ${anomaly.deviation.toFixed(1)}% from expected ${anomaly.expectedValue.toFixed(2)}`,
      supportingReasons: [
        `Detection method: ${anomaly.method}`,
        anomaly.zscore ? `Z-score: ${anomaly.zscore}` : '',
        `Statistical context: Mean ${anomaly.stats.mean}, StdDev ${anomaly.stats.stdDev}`,
      ].filter(Boolean),
      dataEvidence: evidence,

      confidence: anomaly.severity === 'critical' ? 90 :
                 anomaly.severity === 'warning' ? 75 : 60,
      confidenceFactors: [
        {
          factor: `Based on ${anomaly.stats.count} data points`,
          impact: anomaly.stats.count > 20 ? 'increases' : 'decreases',
          weight: 40,
        },
        {
          factor: `Deviation of ${Math.abs(anomaly.deviation).toFixed(1)}%`,
          impact: Math.abs(anomaly.deviation) > 50 ? 'increases' : 'decreases',
          weight: 30,
        },
      ],

      expectedOutcome: 'Investigation recommended to identify root cause',
      riskAssessment: anomaly.severity === 'critical'
        ? 'Critical: Immediate investigation required'
        : 'Monitor for continued anomalous behavior',
      alternativeApproaches: [
        'Wait for additional data points to confirm pattern',
        'Check for data quality issues',
        'Review for external factors (seasonality, campaigns)',
      ],

      methodology: METHODOLOGY_DESCRIPTIONS.anomaly_detection,
      limitations: [
        'Statistical anomalies may not indicate actual problems',
        'Seasonal patterns may cause false positives',
        'Limited historical data reduces accuracy',
      ],
      assumptions: [
        'Data is accurate and complete',
        'Normal distribution approximation is valid',
        'No known external events during analysis period',
      ],

      dataSourcesUsed: ['Metrics Registry'],
      metricsAnalyzed: [anomaly.metricId],
      timeRangeAnalyzed: {
        start: anomaly.windowStart,
        end: anomaly.windowEnd,
      },
    };

    this.explanations.set(explanation.id, explanation);
    return explanation;
  }

  // =====================================================
  // EXPLAIN FUNNEL INSIGHTS
  // =====================================================

  /**
   * Explain a funnel analysis
   */
  explainFunnelAnalysis(analysis: FunnelAnalysis): DetailedExplanation {
    const evidence: DataEvidence[] = analysis.stages.map(stage => ({
      metric: `funnel.${analysis.funnelId}.${stage.stageId}`,
      metricName: stage.name,
      value: stage.conversionRate,
      benchmark: 100,
      comparison: stage.conversionRate < 50 ? 'below' : 'at',
      significance: stage.dropOffRate > 50 ? 'high' : 'medium',
      explanation: `${stage.count} users reached this stage (${stage.conversionRate.toFixed(1)}% from previous)`,
    }));

    const explanation: DetailedExplanation = {
      id: `explain-funnel-${analysis.funnelId}-${Date.now()}`,
      context: {
        source: 'funnel',
        entityType: 'system',
        timestamp: new Date(),
      },

      title: `${analysis.name} Analysis`,
      summary: `Overall conversion rate: ${analysis.overallConversionRate.toFixed(2)}% (${analysis.totalConversions} of ${analysis.totalEntries})`,

      primaryReason: analysis.bottleneck
        ? `Biggest drop-off at "${analysis.bottleneck.stageName}" (${analysis.bottleneck.dropOffRate.toFixed(1)}% lost)`
        : 'No significant bottleneck detected',
      supportingReasons: analysis.insights.map(i => i.description),
      dataEvidence: evidence,

      confidence: analysis.totalEntries > 100 ? 85 : 60,
      confidenceFactors: [
        {
          factor: `Based on ${analysis.totalEntries} funnel entries`,
          impact: analysis.totalEntries > 100 ? 'increases' : 'decreases',
          weight: 50,
        },
        {
          factor: `${analysis.stages.length} stages analyzed`,
          impact: 'increases',
          weight: 20,
        },
      ],

      expectedOutcome: analysis.bottleneck
        ? `Fixing bottleneck could improve conversion by ${(analysis.bottleneck.dropOffRate * 0.3).toFixed(1)}%`
        : 'Funnel is performing within expected parameters',
      riskAssessment: analysis.overallConversionRate < 1
        ? 'Low conversion rate requires attention'
        : 'Conversion rate is acceptable',
      alternativeApproaches: analysis.insights
        .filter(i => i.suggestedAction)
        .map(i => i.suggestedAction!),

      methodology: METHODOLOGY_DESCRIPTIONS.funnel_analysis,
      limitations: [
        'Funnel analysis is session-based and may not track cross-device journeys',
        'Attribution to specific changes is difficult',
      ],
      assumptions: [
        'Session tracking is accurate',
        'Funnel stages are correctly defined',
      ],

      dataSourcesUsed: ['Analytics', 'Session Tracking'],
      metricsAnalyzed: analysis.stages.map(s => `funnel.${analysis.funnelId}.${s.stageId}`),
      timeRangeAnalyzed: {
        start: analysis.period.start,
        end: analysis.period.end,
      },
    };

    this.explanations.set(explanation.id, explanation);
    return explanation;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private generatePerformanceSummary(
    scores: ContentPerformanceResult['scores'],
    trend: ContentPerformanceResult['trend']
  ): string {
    const weakest = Object.entries(scores)
      .filter(([key]) => key !== 'overall')
      .sort((a, b) => a[1] - b[1])[0];

    const trendText = trend === 'improving' ? 'trending upward' :
                     trend === 'declining' ? 'trending downward' : 'stable';

    return `Overall score of ${scores.overall}/100 is ${trendText}. ` +
           `${weakest[0].charAt(0).toUpperCase() + weakest[0].slice(1)} is the weakest area at ${weakest[1]}/100.`;
  }

  private getPrimaryReason(
    issues: PerformanceIssue[],
    scores: ContentPerformanceResult['scores']
  ): string {
    if (issues.length === 0) {
      return 'Content is performing well across all measured dimensions.';
    }

    const critical = issues.find(i => i.severity === 'critical');
    if (critical) {
      return critical.description;
    }

    const weakest = Object.entries(scores)
      .filter(([key]) => key !== 'overall')
      .sort((a, b) => a[1] - b[1])[0];

    return `${weakest[0].charAt(0).toUpperCase() + weakest[0].slice(1)} performance (${weakest[1]}/100) is the primary area needing improvement.`;
  }

  private getRiskAssessment(issues: PerformanceIssue[]): string {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;

    if (criticalCount > 0) {
      return `${criticalCount} critical issue(s) require immediate attention`;
    }
    if (highCount > 2) {
      return 'Multiple high-severity issues may compound to impact performance';
    }
    if (issues.length > 0) {
      return 'Issues identified but none pose immediate risk';
    }
    return 'No significant risks identified';
  }

  // =====================================================
  // RETRIEVAL
  // =====================================================

  getExplanation(id: string): DetailedExplanation | undefined {
    return this.explanations.get(id);
  }

  getAllExplanations(): DetailedExplanation[] {
    return Array.from(this.explanations.values());
  }

  getConfidenceExplanation(level: 'high' | 'medium' | 'low'): string {
    return CONFIDENCE_EXPLANATIONS[level];
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

export function getExplainabilityService(): ExplainabilityService {
  return ExplainabilityService.getInstance();
}

export function explainPerformance(
  performance: ContentPerformanceResult
): DetailedExplanation {
  return getExplainabilityService().explainContentPerformance(performance);
}

export function explainOpportunity(
  opportunity: GrowthOpportunity
): DetailedExplanation {
  return getExplainabilityService().explainOpportunity(opportunity);
}

export function explainAnomaly(anomaly: Anomaly): DetailedExplanation {
  return getExplainabilityService().explainAnomaly(anomaly);
}

export function explainFunnel(analysis: FunnelAnalysis): DetailedExplanation {
  return getExplainabilityService().explainFunnelAnalysis(analysis);
}
