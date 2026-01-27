/**
 * Indexing Adapter
 *
 * Manages indexed/noindex state and sitemap inclusion.
 * Integrates with sitemap-service.ts for sitemap generation.
 */

import { db } from "../../db";
import { contents } from "../../../shared/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface IndexingState {
  contentId: string;
  slug: string;
  type: string;

  // Index status
  isIndexable: boolean;
  noindex: boolean;
  noindexReason: string | null;
  noindexedAt: Date | null;

  // Sitemap
  inSitemap: boolean;
  sitemapPriority: number;
  sitemapChangefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  lastSitemapUpdate: Date | null;

  // Canonical
  hasCanonical: boolean;
  canonicalUrl: string | null;
  isCanonicalSource: boolean;

  // Robots
  robotsTxtAllowed: boolean;

  // Crawl status
  lastCrawled: Date | null;
  crawlErrors: number;

  // Meta robots
  metaRobots: string | null;
}

export interface IndexingSummary {
  totalPublished: number;
  totalIndexable: number;
  totalNoindex: number;
  inSitemap: number;
  withCanonical: number;
  orphanPages: number;
  recentlyIndexed: number;
  pendingReindex: number;
}

// ============================================================================
// Priority Calculation
// ============================================================================

const TYPE_PRIORITIES: Record<string, number> = {
  landing_page: 0.9,
  hotel: 0.9,
  attraction: 0.9,
  guide: 0.8,
  district: 0.8,
  article: 0.7,
  dining: 0.7,
  event: 0.6,
  itinerary: 0.7,
  transport: 0.5,
};

const TYPE_CHANGEFREQ: Record<string, "daily" | "weekly" | "monthly"> = {
  event: "daily",
  article: "weekly",
  hotel: "weekly",
  attraction: "weekly",
  dining: "weekly",
  district: "monthly",
  guide: "monthly",
  landing_page: "monthly",
  itinerary: "monthly",
  transport: "monthly",
};

function calculateSitemapPriority(content: any): number {
  const basePriority = TYPE_PRIORITIES[content.type] || 0.5;

  // Adjust by SEO score
  const seoScore = content.seoScore || 50;
  const scoreBonus = (seoScore - 50) / 200; // -0.25 to +0.25

  // Adjust by word count
  const wordCount = content.wordCount || 0;
  const wordBonus = wordCount > 1500 ? 0.1 : wordCount > 1000 ? 0.05 : 0;

  const priority = Math.min(1.0, Math.max(0.1, basePriority + scoreBonus + wordBonus));
  return Math.round(priority * 10) / 10;
}

function getChangefreq(content: any): "daily" | "weekly" | "monthly" | "yearly" {
  if (content.type === "event") return "daily";

  const daysSinceUpdate = content.updatedAt
    ? Math.floor((Date.now() - new Date(content.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 365;

  if (daysSinceUpdate < 7) return "daily";
  if (daysSinceUpdate < 30) return "weekly";
  if (daysSinceUpdate < 180) return "monthly";
  return "yearly";
}

// ============================================================================
// Adapter Functions
// ============================================================================

/**
 * Get indexing state for a content item
 */
export async function getIndexingState(contentId: string): Promise<IndexingState | null> {
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });

  if (!content) return null;

  const noindex = (content as any).noindex || false;
  const status = content.status;

  // Check if it's the canonical source (no other content points to it as canonical)
  const hasOthersPointingToIt = await db.query.contents.findFirst({
    where: eq(contents.canonicalContentId, contentId),
  });

  return {
    contentId: content.id,
    slug: content.slug,
    type: content.type,

    isIndexable: status === "published" && !noindex,
    noindex,
    noindexReason: (content as any).noindexReason || null,
    noindexedAt: (content as any).noindexedAt || null,

    inSitemap: status === "published" && !noindex,
    sitemapPriority: calculateSitemapPriority(content),
    sitemapChangefreq: getChangefreq(content),
    lastSitemapUpdate: content.updatedAt ? new Date(content.updatedAt) : null,

    hasCanonical: !!content.canonicalContentId || !!(content as any).canonicalUrl,
    canonicalUrl: (content as any).canonicalUrl || null,
    isCanonicalSource: !content.canonicalContentId && !!hasOthersPointingToIt,

    robotsTxtAllowed: true, // Would check robots.txt rules
    lastCrawled: (content as any).lastCrawled || null,
    crawlErrors: (content as any).crawlErrors || 0,

    metaRobots: noindex ? "noindex, follow" : null,
  };
}

/**
 * Get indexing summary for all content
 */
export async function getIndexingSummary(): Promise<IndexingSummary> {
  const published = await db.query.contents.findMany({
    where: eq(contents.status, "published"),
  });

  const noindexCount = published.filter(c => (c as any).noindex).length;
  const withCanonical = published.filter(
    c => c.canonicalContentId || (c as any).canonicalUrl
  ).length;

  // Count orphan pages (no internal links pointing to them)
  // This would need link graph data
  const orphanPages = 0; // TODO: integrate with link graph

  // Recently indexed (updated in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentlyIndexed = published.filter(
    c => c.updatedAt && new Date(c.updatedAt) > sevenDaysAgo
  ).length;

  // Pending reindex
  const pendingReindex = published.filter(c => (c as any).reindexQueued).length;

  return {
    totalPublished: published.length,
    totalIndexable: published.length - noindexCount,
    totalNoindex: noindexCount,
    inSitemap: published.length - noindexCount,
    withCanonical,
    orphanPages,
    recentlyIndexed,
    pendingReindex,
  };
}

/**
 * Set noindex for content
 */
export async function setNoindex(
  contentId: string,
  reason: string,
  dryRun = false
): Promise<{ success: boolean; rollbackToken?: string }> {
  if (dryRun) {
    return { success: true, rollbackToken: `dryrun_${contentId}_noindex` };
  }

  const previousState = await getIndexingState(contentId);

  await db
    .update(contents)
    .set({
      noindex: true,
      noindexReason: reason,
      noindexedAt: new Date(),
    } as any)
    .where(eq(contents.id, contentId));

  // Return rollback token
  const rollbackToken = Buffer.from(
    JSON.stringify({
      action: "revert_noindex",
      contentId,
      previousNoindex: previousState?.noindex || false,
      timestamp: Date.now(),
    })
  ).toString("base64");

  return { success: true, rollbackToken };
}

/**
 * Remove noindex for content
 */
export async function removeNoindex(
  contentId: string,
  dryRun = false
): Promise<{ success: boolean }> {
  if (dryRun) {
    return { success: true };
  }

  await db
    .update(contents)
    .set({
      noindex: false,
      noindexReason: null,
      noindexedAt: null,
    } as any)
    .where(eq(contents.id, contentId));

  return { success: true };
}

/**
 * Queue content for reindex
 */
export async function queueForReindex(
  contentId: string,
  priority: "high" | "normal" | "low" = "normal",
  dryRun = false
): Promise<{ success: boolean; position?: number }> {
  if (dryRun) {
    return { success: true, position: 0 };
  }

  await db
    .update(contents)
    .set({
      reindexQueued: true,
      reindexQueuedAt: new Date(),
      reindexPriority: priority,
    } as any)
    .where(eq(contents.id, contentId));

  return { success: true, position: 1 };
}

/**
 * Get all content pending reindex
 */
export async function getPendingReindex(): Promise<
  { contentId: string; queuedAt: Date; priority: string }[]
> {
  const pending = await db.query.contents.findMany({
    where: sql`reindex_queued = true`,
  });

  return pending.map(c => ({
    contentId: c.id,
    queuedAt: (c as any).reindexQueuedAt || new Date(),
    priority: (c as any).reindexPriority || "normal",
  }));
}

/**
 * Rollback an indexing action using a token
 */
export async function rollbackIndexingAction(
  rollbackToken: string
): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(Buffer.from(rollbackToken, "base64").toString());

    // Check token age (max 24 hours)
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      return { success: false, message: "Rollback token expired" };
    }

    if (data.action === "revert_noindex") {
      if (data.previousNoindex) {
        await setNoindex(data.contentId, "Rollback");
      } else {
        await removeNoindex(data.contentId);
      }
      return { success: true, message: "Noindex state reverted" };
    }

    return { success: false, message: "Unknown rollback action" };
  } catch (error) {
    return { success: false, message: "Invalid rollback token" };
  }
}
