/**
 * Confidence Engine
 * Calculates overall confidence scores for decisions
 */

import type { ConfidenceScore, DataTrustScore, Decision } from '../types';
import { dataTrustScorer, type MetricHistory } from './data-trust-scorer';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface ConfidenceConfig {
  dataTrustWeight: number;
  signalStrengthWeight: number;
  historicalAccuracyWeight: number;
  modelConfidenceWeight: number;
  minimumConfidenceThreshold: number;
  modeThresholds: {
    off: number;
    supervised: number;
    full: number;
  };
}

const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  dataTrustWeight: 0.35,
  signalStrengthWeight: 0.30,
  historicalAccuracyWeight: 0.20,
  modelConfidenceWeight: 0.15,
  minimumConfidenceThreshold: 70,
  modeThresholds: {
    off: 0, // N/A
    supervised: 70,
    full: 60,
  },
};

// =============================================================================
// HISTORICAL TRACKING
// =============================================================================

interface DecisionOutcome {
  decisionId: string;
  bindingId: string;
  decisionType: string;
  outcome: 'success' | 'failure' | 'partial';
  timestamp: Date;
  confidenceAtDecision: number;
}

// =============================================================================
// CONFIDENCE ENGINE
// =============================================================================

export class ConfidenceEngine {
  private config: ConfidenceConfig;
  private decisionOutcomes: DecisionOutcome[] = [];
  private bindingAccuracy: Map<string, number[]> = new Map();
  private signalStrengthCache: Map<string, number> = new Map();

  constructor(config: Partial<ConfidenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIDENCE_CONFIG, ...config };
  }

  // =========================================================================
  // MAIN CONFIDENCE CALCULATION
  // =========================================================================

  calculateConfidence(
    decision: Decision,
    metricHistory: MetricHistory,
    modelConfidence?: number
  ): ConfidenceScore {
    // 1. Calculate data trust score
    const trustScore = dataTrustScorer.scoreTrust(metricHistory);
    const dataTrust = trustScore.overallTrust;

    // 2. Calculate signal strength
    const signalStrength = this.calculateSignalStrength(decision);

    // 3. Get historical accuracy for this binding
    const historicalAccuracy = this.getBindingAccuracy(decision.bindingId);

    // 4. Model confidence (from external model or default)
    const modelConf = modelConfidence ?? 80;

    // 5. Calculate weighted overall confidence
    const overall =
      dataTrust * this.config.dataTrustWeight +
      signalStrength * this.config.signalStrengthWeight +
      historicalAccuracy * this.config.historicalAccuracyWeight +
      modelConf * this.config.modelConfidenceWeight;

    // 6. Determine if it meets threshold
    const threshold = this.config.modeThresholds[decision.autopilotMode];
    const meetsThreshold = overall >= threshold;

    return {
      decisionId: decision.id,
      overall: Math.round(overall * 100) / 100,
      components: {
        dataTrust: Math.round(dataTrust * 100) / 100,
        signalStrength: Math.round(signalStrength * 100) / 100,
        historicalAccuracy: Math.round(historicalAccuracy * 100) / 100,
        modelConfidence: Math.round(modelConf * 100) / 100,
      },
      meetsThreshold,
      minimumRequired: threshold,
    };
  }

  // =========================================================================
  // SIGNAL STRENGTH CALCULATION
  // =========================================================================

  private calculateSignalStrength(decision: Decision): number {
    const { signal } = decision;
    const cacheKey = `${signal.metricId}:${signal.condition}`;

    // Check cache
    const cached = this.signalStrengthCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    let strength = 70; // Base strength

    // Factor 1: How far past threshold
    const deviation = Math.abs(signal.value - signal.threshold);
    const deviationPercent = signal.threshold !== 0 ? (deviation / Math.abs(signal.threshold)) * 100 : 0;

    if (deviationPercent > 50) {
      strength += 20; // Strong signal
    } else if (deviationPercent > 25) {
      strength += 10; // Moderate signal
    } else if (deviationPercent < 10) {
      strength -= 10; // Weak signal (close to threshold)
    }

    // Factor 2: Authority level (blocking signals are more significant)
    const authorityBonus: Record<string, number> = {
      blocking: 15,
      escalating: 10,
      triggering: 5,
      advisory: 0,
    };
    strength += authorityBonus[decision.authority] || 0;

    // Factor 3: Data sufficiency
    const sufficiencyBonus = Math.min(15, decision.dataSufficiency * 0.15);
    strength += sufficiencyBonus;

    // Factor 4: Data freshness (penalize stale data)
    if (decision.freshness > 24) {
      strength -= 15;
    } else if (decision.freshness > 12) {
      strength -= 10;
    } else if (decision.freshness > 6) {
      strength -= 5;
    }

    // Clamp to valid range
    strength = Math.max(0, Math.min(100, strength));

    // Cache result
    this.signalStrengthCache.set(cacheKey, strength);

    return strength;
  }

  // =========================================================================
  // HISTORICAL ACCURACY
  // =========================================================================

  private getBindingAccuracy(bindingId: string): number {
    const outcomes = this.bindingAccuracy.get(bindingId);

    if (!outcomes || outcomes.length === 0) {
      return 75; // Default moderate accuracy for new bindings
    }

    // Calculate weighted average (recent outcomes weighted more)
    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < outcomes.length; i++) {
      const weight = (i + 1) / outcomes.length; // More recent = higher weight
      weightedSum += outcomes[i] * weight;
      weightSum += weight;
    }

    return weightedSum / weightSum;
  }

  recordOutcome(outcome: DecisionOutcome): void {
    this.decisionOutcomes.push(outcome);

    // Update binding accuracy
    const scores = this.bindingAccuracy.get(outcome.bindingId) || [];

    const score =
      outcome.outcome === 'success' ? 100 : outcome.outcome === 'partial' ? 70 : 30;

    scores.push(score);

    // Keep last 50 outcomes per binding
    if (scores.length > 50) {
      scores.shift();
    }

    this.bindingAccuracy.set(outcome.bindingId, scores);

    // Also record in data trust scorer
    dataTrustScorer.recordAccuracy(outcome.bindingId, score);
  }

  // =========================================================================
  // THRESHOLD MANAGEMENT
  // =========================================================================

  getMinimumConfidence(autopilotMode: 'off' | 'supervised' | 'full'): number {
    return this.config.modeThresholds[autopilotMode];
  }

  setModeThreshold(mode: 'off' | 'supervised' | 'full', threshold: number): void {
    this.config.modeThresholds[mode] = Math.max(0, Math.min(100, threshold));
  }

  // =========================================================================
  // CONFIDENCE ANALYSIS
  // =========================================================================

  analyzeConfidenceFactors(confidence: ConfidenceScore): {
    weakestFactor: string;
    strongestFactor: string;
    recommendations: string[];
  } {
    const components = confidence.components;
    const factors = Object.entries(components) as [keyof typeof components, number][];

    factors.sort((a, b) => a[1] - b[1]);

    const weakest = factors[0];
    const strongest = factors[factors.length - 1];

    const recommendations: string[] = [];

    // Generate recommendations based on weak factors
    if (components.dataTrust < 70) {
      recommendations.push('Improve data collection frequency or resolve data quality issues');
    }

    if (components.signalStrength < 70) {
      recommendations.push('Signal is close to threshold - consider waiting for stronger confirmation');
    }

    if (components.historicalAccuracy < 70) {
      recommendations.push('This binding has had mixed outcomes - consider human review');
    }

    if (components.modelConfidence < 70) {
      recommendations.push('Model confidence is low - verify with additional data sources');
    }

    return {
      weakestFactor: weakest[0],
      strongestFactor: strongest[0],
      recommendations,
    };
  }

  // =========================================================================
  // BATCH OPERATIONS
  // =========================================================================

  calculateBatchConfidence(
    decisions: Decision[],
    metricHistories: Map<string, MetricHistory>
  ): Map<string, ConfidenceScore> {
    const results = new Map<string, ConfidenceScore>();

    for (const decision of decisions) {
      const history = metricHistories.get(decision.signal.metricId);

      if (history) {
        const confidence = this.calculateConfidence(decision, history);
        results.set(decision.id, confidence);
      }
    }

    return results;
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  getStatistics(): {
    totalOutcomes: number;
    successRate: number;
    averageConfidence: number;
    bindingsWithHistory: number;
  } {
    const outcomes = this.decisionOutcomes;

    if (outcomes.length === 0) {
      return {
        totalOutcomes: 0,
        successRate: 0,
        averageConfidence: 0,
        bindingsWithHistory: 0,
      };
    }

    const successes = outcomes.filter(o => o.outcome === 'success').length;
    const successRate = (successes / outcomes.length) * 100;

    const avgConfidence =
      outcomes.reduce((sum, o) => sum + o.confidenceAtDecision, 0) / outcomes.length;

    return {
      totalOutcomes: outcomes.length,
      successRate: Math.round(successRate * 100) / 100,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      bindingsWithHistory: this.bindingAccuracy.size,
    };
  }

  // =========================================================================
  // CACHE MANAGEMENT
  // =========================================================================

  clearCache(): void {
    this.signalStrengthCache.clear();
  }

  trimHistory(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);

    this.decisionOutcomes = this.decisionOutcomes.filter(o => o.timestamp > cutoff);
  }
}

// Singleton instance
export const confidenceEngine = new ConfidenceEngine();
