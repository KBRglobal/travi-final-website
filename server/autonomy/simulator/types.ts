/**
 * Autonomy Simulation Mode - Type Definitions
 * Replay historical traffic against hypothetical policies
 */

import { GuardedFeature } from "../enforcement/types";
import { type PolicyDecision, type BudgetLimit } from "../policy/types";

/**
 * A historical decision record to replay
 */
export interface HistoricalDecision {
  id: string;
  feature: GuardedFeature;
  action: string;
  timestamp: Date;
  originalDecision: PolicyDecision;
  context: {
    entityId?: string;
    contentId?: string;
    locale?: string;
    requesterId?: string;
    estimatedTokens?: number;
    estimatedCost?: number;
    metadata?: Record<string, unknown>;
  };
  outcome?: {
    tokensUsed?: number;
    costCents?: number;
    latencyMs?: number;
    success: boolean;
    hadIncident?: boolean;
    wasOverridden?: boolean;
  };
}

/**
 * Hypothetical policy for simulation
 */
export interface HypotheticalPolicy {
  id: string;
  name: string;
  description?: string;
  budgets: Map<string, BudgetLimit>; // key: feature:period
  riskThresholds?: {
    maxFailureRate?: number;
    maxOverrideRate?: number;
    maxCostPerHour?: number;
  };
  featureOverrides?: Partial<
    Record<
      GuardedFeature,
      {
        enabled: boolean;
        maxActions?: number;
        maxAiSpend?: number;
      }
    >
  >;
}

/**
 * Result of simulating a single decision
 */
export interface SimulatedDecision {
  originalId: string;
  simulatedDecision: PolicyDecision;
  wouldChange: boolean;
  reason?: string;
  budgetState: {
    actionsUsed: number;
    actionsLimit: number;
    spendUsed: number;
    spendLimit: number;
  };
}

/**
 * Aggregated simulation results
 */
export interface SimulationResult {
  id: string;
  policyId: string;
  policyName: string;
  startedAt: Date;
  completedAt: Date;

  // Input stats
  inputRecords: number;
  timeRange: { start: Date; end: Date };
  features: GuardedFeature[];

  // Comparison metrics
  comparison: {
    // Decision changes
    totalDecisions: number;
    decisionsChanged: number;
    changeRate: number;

    // By decision type
    originalBlocks: number;
    simulatedBlocks: number;
    blocksChange: number;

    originalAllows: number;
    simulatedAllows: number;
    allowsChange: number;

    originalWarns: number;
    simulatedWarns: number;
    warnsChange: number;

    // Predicted outcomes if simulated policy was used
    predictedIncidents: number;
    incidentChange: number;

    predictedCostCents: number;
    costChange: number;
    costChangePercent: number;

    predictedOverrides: number;
    overrideChange: number;
  };

  // Per-feature breakdown
  featureBreakdown: Map<GuardedFeature, FeatureSimulationResult>;

  // Time-based analysis
  hourlyImpact: HourlyImpact[];

  // Recommendations
  findings: SimulationFinding[];
}

export interface FeatureSimulationResult {
  feature: GuardedFeature;
  totalDecisions: number;
  decisionsChanged: number;
  blocksChange: number;
  costChange: number;
  riskScore: number; // 0-1, higher = more risky policy change
}

export interface HourlyImpact {
  hour: number; // 0-23
  decisionsChanged: number;
  blocksChange: number;
  costChange: number;
}

export interface SimulationFinding {
  type: "risk" | "opportunity" | "neutral";
  severity: "low" | "medium" | "high";
  feature?: GuardedFeature;
  message: string;
  metric?: string;
  currentValue?: number;
  simulatedValue?: number;
}

/**
 * Simulation run request
 */
export interface SimulationRequest {
  policy: HypotheticalPolicy;
  timeRange: {
    start: Date;
    end: Date;
  };
  features?: GuardedFeature[];
  maxRecords?: number;
}

/**
 * Simulation configuration
 */
export interface SimulatorConfig {
  enabled: boolean;
  maxRecordsPerRun: number;
  maxConcurrentSimulations: number;
  simulationTimeoutMs: number;
  cacheResultsMs: number;
  maxCachedResults: number;
}

export const DEFAULT_SIMULATOR_CONFIG: SimulatorConfig = {
  enabled: process.env.ENABLE_AUTONOMY_SIMULATOR === "true",
  maxRecordsPerRun: 10000,
  maxConcurrentSimulations: 3,
  simulationTimeoutMs: 30000,
  cacheResultsMs: 60 * 60 * 1000, // 1 hour
  maxCachedResults: 20,
};
