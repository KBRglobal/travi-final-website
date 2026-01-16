/**
 * Policy Enforcement
 *
 * Defines and enforces execution policies.
 */

import { randomUUID } from 'crypto';
import type { ActionPlan } from '../actions/types';
import type { ActionCandidate } from '../prioritization/types';
import type {
  Policy,
  PolicyType,
  PolicyEnforcementResult,
  ReadinessCheck,
  ReadinessStatus,
} from './types';
import { evaluatePlan, checkRateLimit, detectConflicts } from './evaluator';
import { planRegistry } from '../actions/synthesizer';
import { isSafetyEnabled } from '../config';

/**
 * Policy registry
 */
const policies = new Map<string, Policy>();

/**
 * Initialize default policies
 */
function initializeDefaultPolicies(): void {
  // Content protection policy
  registerPolicy({
    id: 'content-protection',
    type: 'content_protection',
    name: 'Content Protection',
    description: 'Prevent mass content deletions',
    enabled: true,
    config: {
      maxDeletesPerHour: 10,
      requireApprovalAbove: 5,
    },
    priority: 100,
    allowOverride: false,
    createdAt: new Date(),
  });

  // Rate limit policy
  registerPolicy({
    id: 'rate-limit',
    type: 'rate_limit',
    name: 'Rate Limit',
    description: 'Limit actions per time window',
    enabled: true,
    config: {
      actionsPerHour: 20,
      burstLimit: 5,
    },
    priority: 90,
    allowOverride: true,
    createdAt: new Date(),
  });

  // Time window policy
  registerPolicy({
    id: 'time-window',
    type: 'time_window',
    name: 'Business Hours',
    description: 'Prefer execution during business hours',
    enabled: true,
    config: {
      preferredStart: 9, // 9 AM UTC
      preferredEnd: 17, // 5 PM UTC
      blockOutsidePreferred: false,
    },
    priority: 50,
    allowOverride: true,
    createdAt: new Date(),
  });

  // Approval policy
  registerPolicy({
    id: 'approval-required',
    type: 'approval_required',
    name: 'Approval Required',
    description: 'Require approval for high-risk actions',
    enabled: true,
    config: {
      riskThreshold: 70,
      complexityThreshold: 'complex',
    },
    priority: 80,
    allowOverride: false,
    createdAt: new Date(),
  });

  // Conflict prevention policy
  registerPolicy({
    id: 'conflict-prevention',
    type: 'conflict_prevention',
    name: 'Conflict Prevention',
    description: 'Prevent conflicting concurrent operations',
    enabled: true,
    config: {
      allowOverlap: false,
      maxConcurrent: 5,
    },
    priority: 95,
    allowOverride: false,
    createdAt: new Date(),
  });
}

/**
 * Register a policy
 */
export function registerPolicy(policy: Policy): void {
  policies.set(policy.id, policy);
}

/**
 * Get policy by ID
 */
export function getPolicy(id: string): Policy | undefined {
  return policies.get(id);
}

/**
 * Get all policies
 */
export function getAllPolicies(): Policy[] {
  return [...policies.values()].sort((a, b) => b.priority - a.priority);
}

/**
 * Enable/disable a policy
 */
export function setPolicyEnabled(id: string, enabled: boolean): boolean {
  const policy = policies.get(id);
  if (!policy) return false;
  policy.enabled = enabled;
  return true;
}

/**
 * Enforce a single policy
 */
function enforcePolicy(policy: Policy, plan: ActionPlan): PolicyEnforcementResult {
  const base = {
    policyId: policy.id,
    policyType: policy.type,
    enforced: policy.enabled,
    overrideAllowed: policy.allowOverride,
    timestamp: new Date(),
  };

  if (!policy.enabled) {
    return { ...base, violated: false, message: 'Policy disabled' };
  }

  switch (policy.type) {
    case 'content_protection': {
      const config = policy.config as { maxDeletesPerHour: number; requireApprovalAbove: number };
      if (plan.actionType === 'content_archive') {
        const contentCount = plan.contentIds.length;
        if (contentCount > config.maxDeletesPerHour) {
          return {
            ...base,
            violated: true,
            message: `Cannot archive ${contentCount} items (max: ${config.maxDeletesPerHour}/hour)`,
          };
        }
        if (contentCount > config.requireApprovalAbove && !plan.approved) {
          return {
            ...base,
            violated: true,
            message: `Archiving ${contentCount} items requires approval`,
          };
        }
      }
      return { ...base, violated: false, message: 'Content protection satisfied' };
    }

    case 'rate_limit': {
      const rateLimit = checkRateLimit();
      if (!rateLimit.allowed) {
        return {
          ...base,
          violated: true,
          message: `Rate limit exceeded (${rateLimit.currentCount}/${rateLimit.limit}), wait ${rateLimit.waitSeconds}s`,
        };
      }
      return { ...base, violated: false, message: 'Within rate limit' };
    }

    case 'time_window': {
      const config = policy.config as { preferredStart: number; preferredEnd: number; blockOutsidePreferred: boolean };
      const hour = new Date().getUTCHours();
      const inWindow = hour >= config.preferredStart && hour < config.preferredEnd;
      if (!inWindow && config.blockOutsidePreferred) {
        return {
          ...base,
          violated: true,
          message: `Outside preferred time window (${config.preferredStart}:00-${config.preferredEnd}:00 UTC)`,
        };
      }
      return {
        ...base,
        violated: false,
        message: inWindow ? 'Within preferred time window' : 'Outside preferred window (warning)',
      };
    }

    case 'approval_required': {
      const config = policy.config as { riskThreshold: number; complexityThreshold: string };
      const candidate = plan.metadata.sourceCandidate as ActionCandidate | undefined;
      if (candidate) {
        const needsApproval =
          candidate.dimensions.risk >= config.riskThreshold ||
          candidate.complexity === config.complexityThreshold ||
          candidate.complexity === 'expert';

        if (needsApproval && !plan.approved) {
          return {
            ...base,
            violated: true,
            message: 'High-risk action requires approval',
          };
        }
      }
      return { ...base, violated: false, message: 'Approval requirements satisfied' };
    }

    case 'conflict_prevention': {
      const config = policy.config as { allowOverlap: boolean; maxConcurrent: number };
      const activePlans = planRegistry.getActive();

      if (activePlans.length >= config.maxConcurrent) {
        return {
          ...base,
          violated: true,
          message: `Max concurrent plans (${config.maxConcurrent}) reached`,
        };
      }

      if (!config.allowOverlap) {
        for (const active of activePlans) {
          const conflict = detectConflicts(plan, active);
          if (conflict.hasConflict) {
            return {
              ...base,
              violated: true,
              message: conflict.message,
            };
          }
        }
      }

      return { ...base, violated: false, message: 'No conflicts detected' };
    }

    default:
      return { ...base, violated: false, message: 'Policy type not implemented' };
  }
}

/**
 * Enforce all policies on a plan
 */
export function enforceAllPolicies(plan: ActionPlan): PolicyEnforcementResult[] {
  const results: PolicyEnforcementResult[] = [];
  const sortedPolicies = getAllPolicies();

  for (const policy of sortedPolicies) {
    results.push(enforcePolicy(policy, plan));
  }

  return results;
}

/**
 * Check if plan is ready for execution
 */
export function checkReadiness(plan: ActionPlan): ReadinessCheck {
  if (!isSafetyEnabled()) {
    return {
      planId: plan.id,
      status: 'ready',
      safetyEvaluation: {
        targetId: plan.id,
        overallResult: 'pass',
        checks: [],
        totalChecks: 0,
        passed: 0,
        warnings: 0,
        blocked: 0,
        riskScore: 0,
        executionRecommended: true,
        durationMs: 0,
        timestamp: new Date(),
      },
      policyResults: [],
      missingDependencies: [],
      blockingConflicts: [],
      readyAt: null,
      timestamp: new Date(),
    };
  }

  // Run safety evaluation
  const safetyEvaluation = evaluatePlan(plan);

  // Enforce policies
  const policyResults = enforceAllPolicies(plan);

  // Check for violations
  const violations = policyResults.filter(r => r.violated && r.enforced);
  const nonOverridableViolations = violations.filter(r => !r.overrideAllowed);

  // Determine missing dependencies
  const candidate = plan.metadata.sourceCandidate as ActionCandidate | undefined;
  const missingDependencies: string[] = [];
  if (candidate?.dependsOn) {
    for (const depId of candidate.dependsOn) {
      const depPlan = planRegistry.get(depId);
      if (!depPlan || depPlan.status !== 'completed') {
        missingDependencies.push(depId);
      }
    }
  }

  // Find blocking conflicts
  const conflictPolicy = policyResults.find(r => r.policyType === 'conflict_prevention');
  const blockingConflicts = conflictPolicy?.violated
    ? planRegistry.getActive().map(p => p.id)
    : [];

  // Determine status
  let status: ReadinessStatus = 'ready';

  if (nonOverridableViolations.length > 0 || safetyEvaluation.overallResult === 'block') {
    status = 'blocked';
  } else if (plan.requiresApproval && !plan.approved) {
    status = 'pending_approval';
  } else if (missingDependencies.length > 0) {
    status = 'pending_dependency';
  }

  // Calculate ready time (if timing blocked)
  let readyAt: Date | null = null;
  const rateLimitResult = policyResults.find(r => r.policyType === 'rate_limit');
  if (rateLimitResult?.violated) {
    const rateLimit = checkRateLimit();
    if (rateLimit.waitSeconds > 0) {
      readyAt = new Date(Date.now() + rateLimit.waitSeconds * 1000);
    }
  }

  return {
    planId: plan.id,
    status,
    safetyEvaluation,
    policyResults,
    missingDependencies,
    blockingConflicts,
    readyAt,
    timestamp: new Date(),
  };
}

/**
 * Get plans that are ready for execution
 */
export function getReadyForExecution(): ActionPlan[] {
  const pending = planRegistry.getPending();
  const ready: ActionPlan[] = [];

  for (const plan of pending) {
    const check = checkReadiness(plan);
    if (check.status === 'ready') {
      ready.push(plan);
    }
  }

  return ready;
}

/**
 * Get plans blocked by policy
 */
export function getBlockedPlans(): Array<{ plan: ActionPlan; reasons: string[] }> {
  const pending = planRegistry.getPending();
  const blocked: Array<{ plan: ActionPlan; reasons: string[] }> = [];

  for (const plan of pending) {
    const check = checkReadiness(plan);
    if (check.status === 'blocked') {
      const reasons = check.policyResults
        .filter(r => r.violated)
        .map(r => r.message);
      blocked.push({ plan, reasons });
    }
  }

  return blocked;
}

// Initialize default policies on module load
initializeDefaultPolicies();
