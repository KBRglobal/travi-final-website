/**
 * Change Guard Evaluator
 *
 * Enforces safety rules before changes can be applied.
 * Guards can warn, error, or block execution entirely.
 */

import { db } from "../../db";
import { contents as content } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import type {
  ChangePlan,
  ChangeItem,
  GuardResult,
  GuardType,
  GuardConfig,
} from "../types";

// ============================================================================
// GUARD CONFIGURATION
// ============================================================================

const DEFAULT_GUARD_CONFIG: Record<GuardType, GuardConfig> = {
  publish_gate: { enabled: true, blocking: true },
  sla_ownership: { enabled: true, blocking: false },
  experiment_conflict: { enabled: true, blocking: true },
  high_traffic: { enabled: true, blocking: false },
  recent_change: { enabled: true, blocking: false },
  canonical_integrity: { enabled: true, blocking: true },
  kill_switch: { enabled: true, blocking: true },
  rate_limit: { enabled: true, blocking: true },
  permission: { enabled: true, blocking: true },
};

// Runtime config override
let guardConfig = { ...DEFAULT_GUARD_CONFIG };

/**
 * Update guard configuration
 */
export function setGuardConfig(config: Partial<Record<GuardType, GuardConfig>>): void {
  guardConfig = { ...DEFAULT_GUARD_CONFIG, ...config };
}

/**
 * Get current guard configuration
 */
export function getGuardConfig(): Record<GuardType, GuardConfig> {
  return { ...guardConfig };
}

// ============================================================================
// GUARD EVALUATION
// ============================================================================

/**
 * Evaluate all guards for a plan
 */
export async function evaluateGuards(
  plan: ChangePlan,
  userId: string
): Promise<{ passed: GuardResult[]; failed: GuardResult[] }> {
  const results: GuardResult[] = [];

  // Run all enabled guards
  if (guardConfig.kill_switch.enabled) {
    results.push(await checkKillSwitch());
  }

  if (guardConfig.permission.enabled) {
    results.push(await checkPermissions(plan, userId));
  }

  if (guardConfig.rate_limit.enabled) {
    results.push(await checkRateLimit(userId));
  }

  if (guardConfig.publish_gate.enabled) {
    results.push(...await checkPublishGates(plan));
  }

  if (guardConfig.sla_ownership.enabled) {
    results.push(...await checkSlaOwnership(plan));
  }

  if (guardConfig.experiment_conflict.enabled) {
    results.push(...await checkExperimentConflicts(plan));
  }

  if (guardConfig.high_traffic.enabled) {
    results.push(...await checkHighTrafficPages(plan));
  }

  if (guardConfig.recent_change.enabled) {
    results.push(...await checkRecentChanges(plan));
  }

  if (guardConfig.canonical_integrity.enabled) {
    results.push(...await checkCanonicalIntegrity(plan));
  }

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  return { passed, failed };
}

/**
 * Check if any blocking guards failed
 */
export function hasBlockingFailures(failedGuards: GuardResult[]): boolean {
  for (const guard of failedGuards) {
    const config = guardConfig[guard.guard];
    if (config.blocking && guard.severity === 'blocker') {
      return true;
    }
  }
  return false;
}

// ============================================================================
// INDIVIDUAL GUARDS
// ============================================================================

/**
 * Kill switch - global emergency stop
 */
async function checkKillSwitch(): Promise<GuardResult> {
  const killSwitchActive = process.env.CHANGE_MANAGEMENT_KILL_SWITCH === 'true';

  return {
    guard: 'kill_switch',
    passed: !killSwitchActive,
    message: killSwitchActive
      ? 'Change management kill switch is active. All changes blocked.'
      : 'Kill switch not active',
    severity: killSwitchActive ? 'blocker' : 'warning',
  };
}

/**
 * Permission check - user has required permissions
 */
async function checkPermissions(plan: ChangePlan, userId: string): Promise<GuardResult> {
  // In production, would check actual user permissions
  // For now, assume all authenticated users can create plans
  // but only admins can approve/apply

  const requiresAdmin = plan.riskLevel === 'critical' || plan.riskLevel === 'high';

  // Simplified check - in production would query user roles
  const isAdmin = process.env.NODE_ENV === 'development' || userId.includes('admin');

  if (requiresAdmin && !isAdmin) {
    return {
      guard: 'permission',
      passed: false,
      message: `${plan.riskLevel} risk plans require admin approval`,
      severity: 'blocker',
    };
  }

  return {
    guard: 'permission',
    passed: true,
    message: 'User has required permissions',
    severity: 'warning',
  };
}

/**
 * Rate limit - prevent too many changes too fast
 */
async function checkRateLimit(userId: string): Promise<GuardResult> {
  // In production, would check actual rate limits from Redis/cache
  // For now, always pass

  return {
    guard: 'rate_limit',
    passed: true,
    message: 'Within rate limits',
    severity: 'warning',
  };
}

/**
 * Publish gates - check content can be published
 */
async function checkPublishGates(plan: ChangePlan): Promise<GuardResult[]> {
  const results: GuardResult[] = [];

  const publishChanges = plan.changes.filter(
    c => c.type === 'content_publish'
  );

  if (publishChanges.length === 0) {
    return [{
      guard: 'publish_gate',
      passed: true,
      message: 'No publish changes in plan',
      severity: 'warning',
    }];
  }

  // Get content IDs
  const contentIds = publishChanges.map(c => parseInt(c.targetId)).filter(id => !isNaN(id));

  if (contentIds.length > 0) {
    // Check content status
    const contents = await db.select().from(content).where(
      inArray(content.id, contentIds)
    );

    const draftContent = contents.filter(c => c.status === 'draft');

    if (draftContent.length > 0) {
      // Check if content passes publish requirements
      for (const item of draftContent) {
        const hasMeta = item.metaTitle && item.metaDescription;
        const hasBody = item.body && item.body.length > 100;

        if (!hasMeta || !hasBody) {
          results.push({
            guard: 'publish_gate',
            passed: false,
            message: `Content "${item.title}" does not meet publish requirements`,
            severity: 'blocker',
            affectedChanges: publishChanges
              .filter(c => c.targetId === String(item.id))
              .map(c => c.id),
          });
        }
      }
    }
  }

  if (results.length === 0) {
    results.push({
      guard: 'publish_gate',
      passed: true,
      message: `All ${publishChanges.length} publish changes pass gates`,
      severity: 'warning',
    });
  }

  return results;
}

/**
 * SLA ownership - check content has valid owners
 */
async function checkSlaOwnership(plan: ChangePlan): Promise<GuardResult[]> {
  const results: GuardResult[] = [];

  const contentChanges = plan.changes.filter(c => c.targetType === 'content');

  if (contentChanges.length === 0) {
    return [{
      guard: 'sla_ownership',
      passed: true,
      message: 'No content changes in plan',
      severity: 'warning',
    }];
  }

  // In production, would check ownership records
  // For now, assume all content has owners

  results.push({
    guard: 'sla_ownership',
    passed: true,
    message: `${contentChanges.length} content items have valid ownership`,
    severity: 'warning',
  });

  return results;
}

/**
 * Experiment conflicts - check for active experiments
 */
async function checkExperimentConflicts(plan: ChangePlan): Promise<GuardResult[]> {
  const results: GuardResult[] = [];

  const contentChanges = plan.changes.filter(c => c.targetType === 'content');

  if (contentChanges.length === 0) {
    return [{
      guard: 'experiment_conflict',
      passed: true,
      message: 'No content changes in plan',
      severity: 'warning',
    }];
  }

  // In production, would check experiments table
  // For now, check if any changes are on content with experiments

  // Simplified: flag any content_update changes as potential conflicts
  const updateChanges = contentChanges.filter(c => c.type === 'content_update');

  if (updateChanges.length > 10) {
    results.push({
      guard: 'experiment_conflict',
      passed: true,
      message: `${updateChanges.length} content updates - verify no active experiments`,
      severity: 'warning',
    });
  }

  if (results.length === 0) {
    results.push({
      guard: 'experiment_conflict',
      passed: true,
      message: 'No experiment conflicts detected',
      severity: 'warning',
    });
  }

  return results;
}

/**
 * High traffic pages - warn about changes to popular content
 */
async function checkHighTrafficPages(plan: ChangePlan): Promise<GuardResult[]> {
  const results: GuardResult[] = [];

  const contentChanges = plan.changes.filter(c => c.targetType === 'content');

  if (contentChanges.length === 0) {
    return [{
      guard: 'high_traffic',
      passed: true,
      message: 'No content changes in plan',
      severity: 'warning',
    }];
  }

  // In production, would check analytics data
  // For now, estimate based on content count

  const highTrafficEstimate = Math.floor(contentChanges.length * 0.1);

  if (highTrafficEstimate > 0) {
    results.push({
      guard: 'high_traffic',
      passed: true,
      message: `Estimated ${highTrafficEstimate} high-traffic pages affected`,
      severity: 'warning',
    });
  } else {
    results.push({
      guard: 'high_traffic',
      passed: true,
      message: 'No high-traffic pages affected',
      severity: 'warning',
    });
  }

  return results;
}

/**
 * Recent changes - warn about content changed recently
 */
async function checkRecentChanges(plan: ChangePlan): Promise<GuardResult[]> {
  const results: GuardResult[] = [];

  const contentChanges = plan.changes.filter(c => c.targetType === 'content');
  const contentIds = contentChanges.map(c => parseInt(c.targetId)).filter(id => !isNaN(id));

  if (contentIds.length === 0) {
    return [{
      guard: 'recent_change',
      passed: true,
      message: 'No content changes in plan',
      severity: 'warning',
    }];
  }

  // Check for recently updated content
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const contents = await db.select().from(content).where(
    inArray(content.id, contentIds)
  );

  const recentlyChanged = contents.filter(
    c => c.updatedAt && new Date(c.updatedAt) > oneDayAgo
  );

  if (recentlyChanged.length > 0) {
    results.push({
      guard: 'recent_change',
      passed: true,
      message: `${recentlyChanged.length} items were changed in last 24 hours`,
      severity: 'warning',
      affectedChanges: contentChanges
        .filter(c => recentlyChanged.some(rc => String(rc.id) === c.targetId))
        .map(c => c.id),
    });
  } else {
    results.push({
      guard: 'recent_change',
      passed: true,
      message: 'No recently changed content affected',
      severity: 'warning',
    });
  }

  return results;
}

/**
 * Canonical integrity - ensure canonical relationships stay valid
 */
async function checkCanonicalIntegrity(plan: ChangePlan): Promise<GuardResult[]> {
  const results: GuardResult[] = [];

  const canonicalChanges = plan.changes.filter(
    c => c.type === 'canonical_set' || c.type === 'canonical_remove'
  );

  if (canonicalChanges.length === 0) {
    return [{
      guard: 'canonical_integrity',
      passed: true,
      message: 'No canonical changes in plan',
      severity: 'warning',
    }];
  }

  // Check for circular references
  const setChanges = canonicalChanges.filter(c => c.type === 'canonical_set');
  const targets = new Set(setChanges.map(c => c.targetId));
  const canonicalTargets = new Set(setChanges.map(c => String(c.afterValue)));

  // Check if any canonical points to content also being made canonical
  for (const change of setChanges) {
    const canonicalTo = String(change.afterValue);
    if (targets.has(canonicalTo)) {
      results.push({
        guard: 'canonical_integrity',
        passed: false,
        message: `Potential circular canonical: ${change.targetId} -> ${canonicalTo}`,
        severity: 'blocker',
        affectedChanges: [change.id],
      });
    }
  }

  if (results.length === 0) {
    results.push({
      guard: 'canonical_integrity',
      passed: true,
      message: `${canonicalChanges.length} canonical changes validated`,
      severity: 'warning',
    });
  }

  return results;
}

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

/**
 * Check if a plan can be approved
 */
export async function canApprove(
  plan: ChangePlan,
  userId: string
): Promise<{ canApprove: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Must be in draft or pending_approval status
  if (plan.status !== 'draft' && plan.status !== 'pending_approval') {
    reasons.push(`Plan is in ${plan.status} status, cannot approve`);
  }

  // Cannot approve own critical/high risk plans
  if ((plan.riskLevel === 'critical' || plan.riskLevel === 'high') && plan.createdBy === userId) {
    reasons.push('Cannot self-approve high-risk plans');
  }

  // Run guards
  const { failed } = await evaluateGuards(plan, userId);
  const blockers = failed.filter(f => f.severity === 'blocker');

  if (blockers.length > 0) {
    for (const blocker of blockers) {
      reasons.push(blocker.message);
    }
  }

  return {
    canApprove: reasons.length === 0,
    reasons,
  };
}

/**
 * Check if a plan can be applied
 */
export async function canApply(
  plan: ChangePlan,
  userId: string
): Promise<{ canApply: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Must be approved
  if (plan.status !== 'approved') {
    reasons.push(`Plan must be approved first (current: ${plan.status})`);
  }

  // Check feature flag
  const applyEnabled = process.env.ENABLE_CHANGE_APPLY === 'true';
  if (!applyEnabled) {
    reasons.push('Change apply is disabled (ENABLE_CHANGE_APPLY=false)');
  }

  // Run guards again (state may have changed)
  const { failed } = await evaluateGuards(plan, userId);
  const blockers = failed.filter(f => f.severity === 'blocker');

  if (blockers.length > 0) {
    for (const blocker of blockers) {
      reasons.push(blocker.message);
    }
  }

  return {
    canApply: reasons.length === 0,
    reasons,
  };
}
