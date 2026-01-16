export interface ContentMetrics {
  impressions: number;
  clicks: number;
  scrollDepth?: number;
  lastUpdated: Date;
}

const metricsStore = new Map<string, ContentMetrics>();

export function recordImpression(contentId: string): ContentMetrics {
  const existing = metricsStore.get(contentId);
  const updated: ContentMetrics = {
    impressions: (existing?.impressions ?? 0) + 1,
    clicks: existing?.clicks ?? 0,
    scrollDepth: existing?.scrollDepth,
    lastUpdated: new Date(),
  };
  metricsStore.set(contentId, updated);
  return updated;
}

export function recordClick(contentId: string): ContentMetrics {
  const existing = metricsStore.get(contentId);
  const updated: ContentMetrics = {
    impressions: existing?.impressions ?? 0,
    clicks: (existing?.clicks ?? 0) + 1,
    scrollDepth: existing?.scrollDepth,
    lastUpdated: new Date(),
  };
  metricsStore.set(contentId, updated);
  return updated;
}

export function recordScrollDepth(contentId: string, depth: number): ContentMetrics {
  const existing = metricsStore.get(contentId);
  const currentDepth = existing?.scrollDepth ?? 0;
  const updated: ContentMetrics = {
    impressions: existing?.impressions ?? 0,
    clicks: existing?.clicks ?? 0,
    scrollDepth: Math.max(currentDepth, Math.min(100, depth)),
    lastUpdated: new Date(),
  };
  metricsStore.set(contentId, updated);
  return updated;
}

export function getMetrics(contentId: string): ContentMetrics | null {
  return metricsStore.get(contentId) ?? null;
}

export function getTopPerformers(limit: number = 10): Array<{ contentId: string; metrics: ContentMetrics; score: number }> {
  const { calculateScore } = require("./content-score");
  
  const entries = Array.from(metricsStore.entries());
  const scored = entries.map(([contentId, metrics]) => ({
    contentId,
    metrics,
    score: calculateScore(metrics),
  }));
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function getAllMetrics(): Map<string, ContentMetrics> {
  return new Map(metricsStore);
}

export function clearMetrics(contentId: string): boolean {
  return metricsStore.delete(contentId);
}
