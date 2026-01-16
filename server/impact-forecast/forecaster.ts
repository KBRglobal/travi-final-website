/**
 * Impact Forecaster
 *
 * Main forecasting engine that orchestrates all models.
 */

import type {
  ForecastInput,
  Forecast,
  ForecastExplanation,
  RiskLevel,
  ModelContext,
  DimensionForecast,
  ChangeDescription,
} from './types';
import { TrafficModel, createTrafficModel } from './models/traffic-model';
import { RevenueModel, createRevenueModel } from './models/revenue-model';
import { RiskModel, createRiskModel } from './models/risk-model';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ForecasterConfig {
  timeoutMs: number;
  defaultHistoricalDays: number;
}

const DEFAULT_CONFIG: ForecasterConfig = {
  timeoutMs: 5000,
  defaultHistoricalDays: 30,
};

// ============================================================================
// FORECASTER CLASS
// ============================================================================

export class ImpactForecaster {
  private config: ForecasterConfig;
  private trafficModel: TrafficModel;
  private revenueModel: RevenueModel;
  private riskModel: RiskModel;
  private forecasts: Map<string, Forecast>;
  private inputs: Map<string, ForecastInput>;

  constructor(config?: Partial<ForecasterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.trafficModel = createTrafficModel();
    this.revenueModel = createRevenueModel();
    this.riskModel = createRiskModel();
    this.forecasts = new Map();
    this.inputs = new Map();
  }

  /**
   * Create a forecast input
   */
  createInput(
    source: ForecastInput['source'],
    proposalId: string,
    proposalType: string,
    changes: ChangeDescription[],
    context: ForecastInput['context']
  ): ForecastInput {
    const input: ForecastInput = {
      id: `input-${Date.now().toString(36)}`,
      source,
      proposalId,
      proposalType,
      changes,
      context,
      createdAt: new Date(),
    };

    this.inputs.set(input.id, input);
    return input;
  }

  /**
   * Generate forecast for an input
   */
  forecast(inputId: string, modelContext: ModelContext = {}): Forecast | undefined {
    const input = this.inputs.get(inputId);
    if (!input) return undefined;

    const startTime = Date.now();

    try {
      // Run traffic model
      const traffic = this.trafficModel.predict(input, modelContext);

      // Run conversion model (simplified - uses traffic as proxy)
      const conversion = this.predictConversion(input, traffic, modelContext);

      // Run revenue model
      const revenue = this.revenueModel.predict(input, traffic, conversion, modelContext);

      // Run risk models
      const seoRisk = this.riskModel.predictSeoRisk(input, modelContext);
      const aeoRisk = this.riskModel.predictAeoRisk(input, modelContext);
      const cannibalization = this.riskModel.predictCannibalization(input, modelContext);

      // Calculate net impact score
      const netImpactScore = this.calculateNetImpactScore(
        traffic,
        conversion,
        revenue,
        seoRisk.score,
        aeoRisk.score
      );

      // Determine overall risk
      const overallRisk = this.determineOverallRisk(
        seoRisk.level,
        aeoRisk.level,
        cannibalization.riskLevel
      );

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(
        traffic.confidence.level,
        conversion.confidence.level,
        revenue.confidence.level
      );

      // Generate explanation
      const explanation = this.generateExplanation(
        input,
        traffic,
        conversion,
        revenue,
        seoRisk,
        aeoRisk
      );

      // Generate assumptions and caveats
      const assumptions = this.generateAssumptions(input, modelContext);
      const caveats = this.generateCaveats(confidence, overallRisk);

      const forecast: Forecast = {
        id: `forecast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        inputId: input.id,
        generatedAt: new Date(),
        traffic,
        conversion,
        revenue,
        seoRisk,
        aeoRisk,
        cannibalization,
        netImpactScore: Math.round(netImpactScore * 100) / 100,
        overallRisk,
        confidence: Math.round(confidence * 100) / 100,
        explanation,
        assumptions,
        caveats,
      };

      this.forecasts.set(forecast.id, forecast);
      return forecast;
    } catch (error) {
      console.error('[ImpactForecaster] Forecast error:', error);
      return undefined;
    }
  }

  /**
   * Simplified conversion prediction
   */
  private predictConversion(
    input: ForecastInput,
    trafficForecast: DimensionForecast,
    context: ModelContext
  ): DimensionForecast {
    const currentConversion = input.context.currentConversion || 0.03;

    // Base conversion impact from changes
    let conversionImpact = 0;

    for (const change of input.changes) {
      switch (change.type) {
        case 'cta_optimization':
          conversionImpact += 0.15;
          break;
        case 'form_simplification':
          conversionImpact += 0.1;
          break;
        case 'trust_signals':
          conversionImpact += 0.08;
          break;
        case 'content_update':
          conversionImpact += 0.03;
          break;
        case 'structure_change':
          conversionImpact += 0.02;
          break;
        default:
          conversionImpact += 0.01;
      }
    }

    // Diminishing returns
    conversionImpact = Math.min(0.3, conversionImpact);

    const predictedValue = currentConversion * (1 + conversionImpact);

    return {
      dimension: 'conversion',
      currentValue: currentConversion,
      predictedValue: Math.round(predictedValue * 10000) / 10000,
      delta: Math.round((predictedValue - currentConversion) * 10000) / 10000,
      deltaPercent: Math.round(conversionImpact * 10000) / 100,
      confidence: {
        level: 0.65,
        low: 0.8,
        high: 1.2,
      },
      factors: [
        {
          name: 'Change impact',
          impact: conversionImpact,
          direction: conversionImpact >= 0 ? 'positive' : 'negative',
          weight: 1,
          explanation: `${input.changes.length} changes expected to impact conversion`,
        },
      ],
    };
  }

  /**
   * Calculate net impact score
   */
  private calculateNetImpactScore(
    traffic: DimensionForecast,
    conversion: DimensionForecast,
    revenue: DimensionForecast,
    seoRiskScore: number,
    aeoRiskScore: number
  ): number {
    // Weighted combination of positive impacts and risks
    const positiveScore =
      (traffic.deltaPercent * 0.25) +
      (conversion.deltaPercent * 0.3) +
      (revenue.deltaPercent * 0.35);

    const riskPenalty = (seoRiskScore + aeoRiskScore) / 2 * 20;

    return Math.max(-100, Math.min(100, positiveScore - riskPenalty));
  }

  /**
   * Determine overall risk level
   */
  private determineOverallRisk(
    seoRisk: RiskLevel,
    aeoRisk: RiskLevel,
    cannibalizationRisk: RiskLevel
  ): RiskLevel {
    const riskOrder: RiskLevel[] = ['minimal', 'low', 'medium', 'high', 'critical'];

    const seoIndex = riskOrder.indexOf(seoRisk);
    const aeoIndex = riskOrder.indexOf(aeoRisk);
    const cannIndex = riskOrder.indexOf(cannibalizationRisk);

    const maxIndex = Math.max(seoIndex, aeoIndex, cannIndex);

    return riskOrder[maxIndex];
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(...confidences: number[]): number {
    // Geometric mean of confidences
    const product = confidences.reduce((acc, c) => acc * c, 1);
    return Math.pow(product, 1 / confidences.length);
  }

  /**
   * Generate explanation
   */
  private generateExplanation(
    input: ForecastInput,
    traffic: DimensionForecast,
    conversion: DimensionForecast,
    revenue: DimensionForecast,
    seoRisk: any,
    aeoRisk: any
  ): ForecastExplanation {
    // Generate summary
    const revenueDelta = revenue.delta >= 0 ? 'increase' : 'decrease';
    const summary = `Expected ${Math.abs(revenue.deltaPercent)}% revenue ${revenueDelta} ` +
      `based on ${traffic.deltaPercent}% traffic change and ${conversion.deltaPercent}% conversion change. ` +
      `Overall risk level: ${seoRisk.level}.`;

    // Identify key drivers
    const allFactors = [
      ...traffic.factors,
      ...conversion.factors,
      ...revenue.factors,
    ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    const keyDrivers = allFactors.slice(0, 5).map((f) => ({
      driver: f.name,
      contribution: Math.round(f.impact * 100) / 100,
      explanation: f.explanation,
    }));

    // Sensitivity analysis
    const sensitivityAnalysis = [
      {
        variable: 'Traffic',
        baseCase: traffic.deltaPercent,
        optimistic: traffic.deltaPercent * 1.3,
        pessimistic: traffic.deltaPercent * 0.7,
      },
      {
        variable: 'Conversion',
        baseCase: conversion.deltaPercent,
        optimistic: conversion.deltaPercent * 1.4,
        pessimistic: conversion.deltaPercent * 0.6,
      },
      {
        variable: 'Revenue',
        baseCase: revenue.deltaPercent,
        optimistic: revenue.deltaPercent * 1.5,
        pessimistic: revenue.deltaPercent * 0.5,
      },
    ];

    // Comparisons
    const comparisons = [
      { scenario: 'Base case', outcome: revenue.deltaPercent },
      { scenario: 'Optimistic', outcome: revenue.deltaPercent * 1.5 },
      { scenario: 'Pessimistic', outcome: revenue.deltaPercent * 0.5 },
      { scenario: 'No change', outcome: 0 },
    ];

    return {
      summary,
      methodology: 'Deterministic model using weighted factor analysis with confidence intervals',
      keyDrivers,
      sensitivityAnalysis,
      comparisons,
    };
  }

  /**
   * Generate assumptions
   */
  private generateAssumptions(input: ForecastInput, context: ModelContext): string[] {
    const assumptions: string[] = [
      'Market conditions remain stable',
      'No major algorithm updates occur',
      'Changes are implemented correctly',
    ];

    if (!context.historicalData || context.historicalData.length < 30) {
      assumptions.push('Limited historical data - using industry benchmarks');
    }

    if (input.changes.length > 3) {
      assumptions.push('Multiple changes may have interactive effects not fully modeled');
    }

    return assumptions;
  }

  /**
   * Generate caveats
   */
  private generateCaveats(confidence: number, risk: RiskLevel): string[] {
    const caveats: string[] = [];

    if (confidence < 0.5) {
      caveats.push('Low confidence forecast - actual results may vary significantly');
    }

    if (risk === 'high' || risk === 'critical') {
      caveats.push('High risk changes - recommend staged rollout with monitoring');
    }

    caveats.push('Forecasts are estimates based on available data and models');
    caveats.push('External factors may impact actual results');

    return caveats;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Quick forecast without storing input
   */
  quickForecast(
    source: ForecastInput['source'],
    proposalId: string,
    proposalType: string,
    changes: ChangeDescription[],
    context: ForecastInput['context']
  ): Forecast | undefined {
    const input = this.createInput(source, proposalId, proposalType, changes, context);
    return this.forecast(input.id);
  }

  /**
   * Get forecast by ID
   */
  getForecast(id: string): Forecast | undefined {
    return this.forecasts.get(id);
  }

  /**
   * Get all forecasts
   */
  getAllForecasts(): Forecast[] {
    return Array.from(this.forecasts.values());
  }

  /**
   * Get input by ID
   */
  getInput(id: string): ForecastInput | undefined {
    return this.inputs.get(id);
  }

  /**
   * Compare multiple forecasts
   */
  compareForecasts(forecastIds: string[]): {
    forecasts: Forecast[];
    bestOption: string;
    analysis: { forecastId: string; score: number; pros: string[]; cons: string[] }[];
  } {
    const forecasts: Forecast[] = [];
    const analysis: { forecastId: string; score: number; pros: string[]; cons: string[] }[] = [];

    for (const id of forecastIds) {
      const forecast = this.forecasts.get(id);
      if (forecast) {
        forecasts.push(forecast);

        const pros: string[] = [];
        const cons: string[] = [];

        if (forecast.revenue.deltaPercent > 5) pros.push(`+${forecast.revenue.deltaPercent}% revenue`);
        if (forecast.traffic.deltaPercent > 5) pros.push(`+${forecast.traffic.deltaPercent}% traffic`);
        if (forecast.overallRisk === 'minimal' || forecast.overallRisk === 'low') {
          pros.push('Low risk');
        }

        if (forecast.revenue.deltaPercent < 0) cons.push(`${forecast.revenue.deltaPercent}% revenue impact`);
        if (forecast.overallRisk === 'high' || forecast.overallRisk === 'critical') {
          cons.push(`${forecast.overallRisk} risk level`);
        }
        if (forecast.cannibalization.hasRisk) cons.push('Cannibalization risk');

        analysis.push({
          forecastId: id,
          score: forecast.netImpactScore,
          pros,
          cons,
        });
      }
    }

    // Find best option
    analysis.sort((a, b) => b.score - a.score);
    const bestOption = analysis[0]?.forecastId || '';

    return { forecasts, bestOption, analysis };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.forecasts.clear();
    this.inputs.clear();
  }
}

// Singleton instance
let forecasterInstance: ImpactForecaster | null = null;

export function getImpactForecaster(): ImpactForecaster {
  if (!forecasterInstance) {
    forecasterInstance = new ImpactForecaster();
  }
  return forecasterInstance;
}

export function resetImpactForecaster(): void {
  if (forecasterInstance) {
    forecasterInstance.clear();
  }
  forecasterInstance = null;
}
