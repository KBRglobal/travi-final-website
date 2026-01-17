/**
 * Broken Promise Detector Service
 *
 * Analyzes content to detect mismatches between promises (titles, meta, schema)
 * and actual content delivery.
 */

import { db } from "../db";
import { contents as content } from "../../shared/schema";
import { eq } from "drizzle-orm";
import type {
  BrokenPromise,
  PromiseAnalysis,
  PromiseStats,
  PromiseType,
  PromiseSeverity,
  PromiseStatus,
} from "./types";
import { PROMISE_PATTERNS } from "./types";

// Cache for analyzed content
const analysisCache = new Map<string, PromiseAnalysis>();

/**
 * Analyze content for broken promises
 */
export async function analyzeContent(contentId: string): Promise<PromiseAnalysis> {
  const [contentItem] = await db.select().from(content).where(eq(content.id, contentId)).limit(1);

  if (!contentItem) {
    throw new Error(`Content ${contentId} not found`);
  }

  const promises: BrokenPromise[] = [];
  const title = contentItem.title || "";
  const metaDescription = contentItem.metaDescription || "";
  const body = (contentItem as any).body || "";

  // Check title promises
  for (const pattern of PROMISE_PATTERNS.filter(p => p.type === 'title')) {
    const match = title.match(pattern.pattern);
    if (match) {
      const promise = detectPromise(pattern, match, title, body);
      if (promise) {
        promises.push({
          ...promise,
          id: `${contentId}-${promises.length}`,
          contentId,
        });
      }
    }
  }

  // Check meta description promises
  for (const pattern of PROMISE_PATTERNS.filter(p => p.type === 'meta_description')) {
    const match = metaDescription.match(pattern.pattern);
    if (match) {
      const promise = detectPromise(pattern, match, metaDescription, body);
      if (promise) {
        promises.push({
          ...promise,
          id: `${contentId}-${promises.length}`,
          contentId,
        });
      }
    }
  }

  // Check H1 promises (if different from title)
  for (const pattern of PROMISE_PATTERNS.filter(p => p.type === 'h1')) {
    const h1Match = body.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      const h1Text = h1Match[1];
      const patternMatch = h1Text.match(pattern.pattern);
      if (patternMatch) {
        const promise = detectPromise(pattern, patternMatch, h1Text, body);
        if (promise) {
          promises.push({
            ...promise,
            id: `${contentId}-${promises.length}`,
            contentId,
          });
        }
      }
    }
  }

  const brokenCount = promises.filter(p => p.status === 'broken').length;
  const partialCount = promises.filter(p => p.status === 'partial').length;
  const keptCount = promises.filter(p => p.status === 'kept').length;

  // Calculate trust score
  const trustScore = calculateTrustScore(promises);

  const analysis: PromiseAnalysis = {
    contentId,
    contentTitle: title,
    totalPromises: promises.length,
    brokenPromises: brokenCount,
    partialPromises: partialCount,
    keptPromises: keptCount,
    trustScore,
    promises,
    analyzedAt: new Date(),
  };

  // Cache the result
  analysisCache.set(contentId, analysis);

  return analysis;
}

/**
 * Detect a promise and validate if it's kept
 */
function detectPromise(
  pattern: { pattern: RegExp; type: PromiseType; description: string },
  match: RegExpMatchArray,
  promiseText: string,
  body: string
): Omit<BrokenPromise, 'id' | 'contentId'> | null {
  // Check for numbered list promises
  const numberMatch = match[1];
  if (numberMatch && /^\d+$/.test(numberMatch)) {
    const promisedCount = parseInt(numberMatch);
    const actualCount = countListItems(body);
    const headingCount = countHeadings(body);

    // Use the higher of list items or headings as the actual count
    const deliveredCount = Math.max(actualCount, headingCount);

    let status: PromiseStatus = 'kept';
    let severity: PromiseSeverity = 'minor';
    let confidence = 80;

    if (deliveredCount < promisedCount * 0.5) {
      status = 'broken';
      severity = 'critical';
      confidence = 90;
    } else if (deliveredCount < promisedCount) {
      status = 'partial';
      severity = 'major';
      confidence = 85;
    }

    return {
      type: pattern.type,
      promise: `Promised ${promisedCount} items: "${match[0]}"`,
      delivery: `Found ${deliveredCount} items in content`,
      severity,
      status,
      confidence,
      recommendation: status === 'broken'
        ? `Add ${promisedCount - deliveredCount} more items or update the title`
        : status === 'partial'
        ? `Consider adding more items or adjusting the promised count`
        : 'Promise fulfilled',
      detectedAt: new Date(),
    };
  }

  // Check for how-to promises
  if (pattern.description.includes('How-to')) {
    const hasSteps = /<(ol|ul)[^>]*>/.test(body) || /step\s+\d/i.test(body);
    const hasInstructions = /\b(first|then|next|finally|after|before)\b/i.test(body);

    let status: PromiseStatus = 'kept';
    if (!hasSteps && !hasInstructions) {
      status = 'broken';
    } else if (!hasSteps || !hasInstructions) {
      status = 'partial';
    }

    return {
      type: pattern.type,
      promise: `How-to content promised: "${match[0]}"`,
      delivery: hasSteps
        ? 'Content contains step-by-step instructions'
        : 'Content lacks clear step-by-step format',
      severity: status === 'broken' ? 'major' : 'minor',
      status,
      confidence: 75,
      recommendation: status === 'broken'
        ? 'Add numbered steps or clear instructions'
        : status === 'partial'
        ? 'Consider adding more explicit step formatting'
        : 'How-to format is adequate',
      detectedAt: new Date(),
    };
  }

  // Check for comprehensive promises
  if (pattern.description.includes('Comprehensive') || pattern.description.includes('Ultimate') || pattern.description.includes('Definitive')) {
    const wordCount = body.split(/\s+/).length;
    const headingCount = countHeadings(body);

    let status: PromiseStatus = 'kept';
    let severity: PromiseSeverity = 'minor';

    // Comprehensive content should be substantial
    if (wordCount < 500 || headingCount < 3) {
      status = 'broken';
      severity = 'critical';
    } else if (wordCount < 1500 || headingCount < 5) {
      status = 'partial';
      severity = 'major';
    }

    return {
      type: pattern.type,
      promise: `Comprehensive content promised: "${match[0]}"`,
      delivery: `Content has ${wordCount} words and ${headingCount} sections`,
      severity,
      status,
      confidence: 70,
      recommendation: status === 'broken'
        ? 'Add more content sections to fulfill comprehensive promise'
        : status === 'partial'
        ? 'Consider expanding content depth'
        : 'Content appears comprehensive',
      detectedAt: new Date(),
    };
  }

  return null;
}

/**
 * Count list items in content
 */
function countListItems(body: string): number {
  const olItems = (body.match(/<li[^>]*>/gi) || []).length;
  const bulletPoints = (body.match(/^[\s]*[-•*]\s/gm) || []).length;
  return olItems + bulletPoints;
}

/**
 * Count headings in content
 */
function countHeadings(body: string): number {
  return (body.match(/<h[2-6][^>]*>/gi) || []).length;
}

/**
 * Calculate trust score based on promises
 */
function calculateTrustScore(promises: Omit<BrokenPromise, 'id' | 'contentId'>[]): number {
  if (promises.length === 0) return 100;

  let score = 100;
  for (const promise of promises) {
    if (promise.status === 'broken') {
      score -= promise.severity === 'critical' ? 30 : promise.severity === 'major' ? 20 : 10;
    } else if (promise.status === 'partial') {
      score -= promise.severity === 'critical' ? 15 : promise.severity === 'major' ? 10 : 5;
    }
  }

  return Math.max(0, score);
}

/**
 * Get cached analysis
 */
export function getCachedAnalysis(contentId: string): PromiseAnalysis | null {
  return analysisCache.get(contentId) || null;
}

/**
 * Get broken promise statistics
 */
export async function getPromiseStats(): Promise<PromiseStats> {
  const analyses = Array.from(analysisCache.values());

  const byType: Record<PromiseType, number> = {
    title: 0,
    meta_description: 0,
    h1: 0,
    schema: 0,
    faq: 0,
    howto: 0,
  };

  const bySeverity: Record<PromiseSeverity, number> = {
    critical: 0,
    major: 0,
    minor: 0,
  };

  let totalBroken = 0;
  const offenderMap = new Map<string, number>();

  for (const analysis of analyses) {
    for (const promise of analysis.promises) {
      if (promise.status === 'broken' || promise.status === 'partial') {
        totalBroken++;
        byType[promise.type]++;
        bySeverity[promise.severity]++;
        offenderMap.set(analysis.contentId, (offenderMap.get(analysis.contentId) || 0) + 1);
      }
    }
  }

  const topOffenders = Array.from(offenderMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([contentId, brokenCount]) => ({ contentId, brokenCount }));

  const avgTrustScore = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.trustScore, 0) / analyses.length
    : 100;

  return {
    totalAnalyzed: analyses.length,
    totalBrokenPromises: totalBroken,
    byType,
    bySeverity,
    avgTrustScore,
    topOffenders,
  };
}

/**
 * Bulk analyze multiple content items
 */
export async function bulkAnalyze(contentIds: string[]): Promise<PromiseAnalysis[]> {
  const results: PromiseAnalysis[] = [];
  for (const id of contentIds) {
    try {
      const analysis = await analyzeContent(id);
      results.push(analysis);
    } catch (error) {
      console.error(`[BrokenPromise] Failed to analyze ${id}:`, error);
    }
  }
  return results;
}
