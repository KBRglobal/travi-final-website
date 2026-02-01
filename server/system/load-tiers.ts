/**
 * Load Tiers (Stub)
 * System load management was simplified during cleanup.
 */

export type LoadTier = 'idle' | 'low' | 'medium' | 'high' | 'critical';

export interface LoadTierManager {
  getCurrentTier: () => LoadTier;
  setTier: (tier: LoadTier) => void;
  getMetrics: () => LoadTierMetrics;
}

export interface LoadTierMetrics {
  currentTier: LoadTier;
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSecond: number;
}

export interface LoadTierThresholds {
  idle: number;
  low: number;
  medium: number;
  high: number;
}

const defaultManager: LoadTierManager = {
  getCurrentTier: () => 'low',
  setTier: () => {},
  getMetrics: () => ({
    currentTier: 'low',
    cpuUsage: 10,
    memoryUsage: 20,
    requestsPerSecond: 5,
  }),
};

export function getLoadTierManager(): LoadTierManager {
  return defaultManager;
}

export const LOAD_TIER_THRESHOLDS: LoadTierThresholds = {
  idle: 0,
  low: 25,
  medium: 50,
  high: 75,
};

export interface LoadTierConfig {
  capacityProvider?: () => number;
}

export function initLoadTierManager(config?: LoadTierConfig): LoadTierManager {
  return defaultManager;
}
