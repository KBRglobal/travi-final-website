/**
 * Platform State — Types
 *
 * Canonical types for the Single Source of Truth snapshot
 */

import type {
  SystemHealthState,
  FeatureAvailability,
  IntentType,
  ContradictionType,
} from '../platform-contract';

// ============================================================
// SNAPSHOT COMPONENTS
// ============================================================

/**
 * Readiness state from go-live/readiness systems
 */
export interface ReadinessState {
  score: number;                    // 0-100
  status: 'ready' | 'not_ready' | 'blocked' | 'overridden';
  blockers: string[];
  lastCheck: Date;
}

/**
 * Autonomy state from autonomy governor
 */
export interface AutonomyState {
  mode: 'normal' | 'degraded' | 'restricted' | 'halted';
  dailyActionsUsed: number;
  dailyActionsLimit: number;
  hourlyActionsUsed: number;
  hourlyActionsLimit: number;
  budgetUsedPercent: number;
  restrictions: string[];
}

/**
 * Governance state from approval/policy systems
 */
export interface GovernanceState {
  blockedApprovals: number;
  pendingApprovals: number;
  activeOverrides: number;
  recentViolations: number;
  policyStatus: 'enforcing' | 'monitoring' | 'disabled';
}

/**
 * Risk summary from risk registry
 */
export interface RiskSummary {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topRisks: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    domain: string;
  }>;
  lastUpdated: Date;
}

/**
 * Incident summary from incident manager
 */
export interface IncidentSummary {
  activeCritical: number;
  activeHigh: number;
  activeMedium: number;
  activeLow: number;
  recentIncidents: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'active' | 'investigating' | 'mitigating';
    startedAt: Date;
  }>;
  lastIncidentAt?: Date;
}

/**
 * Feature state
 */
export interface FeatureState {
  id: string;
  name: string;
  enabled: boolean;
  availability: FeatureAvailability;
  constraints?: string[];
  lastChanged?: Date;
}

// ============================================================
// THE SNAPSHOT — Single Atomic State
// ============================================================

export interface PlatformSnapshot {
  // Metadata
  id: string;
  timestamp: Date;
  ttlSeconds: number;
  expiresAt: Date;

  // Computed overall health
  health: SystemHealthState;
  healthScore: number;          // 0-100 composite

  // Component states
  readiness: ReadinessState;
  autonomy: AutonomyState;
  governance: GovernanceState;
  risks: RiskSummary;
  incidents: IncidentSummary;

  // Feature availability
  features: FeatureState[];

  // Detected contradictions
  contradictions: ContradictionSignal[];

  // Summary for humans
  summary: {
    headline: string;           // One-line status
    recommendation: string;     // What to do
    canGoLive: boolean;
    canOperate: boolean;
    requiresAttention: boolean;
  };

  // Provenance
  sources: Array<{
    system: string;
    status: 'ok' | 'timeout' | 'error' | 'stale';
    latencyMs: number;
  }>;
}

// ============================================================
// FEATURE AVAILABILITY MATRIX
// ============================================================

export interface FeatureAvailabilityEntry {
  featureId: string;
  featureName: string;
  availability: FeatureAvailability;
  reason: string;
  blockedBy?: string[];
  constraints?: string[];
  requiresApprovalFrom?: string[];
}

export interface AvailabilityMatrix {
  timestamp: Date;
  systemHealth: SystemHealthState;
  features: FeatureAvailabilityEntry[];
  summary: {
    available: number;
    constrained: number;
    blocked: number;
    requiresApproval: number;
    simulatedOnly: number;
  };
}

// ============================================================
// INTENT GATE (can-i API)
// ============================================================

export interface IntentRequest {
  intent: IntentType;
  context?: {
    entityId?: string;
    entityType?: string;
    userId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface IntentResponse {
  intent: IntentType;
  allowed: boolean;
  confidence: number;           // 0-100
  reason: string;
  requiredActions: string[];
  constraints?: string[];
  alternativeIntents?: IntentType[];
  evaluatedAt: Date;
  snapshotId: string;
}

// ============================================================
// CONTRADICTION DETECTION
// ============================================================

export interface ContradictionSignal {
  id: string;
  type: ContradictionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;

  // The conflicting signals
  signalA: {
    source: string;
    value: string;
    interpretation: string;
  };
  signalB: {
    source: string;
    value: string;
    interpretation: string;
  };

  // Resolution
  suggestedResolution: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ContradictionReport {
  timestamp: Date;
  snapshotId: string;
  contradictions: ContradictionSignal[];
  overallCoherence: 'coherent' | 'minor_issues' | 'conflicting' | 'chaotic';
  coherenceScore: number;       // 0-100
}

// ============================================================
// AGGREGATION METADATA
// ============================================================

export interface AggregationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  latencyMs: number;
  stale: boolean;
  cachedAt?: Date;
}
