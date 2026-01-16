/**
 * Signal Unification Layer (Subsystem 1)
 *
 * Aggregates and normalizes signals from all intelligence sources
 * into a unified schema with freshness decay and efficient querying.
 */

// Types
export type {
  SignalSource,
  SignalCategory,
  SignalPriority,
  NormalizedSignal,
  RawSignal,
  SignalQuery,
  SignalAggregation,
  EntitySignalSummary,
} from './types';

// Registry
export { signalRegistry } from './registry';

// Normalization
export {
  normalizeSignal,
  normalizeSignals,
  validateRawSignal,
  deriveCategory,
  derivePriority,
  calculateExpiration,
  normalizeEntityType,
  createTrafficSignal,
  createContentHealthSignal,
  createRevenueSignal,
  createOpsSignal,
} from './normalizer';

// Decay
export {
  calculateFreshness,
  isExpired,
  isStale,
  updateSignalFreshness,
  runDecayPass,
  startDecayScheduler,
  stopDecayScheduler,
  getFreshnessTier,
  getSignalsByFreshness,
  boostFreshness,
  getDecayStats,
  type DecayResult,
  type DecayStats,
} from './decay';

// Queries
export {
  querySignals,
  getTopSignals,
  getCriticalSignals,
  getHighImpactSignals,
  aggregateByCategory,
  getEntitySummary,
  getContentSummary,
  searchSignals,
  getAttentionRequired,
  getRevenueImpactSignals,
  getRelatedSignals,
} from './query';
