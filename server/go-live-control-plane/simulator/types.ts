/**
 * Go-Live Control Plane - Simulator Types
 *
 * Types for feature rollout simulation
 */

import { Capability, RiskLevel, CapabilityDomain } from '../capabilities/types';

/**
 * Simulation action type
 */
export type SimulationAction = 'enable' | 'disable' | 'toggle';

/**
 * Simulation input - what to simulate
 */
export interface SimulationInput {
  capabilityId: string;
  action: SimulationAction;
}

/**
 * Conflict type
 */
export type ConflictType =
  | 'dependency_missing'
  | 'circular_dependency'
  | 'env_var_missing'
  | 'resource_contention'
  | 'incompatible_flags'
  | 'rate_limit_exceeded';

/**
 * Detected conflict
 */
export interface Conflict {
  type: ConflictType;
  severity: 'warning' | 'error' | 'critical';
  affectedCapabilities: string[];
  message: string;
  resolution?: string;
}

/**
 * Impact on a single capability
 */
export interface CapabilityImpact {
  capabilityId: string;
  capabilityName: string;
  currentStatus: 'enabled' | 'disabled';
  projectedStatus: 'enabled' | 'disabled' | 'degraded';
  changeType: 'no_change' | 'enable' | 'disable' | 'degrade';
  reason: string;
  riskLevel: RiskLevel;
}

/**
 * Domain impact summary
 */
export interface DomainImpact {
  domain: CapabilityDomain;
  capabilitiesAffected: number;
  riskLevel: RiskLevel;
  summary: string;
}

/**
 * Resource impact
 */
export interface ResourceImpact {
  resource: string;
  currentUsage: number;
  projectedUsage: number;
  limit: number;
  percentChange: number;
  warning: boolean;
}

/**
 * Simulation result
 */
export interface SimulationResult {
  id: string;
  inputs: SimulationInput[];
  timestamp: Date;
  durationMs: number;

  // Outcome
  feasible: boolean;
  riskLevel: RiskLevel;

  // Impacts
  capabilityImpacts: CapabilityImpact[];
  domainImpacts: DomainImpact[];
  resourceImpacts: ResourceImpact[];

  // Conflicts
  conflicts: Conflict[];
  hasBlockingConflicts: boolean;

  // Ordering
  enableOrder: string[];
  disableOrder: string[];

  // Recommendations
  recommendations: string[];
  rollbackSteps: string[];
}

/**
 * Simulation options
 */
export interface SimulationOptions {
  includeTransitive?: boolean;
  checkResources?: boolean;
  dryRun?: boolean;
  maxDepth?: number;
}

/**
 * Batch simulation input
 */
export interface BatchSimulationInput {
  name: string;
  description?: string;
  actions: SimulationInput[];
  options?: SimulationOptions;
}

/**
 * Comparison between current and simulated state
 */
export interface StateComparison {
  before: {
    enabledCount: number;
    disabledCount: number;
    byDomain: Record<CapabilityDomain, { enabled: number; disabled: number }>;
  };
  after: {
    enabledCount: number;
    disabledCount: number;
    byDomain: Record<CapabilityDomain, { enabled: number; disabled: number }>;
  };
  delta: {
    enabling: string[];
    disabling: string[];
    unchanged: number;
  };
}
