/**
 * Autonomy Enforcement SDK - Budget Consumer
 * Atomic budget consumption and tracking
 */

import { incrementBudgetCounter, checkBudgetStatus, getBudgetSummary } from "../policy/budgets";
import { generateTargetKey, getPeriodBoundaries } from "../policy/config";
import { PolicyTarget, BudgetPeriod, BudgetLimit } from "../policy/types";
import { ConsumptionRecord, GuardedFeature, DEFAULT_ENFORCEMENT_CONFIG } from "./types";

// In-memory consumption buffer for batch updates
interface BufferedConsumption {
  targetKey: string;
  period: BudgetPeriod;
  actionsExecuted: number;
  tokensActual: number;
  aiSpendCents: number;
  failuresCount: number;
  lastUpdated: Date;
}

const consumptionBuffer = new Map<string, BufferedConsumption>();
const MAX_BUFFER_SIZE = 200;
const FLUSH_INTERVAL_MS = 10000;
const BATCH_THRESHOLD = 10;

let flushTimer: ReturnType<typeof setInterval> | null = null;

function getBufferKey(targetKey: string, period: BudgetPeriod): string {
  return `${targetKey}:${period}`;
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flushConsumptionBuffer, FLUSH_INTERVAL_MS);
}

async function flushConsumptionBuffer() {
  if (consumptionBuffer.size === 0) return;

  const toFlush = Array.from(consumptionBuffer.entries());
  consumptionBuffer.clear();

  for (const [key, consumption] of toFlush) {
    try {
      await incrementBudgetCounter(consumption.targetKey, consumption.period, {
        actionsExecuted: consumption.actionsExecuted,
        tokensActual: consumption.tokensActual,
        aiSpendCents: consumption.aiSpendCents,
        failuresCount: consumption.failuresCount,
      });
    } catch (error) {
      // Re-add to buffer if flush fails (bounded)
      if (consumptionBuffer.size < MAX_BUFFER_SIZE) {
        consumptionBuffer.set(key, consumption);
      }
    }
  }
}

function featureToTargetKey(feature: GuardedFeature): string {
  return `feature:${feature}`;
}

/**
 * Consume budget atomically
 * Buffers consumption for batch updates to reduce DB load
 */
export async function consumeBudget(
  feature: GuardedFeature,
  metrics: {
    tokensUsed?: number;
    aiSpendCents?: number;
    isFailure?: boolean;
  },
  periods: BudgetPeriod[] = ["hourly", "daily"]
): Promise<void> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) return;

  startFlushTimer();

  const targetKey = featureToTargetKey(feature);

  for (const period of periods) {
    const bufferKey = getBufferKey(targetKey, period);

    let existing = consumptionBuffer.get(bufferKey);
    if (!existing) {
      existing = {
        targetKey,
        period,
        actionsExecuted: 0,
        tokensActual: 0,
        aiSpendCents: 0,
        failuresCount: 0,
        lastUpdated: new Date(),
      };
    }

    existing.actionsExecuted += 1;
    existing.tokensActual += metrics.tokensUsed || 0;
    existing.aiSpendCents += metrics.aiSpendCents || 0;
    existing.failuresCount += metrics.isFailure ? 1 : 0;
    existing.lastUpdated = new Date();

    consumptionBuffer.set(bufferKey, existing);

    // Enforce max buffer size
    if (consumptionBuffer.size > MAX_BUFFER_SIZE) {
      const firstKey = consumptionBuffer.keys().next().value;
      if (firstKey) consumptionBuffer.delete(firstKey);
    }

    // Flush if batch threshold reached
    if (existing.actionsExecuted >= BATCH_THRESHOLD) {
      flushConsumptionBuffer().catch(err => {
        console.error("Budget consumption buffer flush error:", err);
      });
    }
  }
}

/**
 * Record consumption from a completed operation
 */
export async function recordConsumption(record: ConsumptionRecord): Promise<void> {
  await consumeBudget(record.feature, {
    tokensUsed: record.tokensUsed,
    aiSpendCents: record.aiSpendCents,
    isFailure: !record.success,
  });
}

/**
 * Get current budget status for a feature
 */
export async function getFeatureBudgetStatus(
  feature: GuardedFeature,
  limits: BudgetLimit[]
): Promise<{
  actionsUsed: number;
  actionsLimit: number;
  actionsRemaining: number;
  aiSpendUsed: number;
  aiSpendLimit: number;
  aiSpendRemaining: number;
  percentUsed: number;
  isExhausted: boolean;
}> {
  const targetKey = featureToTargetKey(feature);
  const statuses = await checkBudgetStatus(targetKey, limits);

  // Use the most restrictive (highest % used) status
  let mostRestrictive = statuses[0];
  let highestPercent = 0;

  for (const status of statuses) {
    const actionPercent = (status.actionsExecuted / status.actionsLimit) * 100;
    const spendPercent = (status.aiSpendActual / status.aiSpendLimit) * 100;
    const maxPercent = Math.max(actionPercent, spendPercent);

    if (maxPercent > highestPercent) {
      highestPercent = maxPercent;
      mostRestrictive = status;
    }
  }

  const isExhausted =
    mostRestrictive.actionsRemaining <= 0 || mostRestrictive.aiSpendRemaining <= 0;

  return {
    actionsUsed: mostRestrictive.actionsExecuted,
    actionsLimit: mostRestrictive.actionsLimit,
    actionsRemaining: mostRestrictive.actionsRemaining,
    aiSpendUsed: mostRestrictive.aiSpendActual,
    aiSpendLimit: mostRestrictive.aiSpendLimit,
    aiSpendRemaining: mostRestrictive.aiSpendRemaining,
    percentUsed: Math.round(highestPercent),
    isExhausted,
  };
}

/**
 * Pre-reserve budget before expensive operation
 * Useful for operations that need guaranteed budget
 */
export async function reserveBudget(
  feature: GuardedFeature,
  estimatedTokens: number,
  estimatedCostCents: number,
  limits: BudgetLimit[]
): Promise<{ reserved: boolean; reason?: string }> {
  const status = await getFeatureBudgetStatus(feature, limits);

  if (status.isExhausted) {
    return { reserved: false, reason: "Budget exhausted" };
  }

  // Check if reservation would exceed limits
  const projectedTokensPercent = ((status.actionsUsed + 1) / status.actionsLimit) * 100;
  const projectedSpendPercent =
    ((status.aiSpendUsed + estimatedCostCents) / status.aiSpendLimit) * 100;

  if (projectedTokensPercent > 100) {
    return { reserved: false, reason: "Action limit would be exceeded" };
  }

  if (projectedSpendPercent > 100) {
    return { reserved: false, reason: "AI spend limit would be exceeded" };
  }

  // Reserve by consuming proposed units
  const targetKey = featureToTargetKey(feature);
  for (const limit of limits) {
    await incrementBudgetCounter(targetKey, limit.period, {
      actionsProposed: 1,
      tokensEstimated: estimatedTokens,
    });
  }

  return { reserved: true };
}

/**
 * Release a previous reservation (if operation was cancelled)
 */
export async function releaseReservation(
  feature: GuardedFeature,
  estimatedTokens: number,
  limits: BudgetLimit[]
): Promise<void> {
  const targetKey = featureToTargetKey(feature);

  for (const limit of limits) {
    await incrementBudgetCounter(targetKey, limit.period, {
      actionsProposed: -1,
      tokensEstimated: -estimatedTokens,
    });
  }
}

/**
 * Get budget summary across all features
 */
export async function getAllBudgetsSummary(): Promise<{
  totalActions: number;
  totalSpend: number;
  topConsumers: Array<{ feature: string; actions: number; spend: number }>;
  byPeriod: Record<BudgetPeriod, { actions: number; spend: number }>;
}> {
  const summary = await getBudgetSummary();

  // Transform top consumers
  const topConsumers = summary.topConsumers.map(c => ({
    feature: c.targetKey.replace("feature:", ""),
    actions: c.actionsExecuted,
    spend: 0, // Would need to query for actual spend
  }));

  // Aggregate by period
  const byPeriod: Record<BudgetPeriod, { actions: number; spend: number }> = {
    hourly: { actions: 0, spend: 0 },
    daily: { actions: 0, spend: 0 },
    weekly: { actions: 0, spend: 0 },
    monthly: { actions: 0, spend: 0 },
  };

  return {
    totalActions: summary.topConsumers.reduce((acc, c) => acc + c.actionsExecuted, 0),
    totalSpend: 0,
    topConsumers,
    byPeriod,
  };
}

/**
 * Check if consumption rate is sustainable
 */
export function isRateSustainable(
  currentUsed: number,
  limit: number,
  period: BudgetPeriod
): { sustainable: boolean; projectedExhaustion?: Date } {
  const { start, end } = getPeriodBoundaries(period);
  const periodMs = end.getTime() - start.getTime();
  const elapsedMs = Date.now() - start.getTime();
  const elapsedFraction = elapsedMs / periodMs;

  if (elapsedFraction <= 0) {
    return { sustainable: true };
  }

  const projectedTotal = currentUsed / elapsedFraction;
  const sustainable = projectedTotal <= limit;

  if (!sustainable) {
    // Calculate when budget will exhaust at current rate
    const exhaustionFraction = limit / projectedTotal;
    const exhaustionMs = start.getTime() + periodMs * exhaustionFraction;
    return { sustainable: false, projectedExhaustion: new Date(exhaustionMs) };
  }

  return { sustainable: true };
}

// Cleanup on shutdown
export function shutdownBudgetConsumer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushConsumptionBuffer().catch(err => {
    console.error("Budget consumer shutdown flush error:", err);
  });
}
