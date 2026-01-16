/**
 * Traffic Forecast Model
 *
 * Predicts traffic delta based on proposed changes.
 */

import type {
  ForecastInput,
  DimensionForecast,
  ForecastFactor,
  ConfidenceInterval,
  ModelContext,
} from '../types';

// ============================================================================
// TRAFFIC IMPACT WEIGHTS
// ============================================================================

interface TrafficImpactRule {
  changeType: string;
  baseImpact: number;
  confidenceBase: number;
  factors: (input: ForecastInput) => ForecastFactor[];
}

const TRAFFIC_IMPACT_RULES: TrafficImpactRule[] = [
  {
    changeType: 'title_change',
    baseImpact: 0.05,
    confidenceBase: 0.7,
    factors: (input) => [
      {
        name: 'Title optimization',
        impact: 0.05,
        direction: 'positive',
        weight: 0.4,
        explanation: 'Optimized titles typically improve CTR by 3-8%',
      },
      {
        name: 'Keyword alignment',
        impact: 0.03,
        direction: 'positive',
        weight: 0.3,
        explanation: 'Better keyword targeting can improve search visibility',
      },
    ],
  },
  {
    changeType: 'content_update',
    baseImpact: 0.08,
    confidenceBase: 0.65,
    factors: () => [
      {
        name: 'Content freshness',
        impact: 0.05,
        direction: 'positive',
        weight: 0.35,
        explanation: 'Updated content signals relevance to search engines',
      },
      {
        name: 'Expanded coverage',
        impact: 0.04,
        direction: 'positive',
        weight: 0.3,
        explanation: 'More comprehensive content can capture more queries',
      },
    ],
  },
  {
    changeType: 'structure_change',
    baseImpact: 0.03,
    confidenceBase: 0.6,
    factors: () => [
      {
        name: 'Improved readability',
        impact: 0.02,
        direction: 'positive',
        weight: 0.25,
        explanation: 'Better structure improves user engagement metrics',
      },
    ],
  },
  {
    changeType: 'aeo_optimization',
    baseImpact: 0.12,
    confidenceBase: 0.55,
    factors: () => [
      {
        name: 'AI search visibility',
        impact: 0.1,
        direction: 'positive',
        weight: 0.5,
        explanation: 'AEO optimization improves visibility in AI search results',
      },
      {
        name: 'Featured snippet potential',
        impact: 0.05,
        direction: 'positive',
        weight: 0.3,
        explanation: 'Structured answers increase featured snippet chances',
      },
    ],
  },
  {
    changeType: 'url_change',
    baseImpact: -0.15,
    confidenceBase: 0.8,
    factors: () => [
      {
        name: 'Redirect overhead',
        impact: -0.05,
        direction: 'negative',
        weight: 0.4,
        explanation: 'URL changes require redirects which may lose some link equity',
      },
      {
        name: 'Re-indexing delay',
        impact: -0.1,
        direction: 'negative',
        weight: 0.5,
        explanation: 'Search engines need time to discover and re-index new URLs',
      },
    ],
  },
  {
    changeType: 'content_removal',
    baseImpact: -0.25,
    confidenceBase: 0.85,
    factors: () => [
      {
        name: 'Content loss',
        impact: -0.2,
        direction: 'negative',
        weight: 0.6,
        explanation: 'Removing content directly reduces indexable pages',
      },
    ],
  },
];

// ============================================================================
// TRAFFIC MODEL
// ============================================================================

export class TrafficModel {
  private seasonalFactors: Record<string, number>;

  constructor() {
    // Default seasonal factors (1.0 = normal)
    this.seasonalFactors = {
      low: 0.85,
      normal: 1.0,
      peak: 1.2,
    };
  }

  /**
   * Predict traffic impact
   */
  predict(input: ForecastInput, context: ModelContext = {}): DimensionForecast {
    const currentTraffic = input.context.currentTraffic || 1000;
    const factors: ForecastFactor[] = [];
    let totalImpact = 0;
    let confidenceBase = 0.6;
    let factorCount = 0;

    // Analyze each change
    for (const change of input.changes) {
      const rule = this.findMatchingRule(change.type);
      if (rule) {
        totalImpact += rule.baseImpact;
        confidenceBase = (confidenceBase + rule.confidenceBase) / 2;
        factors.push(...rule.factors(input));
        factorCount++;
      }
    }

    // Normalize impact if many changes
    if (factorCount > 2) {
      totalImpact *= 0.8; // Diminishing returns
      confidenceBase *= 0.9;
    }

    // Apply seasonal factor
    const seasonality = input.context.seasonality || 'normal';
    const seasonalFactor = this.seasonalFactors[seasonality] || 1.0;

    // Apply trend factor
    let trendFactor = 1.0;
    if (input.context.trafficTrend === 'increasing') {
      trendFactor = 1.1;
      factors.push({
        name: 'Positive traffic trend',
        impact: 0.05,
        direction: 'positive',
        weight: 0.2,
        explanation: 'Current upward trend provides momentum',
      });
    } else if (input.context.trafficTrend === 'decreasing') {
      trendFactor = 0.9;
      factors.push({
        name: 'Negative traffic trend',
        impact: -0.05,
        direction: 'negative',
        weight: 0.2,
        explanation: 'Current downward trend may dampen improvements',
      });
    }

    // Calculate predicted value
    const predictedDelta = totalImpact * seasonalFactor * trendFactor;
    const predictedValue = currentTraffic * (1 + predictedDelta);

    // Calculate confidence interval
    const confidence = this.calculateConfidence(confidenceBase, factorCount, context);

    return {
      dimension: 'traffic',
      currentValue: currentTraffic,
      predictedValue: Math.round(predictedValue),
      delta: Math.round(predictedValue - currentTraffic),
      deltaPercent: Math.round(predictedDelta * 10000) / 100,
      confidence,
      factors,
    };
  }

  /**
   * Find matching impact rule
   */
  private findMatchingRule(changeType: string): TrafficImpactRule | undefined {
    const normalizedType = changeType.toLowerCase().replace(/[^a-z]/g, '_');

    return TRAFFIC_IMPACT_RULES.find((rule) =>
      normalizedType.includes(rule.changeType) ||
      rule.changeType.includes(normalizedType)
    );
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidence(
    baseConfidence: number,
    factorCount: number,
    context: ModelContext
  ): ConfidenceInterval {
    // Confidence decreases with uncertainty
    let level = baseConfidence;

    // More historical data = higher confidence
    if (context.historicalData && context.historicalData.length > 30) {
      level = Math.min(0.95, level + 0.1);
    }

    // Many changes = lower confidence
    if (factorCount > 3) {
      level = Math.max(0.3, level - 0.1);
    }

    // Calculate interval width
    const intervalWidth = (1 - level) * 0.5;

    return {
      level,
      low: 1 - intervalWidth,
      high: 1 + intervalWidth,
    };
  }
}

export function createTrafficModel(): TrafficModel {
  return new TrafficModel();
}
