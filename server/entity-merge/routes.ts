/**
 * Entity Merge Admin Routes
 *
 * Admin-only endpoints for detecting and merging duplicate entities.
 *
 * FEATURE 4: Entity Merge & Canonicalization
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import { detectDuplicates, findDuplicatesFor, getDuplicateStats } from "./detector";
import { mergeEntities, undoMerge, getAllRedirects, getRedirect, getMergeHistory } from "./merger";
import { type MergeableEntityType, type MergeStrategy, isEntityMergeEnabled } from "./types";

/**
 * Register entity merge admin routes
 */
export function registerEntityMergeRoutes(app: Express) {
  /**
   * GET /api/admin/entities/duplicates
   *
   * Scan for potential duplicate entities.
   *
   * Query params:
   * - type: Filter by entity type (optional)
   * - minSimilarity: Minimum similarity score (0-1, default 0.85)
   * - limit: Max results (default 100)
   */
  app.get("/api/admin/entities/duplicates", requireAuth, async (req: Request, res: Response) => {
    try {
      const entityType = req.query.type as MergeableEntityType | undefined;
      const minSimilarity = req.query.minSimilarity
        ? parseFloat(req.query.minSimilarity as string)
        : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await detectDuplicates({ entityType, minSimilarity, limit });

      res.json({
        featureEnabled: isEntityMergeEnabled(),
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to detect duplicates",
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/admin/entities/duplicates/stats
   *
   * Get duplicate detection statistics.
   */
  app.get(
    "/api/admin/entities/duplicates/stats",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const stats = await getDuplicateStats();
        res.json({
          featureEnabled: isEntityMergeEnabled(),
          ...stats,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get duplicate stats" });
      }
    }
  );

  /**
   * GET /api/admin/entities/:id/duplicates
   *
   * Find potential duplicates for a specific entity.
   */
  app.get(
    "/api/admin/entities/:id/duplicates",
    requireAuth,
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const entityType = req.query.type as MergeableEntityType | undefined;

      if (!entityType) {
        return res.status(400).json({ error: "Missing required query param 'type'" });
      }

      try {
        const duplicates = await findDuplicatesFor(id, entityType);
        res.json({
          entityId: id,
          entityType,
          duplicates,
          count: duplicates.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to find duplicates" });
      }
    }
  );

  /**
   * POST /api/admin/entities/:id/merge
   *
   * Merge source entity into target entity.
   *
   * Body:
   * - intoId: Target entity ID
   * - strategy: Merge strategy ('keep_target' | 'keep_source' | 'merge_content')
   */
  app.post("/api/admin/entities/:id/merge", requireAuth, async (req: Request, res: Response) => {
    if (!isEntityMergeEnabled()) {
      return res.status(403).json({
        error: "Entity merge feature is disabled. Set ENABLE_ENTITY_MERGE=true",
      });
    }

    const sourceId = req.params.id;
    const { intoId, strategy } = req.body as { intoId?: string; strategy?: MergeStrategy };

    if (!intoId) {
      return res.status(400).json({ error: "Missing required field 'intoId'" });
    }

    if (!strategy || !["keep_target", "keep_source", "merge_content"].includes(strategy)) {
      return res.status(400).json({
        error: "Invalid strategy. Must be 'keep_target', 'keep_source', or 'merge_content'",
      });
    }

    if (sourceId === intoId) {
      return res.status(400).json({ error: "Cannot merge entity into itself" });
    }

    // Get user ID from auth (simplified - assumes req.user exists after requireAuth)
    const mergedBy = (req as any).user?.id || "system";

    try {
      const result = await mergeEntities({
        sourceId,
        targetId: intoId,
        strategy,
        mergedBy,
      });

      if (result.success) {
        res.json({
          message: "Entities merged successfully",
          ...result,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: result.error || "Merge failed",
          ...result,
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to merge entities" });
    }
  });

  /**
   * GET /api/admin/entities/redirects
   *
   * Get all entity redirects (merge history).
   */
  app.get("/api/admin/entities/redirects", requireAuth, async (req: Request, res: Response) => {
    try {
      const redirects = getAllRedirects();
      res.json({
        redirects,
        count: redirects.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get redirects" });
    }
  });

  /**
   * GET /api/admin/entities/redirects/:id
   *
   * Check if an entity has been merged/redirected.
   */
  app.get("/api/admin/entities/redirects/:id", requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const redirect = getRedirect(id);
      if (redirect) {
        res.json({
          hasRedirect: true,
          redirect,
        });
      } else {
        res.json({
          hasRedirect: false,
          entityId: id,
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to check redirect" });
    }
  });

  /**
   * POST /api/admin/entities/merge/undo/:redirectId
   *
   * Undo a previous merge operation.
   */
  app.post(
    "/api/admin/entities/merge/undo/:redirectId",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isEntityMergeEnabled()) {
        return res.status(403).json({
          error: "Entity merge feature is disabled",
        });
      }

      const { redirectId } = req.params;

      try {
        const result = await undoMerge(redirectId);

        if (result.success) {
          res.json({
            message: "Merge undone successfully",
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(400).json({
            error: result.error || "Failed to undo merge",
          });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to undo merge" });
      }
    }
  );

  /**
   * GET /api/admin/entities/merge/history
   *
   * Get merge operation history.
   */
  app.get("/api/admin/entities/merge/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const history = getMergeHistory();
      res.json({
        history,
        count: history.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get merge history" });
    }
  });
}
