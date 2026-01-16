/**
 * Go-Live Control Plane - Dependency Resolver
 *
 * Validates capability dependencies and detects invalid states
 */

import {
  Capability,
  DependencyValidation,
  InvalidStateReport,
  RiskLevel,
} from './types';
import { getAllCapabilities, getCapability } from './registry';

/**
 * Validate all dependencies are satisfied
 */
export function validateDependencies(): DependencyValidation {
  const capabilities = getAllCapabilities();
  const missingDependencies: DependencyValidation['missingDependencies'] = [];
  const circularDependencies: string[][] = [];
  const orphanedCapabilities: string[] = [];

  // Check for missing dependencies
  for (const cap of capabilities) {
    if (cap.status === 'enabled') {
      for (const depId of cap.dependencies) {
        const dep = getCapability(depId);
        if (!dep) {
          missingDependencies.push({
            capabilityId: cap.id,
            missingDep: depId,
            reason: `Dependency "${depId}" does not exist in registry`,
          });
        } else if (dep.status !== 'enabled') {
          missingDependencies.push({
            capabilityId: cap.id,
            missingDep: depId,
            reason: `Dependency "${dep.name}" is not enabled`,
          });
        }
      }
    }
  }

  // Check for circular dependencies
  const circles = detectCircularDependencies(capabilities);
  circularDependencies.push(...circles);

  // Check for orphaned capabilities (no dependents and not critical)
  for (const cap of capabilities) {
    if (
      cap.dependents.length === 0 &&
      cap.dependencies.length === 0 &&
      cap.riskLevel === 'low' &&
      cap.status === 'disabled'
    ) {
      orphanedCapabilities.push(cap.id);
    }
  }

  return {
    valid: missingDependencies.length === 0 && circularDependencies.length === 0,
    missingDependencies,
    circularDependencies,
    orphanedCapabilities,
  };
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(capabilities: Capability[]): string[][] {
  const circles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const capMap = new Map(capabilities.map(c => [c.id, c]));

  function dfs(capId: string, path: string[]): void {
    if (circles.length >= 10) return; // Limit circles detected

    if (recursionStack.has(capId)) {
      const cycleStart = path.indexOf(capId);
      if (cycleStart >= 0) {
        circles.push(path.slice(cycleStart));
      }
      return;
    }

    if (visited.has(capId)) return;

    visited.add(capId);
    recursionStack.add(capId);

    const cap = capMap.get(capId);
    if (cap) {
      for (const depId of cap.dependencies) {
        dfs(depId, [...path, capId]);
      }
    }

    recursionStack.delete(capId);
  }

  for (const cap of capabilities) {
    if (!visited.has(cap.id)) {
      dfs(cap.id, []);
    }
  }

  return circles;
}

/**
 * Detect invalid states in the system
 */
export function detectInvalidStates(): InvalidStateReport {
  const capabilities = getAllCapabilities();
  const issues: InvalidStateReport['issues'] = [];

  for (const cap of capabilities) {
    // Check enabled capabilities with disabled dependencies
    if (cap.status === 'enabled') {
      for (const depId of cap.dependencies) {
        const dep = getCapability(depId);
        if (!dep) {
          issues.push({
            capabilityId: cap.id,
            issue: 'missing_dependency',
            details: `Required dependency "${depId}" not found`,
            severity: 'critical',
            suggestedFix: `Register capability "${depId}" or disable "${cap.name}"`,
          });
        } else if (dep.status !== 'enabled') {
          issues.push({
            capabilityId: cap.id,
            issue: 'missing_dependency',
            details: `Required dependency "${dep.name}" is disabled`,
            severity: 'high',
            suggestedFix: `Enable "${dep.name}" or disable "${cap.name}"`,
          });
        }
      }

      // Check required env vars
      for (const envVar of cap.requiredEnvVars) {
        if (!process.env[envVar]) {
          issues.push({
            capabilityId: cap.id,
            issue: 'missing_env_var',
            details: `Required environment variable "${envVar}" is not set`,
            severity: 'high',
            suggestedFix: `Set ${envVar}=true in environment`,
          });
        }
      }
    }
  }

  // Check for circular dependencies
  const circles = detectCircularDependencies(capabilities);
  for (const circle of circles) {
    issues.push({
      capabilityId: circle[0],
      issue: 'circular_dependency',
      details: `Circular dependency detected: ${circle.join(' -> ')} -> ${circle[0]}`,
      severity: 'critical',
      suggestedFix: 'Break the circular dependency by removing one edge',
    });
  }

  return {
    hasInvalidStates: issues.length > 0,
    issues,
  };
}

/**
 * Get capabilities that can be safely enabled
 */
export function getSafeToEnable(): Capability[] {
  const capabilities = getAllCapabilities();
  const safeToEnable: Capability[] = [];

  for (const cap of capabilities) {
    if (cap.status === 'enabled') continue;

    // Check if all dependencies are satisfied
    let canEnable = true;
    for (const depId of cap.dependencies) {
      const dep = getCapability(depId);
      if (!dep || dep.status !== 'enabled') {
        canEnable = false;
        break;
      }
    }

    if (canEnable) {
      safeToEnable.push(cap);
    }
  }

  // Sort by risk level (safest first)
  const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  safeToEnable.sort((a, b) => riskOrder.indexOf(a.riskLevel) - riskOrder.indexOf(b.riskLevel));

  return safeToEnable;
}

/**
 * Get capabilities that must be disabled before disabling target
 */
export function getMustDisableFirst(targetId: string): Capability[] {
  const target = getCapability(targetId);
  if (!target) return [];

  const mustDisable: Capability[] = [];
  const capabilities = getAllCapabilities();

  // Find all enabled capabilities that depend on target
  for (const cap of capabilities) {
    if (cap.status === 'enabled' && cap.dependencies.includes(targetId)) {
      mustDisable.push(cap);
    }
  }

  return mustDisable;
}

/**
 * Get the enable order for a capability (including dependencies)
 */
export function getEnableOrder(targetId: string): string[] {
  const order: string[] = [];
  const visited = new Set<string>();

  function visit(capId: string): void {
    if (visited.has(capId)) return;
    visited.add(capId);

    const cap = getCapability(capId);
    if (!cap) return;

    // Visit dependencies first
    for (const depId of cap.dependencies) {
      visit(depId);
    }

    order.push(capId);
  }

  visit(targetId);
  return order;
}

/**
 * Get the disable order for a capability (including dependents)
 */
export function getDisableOrder(targetId: string): string[] {
  const order: string[] = [];
  const visited = new Set<string>();

  function visit(capId: string): void {
    if (visited.has(capId)) return;
    visited.add(capId);

    const cap = getCapability(capId);
    if (!cap) return;

    // Visit dependents first (reverse order)
    for (const depId of cap.dependents) {
      visit(depId);
    }

    order.push(capId);
  }

  visit(targetId);
  return order;
}

/**
 * Calculate blast radius of enabling a capability
 */
export function calculateBlastRadius(capId: string): {
  directImpact: Capability[];
  transitiveImpact: Capability[];
  totalAffected: number;
  riskLevel: RiskLevel;
} {
  const cap = getCapability(capId);
  if (!cap) {
    return { directImpact: [], transitiveImpact: [], totalAffected: 0, riskLevel: 'low' };
  }

  const directImpact: Capability[] = [];
  const transitiveImpact: Capability[] = [];
  const visited = new Set<string>();

  // Direct dependents
  for (const depId of cap.dependents) {
    const dep = getCapability(depId);
    if (dep) directImpact.push(dep);
  }

  // Transitive dependents (BFS)
  const queue = [...cap.dependents];
  visited.add(capId);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const current = getCapability(currentId);
    if (!current) continue;

    if (!directImpact.some(d => d.id === currentId)) {
      transitiveImpact.push(current);
    }

    queue.push(...current.dependents);
  }

  const allAffected = [...directImpact, ...transitiveImpact];
  let riskLevel: RiskLevel = cap.riskLevel;
  for (const affected of allAffected) {
    if (affected.riskLevel === 'critical') riskLevel = 'critical';
    else if (affected.riskLevel === 'high' && riskLevel !== 'critical') riskLevel = 'high';
  }

  return {
    directImpact,
    transitiveImpact,
    totalAffected: allAffected.length,
    riskLevel,
  };
}
