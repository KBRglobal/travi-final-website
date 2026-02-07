/**
 * Policy Linter - Detect Conflicts, Shadows, and Misconfigurations
 *
 * Finds:
 * - Conflicting policies (same action/resource, different effects)
 * - Shadow policies (never trigger due to priority/conditions)
 * - Redundant policies (duplicates)
 * - Orphaned policies (reference non-existent resources)
 * - Overly permissive policies
 */

import { policyEngine } from "../../governance/policy-engine";
import { PolicyRule } from "../../governance/types";

// ============================================================================
// LINT RESULT TYPES
// ============================================================================

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  id: string;
  severity: LintSeverity;
  category: string;
  message: string;
  policyId: string;
  policyName: string;
  relatedPolicies?: string[];
  recommendation: string;
  autoFixable: boolean;
}

export interface LintResult {
  timestamp: Date;
  totalPolicies: number;
  issues: LintIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  score: number; // 0-100
}

// ============================================================================
// LINT RULES
// ============================================================================

/**
 * Detect conflicting policies
 */
function detectConflicts(policies: PolicyRule[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const actionResourceMap = new Map<string, PolicyRule[]>();

  // Group by action+resource
  for (const policy of policies) {
    for (const action of policy.actions) {
      for (const resource of policy.resources) {
        const key = `${action}:${resource}`;
        const existing = actionResourceMap.get(key) || [];
        existing.push(policy);
        actionResourceMap.set(key, existing);
      }
    }
  }

  // Find conflicts
  for (const [key, groupedPolicies] of actionResourceMap) {
    if (groupedPolicies.length < 2) continue;

    const effects = new Set(groupedPolicies.map(p => p.effect));

    if (effects.size > 1) {
      // Different effects for same action/resource
      const [action, resource] = key.split(":");

      const allowPolicies = groupedPolicies.filter(p => p.effect === "allow");
      const denyPolicies = groupedPolicies.filter(p => p.effect === "deny");

      if (allowPolicies.length > 0 && denyPolicies.length > 0) {
        issues.push({
          id: `conflict_${key}`,
          severity: "error",
          category: "conflict",
          message: `Conflicting policies for ${action} on ${resource}: ${allowPolicies.length} allow, ${denyPolicies.length} deny`,
          policyId: groupedPolicies[0].id,
          policyName: groupedPolicies[0].name,
          relatedPolicies: groupedPolicies.map(p => p.id),
          recommendation:
            "Review and consolidate conflicting policies. Deny typically takes precedence.",
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}

/**
 * Detect shadow policies (never trigger)
 */
function detectShadows(policies: PolicyRule[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const sortedPolicies = [...policies].sort((a, b) => b.priority - a.priority);

  for (let i = 0; i < sortedPolicies.length; i++) {
    const policy = sortedPolicies[i];

    // Skip inactive policies
    if (!policy.isActive) continue;

    // Check if a higher priority policy shadows this one
    for (let j = 0; j < i; j++) {
      const higherPolicy = sortedPolicies[j];

      if (!higherPolicy.isActive) continue;

      const isShadowed = checkIfShadowed(higherPolicy, policy);

      if (isShadowed) {
        issues.push({
          id: `shadow_${policy.id}_by_${higherPolicy.id}`,
          severity: "warning",
          category: "shadow",
          message: `Policy "${policy.name}" is shadowed by "${higherPolicy.name}" (priority ${higherPolicy.priority} > ${policy.priority})`,
          policyId: policy.id,
          policyName: policy.name,
          relatedPolicies: [higherPolicy.id],
          recommendation: "Review policy priorities or conditions to ensure intended behavior",
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}

/**
 * Check if policy A shadows policy B
 */
function checkIfShadowed(higher: PolicyRule, lower: PolicyRule): boolean {
  // Check if higher covers all actions of lower
  const actionsMatch = lower.actions.every(a => higher.actions.includes(a));
  if (!actionsMatch) return false;

  // Check if higher covers all resources of lower
  const resourcesMatch = lower.resources.every(r => higher.resources.includes(r));
  if (!resourcesMatch) return false;

  // Check roles overlap
  if (higher.roles && lower.roles) {
    const rolesMatch = lower.roles.every(r => higher.roles!.includes(r));
    if (!rolesMatch) return false;
  }

  // If higher has no conditions, it shadows lower
  if (higher.conditions.length === 0) {
    return true;
  }

  // If lower has fewer or same conditions, it might be shadowed
  if (lower.conditions.length <= higher.conditions.length) {
    return true;
  }

  return false;
}

/**
 * Detect redundant policies (exact duplicates or subsets)
 */
function detectRedundant(policies: PolicyRule[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const seen = new Set<string>();

  for (const policy of policies) {
    // Create fingerprint
    const fingerprint = JSON.stringify({
      actions: [...policy.actions].sort((a, b) => a.localeCompare(b)),
      resources: [...policy.resources].sort((a, b) => a.localeCompare(b)),
      effect: policy.effect,
      roles: policy.roles?.toSorted((a, b) => a.localeCompare(b)),
    });

    if (seen.has(fingerprint)) {
      issues.push({
        id: `redundant_${policy.id}`,
        severity: "warning",
        category: "redundant",
        message: `Policy "${policy.name}" appears to be redundant`,
        policyId: policy.id,
        policyName: policy.name,
        recommendation: "Consider removing duplicate policy",
        autoFixable: true,
      });
    }

    seen.add(fingerprint);
  }

  return issues;
}

/**
 * Detect overly permissive policies
 */
function detectOverlyPermissive(policies: PolicyRule[]): LintIssue[] {
  const issues: LintIssue[] = [];

  const sensitiveActions = new Set<string>([
    "delete",
    "manage_users",
    "manage_roles",
    "manage_policies",
    "configure",
  ]);
  const sensitiveResources = new Set<string>(["users", "roles", "policies", "system"]);

  for (const policy of policies) {
    if (policy.effect !== "allow") continue;

    // Check for wildcard-like behavior
    const hasSensitiveAction = policy.actions.some(a => sensitiveActions.has(a));
    const hasSensitiveResource = policy.resources.some(r => sensitiveResources.has(r));
    const hasNoConditions = policy.conditions.length === 0;
    const hasNoRoleRestriction = !policy.roles || policy.roles.length === 0;

    if (hasSensitiveAction && hasSensitiveResource && hasNoConditions) {
      issues.push({
        id: `permissive_${policy.id}`,
        severity: "warning",
        category: "permissive",
        message: `Policy "${policy.name}" grants sensitive permissions without conditions`,
        policyId: policy.id,
        policyName: policy.name,
        recommendation: "Add conditions or role restrictions to limit exposure",
        autoFixable: false,
      });
    }

    if (hasSensitiveAction && hasNoRoleRestriction) {
      issues.push({
        id: `unrestricted_${policy.id}`,
        severity: "error",
        category: "unrestricted",
        message: `Policy "${policy.name}" grants sensitive permissions to all roles`,
        policyId: policy.id,
        policyName: policy.name,
        recommendation: "Restrict to specific admin roles",
        autoFixable: false,
      });
    }
  }

  return issues;
}

/**
 * Detect policies that never trigger
 */
function detectNeverTriggers(policies: PolicyRule[]): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const policy of policies) {
    if (!policy.isActive) {
      issues.push({
        id: `inactive_${policy.id}`,
        severity: "info",
        category: "inactive",
        message: `Policy "${policy.name}" is inactive`,
        policyId: policy.id,
        policyName: policy.name,
        recommendation: "Remove or reactivate if no longer needed",
        autoFixable: true,
      });
      continue;
    }

    // Check for impossible conditions
    const hasImpossibleCondition = policy.conditions.some(c => {
      // Check for contradictory conditions
      const contradicts = policy.conditions.some(
        other =>
          c.field === other.field &&
          c.operator === "equals" &&
          other.operator === "not_equals" &&
          c.value === other.value
      );
      return contradicts;
    });

    if (hasImpossibleCondition) {
      issues.push({
        id: `impossible_${policy.id}`,
        severity: "error",
        category: "impossible",
        message: `Policy "${policy.name}" has contradictory conditions`,
        policyId: policy.id,
        policyName: policy.name,
        recommendation: "Fix contradictory conditions",
        autoFixable: false,
      });
    }

    // Check for empty arrays
    if (policy.actions.length === 0) {
      issues.push({
        id: `no_actions_${policy.id}`,
        severity: "error",
        category: "misconfigured",
        message: `Policy "${policy.name}" has no actions defined`,
        policyId: policy.id,
        policyName: policy.name,
        recommendation: "Add at least one action",
        autoFixable: false,
      });
    }

    if (policy.resources.length === 0) {
      issues.push({
        id: `no_resources_${policy.id}`,
        severity: "error",
        category: "misconfigured",
        message: `Policy "${policy.name}" has no resources defined`,
        policyId: policy.id,
        policyName: policy.name,
        recommendation: "Add at least one resource",
        autoFixable: false,
      });
    }
  }

  return issues;
}

/**
 * Detect missing deny policies for sensitive operations
 */
function detectMissingDenies(policies: PolicyRule[]): LintIssue[] {
  const issues: LintIssue[] = [];

  const criticalOperations = [
    { action: "delete", resource: "users" },
    { action: "delete", resource: "roles" },
    { action: "delete", resource: "policies" },
    { action: "manage_roles", resource: "roles" },
    { action: "manage_policies", resource: "policies" },
  ];

  for (const op of criticalOperations) {
    const hasDenyPolicy = policies.some(
      p =>
        p.effect === "deny" &&
        p.actions.includes(op.action as any) &&
        p.resources.includes(op.resource as any) &&
        p.isActive
    );

    const hasApprovalPolicy = policies.some(
      p =>
        p.effect === "require_approval" &&
        p.actions.includes(op.action as any) &&
        p.resources.includes(op.resource as any) &&
        p.isActive
    );

    if (!hasDenyPolicy && !hasApprovalPolicy) {
      issues.push({
        id: `no_protection_${op.action}_${op.resource}`,
        severity: "warning",
        category: "unprotected",
        message: `No deny or approval policy for ${op.action} on ${op.resource}`,
        policyId: "system",
        policyName: "System Check",
        recommendation: `Add a policy to protect ${op.action} on ${op.resource}`,
        autoFixable: false,
      });
    }
  }

  return issues;
}

// ============================================================================
// MAIN LINTER FUNCTION
// ============================================================================

/**
 * Run full policy lint
 */
export function lintPolicies(): LintResult {
  const policies = policyEngine.getAllPolicies();
  const allIssues: LintIssue[] = [];

  // Run all lint rules
  allIssues.push(
    ...detectConflicts(policies),
    ...detectShadows(policies),
    ...detectRedundant(policies),
    ...detectOverlyPermissive(policies),
    ...detectNeverTriggers(policies),
    ...detectMissingDenies(policies)
  );

  // Calculate summary
  const errors = allIssues.filter(i => i.severity === "error").length;
  const warnings = allIssues.filter(i => i.severity === "warning").length;
  const info = allIssues.filter(i => i.severity === "info").length;

  // Calculate score (100 = perfect, deduct for issues)
  const score = Math.max(0, 100 - errors * 20 - warnings * 5 - info * 1);

  return {
    timestamp: new Date(),
    totalPolicies: policies.length,
    issues: allIssues,
    summary: { errors, warnings, info },
    score,
  };
}

/**
 * Get auto-fixable issues
 */
export function getAutoFixableIssues(): LintIssue[] {
  const result = lintPolicies();
  return result.issues.filter(i => i.autoFixable);
}

/**
 * Quick health check
 */
export function quickPolicyHealthCheck(): {
  healthy: boolean;
  criticalIssues: number;
  score: number;
} {
  const result = lintPolicies();
  return {
    healthy: result.summary.errors === 0,
    criticalIssues: result.summary.errors,
    score: result.score,
  };
}
