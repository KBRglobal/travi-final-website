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

/** Helper to select recommendation text by promise status */
function recommendationByStatus(
  status: PromiseStatus,
  brokenMsg: string,
  partialMsg: string,
  keptMsg: string
): string {
  if (status === "broken") return brokenMsg;
  if (status === "partial") return partialMsg;
  return keptMsg;
}

/** Check patterns against a text source and collect detected promises */
function checkPatterns(
  patterns: typeof PROMISE_PATTERNS,
  filterType: PromiseType,
  sourceText: string,
  body: string,
  contentId: string,
  promises: BrokenPromise[]
): void {
  for (const pattern of patterns.filter(p => p.type === filterType)) {
    const match = pattern.pattern.exec(sourceText);
    if (!match) continue;
    const promise = detectPromise(pattern, match, sourceText, body);
    if (promise) {
      promises.push({ ...promise, id: `${contentId}-${promises.length}`, contentId });
    }
  }
}

/** Check H1 patterns (extracts H1 from body first) */
function checkH1Patterns(
  patterns: typeof PROMISE_PATTERNS,
  body: string,
  contentId: string,
  promises: BrokenPromise[]
): void {
  const h1Match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(body);
  if (!h1Match) return;
  const h1Text = h1Match[1];
  checkPatterns(patterns, "h1", h1Text, body, contentId, promises);
}

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

  checkPatterns(PROMISE_PATTERNS, "title", title, body, contentId, promises);
  checkPatterns(PROMISE_PATTERNS, "meta_description", metaDescription, body, contentId, promises);
  checkH1Patterns(PROMISE_PATTERNS, body, contentId, promises);

  const trustScore = calculateTrustScore(promises);

  const analysis: PromiseAnalysis = {
    contentId,
    contentTitle: title,
    totalPromises: promises.length,
    brokenPromises: promises.filter(p => p.status === "broken").length,
    partialPromises: promises.filter(p => p.status === "partial").length,
    keptPromises: promises.filter(p => p.status === "kept").length,
    trustScore,
    promises,
    analyzedAt: new Date(),
  };

  analysisCache.set(contentId, analysis);
  return analysis;
}

/** Detect a numbered-list promise (e.g. "Top 10...") */
function detectNumberedListPromise(
  pattern: { type: PromiseType },
  match: RegExpMatchArray,
  body: string
): Omit<BrokenPromise, "id" | "contentId"> {
  const promisedCount = Number.parseInt(match[1]);
  const deliveredCount = Math.max(countListItems(body), countHeadings(body));

  let status: PromiseStatus = "kept";
  let severity: PromiseSeverity = "minor";
  let confidence = 80;

  if (deliveredCount < promisedCount * 0.5) {
    status = "broken";
    severity = "critical";
    confidence = 90;
  } else if (deliveredCount < promisedCount) {
    status = "partial";
    severity = "major";
    confidence = 85;
  }

  return {
    type: pattern.type,
    promise: `Promised ${promisedCount} items: "${match[0]}"`,
    delivery: `Found ${deliveredCount} items in content`,
    severity,
    status,
    confidence,
    recommendation: recommendationByStatus(
      status,
      `Add ${promisedCount - deliveredCount} more items or update the title`,
      "Consider adding more items or adjusting the promised count",
      "Promise fulfilled"
    ),
    detectedAt: new Date(),
  };
}

/** Detect a how-to promise */
function detectHowToPromise(
  pattern: { type: PromiseType },
  match: RegExpMatchArray,
  body: string
): Omit<BrokenPromise, "id" | "contentId"> {
  const hasSteps = /<(ol|ul)[^>]*>/.test(body) || /step\s+\d/i.test(body);
  const hasInstructions = /\b(first|then|next|finally|after|before)\b/i.test(body);

  let status: PromiseStatus = "kept";
  if (!hasSteps && !hasInstructions) status = "broken";
  else if (!hasSteps || !hasInstructions) status = "partial";

  return {
    type: pattern.type,
    promise: `How-to content promised: "${match[0]}"`,
    delivery: hasSteps
      ? "Content contains step-by-step instructions"
      : "Content lacks clear step-by-step format",
    severity: status === "broken" ? "major" : "minor",
    status,
    confidence: 75,
    recommendation: recommendationByStatus(
      status,
      "Add numbered steps or clear instructions",
      "Consider adding more explicit step formatting",
      "How-to format is adequate"
    ),
    detectedAt: new Date(),
  };
}

/** Detect a comprehensive/ultimate/definitive content promise */
function detectComprehensivePromise(
  pattern: { type: PromiseType },
  match: RegExpMatchArray,
  body: string
): Omit<BrokenPromise, "id" | "contentId"> {
  const wordCount = body.split(/\s+/).length;
  const headingCount = countHeadings(body);

  let status: PromiseStatus = "kept";
  let severity: PromiseSeverity = "minor";

  if (wordCount < 500 || headingCount < 3) {
    status = "broken";
    severity = "critical";
  } else if (wordCount < 1500 || headingCount < 5) {
    status = "partial";
    severity = "major";
  }

  return {
    type: pattern.type,
    promise: `Comprehensive content promised: "${match[0]}"`,
    delivery: `Content has ${wordCount} words and ${headingCount} sections`,
    severity,
    status,
    confidence: 70,
    recommendation: recommendationByStatus(
      status,
      "Add more content sections to fulfill comprehensive promise",
      "Consider expanding content depth",
      "Content appears comprehensive"
    ),
    detectedAt: new Date(),
  };
}

const COMPREHENSIVE_KEYWORDS = ["Comprehensive", "Ultimate", "Definitive"];

/**
 * Detect a promise and validate if it's kept
 */
function detectPromise(
  pattern: { pattern: RegExp; type: PromiseType; description: string },
  match: RegExpMatchArray,
  _promiseText: string,
  body: string
): Omit<BrokenPromise, "id" | "contentId"> | null {
  if (match[1] && /^\d+$/.test(match[1])) {
    return detectNumberedListPromise(pattern, match, body);
  }
  if (pattern.description.includes("How-to")) {
    return detectHowToPromise(pattern, match, body);
  }
  if (COMPREHENSIVE_KEYWORDS.some(kw => pattern.description.includes(kw))) {
    return detectComprehensivePromise(pattern, match, body);
  }
  return null;
}

/**
 * Count list items in content
 */
function countListItems(body: string): number {
  const olItems = (body.match(/<li[^>]*>/gi) || []).length;
  const bulletPoints = (body.match(/^\s*[-•*]\s/gm) || []).length;
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
function calculateTrustScore(promises: Omit<BrokenPromise, "id" | "contentId">[]): number {
  if (promises.length === 0) return 100;

  let score = 100;
  for (const promise of promises) {
    if (promise.status === "broken") {
      if (promise.severity === "critical") score -= 30;
      else if (promise.severity === "major") score -= 20;
      else score -= 10;
    } else if (promise.status === "partial") {
      if (promise.severity === "critical") score -= 15;
      else if (promise.severity === "major") score -= 10;
      else score -= 5;
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
      if (promise.status === "broken" || promise.status === "partial") {
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

  const avgTrustScore =
    analyses.length > 0
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
    } catch {
      void 0;
    }
  }
  return results;
}
