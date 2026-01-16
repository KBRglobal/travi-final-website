/**
 * Go-Live Control Plane - API Serializers
 *
 * Response serialization for the GLCP API
 */

import { Capability, CapabilityDomain, RiskLevel } from '../capabilities/types';
import { ReadinessResult, ReadinessStatus, ProbeResult } from '../readiness/results';
import { SimulationResult, CapabilityImpact, Conflict } from '../simulator/types';
import { ExecutionPlan, ExecutionResult, ExecutionStep, AuditEntry } from '../executor/types';

/**
 * Serialized capability for API response
 */
export interface SerializedCapability {
  id: string;
  name: string;
  description: string;
  domain: CapabilityDomain;
  status: 'enabled' | 'disabled';
  riskLevel: RiskLevel;
  dependencies: string[];
  dependents: string[];
  envVarName: string;
  requiredEnvVars: string[];
  metadata: Record<string, unknown>;
}

/**
 * Serialized readiness result
 */
export interface SerializedReadiness {
  status: ReadinessStatus;
  canGoLive: boolean;
  score: number;
  summary: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
  };
  probes: {
    name: string;
    category: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    durationMs: number;
  }[];
  blockingIssues: string[];
  warnings: string[];
  recommendations: string[];
  evaluatedAt: string;
  durationMs: number;
}

/**
 * Serialized simulation result
 */
export interface SerializedSimulation {
  id: string;
  feasible: boolean;
  riskLevel: RiskLevel;
  summary: {
    capabilitiesAffected: number;
    domainsAffected: number;
    conflictsFound: number;
    hasBlockers: boolean;
  };
  impacts: {
    capabilityId: string;
    name: string;
    change: 'enable' | 'disable' | 'no_change' | 'degrade';
    riskLevel: RiskLevel;
    reason: string;
  }[];
  conflicts: {
    type: string;
    severity: 'warning' | 'error' | 'critical';
    message: string;
    resolution?: string;
  }[];
  ordering: {
    enableFirst: string[];
    disableFirst: string[];
  };
  recommendations: string[];
  rollbackSteps: string[];
  timestamp: string;
  durationMs: number;
}

/**
 * Serialized execution plan
 */
export interface SerializedPlan {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  totalSteps: number;
  riskLevel: RiskLevel;
  affectedDomains: CapabilityDomain[];
  requiresApproval: boolean;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  scheduledFor?: string;
  expiresAt?: string;
  steps: {
    id: string;
    order: number;
    capability: string;
    action: 'enable' | 'disable';
    status: string;
  }[];
}

/**
 * Serialized execution result
 */
export interface SerializedExecution {
  executionId: string;
  planId: string;
  status: string;
  progress: {
    completed: number;
    failed: number;
    skipped: number;
    total: number;
    percentComplete: number;
  };
  success: boolean;
  errors: string[];
  warnings: string[];
  rolledBack: boolean;
  rollbackReason?: string;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  steps: {
    id: string;
    capability: string;
    action: string;
    status: string;
    durationMs?: number;
    error?: string;
  }[];
}

/**
 * Dashboard summary
 */
export interface DashboardSummary {
  readiness: {
    status: ReadinessStatus;
    score: number;
    canGoLive: boolean;
  };
  capabilities: {
    total: number;
    enabled: number;
    disabled: number;
    byRisk: Record<RiskLevel, number>;
    byDomain: Record<CapabilityDomain, { enabled: number; disabled: number }>;
  };
  recentExecutions: {
    total: number;
    successful: number;
    failed: number;
    rolledBack: number;
  };
  issues: {
    blocking: number;
    warnings: number;
  };
  lastChecked: string;
}

// === Serializer functions ===

export function serializeCapability(cap: Capability): SerializedCapability {
  return {
    id: cap.id,
    name: cap.name,
    description: cap.description,
    domain: cap.domain,
    status: cap.status,
    riskLevel: cap.riskLevel,
    dependencies: cap.dependencies,
    dependents: cap.dependents,
    envVarName: cap.envVarName,
    requiredEnvVars: cap.requiredEnvVars,
    metadata: cap.metadata,
  };
}

export function serializeReadiness(result: ReadinessResult): SerializedReadiness {
  const score = result.probes.length > 0
    ? Math.round(((result.summary.passed + result.summary.warned * 0.5) / result.summary.total) * 100)
    : 100;

  return {
    status: result.status,
    canGoLive: result.status !== 'BLOCKED',
    score,
    summary: {
      total: result.summary.total,
      passed: result.summary.passed,
      warned: result.summary.warned,
      failed: result.summary.failed,
    },
    probes: result.probes.map(p => ({
      name: p.name,
      category: p.category,
      status: p.status,
      message: p.message,
      durationMs: p.durationMs,
    })),
    blockingIssues: result.blockingIssues,
    warnings: result.warnings,
    recommendations: result.recommendations,
    evaluatedAt: result.evaluatedAt.toISOString(),
    durationMs: result.durationMs,
  };
}

export function serializeSimulation(result: SimulationResult): SerializedSimulation {
  return {
    id: result.id,
    feasible: result.feasible,
    riskLevel: result.riskLevel,
    summary: {
      capabilitiesAffected: result.capabilityImpacts.filter(i => i.changeType !== 'no_change').length,
      domainsAffected: result.domainImpacts.length,
      conflictsFound: result.conflicts.length,
      hasBlockers: result.hasBlockingConflicts,
    },
    impacts: result.capabilityImpacts.map(i => ({
      capabilityId: i.capabilityId,
      name: i.capabilityName,
      change: i.changeType,
      riskLevel: i.riskLevel,
      reason: i.reason,
    })),
    conflicts: result.conflicts.map(c => ({
      type: c.type,
      severity: c.severity,
      message: c.message,
      resolution: c.resolution,
    })),
    ordering: {
      enableFirst: result.enableOrder,
      disableFirst: result.disableOrder,
    },
    recommendations: result.recommendations,
    rollbackSteps: result.rollbackSteps,
    timestamp: result.timestamp.toISOString(),
    durationMs: result.durationMs,
  };
}

export function serializePlan(plan: ExecutionPlan): SerializedPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    createdAt: plan.createdAt.toISOString(),
    createdBy: plan.createdBy,
    totalSteps: plan.totalSteps,
    riskLevel: plan.riskLevel,
    affectedDomains: plan.affectedDomains,
    requiresApproval: plan.requiresApproval,
    approved: !!plan.approvedBy,
    approvedBy: plan.approvedBy,
    approvedAt: plan.approvedAt?.toISOString(),
    scheduledFor: plan.scheduledFor?.toISOString(),
    expiresAt: plan.expiresAt?.toISOString(),
    steps: plan.steps.map(s => ({
      id: s.id,
      order: s.order,
      capability: s.capabilityName,
      action: s.action,
      status: s.status,
    })),
  };
}

export function serializeExecution(result: ExecutionResult): SerializedExecution {
  const total = result.steps.length;
  const percentComplete = total > 0
    ? Math.round(((result.stepsCompleted + result.stepsFailed + result.stepsSkipped) / total) * 100)
    : 100;

  return {
    executionId: result.executionId,
    planId: result.planId,
    status: result.status,
    progress: {
      completed: result.stepsCompleted,
      failed: result.stepsFailed,
      skipped: result.stepsSkipped,
      total,
      percentComplete,
    },
    success: result.success,
    errors: result.errors,
    warnings: result.warnings,
    rolledBack: result.rolledBack,
    rollbackReason: result.rollbackReason,
    startedAt: result.startedAt.toISOString(),
    completedAt: result.completedAt?.toISOString(),
    durationMs: result.durationMs,
    steps: result.steps.map(s => ({
      id: s.id,
      capability: s.capabilityName,
      action: s.action,
      status: s.status,
      durationMs: s.durationMs,
      error: s.error,
    })),
  };
}

export function serializeAuditEntry(entry: AuditEntry): {
  timestamp: string;
  action: string;
  details: string;
  actor: string;
  success: boolean;
} {
  return {
    timestamp: entry.timestamp.toISOString(),
    action: entry.action,
    details: entry.details,
    actor: entry.actor,
    success: entry.success,
  };
}
