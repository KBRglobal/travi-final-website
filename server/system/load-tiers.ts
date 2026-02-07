// Stub - Load Tiers disabled

// LoadTier is a string alias for compatibility with existing code
export type LoadTier = "green" | "low" | "normal" | "high" | "critical" | "yellow" | "red";

export interface LoadTierConfig {
  name: string;
  threshold: number;
  multiplier: number;
}

export interface LoadTierState {
  current: LoadTier;
  previous: LoadTier;
  changedAt: Date;
}

export interface LoadTierMetrics {
  currentTier: LoadTier;
  load: number;
  timestamp: Date;
  tier: LoadTier;
  capacity: number;
  thresholds: Record<string, number>;
  behaviors: Record<string, unknown>;
  state: LoadTierState;
  recentTransitions: Array<{ from: LoadTier; to: LoadTier; at: Date }>;
}

export const LOAD_TIERS: Record<string, LoadTierConfig> = {
  green: { name: "green", threshold: 0, multiplier: 0.5 },
  low: { name: "low", threshold: 10, multiplier: 0.75 },
  normal: { name: "normal", threshold: 30, multiplier: 1 },
  yellow: { name: "yellow", threshold: 50, multiplier: 1.25 },
  high: { name: "high", threshold: 70, multiplier: 1.5 },
  red: { name: "red", threshold: 85, multiplier: 1.75 },
  critical: { name: "critical", threshold: 90, multiplier: 2 },
};

const defaultState: LoadTierState = { current: "green", previous: "green", changedAt: new Date() };

class LoadTierManager {
  getCurrentTier(): LoadTierConfig {
    return LOAD_TIERS.green;
  }
  getLoadTier(): LoadTier {
    return "green";
  }
  getThrottleDelay(): number {
    return 0;
  }
  shouldThrottle(): boolean {
    return false;
  }
  recordLoad(): void {
    /* empty */
  }
  getMetrics(): LoadTierMetrics {
    return {
      currentTier: "green",
      load: 0,
      timestamp: new Date(),
      tier: "green",
      capacity: 100,
      thresholds: { green: 0, yellow: 50, red: 80 },
      behaviors: {},
      state: defaultState,
      recentTransitions: [],
    };
  }
}

let instance: LoadTierManager | null = null;

export function getLoadTierManager(): LoadTierManager {
  if (!instance) instance = new LoadTierManager();
  return instance;
}

// Alias for initLoadTierManager
export function initLoadTierManager(_config?: unknown, _alerts?: unknown): LoadTierManager {
  return getLoadTierManager();
}

export function getCurrentTier(): LoadTierConfig {
  return getLoadTierManager().getCurrentTier();
}

export function getThrottleDelay(): number {
  return getLoadTierManager().getThrottleDelay();
}
