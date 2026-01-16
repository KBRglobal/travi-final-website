/**
 * Policy Engine - Governance Policies
 * Feature flag: ENABLE_POLICY_ENFORCEMENT
 *
 * @deprecated This engine is part of the legacy policy system.
 * For new code, please use the Unified Policy Engine at:
 * /server/policies/unified-policy-engine.ts
 *
 * MIGRATION PATH:
 * ```typescript
 * // Old way:
 * import { evaluatePolicies } from './policy-engine';
 * const decision = await evaluatePolicies(context);
 *
 * // New way:
 * import { evaluateUnifiedPolicy } from './unified-policy-engine';
 * const result = await evaluateUnifiedPolicy({
 *   type: 'governance',
 *   userId: context.userId,
 *   action: context.action,
 *   resource: context.resource,
 *   context: context.metadata
 * });
 * ```
 *
 * This engine remains functional and will continue to work, but the unified
 * engine provides better integration with RBAC and autonomy policies.
 *
 * Last updated: 2026-01-01 (Consolidation initiative)
 */

import { db } from "../db";
import { governancePolicies, policyEvaluations } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  Policy,
  PolicyContext,
  PolicyDecision,
  PolicyEvaluation,
  PolicyEffect,
} from "./types";
import { BUILT_IN_POLICIES } from "./built-in-policies";
import {
  evaluateAllConditions,
  roleMatchesPolicy,
  actionMatchesPolicy,
  resourceMatchesPolicy,
} from "./evaluator";

function isEnabled(): boolean {
  return process.env.ENABLE_POLICY_ENFORCEMENT === "true";
}

// Cache for DB policies
const POLICY_CACHE = new Map<string, { policies: Policy[]; ts: number }>();
const CACHE_TTL = 60000; // 1 minute
const CACHE_MAX = 100;

/**
 * Get all active policies (built-in + DB)
 */
async function getActivePolicies(): Promise<Policy[]> {
  if (!isEnabled()) return [];

  // Check cache
  const cached = POLICY_CACHE.get("all");
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.policies;
  }

  // Fetch DB policies
  const dbPolicies = await db
    .select()
    .from(governancePolicies)
    .where(eq(governancePolicies.isActive, true))
    .orderBy(desc(governancePolicies.priority));

  // Convert to Policy type
  const converted: Policy[] = dbPolicies.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    policyType: p.policyType as Policy["policyType"],
    effect: p.effect as PolicyEffect,
    priority: p.priority,
    conditions: (p.conditions as any) || [],
    actions: (p.actions as string[]) || [],
    resources: (p.resources as string[]) || [],
    roles: (p.roles as string[]) || [],
    message: p.message || undefined,
    isActive: p.isActive,
  }));

  // Merge with built-in policies
  const builtIn = BUILT_IN_POLICIES.filter((p) => p.isActive);
  const allPolicies = [...builtIn, ...converted];

  // Sort by priority (higher first)
  allPolicies.sort((a, b) => b.priority - a.priority);

  // Cache
  if (POLICY_CACHE.size >= CACHE_MAX) {
    POLICY_CACHE.clear();
  }
  POLICY_CACHE.set("all", { policies: allPolicies, ts: Date.now() });

  return allPolicies;
}

export function clearPolicyCache(): void {
  POLICY_CACHE.clear();
}

/**
 * Evaluate policies for a given context
 */
export async function evaluatePolicies(context: PolicyContext): Promise<PolicyDecision> {
  if (!isEnabled()) {
    return {
      effect: "allow",
      reason: "Policy enforcement disabled",
      evaluations: [],
    };
  }

  const policies = await getActivePolicies();
  const evaluations: PolicyEvaluation[] = [];
  const blockedBy: string[] = [];
  const warnings: string[] = [];

  // Get user roles array
  const userRoles = context.userRoles || (context.userRole ? [context.userRole] : []);

  // Super admin bypasses all policies
  if (userRoles.includes("super_admin")) {
    return {
      effect: "allow",
      reason: "Super admin bypass",
      evaluations: [],
    };
  }

  for (const policy of policies) {
    // Check if policy applies to this action/resource
    if (!actionMatchesPolicy(context.action, policy.actions)) continue;
    if (!resourceMatchesPolicy(context.resource, policy.resources)) continue;

    // Check if policy applies to user's role
    if (!roleMatchesPolicy(userRoles, policy.roles)) continue;

    // Evaluate conditions
    const { match, matchedConditions } = evaluateAllConditions(
      policy.conditions,
      context
    );

    if (match) {
      const evaluation: PolicyEvaluation = {
        policyId: policy.id,
        policyName: policy.name,
        result: policy.effect,
        reason: policy.message || `Policy ${policy.name} matched`,
        matchedConditions,
      };

      evaluations.push(evaluation);

      if (policy.effect === "block") {
        blockedBy.push(policy.name);
      } else if (policy.effect === "warn") {
        warnings.push(policy.message || policy.name);
      }

      // Log evaluation for analytics
      await logEvaluation(policy, context, policy.effect);
    }
  }

  // Determine final effect
  let finalEffect: PolicyEffect = "allow";
  let reason = "No blocking policies matched";

  if (blockedBy.length > 0) {
    finalEffect = "block";
    reason = `Blocked by: ${blockedBy.join(", ")}`;
  } else if (warnings.length > 0) {
    finalEffect = "warn";
    reason = `Warnings: ${warnings.join("; ")}`;
  }

  return {
    effect: finalEffect,
    reason,
    evaluations,
    blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check if an action is allowed
 */
export async function isAllowed(context: PolicyContext): Promise<boolean> {
  const decision = await evaluatePolicies(context);
  return decision.effect !== "block";
}

/**
 * Check with detailed result
 */
export async function checkPolicy(context: PolicyContext): Promise<{
  allowed: boolean;
  warnings: string[];
  blockedBy: string[];
  reason: string;
}> {
  const decision = await evaluatePolicies(context);

  return {
    allowed: decision.effect !== "block",
    warnings: decision.warnings || [],
    blockedBy: decision.blockedBy || [],
    reason: decision.reason,
  };
}

/**
 * Log policy evaluation for analytics
 */
async function logEvaluation(
  policy: Policy,
  context: PolicyContext,
  result: PolicyEffect
): Promise<void> {
  try {
    await db.insert(policyEvaluations).values({
      policyId: policy.id.startsWith("builtin-") ? null : policy.id,
      policyName: policy.name,
      userId: context.userId,
      action: context.action,
      resource: context.resource,
      resourceId: context.resourceId,
      result,
      reason: policy.message,
    });
  } catch (error) {
    console.error("[Policies] Error logging evaluation:", error);
  }
}

/**
 * Get policy enforcement summary
 */
export async function getEnforcementSummary(): Promise<{
  totalPolicies: number;
  activePolicies: number;
  byType: Record<string, number>;
  byEffect: Record<string, number>;
}> {
  if (!isEnabled()) {
    return {
      totalPolicies: 0,
      activePolicies: 0,
      byType: {},
      byEffect: {},
    };
  }

  const policies = await getActivePolicies();

  const byType: Record<string, number> = {};
  const byEffect: Record<string, number> = {};

  for (const policy of policies) {
    byType[policy.policyType] = (byType[policy.policyType] || 0) + 1;
    byEffect[policy.effect] = (byEffect[policy.effect] || 0) + 1;
  }

  return {
    totalPolicies: BUILT_IN_POLICIES.length + (await db.select().from(governancePolicies)).length,
    activePolicies: policies.length,
    byType,
    byEffect,
  };
}

console.log("[Policies] PolicyEngine loaded");
