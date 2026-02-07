/**
 * Media Library Admin Routes
 *
 * API endpoints for managing the media library, scanning assets,
 * detecting orphans, and cleanup operations.
 *
 * FEATURE FLAG: Requires ENABLE_MEDIA_LIBRARY=true
 */

import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { mediaAssets } from "@shared/schema";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import { requireAuth, requirePermission } from "../../security";
import { log } from "../../lib/logger";
import {
  isMediaLibraryEnabled,
  getMediaLibraryConfig,
  scanUploadsAndIndex,
  getScanStats,
  detectOrphans,
  getOrphans,
  getOrphanCount,
  getOrphanStats,
  dryRunDelete,
  deleteOrphans,
  generateDeleteToken,
} from "../../media/library";

const router = Router();

/**
 * Middleware to check if media library is enabled
 */
function requireMediaLibraryEnabled(req: Request, res: Response, next: () => void) {
  if (!isMediaLibraryEnabled()) {
    return res.status(503).json({
      error: "Media library is not enabled",
      message: "Set ENABLE_MEDIA_LIBRARY=true to enable this feature",
    });
  }
  next();
}

// Apply common middleware to all routes
router.use(requireAuth);
router.use(requirePermission("canAccessMediaLibrary"));
router.use(requireMediaLibraryEnabled);

/**
 * GET /api/admin/media/status
 *
 * Get overall media library status and configuration
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const config = getMediaLibraryConfig();
    const stats = await getScanStats();
    const orphanStats = await getOrphanStats();

    res.json({
      enabled: config.enabled,
      config: {
        scanDirectories: config.scanDirectories,
        batchSize: config.batchSize,
        orphanGracePeriodDays: config.orphanGracePeriodDays,
      },
      stats: {
        totalAssets: stats.totalAssets,
        lastScanTime: stats.lastScanTime?.toISOString() ?? null,
        bySource: stats.bySource,
      },
      orphans: {
        total: orphanStats.totalOrphans,
        totalBytes: orphanStats.totalBytes,
        deletable: orphanStats.deletableOrphans,
        deletableBytes: orphanStats.deletableBytes,
        oldestOrphanDate: orphanStats.oldestOrphanDate?.toISOString() ?? null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error("[MediaLibrary] Error getting status", error);
    res.status(500).json({ error: "Failed to get media library status" });
  }
});

/**
 * GET /api/admin/media/assets
 *
 * List all indexed assets with pagination and search
 * Query params:
 * - limit: Number of assets per page (default 50, max 100)
 * - offset: Pagination offset
 * - q: Search query (matches filename or path)
 * - source: Filter by source (upload, ai_generated, attached, external)
 */
router.get("/assets", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit as string) || 50, 100);
    const offset = Number.parseInt(req.query.offset as string) || 0;
    const query = req.query.q as string | undefined;
    const source = req.query.source as string | undefined;

    let whereClause = undefined;

    if (query && source) {
      whereClause = sql`(${mediaAssets.filename} ILIKE ${"%" + query + "%"} OR ${mediaAssets.path} ILIKE ${"%" + query + "%"}) AND ${mediaAssets.source} = ${source}`;
    } else if (query) {
      whereClause = or(
        ilike(mediaAssets.filename, `%${query}%`),
        ilike(mediaAssets.path, `%${query}%`)
      );
    } else if (source) {
      whereClause = eq(mediaAssets.source, source as any);
    }

    const [assets, countResult] = await Promise.all([
      db
        .select()
        .from(mediaAssets)
        .where(whereClause)
        .orderBy(desc(mediaAssets.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(mediaAssets)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    res.json({
      assets: assets.map(asset => ({
        id: asset.id,
        path: asset.path,
        url: asset.url,
        filename: asset.filename,
        mimeType: asset.mimeType,
        size: asset.size,
        source: asset.source,
        isOrphan: asset.isOrphan,
        orphanedAt: asset.orphanedAt?.toISOString() ?? null,
        createdAt: asset.createdAt?.toISOString() ?? null,
        lastScannedAt: asset.lastScannedAt?.toISOString() ?? null,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + assets.length < total,
      },
    });
  } catch (error) {
    log.error("[MediaLibrary] Error listing assets", error);
    res.status(500).json({ error: "Failed to list assets" });
  }
});

/**
 * GET /api/admin/media/orphans
 *
 * List orphaned assets with pagination
 * Query params:
 * - limit: Number of orphans per page (default 50, max 100)
 * - offset: Pagination offset
 */
router.get("/orphans", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit as string) || 50, 100);
    const offset = Number.parseInt(req.query.offset as string) || 0;

    const [orphans, total] = await Promise.all([getOrphans({ limit, offset }), getOrphanCount()]);

    const orphanStats = await getOrphanStats();

    res.json({
      orphans: orphans.map(orphan => ({
        id: orphan.id,
        path: orphan.path,
        url: orphan.url,
        filename: orphan.filename,
        mimeType: orphan.mimeType,
        size: orphan.size,
        source: orphan.source,
        orphanedAt: orphan.orphanedAt?.toISOString() ?? null,
        orphanedDays: orphan.orphanedDays,
        canDelete: orphan.canDelete,
        createdAt: orphan.createdAt?.toISOString() ?? null,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + orphans.length < total,
      },
      stats: {
        totalBytes: orphanStats.totalBytes,
        deletableCount: orphanStats.deletableOrphans,
        deletableBytes: orphanStats.deletableBytes,
      },
    });
  } catch (error) {
    log.error("[MediaLibrary] Error listing orphans", error);
    res.status(500).json({ error: "Failed to list orphans" });
  }
});

/**
 * POST /api/admin/media/scan
 *
 * Trigger a scan of upload directories to index assets
 * Body params:
 * - limit: Max files to scan (optional)
 * - calculateChecksums: Whether to calculate file checksums (optional, slower)
 */
router.post(
  "/scan",
  requirePermission("canManageSettings"),
  async (req: Request, res: Response) => {
    try {
      const { limit, calculateChecksums } = req.body;

      log.info("[MediaLibrary] Starting asset scan");
      const result = await scanUploadsAndIndex({
        limit: limit ? Number.parseInt(limit, 10) : undefined,
        calculateChecksums: calculateChecksums === true,
      });

      res.json({
        success: result.success,
        message: result.success ? "Scan completed successfully" : "Scan completed with errors",
        result: {
          filesScanned: result.filesScanned,
          filesIndexed: result.filesIndexed,
          filesUpdated: result.filesUpdated,
          filesSkipped: result.filesSkipped,
          duration: result.duration,
          batchComplete: result.batchComplete,
          errorCount: result.errors.length,
        },
        errors: result.errors.slice(0, 10), // Limit errors in response
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error("[MediaLibrary] Scan failed", error);
      res.status(500).json({ error: "Failed to scan assets" });
    }
  }
);

/**
 * POST /api/admin/media/detect-orphans
 *
 * Run orphan detection on indexed assets
 * Body params:
 * - limit: Max assets to check (optional)
 * - offset: Pagination offset (optional)
 */
router.post(
  "/detect-orphans",
  requirePermission("canManageSettings"),
  async (req: Request, res: Response) => {
    try {
      const { limit, offset } = req.body;

      log.info("[MediaLibrary] Starting orphan detection");
      const result = await detectOrphans({
        limit: limit ? Number.parseInt(limit, 10) : undefined,
        offset: offset ? Number.parseInt(offset, 10) : undefined,
      });

      res.json({
        success: result.success,
        message: result.success ? "Orphan detection completed" : "Detection completed with errors",
        result: {
          totalAssets: result.totalAssets,
          orphanCount: result.orphanCount,
          newOrphans: result.newOrphans,
          recoveredAssets: result.recoveredAssets,
          duration: result.duration,
        },
        errors: result.errors,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error("[MediaLibrary] Orphan detection failed", error);
      res.status(500).json({ error: "Failed to detect orphans" });
    }
  }
);

/**
 * POST /api/admin/media/orphans/dry-run-delete
 *
 * Preview what would be deleted without actually deleting
 * Returns list of deletable orphans with total bytes
 */
router.post(
  "/orphans/dry-run-delete",
  requirePermission("canDelete"),
  async (req: Request, res: Response) => {
    try {
      log.info("[MediaLibrary] Running dry-run delete");
      const result = await dryRunDelete();

      // Generate confirmation token for actual delete
      const confirmToken = generateDeleteToken();

      res.json({
        message: "Dry run complete - no files were deleted",
        summary: {
          totalOrphans: result.totalCount,
          totalBytes: result.totalBytes,
          totalBytesFormatted: formatBytes(result.totalBytes),
          deletableOrphans: result.deletableCount,
          deletableBytes: result.deletableBytes,
          deletableBytesFormatted: formatBytes(result.deletableBytes),
        },
        assets: result.assets.map(asset => ({
          id: asset.id,
          path: asset.path,
          filename: asset.filename,
          size: asset.size,
          sizeFormatted: formatBytes(asset.size),
          orphanedAt: asset.orphanedAt?.toISOString() ?? null,
          orphanedDays: asset.orphanedDays,
          canDelete: asset.canDelete,
        })),
        confirmToken,
        confirmTokenExpiresIn: "5 minutes",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error("[MediaLibrary] Dry run delete failed", error);
      res.status(500).json({ error: "Failed to run dry-run delete" });
    }
  }
);

/**
 * POST /api/admin/media/orphans/delete
 *
 * Delete orphaned assets past grace period
 * Requires confirmation token from dry-run-delete
 * Body params:
 * - confirmToken: Token from dry-run-delete (required)
 */
router.post(
  "/orphans/delete",
  requirePermission("canDelete"),
  async (req: Request, res: Response) => {
    try {
      const { confirmToken } = req.body;

      if (!confirmToken) {
        return res.status(400).json({
          error: "Confirmation token required",
          message: "Run dry-run-delete first to get a confirmation token",
        });
      }

      log.info("[MediaLibrary] Starting orphan deletion");
      const result = await deleteOrphans(confirmToken);

      if (!result.success && result.errors.length > 0) {
        const firstError = result.errors[0];
        if (firstError.error.includes("Invalid or expired")) {
          return res.status(400).json({
            error: "Invalid or expired confirmation token",
            message: "Run dry-run-delete again to get a new token",
          });
        }
      }

      res.json({
        success: result.success,
        message: result.success
          ? `Successfully deleted ${result.deletedCount} orphaned assets`
          : "Delete completed with errors",
        result: {
          deletedCount: result.deletedCount,
          deletedBytes: result.deletedBytes,
          deletedBytesFormatted: formatBytes(result.deletedBytes),
          duration: result.duration,
        },
        errors: result.errors.slice(0, 10),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error("[MediaLibrary] Delete failed", error);
      res.status(500).json({ error: "Failed to delete orphans" });
    }
  }
);

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default router;
