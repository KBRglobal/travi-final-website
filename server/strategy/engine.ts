/**
 * Strategic Priority Engine - Main Engine
 * Orchestrates priority computation across all content
 */

import { db } from '../db';
import { contents } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import {
  StrategyPriority,
  StrategySnapshot,
  StrategyWeights,
  PriorityReason,
  DEFAULT_STRATEGY_CONFIG,
  DEFAULT_STRATEGY_WEIGHTS,
} from './types';
import { computeContentPriority, applyWeightAdjustments } from './scorer';

// Priority cache
const priorityCache = new Map<string, StrategyPriority>();
const MAX_CACHE_SIZE = 1000;

// Current weights (can be adjusted via feedback)
let currentWeights: StrategyWeights = { ...DEFAULT_STRATEGY_WEIGHTS };

function isEnabled(): boolean {
  return process.env.ENABLE_STRATEGY_ENGINE === 'true';
}

export function getStrategyWeights(): StrategyWeights {
  return { ...currentWeights };
}

export function updateStrategyWeights(adjustments: Partial<StrategyWeights>): StrategyWeights {
  currentWeights = {
    ...currentWeights,
    ...adjustments,
  };

  // Normalize weights to sum to 1
  const total = Object.values(currentWeights).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const key of Object.keys(currentWeights) as (keyof StrategyWeights)[]) {
      currentWeights[key] = currentWeights[key] / total;
    }
  }

  return { ...currentWeights };
}

export function resetStrategyWeights(): StrategyWeights {
  currentWeights = { ...DEFAULT_STRATEGY_WEIGHTS };
  return { ...currentWeights };
}

export async function getPriority(contentId: string): Promise<StrategyPriority | null> {
  if (!isEnabled()) return null;

  // Check cache
  const cached = priorityCache.get(contentId);
  if (cached && cached.expiresAt > new Date()) {
    return cached;
  }

  // Compute new priority
  const priority = await computeContentPriority(contentId);

  // Enforce cache size limit
  if (priorityCache.size >= MAX_CACHE_SIZE) {
    const oldest = Array.from(priorityCache.entries())
      .sort((a, b) => a[1].computedAt.getTime() - b[1].computedAt.getTime())
      .slice(0, 100);
    for (const [key] of oldest) {
      priorityCache.delete(key);
    }
  }

  priorityCache.set(contentId, priority);
  return priority;
}

export async function computeAllPriorities(
  limit?: number
): Promise<StrategyPriority[]> {
  if (!isEnabled()) return [];

  const maxItems = limit || DEFAULT_STRATEGY_CONFIG.maxPrioritiesPerBatch;

  // Get published content
  const allContent = await db
    .select({ id: contents.id })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .limit(maxItems);

  const priorities: StrategyPriority[] = [];

  // Process in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < allContent.length; i += batchSize) {
    const batch = allContent.slice(i, i + batchSize);
    const batchPriorities = await Promise.all(
      batch.map(c => getPriority(c.id))
    );
    priorities.push(...batchPriorities.filter((p): p is StrategyPriority => p !== null));
  }

  // Sort by priority score (highest first)
  priorities.sort((a, b) => b.priorityScore - a.priorityScore);

  return priorities;
}

export async function getTopPriorities(limit = 20): Promise<StrategyPriority[]> {
  const all = await computeAllPriorities(100);
  return all
    .filter(p => p.priorityScore >= DEFAULT_STRATEGY_CONFIG.minScoreThreshold)
    .slice(0, limit);
}

export async function getPrioritiesByReason(
  reason: PriorityReason,
  limit = 20
): Promise<StrategyPriority[]> {
  const all = await computeAllPriorities(100);
  return all
    .filter(p => p.primaryReason === reason || p.secondaryReasons.includes(reason))
    .slice(0, limit);
}

export async function getStrategySnapshot(): Promise<StrategySnapshot> {
  const priorities = await computeAllPriorities(100);

  const byReason: Record<PriorityReason, number> = {} as Record<PriorityReason, number>;
  let totalScore = 0;

  for (const priority of priorities) {
    byReason[priority.primaryReason] = (byReason[priority.primaryReason] || 0) + 1;
    totalScore += priority.priorityScore;
  }

  return {
    generatedAt: new Date(),
    totalPriorities: priorities.length,
    topPriorities: priorities.slice(0, 10),
    byReason,
    averageScore: priorities.length > 0 ? totalScore / priorities.length : 0,
    weights: getStrategyWeights(),
  };
}

export function invalidatePriorityCache(contentId?: string): void {
  if (contentId) {
    priorityCache.delete(contentId);
  } else {
    priorityCache.clear();
  }
}

export function getPriorityCacheStats(): { size: number; oldestEntry: Date | null } {
  if (priorityCache.size === 0) {
    return { size: 0, oldestEntry: null };
  }

  const oldest = Array.from(priorityCache.values())
    .sort((a, b) => a.computedAt.getTime() - b.computedAt.getTime())[0];

  return {
    size: priorityCache.size,
    oldestEntry: oldest?.computedAt || null,
  };
}
