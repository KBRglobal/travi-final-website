/**
 * Editorial Placements Admin Routes
 * Manages content placement like a real news editor would
 */

import { Router, type Request, type Response } from "express";
import { storage } from "../../storage";
import { log } from "../../lib/logger";
import type { EditorialZone, PlacementPriority, PlacementSource } from "@shared/schema";

const router = Router();

// ============================================================================
// PLACEMENTS CRUD
// ============================================================================

/**
 * Get all placements for a zone
 */
router.get("/placements", async (req: Request, res: Response) => {
  try {
    const { zone, destinationId, status, includeExpired } = req.query;

    if (!zone) {
      return res.status(400).json({ error: "Zone is required" });
    }

    const placements = await storage.getPlacementsByZone(zone as EditorialZone, {
      destinationId: destinationId as string | undefined,
      status: status as any,
      includeExpired: includeExpired === "true",
    });

    // Enrich with content data
    const enriched = await Promise.all(
      placements.map(async p => {
        const content = await storage.getContent(p.contentId);
        return {
          ...p,
          content: content
            ? {
                id: content.id,
                title: content.title,
                slug: content.slug,
                type: content.type,
                status: content.status,
                cardImage: content.cardImage,
                publishedAt: content.publishedAt,
              }
            : null,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    log.error("[admin/placements] Error:", error);
    res.status(500).json({ error: "Failed to fetch placements" });
  }
});

/**
 * Get a single placement
 */
router.get("/placements/:id", async (req: Request, res: Response) => {
  try {
    const placement = await storage.getPlacement(req.params.id);
    if (!placement) {
      return res.status(404).json({ error: "Placement not found" });
    }

    const content = await storage.getContent(placement.contentId);
    res.json({ ...placement, content });
  } catch {
    res.status(500).json({ error: "Failed to fetch placement" });
  }
});

/**
 * Create a new placement
 */
router.post("/placements", async (req: Request, res: Response) => {
  try {
    const {
      contentId,
      zone,
      destinationId,
      categorySlug,
      priority,
      position,
      customHeadline,
      customHeadlineHe,
      customImage,
      customExcerpt,
      customExcerptHe,
      isBreaking,
      isFeatured,
      isPinned,
      startsAt,
      expiresAt,
      source,
      aiDecisionData,
    } = req.body;

    if (!contentId || !zone) {
      return res.status(400).json({ error: "contentId and zone are required" });
    }

    // Check if content exists
    const content = await storage.getContent(contentId);
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    const placement = await storage.createPlacement({
      contentId,
      zone: zone as EditorialZone,
      destinationId,
      categorySlug,
      priority: (priority || "standard") as PlacementPriority,
      position: position || 1,
      status: "active",
      source: (source || "manual") as PlacementSource,
      createdBy: (req as any).user?.id,
      customHeadline,
      customHeadlineHe,
      customImage,
      customExcerpt,
      customExcerptHe,
      isBreaking: isBreaking || false,
      isFeatured: isFeatured || false,
      isPinned: isPinned || false,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      aiDecisionData,
    });

    log.info(
      `[admin/placements] Created placement ${placement.id} for content ${contentId} in zone ${zone}`
    );

    res.status(201).json(placement);
  } catch (error) {
    log.error("[admin/placements] Create error:", error);
    res.status(500).json({ error: "Failed to create placement" });
  }
});

/**
 * Update a placement
 */
router.patch("/placements/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const placement = await storage.updatePlacement(id, updates);
    if (!placement) {
      return res.status(404).json({ error: "Placement not found" });
    }

    res.json(placement);
  } catch {
    res.status(500).json({ error: "Failed to update placement" });
  }
});

/**
 * Delete a placement
 */
router.delete("/placements/:id", async (req: Request, res: Response) => {
  try {
    await storage.deletePlacement(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete placement" });
  }
});

/**
 * Rotate out a placement (mark as rotated, record history)
 */
router.post("/placements/:id/rotate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const placement = await storage.rotatePlacement(
      id,
      reason || "Manual rotation",
      (req as any).user?.id || "admin"
    );

    if (!placement) {
      return res.status(404).json({ error: "Placement not found" });
    }

    res.json(placement);
  } catch {
    res.status(500).json({ error: "Failed to rotate placement" });
  }
});

/**
 * Reorder placements in a zone
 */
router.post("/placements/reorder", async (req: Request, res: Response) => {
  try {
    const { zone, orderedIds } = req.body;

    if (!zone || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "zone and orderedIds array are required" });
    }

    await storage.reorderPlacements(zone as EditorialZone, orderedIds);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to reorder placements" });
  }
});

// ============================================================================
// ZONE CONFIGURATION
// ============================================================================

/**
 * Get all zone configs
 */
router.get("/zone-configs", async (_req: Request, res: Response) => {
  try {
    const configs = await storage.getZoneConfigs();
    res.json(configs);
  } catch {
    res.status(500).json({ error: "Failed to fetch zone configs" });
  }
});

/**
 * Get a single zone config
 */
router.get("/zone-configs/:zone", async (req: Request, res: Response) => {
  try {
    const config = await storage.getZoneConfig(req.params.zone as EditorialZone);
    if (!config) {
      return res.status(404).json({ error: "Zone config not found" });
    }
    res.json(config);
  } catch {
    res.status(500).json({ error: "Failed to fetch zone config" });
  }
});

/**
 * Create or update a zone config
 */
router.put("/zone-configs/:zone", async (req: Request, res: Response) => {
  try {
    const { zone } = req.params;
    const config = await storage.upsertZoneConfig({
      zone: zone as EditorialZone,
      ...req.body,
    });
    res.json(config);
  } catch {
    res.status(500).json({ error: "Failed to save zone config" });
  }
});

// ============================================================================
// SCHEDULING
// ============================================================================

/**
 * Get scheduled placements
 */
router.get("/scheduled", async (req: Request, res: Response) => {
  try {
    const { zone, from, to, pendingOnly } = req.query;

    const items = await storage.getScheduledItems({
      zone: zone as EditorialZone | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      pendingOnly: pendingOnly === "true",
    });

    // Enrich with content data
    const enriched = await Promise.all(
      items.map(async item => {
        const content = await storage.getContent(item.contentId);
        return { ...item, content };
      })
    );

    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch scheduled items" });
  }
});

/**
 * Create a scheduled placement
 */
router.post("/scheduled", async (req: Request, res: Response) => {
  try {
    const {
      contentId,
      zone,
      destinationId,
      scheduledAt,
      durationMinutes,
      priority,
      customHeadline,
      customImage,
      notes,
    } = req.body;

    if (!contentId || !zone || !scheduledAt) {
      return res.status(400).json({
        error: "contentId, zone, and scheduledAt are required",
      });
    }

    const item = await storage.createScheduledItem({
      contentId,
      zone: zone as EditorialZone,
      destinationId,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes || 240,
      priority: (priority || "featured") as PlacementPriority,
      customHeadline,
      customImage,
      notes,
      scheduledBy: (req as any).user?.id,
    });

    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: "Failed to create scheduled item" });
  }
});

/**
 * Update a scheduled placement
 */
router.patch("/scheduled/:id", async (req: Request, res: Response) => {
  try {
    const item = await storage.updateScheduledItem(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ error: "Scheduled item not found" });
    }
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed to update scheduled item" });
  }
});

/**
 * Delete a scheduled placement
 */
router.delete("/scheduled/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteScheduledItem(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete scheduled item" });
  }
});

// ============================================================================
// ROTATION HISTORY
// ============================================================================

/**
 * Get rotation history
 */
router.get("/rotation-history", async (req: Request, res: Response) => {
  try {
    const { zone, placementId, limit } = req.query;

    const history = await storage.getRotationHistory({
      zone: zone as EditorialZone | undefined,
      placementId: placementId as string | undefined,
      limit: limit ? Number.parseInt(limit as string, 10) : 50,
    });

    res.json(history);
  } catch {
    res.status(500).json({ error: "Failed to fetch rotation history" });
  }
});

// ============================================================================
// ANALYTICS & STATS
// ============================================================================

/**
 * Get zone stats
 */
router.get("/stats/:zone", async (req: Request, res: Response) => {
  try {
    const stats = await storage.getZoneStats(req.params.zone as EditorialZone);
    res.json(stats);
  } catch {
    res.status(500).json({ error: "Failed to fetch zone stats" });
  }
});

/**
 * Get top performing content for a zone
 */
router.get("/top-performing/:zone", async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const placements = await storage.getTopPerformingContent(
      req.params.zone as EditorialZone,
      limit ? Number.parseInt(limit as string, 10) : 10
    );

    // Enrich with content data
    const enriched = await Promise.all(
      placements.map(async p => {
        const content = await storage.getContent(p.contentId);
        return { ...p, content };
      })
    );

    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch top performing content" });
  }
});

/**
 * Get placements needing rotation
 */
router.get("/needs-rotation", async (_req: Request, res: Response) => {
  try {
    const results = await storage.getPlacementsNeedingRotation();

    // Enrich with content data
    const enriched = await Promise.all(
      results.map(async ({ placement, config }) => {
        const content = await storage.getContent(placement.contentId);
        return { placement, config, content };
      })
    );

    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch placements needing rotation" });
  }
});

/**
 * Get expired placements
 */
router.get("/expired", async (_req: Request, res: Response) => {
  try {
    const placements = await storage.getExpiredPlacements();
    res.json(placements);
  } catch {
    res.status(500).json({ error: "Failed to fetch expired placements" });
  }
});

export default router;
