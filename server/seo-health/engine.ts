/**
 * SEO Technical Health Engine - Core Engine
 * Feature Flag: ENABLE_SEO_HEALTH=true
 */

import { createLogger } from '../lib/logger';
import { db } from '../db';
import { contents, internalLinks } from '@shared/schema';
import { eq, sql, desc, ne } from 'drizzle-orm';
import { isSeoHealthEnabled, SEO_HEALTH_CONFIG, ISSUE_SEVERITY } from './config';
import type {
  SeoIssue,
  SeoIssueType,
  IssueSeverity,
  ContentSeoHealth,
  ContentForCheck,
  SeoHealthSummary,
  SeoIssueList,
  SeoIssueListItem,
} from './types';

const logger = createLogger('seo-health-engine');

// ============================================================================
// Cache
// ============================================================================

class SeoHealthCache {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize = 500;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  clear(): void {
    this.cache.clear();
  }
}

const seoCache = new SeoHealthCache();

// ============================================================================
// Duplicate Detection Storage
// ============================================================================

let titleIndex = new Map<string, string[]>(); // title -> contentIds
let descriptionIndex = new Map<string, string[]>(); // description -> contentIds
let linkGraph = new Map<string, Set<string>>(); // contentId -> linked contentIds

// ============================================================================
// SEO Checks
// ============================================================================

function checkMissingTitle(content: ContentForCheck): SeoIssue | null {
  const title = content.metaTitle || content.title;
  if (!title || title.trim().length === 0) {
    return {
      type: 'missing_title',
      severity: 'critical',
      description: 'Page is missing a title tag',
      contentId: content.id,
      contentTitle: content.title,
      recommendation: 'Add a unique, descriptive title between 50-60 characters',
    };
  }
  return null;
}

function checkMissingDescription(content: ContentForCheck): SeoIssue | null {
  if (!content.metaDescription || content.metaDescription.trim().length === 0) {
    return {
      type: 'missing_description',
      severity: 'critical',
      description: 'Page is missing a meta description',
      contentId: content.id,
      contentTitle: content.title,
      recommendation: 'Add a compelling meta description between 150-160 characters',
    };
  }
  return null;
}

function checkTitleLength(content: ContentForCheck): SeoIssue | null {
  const title = content.metaTitle || content.title;
  if (!title) return null;

  const { minLength, maxLength } = SEO_HEALTH_CONFIG.title;

  if (title.length < minLength) {
    return {
      type: 'title_too_short',
      severity: 'warning',
      description: `Title is too short (${title.length} chars, min ${minLength})`,
      contentId: content.id,
      contentTitle: content.title,
      details: { currentLength: title.length, minLength },
      recommendation: `Expand title to at least ${minLength} characters`,
    };
  }

  if (title.length > maxLength) {
    return {
      type: 'title_too_long',
      severity: 'warning',
      description: `Title is too long (${title.length} chars, max ${maxLength})`,
      contentId: content.id,
      contentTitle: content.title,
      details: { currentLength: title.length, maxLength },
      recommendation: `Shorten title to under ${maxLength} characters`,
    };
  }

  return null;
}

function checkDescriptionLength(content: ContentForCheck): SeoIssue | null {
  if (!content.metaDescription) return null;

  const { minLength, maxLength } = SEO_HEALTH_CONFIG.description;
  const length = content.metaDescription.length;

  if (length < minLength) {
    return {
      type: 'description_too_short',
      severity: 'warning',
      description: `Meta description is too short (${length} chars, min ${minLength})`,
      contentId: content.id,
      contentTitle: content.title,
      details: { currentLength: length, minLength },
      recommendation: `Expand description to at least ${minLength} characters`,
    };
  }

  if (length > maxLength) {
    return {
      type: 'description_too_long',
      severity: 'warning',
      description: `Meta description is too long (${length} chars, max ${maxLength})`,
      contentId: content.id,
      contentTitle: content.title,
      details: { currentLength: length, maxLength },
      recommendation: `Shorten description to under ${maxLength} characters`,
    };
  }

  return null;
}

function checkDuplicateTitle(content: ContentForCheck): SeoIssue | null {
  const title = content.metaTitle || content.title;
  if (!title) return null;

  const normalized = title.toLowerCase().trim();
  const duplicates = titleIndex.get(normalized) || [];
  const otherDuplicates = duplicates.filter(id => id !== content.id);

  if (otherDuplicates.length > 0) {
    return {
      type: 'duplicate_title',
      severity: 'warning',
      description: `Title is duplicated across ${otherDuplicates.length + 1} pages`,
      contentId: content.id,
      contentTitle: content.title,
      details: { duplicateCount: otherDuplicates.length + 1 },
      recommendation: 'Create unique titles for each page',
    };
  }

  return null;
}

function checkDuplicateDescription(content: ContentForCheck): SeoIssue | null {
  if (!content.metaDescription) return null;

  const normalized = content.metaDescription.toLowerCase().trim();
  const duplicates = descriptionIndex.get(normalized) || [];
  const otherDuplicates = duplicates.filter(id => id !== content.id);

  if (otherDuplicates.length > 0) {
    return {
      type: 'duplicate_description',
      severity: 'warning',
      description: `Meta description is duplicated across ${otherDuplicates.length + 1} pages`,
      contentId: content.id,
      contentTitle: content.title,
      details: { duplicateCount: otherDuplicates.length + 1 },
      recommendation: 'Create unique descriptions for each page',
    };
  }

  return null;
}

function checkMissingH1(content: ContentForCheck): SeoIssue | null {
  const blocks = content.blocks as Array<{ type?: string; data?: { level?: number } }> || [];

  const h1Blocks = blocks.filter(
    block => block.type === 'header' && block.data?.level === 1
  );

  if (h1Blocks.length === 0) {
    return {
      type: 'missing_h1',
      severity: 'critical',
      description: 'Page is missing an H1 heading',
      contentId: content.id,
      contentTitle: content.title,
      recommendation: 'Add exactly one H1 heading that describes the page content',
    };
  }

  if (h1Blocks.length > 1) {
    return {
      type: 'multiple_h1',
      severity: 'warning',
      description: `Page has ${h1Blocks.length} H1 headings (should have exactly 1)`,
      contentId: content.id,
      contentTitle: content.title,
      details: { h1Count: h1Blocks.length },
      recommendation: 'Reduce to a single H1 heading',
    };
  }

  return null;
}

function checkOrphanPage(content: ContentForCheck): SeoIssue | null {
  if (content.inboundLinks === 0) {
    return {
      type: 'orphan_page',
      severity: 'warning',
      description: 'Page has no internal links pointing to it',
      contentId: content.id,
      contentTitle: content.title,
      recommendation: 'Add internal links from other relevant content to this page',
    };
  }

  return null;
}

function checkThinContent(content: ContentForCheck): SeoIssue | null {
  const blocks = content.blocks as Array<{ type?: string; data?: { text?: string } }> || [];

  let wordCount = 0;
  for (const block of blocks) {
    if (block.data?.text) {
      wordCount += block.data.text.split(/\s+/).length;
    }
  }

  if (wordCount < SEO_HEALTH_CONFIG.content.thinContentThreshold) {
    return {
      type: 'thin_content',
      severity: 'warning',
      description: `Page has thin content (${wordCount} words)`,
      contentId: content.id,
      contentTitle: content.title,
      details: { wordCount, threshold: SEO_HEALTH_CONFIG.content.minWordCount },
      recommendation: `Expand content to at least ${SEO_HEALTH_CONFIG.content.minWordCount} words`,
    };
  }

  return null;
}

// ============================================================================
// Health Score Calculation
// ============================================================================

export function calculateHealthScore(issues: SeoIssue[]): number {
  const { scoreWeights } = SEO_HEALTH_CONFIG;
  let deductions = 0;

  for (const issue of issues) {
    deductions += scoreWeights[issue.severity];
  }

  return Math.max(0, 100 - deductions);
}

// ============================================================================
// Build Indexes
// ============================================================================

async function buildIndexes(): Promise<void> {
  try {
    // Clear existing indexes
    titleIndex.clear();
    descriptionIndex.clear();
    linkGraph.clear();

    // Get all published content
    const allContent = await db
      .select({
        id: contents.id,
        title: contents.title,
        metaTitle: contents.metaTitle,
        metaDescription: contents.metaDescription,
      })
      .from(contents)
      .where(eq(contents.status, 'published'));

    // Build title and description indexes
    for (const content of allContent) {
      const title = (content.metaTitle || content.title)?.toLowerCase().trim();
      if (title) {
        if (!titleIndex.has(title)) titleIndex.set(title, []);
        titleIndex.get(title)!.push(content.id);
      }

      const desc = content.metaDescription?.toLowerCase().trim();
      if (desc) {
        if (!descriptionIndex.has(desc)) descriptionIndex.set(desc, []);
        descriptionIndex.get(desc)!.push(content.id);
      }
    }

    // Build link graph
    const links = await db
      .select()
      .from(internalLinks)
      .limit(10000);

    for (const link of links) {
      if (!linkGraph.has(link.sourceContentId)) {
        linkGraph.set(link.sourceContentId, new Set());
      }
      linkGraph.get(link.sourceContentId)!.add(link.targetContentId);
    }

    logger.debug({
      titles: titleIndex.size,
      descriptions: descriptionIndex.size,
      links: linkGraph.size,
    }, 'SEO indexes built');
  } catch (error) {
    logger.error({ error }, 'Failed to build SEO indexes');
  }
}

// ============================================================================
// Analyze Content
// ============================================================================

export async function analyzeContent(contentId: string): Promise<ContentSeoHealth | null> {
  if (!isSeoHealthEnabled()) {
    return null;
  }

  const cacheKey = `seo:${contentId}`;
  const cached = seoCache.get<ContentSeoHealth>(cacheKey);
  if (cached) return cached;

  try {
    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (!content) return null;

    // Get inbound link count
    const [inboundCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(internalLinks)
      .where(eq(internalLinks.targetContentId, contentId));

    const contentForCheck: ContentForCheck = {
      id: content.id,
      title: content.title,
      type: content.type,
      metaTitle: content.metaTitle || undefined,
      metaDescription: content.metaDescription || undefined,
      slug: content.slug,
      blocks: content.blocks as unknown[],
      status: content.status,
      inboundLinks: inboundCount?.count || 0,
    };

    const issues: SeoIssue[] = [];

    // Run all checks
    const checks = [
      checkMissingTitle,
      checkMissingDescription,
      checkTitleLength,
      checkDescriptionLength,
      checkDuplicateTitle,
      checkDuplicateDescription,
      checkMissingH1,
      checkOrphanPage,
      checkThinContent,
    ];

    for (const check of checks) {
      const issue = check(contentForCheck);
      if (issue) issues.push(issue);
    }

    const healthScore = calculateHealthScore(issues);

    const result: ContentSeoHealth = {
      contentId,
      contentTitle: content.title,
      contentType: content.type,
      healthScore,
      issues,
      checkedAt: new Date(),
    };

    seoCache.set(cacheKey, result, SEO_HEALTH_CONFIG.cacheTtl);

    return result;
  } catch (error) {
    logger.error({ error, contentId }, 'Failed to analyze content SEO health');
    return null;
  }
}

// ============================================================================
// Get All Issues
// ============================================================================

export async function getAllIssues(
  severity?: IssueSeverity,
  limit: number = 100
): Promise<SeoIssueList | null> {
  if (!isSeoHealthEnabled()) {
    return null;
  }

  const cacheKey = `seo:issues:${severity || 'all'}:${limit}`;
  const cached = seoCache.get<SeoIssueList>(cacheKey);
  if (cached) return cached;

  try {
    // Ensure indexes are built
    if (titleIndex.size === 0) {
      await buildIndexes();
    }

    const contentList = await db
      .select()
      .from(contents)
      .where(eq(contents.status, 'published'))
      .limit(200);

    const allIssues: SeoIssueListItem[] = [];
    const severityCounts = new Map<IssueSeverity, number>();
    const typeCounts = new Map<SeoIssueType, number>();

    for (const content of contentList) {
      const analysis = await analyzeContent(content.id);
      if (!analysis) continue;

      for (const issue of analysis.issues) {
        if (severity && issue.severity !== severity) continue;

        allIssues.push({
          contentId: content.id,
          contentTitle: content.title,
          issue,
        });

        severityCounts.set(
          issue.severity,
          (severityCounts.get(issue.severity) || 0) + 1
        );
        typeCounts.set(issue.type, (typeCounts.get(issue.type) || 0) + 1);
      }
    }

    // Sort by severity (critical first)
    const severityOrder: Record<IssueSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    allIssues.sort((a, b) =>
      severityOrder[a.issue.severity] - severityOrder[b.issue.severity]
    );

    const result: SeoIssueList = {
      issues: allIssues.slice(0, limit),
      total: allIssues.length,
      bySeverity: Array.from(severityCounts.entries())
        .map(([sev, count]) => ({ severity: sev, count }))
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
      byType: Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    };

    seoCache.set(cacheKey, result, SEO_HEALTH_CONFIG.cacheTtl);

    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to get all SEO issues');
    return null;
  }
}

// ============================================================================
// Get Summary
// ============================================================================

export async function getSeoHealthSummary(): Promise<SeoHealthSummary | null> {
  if (!isSeoHealthEnabled()) {
    return null;
  }

  const cacheKey = 'seo:summary';
  const cached = seoCache.get<SeoHealthSummary>(cacheKey);
  if (cached) return cached;

  try {
    // Ensure indexes are built
    if (titleIndex.size === 0) {
      await buildIndexes();
    }

    const contentList = await db
      .select()
      .from(contents)
      .where(eq(contents.status, 'published'))
      .limit(500);

    let totalIssues = 0;
    let totalScore = 0;
    let contentWithIssues = 0;
    const issuesBySeverity = { critical: 0, warning: 0, info: 0 };
    const issuesByType = new Map<SeoIssueType, number>();

    for (const content of contentList) {
      const analysis = await analyzeContent(content.id);
      if (!analysis) continue;

      totalScore += analysis.healthScore;

      if (analysis.issues.length > 0) {
        contentWithIssues++;
        totalIssues += analysis.issues.length;

        for (const issue of analysis.issues) {
          issuesBySeverity[issue.severity]++;
          issuesByType.set(issue.type, (issuesByType.get(issue.type) || 0) + 1);
        }
      }
    }

    const result: SeoHealthSummary = {
      totalContent: contentList.length,
      totalIssues,
      avgHealthScore: contentList.length > 0
        ? Math.round(totalScore / contentList.length)
        : 0,
      issuesBySeverity,
      issuesByType: Array.from(issuesByType.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      contentWithIssues,
      healthyContent: contentList.length - contentWithIssues,
      analyzedAt: new Date(),
    };

    seoCache.set(cacheKey, result, SEO_HEALTH_CONFIG.cacheTtl);

    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to get SEO health summary');
    return null;
  }
}

// ============================================================================
// Engine Status
// ============================================================================

export function getSeoHealthStatus() {
  return {
    enabled: isSeoHealthEnabled(),
    config: SEO_HEALTH_CONFIG,
    indexSize: {
      titles: titleIndex.size,
      descriptions: descriptionIndex.size,
      links: linkGraph.size,
    },
  };
}

export async function rebuildIndexes(): Promise<void> {
  await buildIndexes();
}

export function clearSeoCache(): void {
  seoCache.clear();
}
