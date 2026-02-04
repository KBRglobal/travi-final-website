/**
 * Load Tiers (Stub)
 * System load management was simplified during cleanup.
 */

export type LoadTier = "idle" | "low" | "medium" | "high" | "critical" | "green" | "yellow" | "red";

export interface LoadTierTransition {
  fromTier: LoadTier;
  toTier: LoadTier;
  capacity: number;
  timestamp: Date;
}

export interface LoadTierDeferral {
  category: string;
  tier: LoadTier;
  reason: string;
  taskId: string;
  timestamp: Date;
}

export interface LoadTierState {
  transitionCount: number;
  deferredTaskCount: number;
  lastTransitionAt: Date;
}

export interface LoadTierBehaviors {
  deferLowPriority: boolean;
  reduceBatchSize: boolean;
  enableBackpressure: boolean;
}

export interface LoadTierManager {
  getCurrentTier: () => LoadTier;
  getLoadTier: () => LoadTier;
  setTier: (tier: LoadTier) => void;
  getMetrics: () => LoadTierMetrics;
}

export interface LoadTierMetrics {
  currentTier: LoadTier;
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSecond: number;
  tier: LoadTier;
  capacity: number;
  thresholds: { greenThreshold: number; yellowThreshold: number };
  behaviors: LoadTierBehaviors;
  state: LoadTierState;
  recentTransitions: LoadTierTransition[];
  recentDeferrals: LoadTierDeferral[];
}

export interface LoadTierThresholds {
  idle: number;
  low: number;
  medium: number;
  high: number;
  greenThreshold?: number;
  yellowThreshold?: number;
}

const defaultManager: LoadTierManager = {
  getCurrentTier: () => "green",
  getLoadTier: () => "green",
  setTier: () => {},
  getMetrics: () => ({
    currentTier: "green",
    cpuUsage: 10,
    memoryUsage: 20,
    requestsPerSecond: 5,
    tier: "green",
    capacity: 10,
    thresholds: { greenThreshold: 50, yellowThreshold: 80 },
    behaviors: {
      deferLowPriority: false,
      reduceBatchSize: false,
      enableBackpressure: false,
    },
    state: {
      transitionCount: 0,
      deferredTaskCount: 0,
      lastTransitionAt: new Date(),
    },
    recentTransitions: [],
    recentDeferrals: [],
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
  greenThreshold?: number;
  yellowThreshold?: number;
}

export function initLoadTierManager(
  config?: LoadTierConfig,
  capacityProvider?: () => number
): LoadTierManager {
  return defaultManager;
}
