/**
 * Signal Decay Engine
 *
 * Manages signal freshness decay over time using exponential decay.
 * Signals become less relevant as they age.
 */

import type { NormalizedSignal } from './types';
import { getGrowthOSConfig, isSignalsEnabled } from '../config';
import { signalRegistry } from './registry';
import { log } from '../../lib/logger';

/**
 * Calculate freshness score based on age and half-life
 * Uses exponential decay: freshness = 100 * (0.5 ^ (age / halfLife))
 */
export function calculateFreshness(createdAt: Date, halfLifeHours: number): number {
  const ageMs = Date.now() - createdAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const decayFactor = Math.pow(0.5, ageHours / halfLifeHours);
  return Math.round(100 * decayFactor);
}

/**
 * Check if a signal has expired
 */
export function isExpired(signal: NormalizedSignal): boolean {
  return Date.now() > signal.expiresAt.getTime();
}

/**
 * Check if a signal is stale (low freshness)
 */
export function isStale(signal: NormalizedSignal, threshold = 10): boolean {
  return signal.freshness < threshold;
}

/**
 * Update freshness for a single signal
 */
export function updateSignalFreshness(signal: NormalizedSignal): void {
  const config = getGrowthOSConfig();
  signal.freshness = calculateFreshness(signal.createdAt, config.signalDecayHalfLifeHours);
  signal.updatedAt = new Date();
}

/**
 * Decay result for batch processing
 */
export interface DecayResult {
  processed: number;
  expired: number;
  stale: number;
  active: number;
  durationMs: number;
}

/**
 * Run decay pass on all signals in registry
 * Updates freshness and removes expired signals
 */
export function runDecayPass(): DecayResult {
  if (!isSignalsEnabled()) {
    return { processed: 0, expired: 0, stale: 0, active: 0, durationMs: 0 };
  }

  const startTime = Date.now();
  const config = getGrowthOSConfig();
  const staleThreshold = 10;

  let processed = 0;
  let expired = 0;
  let stale = 0;
  let active = 0;

  const allSignals = signalRegistry.getAllSignals();
  const expiredIds: string[] = [];

  for (const signal of allSignals) {
    processed++;

    // Check expiration first
    if (isExpired(signal)) {
      expired++;
      expiredIds.push(signal.id);
      continue;
    }

    // Update freshness
    signal.freshness = calculateFreshness(signal.createdAt, config.signalDecayHalfLifeHours);
    signal.updatedAt = new Date();

    if (signal.freshness < staleThreshold) {
      stale++;
    } else {
      active++;
    }
  }

  // Remove expired signals
  for (const id of expiredIds) {
    signalRegistry.removeSignal(id);
  }

  const durationMs = Date.now() - startTime;

  if (expired > 0 || stale > 0) {
    log.debug(`[GrowthOS] Decay pass: ${processed} processed, ${expired} expired, ${stale} stale, ${active} active (${durationMs}ms)`);
  }

  return { processed, expired, stale, active, durationMs };
}

/**
 * Decay scheduler state
 */
let decayInterval: NodeJS.Timeout | null = null;

/**
 * Start the decay scheduler
 * Runs decay pass periodically
 */
export function startDecayScheduler(intervalMinutes = 5): void {
  if (!isSignalsEnabled()) return;

  if (decayInterval) {
    log.warn('[GrowthOS] Decay scheduler already running');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  decayInterval = setInterval(() => {
    try {
      runDecayPass();
    } catch (error) {
      log.error('[GrowthOS] Decay pass failed:', error);
    }
  }, intervalMs);

  log.info(`[GrowthOS] Decay scheduler started (interval: ${intervalMinutes}m)`);
}

/**
 * Stop the decay scheduler
 */
export function stopDecayScheduler(): void {
  if (decayInterval) {
    clearInterval(decayInterval);
    decayInterval = null;
    log.info('[GrowthOS] Decay scheduler stopped');
  }
}

/**
 * Get freshness tier for a signal
 */
export function getFreshnessTier(freshness: number): 'fresh' | 'aging' | 'stale' | 'expired' {
  if (freshness >= 75) return 'fresh';
  if (freshness >= 40) return 'aging';
  if (freshness >= 10) return 'stale';
  return 'expired';
}

/**
 * Get signals by freshness tier
 */
export function getSignalsByFreshness(tier: 'fresh' | 'aging' | 'stale'): NormalizedSignal[] {
  const allSignals = signalRegistry.getAllSignals();

  return allSignals.filter(signal => {
    const signalTier = getFreshnessTier(signal.freshness);
    return signalTier === tier;
  });
}

/**
 * Boost freshness for a signal (e.g., when revalidated)
 */
export function boostFreshness(signalId: string, amount = 25): boolean {
  const signal = signalRegistry.getSignal(signalId);
  if (!signal) return false;

  signal.freshness = Math.min(100, signal.freshness + amount);
  signal.updatedAt = new Date();
  return true;
}

/**
 * Get decay statistics
 */
export interface DecayStats {
  totalSignals: number;
  freshCount: number;
  agingCount: number;
  staleCount: number;
  avgFreshness: number;
  oldestSignalAge: number; // hours
}

export function getDecayStats(): DecayStats {
  const allSignals = signalRegistry.getAllSignals();

  if (allSignals.length === 0) {
    return {
      totalSignals: 0,
      freshCount: 0,
      agingCount: 0,
      staleCount: 0,
      avgFreshness: 0,
      oldestSignalAge: 0,
    };
  }

  let freshCount = 0;
  let agingCount = 0;
  let staleCount = 0;
  let totalFreshness = 0;
  let oldestTimestamp = Date.now();

  for (const signal of allSignals) {
    const tier = getFreshnessTier(signal.freshness);
    if (tier === 'fresh') freshCount++;
    else if (tier === 'aging') agingCount++;
    else staleCount++;

    totalFreshness += signal.freshness;

    const signalTime = signal.createdAt.getTime();
    if (signalTime < oldestTimestamp) {
      oldestTimestamp = signalTime;
    }
  }

  const oldestAgeHours = (Date.now() - oldestTimestamp) / (1000 * 60 * 60);

  return {
    totalSignals: allSignals.length,
    freshCount,
    agingCount,
    staleCount,
    avgFreshness: Math.round(totalFreshness / allSignals.length),
    oldestSignalAge: Math.round(oldestAgeHours * 10) / 10,
  };
}
