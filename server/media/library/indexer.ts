/**
 * Media Asset Indexer
 *
 * Scans upload directories and syncs assets to the database.
 * Supports bounded processing with pagination and batch limits.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { db } from "../../db";
import { mediaAssets, type InsertMediaAsset } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { getMediaLibraryConfig, getSupportedMimeTypes, isMediaLibraryEnabled } from "./config";
import { log } from "../../lib/logger";

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
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return EXTENSION_MIME_MAP[ext] || "application/octet-stream";
}

/**
 * Calculate SHA-256 checksum of a file
 */
async function calculateChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", data => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Get source type from path
 */
function getSourceFromPath(filePath: string): "upload" | "ai_generated" | "attached" | "external" {
  if (filePath.includes("ai-generated")) {
    return "ai_generated";
  }
  if (filePath.startsWith("attached_assets")) {
    return "attached";
  }
  return "upload";
}

/**
 * Recursively get all files from a directory
 */
/** Try to add a single file entry to the files list */
async function tryAddFileEntry(
  entry: fs.Dirent,
  dirPath: string,
  baseDir: string,
  supportedMimes: string[],
  files: FileInfo[]
): Promise<void> {
  if (entry.name.startsWith(".")) return;

  const fullPath = path.join(dirPath, entry.name);
  const mimeType = getMimeType(entry.name);
  if (!supportedMimes.includes(mimeType)) return;

  try {
    const stats = await fs.promises.stat(fullPath);
    files.push({
      path: path.relative(baseDir, fullPath),
      absolutePath: fullPath,
      filename: entry.name,
      size: stats.size,
      mimeType,
    });
  } catch (error) {
    log.warn(`[MediaLibrary] Cannot stat file: ${fullPath}`, error);
  }
}

async function getFilesRecursive(
  dirPath: string,
  baseDir: string,
  files: FileInfo[] = [],
  maxFiles = 1000
): Promise<FileInfo[]> {
  if (files.length >= maxFiles) return files;

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const supportedMimes = getSupportedMimeTypes();

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await getFilesRecursive(path.join(dirPath, entry.name), baseDir, files, maxFiles);
      } else if (entry.isFile()) {
        await tryAddFileEntry(entry, dirPath, baseDir, supportedMimes, files);
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
/** Process a single file: upsert into database */
async function processFileForIndex(
  file: FileInfo,
  calculateChecksums: boolean,
  result: ScanResult
): Promise<void> {
  const existing = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.path, file.path))
    .limit(1);

  let checksum: string | undefined;
  if (calculateChecksums || existing.length === 0) {
    try {
      checksum = await calculateChecksum(file.absolutePath);
    } catch (error) {
      log.warn(`[MediaLibrary] Cannot calculate checksum: ${file.path}`, error);
    }
  }

  if (existing.length === 0) {
    await db.insert(mediaAssets).values({
      path: file.path,
      url: `/${file.path}`,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      checksum,
      source: getSourceFromPath(file.path),
      lastScannedAt: new Date(),
    } as any);
    result.filesIndexed++;
  } else {
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
}

/** Remove DB assets that no longer exist on disk */
async function cleanupMissingAssets(projectRoot: string): Promise<void> {
  const dbAssets = await db
    .select({ id: mediaAssets.id, path: mediaAssets.path })
    .from(mediaAssets);

  for (const asset of dbAssets) {
    const absolutePath = path.join(projectRoot, asset.path);
    if (!fs.existsSync(absolutePath)) {
      await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
      log.info(`[MediaLibrary] Removed missing asset: ${asset.path}`);
    }
  }
}

/** Collect files from scan directories */
async function collectFiles(
  scanDirectories: string[],
  projectRoot: string,
  limit: number
): Promise<{ files: FileInfo[]; batchComplete: boolean }> {
  const allFiles: FileInfo[] = [];
  let batchComplete = true;

  for (const dir of scanDirectories) {
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) {
      log.info(`[MediaLibrary] Directory does not exist: ${dir}`);
      continue;
    }
    await getFilesRecursive(dirPath, projectRoot, allFiles, limit);
    if (allFiles.length >= limit) {
      batchComplete = false;
      break;
    }
  }

  return { files: allFiles, batchComplete };
}

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
    result.errors.push({ path: "", error: "Media library is not enabled" });
    result.duration = Date.now() - startTime;
    return result;
  }

  try {
    const config = getMediaLibraryConfig();
    const limit = options?.limit ?? config.batchSize;
    const calculateChecksums = options?.calculateChecksums ?? false;
    const projectRoot = process.cwd();

    const collected = await collectFiles(config.scanDirectories, projectRoot, limit);
    result.filesScanned = collected.files.length;
    result.batchComplete = collected.batchComplete;

    for (const file of collected.files) {
      try {
        await processFileForIndex(file, calculateChecksums, result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors.push({ path: file.path, error: errorMessage });
        log.error(`[MediaLibrary] Error indexing file: ${file.path}`, error);
      }
    }

    if (collected.files.length > 0 && result.batchComplete) {
      try {
        await cleanupMissingAssets(projectRoot);
      } catch (error) {
        log.warn("[MediaLibrary] Error cleaning up missing assets", error);
      }
    }

    result.success = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    result.errors.push({ path: "", error: errorMessage });
    log.error("[MediaLibrary] Scan failed", error);
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
  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(mediaAssets);

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
