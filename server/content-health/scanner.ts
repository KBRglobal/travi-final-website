/**
 * Content Health Scanner
 *
 * Scans content items to detect health issues.
 * Runs in batches to avoid overwhelming the system.
 */

import { db } from "../db";
import { contents, searchIndex } from "@shared/schema";
import { eq, isNull, and, isNotNull, sql, lt, desc, asc } from "drizzle-orm";
import {
  type HealthIssueType,
  type ContentHealthScan,
  type HealthScannerConfig,
  ISSUE_SEVERITY_MAP,
  ISSUE_MESSAGES,
  DEFAULT_SCANNER_CONFIG,
} from "./types";

/**
 * Scan a single content item for health issues
 */
export async function scanContent(
  contentId: string,
  config: Partial<HealthScannerConfig> = {}
): Promise<ContentHealthScan | null> {
  const cfg = { ...DEFAULT_SCANNER_CONFIG, ...config };

  const [content] = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      status: contents.status,
      blocks: contents.blocks,
      answerCapsule: contents.answerCapsule,
      aeoScore: contents.aeoScore,
      seoScore: contents.seoScore,
      updatedAt: contents.updatedAt,
      deletedAt: contents.deletedAt,
    })
    .from(contents)
    .where(eq(contents.id, contentId));

  if (!content || content.deletedAt) {
    return null;
  }

  const issues: HealthIssueType[] = [];

  // Check for no blocks
  const blocks = content.blocks as unknown[] | null;
  if (!blocks || blocks.length === 0) {
    issues.push('no_blocks');
  }

  // Check for no AEO capsule
  if (!content.answerCapsule) {
    issues.push('no_aeo_capsule');
    issues.push('no_entities'); // answerCapsule is proxy for entities
  }

  // Check AEO score
  if (content.aeoScore !== null && content.aeoScore < cfg.minAeoScore) {
    issues.push('low_aeo_score');
  }

  // Check SEO score
  if (content.seoScore !== null && content.seoScore < cfg.minSeoScore) {
    issues.push('low_seo_score');
  }

  // Check if indexed
  const [indexed] = await db
    .select({ contentId: searchIndex.contentId })
    .from(searchIndex)
    .where(eq(searchIndex.contentId, contentId));

  if (!indexed) {
    issues.push('not_indexed');
    issues.push('low_intelligence_coverage');
  }

  // Check for stale content
  if (content.updatedAt) {
    const staleDays = cfg.staleContentDays;
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);
    if (content.updatedAt < staleDate) {
      issues.push('stale_content');
    }
  }

  // Calculate overall health
  const criticalCount = issues.filter(i => ISSUE_SEVERITY_MAP[i] === 'critical').length;
  const warningCount = issues.filter(i => ISSUE_SEVERITY_MAP[i] === 'warning').length;

  let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (criticalCount > 0) {
    overallHealth = 'unhealthy';
  } else if (warningCount > 0) {
    overallHealth = 'degraded';
  }

  // Calculate health score (100 = perfect)
  let score = 100;
  for (const issue of issues) {
    const severity = ISSUE_SEVERITY_MAP[issue];
    if (severity === 'critical') score -= 30;
    else if (severity === 'warning') score -= 15;
    else score -= 5;
  }
  score = Math.max(0, score);

  return {
    contentId: content.id,
    contentTitle: content.title,
    contentType: content.type,
    scannedAt: new Date(),
    issues,
    overallHealth,
    score,
  };
}

/**
 * Scan a batch of content items
 */
export async function scanContentBatch(
  offset: number = 0,
  config: Partial<HealthScannerConfig> = {}
): Promise<{
  scans: ContentHealthScan[];
  hasMore: boolean;
  nextOffset: number;
}> {
  const cfg = { ...DEFAULT_SCANNER_CONFIG, ...config };

  // Get batch of published content
  const batch = await db
    .select({
      id: contents.id,
    })
    .from(contents)
    .where(
      and(
        eq(contents.status, 'published'),
        isNull(contents.deletedAt)
      )
    )
    .orderBy(asc(contents.id))
    .offset(offset)
    .limit(cfg.batchSize + 1); // +1 to check if there's more

  const hasMore = batch.length > cfg.batchSize;
  const itemsToScan = hasMore ? batch.slice(0, cfg.batchSize) : batch;

  const scans: ContentHealthScan[] = [];

  for (const item of itemsToScan) {
    const scan = await scanContent(item.id, config);
    if (scan) {
      scans.push(scan);
    }
  }

  return {
    scans,
    hasMore,
    nextOffset: offset + cfg.batchSize,
  };
}

/**
 * Get content items with specific health issues
 */
export async function getContentWithIssues(
  issueType?: HealthIssueType,
  limit: number = 50
): Promise<ContentHealthScan[]> {
  // For efficiency, we'll scan a larger batch and filter
  const result = await scanContentBatch(0, { batchSize: limit * 2 });

  let scans = result.scans.filter(s => s.issues.length > 0);

  if (issueType) {
    scans = scans.filter(s => s.issues.includes(issueType));
  }

  return scans.slice(0, limit);
}

/**
 * Get health summary statistics by querying content directly
 */
export async function getHealthSummary(): Promise<{
  total: number;
  withIssues: number;
  noBlocks: number;
  noAeoCapsule: number;
  notIndexed: number;
  lowSeoScore: number;
}> {
  // Count total published content
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contents)
    .where(
      and(
        eq(contents.status, 'published'),
        isNull(contents.deletedAt)
      )
    );

  const total = totalResult?.count ?? 0;

  // Count content with no blocks
  const [noBlocksResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contents)
    .where(
      and(
        eq(contents.status, 'published'),
        isNull(contents.deletedAt),
        sql`(${contents.blocks} IS NULL OR ${contents.blocks} = '[]'::jsonb)`
      )
    );

  const noBlocks = noBlocksResult?.count ?? 0;

  // Count content with no AEO capsule
  const [noAeoResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contents)
    .where(
      and(
        eq(contents.status, 'published'),
        isNull(contents.deletedAt),
        isNull(contents.answerCapsule)
      )
    );

  const noAeoCapsule = noAeoResult?.count ?? 0;

  // Count content with low SEO score
  const [lowSeoResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contents)
    .where(
      and(
        eq(contents.status, 'published'),
        isNull(contents.deletedAt),
        lt(contents.seoScore, 40)
      )
    );

  const lowSeoScore = lowSeoResult?.count ?? 0;

  // Count not indexed (requires join)
  const [notIndexedResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contents)
    .leftJoin(searchIndex, eq(contents.id, searchIndex.contentId))
    .where(
      and(
        eq(contents.status, 'published'),
        isNull(contents.deletedAt),
        isNull(searchIndex.contentId)
      )
    );

  const notIndexed = notIndexedResult?.count ?? 0;

  // Calculate with issues (any of the above)
  const withIssues = Math.min(
    noBlocks + noAeoCapsule + notIndexed + lowSeoScore,
    total
  );

  return {
    total,
    withIssues,
    noBlocks,
    noAeoCapsule,
    notIndexed,
    lowSeoScore,
  };
}
