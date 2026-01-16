/**
 * Orphan Detection & Cleanup
 *
 * Detects assets not referenced by any content and manages cleanup.
 */

import { db } from '../../db';
import { mediaAssets, contents, type MediaAsset } from '@shared/schema';
import { eq, sql, and, lt, isNull, desc } from 'drizzle-orm';
import { getMediaLibraryConfig, isMediaLibraryEnabled } from './config';
import {
  extractMediaReferencesFromContent,
  normalizeMediaPath,
  deduplicateReferences,
} from './references';
import { log } from '../../lib/logger';
import * as fs from 'fs';
import * as path from 'path';

/** Orphan asset with details */
export interface OrphanAsset extends MediaAsset {
  orphanedDays?: number;
  canDelete: boolean;
}

/** Result of orphan detection */
export interface OrphanDetectionResult {
  success: boolean;
  totalAssets: number;
  orphanCount: number;
  newOrphans: number;
  recoveredAssets: number;
  duration: number;
  errors: string[];
}

/** Result of delete operation */
export interface DeleteResult {
  success: boolean;
  deletedCount: number;
  deletedBytes: number;
  errors: Array<{ path: string; error: string }>;
  duration: number;
}

/** Dry run result */
export interface DryRunResult {
  assets: Array<{
    id: string;
    path: string;
    filename: string;
    size: number;
    orphanedAt: Date | null;
    orphanedDays: number;
    canDelete: boolean;
  }>;
  totalCount: number;
  totalBytes: number;
  deletableCount: number;
  deletableBytes: number;
}

/**
 * Detect orphaned assets by checking all content references
 */
export async function detectOrphans(options?: {
  limit?: number;
  offset?: number;
}): Promise<OrphanDetectionResult> {
  const startTime = Date.now();
  const result: OrphanDetectionResult = {
    success: false,
    totalAssets: 0,
    orphanCount: 0,
    newOrphans: 0,
    recoveredAssets: 0,
    duration: 0,
    errors: [],
  };

  if (!isMediaLibraryEnabled()) {
    result.errors.push('Media library is not enabled');
    result.duration = Date.now() - startTime;
    return result;
  }

  try {
    const config = getMediaLibraryConfig();
    const limit = options?.limit ?? config.batchSize;
    const offset = options?.offset ?? 0;

    // Get all assets from database
    const allAssets = await db
      .select()
      .from(mediaAssets)
      .limit(limit)
      .offset(offset);

    result.totalAssets = allAssets.length;

    // Get all content with blocks and images
    const allContent = await db
      .select({
        id: contents.id,
        heroImage: contents.heroImage,
        cardImage: contents.cardImage,
        blocks: contents.blocks,
      })
      .from(contents);

    // Build set of all referenced paths
    const referencedPaths = new Set<string>();

    for (const content of allContent) {
      const refs = extractMediaReferencesFromContent(content);
      for (const ref of refs) {
        referencedPaths.add(ref.normalizedPath);
      }
    }

    log.info(`[MediaLibrary] Found ${referencedPaths.size} unique media references in content`);

    // Check each asset
    const now = new Date();

    for (const asset of allAssets) {
      const isReferenced = referencedPaths.has(asset.path);
      const wasOrphan = asset.isOrphan;

      if (!isReferenced && !wasOrphan) {
        // Newly orphaned
        await db
          .update(mediaAssets)
          .set({
            isOrphan: true,
            orphanedAt: now,
            updatedAt: now,
          })
          .where(eq(mediaAssets.id, asset.id));
        result.newOrphans++;
        result.orphanCount++;
      } else if (!isReferenced && wasOrphan) {
        // Still orphaned
        result.orphanCount++;
      } else if (isReferenced && wasOrphan) {
        // Recovered - now referenced again
        await db
          .update(mediaAssets)
          .set({
            isOrphan: false,
            orphanedAt: null,
            updatedAt: now,
          })
          .where(eq(mediaAssets.id, asset.id));
        result.recoveredAssets++;
      }
      // else: referenced and not orphan - no change needed
    }

    result.success = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    log.error('[MediaLibrary] Orphan detection failed', error);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Get list of orphaned assets
 */
export async function getOrphans(options?: {
  limit?: number;
  offset?: number;
}): Promise<OrphanAsset[]> {
  const config = getMediaLibraryConfig();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const orphans = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.isOrphan, true))
    .orderBy(desc(mediaAssets.orphanedAt))
    .limit(limit)
    .offset(offset);

  const now = new Date();

  return orphans.map((asset) => {
    const orphanedDays = asset.orphanedAt
      ? Math.floor((now.getTime() - asset.orphanedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      ...asset,
      orphanedDays,
      canDelete: orphanedDays >= config.orphanGracePeriodDays,
    };
  });
}

/**
 * Get count of orphaned assets
 */
export async function getOrphanCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mediaAssets)
    .where(eq(mediaAssets.isOrphan, true));

  return result?.count ?? 0;
}

/**
 * Dry run delete - returns what would be deleted without actually deleting
 */
export async function dryRunDelete(): Promise<DryRunResult> {
  const config = getMediaLibraryConfig();
  const gracePeriodDate = new Date();
  gracePeriodDate.setDate(gracePeriodDate.getDate() - config.orphanGracePeriodDays);

  // Get all orphans
  const allOrphans = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.isOrphan, true))
    .orderBy(desc(mediaAssets.orphanedAt));

  const now = new Date();
  let totalBytes = 0;
  let deletableBytes = 0;
  let deletableCount = 0;

  const assets = allOrphans.map((asset) => {
    const orphanedDays = asset.orphanedAt
      ? Math.floor((now.getTime() - asset.orphanedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const canDelete = asset.orphanedAt ? asset.orphanedAt < gracePeriodDate : false;

    totalBytes += asset.size;
    if (canDelete) {
      deletableBytes += asset.size;
      deletableCount++;
    }

    return {
      id: asset.id,
      path: asset.path,
      filename: asset.filename,
      size: asset.size,
      orphanedAt: asset.orphanedAt,
      orphanedDays,
      canDelete,
    };
  });

  return {
    assets,
    totalCount: assets.length,
    totalBytes,
    deletableCount,
    deletableBytes,
  };
}

/**
 * Generate a confirmation token for delete operation
 */
export function generateDeleteToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return Buffer.from(`${timestamp}:${random}`).toString('base64');
}

/**
 * Validate a confirmation token (valid for 5 minutes)
 */
export function validateDeleteToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [timestampStr] = decoded.split(':');
    const timestamp = parseInt(timestampStr, 10);
    const age = Date.now() - timestamp;
    // Token valid for 5 minutes
    return age < 5 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Delete orphaned assets that are past the grace period
 */
export async function deleteOrphans(confirmToken: string): Promise<DeleteResult> {
  const startTime = Date.now();
  const result: DeleteResult = {
    success: false,
    deletedCount: 0,
    deletedBytes: 0,
    errors: [],
    duration: 0,
  };

  if (!isMediaLibraryEnabled()) {
    result.errors.push({ path: '', error: 'Media library is not enabled' });
    result.duration = Date.now() - startTime;
    return result;
  }

  if (!validateDeleteToken(confirmToken)) {
    result.errors.push({ path: '', error: 'Invalid or expired confirmation token' });
    result.duration = Date.now() - startTime;
    return result;
  }

  try {
    const config = getMediaLibraryConfig();
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - config.orphanGracePeriodDays);

    // Get orphans past grace period
    const toDelete = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.isOrphan, true),
          lt(mediaAssets.orphanedAt, gracePeriodDate)
        )
      );

    const projectRoot = process.cwd();

    for (const asset of toDelete) {
      try {
        // Delete file from disk
        const filePath = path.join(projectRoot, asset.path);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          log.info(`[MediaLibrary] Deleted file: ${asset.path}`);
        }

        // Delete from database
        await db
          .delete(mediaAssets)
          .where(eq(mediaAssets.id, asset.id));

        result.deletedCount++;
        result.deletedBytes += asset.size;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({ path: asset.path, error: errorMessage });
        log.error(`[MediaLibrary] Failed to delete asset: ${asset.path}`, error);
      }
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push({ path: '', error: errorMessage });
    log.error('[MediaLibrary] Delete operation failed', error);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Get summary statistics for orphans
 */
export async function getOrphanStats(): Promise<{
  totalOrphans: number;
  totalBytes: number;
  deletableOrphans: number;
  deletableBytes: number;
  oldestOrphanDate: Date | null;
}> {
  const config = getMediaLibraryConfig();
  const gracePeriodDate = new Date();
  gracePeriodDate.setDate(gracePeriodDate.getDate() - config.orphanGracePeriodDays);

  const [totalStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalBytes: sql<number>`COALESCE(sum(size), 0)::bigint`,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.isOrphan, true));

  const [deletableStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalBytes: sql<number>`COALESCE(sum(size), 0)::bigint`,
    })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.isOrphan, true),
        lt(mediaAssets.orphanedAt, gracePeriodDate)
      )
    );

  const [oldest] = await db
    .select({ orphanedAt: mediaAssets.orphanedAt })
    .from(mediaAssets)
    .where(eq(mediaAssets.isOrphan, true))
    .orderBy(mediaAssets.orphanedAt)
    .limit(1);

  return {
    totalOrphans: totalStats?.count ?? 0,
    totalBytes: Number(totalStats?.totalBytes ?? 0),
    deletableOrphans: deletableStats?.count ?? 0,
    deletableBytes: Number(deletableStats?.totalBytes ?? 0),
    oldestOrphanDate: oldest?.orphanedAt ?? null,
  };
}
