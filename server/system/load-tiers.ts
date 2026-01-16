/**
 * Load Tiers System - Graceful Degradation Under Traffic Spikes
 * 
 * TASK 7: Rate & Queue Stress Modes
 * 
 * Defines load tiers for traffic management:
 * - GREEN (< 50% capacity): All features enabled
 * - YELLOW (50-80% capacity): Defer non-critical AI tasks
 * - RED (> 80% capacity): Serve cached content only
 * 
 * HARD CONSTRAINTS:
 * - Additive only - no breaking changes
 * - Graceful degradation, not hard failures
 * - All tier transitions and deferred tasks are logged
 */

import { log } from '../lib/logger';
import type { TaskCategory } from '../ai-orchestrator/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[LoadTiers] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[LoadTiers] ${msg}`, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[LoadTiers][AUDIT] ${msg}`, data),
};

export type LoadTier = 'green' | 'yellow' | 'red';

export interface LoadTierConfig {
  greenThreshold: number;
  yellowThreshold: number;
}

export interface LoadTierState {
  currentTier: LoadTier;
  currentCapacity: number;
  lastTransitionAt: Date;
  transitionCount: number;
  deferredTaskCount: number;
}

export interface LoadTierMetrics {
  tier: LoadTier;
  capacity: number;
  thresholds: LoadTierConfig;
  state: LoadTierState;
  behaviors: {
    allFeaturesEnabled: boolean;
    deferNonCritical: boolean;
    serveCachedOnly: boolean;
  };
  recentDeferrals: DeferralEvent[];
  recentTransitions: TransitionEvent[];
}

export interface DeferralEvent {
  taskId?: string;
  category: string;
  tier: LoadTier;
  reason: string;
  timestamp: Date;
}

export interface TransitionEvent {
  fromTier: LoadTier;
  toTier: LoadTier;
  capacity: number;
  timestamp: Date;
}

const DEFAULT_CONFIG: LoadTierConfig = {
  greenThreshold: 50,
  yellowThreshold: 80,
};

const NON_CRITICAL_CATEGORIES: Set<string> = new Set([
  'enrichment',
  'seo',
  'internal',
  'research',
]);

const CRITICAL_CATEGORIES: Set<string> = new Set([
  'content',
  'translation',
  'news',
  'evergreen',
  'localization',
]);

export class LoadTierManager {
  private config: LoadTierConfig;
  private state: LoadTierState;
  private deferralHistory: DeferralEvent[];
  private transitionHistory: TransitionEvent[];
  private maxHistorySize: number;
  private capacityProvider: () => number;

  constructor(
    config?: Partial<LoadTierConfig>,
    capacityProvider?: () => number
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maxHistorySize = 100;
    this.deferralHistory = [];
    this.transitionHistory = [];
    
    this.capacityProvider = capacityProvider || (() => 0);
    
    this.state = {
      currentTier: 'green',
      currentCapacity: 0,
      lastTransitionAt: new Date(),
      transitionCount: 0,
      deferredTaskCount: 0,
    };

    logger.info('Load Tier Manager initialized', {
      greenThreshold: this.config.greenThreshold,
      yellowThreshold: this.config.yellowThreshold,
    });
  }

  setCapacityProvider(provider: () => number): void {
    this.capacityProvider = provider;
  }

  getLoadTier(): LoadTier {
    const capacity = this.getCurrentCapacity();
    return this.calculateTier(capacity);
  }

  getCurrentCapacity(): number {
    const capacity = this.capacityProvider();
    this.state.currentCapacity = capacity;
    return capacity;
  }

  private calculateTier(capacity: number): LoadTier {
    let newTier: LoadTier;
    
    if (capacity < this.config.greenThreshold) {
      newTier = 'green';
    } else if (capacity < this.config.yellowThreshold) {
      newTier = 'yellow';
    } else {
      newTier = 'red';
    }

    if (newTier !== this.state.currentTier) {
      this.recordTransition(this.state.currentTier, newTier, capacity);
    }

    return newTier;
  }

  private recordTransition(fromTier: LoadTier, toTier: LoadTier, capacity: number): void {
    const event: TransitionEvent = {
      fromTier,
      toTier,
      capacity,
      timestamp: new Date(),
    };

    this.transitionHistory.push(event);
    if (this.transitionHistory.length > this.maxHistorySize) {
      this.transitionHistory.shift();
    }

    this.state.currentTier = toTier;
    this.state.lastTransitionAt = new Date();
    this.state.transitionCount++;

    const isEscalation = this.getTierLevel(toTier) > this.getTierLevel(fromTier);
    const logFn = isEscalation ? logger.warn : logger.info;
    
    logFn('Load tier transition', {
      fromTier,
      toTier,
      capacity: Math.round(capacity),
      direction: isEscalation ? 'escalation' : 'de-escalation',
      transitionCount: this.state.transitionCount,
    });

    logger.audit('TIER_TRANSITION', {
      fromTier,
      toTier,
      capacity: Math.round(capacity),
      timestamp: event.timestamp.toISOString(),
    });
  }

  private getTierLevel(tier: LoadTier): number {
    switch (tier) {
      case 'green': return 0;
      case 'yellow': return 1;
      case 'red': return 2;
    }
  }

  shouldDeferTask(category: string, tier?: LoadTier): boolean {
    const currentTier = tier || this.getLoadTier();
    
    if (currentTier === 'green') {
      return false;
    }

    if (currentTier === 'red') {
      const shouldDefer = !CRITICAL_CATEGORIES.has(category);
      if (shouldDefer) {
        this.recordDeferral(category, currentTier, 'RED tier - only critical tasks allowed');
      }
      return shouldDefer;
    }

    if (currentTier === 'yellow') {
      const shouldDefer = NON_CRITICAL_CATEGORIES.has(category);
      if (shouldDefer) {
        this.recordDeferral(category, currentTier, 'YELLOW tier - non-critical tasks deferred');
      }
      return shouldDefer;
    }

    return false;
  }

  private recordDeferral(
    category: string,
    tier: LoadTier,
    reason: string,
    taskId?: string
  ): void {
    const event: DeferralEvent = {
      taskId,
      category,
      tier,
      reason,
      timestamp: new Date(),
    };

    this.deferralHistory.push(event);
    if (this.deferralHistory.length > this.maxHistorySize) {
      this.deferralHistory.shift();
    }

    this.state.deferredTaskCount++;

    logger.warn('Task deferred due to load tier', {
      category,
      tier,
      reason,
      taskId,
      totalDeferred: this.state.deferredTaskCount,
    });

    logger.audit('TASK_DEFERRED', {
      category,
      tier,
      reason,
      taskId,
      timestamp: event.timestamp.toISOString(),
    });
  }

  recordTaskDeferred(category: string, taskId?: string): void {
    const tier = this.getLoadTier();
    if (tier !== 'green') {
      const reason = tier === 'red'
        ? 'RED tier - serving cached content only'
        : 'YELLOW tier - deferring non-critical tasks';
      this.recordDeferral(category, tier, reason, taskId);
    }
  }

  getTierBehaviors(tier?: LoadTier): {
    allFeaturesEnabled: boolean;
    deferNonCritical: boolean;
    serveCachedOnly: boolean;
  } {
    const currentTier = tier || this.getLoadTier();
    
    switch (currentTier) {
      case 'green':
        return {
          allFeaturesEnabled: true,
          deferNonCritical: false,
          serveCachedOnly: false,
        };
      case 'yellow':
        return {
          allFeaturesEnabled: false,
          deferNonCritical: true,
          serveCachedOnly: false,
        };
      case 'red':
        return {
          allFeaturesEnabled: false,
          deferNonCritical: true,
          serveCachedOnly: true,
        };
    }
  }

  getMetrics(): LoadTierMetrics {
    const tier = this.getLoadTier();
    const capacity = this.state.currentCapacity;

    return {
      tier,
      capacity: Math.round(capacity),
      thresholds: { ...this.config },
      state: { ...this.state },
      behaviors: this.getTierBehaviors(tier),
      recentDeferrals: this.deferralHistory.slice(-20),
      recentTransitions: this.transitionHistory.slice(-10),
    };
  }

  getState(): LoadTierState {
    return { ...this.state };
  }

  getRecentDeferrals(limit: number = 20): DeferralEvent[] {
    return this.deferralHistory.slice(-limit);
  }

  getRecentTransitions(limit: number = 10): TransitionEvent[] {
    return this.transitionHistory.slice(-limit);
  }

  isCriticalCategory(category: string): boolean {
    return CRITICAL_CATEGORIES.has(category);
  }

  isNonCriticalCategory(category: string): boolean {
    return NON_CRITICAL_CATEGORIES.has(category);
  }

  resetCounters(): void {
    this.state.transitionCount = 0;
    this.state.deferredTaskCount = 0;
    this.deferralHistory = [];
    this.transitionHistory = [];
    logger.info('Load tier counters reset');
  }

  forceSetCapacity(capacity: number): void {
    this.state.currentCapacity = capacity;
    this.calculateTier(capacity);
  }
}

let loadTierManager: LoadTierManager | null = null;

export function getLoadTierManager(): LoadTierManager {
  if (!loadTierManager) {
    loadTierManager = new LoadTierManager();
  }
  return loadTierManager;
}

export function initLoadTierManager(
  config?: Partial<LoadTierConfig>,
  capacityProvider?: () => number
): LoadTierManager {
  loadTierManager = new LoadTierManager(config, capacityProvider);
  return loadTierManager;
}

export function resetLoadTierManager(): void {
  loadTierManager = null;
}

export function getLoadTier(): LoadTier {
  return getLoadTierManager().getLoadTier();
}

export function shouldDeferTask(category: string, tier?: LoadTier): boolean {
  return getLoadTierManager().shouldDeferTask(category, tier);
}

export function getLoadTierMetrics(): LoadTierMetrics {
  return getLoadTierManager().getMetrics();
}
