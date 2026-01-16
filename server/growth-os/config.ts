/**
 * Growth OS Configuration
 *
 * Feature flags and configuration for the Autonomous Growth Operating System.
 * All subsystems are disabled by default.
 */

export interface GrowthOSConfig {
  /** Master switch for all Growth OS features */
  enabled: boolean;
  /** Enable signal unification layer */
  enableSignals: boolean;
  /** Enable prioritization engine */
  enablePrioritization: boolean;
  /** Enable action synthesis */
  enableActions: boolean;
  /** Enable safety layer */
  enableSafety: boolean;
  /** Enable executive API */
  enableApi: boolean;
  /** Signal decay half-life in hours */
  signalDecayHalfLifeHours: number;
  /** Maximum signals to keep in memory per category */
  maxSignalsPerCategory: number;
  /** Maximum action candidates to generate */
  maxActionCandidates: number;
  /** Default timeout for async operations in ms */
  defaultTimeoutMs: number;
  /** Batch size for execution planning */
  executionBatchSize: number;
}

export function isGrowthOSEnabled(): boolean {
  return process.env.ENABLE_GROWTH_OS === 'true';
}

export function isSignalsEnabled(): boolean {
  return process.env.ENABLE_GROWTH_OS_SIGNALS === 'true';
}

export function isPrioritizationEnabled(): boolean {
  return process.env.ENABLE_GROWTH_OS_PRIORITIZATION === 'true';
}

export function isActionsEnabled(): boolean {
  return process.env.ENABLE_GROWTH_OS_ACTIONS === 'true';
}

export function isSafetyEnabled(): boolean {
  return process.env.ENABLE_GROWTH_OS_SAFETY === 'true';
}

export function isApiEnabled(): boolean {
  return process.env.ENABLE_GROWTH_OS_API === 'true';
}

export function getGrowthOSConfig(): GrowthOSConfig {
  return {
    enabled: isGrowthOSEnabled(),
    enableSignals: isSignalsEnabled(),
    enablePrioritization: isPrioritizationEnabled(),
    enableActions: isActionsEnabled(),
    enableSafety: isSafetyEnabled(),
    enableApi: isApiEnabled(),
    signalDecayHalfLifeHours: parseInt(process.env.GROWTH_OS_SIGNAL_DECAY_HOURS || '24', 10),
    maxSignalsPerCategory: parseInt(process.env.GROWTH_OS_MAX_SIGNALS || '1000', 10),
    maxActionCandidates: parseInt(process.env.GROWTH_OS_MAX_ACTIONS || '100', 10),
    defaultTimeoutMs: parseInt(process.env.GROWTH_OS_TIMEOUT_MS || '30000', 10),
    executionBatchSize: parseInt(process.env.GROWTH_OS_BATCH_SIZE || '10', 10),
  };
}

/**
 * Scoring dimension weights for prioritization
 */
export const SCORING_WEIGHTS = {
  trafficLift: 0.20,
  revenueLift: 0.25,
  confidence: 0.15,
  risk: 0.15,
  blastRadius: 0.10,
  executionCost: 0.10,
  strategicAlignment: 0.05,
};

/**
 * Risk thresholds
 */
export const RISK_THRESHOLDS = {
  low: 30,
  medium: 60,
  high: 80,
  critical: 95,
};

/**
 * Autonomy levels for action execution
 */
export type AutonomyLevel = 'full' | 'supervised' | 'manual' | 'disabled';

export function getAutonomyLevel(): AutonomyLevel {
  const level = process.env.GROWTH_OS_AUTONOMY_LEVEL || 'manual';
  if (['full', 'supervised', 'manual', 'disabled'].includes(level)) {
    return level as AutonomyLevel;
  }
  return 'manual';
}
