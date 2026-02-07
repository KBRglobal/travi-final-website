export interface ContentPerformance {
  entityId: string;
  entityType: string;
  impressions: number;
  clicks: number;
  ctr: number;
  score: number;
  lastUpdated: Date;
  createdAt: Date;
}

interface StoredPerformance {
  entityType: string;
  impressions: number;
  clicks: number;
  lastUpdated: Date;
  createdAt: Date;
  lastScoreCalculation: Date;
  cachedScore: number;
}

const performanceStore = new Map<string, StoredPerformance>();

const DAILY_DECAY_RATE = 0.1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function calculateDaysSince(date: Date): number {
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);
}

function applyDecay(baseScore: number, daysSinceLastUpdate: number): number {
  if (daysSinceLastUpdate <= 0) return baseScore;
  const decayMultiplier = Math.pow(1 - DAILY_DECAY_RATE, daysSinceLastUpdate);
  return Math.max(0, baseScore * decayMultiplier);
}

function calculateCtr(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

function calculateBaseScore(clicks: number, impressions: number, ctr: number): number {
  const clickWeight = 3;
  const impressionWeight = 0.5;
  const ctrWeight = 10;

  const clickScore = Math.min(clicks * clickWeight, 40);
  const impressionScore = Math.min(impressions * impressionWeight, 30);
  const ctrScore = Math.min(ctr * ctrWeight, 30);

  return Math.min(100, clickScore + impressionScore + ctrScore);
}

export function recordImpression(entityId: string, entityType: string): ContentPerformance {
  const existing = performanceStore.get(entityId);
  const now = new Date();

  const updated: StoredPerformance = {
    entityType,
    impressions: (existing?.impressions ?? 0) + 1,
    clicks: existing?.clicks ?? 0,
    lastUpdated: now,
    createdAt: existing?.createdAt ?? now,
    lastScoreCalculation: now,
    cachedScore: 0,
  };

  const ctr = calculateCtr(updated.clicks, updated.impressions);
  updated.cachedScore = calculateBaseScore(updated.clicks, updated.impressions, ctr);

  performanceStore.set(entityId, updated);

  return {
    entityId,
    entityType: updated.entityType,
    impressions: updated.impressions,
    clicks: updated.clicks,
    ctr,
    score: updated.cachedScore,
    lastUpdated: updated.lastUpdated,
    createdAt: updated.createdAt,
  };
}

export function recordClick(entityId: string, entityType: string): ContentPerformance {
  const existing = performanceStore.get(entityId);
  const now = new Date();

  const updated: StoredPerformance = {
    entityType,
    impressions: existing?.impressions ?? 0,
    clicks: (existing?.clicks ?? 0) + 1,
    lastUpdated: now,
    createdAt: existing?.createdAt ?? now,
    lastScoreCalculation: now,
    cachedScore: 0,
  };

  const ctr = calculateCtr(updated.clicks, updated.impressions);
  updated.cachedScore = calculateBaseScore(updated.clicks, updated.impressions, ctr);

  performanceStore.set(entityId, updated);

  return {
    entityId,
    entityType: updated.entityType,
    impressions: updated.impressions,
    clicks: updated.clicks,
    ctr,
    score: updated.cachedScore,
    lastUpdated: updated.lastUpdated,
    createdAt: updated.createdAt,
  };
}

export function getPerformanceScore(entityId: string): number {
  const stored = performanceStore.get(entityId);
  if (!stored) return 0;

  const daysSinceUpdate = calculateDaysSince(stored.lastUpdated);
  const decayedScore = applyDecay(stored.cachedScore, daysSinceUpdate);

  return Math.round(decayedScore * 100) / 100;
}

export function getPerformance(entityId: string): ContentPerformance | null {
  const stored = performanceStore.get(entityId);
  if (!stored) return null;

  const ctr = calculateCtr(stored.clicks, stored.impressions);
  const daysSinceUpdate = calculateDaysSince(stored.lastUpdated);
  const decayedScore = applyDecay(stored.cachedScore, daysSinceUpdate);

  return {
    entityId,
    entityType: stored.entityType,
    impressions: stored.impressions,
    clicks: stored.clicks,
    ctr: Math.round(ctr * 100) / 100,
    score: Math.round(decayedScore * 100) / 100,
    lastUpdated: stored.lastUpdated,
    createdAt: stored.createdAt,
  };
}

export function getAllPerformance(): ContentPerformance[] {
  const results: ContentPerformance[] = [];

  for (const [entityId, stored] of performanceStore.entries()) {
    const ctr = calculateCtr(stored.clicks, stored.impressions);
    const daysSinceUpdate = calculateDaysSince(stored.lastUpdated);
    const decayedScore = applyDecay(stored.cachedScore, daysSinceUpdate);

    results.push({
      entityId,
      entityType: stored.entityType,
      impressions: stored.impressions,
      clicks: stored.clicks,
      ctr: Math.round(ctr * 100) / 100,
      score: Math.round(decayedScore * 100) / 100,
      lastUpdated: stored.lastUpdated,
      createdAt: stored.createdAt,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function clearPerformance(entityId: string): boolean {
  return performanceStore.delete(entityId);
}

export { DAILY_DECAY_RATE };
