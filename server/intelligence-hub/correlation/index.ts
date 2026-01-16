/**
 * Enterprise Intelligence Hub - Signal Correlation Engine
 *
 * Detects correlations and anomalies in signals.
 */

export * from './types';
export * from './patterns';
export * from './correlator';
export * from './anomaly-detector';

import { getSignalCorrelator } from './correlator';
import { getAnomalyDetector } from './anomaly-detector';

/**
 * Run full correlation analysis
 */
export async function runCorrelationAnalysis(lookbackMs = 3600000) {
  const correlator = getSignalCorrelator();
  const detector = getAnomalyDetector();

  const [correlations, anomalies] = await Promise.all([
    correlator.detectCorrelations(lookbackMs),
    detector.detectAnomalies(lookbackMs),
  ]);

  return { correlations, anomalies };
}

/**
 * Get current anomalies
 */
export function getActiveAnomalies() {
  return getAnomalyDetector().getActive();
}

/**
 * Get strong correlations
 */
export function getStrongCorrelations(minStrength = 70) {
  return getSignalCorrelator().getStrongCorrelations(minStrength);
}
