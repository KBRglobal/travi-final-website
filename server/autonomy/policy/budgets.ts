/**
 * Autonomy Policy Engine - Budget Management
 * Tracks and enforces resource budgets with concurrency safety
 */

import { db } from "../../db";
import { autonomyBudgets } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { BudgetCounter, BudgetStatus, BudgetPeriod, BudgetLimit } from "./types";
import { getPeriodBoundaries } from "./config";

const BUDGET_OPERATION_TIMEOUT_MS = 5000;

// In-memory cache for frequent reads (with bounded size)
const budgetCache = new Map<string, { data: BudgetCounter; expiresAt: number }>();
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 30000; // 30 seconds

function getCacheKey(targetKey: string, period: BudgetPeriod): string {
  return `${targetKey}:${period}`;
}

function isEnabled(): boolean {
  return process.env.ENABLE_AUTONOMY_POLICY === "true";
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Budget operation timeout")), ms)
    ),
  ]);
}

export async function getOrCreateBudgetCounter(
  targetKey: string,
  period: BudgetPeriod
): Promise<BudgetCounter> {
  const cacheKey = getCacheKey(targetKey, period);

  // Check cache first
  const cached = budgetCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const { start, end } = getPeriodBoundaries(period);

  // Try to get existing counter
  const [existing] = await withTimeout(
    db
      .select()
      .from(autonomyBudgets)
      .where(
        and(
          eq(autonomyBudgets.targetKey, targetKey),
          eq(autonomyBudgets.period, period),
          eq(autonomyBudgets.periodStart, start)
        )
      )
      .limit(1),
    BUDGET_OPERATION_TIMEOUT_MS
  );

  if (existing) {
    const counter: BudgetCounter = {
      id: existing.id,
      targetKey: existing.targetKey,
      period: existing.period as BudgetPeriod,
      periodStart: existing.periodStart,
      periodEnd: existing.periodEnd,
      actionsExecuted: existing.actionsExecuted,
      actionsProposed: existing.actionsProposed,
      tokensEstimated: existing.tokensEstimated,
      tokensActual: existing.tokensActual,
      writesCount: existing.writesCount,
      failuresCount: existing.failuresCount,
      contentMutations: existing.contentMutations,
      aiSpendCents: existing.aiSpendCents,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };

    // Update cache
    if (budgetCache.size >= MAX_CACHE_SIZE) {
      const firstKey = budgetCache.keys().next().value;
      if (firstKey) budgetCache.delete(firstKey);
    }
    budgetCache.set(cacheKey, { data: counter, expiresAt: Date.now() + CACHE_TTL_MS });

    return counter;
  }

  // Create new counter
  const [newCounter] = await withTimeout(
    db
      .insert(autonomyBudgets)
      .values({
        targetKey,
        period,
        periodStart: start,
        periodEnd: end,
        actionsExecuted: 0,
        actionsProposed: 0,
        tokensEstimated: 0,
        tokensActual: 0,
        writesCount: 0,
        failuresCount: 0,
        contentMutations: 0,
        aiSpendCents: 0,
      } as any)
      .returning(),
    BUDGET_OPERATION_TIMEOUT_MS
  );

  const counter: BudgetCounter = {
    id: newCounter.id,
    targetKey: newCounter.targetKey,
    period: newCounter.period as BudgetPeriod,
    periodStart: newCounter.periodStart,
    periodEnd: newCounter.periodEnd,
    actionsExecuted: newCounter.actionsExecuted,
    actionsProposed: newCounter.actionsProposed,
    tokensEstimated: newCounter.tokensEstimated,
    tokensActual: newCounter.tokensActual,
    writesCount: newCounter.writesCount,
    failuresCount: newCounter.failuresCount,
    contentMutations: newCounter.contentMutations,
    aiSpendCents: newCounter.aiSpendCents,
    createdAt: newCounter.createdAt,
    updatedAt: newCounter.updatedAt,
  };

  budgetCache.set(cacheKey, { data: counter, expiresAt: Date.now() + CACHE_TTL_MS });
  return counter;
}

export async function incrementBudgetCounter(
  targetKey: string,
  period: BudgetPeriod,
  increments: {
    actionsExecuted?: number;
    actionsProposed?: number;
    tokensEstimated?: number;
    tokensActual?: number;
    writesCount?: number;
    failuresCount?: number;
    contentMutations?: number;
    aiSpendCents?: number;
  }
): Promise<BudgetCounter> {
  const { start } = getPeriodBoundaries(period);

  // Use atomic update with row-level locking
  const [updated] = await withTimeout(
    db
      .update(autonomyBudgets)
      .set({
        actionsExecuted: sql`${autonomyBudgets.actionsExecuted} + ${increments.actionsExecuted || 0}`,
        actionsProposed: sql`${autonomyBudgets.actionsProposed} + ${increments.actionsProposed || 0}`,
        tokensEstimated: sql`${autonomyBudgets.tokensEstimated} + ${increments.tokensEstimated || 0}`,
        tokensActual: sql`${autonomyBudgets.tokensActual} + ${increments.tokensActual || 0}`,
        writesCount: sql`${autonomyBudgets.writesCount} + ${increments.writesCount || 0}`,
        failuresCount: sql`${autonomyBudgets.failuresCount} + ${increments.failuresCount || 0}`,
        contentMutations: sql`${autonomyBudgets.contentMutations} + ${increments.contentMutations || 0}`,
        aiSpendCents: sql`${autonomyBudgets.aiSpendCents} + ${increments.aiSpendCents || 0}`,
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(autonomyBudgets.targetKey, targetKey),
          eq(autonomyBudgets.period, period),
          eq(autonomyBudgets.periodStart, start)
        )
      )
      .returning(),
    BUDGET_OPERATION_TIMEOUT_MS
  );

  if (!updated) {
    // Counter doesn't exist, create and increment
    await getOrCreateBudgetCounter(targetKey, period);
    return incrementBudgetCounter(targetKey, period, increments);
  }

  const counter: BudgetCounter = {
    id: updated.id,
    targetKey: updated.targetKey,
    period: updated.period as BudgetPeriod,
    periodStart: updated.periodStart,
    periodEnd: updated.periodEnd,
    actionsExecuted: updated.actionsExecuted,
    actionsProposed: updated.actionsProposed,
    tokensEstimated: updated.tokensEstimated,
    tokensActual: updated.tokensActual,
    writesCount: updated.writesCount,
    failuresCount: updated.failuresCount,
    contentMutations: updated.contentMutations,
    aiSpendCents: updated.aiSpendCents,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };

  // Invalidate cache
  const cacheKey = getCacheKey(targetKey, period);
  budgetCache.delete(cacheKey);

  return counter;
}

export async function checkBudgetStatus(
  targetKey: string,
  limits: BudgetLimit[]
): Promise<BudgetStatus[]> {
  const statuses: BudgetStatus[] = [];

  for (const limit of limits) {
    const counter = await getOrCreateBudgetCounter(targetKey, limit.period);

    statuses.push({
      targetKey,
      period: limit.period,
      periodStart: counter.periodStart,
      periodEnd: counter.periodEnd,
      actionsExecuted: counter.actionsExecuted,
      actionsLimit: limit.maxActions,
      actionsRemaining: Math.max(0, limit.maxActions - counter.actionsExecuted),
      aiSpendActual: counter.aiSpendCents,
      aiSpendLimit: limit.maxAiSpend,
      aiSpendRemaining: Math.max(0, limit.maxAiSpend - counter.aiSpendCents),
      dbWritesCount: counter.writesCount,
      dbWritesLimit: limit.maxDbWrites,
      dbWritesRemaining: Math.max(0, limit.maxDbWrites - counter.writesCount),
      contentMutationsCount: counter.contentMutations,
      contentMutationsLimit: limit.maxContentMutations,
      contentMutationsRemaining: Math.max(0, limit.maxContentMutations - counter.contentMutations),
      failuresCount: counter.failuresCount,
    });
  }

  return statuses;
}

export async function isBudgetExhausted(
  targetKey: string,
  limits: BudgetLimit[]
): Promise<{ exhausted: boolean; reason?: string }> {
  const statuses = await checkBudgetStatus(targetKey, limits);

  for (const status of statuses) {
    if (status.actionsRemaining <= 0) {
      return { exhausted: true, reason: `${status.period} action limit reached` };
    }
    if (status.aiSpendRemaining <= 0) {
      return { exhausted: true, reason: `${status.period} AI spend limit reached` };
    }
    if (status.dbWritesRemaining <= 0) {
      return { exhausted: true, reason: `${status.period} DB writes limit reached` };
    }
    if (status.contentMutationsRemaining <= 0) {
      return { exhausted: true, reason: `${status.period} content mutations limit reached` };
    }
  }

  return { exhausted: false };
}

export async function resetBudget(targetKey: string, period?: BudgetPeriod): Promise<number> {
  const conditions = [eq(autonomyBudgets.targetKey, targetKey)];

  if (period) {
    const { start } = getPeriodBoundaries(period);
    conditions.push(eq(autonomyBudgets.period, period), eq(autonomyBudgets.periodStart, start));
  }

  const result = await db
    .update(autonomyBudgets)
    .set({
      actionsExecuted: 0,
      actionsProposed: 0,
      tokensEstimated: 0,
      tokensActual: 0,
      writesCount: 0,
      failuresCount: 0,
      contentMutations: 0,
      aiSpendCents: 0,
      updatedAt: new Date(),
    } as any)
    .where(and(...conditions))
    .returning();

  // Clear relevant cache entries
  if (period) {
    budgetCache.delete(getCacheKey(targetKey, period));
  } else {
    for (const p of ["hourly", "daily", "weekly", "monthly"] as BudgetPeriod[]) {
      budgetCache.delete(getCacheKey(targetKey, p));
    }
  }

  return result.length;
}

export async function getBudgetSummary(): Promise<{
  totalCounters: number;
  byPeriod: Record<BudgetPeriod, number>;
  topConsumers: Array<{ targetKey: string; actionsExecuted: number }>;
}> {
  const allCounters = await db.select().from(autonomyBudgets).limit(1000);

  const byPeriod: Record<BudgetPeriod, number> = {
    hourly: 0,
    daily: 0,
    weekly: 0,
    monthly: 0,
  };

  const consumerMap = new Map<string, number>();

  for (const counter of allCounters) {
    byPeriod[counter.period as BudgetPeriod]++;
    const current = consumerMap.get(counter.targetKey) || 0;
    consumerMap.set(counter.targetKey, current + counter.actionsExecuted);
  }

  const topConsumers = Array.from(consumerMap.entries())
    .map(([targetKey, actionsExecuted]) => ({ targetKey, actionsExecuted }))
    .sort((a, b) => b.actionsExecuted - a.actionsExecuted)
    .slice(0, 10);

  return {
    totalCounters: allCounters.length,
    byPeriod,
    topConsumers,
  };
}

export function clearBudgetCache(): void {
  budgetCache.clear();
}
