/**
 * Policy Simulator - What-If Analysis for Policy Changes
 *
 * Before deploying policy changes, simulate their impact:
 * - Who gains/loses access?
 * - What operations are affected?
 * - Are there unintended consequences?
 */

import { policyEngine } from "../../governance/policy-engine";
import { PolicyRule, PolicyEffect } from "../../governance/types";

import { lintPolicies, LintResult } from "./policy-linter";

// ============================================================================
// SIMULATION TYPES
// ============================================================================

export interface SimulationScenario {
  userId: string;
  role: string;
  action: string;
  resource: string;
  context?: Partial<any>;
}

export interface AccessChange {
  scenario: SimulationScenario;
  before: {
    allowed: boolean;
    effect: PolicyEffect | "no_match";
    matchingPolicies: string[];
  };
  after: {
    allowed: boolean;
    effect: PolicyEffect | "no_match";
    matchingPolicies: string[];
  };
  changeType: "gained_access" | "lost_access" | "effect_changed" | "no_change";
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface SimulationResult {
  timestamp: Date;
  proposedChanges: PolicyChange[];
  accessChanges: AccessChange[];
  lintBefore: LintResult;
  lintAfter: LintResult;
  riskAssessment: {
    totalChanges: number;
    accessGained: number;
    accessLost: number;
    criticalChanges: number;
    highRiskChanges: number;
    newIssues: number;
    resolvedIssues: number;
  };
  recommendation: "safe_to_deploy" | "review_required" | "do_not_deploy";
  warnings: string[];
}

export interface PolicyChange {
  type: "add" | "update" | "delete";
  policyId: string;
  before?: PolicyRule;
  after?: PolicyRule;
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Generate comprehensive test scenarios
 */
function generateTestScenarios(): SimulationScenario[] {
  const roles: string[] = [
    "super_admin",
    "system_admin",
    "manager",
    "ops",
    "editor",
    "analyst",
    "viewer",
  ];

  const actions: string[] = [
    "view",
    "create",
    "edit",
    "delete",
    "publish",
    "manage_users",
    "manage_roles",
    "manage_policies",
    "configure",
    "export",
    "approve",
  ];

  const resources: string[] = [
    "content",
    "entity",
    "revenue",
    "users",
    "roles",
    "policies",
    "workflows",
    "settings",
    "analytics",
    "audit",
    "media",
    "translations",
    "integrations",
    "system",
  ];

  const scenarios: SimulationScenario[] = [];

  // Generate all role/action/resource combinations
  for (const role of roles) {
    for (const action of actions) {
      for (const resource of resources) {
        scenarios.push({
          userId: `test_user_${role}`,
          role,
          action,
          resource,
        });
      }
    }
  }

  // Add edge cases with specific contexts
  const edgeCases: SimulationScenario[] = [
    // After hours access
    {
      userId: "test_user_editor",
      role: "editor",
      action: "delete",
      resource: "content",
      context: {
        timestamp: new Date("2025-01-01T03:00:00Z"), // 3 AM
      },
    },
    // External IP access
    {
      userId: "test_user_system_admin",
      role: "system_admin",
      action: "manage_users",
      resource: "users",
      context: {
        ipAddress: "8.8.8.8",
      },
    },
    // High-value operation
    {
      userId: "test_user_manager",
      role: "manager",
      action: "delete",
      resource: "users",
      context: {
        metadata: { recordCount: 100 },
      },
    },
  ];

  return [...scenarios, ...edgeCases];
}

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

/**
 * Evaluate a scenario against a set of policies
 */
function evaluateScenario(
  scenario: SimulationScenario,
  policies: PolicyRule[]
): {
  allowed: boolean;
  effect: PolicyEffect | "no_match";
  matchingPolicies: string[];
} {
  const matchingPolicies: PolicyRule[] = [];

  for (const policy of policies) {
    if (!policy.isActive) continue;

    // Check if policy applies to this action/resource
    const actionMatches = policy.actions.includes(scenario.action);
    const resourceMatches = policy.resources.includes(scenario.resource);
    const roleMatches =
      !policy.roles || policy.roles.length === 0 || policy.roles.includes(scenario.role);

    if (actionMatches && resourceMatches && roleMatches) {
      matchingPolicies.push(policy);
    }
  }

  if (matchingPolicies.length === 0) {
    return {
      allowed: false, // Default deny
      effect: "no_match",
      matchingPolicies: [],
    };
  }

  // Sort by priority (highest first)
  matchingPolicies.sort((a, b) => b.priority - a.priority);

  // Get highest priority effect
  const topPolicy = matchingPolicies[0];

  return {
    allowed: topPolicy.effect === "allow",
    effect: topPolicy.effect,
    matchingPolicies: matchingPolicies.map(p => p.id),
  };
}

/**
 * Determine risk level of an access change
 */
function assessChangeRisk(change: AccessChange): "low" | "medium" | "high" | "critical" {
  const sensitiveResources: string[] = ["users", "roles", "policies", "system"];
  const sensitiveActions: string[] = [
    "delete",
    "manage_users",
    "manage_roles",
    "manage_policies",
    "configure",
  ];
  const privilegedRoles: string[] = ["super_admin", "system_admin"];

  const isSensitiveResource = sensitiveResources.includes(change.scenario.resource);
  const isSensitiveAction = sensitiveActions.includes(change.scenario.action);
  const isPrivilegedRole = privilegedRoles.includes(change.scenario.role);

  // Access gained is riskier than access lost
  if (change.changeType === "gained_access") {
    if (isSensitiveResource && isSensitiveAction) {
      return "critical";
    }
    if (isSensitiveResource || isSensitiveAction) {
      return "high";
    }
    if (isPrivilegedRole) {
      return "medium";
    }
    return "low";
  }

  if (change.changeType === "lost_access") {
    // Losing access is generally safer, but could break things
    if (isPrivilegedRole && isSensitiveAction) {
      return "high"; // Might lock out admins
    }
    return "low";
  }

  if (change.changeType === "effect_changed") {
    // Effect change (e.g., allow -> require_approval) is medium risk
    return "medium";
  }

  return "low";
}

/**
 * Apply policy changes to a copy of the current policy set
 */
function applyChangesToPolicies(
  currentPolicies: PolicyRule[],
  changes: PolicyChange[]
): PolicyRule[] {
  const proposedPolicies = [...currentPolicies];

  for (const change of changes) {
    if (change.type === "add" && change.after) {
      proposedPolicies.push(change.after);
    } else if (change.type === "update" && change.after) {
      const index = proposedPolicies.findIndex(p => p.id === change.policyId);
      if (index >= 0) proposedPolicies[index] = change.after;
    } else if (change.type === "delete") {
      const index = proposedPolicies.findIndex(p => p.id === change.policyId);
      if (index >= 0) proposedPolicies.splice(index, 1);
    }
  }

  return proposedPolicies;
}

/**
 * Determine the change type between before and after evaluation
 */
function determineChangeType(
  before: { allowed: boolean; effect: PolicyEffect | "no_match" },
  after: { allowed: boolean; effect: PolicyEffect | "no_match" }
): AccessChange["changeType"] {
  if (!before.allowed && after.allowed) return "gained_access";
  if (before.allowed && !after.allowed) return "lost_access";
  if (before.effect !== after.effect) return "effect_changed";
  return "no_change";
}

/**
 * Compare access across all scenarios between current and proposed policies
 */
function compareAccessChanges(
  scenarios: SimulationScenario[],
  currentPolicies: PolicyRule[],
  proposedPolicies: PolicyRule[]
): AccessChange[] {
  const accessChanges: AccessChange[] = [];

  for (const scenario of scenarios) {
    const before = evaluateScenario(scenario, currentPolicies);
    const after = evaluateScenario(scenario, proposedPolicies);
    const changeType = determineChangeType(before, after);

    if (changeType === "no_change") continue;

    const accessChange: AccessChange = { scenario, before, after, changeType, riskLevel: "low" };
    accessChange.riskLevel = assessChangeRisk(accessChange);
    accessChanges.push(accessChange);
  }

  return accessChanges;
}

/**
 * Generate simulation warnings from access changes and lint comparison
 */
function generateSimulationWarnings(
  accessChanges: AccessChange[],
  counts: {
    criticalChanges: number;
    highRiskChanges: number;
    accessLost: number;
    newIssues: number;
  }
): string[] {
  const warnings: string[] = [];

  if (counts.criticalChanges > 0)
    warnings.push(
      `${counts.criticalChanges} critical access changes detected - sensitive operations affected`
    );
  if (counts.highRiskChanges > 5)
    warnings.push(
      `${counts.highRiskChanges} high-risk changes - manual review strongly recommended`
    );
  if (counts.newIssues > 0) warnings.push(`${counts.newIssues} new policy issues introduced`);
  if (counts.accessLost > 10)
    warnings.push(
      `${counts.accessLost} access permissions removed - verify this doesn't break workflows`
    );

  const superAdminChanges = accessChanges.filter(
    c =>
      c.scenario.role === "super_admin" &&
      (c.changeType === "lost_access" || c.changeType === "gained_access")
  );
  if (superAdminChanges.length > 0) {
    warnings.push(
      `Super admin access modified - ${superAdminChanges.length} changes affecting highest privilege level`
    );
  }

  return warnings;
}

/**
 * Determine deployment recommendation
 */
function determineRecommendation(
  counts: {
    criticalChanges: number;
    highRiskChanges: number;
    accessGained: number;
    newIssues: number;
  },
  lintBefore: LintResult,
  lintAfter: LintResult
): SimulationResult["recommendation"] {
  if (counts.criticalChanges > 0 || lintAfter.summary.errors > lintBefore.summary.errors)
    return "do_not_deploy";
  if (counts.highRiskChanges > 3 || counts.newIssues > 0 || counts.accessGained > 20)
    return "review_required";
  return "safe_to_deploy";
}

/**
 * Simulate policy changes
 */
export function simulatePolicyChanges(changes: PolicyChange[]): SimulationResult {
  const currentPolicies = policyEngine.getAllPolicies();
  const proposedPolicies = applyChangesToPolicies(currentPolicies, changes);
  const scenarios = generateTestScenarios();

  const lintBefore = lintPolicies();
  const originalGetAll = policyEngine.getAllPolicies;
  (policyEngine as any).getAllPolicies = () => proposedPolicies;
  const lintAfter = lintPolicies();
  (policyEngine as any).getAllPolicies = originalGetAll;

  const accessChanges = compareAccessChanges(scenarios, currentPolicies, proposedPolicies);

  const accessGained = accessChanges.filter(c => c.changeType === "gained_access").length;
  const accessLost = accessChanges.filter(c => c.changeType === "lost_access").length;
  const criticalChanges = accessChanges.filter(c => c.riskLevel === "critical").length;
  const highRiskChanges = accessChanges.filter(c => c.riskLevel === "high").length;

  const beforeIssueIds = new Set(lintBefore.issues.map(i => i.id));
  const afterIssueIds = new Set(lintAfter.issues.map(i => i.id));
  const newIssues = lintAfter.issues.filter(i => !beforeIssueIds.has(i.id)).length;
  const resolvedIssues = lintBefore.issues.filter(i => !afterIssueIds.has(i.id)).length;

  const counts = { criticalChanges, highRiskChanges, accessGained, accessLost, newIssues };
  const warnings = generateSimulationWarnings(accessChanges, counts);
  const recommendation = determineRecommendation(counts, lintBefore, lintAfter);

  return {
    timestamp: new Date(),
    proposedChanges: changes,
    accessChanges,
    lintBefore,
    lintAfter,
    riskAssessment: {
      totalChanges: accessChanges.length,
      accessGained,
      accessLost,
      criticalChanges,
      highRiskChanges,
      newIssues,
      resolvedIssues,
    },
    recommendation,
    warnings,
  };
}

/**
 * Simulate adding a new policy
 */
export function simulateAddPolicy(policy: PolicyRule): SimulationResult {
  return simulatePolicyChanges([
    {
      type: "add",
      policyId: policy.id,
      after: policy,
    },
  ]);
}

/**
 * Simulate updating a policy
 */
export function simulateUpdatePolicy(
  policyId: string,
  updates: Partial<PolicyRule>
): SimulationResult {
  const current = policyEngine.getPolicy(policyId);
  if (!current) {
    throw new Error(`Policy ${policyId} not found`);
  }

  return simulatePolicyChanges([
    {
      type: "update",
      policyId,
      before: current,
      after: { ...current, ...updates },
    },
  ]);
}

/**
 * Simulate deleting a policy
 */
export function simulateDeletePolicy(policyId: string): SimulationResult {
  const current = policyEngine.getPolicy(policyId);
  if (!current) {
    throw new Error(`Policy ${policyId} not found`);
  }

  return simulatePolicyChanges([
    {
      type: "delete",
      policyId,
      before: current,
    },
  ]);
}

/**
 * Quick impact check for a specific user/role
 */
export function checkImpactForRole(
  role: string,
  changes: PolicyChange[]
): {
  role: string;
  gainsAccess: { action: string; resource: string }[];
  losesAccess: { action: string; resource: string }[];
} {
  const result = simulatePolicyChanges(changes);

  const roleChanges = result.accessChanges.filter(c => c.scenario.role === role);

  return {
    role,
    gainsAccess: roleChanges
      .filter(c => c.changeType === "gained_access")
      .map(c => ({ action: c.scenario.action, resource: c.scenario.resource })),
    losesAccess: roleChanges
      .filter(c => c.changeType === "lost_access")
      .map(c => ({ action: c.scenario.action, resource: c.scenario.resource })),
  };
}

/**
 * Validate policy before deployment
 */
export function validatePolicyForDeployment(policy: PolicyRule): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  simulation: SimulationResult;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!policy.id || policy.id.trim() === "") {
    errors.push("Policy must have an ID");
  }

  if (!policy.name || policy.name.trim() === "") {
    errors.push("Policy must have a name");
  }

  if (policy.actions.length === 0) {
    errors.push("Policy must have at least one action");
  }

  if (policy.resources.length === 0) {
    errors.push("Policy must have at least one resource");
  }

  // Check for overly broad permissions
  const sensitiveActions = new Set<string>([
    "delete",
    "manage_users",
    "manage_roles",
    "manage_policies",
  ]);

  if (
    policy.effect === "allow" &&
    policy.actions.some(a => sensitiveActions.has(a)) &&
    (!policy.roles || policy.roles.length === 0) &&
    policy.conditions.length === 0
  ) {
    warnings.push("Policy grants sensitive permissions without role restrictions or conditions");
  }

  // Run simulation
  const simulation = simulateAddPolicy(policy);

  // Add simulation warnings
  warnings.push(...simulation.warnings);

  if (simulation.recommendation === "do_not_deploy") {
    errors.push("Simulation indicates this policy should not be deployed");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    simulation,
  };
}
