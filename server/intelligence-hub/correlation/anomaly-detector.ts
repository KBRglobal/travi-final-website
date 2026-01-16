/**
 * Enterprise Intelligence Hub - Anomaly Detector
 *
 * Detects unusual signal patterns.
 */

import { log } from '../../lib/logger';
import { getSignalRegistry } from '../signals/registry';
import type { Anomaly, AnomalyQuery } from './types';
import type { UnifiedSignal } from '../signals/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AnomalyDetector] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[AnomalyDetector] ${msg}`, data),
};

// Bounded storage
const MAX_ANOMALIES = 200;

/**
 * Generate unique anomaly ID
 */
function generateAnomalyId(): string {
  return `anom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return { mean, stdDev };
}

/**
 * Determine severity from deviation
 */
function deviationToSeverity(deviation: number): Anomaly['severity'] {
  if (deviation >= 4) return 'extreme';
  if (deviation >= 3) return 'major';
  if (deviation >= 2) return 'moderate';
  return 'minor';
}

class AnomalyDetector {
  private anomalies: Map<string, Anomaly> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_SIGNAL_CORRELATION === 'true';
    if (this.enabled) {
      logger.info('Anomaly Detector initialized');
    }
  }

  /**
   * Detect anomalies in recent signals
   */
  async detectAnomalies(lookbackMs = 3600000): Promise<Anomaly[]> {
    if (!this.enabled) return [];

    const registry = getSignalRegistry();
    const since = new Date(Date.now() - lookbackMs);
    const signals = registry.querySignals({ since, limit: 1000 });

    if (signals.length < 20) {
      logger.info('Not enough signals for anomaly detection');
      return [];
    }

    const detected: Anomaly[] = [];

    // Group signals by source
    const bySource = new Map<string, UnifiedSignal[]>();
    for (const signal of signals) {
      const existing = bySource.get(signal.source) || [];
      existing.push(signal);
      bySource.set(signal.source, existing);
    }

    // Detect anomalies per source
    for (const [source, sourceSignals] of bySource.entries()) {
      if (sourceSignals.length < 5) continue;

      const scores = sourceSignals.map(s => s.score);
      const { mean, stdDev } = calculateStdDev(scores);

      if (stdDev < 5) continue; // Low variance, no anomalies

      // Check latest signals for anomalies
      const recentSignals = sourceSignals.slice(-10);

      for (const signal of recentSignals) {
        const deviation = stdDev > 0 ? Math.abs(signal.score - mean) / stdDev : 0;

        if (deviation >= 2) {
          const anomaly: Anomaly = {
            id: generateAnomalyId(),
            signalSource: source,
            entityId: signal.entityId !== 'system' ? signal.entityId : undefined,
            expectedValue: Math.round(mean),
            actualValue: signal.score,
            deviation: Math.round(deviation * 100) / 100,
            severity: deviationToSeverity(deviation),
            explanation: this.buildExplanation(source, signal.score, mean, deviation),
            detectedAt: new Date(),
            resolved: false,
          };

          detected.push(anomaly);
          this.storeAnomaly(anomaly);
        }
      }
    }

    logger.info('Anomaly detection complete', {
      signalsAnalyzed: signals.length,
      anomaliesFound: detected.length,
    });

    return detected;
  }

  /**
   * Build human-readable explanation
   */
  private buildExplanation(
    source: string,
    actual: number,
    expected: number,
    deviation: number
  ): string {
    const direction = actual > expected ? 'higher' : 'lower';
    const severity = deviationToSeverity(deviation);

    return `${severity.charAt(0).toUpperCase() + severity.slice(1)} anomaly in ${source}: ` +
           `value is ${Math.round(actual)} (${deviation.toFixed(1)}σ ${direction} than expected ${Math.round(expected)})`;
  }

  /**
   * Store anomaly with bounds
   */
  private storeAnomaly(anomaly: Anomaly): void {
    this.anomalies.set(anomaly.id, anomaly);

    if (this.anomalies.size > MAX_ANOMALIES) {
      const resolved = Array.from(this.anomalies.entries())
        .filter(([_, a]) => a.resolved)
        .sort((a, b) => a[1].detectedAt.getTime() - b[1].detectedAt.getTime());

      for (const [id] of resolved.slice(0, MAX_ANOMALIES / 4)) {
        this.anomalies.delete(id);
      }
    }
  }

  /**
   * Mark anomaly as resolved
   */
  resolve(id: string): boolean {
    const anomaly = this.anomalies.get(id);
    if (!anomaly) return false;

    anomaly.resolved = true;
    anomaly.resolvedAt = new Date();
    return true;
  }

  /**
   * Query anomalies
   */
  query(query: AnomalyQuery = {}): Anomaly[] {
    let results = Array.from(this.anomalies.values());

    if (query.signalSources?.length) {
      results = results.filter(a => query.signalSources!.includes(a.signalSource));
    }
    if (query.minDeviation !== undefined) {
      results = results.filter(a => a.deviation >= query.minDeviation!);
    }
    if (query.severities?.length) {
      results = results.filter(a => query.severities!.includes(a.severity));
    }
    if (query.resolved !== undefined) {
      results = results.filter(a => a.resolved === query.resolved);
    }
    if (query.since) {
      results = results.filter(a => a.detectedAt >= query.since!);
    }

    results.sort((a, b) => b.deviation - a.deviation);

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get active anomalies
   */
  getActive(): Anomaly[] {
    return this.query({ resolved: false });
  }

  /**
   * Get severe anomalies
   */
  getSevere(): Anomaly[] {
    return this.query({
      severities: ['major', 'extreme'],
      resolved: false,
    });
  }

  /**
   * Clear all (for testing)
   */
  clear(): void {
    this.anomalies.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: AnomalyDetector | null = null;

export function getAnomalyDetector(): AnomalyDetector {
  if (!instance) {
    instance = new AnomalyDetector();
  }
  return instance;
}

export function resetAnomalyDetector(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { AnomalyDetector };
