/**
 * Revenue Forecast Model
 *
 * Predicts revenue delta based on traffic and conversion changes.
 */

import type {
  ForecastInput,
  DimensionForecast,
  ForecastFactor,
  ConfidenceInterval,
  ModelContext,
} from '../types';

// ============================================================================
// REVENUE DRIVERS
// ============================================================================

interface RevenueDriver {
  name: string;
  calculate: (input: ForecastInput, trafficDelta: number, conversionDelta: number) => {
    impact: number;
    factor: ForecastFactor;
  };
}

const REVENUE_DRIVERS: RevenueDriver[] = [
  {
    name: 'traffic_volume',
    calculate: (input, trafficDelta) => {
      const impact = trafficDelta * 0.8; // Traffic directly affects revenue
      return {
        impact,
        factor: {
          name: 'Traffic volume change',
          impact,
          direction: impact >= 0 ? 'positive' : 'negative',
          weight: 0.4,
          explanation: `${(trafficDelta * 100).toFixed(1)}% traffic change translates to ${(impact * 100).toFixed(1)}% revenue impact`,
        },
      };
    },
  },
  {
    name: 'conversion_rate',
    calculate: (input, _, conversionDelta) => {
      const impact = conversionDelta * 1.2; // Conversion has outsized impact
      return {
        impact,
        factor: {
          name: 'Conversion rate change',
          impact,
          direction: impact >= 0 ? 'positive' : 'negative',
          weight: 0.35,
          explanation: `${(conversionDelta * 100).toFixed(1)}% conversion change has ${(impact * 100).toFixed(1)}% revenue impact`,
        },
      };
    },
  },
  {
    name: 'aov_effect',
    calculate: (input) => {
      // Changes that improve engagement often increase AOV
      const hasEngagementChanges = input.changes.some((c) =>
        ['content_update', 'structure_change', 'cta_optimization'].includes(c.type)
      );

      if (hasEngagementChanges) {
        return {
          impact: 0.03,
          factor: {
            name: 'Average order value effect',
            impact: 0.03,
            direction: 'positive',
            weight: 0.15,
            explanation: 'Improved engagement typically increases average order value by 2-5%',
          },
        };
      }

      return {
        impact: 0,
        factor: {
          name: 'Average order value',
          impact: 0,
          direction: 'neutral',
          weight: 0.15,
          explanation: 'No significant AOV impact expected',
        },
      };
    },
  },
  {
    name: 'monetization_potential',
    calculate: (input) => {
      const hasMonetizationChanges = input.changes.some((c) =>
        ['add_monetization', 'affiliate_optimization', 'ad_placement'].includes(c.type)
      );

      if (hasMonetizationChanges) {
        return {
          impact: 0.1,
          factor: {
            name: 'Direct monetization improvement',
            impact: 0.1,
            direction: 'positive',
            weight: 0.1,
            explanation: 'Monetization changes can improve revenue per visit by 8-15%',
          },
        };
      }

      return {
        impact: 0,
        factor: {
          name: 'Monetization',
          impact: 0,
          direction: 'neutral',
          weight: 0.1,
          explanation: 'No direct monetization changes',
        },
      };
    },
  },
];

// ============================================================================
// REVENUE MODEL
// ============================================================================

export class RevenueModel {
  /**
   * Predict revenue impact
   */
  predict(
    input: ForecastInput,
    trafficForecast: DimensionForecast,
    conversionForecast: DimensionForecast,
    context: ModelContext = {}
  ): DimensionForecast {
    const currentRevenue = input.context.currentRevenue || 10000;
    const factors: ForecastFactor[] = [];

    // Calculate traffic delta percentage
    const trafficDelta = trafficForecast.deltaPercent / 100;

    // Calculate conversion delta percentage
    const conversionDelta = conversionForecast.deltaPercent / 100;

    // Calculate revenue impact from all drivers
    let totalImpact = 0;

    for (const driver of REVENUE_DRIVERS) {
      const result = driver.calculate(input, trafficDelta, conversionDelta);
      totalImpact += result.impact;
      factors.push(result.factor);
    }

    // Apply compound effect (traffic * conversion)
    const compoundEffect = trafficDelta * conversionDelta;
    if (Math.abs(compoundEffect) > 0.001) {
      totalImpact += compoundEffect;
      factors.push({
        name: 'Compound effect',
        impact: compoundEffect,
        direction: compoundEffect >= 0 ? 'positive' : 'negative',
        weight: 0.1,
        explanation: 'Combined effect of traffic and conversion improvements',
      });
    }

    // Calculate predicted value
    const predictedValue = currentRevenue * (1 + totalImpact);

    // Calculate confidence (lower than traffic/conversion due to compound uncertainty)
    const combinedConfidence = Math.min(
      trafficForecast.confidence.level,
      conversionForecast.confidence.level
    ) * 0.9;

    const confidence = this.calculateConfidence(combinedConfidence, context);

    return {
      dimension: 'revenue',
      currentValue: currentRevenue,
      predictedValue: Math.round(predictedValue * 100) / 100,
      delta: Math.round((predictedValue - currentRevenue) * 100) / 100,
      deltaPercent: Math.round(totalImpact * 10000) / 100,
      confidence,
      factors,
    };
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidence(
    baseConfidence: number,
    context: ModelContext
  ): ConfidenceInterval {
    let level = baseConfidence;

    // Historical revenue data increases confidence
    if (context.historicalData) {
      const revenueData = context.historicalData.filter((d) => d.metric === 'revenue');
      if (revenueData.length > 30) {
        level = Math.min(0.9, level + 0.1);
      }
    }

    // Calculate interval width based on confidence
    const intervalWidth = (1 - level) * 0.6; // Revenue has wider intervals

    return {
      level,
      low: 1 - intervalWidth,
      high: 1 + intervalWidth,
    };
  }
}

export function createRevenueModel(): RevenueModel {
  return new RevenueModel();
}
