/**
 * Autonomy Policy Engine - Core Policy Evaluation
 * Deterministic policy evaluation with budget enforcement
 * Feature flag: ENABLE_AUTONOMY_POLICY
 *
 * @deprecated This engine is part of the legacy policy system.
 * For new code, please use the Unified Policy Engine at:
 * /server/policies/unified-policy-engine.ts
 *
 * MIGRATION PATH:
 * ```typescript
 * // Old way:
 * import { evaluatePolicy } from './policy-engine';
 * const result = await evaluatePolicy(target, action, context);
 *
 * // New way:
 * import { evaluateUnifiedPolicy } from '../../policies/unified-policy-engine';
 * const result = await evaluateUnifiedPolicy({
 *   type: 'autonomy',
 *   target,
 *   action,
 *   estimatedTokens: context.estimatedTokens,
 *   estimatedAiSpend: context.estimatedAiSpend
 * });
 *
 * // Or use the convenience wrapper:
 * import { checkAutonomyLimits } from '../../policies/unified-policy-engine';
 * const result = await checkAutonomyLimits(target, action, {
 *   tokens: context.estimatedTokens,
 *   aiSpend: context.estimatedAiSpend
 * });
 * ```
 *
 * This engine remains functional and will continue to work, but the unified
 * engine provides better integration with RBAC and governance policies,
 * especially for combined policy evaluations.
 *
 * Last updated: 2026-01-01 (Consolidation initiative)
 */

import {
  PolicyDefinition,
  PolicyEvaluationResult,
  PolicyDecision,
  PolicyReason,
  ActionType,
  PolicyTarget,
} from "./types";
import { generateTargetKey, isWithinTimeWindow, DEFAULT_GLOBAL_POLICY } from "./config";
import { checkBudgetStatus, isBudgetExhausted, incrementBudgetCounter } from "./budgets";
import { getPolicies, logDecision } from "./repository";

const EVALUATION_TIMEOUT_MS = 3000;

function isEnabled(): boolean {
  return process.env.ENABLE_AUTONOMY_POLICY === "true";
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// Find all applicable policies for a target, sorted by priority (highest first)
export async function findApplicablePolicies(target: PolicyTarget): Promise<PolicyDefinition[]> {
  const allPolicies = await getPolicies();
  const applicable: PolicyDefinition[] = [];

  for (const policy of allPolicies) {
    if (!policy.enabled) continue;

    // Check if policy applies to this target
    if (policy.target.type === "global") {
      applicable.push(policy);
    } else if (policy.target.type === target.type) {
      if (
        (target.type === "feature" && policy.target.feature === target.feature) ||
        (target.type === "entity" && policy.target.entity === target.entity) ||
        (target.type === "locale" && policy.target.locale === target.locale)
      ) {
        applicable.push(policy);
      }
    }
  }

  // Sort by priority (higher = more specific = evaluated first)
  return applicable.sort((a, b) => b.priority - a.priority);
}

// Check if action is allowed by policy
function isActionAllowed(
  policy: PolicyDefinition,
  action: ActionType
): {
  allowed: boolean;
  reason?: PolicyReason;
} {
  // Blocked actions take precedence
  if (policy.blockedActions.includes(action)) {
    return {
      allowed: false,
      reason: {
        code: "ACTION_BLOCKED",
        message: `Action '${action}' is explicitly blocked by policy '${policy.name}'`,
        severity: "error",
      },
    };
  }

  // Check if in allowed list (if list is not empty)
  if (policy.allowedActions.length > 0 && !policy.allowedActions.includes(action)) {
    return {
      allowed: false,
      reason: {
        code: "ACTION_NOT_ALLOWED",
        message: `Action '${action}' is not in allowed actions for policy '${policy.name}'`,
        severity: "error",
      },
    };
  }

  return { allowed: true };
}

// Check time window restrictions
function checkTimeWindow(policy: PolicyDefinition): {
  allowed: boolean;
  reason?: PolicyReason;
} {
  if (!policy.allowedHours) {
    return { allowed: true };
  }

  if (!isWithinTimeWindow(policy.allowedHours)) {
    return {
      allowed: false,
      reason: {
        code: "OUTSIDE_ALLOWED_HOURS",
        message: `Current time is outside allowed hours (${policy.allowedHours.startHour}:00-${policy.allowedHours.endHour}:00)`,
        severity: "error",
      },
    };
  }

  return { allowed: true };
}

// Main policy evaluation function - deterministic
export async function evaluatePolicy(
  target: PolicyTarget,
  action: ActionType,
  context?: {
    requesterId?: string;
    estimatedTokens?: number;
    estimatedWrites?: number;
    estimatedMutations?: number;
    estimatedAiSpend?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<PolicyEvaluationResult> {
  const evaluatedAt = new Date();
  const reasons: PolicyReason[] = [];

  // If not enabled, allow everything with a warning
  if (!isEnabled()) {
    return {
      decision: "ALLOW",
      reasons: [
        {
          code: "POLICY_DISABLED",
          message: "Autonomy policy engine is disabled",
          severity: "info",
        },
      ],
      evaluatedAt,
    };
  }

  try {
    // Find applicable policies
    const policies = await withTimeout(findApplicablePolicies(target), EVALUATION_TIMEOUT_MS, [
      DEFAULT_GLOBAL_POLICY,
    ]);

    if (policies.length === 0) {
      // No policies found, use default
      policies.push(DEFAULT_GLOBAL_POLICY);
    }

    // Use highest priority policy for evaluation
    const policy = policies[0];
    const targetKey = generateTargetKey(target);

    // Check action permissions
    const actionCheck = isActionAllowed(policy, action);
    if (!actionCheck.allowed) {
      reasons.push(actionCheck.reason!);

      // Log the decision
      await logDecision({
        targetKey,
        actionType: action,
        decision: "BLOCK",
        reasons,
        matchedPolicyId: policy.id,
        requesterId: context?.requesterId,
        metadata: context?.metadata,
      });

      return {
        decision: "BLOCK",
        reasons,
        matchedPolicy: policy.id,
        evaluatedAt,
      };
    }

    // Check time window
    const timeCheck = checkTimeWindow(policy);
    if (!timeCheck.allowed) {
      reasons.push(timeCheck.reason!);

      await logDecision({
        targetKey,
        actionType: action,
        decision: "BLOCK",
        reasons,
        matchedPolicyId: policy.id,
        requesterId: context?.requesterId,
        metadata: context?.metadata,
      });

      return {
        decision: "BLOCK",
        reasons,
        matchedPolicy: policy.id,
        evaluatedAt,
      };
    }

    // Check budget limits
    const budgetExhausted = await isBudgetExhausted(targetKey, policy.budgetLimits);
    if (budgetExhausted.exhausted) {
      reasons.push({
        code: "BUDGET_EXHAUSTED",
        message: budgetExhausted.reason || "Budget limit reached",
        severity: "error",
      });

      await logDecision({
        targetKey,
        actionType: action,
        decision: "BLOCK",
        reasons,
        matchedPolicyId: policy.id,
        requesterId: context?.requesterId,
        metadata: context?.metadata,
      });

      return {
        decision: "BLOCK",
        reasons,
        matchedPolicy: policy.id,
        evaluatedAt,
      };
    }

    // Get current budget status
    const budgetStatuses = await checkBudgetStatus(targetKey, policy.budgetLimits);

    // Check for warnings (approaching limits)
    let decision: PolicyDecision = "ALLOW";
    for (const status of budgetStatuses) {
      const actionsUsedPercent = (status.actionsExecuted / status.actionsLimit) * 100;
      const aiSpendUsedPercent = (status.aiSpendActual / status.aiSpendLimit) * 100;

      if (actionsUsedPercent >= 80) {
        decision = "WARN";
        reasons.push({
          code: "BUDGET_WARNING",
          message: `${status.period} action budget is ${actionsUsedPercent.toFixed(0)}% used`,
          severity: "warning",
        });
      }

      if (aiSpendUsedPercent >= 80) {
        decision = "WARN";
        reasons.push({
          code: "AI_SPEND_WARNING",
          message: `${status.period} AI spend is ${aiSpendUsedPercent.toFixed(0)}% used`,
          severity: "warning",
        });
      }
    }

    // Check approval requirements
    if (policy.approvalLevel === "review" || policy.approvalLevel === "manual") {
      decision = "WARN";
      reasons.push({
        code: "REQUIRES_APPROVAL",
        message: `Action requires ${policy.approvalLevel} approval`,
        severity: "warning",
      });
    }

    // Log successful evaluation
    await logDecision({
      targetKey,
      actionType: action,
      decision,
      reasons,
      matchedPolicyId: policy.id,
      requesterId: context?.requesterId,
      metadata: context?.metadata,
    });

    return {
      decision,
      reasons:
        reasons.length > 0
          ? reasons
          : [
              {
                code: "ALLOWED",
                message: "Action permitted by policy",
                severity: "info",
              },
            ],
      matchedPolicy: policy.id,
      budgetStatus: budgetStatuses[0], // Return first (most restrictive) status
      evaluatedAt,
    };
  } catch (error) {
    // Fail closed on errors
    return {
      decision: "BLOCK",
      reasons: [
        {
          code: "EVALUATION_ERROR",
          message: error instanceof Error ? error.message : "Policy evaluation failed",
          severity: "error",
        },
      ],
      evaluatedAt,
    };
  }
}

// Record action execution (after successful evaluation)
export async function recordActionExecution(
  target: PolicyTarget,
  metrics: {
    tokensUsed?: number;
    writesCount?: number;
    contentMutations?: number;
    aiSpendCents?: number;
    success: boolean;
  }
): Promise<void> {
  if (!isEnabled()) return;

  const targetKey = generateTargetKey(target);

  // Get applicable policy for budget periods
  const policies = await findApplicablePolicies(target);
  const policy = policies[0] || DEFAULT_GLOBAL_POLICY;

  // Update counters for each budget period
  for (const limit of policy.budgetLimits) {
    await incrementBudgetCounter(targetKey, limit.period, {
      actionsExecuted: 1,
      tokensActual: metrics.tokensUsed || 0,
      writesCount: metrics.writesCount || 0,
      contentMutations: metrics.contentMutations || 0,
      aiSpendCents: metrics.aiSpendCents || 0,
      failuresCount: metrics.success ? 0 : 1,
    });
  }
}

// Quick check without full evaluation (for performance-sensitive paths)
export async function quickCheck(target: PolicyTarget, action: ActionType): Promise<boolean> {
  if (!isEnabled()) return true;

  const result = await evaluatePolicy(target, action);
  return result.decision !== "BLOCK";
}
