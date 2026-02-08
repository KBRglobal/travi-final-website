import * as fs from "node:fs";
import * as path from "node:path";

export interface ContentPerformance {
  entityId: string;
  entityType: string;
  impressions: number;
  clicks: number;
  scrollDepth: number;
  score: number;
  lastModified: Date;
  createdAt: Date;
}

interface StoredPerformanceData {
  entityId: string;
  entityType: string;
  impressions: number;
  clicks: number;
  scrollDepth: number;
  lastModified: string;
  createdAt: string;
}

interface RegenerationResult {
  allowed: boolean;
  reason?: string;
}

const performanceStore = new Map<string, ContentPerformance>();

const PERSISTENCE_FILE = path.join(process.cwd(), ".content-performance.json");
const PERSISTENCE_INTERVAL_MS = 60 * 1000;

const HIGH_PERFORMING_SCORE_THRESHOLD = 80;
const MODIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function calculateScore(perf: ContentPerformance): number {
  const clickWeight = 3;
  const impressionWeight = 0.5;
  const scrollWeight = 0.3;

  const ctr = perf.impressions > 0 ? (perf.clicks / perf.impressions) * 100 : 0;
  const ctrWeight = 10;

  const clickScore = Math.min(perf.clicks * clickWeight, 35);
  const impressionScore = Math.min(perf.impressions * impressionWeight, 25);
  const scrollScore = Math.min((perf.scrollDepth || 0) * scrollWeight, 20);
  const ctrScore = Math.min(ctr * ctrWeight, 20);

  return Math.min(100, Math.round(clickScore + impressionScore + scrollScore + ctrScore));
}

function loadFromDisk(): void {
  try {
    if (fs.existsSync(PERSISTENCE_FILE)) {
      const data = fs.readFileSync(PERSISTENCE_FILE, "utf-8");
      const parsed: StoredPerformanceData[] = JSON.parse(data);

      for (const item of parsed) {
        performanceStore.set(item.entityId, {
          entityId: item.entityId,
          entityType: item.entityType,
          impressions: item.impressions,
          clicks: item.clicks,
          scrollDepth: item.scrollDepth,
          score: 0,
          lastModified: new Date(item.lastModified),
          createdAt: new Date(item.createdAt),
        });
        const perf = performanceStore.get(item.entityId)!;
        perf.score = calculateScore(perf);
      }
    }
  } catch {
    void 0;
  }
}

function saveToDisk(): void {
  try {
    const data: StoredPerformanceData[] = [];

    for (const [, perf] of performanceStore.entries()) {
      data.push({
        entityId: perf.entityId,
        entityType: perf.entityType,
        impressions: perf.impressions,
        clicks: perf.clicks,
        scrollDepth: perf.scrollDepth,
        lastModified: perf.lastModified.toISOString(),
        createdAt: perf.createdAt.toISOString(),
      });
    }

    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    void 0;
  }
}

loadFromDisk();

let persistenceTimer: ReturnType<typeof setInterval> | null = null;

function startPersistenceTimer(): void {
  if (persistenceTimer) return;

  persistenceTimer = setInterval(() => {
    saveToDisk();
  }, PERSISTENCE_INTERVAL_MS);
}

function stopPersistenceTimer(): void {
  if (persistenceTimer) {
    clearInterval(persistenceTimer);
    persistenceTimer = null;
    saveToDisk();
  }
}

startPersistenceTimer();

process.on("beforeExit", () => {
  stopPersistenceTimer();
});

export function recordImpression(entityId: string, entityType: string): ContentPerformance {
  const existing = performanceStore.get(entityId);
  const now = new Date();

  const updated: ContentPerformance = {
    entityId,
    entityType,
    impressions: (existing?.impressions ?? 0) + 1,
    clicks: existing?.clicks ?? 0,
    scrollDepth: existing?.scrollDepth ?? 0,
    score: 0,
    lastModified: now,
    createdAt: existing?.createdAt ?? now,
  };

  updated.score = calculateScore(updated);
  performanceStore.set(entityId, updated);

  return updated;
}

export function recordClick(entityId: string, entityType: string): ContentPerformance {
  const existing = performanceStore.get(entityId);
  const now = new Date();

  const updated: ContentPerformance = {
    entityId,
    entityType,
    impressions: existing?.impressions ?? 0,
    clicks: (existing?.clicks ?? 0) + 1,
    scrollDepth: existing?.scrollDepth ?? 0,
    score: 0,
    lastModified: now,
    createdAt: existing?.createdAt ?? now,
  };

  updated.score = calculateScore(updated);
  performanceStore.set(entityId, updated);

  return updated;
}

export function recordScrollDepth(
  entityId: string,
  entityType: string,
  depth: number
): ContentPerformance {
  const existing = performanceStore.get(entityId);
  const now = new Date();
  const currentDepth = existing?.scrollDepth ?? 0;

  const updated: ContentPerformance = {
    entityId,
    entityType,
    impressions: existing?.impressions ?? 0,
    clicks: existing?.clicks ?? 0,
    scrollDepth: Math.max(currentDepth, Math.min(100, depth)),
    score: 0,
    lastModified: now,
    createdAt: existing?.createdAt ?? now,
  };

  updated.score = calculateScore(updated);
  performanceStore.set(entityId, updated);

  return updated;
}

export function getPerformanceScore(entityId: string): number {
  const perf = performanceStore.get(entityId);
  if (!perf) return 0;
  return perf.score;
}

export function getPerformance(entityId: string): ContentPerformance | null {
  return performanceStore.get(entityId) ?? null;
}

export function getAllPerformance(): ContentPerformance[] {
  return Array.from(performanceStore.values()).sort((a, b) => b.score - a.score);
}

export function shouldAllowRegeneration(
  entityId: string,
  forceOverride: boolean = false
): RegenerationResult {
  if (forceOverride) {
    return { allowed: true, reason: "Force override enabled" };
  }

  const perf = performanceStore.get(entityId);

  if (!perf) {
    return { allowed: true, reason: "No performance data recorded" };
  }

  if (perf.score > HIGH_PERFORMING_SCORE_THRESHOLD) {
    return {
      allowed: false,
      reason: `High-performing content (score: ${perf.score}, threshold: ${HIGH_PERFORMING_SCORE_THRESHOLD})`,
    };
  }

  const now = new Date();
  const timeSinceModification = now.getTime() - perf.lastModified.getTime();

  if (timeSinceModification < MODIFICATION_COOLDOWN_MS) {
    const hoursRemaining = Math.ceil(
      (MODIFICATION_COOLDOWN_MS - timeSinceModification) / (60 * 60 * 1000)
    );
    return {
      allowed: false,
      reason: `Content modified within last 24 hours (${hoursRemaining}h remaining in cooldown)`,
    };
  }

  return { allowed: true };
}

export function clearPerformance(entityId: string): boolean {
  return performanceStore.delete(entityId);
}

export function forcePersist(): void {
  saveToDisk();
}

export { HIGH_PERFORMING_SCORE_THRESHOLD, MODIFICATION_COOLDOWN_MS };
