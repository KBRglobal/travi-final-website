/**
 * Safety Evaluator
 *
 * Evaluates action plans and candidates for safety before execution.
 */

import { randomUUID } from 'crypto';
import type { ActionPlan } from '../actions/types';
import type { ActionCandidate } from '../prioritization/types';
import type {
  SafetyCheck,
  SafetyEvaluation,
  SafetyResult,
  SafetyCategory,
  ConflictResult,
  RateLimitResult,
  SafetyConfig,
} from './types';
import { isSafetyEnabled, RISK_THRESHOLDS } from '../config';
import { planRegistry } from '../actions/synthesizer';
import { log } from '../../lib/logger';

/**
 * Default safety configuration
 */
const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  enabled: true,
  maxBlastRadius: 70,
  maxRiskScore: 80,
  requireReversible: false,
  actionsPerHourLimit: 20,
  quietHoursStart: 2, // 2 AM UTC
  quietHoursEnd: 6, // 6 AM UTC
  enableQuietHours: true,
};

let safetyConfig = { ...DEFAULT_SAFETY_CONFIG };

/**
 * Get current safety config
 */
export function getSafetyConfig(): SafetyConfig {
  return { ...safetyConfig };
}

/**
 * Update safety config
 */
export function updateSafetyConfig(updates: Partial<SafetyConfig>): void {
  safetyConfig = { ...safetyConfig, ...updates };
}

/**
 * Create a safety check
 */
function createCheck(
  category: SafetyCategory,
  name: string,
  description: string,
  result: SafetyResult,
  message: string,
  details: Record<string, unknown> = {},
  remediation: string | null = null
): SafetyCheck {
  return {
    id: randomUUID(),
    category,
    name,
    description,
    result,
    message,
    details,
    remediation,
    timestamp: new Date(),
  };
}

/**
 * Check reversibility
 */
function checkReversibility(plan: ActionPlan): SafetyCheck {
  const hasRollbackableSteps = plan.steps.some(s => s.canRollback);

  if (plan.metadata.sourceCandidate) {
    const candidate = plan.metadata.sourceCandidate as ActionCandidate;
    if (candidate.reversibility === 'irreversible') {
      return createCheck(
        'reversibility',
        'Reversibility Check',
        'Verify action can be undone if needed',
        safetyConfig.requireReversible ? 'block' : 'warn',
        'Action is irreversible',
        { reversibility: candidate.reversibility, hasRollbackableSteps },
        'Consider creating a backup before proceeding'
      );
    }

    if (candidate.reversibility === 'difficult') {
      return createCheck(
        'reversibility',
        'Reversibility Check',
        'Verify action can be undone if needed',
        'warn',
        'Action is difficult to reverse',
        { reversibility: candidate.reversibility, hasRollbackableSteps },
        'Ensure backup exists before proceeding'
      );
    }
  }

  return createCheck(
    'reversibility',
    'Reversibility Check',
    'Verify action can be undone if needed',
    'pass',
    'Action can be reversed',
    { hasRollbackableSteps }
  );
}

/**
 * Check blast radius
 */
function checkBlastRadius(plan: ActionPlan): SafetyCheck {
  const contentCount = plan.contentIds.length;
  let blastRadius = 0;

  if (plan.metadata.sourceCandidate) {
    const candidate = plan.metadata.sourceCandidate as ActionCandidate;
    blastRadius = candidate.dimensions.blastRadius;
  } else {
    // Estimate from content count
    blastRadius = Math.min(100, contentCount * 5);
  }

  if (blastRadius > safetyConfig.maxBlastRadius) {
    return createCheck(
      'blast_radius',
      'Blast Radius Check',
      'Verify scope of impact is acceptable',
      'block',
      `Blast radius (${blastRadius}) exceeds maximum (${safetyConfig.maxBlastRadius})`,
      { blastRadius, maxBlastRadius: safetyConfig.maxBlastRadius, contentCount },
      'Reduce scope or request approval for high-impact changes'
    );
  }

  if (blastRadius > safetyConfig.maxBlastRadius * 0.7) {
    return createCheck(
      'blast_radius',
      'Blast Radius Check',
      'Verify scope of impact is acceptable',
      'warn',
      `Blast radius (${blastRadius}) is approaching maximum`,
      { blastRadius, maxBlastRadius: safetyConfig.maxBlastRadius, contentCount },
      'Consider breaking into smaller batches'
    );
  }

  return createCheck(
    'blast_radius',
    'Blast Radius Check',
    'Verify scope of impact is acceptable',
    'pass',
    'Blast radius within acceptable limits',
    { blastRadius, contentCount }
  );
}

/**
 * Check governance requirements
 */
function checkGovernance(plan: ActionPlan): SafetyCheck {
  // Check if approval is required and obtained
  if (plan.requiresApproval && !plan.approved) {
    return createCheck(
      'governance',
      'Governance Check',
      'Verify required approvals are in place',
      'block',
      'Action requires approval before execution',
      { requiresApproval: plan.requiresApproval, approved: plan.approved },
      'Obtain approval from authorized personnel'
    );
  }

  // Check action type governance
  const highGovernanceTypes = ['governance_compliance', 'ops_remediation', 'revenue_action'];
  if (highGovernanceTypes.includes(plan.actionType) && !plan.approved) {
    return createCheck(
      'governance',
      'Governance Check',
      'Verify required approvals are in place',
      'warn',
      'High-governance action type should have approval',
      { actionType: plan.actionType },
      'Consider obtaining approval for audit trail'
    );
  }

  return createCheck(
    'governance',
    'Governance Check',
    'Verify required approvals are in place',
    'pass',
    'Governance requirements satisfied',
    { approved: plan.approved, approvedBy: plan.approvedBy }
  );
}

/**
 * Check resource availability
 */
function checkResources(plan: ActionPlan): SafetyCheck {
  // Check active plans limit
  const activePlans = planRegistry.getActive();
  const maxConcurrent = 5;

  if (activePlans.length >= maxConcurrent) {
    return createCheck(
      'resource',
      'Resource Check',
      'Verify system resources are available',
      'block',
      `Too many concurrent executions (${activePlans.length}/${maxConcurrent})`,
      { activePlans: activePlans.length, maxConcurrent },
      'Wait for current executions to complete'
    );
  }

  return createCheck(
    'resource',
    'Resource Check',
    'Verify system resources are available',
    'pass',
    'Resources available for execution',
    { activePlans: activePlans.length, maxConcurrent }
  );
}

/**
 * Check timing constraints
 */
function checkTiming(plan: ActionPlan): SafetyCheck {
  if (!safetyConfig.enableQuietHours) {
    return createCheck(
      'timing',
      'Timing Check',
      'Verify execution time is appropriate',
      'pass',
      'Quiet hours disabled',
      { quietHoursEnabled: false }
    );
  }

  const now = new Date();
  const currentHour = now.getUTCHours();

  // Check if within quiet hours
  const inQuietHours =
    (safetyConfig.quietHoursStart <= safetyConfig.quietHoursEnd)
      ? (currentHour >= safetyConfig.quietHoursStart && currentHour < safetyConfig.quietHoursEnd)
      : (currentHour >= safetyConfig.quietHoursStart || currentHour < safetyConfig.quietHoursEnd);

  if (inQuietHours) {
    // Calculate when quiet hours end
    let hoursUntilEnd = safetyConfig.quietHoursEnd - currentHour;
    if (hoursUntilEnd <= 0) hoursUntilEnd += 24;

    return createCheck(
      'timing',
      'Timing Check',
      'Verify execution time is appropriate',
      'warn',
      `Currently in quiet hours (${safetyConfig.quietHoursStart}:00-${safetyConfig.quietHoursEnd}:00 UTC)`,
      { currentHour, quietHoursStart: safetyConfig.quietHoursStart, quietHoursEnd: safetyConfig.quietHoursEnd },
      `Consider waiting ${hoursUntilEnd} hours or override if urgent`
    );
  }

  return createCheck(
    'timing',
    'Timing Check',
    'Verify execution time is appropriate',
    'pass',
    'Outside quiet hours, execution allowed',
    { currentHour }
  );
}

/**
 * Check dependencies
 */
function checkDependencies(plan: ActionPlan): SafetyCheck {
  const candidate = plan.metadata.sourceCandidate as ActionCandidate | undefined;

  if (!candidate || candidate.dependsOn.length === 0) {
    return createCheck(
      'dependency',
      'Dependency Check',
      'Verify all dependencies are satisfied',
      'pass',
      'No dependencies required',
      { dependencies: [] }
    );
  }

  // Check if dependent plans are completed
  const missingDeps: string[] = [];
  for (const depId of candidate.dependsOn) {
    const depPlan = planRegistry.get(depId);
    if (!depPlan || depPlan.status !== 'completed') {
      missingDeps.push(depId);
    }
  }

  if (missingDeps.length > 0) {
    return createCheck(
      'dependency',
      'Dependency Check',
      'Verify all dependencies are satisfied',
      'block',
      `Waiting on ${missingDeps.length} dependent action(s)`,
      { dependencies: candidate.dependsOn, missing: missingDeps },
      'Complete dependent actions first'
    );
  }

  return createCheck(
    'dependency',
    'Dependency Check',
    'Verify all dependencies are satisfied',
    'pass',
    'All dependencies satisfied',
    { dependencies: candidate.dependsOn }
  );
}

/**
 * Check for conflicts with other plans
 */
function checkConflicts(plan: ActionPlan): SafetyCheck {
  const activePlans = planRegistry.getActive();
  const conflicts: string[] = [];

  for (const activePlan of activePlans) {
    // Check entity conflict
    if (plan.entityId && plan.entityId === activePlan.entityId) {
      conflicts.push(activePlan.id);
      continue;
    }

    // Check content overlap
    const overlap = plan.contentIds.filter(id => activePlan.contentIds.includes(id));
    if (overlap.length > 0) {
      conflicts.push(activePlan.id);
    }
  }

  if (conflicts.length > 0) {
    return createCheck(
      'conflict',
      'Conflict Check',
      'Verify no conflicting operations in progress',
      'block',
      `Conflicts with ${conflicts.length} active plan(s)`,
      { conflicts, entityId: plan.entityId },
      'Wait for conflicting plans to complete'
    );
  }

  return createCheck(
    'conflict',
    'Conflict Check',
    'Verify no conflicting operations in progress',
    'pass',
    'No conflicts detected',
    { activePlansChecked: activePlans.length }
  );
}

/**
 * Calculate risk score from checks
 */
function calculateRiskScore(checks: SafetyCheck[]): number {
  const categoryWeights: Record<SafetyCategory, number> = {
    reversibility: 0.20,
    blast_radius: 0.25,
    governance: 0.15,
    resource: 0.10,
    timing: 0.05,
    dependency: 0.10,
    conflict: 0.15,
  };

  const resultScores: Record<SafetyResult, number> = {
    pass: 0,
    warn: 50,
    block: 100,
  };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const check of checks) {
    const weight = categoryWeights[check.category] || 0.1;
    const score = resultScores[check.result];
    weightedScore += score * weight;
    totalWeight += weight;
  }

  return Math.round(weightedScore / totalWeight);
}

/**
 * Evaluate safety of an action plan
 */
export function evaluatePlan(plan: ActionPlan): SafetyEvaluation {
  if (!isSafetyEnabled()) {
    return {
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
    };
  }

  const startTime = Date.now();

  // Run all checks
  const checks: SafetyCheck[] = [
    checkReversibility(plan),
    checkBlastRadius(plan),
    checkGovernance(plan),
    checkResources(plan),
    checkTiming(plan),
    checkDependencies(plan),
    checkConflicts(plan),
  ];

  // Count results
  const passed = checks.filter(c => c.result === 'pass').length;
  const warnings = checks.filter(c => c.result === 'warn').length;
  const blocked = checks.filter(c => c.result === 'block').length;

  // Determine overall result
  let overallResult: SafetyResult = 'pass';
  if (blocked > 0) overallResult = 'block';
  else if (warnings > 0) overallResult = 'warn';

  // Calculate risk score
  const riskScore = calculateRiskScore(checks);

  // Determine execution recommendation
  const executionRecommended = overallResult !== 'block' && riskScore < safetyConfig.maxRiskScore;

  const durationMs = Date.now() - startTime;

  log.debug(`[GrowthOS] Safety evaluation for ${plan.id}: ${overallResult} (risk: ${riskScore}) in ${durationMs}ms`);

  return {
    targetId: plan.id,
    overallResult,
    checks,
    totalChecks: checks.length,
    passed,
    warnings,
    blocked,
    riskScore,
    executionRecommended,
    durationMs,
    timestamp: new Date(),
  };
}

/**
 * Evaluate safety of an action candidate (before plan synthesis)
 */
export function evaluateCandidate(candidate: ActionCandidate): SafetyEvaluation {
  if (!isSafetyEnabled()) {
    return {
      targetId: candidate.id,
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
    };
  }

  const startTime = Date.now();
  const checks: SafetyCheck[] = [];

  // Check reversibility
  if (candidate.reversibility === 'irreversible') {
    checks.push(createCheck(
      'reversibility',
      'Reversibility Check',
      'Verify action can be undone',
      safetyConfig.requireReversible ? 'block' : 'warn',
      'Action is irreversible',
      { reversibility: candidate.reversibility }
    ));
  } else {
    checks.push(createCheck(
      'reversibility',
      'Reversibility Check',
      'Verify action can be undone',
      'pass',
      'Action is reversible',
      { reversibility: candidate.reversibility }
    ));
  }

  // Check blast radius
  if (candidate.dimensions.blastRadius > safetyConfig.maxBlastRadius) {
    checks.push(createCheck(
      'blast_radius',
      'Blast Radius Check',
      'Verify scope of impact',
      'block',
      `Blast radius (${candidate.dimensions.blastRadius}) exceeds limit`,
      { blastRadius: candidate.dimensions.blastRadius }
    ));
  } else {
    checks.push(createCheck(
      'blast_radius',
      'Blast Radius Check',
      'Verify scope of impact',
      'pass',
      'Blast radius acceptable',
      { blastRadius: candidate.dimensions.blastRadius }
    ));
  }

  // Check risk
  if (candidate.dimensions.risk > safetyConfig.maxRiskScore) {
    checks.push(createCheck(
      'governance',
      'Risk Check',
      'Verify risk is acceptable',
      'block',
      `Risk (${candidate.dimensions.risk}) exceeds maximum`,
      { risk: candidate.dimensions.risk }
    ));
  } else if (candidate.dimensions.risk > RISK_THRESHOLDS.high) {
    checks.push(createCheck(
      'governance',
      'Risk Check',
      'Verify risk is acceptable',
      'warn',
      'High risk action',
      { risk: candidate.dimensions.risk }
    ));
  } else {
    checks.push(createCheck(
      'governance',
      'Risk Check',
      'Verify risk is acceptable',
      'pass',
      'Risk acceptable',
      { risk: candidate.dimensions.risk }
    ));
  }

  const passed = checks.filter(c => c.result === 'pass').length;
  const warnings = checks.filter(c => c.result === 'warn').length;
  const blocked = checks.filter(c => c.result === 'block').length;

  let overallResult: SafetyResult = 'pass';
  if (blocked > 0) overallResult = 'block';
  else if (warnings > 0) overallResult = 'warn';

  const riskScore = calculateRiskScore(checks);

  return {
    targetId: candidate.id,
    overallResult,
    checks,
    totalChecks: checks.length,
    passed,
    warnings,
    blocked,
    riskScore,
    executionRecommended: overallResult !== 'block',
    durationMs: Date.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Rate limit tracking
 */
const actionCounts = new Map<string, { count: number; windowStart: Date }>();

/**
 * Check rate limit
 */
export function checkRateLimit(key = 'global'): RateLimitResult {
  const now = new Date();
  const windowSeconds = 3600; // 1 hour
  const limit = safetyConfig.actionsPerHourLimit;

  let tracking = actionCounts.get(key);

  // Reset if window expired
  if (tracking && (now.getTime() - tracking.windowStart.getTime()) > windowSeconds * 1000) {
    tracking = { count: 0, windowStart: now };
    actionCounts.set(key, tracking);
  }

  if (!tracking) {
    tracking = { count: 0, windowStart: now };
    actionCounts.set(key, tracking);
  }

  const resetsAt = new Date(tracking.windowStart.getTime() + windowSeconds * 1000);
  const waitSeconds = Math.max(0, (resetsAt.getTime() - now.getTime()) / 1000);

  return {
    allowed: tracking.count < limit,
    currentCount: tracking.count,
    limit,
    windowSeconds,
    resetsAt,
    waitSeconds: tracking.count >= limit ? Math.ceil(waitSeconds) : 0,
  };
}

/**
 * Increment rate limit counter
 */
export function incrementRateLimit(key = 'global'): void {
  const tracking = actionCounts.get(key);
  if (tracking) {
    tracking.count++;
  } else {
    actionCounts.set(key, { count: 1, windowStart: new Date() });
  }
}

/**
 * Detect conflicts between plans
 */
export function detectConflicts(planA: ActionPlan, planB: ActionPlan): ConflictResult {
  // Check entity conflict
  if (planA.entityId && planA.entityId === planB.entityId) {
    return {
      hasConflict: true,
      type: 'entity_lock',
      conflictingPlanIds: [planA.id, planB.id],
      conflictingEntityIds: [planA.entityId],
      resolutionStrategy: 'wait',
      message: 'Both plans target the same entity',
    };
  }

  // Check content overlap
  const overlap = planA.contentIds.filter(id => planB.contentIds.includes(id));
  if (overlap.length > 0) {
    return {
      hasConflict: true,
      type: 'concurrent_modification',
      conflictingPlanIds: [planA.id, planB.id],
      conflictingEntityIds: overlap,
      resolutionStrategy: overlap.length > 5 ? 'abort' : 'wait',
      message: `Plans share ${overlap.length} content item(s)`,
    };
  }

  return {
    hasConflict: false,
    type: null,
    conflictingPlanIds: [],
    conflictingEntityIds: [],
    resolutionStrategy: 'force',
    message: 'No conflicts detected',
  };
}
