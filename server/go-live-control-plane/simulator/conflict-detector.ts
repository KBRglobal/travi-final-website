/**
 * Go-Live Control Plane - Conflict Detector
 *
 * Detects conflicts in proposed capability changes
 */

import { Capability } from '../capabilities/types';
import { getCapability, getAllCapabilities } from '../capabilities/registry';
import { Conflict, ConflictType, SimulationInput } from './types';

/**
 * Known incompatible flag pairs
 */
const INCOMPATIBLE_PAIRS: [string, string, string][] = [
  // [flag1, flag2, reason]
  ['ENABLE_MEDIA_AUTO_APPLY', 'ENABLE_MEDIA_DESTRUCTIVE_OPS', 'Auto-apply with destructive ops is dangerous'],
  ['ENABLE_SYNC_MODE', 'ENABLE_ASYNC_PROCESSING', 'Cannot use both sync and async modes'],
];

/**
 * Resource limits by flag
 */
const RESOURCE_DEMANDS: Record<string, { resource: string; demand: number }[]> = {
  'ENABLE_MEDIA_INTELLIGENCE': [
    { resource: 'memory', demand: 256 },
    { resource: 'cpu', demand: 10 },
  ],
  'ENABLE_CONTENT_GRAPH': [
    { resource: 'memory', demand: 128 },
    { resource: 'cpu', demand: 5 },
  ],
  'ENABLE_MEDIA_ALT_AI': [
    { resource: 'api_calls', demand: 100 },
  ],
  'ENABLE_BACKGROUND_WORKERS': [
    { resource: 'memory', demand: 512 },
    { resource: 'connections', demand: 10 },
  ],
};

/**
 * Detect all conflicts for proposed changes
 */
export function detectConflicts(
  inputs: SimulationInput[],
  projectedState: Map<string, boolean>
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Check dependency conflicts
  conflicts.push(...detectDependencyConflicts(inputs, projectedState));

  // Check incompatible flags
  conflicts.push(...detectIncompatibleFlags(projectedState));

  // Check env var requirements
  conflicts.push(...detectEnvVarConflicts(projectedState));

  // Check resource contention
  conflicts.push(...detectResourceContention(projectedState));

  return conflicts;
}

/**
 * Detect dependency-related conflicts
 */
function detectDependencyConflicts(
  inputs: SimulationInput[],
  projectedState: Map<string, boolean>
): Conflict[] {
  const conflicts: Conflict[] = [];
  const capabilities = getAllCapabilities();
  const capMap = new Map(capabilities.map(c => [c.id, c]));

  for (const input of inputs) {
    const cap = capMap.get(input.capabilityId);
    if (!cap) continue;

    if (input.action === 'enable' || (input.action === 'toggle' && !projectedState.get(input.capabilityId))) {
      // Enabling - check dependencies are enabled
      for (const depId of cap.dependencies) {
        const depEnabled = projectedState.get(depId);
        if (!depEnabled) {
          const dep = capMap.get(depId);
          conflicts.push({
            type: 'dependency_missing',
            severity: 'error',
            affectedCapabilities: [input.capabilityId, depId],
            message: `Cannot enable "${cap.name}" - dependency "${dep?.name || depId}" is not enabled`,
            resolution: `Enable "${dep?.name || depId}" first, or include it in the rollout`,
          });
        }
      }
    }

    if (input.action === 'disable' || (input.action === 'toggle' && projectedState.get(input.capabilityId))) {
      // Disabling - check no dependents are enabled
      for (const depId of cap.dependents) {
        const depEnabled = projectedState.get(depId);
        if (depEnabled) {
          const dep = capMap.get(depId);
          conflicts.push({
            type: 'dependency_missing',
            severity: 'error',
            affectedCapabilities: [input.capabilityId, depId],
            message: `Cannot disable "${cap.name}" - "${dep?.name || depId}" depends on it`,
            resolution: `Disable "${dep?.name || depId}" first, or include it in the rollout`,
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Detect incompatible flag combinations
 */
function detectIncompatibleFlags(projectedState: Map<string, boolean>): Conflict[] {
  const conflicts: Conflict[] = [];
  const capabilities = getAllCapabilities();

  for (const [flag1, flag2, reason] of INCOMPATIBLE_PAIRS) {
    const cap1 = capabilities.find(c => (c as any).envVarName === flag1);
    const cap2 = capabilities.find(c => (c as any).envVarName === flag2);

    if (!cap1 || !cap2) continue;

    const enabled1 = projectedState.get(cap1.id);
    const enabled2 = projectedState.get(cap2.id);

    if (enabled1 && enabled2) {
      conflicts.push({
        type: 'incompatible_flags',
        severity: 'warning',
        affectedCapabilities: [cap1.id, cap2.id],
        message: `Incompatible flags: "${cap1.name}" and "${cap2.name}" - ${reason}`,
        resolution: `Disable one of the conflicting capabilities`,
      });
    }
  }

  return conflicts;
}

/**
 * Detect missing environment variables
 */
function detectEnvVarConflicts(projectedState: Map<string, boolean>): Conflict[] {
  const conflicts: Conflict[] = [];
  const capabilities = getAllCapabilities();
  const capMap = new Map(capabilities.map(c => [c.id, c]));

  for (const [capId, enabled] of projectedState) {
    if (!enabled) continue;

    const cap = capMap.get(capId);
    if (!cap) continue;

    for (const envVar of cap.requiredEnvVars) {
      if (!process.env[envVar]) {
        conflicts.push({
          type: 'env_var_missing',
          severity: 'error',
          affectedCapabilities: [capId],
          message: `Missing required env var "${envVar}" for "${cap.name}"`,
          resolution: `Set ${envVar} before enabling this capability`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Detect resource contention
 */
function detectResourceContention(projectedState: Map<string, boolean>): Conflict[] {
  const conflicts: Conflict[] = [];
  const capabilities = getAllCapabilities();

  // Calculate total resource usage
  const resourceUsage: Record<string, { current: number; projected: number; caps: string[] }> = {};

  for (const cap of capabilities) {
    const demands = RESOURCE_DEMANDS[(cap as any).envVarName];
    if (!demands) continue;

    const wasEnabled = cap.status === 'enabled';
    const willBeEnabled = projectedState.get(cap.id) ?? wasEnabled;

    for (const { resource, demand } of demands) {
      if (!resourceUsage[resource]) {
        resourceUsage[resource] = { current: 0, projected: 0, caps: [] };
      }

      if (wasEnabled) {
        resourceUsage[resource].current += demand;
      }
      if (willBeEnabled) {
        resourceUsage[resource].projected += demand;
        resourceUsage[resource].caps.push(cap.id);
      }
    }
  }

  // Check for concerning resource usage
  const RESOURCE_LIMITS: Record<string, number> = {
    memory: 2048, // MB
    cpu: 100, // percent
    api_calls: 1000, // per minute
    connections: 100,
  };

  for (const [resource, usage] of Object.entries(resourceUsage)) {
    const limit = RESOURCE_LIMITS[resource] || 1000;
    const percentOfLimit = (usage.projected / limit) * 100;

    if (percentOfLimit > 90) {
      conflicts.push({
        type: 'resource_contention',
        severity: percentOfLimit > 100 ? 'error' : 'warning',
        affectedCapabilities: usage.caps,
        message: `Resource "${resource}" at ${percentOfLimit.toFixed(0)}% capacity (${usage.projected}/${limit})`,
        resolution: `Reduce enabled capabilities or increase resource limits`,
      });
    }
  }

  return conflicts;
}

/**
 * Check if conflicts block the rollout
 */
export function hasBlockingConflicts(conflicts: Conflict[]): boolean {
  return conflicts.some(c => c.severity === 'error' || c.severity === 'critical');
}

/**
 * Sort conflicts by severity
 */
export function sortConflictsBySeverity(conflicts: Conflict[]): Conflict[] {
  const severityOrder = { critical: 0, error: 1, warning: 2 };
  return [...conflicts].sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity]
  );
}

/**
 * Group conflicts by type
 */
export function groupConflictsByType(conflicts: Conflict[]): Record<ConflictType, Conflict[]> {
  const grouped: Partial<Record<ConflictType, Conflict[]>> = {};

  for (const conflict of conflicts) {
    if (!grouped[conflict.type]) {
      grouped[conflict.type] = [];
    }
    grouped[conflict.type]!.push(conflict);
  }

  return grouped as Record<ConflictType, Conflict[]>;
}
