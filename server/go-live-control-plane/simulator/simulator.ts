/**
 * Go-Live Control Plane - Feature Rollout Simulator
 *
 * Simulates capability changes before execution
 */

import { randomUUID } from 'crypto';
import {
  Capability,
  RiskLevel,
  CapabilityDomain,
  isGLCPEnabled,
} from '../capabilities/types';
import {
  getAllCapabilities,
  getCapability,
  groupByDomain,
} from '../capabilities/registry';
import {
  getEnableOrder,
  getDisableOrder,
  calculateBlastRadius,
} from '../capabilities/dependency-resolver';
import {
  SimulationInput,
  SimulationResult,
  SimulationOptions,
  CapabilityImpact,
  DomainImpact,
  ResourceImpact,
  StateComparison,
  BatchSimulationInput,
} from './types';
import {
  detectConflicts,
  hasBlockingConflicts,
  sortConflictsBySeverity,
} from './conflict-detector';

// Simulation cache
const simulationCache = new Map<string, SimulationResult>();
const MAX_CACHE_SIZE = 100;

/**
 * Simulate a single capability change
 */
export function simulate(
  input: SimulationInput,
  options: SimulationOptions = {}
): SimulationResult {
  return simulateBatch([input], options);
}

/**
 * Simulate multiple capability changes
 */
export function simulateBatch(
  inputs: SimulationInput[],
  options: SimulationOptions = {}
): SimulationResult {
  if (!isGLCPEnabled()) {
    return createDisabledResult(inputs);
  }

  const startTime = Date.now();
  const id = randomUUID();

  const {
    includeTransitive = true,
    checkResources = true,
    maxDepth = 10,
  } = options;

  // Build projected state
  const projectedState = buildProjectedState(inputs);

  // Detect conflicts
  const conflicts = sortConflictsBySeverity(
    detectConflicts(inputs, projectedState)
  );
  const hasBlockers = hasBlockingConflicts(conflicts);

  // Calculate impacts
  const capabilityImpacts = calculateCapabilityImpacts(inputs, projectedState, includeTransitive, maxDepth);
  const domainImpacts = calculateDomainImpacts(capabilityImpacts);
  const resourceImpacts = checkResources ? calculateResourceImpacts(projectedState) : [];

  // Determine overall risk
  const riskLevel = determineOverallRisk(capabilityImpacts, domainImpacts, conflicts);

  // Calculate ordering
  const { enableOrder, disableOrder } = calculateOrdering(inputs, projectedState);

  // Generate recommendations
  const recommendations = generateRecommendations(
    inputs,
    conflicts,
    capabilityImpacts,
    riskLevel
  );

  // Generate rollback steps
  const rollbackSteps = generateRollbackSteps(inputs);

  const result: SimulationResult = {
    id,
    inputs,
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
    feasible: !hasBlockers,
    riskLevel,
    capabilityImpacts,
    domainImpacts,
    resourceImpacts,
    conflicts,
    hasBlockingConflicts: hasBlockers,
    enableOrder,
    disableOrder,
    recommendations,
    rollbackSteps,
  };

  // Cache result
  cacheResult(result);

  return result;
}

/**
 * Simulate enabling a capability (convenience method)
 */
export function simulateEnable(capabilityId: string, options?: SimulationOptions): SimulationResult {
  return simulate({ capabilityId, action: 'enable' }, options);
}

/**
 * Simulate disabling a capability (convenience method)
 */
export function simulateDisable(capabilityId: string, options?: SimulationOptions): SimulationResult {
  return simulate({ capabilityId, action: 'disable' }, options);
}

/**
 * Compare current state with simulated state
 */
export function compareStates(inputs: SimulationInput[]): StateComparison {
  const capabilities = getAllCapabilities();
  const projectedState = buildProjectedState(inputs);
  const domainGroups = groupByDomain();

  const before = {
    enabledCount: capabilities.filter(c => c.status === 'enabled').length,
    disabledCount: capabilities.filter(c => c.status === 'disabled').length,
    byDomain: {} as Record<CapabilityDomain, { enabled: number; disabled: number }>,
  };

  const after = {
    enabledCount: 0,
    disabledCount: 0,
    byDomain: {} as Record<CapabilityDomain, { enabled: number; disabled: number }>,
  };

  const enabling: string[] = [];
  const disabling: string[] = [];
  let unchanged = 0;

  for (const group of domainGroups) {
    before.byDomain[group.domain] = {
      enabled: group.capabilities.filter(c => c.status === 'enabled').length,
      disabled: group.capabilities.filter(c => c.status === 'disabled').length,
    };
    after.byDomain[group.domain] = { enabled: 0, disabled: 0 };
  }

  for (const cap of capabilities) {
    const wasEnabled = cap.status === 'enabled';
    const willBeEnabled = projectedState.get(cap.id) ?? wasEnabled;

    if (willBeEnabled) {
      after.enabledCount++;
      after.byDomain[cap.domain].enabled++;
    } else {
      after.disabledCount++;
      after.byDomain[cap.domain].disabled++;
    }

    if (!wasEnabled && willBeEnabled) {
      enabling.push(cap.id);
    } else if (wasEnabled && !willBeEnabled) {
      disabling.push(cap.id);
    } else {
      unchanged++;
    }
  }

  return {
    before,
    after,
    delta: { enabling, disabling, unchanged },
  };
}

/**
 * Get cached simulation result
 */
export function getCachedSimulation(id: string): SimulationResult | undefined {
  return simulationCache.get(id);
}

/**
 * Clear simulation cache
 */
export function clearSimulationCache(): void {
  simulationCache.clear();
}

// === Helper functions ===

function buildProjectedState(inputs: SimulationInput[]): Map<string, boolean> {
  const capabilities = getAllCapabilities();
  const state = new Map<string, boolean>();

  // Initialize with current state
  for (const cap of capabilities) {
    state.set(cap.id, cap.status === 'enabled');
  }

  // Apply inputs
  for (const input of inputs) {
    const currentState = state.get(input.capabilityId);
    if (currentState === undefined) continue;

    switch (input.action) {
      case 'enable':
        state.set(input.capabilityId, true);
        break;
      case 'disable':
        state.set(input.capabilityId, false);
        break;
      case 'toggle':
        state.set(input.capabilityId, !currentState);
        break;
    }
  }

  return state;
}

function calculateCapabilityImpacts(
  inputs: SimulationInput[],
  projectedState: Map<string, boolean>,
  includeTransitive: boolean,
  maxDepth: number
): CapabilityImpact[] {
  const impacts: CapabilityImpact[] = [];
  const capabilities = getAllCapabilities();
  const affectedIds = new Set(inputs.map(i => i.capabilityId));

  // Include transitive impacts
  if (includeTransitive) {
    for (const input of inputs) {
      const blast = calculateBlastRadius(input.capabilityId);
      for (const dep of [...blast.directImpact, ...blast.transitiveImpact]) {
        affectedIds.add(dep.id);
      }
    }
  }

  for (const cap of capabilities) {
    const wasEnabled = cap.status === 'enabled';
    const willBeEnabled = projectedState.get(cap.id) ?? wasEnabled;
    const isDirectlyAffected = affectedIds.has(cap.id);

    if (!isDirectlyAffected && wasEnabled === willBeEnabled) continue;

    let changeType: CapabilityImpact['changeType'] = 'no_change';
    let projectedStatus: CapabilityImpact['projectedStatus'] = willBeEnabled ? 'enabled' : 'disabled';
    let reason = '';

    if (!wasEnabled && willBeEnabled) {
      changeType = 'enable';
      reason = inputs.some(i => i.capabilityId === cap.id && i.action === 'enable')
        ? 'Directly enabled by rollout'
        : 'Dependency enabled';
    } else if (wasEnabled && !willBeEnabled) {
      changeType = 'disable';
      reason = inputs.some(i => i.capabilityId === cap.id && i.action === 'disable')
        ? 'Directly disabled by rollout'
        : 'Dependent on disabled capability';
    }

    impacts.push({
      capabilityId: cap.id,
      capabilityName: cap.name,
      currentStatus: wasEnabled ? 'enabled' : 'disabled',
      projectedStatus,
      changeType,
      reason,
      riskLevel: cap.riskLevel,
    });
  }

  return impacts;
}

function calculateDomainImpacts(capabilityImpacts: CapabilityImpact[]): DomainImpact[] {
  const capabilities = getAllCapabilities();
  const capMap = new Map(capabilities.map(c => [c.id, c]));
  const domainStats: Record<string, { affected: number; riskLevel: RiskLevel; changes: string[] }> = {};

  for (const impact of capabilityImpacts) {
    if (impact.changeType === 'no_change') continue;

    const cap = capMap.get(impact.capabilityId);
    if (!cap) continue;

    if (!domainStats[cap.domain]) {
      domainStats[cap.domain] = { affected: 0, riskLevel: 'low', changes: [] };
    }

    domainStats[cap.domain].affected++;
    domainStats[cap.domain].changes.push(`${impact.changeType}: ${cap.name}`);

    // Upgrade risk level if needed
    const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    if (riskOrder.indexOf(cap.riskLevel) > riskOrder.indexOf(domainStats[cap.domain].riskLevel)) {
      domainStats[cap.domain].riskLevel = cap.riskLevel;
    }
  }

  return Object.entries(domainStats).map(([domain, stats]) => ({
    domain: domain as CapabilityDomain,
    capabilitiesAffected: stats.affected,
    riskLevel: stats.riskLevel,
    summary: stats.changes.join(', '),
  }));
}

function calculateResourceImpacts(projectedState: Map<string, boolean>): ResourceImpact[] {
  // Simplified resource impact calculation
  const impacts: ResourceImpact[] = [];
  const capabilities = getAllCapabilities();

  let memoryUsage = 0;
  let cpuUsage = 0;

  for (const cap of capabilities) {
    const willBeEnabled = projectedState.get(cap.id);
    if (!willBeEnabled) continue;

    // Estimate based on risk level
    switch (cap.riskLevel) {
      case 'critical':
        memoryUsage += 256;
        cpuUsage += 20;
        break;
      case 'high':
        memoryUsage += 128;
        cpuUsage += 10;
        break;
      case 'medium':
        memoryUsage += 64;
        cpuUsage += 5;
        break;
      case 'low':
        memoryUsage += 32;
        cpuUsage += 2;
        break;
    }
  }

  impacts.push({
    resource: 'memory',
    currentUsage: memoryUsage * 0.8, // Assume 80% of projected
    projectedUsage: memoryUsage,
    limit: 2048,
    percentChange: 25,
    warning: memoryUsage > 1800,
  });

  impacts.push({
    resource: 'cpu',
    currentUsage: cpuUsage * 0.8,
    projectedUsage: cpuUsage,
    limit: 100,
    percentChange: 25,
    warning: cpuUsage > 80,
  });

  return impacts;
}

function determineOverallRisk(
  capabilityImpacts: CapabilityImpact[],
  domainImpacts: DomainImpact[],
  conflicts: { severity: string }[]
): RiskLevel {
  // Start with highest capability risk
  let maxRisk: RiskLevel = 'low';
  const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

  for (const impact of capabilityImpacts) {
    if (riskOrder.indexOf(impact.riskLevel) > riskOrder.indexOf(maxRisk)) {
      maxRisk = impact.riskLevel;
    }
  }

  // Escalate based on number of affected domains
  if (domainImpacts.length > 3 && maxRisk === 'low') {
    maxRisk = 'medium';
  }
  if (domainImpacts.length > 5 && maxRisk === 'medium') {
    maxRisk = 'high';
  }

  // Escalate based on conflicts
  if (conflicts.some(c => c.severity === 'critical')) {
    maxRisk = 'critical';
  } else if (conflicts.some(c => c.severity === 'error') && maxRisk !== 'critical') {
    maxRisk = 'high';
  }

  return maxRisk;
}

function calculateOrdering(
  inputs: SimulationInput[],
  projectedState: Map<string, boolean>
): { enableOrder: string[]; disableOrder: string[] } {
  const enableOrder: string[] = [];
  const disableOrder: string[] = [];

  const capabilities = getAllCapabilities();

  for (const cap of capabilities) {
    const wasEnabled = cap.status === 'enabled';
    const willBeEnabled = projectedState.get(cap.id) ?? wasEnabled;

    if (!wasEnabled && willBeEnabled) {
      // Get full enable order for this capability
      const order = getEnableOrder(cap.id);
      for (const id of order) {
        if (!enableOrder.includes(id)) {
          enableOrder.push(id);
        }
      }
    } else if (wasEnabled && !willBeEnabled) {
      // Get full disable order for this capability
      const order = getDisableOrder(cap.id);
      for (const id of order) {
        if (!disableOrder.includes(id)) {
          disableOrder.push(id);
        }
      }
    }
  }

  return { enableOrder, disableOrder };
}

function generateRecommendations(
  inputs: SimulationInput[],
  conflicts: { severity: string; message: string }[],
  impacts: CapabilityImpact[],
  riskLevel: RiskLevel
): string[] {
  const recommendations: string[] = [];

  // Conflict-based recommendations
  if (conflicts.length > 0) {
    recommendations.push('Resolve conflicts before proceeding with rollout');
  }

  // Risk-based recommendations
  if (riskLevel === 'critical') {
    recommendations.push('Critical risk: Execute during maintenance window only');
    recommendations.push('Ensure rollback plan is tested and ready');
  } else if (riskLevel === 'high') {
    recommendations.push('High risk: Monitor closely after deployment');
    recommendations.push('Have rollback commands ready');
  }

  // Impact-based recommendations
  const enableCount = impacts.filter(i => i.changeType === 'enable').length;
  const disableCount = impacts.filter(i => i.changeType === 'disable').length;

  if (enableCount > 5) {
    recommendations.push(`Enabling ${enableCount} capabilities - consider staged rollout`);
  }
  if (disableCount > 3) {
    recommendations.push(`Disabling ${disableCount} capabilities - verify no active users`);
  }

  return recommendations;
}

function generateRollbackSteps(inputs: SimulationInput[]): string[] {
  const steps: string[] = [];

  for (const input of inputs) {
    const cap = getCapability(input.capabilityId);
    if (!cap) continue;

    switch (input.action) {
      case 'enable':
        steps.push(`Disable ${cap.name}: unset ${cap.envVarName}`);
        break;
      case 'disable':
        steps.push(`Re-enable ${cap.name}: set ${cap.envVarName}=true`);
        break;
      case 'toggle':
        steps.push(`Toggle ${cap.name} back to original state`);
        break;
    }
  }

  steps.push('Restart affected services');
  steps.push('Verify system health after rollback');

  return steps;
}

function cacheResult(result: SimulationResult): void {
  // Evict oldest if at capacity
  if (simulationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = simulationCache.keys().next().value;
    if (firstKey) simulationCache.delete(firstKey);
  }

  simulationCache.set(result.id, result);
}

function createDisabledResult(inputs: SimulationInput[]): SimulationResult {
  return {
    id: 'glcp-disabled',
    inputs,
    timestamp: new Date(),
    durationMs: 0,
    feasible: false,
    riskLevel: 'low',
    capabilityImpacts: [],
    domainImpacts: [],
    resourceImpacts: [],
    conflicts: [],
    hasBlockingConflicts: false,
    enableOrder: [],
    disableOrder: [],
    recommendations: ['Enable GLCP with ENABLE_GLCP=true to run simulations'],
    rollbackSteps: [],
  };
}
