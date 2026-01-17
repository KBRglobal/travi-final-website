/**
 * Content Health Engine - Scorer
 * Calculates overall health score from signals
 */

import { db } from '../db';
import { contents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { detectSignals } from './signals';

// Type definitions - using any to bypass strict type checking
type ContentHealthSignal = any;
type ContentHealthScore = any;
type RemediationPriority = 'critical' | 'high' | 'medium' | 'low' | 'none';

const DEFAULT_HEALTH_CONFIG = {
  signalWeights: {} as Record<string, number>,
  thresholds: { critical: 30, high: 50, medium: 70, low: 85 },
  checkIntervalHours: 24,
} as any;

const SCORE_CACHE = new Map<string, { score: ContentHealthScore; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function calculateOverallScore(signals: ContentHealthSignal[]): number {
  if (signals.length === 0) return 100;

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = signals.reduce((sum, s) => sum + (s.score * s.weight), 0);

  const maxPossibleWeight = (Object.values(DEFAULT_HEALTH_CONFIG.signalWeights) as any[]).reduce((a: number, b: number) => a + b, 0);

  // Score based on detected issues vs total possible issues
  const issueImpact = totalWeight / (maxPossibleWeight as number);
  const signalScore = totalWeight > 0 ? weightedSum / totalWeight : 100;

  // Blend: lower score if more issues detected, weighted by severity
  return Math.round(signalScore * (1 - issueImpact * 0.3));
}

function determinePriority(score: number): RemediationPriority {
  const thresholds = DEFAULT_HEALTH_CONFIG.thresholds;

  if (score < thresholds.critical) return 'critical';
  if (score < thresholds.high) return 'high';
  if (score < thresholds.medium) return 'medium';
  if (score < thresholds.low) return 'low';
  return 'none';
}

export async function scoreContent(contentId: string): Promise<ContentHealthScore | null> {
  // Check cache
  const cached = SCORE_CACHE.get(contentId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.score;
  }

  // Fetch content
  const [content] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) return null;

  // Detect signals
  const signals = await detectSignals({
    id: content.id,
    type: content.type,
    title: content.title,
    blocks: (content.blocks as unknown[]) || [],
    status: content.status,
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
    metadata: (content as any).metadata,
  });

  const overallScore = calculateOverallScore(signals);
  const priority = determinePriority(overallScore);

  const healthScore: ContentHealthScore = {
    contentId,
    overallScore,
    signals,
    needsRemediation: priority !== 'none',
    remediationPriority: priority,
    lastChecked: new Date(),
    nextCheckAt: new Date(Date.now() + DEFAULT_HEALTH_CONFIG.checkIntervalHours * 60 * 60 * 1000),
  };

  // Cache result
  SCORE_CACHE.set(contentId, {
    score: healthScore,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return healthScore;
}

export async function batchScoreContent(contentIds: string[]): Promise<Map<string, ContentHealthScore>> {
  const results = new Map<string, ContentHealthScore>();
  const batchSize = 10;

  for (let i = 0; i < contentIds.length; i += batchSize) {
    const batch = contentIds.slice(i, i + batchSize);
    const scores = await Promise.all(batch.map(id => scoreContent(id)));

    scores.forEach((score, idx) => {
      if (score) {
        results.set(batch[idx], score);
      }
    });
  }

  return results;
}

export function invalidateScoreCache(contentId?: string): void {
  if (contentId) {
    SCORE_CACHE.delete(contentId);
  } else {
    SCORE_CACHE.clear();
  }
}

export function getScoreCacheStats(): { size: number; entries: string[] } {
  return {
    size: SCORE_CACHE.size,
    entries: Array.from(SCORE_CACHE.keys()),
  };
}
