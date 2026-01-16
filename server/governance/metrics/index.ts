/**
 * Governance Quality Metrics Module
 * Computes and tracks 15 governance quality signals
 */

export * from './types';
export {
  recordEvent,
  updateEventOutcome,
  aggregateWindow,
  computeSignal,
  computeAllSignals,
  persistScores,
  getHistoricalScores,
  computeOverallHealth,
  clearMetricsData,
  getEventCount,
} from './signals';
