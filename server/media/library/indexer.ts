/**
 * Media Asset Indexer
 *
 * Scans upload directories and syncs assets to the database.
 * Supports bounded processing with pagination and batch limits.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { db } from '../../db';
import { mediaAssets, type InsertMediaAsset } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { getMediaLibraryConfig, getSupportedMimeTypes, isMediaLibraryEnabled } from './config';
import { log } from '../../lib/logger';

/** Result of a scan operation */
export interface ScanResult {
  success: boolean;
  filesScanned: number;
  filesIndexed: number;
  filesUpdated: number;
  filesSkipped: number;
  errors: Array<{ path: string; error: string }>;
  duration: number;
  batchComplete: boolean;
}

/** File metadata from filesystem */
interface FileInfo {
  path: string;
  absolutePath: string;
  filename: string;
  size: number;
  mimeType: string;
  checksum?: string;
}

/** MIME type mapping by extension */
const EXTENSION_MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return EXTENSION_MIME_MAP[ext] || 'application/octet-stream';
}

/**
 * Calculate SHA-256 checksum of a file
 */
async function calculateChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Get source type from path
 */
function getSourceFromPath(filePath: string): 'upload' | 'ai_generated' | 'attached' | 'external' {
  if (filePath.includes('ai-generated')) {
    return 'ai_generated';
  }
  if (filePath.startsWith('attached_assets')) {
    return 'attached';
  }
  return 'upload';
}

/**
 * Recursively get all files from a directory
 */
async function getFilesRecursive(
  dirPath: string,
  baseDir: string,
  files: FileInfo[] = [],
  maxFiles = 1000
): Promise<FileInfo[]> {
  if (files.length >= maxFiles) {
    return files;
  }

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const supportedMimes = getSupportedMimeTypes();

    for (const entry of entries) {
      if (files.length >= maxFiles) {
        break;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        // Skip hidden directories
        if (!entry.name.startsWith('.')) {
          await getFilesRecursive(fullPath, baseDir, files, maxFiles);
        }
      } else if (entry.isFile()) {
        // Skip hidden files
        if (entry.name.startsWith('.')) {
          continue;
        }

        const mimeType = getMimeType(entry.name);
        if (!supportedMimes.includes(mimeType)) {
          continue;
        }

        try {
          const stats = await fs.promises.stat(fullPath);
          files.push({
            path: relativePath,
            absolutePath: fullPath,
            filename: entry.name,
            size: stats.size,
            mimeType,
          });
        } catch (error) {
          // Skip files we can't stat
          log.warn(`[MediaLibrary] Cannot stat file: ${fullPath}`, error);
        }
      }
    }
  } catch (error) {
    log.warn(`[MediaLibrary] Cannot read directory: ${dirPath}`, error);
  }

  return files;
}

/**
 * Scan uploads and attached_assets directories and index to database
 */
export async function scanUploadsAndIndex(options?: {
  limit?: number;
  calculateChecksums?: boolean;
}): Promise<ScanResult> {
  const startTime = Date.now();
  const result: ScanResult = {
    success: false,
    filesScanned: 0,
    filesIndexed: 0,
    filesUpdated: 0,
    filesSkipped: 0,
    errors: [],
    duration: 0,
    batchComplete: true,
  };

  if (!isMediaLibraryEnabled()) {
    result.errors.push({ path: '', error: 'Media library is not enabled' });
    result.duration = Date.now() - startTime;
    return result;
  }

  try {
    const config = getMediaLibraryConfig();
    const limit = options?.limit ?? config.batchSize;
    const calculateChecksums = options?.calculateChecksums ?? false;

    // Get project root directory
    const projectRoot = process.cwd();

    // Collect files from all scan directories
    const allFiles: FileInfo[] = [];

    for (const dir of config.scanDirectories) {
      const dirPath = path.join(projectRoot, dir);

      if (!fs.existsSync(dirPath)) {
        log.info(`[MediaLibrary] Directory does not exist: ${dir}`);
        continue;
      }

      await getFilesRecursive(dirPath, projectRoot, allFiles, limit);

      if (allFiles.length >= limit) {
        result.batchComplete = false;
        break;
      }
    }

    result.filesScanned = allFiles.length;

    // Process files in batches
    for (const file of allFiles) {
      try {
        // Check if file already exists in database
        const existing = await db
          .select()
          .from(mediaAssets)
          .where(eq(mediaAssets.path, file.path))
          .limit(1);

        // Calculate checksum if requested or if new file
        let checksum: string | undefined;
        if (calculateChecksums || existing.length === 0) {
          try {
            checksum = await calculateChecksum(file.absolutePath);
          } catch (error) {
            log.warn(`[MediaLibrary] Cannot calculate checksum: ${file.path}`, error);
          }
        }

        const assetData: InsertMediaAsset = {
          path: file.path,
          url: `/${file.path}`,
          filename: file.filename,
          mimeType: file.mimeType,
          size: file.size,
          checksum,
          source: getSourceFromPath(file.path),
          lastScannedAt: new Date(),
        };

        if (existing.length === 0) {
          // Insert new asset
          await db.insert(mediaAssets).values(assetData as any);
          result.filesIndexed++;
        } else {
          // Update existing asset
          await db
            .update(mediaAssets)
            .set({
              size: file.size,
              mimeType: file.mimeType,
              lastScannedAt: new Date(),
              ...(checksum && { checksum }),
            } as any)
            .where(eq(mediaAssets.id, existing[0].id));
          result.filesUpdated++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({ path: file.path, error: errorMessage });
        log.error(`[MediaLibrary] Error indexing file: ${file.path}`, error);
      }
    }

    // Remove assets that no longer exist on disk
    const allPaths = allFiles.map((f) => f.path);
    if (allPaths.length > 0 && result.batchComplete) {
      try {
        // Find assets in DB that are not on disk
        const dbAssets = await db
          .select({ id: mediaAssets.id, path: mediaAssets.path })
          .from(mediaAssets);

        for (const asset of dbAssets) {
          const absolutePath = path.join(projectRoot, asset.path);
          if (!fs.existsSync(absolutePath)) {
            // File no longer exists - mark as orphan or remove
            await db
              .delete(mediaAssets)
              .where(eq(mediaAssets.id, asset.id));
            log.info(`[MediaLibrary] Removed missing asset: ${asset.path}`);
          }
        }
      } catch (error) {
        log.warn('[MediaLibrary] Error cleaning up missing assets', error);
      }
    }

    result.success = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push({ path: '', error: errorMessage });
    log.error('[MediaLibrary] Scan failed', error);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Get scan status/progress
 */
export async function getScanStats(): Promise<{
  totalAssets: number;
  lastScanTime: Date | null;
  bySource: Record<string, number>;
}> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mediaAssets);

  const sourceStats = await db
    .select({
      source: mediaAssets.source,
      count: sql<number>`count(*)::int`,
    })
    .from(mediaAssets)
    .groupBy(mediaAssets.source);

  const [lastScan] = await db
    .select({ lastScannedAt: mediaAssets.lastScannedAt })
    .from(mediaAssets)
    .orderBy(sql`${mediaAssets.lastScannedAt} DESC NULLS LAST`)
    .limit(1);

  const bySource: Record<string, number> = {};
  for (const stat of sourceStats) {
    if (stat.source) {
      bySource[stat.source] = stat.count;
    }
  }

  return {
    totalAssets: countResult?.count ?? 0,
    lastScanTime: lastScan?.lastScannedAt ?? null,
    bySource,
  };
}
