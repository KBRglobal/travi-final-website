/**
 * RSS Entity Extraction Bridge
 *
 * GAP C: Bridge module that connects RSS ingestion to entity extraction.
 * Feature-flagged and non-blocking.
 *
 * Feature Flag: ENABLE_RSS_ENTITY_EXTRACTION=true (default: false)
 */

import { extractEntities, type ExtractionResult, type ExtractedEntity } from './entity-extractor';
import { batchUpsertEntities } from './entity-upsert';
import { log } from '../lib/logger';
import type { ParsedDocument } from './document-parser';

const bridgeLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[RssEntityBridge] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[RssEntityBridge] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[RssEntityBridge] ${msg}`, data),
};

// ============================================================================
// Feature Flag
// ============================================================================

/**
 * Check if RSS entity extraction is enabled.
 */
export function isRssEntityExtractionEnabled(): boolean {
  return process.env.ENABLE_RSS_ENTITY_EXTRACTION === 'true';
}

// ============================================================================
// Types
// ============================================================================

export interface RssItemForExtraction {
  id: string;
  feedId: string;
  title: string;
  content: string;
  description?: string;
  link?: string;
  pubDate?: Date;
}

export interface RssEntityExtractionResult {
  success: boolean;
  itemId: string;
  entitiesExtracted: number;
  entitiesPersisted: number;
  error?: string;
}

export interface BatchExtractionResult {
  total: number;
  succeeded: number;
  failed: number;
  totalEntities: number;
  results: RssEntityExtractionResult[];
}

// ============================================================================
// Entity Extraction from RSS Item
// ============================================================================

/**
 * Extract entities from a single RSS item.
 * Non-blocking: Returns result without throwing on failure.
 */
export async function extractEntitiesFromRssItem(
  item: RssItemForExtraction,
  destination: string = 'Unknown'
): Promise<RssEntityExtractionResult> {
  if (!isRssEntityExtractionEnabled()) {
    return {
      success: true,
      itemId: item.id,
      entitiesExtracted: 0,
      entitiesPersisted: 0,
    };
  }

  bridgeLogger.info('Extracting entities from RSS item', {
    itemId: item.id,
    feedId: item.feedId,
    titleLength: item.title.length,
    contentLength: item.content.length,
  });

  try {
    // Combine title, description, and content for extraction
    const fullText = [
      item.title,
      item.description || '',
      item.content,
    ].join('\n\n');

    // Create a minimal ParsedDocument structure for extraction
    const document: ParsedDocument = {
      id: `rss-${item.id}`,
      filename: `rss-item-${item.id}`,
      content: fullText,
      paragraphs: fullText.split('\n\n').filter(p => p.trim().length > 0),
      rawContent: fullText,
      totalWords: fullText.split(/\s+/).length,
      parsedAt: new Date(),
    };

    // Run entity extraction with quick settings
    const extractionResult = await extractEntities(document, {
      minConfidence: 0.5,
      useQuickModel: true,
      deepAnalysis: false,
      sweepScan: false,
    });

    const entities = extractionResult.entities;

    if (entities.length === 0) {
      bridgeLogger.info('No entities found in RSS item', { itemId: item.id });
      return {
        success: true,
        itemId: item.id,
        entitiesExtracted: 0,
        entitiesPersisted: 0,
      };
    }

    // Persist entities with RSS source context
    const upsertResult = await batchUpsertEntities(
      entities,
      destination,
      `rss-${item.feedId}` // Source job ID for tracking
    );

    bridgeLogger.info('Entities extracted and persisted from RSS', {
      itemId: item.id,
      extracted: entities.length,
      persisted: upsertResult.created + upsertResult.updated,
    });

    return {
      success: true,
      itemId: item.id,
      entitiesExtracted: entities.length,
      entitiesPersisted: upsertResult.created + upsertResult.updated,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    bridgeLogger.error('Entity extraction failed for RSS item', {
      itemId: item.id,
      error: errorMessage,
    });

    return {
      success: false,
      itemId: item.id,
      entitiesExtracted: 0,
      entitiesPersisted: 0,
      error: errorMessage,
    };
  }
}

/**
 * Extract entities from multiple RSS items in batch.
 * Non-blocking: Continues processing on individual failures.
 */
export async function batchExtractEntitiesFromRss(
  items: RssItemForExtraction[],
  destination: string = 'Unknown'
): Promise<BatchExtractionResult> {
  if (!isRssEntityExtractionEnabled()) {
    bridgeLogger.info('RSS entity extraction disabled, skipping batch', {
      itemCount: items.length,
    });
    return {
      total: items.length,
      succeeded: items.length,
      failed: 0,
      totalEntities: 0,
      results: items.map(item => ({
        success: true,
        itemId: item.id,
        entitiesExtracted: 0,
        entitiesPersisted: 0,
      })),
    };
  }

  bridgeLogger.info('Starting batch RSS entity extraction', {
    itemCount: items.length,
    destination,
  });

  const results: RssEntityExtractionResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let totalEntities = 0;

  // Process sequentially to avoid overwhelming AI services
  for (const item of items) {
    const result = await extractEntitiesFromRssItem(item, destination);
    results.push(result);

    if (result.success) {
      succeeded++;
      totalEntities += result.entitiesExtracted;
    } else {
      failed++;
    }
  }

  bridgeLogger.info('Batch RSS entity extraction complete', {
    total: items.length,
    succeeded,
    failed,
    totalEntities,
  });

  return {
    total: items.length,
    succeeded,
    failed,
    totalEntities,
    results,
  };
}

// ============================================================================
// Hook for Auto-Pilot Integration
// ============================================================================

/**
 * Process entity extraction for a single RSS item after import.
 * This is the main hook to be called from auto-pilot.ts after RSS import.
 *
 * Returns immediately if feature flag is disabled.
 * Logs errors but doesn't throw to avoid blocking RSS ingestion.
 */
export async function processRssItemEntities(
  itemId: string,
  feedId: string,
  title: string,
  content: string,
  description?: string,
  destination?: string
): Promise<void> {
  if (!isRssEntityExtractionEnabled()) {
    return; // Silently skip when disabled
  }

  // Fire and forget - don't await to avoid blocking RSS ingestion
  extractEntitiesFromRssItem(
    { id: itemId, feedId, title, content, description },
    destination || 'Unknown'
  ).catch(error => {
    bridgeLogger.error('Background RSS entity extraction failed', {
      itemId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
  });
}
