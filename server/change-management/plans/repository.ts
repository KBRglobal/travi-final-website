/**
 * Change Plan Repository
 *
 * Storage and CRUD operations for change plans.
 */

import type {
  ChangePlan,
  PlanStatus,
  PlanScope,
  RiskLevel,
  ChangeItem,
  ImpactEstimate,
  PlanHistoryEntry,
  ChangeManagementStats,
  CreatedFrom,
} from "../types";

// In-memory storage (production would use database)
const plans = new Map<string, ChangePlan>();
const history = new Map<string, PlanHistoryEntry[]>();

/**
 * Generate unique plan ID
 */
function generatePlanId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `plan-${timestamp}-${random}`;
}

/**
 * Generate unique change ID
 */
export function generateChangeId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `chg-${timestamp}-${random}`;
}

/**
 * Calculate risk level based on impact
 */
function calculateRiskLevel(impact: ImpactEstimate): RiskLevel {
  let riskScore = 0;

  // High traffic pages are risky
  if (impact.highTrafficPagesTouched > 10) riskScore += 40;
  else if (impact.highTrafficPagesTouched > 0) riskScore += 20;

  // Published content is risky
  if (impact.publishedContentTouched > 50) riskScore += 30;
  else if (impact.publishedContentTouched > 10) riskScore += 15;

  // Experiment conflicts are risky
  if (impact.experimentConflicts > 0) riskScore += 25;

  // Large scale changes are risky
  if (impact.contentAffected > 100) riskScore += 20;
  else if (impact.contentAffected > 20) riskScore += 10;

  // Blockers/warnings
  if (impact.warnings.length > 5) riskScore += 10;

  if (riskScore >= 70) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  return 'low';
}

/**
 * Create a new change plan
 */
export function createPlan(
  name: string,
  description: string,
  scope: PlanScope,
  createdFrom: CreatedFrom,
  createdBy: string,
  changes: Omit<ChangeItem, 'id' | 'status'>[],
  options: {
    tags?: string[];
    parentPlanId?: string;
  } = {}
): ChangePlan {
  const id = generatePlanId();

  // Assign IDs and status to changes
  const changesWithIds: ChangeItem[] = changes.map(change => ({
    ...change,
    id: generateChangeId(),
    status: 'pending' as const,
  }));

  // Calculate impact estimate
  const impactEstimate = estimateImpact(changesWithIds);

  // Calculate risk level
  const riskLevel = calculateRiskLevel(impactEstimate);

  const plan: ChangePlan = {
    id,
    name,
    description,
    scope,
    createdFrom,
    changes: changesWithIds,
    impactEstimate,
    riskLevel,
    status: 'draft',
    createdAt: new Date(),
    createdBy,
    tags: options.tags,
    parentPlanId: options.parentPlanId,
  };

  plans.set(id, plan);

  // Record history
  recordHistory(id, 'created', createdBy);

  return plan;
}

/**
 * Estimate impact of changes
 */
function estimateImpact(changes: ChangeItem[]): ImpactEstimate {
  const contentIds = new Set<string>();
  const entityIds = new Set<string>();
  let linksAffected = 0;
  let pagesReindexNeeded = 0;
  let capsulesToRegenerate = 0;
  const warnings: string[] = [];

  for (const change of changes) {
    if (change.targetType === 'content') {
      contentIds.add(change.targetId);
      pagesReindexNeeded++;
    }
    if (change.targetType === 'entity') {
      entityIds.add(change.targetId);
    }
    if (change.targetType === 'link') {
      linksAffected++;
    }
    if (change.type === 'aeo_regenerate') {
      capsulesToRegenerate++;
    }
    if (change.type === 'content_publish' || change.type === 'content_unpublish') {
      warnings.push(`Content ${change.targetId} will change publication status`);
    }
  }

  // Estimate published content (simplified - in production would query DB)
  const publishedContentTouched = Math.floor(contentIds.size * 0.7);
  const highTrafficPagesTouched = Math.floor(contentIds.size * 0.1);

  // Estimate duration (simplified)
  const estimatedDurationMs = changes.length * 100 + capsulesToRegenerate * 5000;

  return {
    contentAffected: contentIds.size,
    entitiesAffected: entityIds.size,
    linksAffected,
    pagesReindexNeeded,
    capsulesToRegenerate,
    publishedContentTouched,
    highTrafficPagesTouched,
    experimentConflicts: 0, // Will be checked by guards
    estimatedDurationMs,
    warnings,
  };
}

/**
 * Get a plan by ID
 */
export function getPlan(id: string): ChangePlan | null {
  return plans.get(id) || null;
}

/**
 * Update plan status
 */
export function updatePlanStatus(
  id: string,
  status: PlanStatus,
  userId: string,
  extra?: Partial<ChangePlan>
): ChangePlan | null {
  const plan = plans.get(id);
  if (!plan) return null;

  const updatedPlan: ChangePlan = {
    ...plan,
    ...extra,
    status,
  };

  plans.set(id, updatedPlan);

  // Record history
  const action = status === 'approved' ? 'approved'
    : status === 'applied' ? 'applied'
    : status === 'rolled_back' ? 'rolled_back'
    : status === 'failed' ? 'failed'
    : status === 'cancelled' ? 'cancelled'
    : 'created';

  recordHistory(id, action, userId, extra);

  return updatedPlan;
}

/**
 * Update a specific change within a plan
 */
export function updateChange(
  planId: string,
  changeId: string,
  updates: Partial<ChangeItem>
): ChangeItem | null {
  const plan = plans.get(planId);
  if (!plan) return null;

  const changeIndex = plan.changes.findIndex(c => c.id === changeId);
  if (changeIndex === -1) return null;

  const updatedChange: ChangeItem = {
    ...plan.changes[changeIndex],
    ...updates,
  };

  plan.changes[changeIndex] = updatedChange;
  plans.set(planId, plan);

  return updatedChange;
}

/**
 * List plans with filters
 */
export function listPlans(filters: {
  status?: PlanStatus[];
  scope?: PlanScope[];
  createdBy?: string;
  createdFrom?: CreatedFrom[];
  limit?: number;
  offset?: number;
} = {}): { plans: ChangePlan[]; total: number } {
  let result = Array.from(plans.values());

  if (filters.status && filters.status.length > 0) {
    result = result.filter(p => filters.status!.includes(p.status));
  }

  if (filters.scope && filters.scope.length > 0) {
    result = result.filter(p => filters.scope!.includes(p.scope));
  }

  if (filters.createdBy) {
    result = result.filter(p => p.createdBy === filters.createdBy);
  }

  if (filters.createdFrom && filters.createdFrom.length > 0) {
    result = result.filter(p => filters.createdFrom!.includes(p.createdFrom));
  }

  // Sort by created date descending
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = result.length;

  if (filters.offset) {
    result = result.slice(filters.offset);
  }

  if (filters.limit) {
    result = result.slice(0, filters.limit);
  }

  return { plans: result, total };
}

/**
 * Record history entry
 */
function recordHistory(
  planId: string,
  action: PlanHistoryEntry['action'],
  userId: string,
  details?: Record<string, unknown>
): void {
  const entry: PlanHistoryEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    planId,
    action,
    timestamp: new Date(),
    userId,
    details,
  };

  const planHistory = history.get(planId) || [];
  planHistory.push(entry);
  history.set(planId, planHistory);
}

/**
 * Get plan history
 */
export function getPlanHistory(planId: string): PlanHistoryEntry[] {
  return history.get(planId) || [];
}

/**
 * Get overall statistics
 */
export function getStats(): ChangeManagementStats {
  const allPlans = Array.from(plans.values());

  const byStatus: Record<PlanStatus, number> = {
    draft: 0,
    pending_approval: 0,
    approved: 0,
    applying: 0,
    applied: 0,
    failed: 0,
    rolled_back: 0,
    cancelled: 0,
  };

  const byScope: Record<PlanScope, number> = {
    content: 0,
    entity: 0,
    seo: 0,
    aeo: 0,
    canonical: 0,
    links: 0,
    monetization: 0,
    global: 0,
  };

  const byRisk: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  let totalExecutionTime = 0;
  let executedCount = 0;
  let successCount = 0;

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  let recentActivity = 0;

  for (const plan of allPlans) {
    byStatus[plan.status]++;
    byScope[plan.scope]++;
    byRisk[plan.riskLevel]++;

    if (new Date(plan.createdAt).getTime() > oneDayAgo) {
      recentActivity++;
    }

    if (plan.executionDurationMs) {
      totalExecutionTime += plan.executionDurationMs;
      executedCount++;
    }

    if (plan.status === 'applied') {
      successCount++;
    }
  }

  const appliedOrFailed = byStatus.applied + byStatus.failed;

  return {
    totalPlans: allPlans.length,
    byStatus,
    byScope,
    byRisk,
    recentActivity,
    avgExecutionTime: executedCount > 0 ? totalExecutionTime / executedCount : 0,
    successRate: appliedOrFailed > 0 ? (successCount / appliedOrFailed) * 100 : 100,
  };
}

/**
 * Delete a draft plan
 */
export function deletePlan(id: string): boolean {
  const plan = plans.get(id);
  if (!plan) return false;
  if (plan.status !== 'draft' && plan.status !== 'cancelled') {
    throw new Error('Can only delete draft or cancelled plans');
  }

  plans.delete(id);
  history.delete(id);
  return true;
}
