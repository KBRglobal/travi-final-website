/**
 * Content Readiness - Score Calculator
 *
 * Calculates the overall readiness score combining multiple dimensions.
 */

import { db } from '../db';
import { contents as content } from '@shared/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import {
  ReadinessReport,
  ReadinessDimension,
  DIMENSION_WEIGHTS,
  getStatusFromScore,
  getOverallStatus,
} from './types';

// Freshness thresholds in days
const FRESH_DAYS = 30;
const STALE_DAYS = 180;

/**
 * Calculate readiness score for content.
 */
export async function calculateReadiness(contentId: string): Promise<ReadinessReport | null> {
  // Fetch content with all related data
  const contentRecord = await (db.query as any).contents.findFirst({
    where: eq(content.id, contentId),
  });

  if (!contentRecord) {
    return null;
  }

  // Calculate each dimension
  const [iceScore, entityCoverage, searchIndex, aeoScore, freshness, internalLinks] =
    await Promise.all([
      calculateIceScore(contentId),
      calculateEntityCoverage(contentId),
      calculateSearchIndexScore(contentId),
      calculateAeoScore(contentRecord),
      calculateFreshness(contentRecord),
      calculateInternalLinks(contentRecord),
    ]);

  const dimensions = {
    iceScore,
    entityCoverage,
    searchIndex,
    aeoScore,
    freshness,
    internalLinks,
  };

  // Calculate weighted overall score
  const overallScore = Math.round(
    iceScore.score * DIMENSION_WEIGHTS.iceScore +
    entityCoverage.score * DIMENSION_WEIGHTS.entityCoverage +
    searchIndex.score * DIMENSION_WEIGHTS.searchIndex +
    aeoScore.score * DIMENSION_WEIGHTS.aeoScore +
    freshness.score * DIMENSION_WEIGHTS.freshness +
    internalLinks.score * DIMENSION_WEIGHTS.internalLinks
  );

  // Generate recommendations
  const recommendations = generateRecommendations(dimensions);

  return {
    contentId,
    overallScore,
    status: getOverallStatus(overallScore),
    dimensions,
    recommendations,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate ICE score dimension.
 */
async function calculateIceScore(contentId: string): Promise<ReadinessDimension> {
  // Check if ICE score exists in content
  const record = await (db.query as any).contents.findFirst({
    where: eq(content.id, contentId),
    columns: { iceScore: true },
  });

  const score = record?.iceScore ?? 0;

  return {
    name: 'ICE Score',
    score,
    weight: DIMENSION_WEIGHTS.iceScore,
    status: getStatusFromScore(score),
    details: score > 0
      ? `ICE score is ${score}/100`
      : 'No ICE score calculated yet',
  };
}

/**
 * Calculate entity coverage dimension.
 */
async function calculateEntityCoverage(contentId: string): Promise<ReadinessDimension> {
  const entityLinks = await (db as any)
    .select({ count: sql<number>`count(*)` })
    .from((db as any).contentEntities || content)
    .where(eq(content.id, contentId));

  const count = entityLinks[0]?.count ?? 0;

  // Score based on entity count
  let score: number;
  if (count >= 5) score = 100;
  else if (count >= 3) score = 80;
  else if (count >= 1) score = 50;
  else score = 0;

  return {
    name: 'Entity Coverage',
    score,
    weight: DIMENSION_WEIGHTS.entityCoverage,
    status: getStatusFromScore(score),
    details: count > 0
      ? `${count} entities linked`
      : 'No entities linked to content',
  };
}

/**
 * Calculate search index dimension.
 */
async function calculateSearchIndexScore(contentId: string): Promise<ReadinessDimension> {
  const indexed = await (db.query as any).contentToSearchIndex?.findFirst?.({
    where: eq(content.id, contentId),
  });

  const isIndexed = !!indexed;
  const score = isIndexed ? 100 : 0;

  return {
    name: 'Search Index',
    score,
    weight: DIMENSION_WEIGHTS.searchIndex,
    status: isIndexed ? 'excellent' : 'poor',
    details: isIndexed ? 'Content is indexed for search' : 'Content not indexed',
  };
}

/**
 * Calculate AEO score dimension.
 */
async function calculateAeoScore(
  contentRecord: typeof content.$inferSelect
): Promise<ReadinessDimension> {
  // Check for AEO capsule in blocks
  const blocks = (contentRecord.blocks as Array<{ type: string }>) || [];
  const hasAeoCapsule = blocks.some(
    b => b.type === 'aeo_capsule' || b.type === 'answer_capsule'
  );

  // Get AEO score if it exists
  const aeoScore = (contentRecord as { aeoScore?: number }).aeoScore ?? 0;

  let score: number;
  if (hasAeoCapsule && aeoScore >= 70) score = 100;
  else if (hasAeoCapsule && aeoScore >= 50) score = 80;
  else if (hasAeoCapsule) score = 60;
  else if (aeoScore > 0) score = 40;
  else score = 0;

  return {
    name: 'AEO Score',
    score,
    weight: DIMENSION_WEIGHTS.aeoScore,
    status: getStatusFromScore(score),
    details: hasAeoCapsule
      ? `AEO capsule present, score: ${aeoScore}`
      : 'No AEO capsule found',
  };
}

/**
 * Calculate freshness dimension.
 */
async function calculateFreshness(
  contentRecord: typeof content.$inferSelect
): Promise<ReadinessDimension> {
  const updatedAt = contentRecord.updatedAt || contentRecord.createdAt;
  const now = new Date();
  const daysSinceUpdate = Math.floor(
    (now.getTime() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  let score: number;
  if (daysSinceUpdate <= FRESH_DAYS) score = 100;
  else if (daysSinceUpdate <= 90) score = 80;
  else if (daysSinceUpdate <= STALE_DAYS) score = 50;
  else score = 20;

  return {
    name: 'Freshness',
    score,
    weight: DIMENSION_WEIGHTS.freshness,
    status: getStatusFromScore(score),
    details: daysSinceUpdate <= FRESH_DAYS
      ? `Updated ${daysSinceUpdate} days ago (fresh)`
      : `Last updated ${daysSinceUpdate} days ago`,
  };
}

/**
 * Calculate internal links dimension.
 */
async function calculateInternalLinks(
  contentRecord: typeof content.$inferSelect
): Promise<ReadinessDimension> {
  // Count internal links in blocks
  const blocks = (contentRecord.blocks as Array<{ type: string; data?: { url?: string } }>) || [];

  let internalLinkCount = 0;
  for (const block of blocks) {
    if (block.type === 'link' || block.type === 'internal_link') {
      const url = block.data?.url || '';
      if (url.startsWith('/') || url.includes(process.env.SITE_DOMAIN || 'localhost')) {
        internalLinkCount++;
      }
    }
  }

  // Also check text blocks for links (simplified)
  const textBlocks = blocks.filter(b => b.type === 'paragraph' || b.type === 'text');
  for (const block of textBlocks) {
    const text = String((block as { data?: { text?: string } }).data?.text || '');
    const linkMatches = text.match(/href="\/[^"]+"/g);
    if (linkMatches) {
      internalLinkCount += linkMatches.length;
    }
  }

  let score: number;
  if (internalLinkCount >= 5) score = 100;
  else if (internalLinkCount >= 3) score = 80;
  else if (internalLinkCount >= 1) score = 50;
  else score = 0;

  return {
    name: 'Internal Links',
    score,
    weight: DIMENSION_WEIGHTS.internalLinks,
    status: getStatusFromScore(score),
    details: internalLinkCount > 0
      ? `${internalLinkCount} internal links found`
      : 'No internal links found',
  };
}

/**
 * Generate recommendations based on dimension scores.
 */
function generateRecommendations(
  dimensions: ReadinessReport['dimensions']
): string[] {
  const recommendations: string[] = [];

  if (dimensions.iceScore.status === 'poor') {
    recommendations.push('Run ICE analysis to improve content coverage score');
  }

  if (dimensions.entityCoverage.status === 'poor') {
    recommendations.push('Link relevant entities to improve discoverability');
  } else if (dimensions.entityCoverage.status === 'needs_work') {
    recommendations.push('Add more entity links (aim for at least 3)');
  }

  if (dimensions.searchIndex.status === 'poor') {
    recommendations.push('Submit content to search index');
  }

  if (dimensions.aeoScore.status === 'poor') {
    recommendations.push('Add an AEO capsule for answer engine optimization');
  } else if (dimensions.aeoScore.status === 'needs_work') {
    recommendations.push('Improve AEO capsule quality (aim for score > 70)');
  }

  if (dimensions.freshness.status === 'poor') {
    recommendations.push('Content is stale - consider updating');
  } else if (dimensions.freshness.status === 'needs_work') {
    recommendations.push('Content could benefit from a refresh');
  }

  if (dimensions.internalLinks.status === 'poor') {
    recommendations.push('Add internal links to related content');
  } else if (dimensions.internalLinks.status === 'needs_work') {
    recommendations.push('Add more internal links (aim for at least 3)');
  }

  return recommendations;
}

/**
 * Calculate readiness for multiple content items.
 */
export async function calculateBatchReadiness(
  contentIds: string[]
): Promise<Map<string, ReadinessReport>> {
  const results = new Map<string, ReadinessReport>();

  // Process in parallel with concurrency limit
  const batchSize = 10;
  for (let i = 0; i < contentIds.length; i += batchSize) {
    const batch = contentIds.slice(i, i + batchSize);
    const reports = await Promise.all(batch.map(id => calculateReadiness(id)));

    for (let j = 0; j < batch.length; j++) {
      const report = reports[j];
      if (report) {
        results.set(batch[j], report);
      }
    }
  }

  return results;
}

/**
 * Get content below readiness threshold.
 */
export async function getContentBelowThreshold(
  threshold: number = 60,
  limit: number = 50
): Promise<ReadinessReport[]> {
  // Get all published content
  const publishedContent = await (db.query as any).contents.findMany({
    where: eq(content.status, 'published'),
    columns: { id: true },
    limit: limit * 2, // Get more to filter
  });

  const reports: ReadinessReport[] = [];

  for (const item of publishedContent) {
    if (reports.length >= limit) break;

    const report = await calculateReadiness(item.id);
    if (report && report.overallScore < threshold) {
      reports.push(report);
    }
  }

  return reports.sort((a, b) => a.overallScore - b.overallScore);
}
