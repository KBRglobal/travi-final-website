/**
 * Link Adapter
 *
 * Extracts and manages internal links from content blocks.
 * Provides data for link graph engine.
 */

import { db } from "../../db";
import { contents } from "../../../shared/schema";
import { eq, sql } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface ExtractedLink {
  sourceId: string;
  sourceSlug: string;
  targetUrl: string;
  targetId: string | null; // Resolved content ID if internal
  anchorText: string;
  isInternal: boolean;
  context: "body" | "sidebar" | "footer" | "navigation";
  position: number; // Order in content
}

export interface LinkSummary {
  contentId: string;
  internalLinks: ExtractedLink[];
  externalLinks: ExtractedLink[];
  internalLinkCount: number;
  externalLinkCount: number;
  brokenLinks: string[];
  suggestedLinks: { targetId: string; relevance: number }[];
}

export interface SiteLinksOverview {
  totalInternalLinks: number;
  totalExternalLinks: number;
  avgInternalLinksPerPage: number;
  pagesWithNoInternalLinks: number;
  pagesWithNoOutboundLinks: number;
  mostLinkedPages: { contentId: string; inboundCount: number }[];
  leastLinkedPages: { contentId: string; inboundCount: number }[];
}

// ============================================================================
// Link Extraction
// ============================================================================

const INTERNAL_LINK_PATTERN = /href=["']\/([^"'#]+)(?:#[^"']*)?["']/g;
const EXTERNAL_LINK_PATTERN = /href=["'](https?:\/\/[^"']+)["']/g;
const ANCHOR_TEXT_PATTERN = /<a[^>]*href=["'][^"']+["'][^>]*>([^<]+)<\/a>/gi;

function extractLinksFromBlock(
  block: any,
  sourceId: string,
  sourceSlug: string,
  position: number
): ExtractedLink[] {
  const links: ExtractedLink[] = [];

  if (!block) return links;

  // Get text content
  const textContent = block.content || block.text || block.html || "";

  // Extract internal links
  let match;
  const internalPattern = new RegExp(INTERNAL_LINK_PATTERN);
  while ((match = internalPattern.exec(textContent)) !== null) {
    const targetUrl = "/" + match[1];
    links.push({
      sourceId,
      sourceSlug,
      targetUrl,
      targetId: null, // Will be resolved later
      anchorText: extractAnchorText(textContent, targetUrl) || targetUrl,
      isInternal: true,
      context: "body",
      position,
    });
  }

  // Extract external links
  const externalPattern = new RegExp(EXTERNAL_LINK_PATTERN);
  while ((match = externalPattern.exec(textContent)) !== null) {
    const targetUrl = match[1];
    links.push({
      sourceId,
      sourceSlug,
      targetUrl,
      targetId: null,
      anchorText: extractAnchorText(textContent, targetUrl) || targetUrl,
      isInternal: false,
      context: "body",
      position,
    });
  }

  // Check for explicit link blocks
  if (block.type === "link" || block.type === "button") {
    const href = block.href || block.url || "";
    if (href) {
      const isInternal = href.startsWith("/") || href.startsWith(process.env.SITE_URL || "");
      links.push({
        sourceId,
        sourceSlug,
        targetUrl: href,
        targetId: null,
        anchorText: block.text || block.label || href,
        isInternal,
        context: "body",
        position,
      });
    }
  }

  // Recurse into nested blocks
  if (Array.isArray(block.blocks)) {
    block.blocks.forEach((nestedBlock: any, idx: number) => {
      links.push(...extractLinksFromBlock(nestedBlock, sourceId, sourceSlug, position + idx));
    });
  }

  return links;
}

function extractAnchorText(html: string, targetUrl: string): string | null {
  // Simple extraction - find anchor text for specific URL
  const escapedUrl = targetUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<a[^>]*href=["']${escapedUrl}["'][^>]*>([^<]+)<\\/a>`, "i");
  const match = pattern.exec(html);
  return match ? match[1].trim() : null;
}

// ============================================================================
// Adapter Functions
// ============================================================================

/**
 * Extract all links from content
 */
export async function extractLinksFromContent(contentId: string): Promise<LinkSummary> {
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });

  if (!content) {
    return {
      contentId,
      internalLinks: [],
      externalLinks: [],
      internalLinkCount: 0,
      externalLinkCount: 0,
      brokenLinks: [],
      suggestedLinks: [],
    };
  }

  const blocks = Array.isArray(content.blocks) ? content.blocks : [];
  const allLinks: ExtractedLink[] = [];

  // Extract links from all blocks
  blocks.forEach((block: any, idx: number) => {
    allLinks.push(...extractLinksFromBlock(block, content.id, content.slug, idx));
  });

  // Resolve internal link targets
  const internalLinks = allLinks.filter(l => l.isInternal);
  const externalLinks = allLinks.filter(l => !l.isInternal);

  // Resolve target IDs for internal links
  for (const link of internalLinks) {
    const slug = link.targetUrl.replace(/^\//, "").split("/").pop();
    if (slug) {
      const target = await db.query.contents.findFirst({
        where: eq(contents.slug, slug),
      });
      if (target) {
        link.targetId = target.id;
      }
    }
  }

  // Find broken links (internal links that don't resolve)
  const brokenLinks = internalLinks.filter(l => !l.targetId).map(l => l.targetUrl);

  // Generate link suggestions based on content type and keywords
  const suggestedLinks = await generateLinkSuggestions(content);

  return {
    contentId,
    internalLinks,
    externalLinks,
    internalLinkCount: internalLinks.length,
    externalLinkCount: externalLinks.length,
    brokenLinks,
    suggestedLinks,
  };
}

/**
 * Generate link suggestions based on content similarity
 */
async function generateLinkSuggestions(
  content: any
): Promise<{ targetId: string; relevance: number }[]> {
  const primaryKeyword = content.primaryKeyword || "";
  const type = content.type;

  // Find related content
  const related = await db.query.contents.findMany({
    where: sql`
      ${contents.status} = 'published'
      AND ${contents.id} != ${content.id}
      AND (
        ${contents.type} = ${type}
        OR ${contents.primaryKeyword} ILIKE ${"%" + primaryKeyword + "%"}
      )
    `,
    limit: 10,
  });

  return related.map(r => ({
    targetId: r.id,
    relevance: r.type === type ? 0.8 : 0.5,
  }));
}

/**
 * Get site-wide link overview
 */
export async function getSiteLinksOverview(): Promise<SiteLinksOverview> {
  const published = await db.query.contents.findMany({
    where: eq(contents.status, "published"),
  });

  // Extract links for all content
  const linkCounts: { id: string; internal: number; external: number }[] = [];
  const inboundCounts = new Map<string, number>();

  for (const content of published.slice(0, 100)) {
    // Limit for performance
    const summary = await extractLinksFromContent(content.id);
    linkCounts.push({
      id: content.id,
      internal: summary.internalLinkCount,
      external: summary.externalLinkCount,
    });

    // Count inbound links
    for (const link of summary.internalLinks) {
      if (link.targetId) {
        inboundCounts.set(link.targetId, (inboundCounts.get(link.targetId) || 0) + 1);
      }
    }
  }

  const totalInternal = linkCounts.reduce((sum, c) => sum + c.internal, 0);
  const totalExternal = linkCounts.reduce((sum, c) => sum + c.external, 0);

  // Sort by inbound count
  const sortedByInbound = Array.from(inboundCounts.entries()).sort((a, b) => b[1] - a[1]);

  return {
    totalInternalLinks: totalInternal,
    totalExternalLinks: totalExternal,
    avgInternalLinksPerPage:
      linkCounts.length > 0 ? Math.round(totalInternal / linkCounts.length) : 0,
    pagesWithNoInternalLinks: linkCounts.filter(c => c.internal === 0).length,
    pagesWithNoOutboundLinks: linkCounts.filter(c => c.internal === 0 && c.external === 0).length,
    mostLinkedPages: sortedByInbound.slice(0, 10).map(([id, count]) => ({
      contentId: id,
      inboundCount: count,
    })),
    leastLinkedPages: sortedByInbound
      .slice(-10)
      .reverse()
      .map(([id, count]) => ({
        contentId: id,
        inboundCount: count,
      })),
  };
}

/**
 * Check if a URL is a valid internal link
 */
export async function validateInternalLink(
  url: string
): Promise<{ valid: boolean; contentId?: string }> {
  const slug = url.replace(/^\//, "").split("/").pop();
  if (!slug) return { valid: false };

  const content = await db.query.contents.findFirst({
    where: eq(contents.slug, slug),
  });

  return content ? { valid: true, contentId: content.id } : { valid: false };
}
