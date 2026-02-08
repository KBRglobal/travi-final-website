/**
 * Autonomy Control Plane - Risk Dashboard
 * Aggregated metrics and status for the control plane UI
 */

import { db } from "../../db";
import { autonomyDecisionLogs } from "@shared/schema";

import { eq, and, gt, desc, sql, count } from "drizzle-orm";
import { getBudgetSummary, checkBudgetStatus } from "../policy/budgets";

type TimePeriod = "hour" | "day" | "week";
type ActivityType = "decision" | "override" | "policy_change";
import { getPolicies } from "../policy/repository";
import { getOverrideStats, listOverrides } from "./overrides";
import { GuardedFeature, DEFAULT_ENFORCEMENT_CONFIG } from "../enforcement/types";
import { BudgetPeriod } from "../policy/types";

// Dashboard status levels
export type StatusLevel = "healthy" | "warning" | "critical";

export interface DashboardStatus {
  level: StatusLevel;
  enabled: boolean;
  degradedMode: boolean;
  lastUpdated: Date;
}

export interface DecisionSummary {
  period: TimePeriod;
  total: number;
  allowed: number;
  warned: number;
  blocked: number;
  blockRate: number;
}

export interface BudgetSummary {
  feature: string;
  period: BudgetPeriod;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  isExhausted: boolean;
}

export interface TopOffender {
  targetKey: string;
  feature: string;
  blockedCount: number;
  lastBlocked: Date;
}

export interface ControlPlaneDashboard {
  status: DashboardStatus;
  decisions: {
    lastHour: DecisionSummary;
    lastDay: DecisionSummary;
  };
  budgets: BudgetSummary[];
  topOffenders: TopOffender[];
  activeOverrides: number;
  policyCount: number;
  recentActivity: Array<{
    type: ActivityType;
    description: string;
    timestamp: Date;
  }>;
}

/**
 * Get full dashboard data
 */
export async function getDashboardData(): Promise<ControlPlaneDashboard> {
  const [decisionsLastHour, decisionsLastDay, budgetData, topOffenders, overrideStats, policies] =
    await Promise.all([
      getDecisionSummary("hour"),
      getDecisionSummary("day"),
      getAllBudgetSummaries(),
      getTopOffenders(10),
      getOverrideStats(),
      getPolicies(),
    ]);

  const status = calculateStatus(decisionsLastHour, budgetData);

  return {
    status,
    decisions: {
      lastHour: decisionsLastHour,
      lastDay: decisionsLastDay,
    },
    budgets: budgetData,
    topOffenders,
    activeOverrides: overrideStats.totalActive,
    policyCount: policies.length,
    recentActivity: await getRecentActivity(20),
  };
}

/**
 * Get decision summary for a time period
 */
async function getDecisionSummary(period: TimePeriod): Promise<DecisionSummary> {
  const now = new Date();
  let since: Date;

  switch (period) {
    case "hour":
      since = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "day":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "week":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }

  try {
    const decisions = await db
      .select({
        decision: autonomyDecisionLogs.decision,
        count: count(),
      })
      .from(autonomyDecisionLogs)
      .where(gt(autonomyDecisionLogs.createdAt, since))
      .groupBy(autonomyDecisionLogs.decision);

    let allowed = 0;
    let warned = 0;
    let blocked = 0;

    for (const d of decisions) {
      switch (d.decision) {
        case "ALLOW":
          allowed = Number(d.count);
          break;
        case "WARN":
          warned = Number(d.count);
          break;
        case "BLOCK":
          blocked = Number(d.count);
          break;
      }
    }

    const total = allowed + warned + blocked;
    const blockRate = total > 0 ? (blocked / total) * 100 : 0;

    return { period, total, allowed, warned, blocked, blockRate };
  } catch {
    return { period, total: 0, allowed: 0, warned: 0, blocked: 0, blockRate: 0 };
  }
}

/**
 * Get budget summaries across all features
 */
async function getAllBudgetSummaries(): Promise<BudgetSummary[]> {
  try {
    await getBudgetSummary();
    const features: GuardedFeature[] = [
      "chat",
      "octopus",
      "search",
      "aeo",
      "translation",
      "images",
      "content_enrichment",
      "publishing",
    ];

    const results: BudgetSummary[] = [];

    for (const feature of features) {
      const targetKey = `feature:${feature}`;
      const defaultLimits = [
        {
          period: "hourly" as BudgetPeriod,
          maxActions: 100,
          maxAiSpend: 1000,
          maxDbWrites: 50,
          maxContentMutations: 20,
        },
        {
          period: "daily" as BudgetPeriod,
          maxActions: 1000,
          maxAiSpend: 5000,
          maxDbWrites: 500,
          maxContentMutations: 100,
        },
      ];

      const statuses = await checkBudgetStatus(targetKey, defaultLimits);

      for (const status of statuses) {
        const percentUsed = Math.round((status.actionsExecuted / status.actionsLimit) * 100);
        results.push({
          feature,
          period: status.period,
          used: status.actionsExecuted,
          limit: status.actionsLimit,
          remaining: status.actionsRemaining,
          percentUsed,
          isExhausted: status.actionsRemaining <= 0,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Get top blocked targets
 */
async function getTopOffenders(limit: number): Promise<TopOffender[]> {
  try {
    const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const offenders = await db
      .select({
        targetKey: autonomyDecisionLogs.targetKey,
        // Using actionType as a fallback for feature since feature doesn't exist in schema
        actionType: autonomyDecisionLogs.actionType,
        blockedCount: count(),
        lastBlocked: sql<Date>`MAX(${autonomyDecisionLogs.createdAt})`,
      })
      .from(autonomyDecisionLogs)
      .where(
        and(eq(autonomyDecisionLogs.decision, "BLOCK"), gt(autonomyDecisionLogs.createdAt, oneDay))
      )
      .groupBy(autonomyDecisionLogs.targetKey, autonomyDecisionLogs.actionType)
      .orderBy(desc(count()))
      .limit(limit);

    return offenders.map(o => ({
      targetKey: o.targetKey,
      feature: o.actionType || "unknown",
      blockedCount: Number(o.blockedCount),
      lastBlocked: o.lastBlocked,
    }));
  } catch {
    return [];
  }
}

/**
 * Get recent activity log
 */
async function getRecentActivity(limit: number): Promise<
  Array<{
    type: ActivityType;
    description: string;
    timestamp: Date;
  }>
> {
  const activity: Array<{
    type: ActivityType;
    description: string;
    timestamp: Date;
  }> = [];

  try {
    // Get recent blocks
    const recentBlocks = await db
      .select({
        targetKey: autonomyDecisionLogs.targetKey,
        actionType: autonomyDecisionLogs.actionType,
        createdAt: autonomyDecisionLogs.createdAt,
      })
      .from(autonomyDecisionLogs)
      .where(eq(autonomyDecisionLogs.decision, "BLOCK"))
      .orderBy(desc(autonomyDecisionLogs.createdAt))
      .limit(limit);

    for (const block of recentBlocks) {
      activity.push({
        type: "decision",
        description: `Blocked ${block.actionType || "operation"} on ${block.targetKey}`,
        timestamp: block.createdAt,
      });
    }

    // Get recent overrides
    const recentOverrides = await listOverrides({ limit: 5 });
    for (const override of recentOverrides) {
      activity.push({
        type: "override",
        description: `Override created for ${override.feature}: ${override.reason.slice(0, 50)}...`,
        timestamp: override.createdAt,
      });
    }
  } catch {
    void 0;
  }

  // Sort by timestamp and limit
  return activity.toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}

/**
 * Calculate overall status
 */
function calculateStatus(decisions: DecisionSummary, budgets: BudgetSummary[]): DashboardStatus {
  let level: StatusLevel = "healthy";

  // Check block rate
  if (decisions.blockRate > 50) {
    level = "critical";
  } else if (decisions.blockRate > 20) {
    level = "warning";
  }

  // Check budget exhaustion
  const exhaustedBudgets = budgets.filter(b => b.isExhausted);
  if (exhaustedBudgets.length > 0) {
    level = "critical";
  } else if (budgets.some(b => b.percentUsed > 80)) {
    if (level !== "critical") level = "warning";
  }

  return {
    level,
    enabled: DEFAULT_ENFORCEMENT_CONFIG.enabled,
    degradedMode: DEFAULT_ENFORCEMENT_CONFIG.degradedModeEnabled,
    lastUpdated: new Date(),
  };
}

/**
 * Simulate policy evaluation without consuming budget
 */
export async function simulateEvaluation(context: {
  feature: GuardedFeature;
  action: string;
  targetKey?: string;
}): Promise<{
  decision: string;
  reasons: Array<{ code: string; message: string }>;
  matchedPolicy?: string;
  budgetImpact?: {
    currentUsed: number;
    limit: number;
    afterAction: number;
  };
}> {
  const { enforceAutonomy } = await import("../enforcement");

  const result = await enforceAutonomy({
    feature: context.feature,
    action: context.action as any,
    entityId: context.targetKey,
    metadata: { simulation: true },
  });

  return {
    decision: result.decision,
    reasons: result.reasons.map(r => ({ code: r.code, message: r.message })),
    matchedPolicy: result.matchedPolicy,
    budgetImpact: result.budgetRemaining
      ? {
          currentUsed: 0, // Would need actual data
          limit: result.budgetRemaining.actions,
          afterAction: result.budgetRemaining.actions - 1,
        }
      : undefined,
  };
}

/**
 * Get trending metrics for charts
 */
export async function getTrendingMetrics(period: "hour" | "day" | "week"): Promise<
  Array<{
    timestamp: Date;
    allowed: number;
    blocked: number;
    warned: number;
  }>
> {
  // This would aggregate decision logs into time buckets
  // Simplified implementation returns empty for now
  return [];
}
