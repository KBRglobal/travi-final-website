/**
 * Content Adapter
 *
 * Pulls real content data from the database and normalizes it
 * for use by SEO Engine classifiers and action engine.
 */

import { db } from '../../db';
import { contents } from '../../../shared/schema';
import { eq, sql } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export interface NormalizedContent {
  id: string;
  type: string;
  status: string;
  title: string;
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  wordCount: number;
  seoScore: number | null;
  aeoScore: number | null;
  answerCapsule: string | null;
  canonicalUrl: string | null;
  canonicalContentId: string | null;
  intent: string | null;
  parentId: string | null;
  authorId: string | null;
  generatedByAI: boolean;
  heroImage: string | null;
  heroImageAlt: string | null;
  blocks: any[];
  seoSchema: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;

  // Computed fields
  hasSchema: boolean;
  hasCanonical: boolean;
  hasFAQs: boolean;
  faqCount: number;
  h2Count: number;
  imageCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  avgParagraphLength: number;
}

export interface ContentAdapterCache {
  data: Map<string, NormalizedContent>;
  lastUpdated: Date | null;
  ttlMs: number;
  maxSize: number;
}

// ============================================================================
// Cache
// ============================================================================

const cache: ContentAdapterCache = {
  data: new Map(),
  lastUpdated: null,
  ttlMs: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
};

function isCacheValid(contentId: string): boolean {
  if (!cache.data.has(contentId)) return false;
  if (!cache.lastUpdated) return false;
  return Date.now() - cache.lastUpdated.getTime() < cache.ttlMs;
}

function pruneCache(): void {
  if (cache.data.size > cache.maxSize) {
    const keysToRemove = Array.from(cache.data.keys()).slice(0, cache.data.size - cache.maxSize);
    keysToRemove.forEach(key => cache.data.delete(key));
  }
}

// ============================================================================
// Normalization Helpers
// ============================================================================

function countFAQs(blocks: any[]): number {
  if (!Array.isArray(blocks)) return 0;

  let count = 0;
  for (const block of blocks) {
    if (block.type === 'faq' || block.type === 'faq_section') {
      count += Array.isArray(block.items) ? block.items.length : 1;
    }
    // Check nested blocks
    if (Array.isArray(block.blocks)) {
      count += countFAQs(block.blocks);
    }
  }
  return count;
}

function countHeadings(blocks: any[]): number {
  if (!Array.isArray(blocks)) return 0;

  let count = 0;
  for (const block of blocks) {
    if (block.type === 'heading' && (block.level === 2 || block.level === 'h2')) {
      count++;
    }
    if (Array.isArray(block.blocks)) {
      count += countHeadings(block.blocks);
    }
  }
  return count;
}

function countImages(blocks: any[]): number {
  if (!Array.isArray(blocks)) return 0;

  let count = 0;
  for (const block of blocks) {
    if (block.type === 'image' || block.type === 'gallery') {
      count += block.type === 'gallery' ? (block.images?.length || 1) : 1;
    }
    if (Array.isArray(block.blocks)) {
      count += countImages(block.blocks);
    }
  }
  return count;
}

function countLinks(blocks: any[], internal: boolean): number {
  if (!Array.isArray(blocks)) return 0;

  let count = 0;
  const pattern = internal ? /href=["']\/[^"']+["']/ : /href=["']https?:\/\/[^"']+["']/;

  for (const block of blocks) {
    if (block.type === 'text' || block.type === 'paragraph') {
      const content = block.content || block.text || '';
      const matches = content.match(new RegExp(pattern, 'g'));
      count += matches ? matches.length : 0;
    }
    if (block.type === 'link') {
      const href = block.href || block.url || '';
      if (internal && href.startsWith('/')) count++;
      if (!internal && href.startsWith('http')) count++;
    }
    if (Array.isArray(block.blocks)) {
      count += countLinks(block.blocks, internal);
    }
  }
  return count;
}

function calculateAvgParagraphLength(blocks: any[]): number {
  if (!Array.isArray(blocks)) return 0;

  const paragraphs: number[] = [];

  for (const block of blocks) {
    if (block.type === 'text' || block.type === 'paragraph') {
      const content = block.content || block.text || '';
      if (content.length > 0) {
        paragraphs.push(content.length);
      }
    }
    if (Array.isArray(block.blocks)) {
      const nested = calculateAvgParagraphLength(block.blocks);
      if (nested > 0) paragraphs.push(nested);
    }
  }

  if (paragraphs.length === 0) return 0;
  return Math.round(paragraphs.reduce((a, b) => a + b, 0) / paragraphs.length);
}

// ============================================================================
// Adapter Functions
// ============================================================================

/**
 * Get normalized content by ID
 */
export async function getContent(contentId: string, bypassCache = false): Promise<NormalizedContent | null> {
  // Check cache
  if (!bypassCache && isCacheValid(contentId)) {
    return cache.data.get(contentId) || null;
  }

  // Fetch from database
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });

  if (!content) return null;

  // Normalize
  const normalized = normalizeContent(content);

  // Cache
  cache.data.set(contentId, normalized);
  cache.lastUpdated = new Date();
  pruneCache();

  return normalized;
}

/**
 * Get all published content (normalized)
 */
export async function getAllPublishedContent(bypassCache = false): Promise<NormalizedContent[]> {
  const allContent = await db.query.contents.findMany({
    where: eq(contents.status, 'published'),
  });

  return allContent.map(c => normalizeContent(c));
}

/**
 * Get content by type
 */
export async function getContentByType(type: string): Promise<NormalizedContent[]> {
  const allContent = await db.query.contents.findMany({
    where: sql`${contents.type} = ${type} AND ${contents.status} = 'published'`,
  });

  return allContent.map(c => normalizeContent(c));
}

/**
 * Get content by slug
 */
export async function getContentBySlug(slug: string): Promise<NormalizedContent | null> {
  const content = await db.query.contents.findFirst({
    where: eq(contents.slug, slug),
  });

  if (!content) return null;
  return normalizeContent(content);
}

/**
 * Normalize raw content to standard format
 */
export function normalizeContent(content: any): NormalizedContent {
  const blocks = Array.isArray(content.blocks) ? content.blocks : [];

  return {
    id: content.id,
    type: content.type || 'article',
    status: content.status || 'draft',
    title: content.title || '',
    slug: content.slug || '',
    metaTitle: content.metaTitle || null,
    metaDescription: content.metaDescription || null,
    primaryKeyword: content.primaryKeyword || null,
    secondaryKeywords: Array.isArray(content.secondaryKeywords) ? content.secondaryKeywords : [],
    wordCount: content.wordCount || 0,
    seoScore: content.seoScore || null,
    aeoScore: content.aeoScore || null,
    answerCapsule: content.answerCapsule || null,
    canonicalUrl: content.canonicalUrl || null,
    canonicalContentId: content.canonicalContentId || null,
    intent: content.intent || null,
    parentId: content.parentId || null,
    authorId: content.authorId || null,
    generatedByAI: content.generatedByAI || false,
    heroImage: content.heroImage || null,
    heroImageAlt: content.heroImageAlt || null,
    blocks,
    seoSchema: content.seoSchema || null,
    createdAt: new Date(content.createdAt),
    updatedAt: new Date(content.updatedAt),
    publishedAt: content.publishedAt ? new Date(content.publishedAt) : null,

    // Computed fields
    hasSchema: !!content.seoSchema,
    hasCanonical: !!content.canonicalUrl || !!content.canonicalContentId,
    hasFAQs: countFAQs(blocks) > 0,
    faqCount: countFAQs(blocks),
    h2Count: countHeadings(blocks),
    imageCount: countImages(blocks),
    internalLinkCount: countLinks(blocks, true),
    externalLinkCount: countLinks(blocks, false),
    avgParagraphLength: calculateAvgParagraphLength(blocks),
  };
}

/**
 * Clear cache
 */
export function clearContentCache(): void {
  cache.data.clear();
  cache.lastUpdated = null;
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; maxSize: number; lastUpdated: Date | null } {
  return {
    size: cache.data.size,
    maxSize: cache.maxSize,
    lastUpdated: cache.lastUpdated,
  };
}

console.log('[SEO Engine] Content adapter loaded');
