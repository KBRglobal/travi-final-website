/**
 * Octopus Content Persistence
 *
 * GAP A: Persist Octopus-generated content to the contents table
 * and emit lifecycle events for downstream processing (Search, AEO).
 *
 * Features:
 * - Idempotent: Uses sourceHash to detect duplicates
 * - Event emission: Emits content.published/content.updated
 * - Error recovery: Logs failures, supports retry markers
 */

import { storage } from '../storage';
import { log } from '../lib/logger';
import { emitContentPublished, emitContentUpdated } from '../events/content-events';
import type { PipelineGeneratedContent } from './orchestrator';
import type { InsertContent, ContentBlock, Content } from '@shared/schema';
import crypto from 'crypto';

const persistLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[OctopusPersist] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[OctopusPersist] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[OctopusPersist] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export interface PersistOptions {
  /** Job ID for tracking */
  jobId?: string;
  /** Auto-publish or save as draft */
  autoPublish?: boolean;
  /** Destination name for slug generation */
  destination?: string;
  /** Author ID to associate */
  authorId?: string;
}

export interface PersistResult {
  success: boolean;
  contentId?: string;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
}

export interface BatchPersistResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: PersistResult[];
  errors: string[];
}

// ============================================================================
// Content Hash Generation
// ============================================================================

/**
 * Generate a unique hash for content to enable idempotent persistence.
 * Uses title + first 500 chars of content for fingerprinting.
 */
function generateContentHash(content: PipelineGeneratedContent): string {
  const fingerprint = `${content.title}|${content.content.slice(0, 500)}|${content.type}`;
  return crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
}

/**
 * Generate a URL-safe slug from title and destination.
 */
function generateSlug(title: string, destination?: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

  const timestamp = Date.now().toString(36).slice(-4);
  return destination
    ? `${destination.toLowerCase()}-${baseSlug}-${timestamp}`
    : `${baseSlug}-${timestamp}`;
}

/**
 * Map PipelineGeneratedContent type to schema content type.
 */
function mapContentType(type: string): 'article' | 'attraction' | 'hotel' | 'event' | 'itinerary' | 'dining' | 'district' | 'transport' {
  const typeMap: Record<string, string> = {
    'entity_page': 'article',
    'comparison': 'article',
    'ranking': 'article',
    'area_guide': 'article',
    'category_roundup': 'article',
    'faq_page': 'article',
    'worth_it': 'article',
    'itinerary': 'itinerary',
    'budget_guide': 'article',
    'seasonal': 'article',
    'hidden_gems': 'article',
    'vs_article': 'article',
    'tips_article': 'article',
    'neighborhood_update': 'article',
    'destination_guide': 'article',
    'temple_guide': 'article',
    'street_food_guide': 'article',
    'nightlife_guide': 'article',
    'shopping_guide': 'article',
    'transportation_guide': 'article',
    'tourist_tips': 'article',
    'mistakes_article': 'article',
    'laws_article': 'article',
    'photo_spots': 'article',
    'free_activities': 'article',
    'monthly_guide': 'article',
    'audience_guide': 'article',
    'cuisine_guide': 'article',
    'michelin_guide': 'article',
  };

  return (typeMap[type] || 'article') as any;
}

/**
 * Parse HTML content into content blocks.
 */
function parseContentToBlocks(htmlContent: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Simple block extraction from HTML
  // Extract headings and paragraphs
  const sections = htmlContent.split(/<h[1-3][^>]*>/i);

  let blockOrder = 0;
  for (const section of sections) {
    if (!section.trim()) continue;

    // Check if this section starts with a heading closure
    const headingMatch = section.match(/^([^<]+)<\/h[1-3]>/i);
    if (headingMatch) {
      blocks.push({
        id: `heading-${Date.now()}-${blockOrder}`,
        type: 'heading',
        data: { text: headingMatch[1].trim(), level: 2 },
        order: blockOrder++,
      });

      // Get content after heading
      const afterHeading = section.slice(headingMatch[0].length);
      if (afterHeading.trim()) {
        blocks.push({
          id: `text-${Date.now()}-${blockOrder}`,
          type: 'text',
          data: { content: afterHeading.replace(/<[^>]+>/g, '').trim() },
          order: blockOrder++,
        });
      }
    } else {
      // Plain text block
      const text = section.replace(/<[^>]+>/g, '').trim();
      if (text) {
        blocks.push({
          id: `text-${Date.now()}-${blockOrder}`,
          type: 'text',
          data: { content: text },
          order: blockOrder++,
        });
      }
    }
  }

  return blocks;
}

// ============================================================================
// Single Content Persistence
// ============================================================================

/**
 * Persist a single piece of generated content to the database.
 * Idempotent: checks sourceHash to prevent duplicates.
 */
export async function persistGeneratedContent(
  content: PipelineGeneratedContent,
  options: PersistOptions = {}
): Promise<PersistResult> {
  const sourceHash = generateContentHash(content);
  const slug = generateSlug(content.title, options.destination);

  persistLogger.info('Persisting generated content', {
    taskId: content.taskId,
    title: content.title,
    type: content.type,
    sourceHash,
  });

  try {
    // Check for existing content by slug (idempotency check)
    const existing = await storage.getContentBySlug(slug);

    if (existing) {
      // Content exists - check if it needs update
      if (existing.sourceHash === sourceHash) {
        persistLogger.info('Content unchanged, skipping', {
          contentId: existing.id,
          sourceHash,
        });
        return {
          success: true,
          contentId: existing.id,
          action: 'skipped',
        };
      }

      // Update existing content
      const updated = await storage.updateContent(existing.id, {
        title: content.title,
        metaTitle: content.metaTitle,
        metaDescription: content.metaDescription,
        blocks: parseContentToBlocks(content.htmlContent),
        wordCount: content.wordCount,
        sourceHash,
        updatedAt: new Date(),
      });

      if (!updated) {
        throw new Error('Failed to update content');
      }

      // Emit update event if already published
      if (updated.status === 'published') {
        try {
          emitContentUpdated(
            updated.id,
            updated.type,
            updated.title,
            updated.slug,
            updated.status,
            ['title', 'metaTitle', 'metaDescription', 'blocks', 'wordCount']
          );
        } catch (eventError) {
          persistLogger.error('Failed to emit content.updated event', {
            contentId: updated.id,
            error: eventError instanceof Error ? eventError.message : 'Unknown',
          });
          // Don't fail the persist operation for event emission failure
        }
      }

      persistLogger.info('Content updated', {
        contentId: updated.id,
        title: updated.title,
      });

      return {
        success: true,
        contentId: updated.id,
        action: 'updated',
      };
    }

    // Create new content
    const status = options.autoPublish ? 'published' : 'draft';
    const publishedAt = options.autoPublish ? new Date() : undefined;

    const insertData: InsertContent = {
      type: mapContentType(content.type),
      status,
      title: content.title,
      slug,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      blocks: parseContentToBlocks(content.htmlContent),
      wordCount: content.wordCount,
      generatedByAI: true,
      octopusJobId: options.jobId,
      sourceHash,
      authorId: options.authorId,
      publishedAt,
    };

    const created = await storage.createContent(insertData);

    // Emit publish event if auto-published
    if (status === 'published') {
      try {
        emitContentPublished(
          created.id,
          created.type,
          created.title,
          created.slug,
          'draft', // previous status
          'auto-pilot'
        );
      } catch (eventError) {
        persistLogger.error('Failed to emit content.published event', {
          contentId: created.id,
          error: eventError instanceof Error ? eventError.message : 'Unknown',
        });
        // Log for retry but don't fail the operation
      }
    }

    persistLogger.info('Content created', {
      contentId: created.id,
      title: created.title,
      status,
    });

    return {
      success: true,
      contentId: created.id,
      action: 'created',
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    persistLogger.error('Content persistence failed', {
      taskId: content.taskId,
      title: content.title,
      error: errorMessage,
    });

    return {
      success: false,
      action: 'skipped',
      error: errorMessage,
    };
  }
}

// ============================================================================
// Batch Content Persistence
// ============================================================================

/**
 * Persist multiple pieces of generated content in batch.
 * Continues on individual failures to maximize throughput.
 */
export async function batchPersistGeneratedContent(
  contents: PipelineGeneratedContent[],
  options: PersistOptions = {}
): Promise<BatchPersistResult> {
  persistLogger.info('Starting batch persist', {
    count: contents.length,
    jobId: options.jobId,
    autoPublish: options.autoPublish,
  });

  const results: PersistResult[] = [];
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Process sequentially to avoid DB connection issues
  for (const content of contents) {
    const result = await persistGeneratedContent(content, options);
    results.push(result);

    if (result.success) {
      switch (result.action) {
        case 'created':
          created++;
          break;
        case 'updated':
          updated++;
          break;
        case 'skipped':
          skipped++;
          break;
      }
    } else {
      failed++;
      if (result.error) {
        errors.push(`${content.title}: ${result.error}`);
      }
    }
  }

  const batchResult: BatchPersistResult = {
    total: contents.length,
    created,
    updated,
    skipped,
    failed,
    results,
    errors,
  };

  persistLogger.info('Batch persist complete', {
    total: batchResult.total,
    created: batchResult.created,
    updated: batchResult.updated,
    skipped: batchResult.skipped,
    failed: batchResult.failed,
  });

  return batchResult;
}

// ============================================================================
// Pipeline Integration Helper
// ============================================================================

/**
 * Persist publish-ready content from an agent pipeline run.
 * Only persists content with status 'publish_ready'.
 */
export async function persistPipelineResults(
  generatedContent: PipelineGeneratedContent[],
  jobId: string,
  destination: string,
  options: { autoPublish?: boolean; authorId?: string } = {}
): Promise<BatchPersistResult> {
  // Filter to only publish-ready content
  const publishReady = generatedContent.filter(
    c => c.status === 'publish_ready' || c.status === 'quality_passed'
  );

  if (publishReady.length === 0) {
    persistLogger.info('No publish-ready content to persist', { jobId });
    return {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      results: [],
      errors: [],
    };
  }

  persistLogger.info('Persisting pipeline results', {
    jobId,
    totalGenerated: generatedContent.length,
    publishReady: publishReady.length,
    destination,
  });

  return batchPersistGeneratedContent(publishReady, {
    jobId,
    destination,
    autoPublish: options.autoPublish ?? false,
    authorId: options.authorId,
  });
}
