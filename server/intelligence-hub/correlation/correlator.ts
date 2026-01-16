/**
 * Enterprise Intelligence Hub - Signal Correlator
 *
 * Detects correlations between signals.
 */

import { log } from '../../lib/logger';
import { getSignalRegistry } from '../signals/registry';
import { KNOWN_PATTERNS, hasKnownPattern } from './patterns';
import type { Correlation, CorrelationType, PatternId, CorrelationQuery } from './types';
import type { UnifiedSignal } from '../signals/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Correlator] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[Correlator] ${msg}`, data),
};

// Bounded storage
const MAX_CORRELATIONS = 500;

/**
 * Generate unique correlation ID
 */
function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class SignalCorrelator {
  private correlations: Map<string, Correlation> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_SIGNAL_CORRELATION === 'true';
    if (this.enabled) {
      logger.info('Signal Correlator initialized');
    }
  }

  /**
   * Detect correlations in recent signals
   */
  async detectCorrelations(lookbackMs = 3600000): Promise<Correlation[]> {
    if (!this.enabled) return [];

    const registry = getSignalRegistry();
    const since = new Date(Date.now() - lookbackMs);
    const signals = registry.querySignals({ since, limit: 500 });

    if (signals.length < 10) {
      logger.info('Not enough signals for correlation analysis');
      return [];
    }

    const detected: Correlation[] = [];

    // Group signals by source
    const bySource = new Map<string, UnifiedSignal[]>();
    for (const signal of signals) {
      const existing = bySource.get(signal.source) || [];
      existing.push(signal);
      bySource.set(signal.source, existing);
    }

    // Check known patterns
    for (const pattern of KNOWN_PATTERNS) {
      const signalsA = bySource.get(pattern.signalSourceA) || [];
      const signalsB = bySource.get(pattern.signalSourceB) || [];

      if (signalsA.length >= 3 && signalsB.length >= 3) {
        const correlation = this.analyzeCorrelation(
          signalsA,
          signalsB,
          pattern.id,
          pattern.expectedType
        );

        if (correlation && correlation.strength >= pattern.minStrength) {
          detected.push(correlation);
          this.storeCorrelation(correlation);
        }
      }
    }

    logger.info('Correlation detection complete', {
      signalsAnalyzed: signals.length,
      correlationsFound: detected.length,
    });

    return detected;
  }

  /**
   * Analyze correlation between two signal sets
   */
  private analyzeCorrelation(
    signalsA: UnifiedSignal[],
    signalsB: UnifiedSignal[],
    patternId: PatternId,
    expectedType: CorrelationType
  ): Correlation | null {
    // Calculate average scores
    const avgA = signalsA.reduce((sum, s) => sum + s.score, 0) / signalsA.length;
    const avgB = signalsB.reduce((sum, s) => sum + s.score, 0) / signalsB.length;

    // Calculate temporal overlap
    const timeRangeA = {
      start: Math.min(...signalsA.map(s => s.timestamp.getTime())),
      end: Math.max(...signalsA.map(s => s.timestamp.getTime())),
    };
    const timeRangeB = {
      start: Math.min(...signalsB.map(s => s.timestamp.getTime())),
      end: Math.max(...signalsB.map(s => s.timestamp.getTime())),
    };

    const overlapStart = Math.max(timeRangeA.start, timeRangeB.start);
    const overlapEnd = Math.min(timeRangeA.end, timeRangeB.end);
    const hasOverlap = overlapStart <= overlapEnd;

    if (!hasOverlap) {
      return null;
    }

    // Simple correlation strength based on score similarity
    const scoreDiff = Math.abs(avgA - avgB);
    const baseStrength = 100 - scoreDiff;

    // Adjust for sample size
    const sampleSize = signalsA.length + signalsB.length;
    const sampleBonus = Math.min(20, sampleSize / 2);
    const strength = Math.min(100, Math.max(0, baseStrength + sampleBonus));

    // Confidence based on sample size and consistency
    const confidence = Math.min(100, 40 + sampleSize * 2);

    // Determine direction
    const direction = avgA > avgB ? 'positive' : avgA < avgB ? 'negative' : 'neutral';

    // Build explanation
    const explanation = this.buildExplanation(
      signalsA[0].source,
      signalsB[0].source,
      avgA,
      avgB,
      expectedType,
      patternId
    );

    return {
      id: generateCorrelationId(),
      type: expectedType,
      patternId,
      signalA: {
        source: signalsA[0].source,
        avgScore: Math.round(avgA),
      },
      signalB: {
        source: signalsB[0].source,
        avgScore: Math.round(avgB),
      },
      strength: Math.round(strength),
      confidence: Math.round(confidence),
      direction,
      explanation,
      detectedAt: new Date(),
      sampleSize,
    };
  }

  /**
   * Build human-readable explanation
   */
  private buildExplanation(
    sourceA: string,
    sourceB: string,
    avgA: number,
    avgB: number,
    type: CorrelationType,
    patternId: PatternId
  ): string {
    const pattern = KNOWN_PATTERNS.find(p => p.id === patternId);
    const patternName = pattern?.name || 'Unknown pattern';

    switch (type) {
      case 'causal':
        return `${patternName}: Changes in ${sourceA} (avg ${Math.round(avgA)}) appear to cause changes in ${sourceB} (avg ${Math.round(avgB)}).`;
      case 'associated':
        return `${patternName}: ${sourceA} (avg ${Math.round(avgA)}) and ${sourceB} (avg ${Math.round(avgB)}) tend to occur together.`;
      case 'temporal':
        return `${patternName}: ${sourceA} (avg ${Math.round(avgA)}) typically precedes ${sourceB} (avg ${Math.round(avgB)}).`;
      case 'inverse':
        return `${patternName}: When ${sourceA} increases, ${sourceB} tends to decrease.`;
      default:
        return `Correlation detected between ${sourceA} and ${sourceB}.`;
    }
  }

  /**
   * Store correlation with bounds
   */
  private storeCorrelation(correlation: Correlation): void {
    this.correlations.set(correlation.id, correlation);

    if (this.correlations.size > MAX_CORRELATIONS) {
      const sorted = Array.from(this.correlations.entries())
        .sort((a, b) => a[1].detectedAt.getTime() - b[1].detectedAt.getTime());

      for (const [id] of sorted.slice(0, MAX_CORRELATIONS / 4)) {
        this.correlations.delete(id);
      }
    }
  }

  /**
   * Query correlations
   */
  query(query: CorrelationQuery = {}): Correlation[] {
    let results = Array.from(this.correlations.values());

    if (query.patternIds?.length) {
      results = results.filter(c => query.patternIds!.includes(c.patternId));
    }
    if (query.types?.length) {
      results = results.filter(c => query.types!.includes(c.type));
    }
    if (query.minStrength !== undefined) {
      results = results.filter(c => c.strength >= query.minStrength!);
    }
    if (query.minConfidence !== undefined) {
      results = results.filter(c => c.confidence >= query.minConfidence!);
    }
    if (query.since) {
      results = results.filter(c => c.detectedAt >= query.since!);
    }

    results.sort((a, b) => b.strength - a.strength);

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get strong correlations
   */
  getStrongCorrelations(minStrength = 70): Correlation[] {
    return this.query({ minStrength });
  }

  /**
   * Clear all (for testing)
   */
  clear(): void {
    this.correlations.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: SignalCorrelator | null = null;

export function getSignalCorrelator(): SignalCorrelator {
  if (!instance) {
    instance = new SignalCorrelator();
  }
  return instance;
}

export function resetSignalCorrelator(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { SignalCorrelator };
