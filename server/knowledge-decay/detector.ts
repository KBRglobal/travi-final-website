/**
 * Knowledge Decay Detector Service
 *
 * Analyzes content for outdated information, deprecated references,
 * and time-sensitive claims that may have become stale.
 */

import { db } from "../db";
import { contents as content } from "../../shared/schema";
import { eq } from "drizzle-orm";
import type {
  DecayIndicator,
  DecayAnalysis,
  DecayStats,
  DecayType,
  DecaySeverity,
  DecayStatus,
} from "./types";
import { DECAY_PATTERNS, DECAY_THRESHOLDS } from "./types";

// Cache for analyzed content
const analysisCache = new Map<string, DecayAnalysis>();

// Track indicator statuses
const indicatorStatuses = new Map<string, { status: DecayStatus; reviewedAt?: Date; reviewedBy?: string }>();

/**
 * Analyze content for knowledge decay
 */
export async function analyzeDecay(contentId: string): Promise<DecayAnalysis> {
  const [contentItem] = await db.select().from(content).where(eq(content.id, contentId)).limit(1);

  if (!contentItem) {
    throw new Error(`Content ${contentId} not found`);
  }

  const now = new Date();
  const createdAt = contentItem.createdAt ? new Date(contentItem.createdAt) : now;
  const updatedAt = contentItem.updatedAt ? new Date(contentItem.updatedAt) : createdAt;

  const contentAge = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const lastUpdated = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

  const body = (contentItem as any).body || "";
  const title = contentItem.title || "";
  const fullText = `${title} ${body}`;

  const indicators: DecayIndicator[] = [];

  // Check each decay pattern
  for (const pattern of DECAY_PATTERNS) {
    const matches = fullText.matchAll(new RegExp(pattern.pattern, 'gi'));
    for (const match of matches) {
      const indicatorId = `${contentId}-${indicators.length}`;
      const existingStatus = indicatorStatuses.get(indicatorId);

      indicators.push({
        id: indicatorId,
        contentId,
        type: pattern.type,
        severity: pattern.severity,
        status: existingStatus?.status || 'detected',
        excerpt: extractExcerpt(fullText, match.index || 0, match[0]),
        reason: pattern.description,
        suggestion: getSuggestion(pattern.type, match[0]),
        detectedAt: new Date(),
        reviewedAt: existingStatus?.reviewedAt,
        reviewedBy: existingStatus?.reviewedBy,
      });
    }
  }

  // Calculate decay score based on age and indicators
  const decayScore = calculateDecayScore(contentAge, lastUpdated, indicators);

  // Determine risk level
  const riskLevel = getRiskLevel(decayScore);

  // Determine recommended action
  const recommendedAction = getRecommendedAction(riskLevel, indicators);

  const analysis: DecayAnalysis = {
    contentId,
    contentTitle: title,
    contentAge,
    lastUpdated,
    decayScore,
    indicators,
    riskLevel,
    recommendedAction,
    analyzedAt: new Date(),
  };

  // Cache the result
  analysisCache.set(contentId, analysis);

  return analysis;
}

/**
 * Extract text excerpt around a match
 */
function extractExcerpt(text: string, index: number, match: string): string {
  const contextLength = 50;
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + match.length + contextLength);

  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt.replace(/\s+/g, ' ').trim();
}

/**
 * Get suggestion for fixing decay
 */
function getSuggestion(type: DecayType, match: string): string {
  switch (type) {
    case 'outdated_stat':
      return 'Update with current statistics or remove the date reference';
    case 'deprecated_tech':
      return 'Consider updating to mention current alternatives';
    case 'stale_reference':
      return 'Verify the reference is still accurate and update if needed';
    case 'old_link':
      return 'Update to HTTPS or verify the link still works';
    case 'dated_claim':
      return 'Replace time-relative language with specific dates or evergreen phrasing';
    case 'version_mismatch':
      return 'Check if newer versions are available and update accordingly';
    default:
      return 'Review and update this content';
  }
}

/**
 * Calculate decay score
 */
function calculateDecayScore(contentAge: number, lastUpdated: number, indicators: DecayIndicator[]): number {
  let score = 0;

  // Age-based decay (max 40 points)
  if (lastUpdated > 730) score += 40; // 2+ years
  else if (lastUpdated > 365) score += 30; // 1+ year
  else if (lastUpdated > 180) score += 20; // 6+ months
  else if (lastUpdated > 90) score += 10; // 3+ months

  // Indicator-based decay (max 60 points)
  for (const indicator of indicators) {
    if (indicator.status === 'fixed' || indicator.status === 'ignored') continue;

    switch (indicator.severity) {
      case 'critical': score += 15; break;
      case 'high': score += 10; break;
      case 'medium': score += 5; break;
      case 'low': score += 2; break;
    }
  }

  return Math.min(100, score);
}

/**
 * Get risk level from decay score
 */
function getRiskLevel(score: number): 'healthy' | 'aging' | 'stale' | 'critical' {
  if (score >= DECAY_THRESHOLDS.critical) return 'critical';
  if (score >= DECAY_THRESHOLDS.stale) return 'stale';
  if (score >= DECAY_THRESHOLDS.aging) return 'aging';
  return 'healthy';
}

/**
 * Get recommended action
 */
function getRecommendedAction(
  riskLevel: string,
  indicators: DecayIndicator[]
): 'none' | 'review' | 'update' | 'rewrite' {
  const criticalCount = indicators.filter(i => i.severity === 'critical' && i.status === 'detected').length;

  if (riskLevel === 'critical' || criticalCount >= 3) return 'rewrite';
  if (riskLevel === 'stale' || criticalCount >= 1) return 'update';
  if (riskLevel === 'aging') return 'review';
  return 'none';
}

/**
 * Update indicator status
 */
export function updateIndicatorStatus(
  indicatorId: string,
  status: DecayStatus,
  reviewedBy?: string
): void {
  indicatorStatuses.set(indicatorId, {
    status,
    reviewedAt: new Date(),
    reviewedBy,
  });
}

/**
 * Get cached analysis
 */
export function getCachedAnalysis(contentId: string): DecayAnalysis | null {
  return analysisCache.get(contentId) || null;
}

/**
 * Get decay statistics
 */
export async function getDecayStats(): Promise<DecayStats> {
  const analyses = Array.from(analysisCache.values());

  const byRiskLevel: Record<string, number> = {
    healthy: 0,
    aging: 0,
    stale: 0,
    critical: 0,
  };

  const byDecayType: Record<DecayType, number> = {
    outdated_stat: 0,
    deprecated_tech: 0,
    stale_reference: 0,
    old_link: 0,
    dated_claim: 0,
    version_mismatch: 0,
  };

  let totalScore = 0;
  let needsReview = 0;
  let needsUpdate = 0;

  for (const analysis of analyses) {
    byRiskLevel[analysis.riskLevel]++;
    totalScore += analysis.decayScore;

    if (analysis.recommendedAction === 'review') needsReview++;
    if (analysis.recommendedAction === 'update' || analysis.recommendedAction === 'rewrite') needsUpdate++;

    for (const indicator of analysis.indicators) {
      if (indicator.status === 'detected') {
        byDecayType[indicator.type]++;
      }
    }
  }

  return {
    totalAnalyzed: analyses.length,
    byRiskLevel,
    byDecayType,
    avgDecayScore: analyses.length > 0 ? totalScore / analyses.length : 0,
    contentNeedingReview: needsReview,
    contentNeedingUpdate: needsUpdate,
  };
}

/**
 * Get content needing attention
 */
export async function getContentNeedingAttention(limit: number = 20): Promise<DecayAnalysis[]> {
  const analyses = Array.from(analysisCache.values());

  return analyses
    .filter(a => a.recommendedAction !== 'none')
    .sort((a, b) => b.decayScore - a.decayScore)
    .slice(0, limit);
}
