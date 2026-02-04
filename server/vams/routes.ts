/**
 * VAMS API Routes
 * Visual Asset Management System endpoints
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { vamsAssets, vamsAssetVariants, vamsContentAssets } from "../../shared/schema";
import { eq, desc, and, ilike, inArray } from "drizzle-orm";
import { vamsSearchService } from "./services/search-service";
import { vamsIngestionService } from "./services/ingestion-service";
import { vamsGenerationService } from "./services/generation-service";
import { getProviderStatus } from "./providers";
import { VamsProvider, VamsVariantType } from "./types";
import { log } from "../lib/logger";

const router = Router();

/**
 * GET /api/vams/status
 * Get VAMS system status and provider availability
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const providers = getProviderStatus();

    // Count assets
    const assetCount = await db.select({ count: vamsAssets.id }).from(vamsAssets);

    res.json({
      success: true,
      providers,
      stats: {
        totalAssets: assetCount.length,
      },
    });
  } catch (error) {
    log.error("[VAMS Routes] Status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get VAMS status",
    });
  }
});

/**
 * POST /api/vams/search
 * Search for images across stock providers
 */
router.post("/search", async (req: Request, res: Response) => {
  try {
    const { query, providers, page, perPage, orientation, color, minWidth, minHeight, locale } =
      req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query is required",
      });
    }

    const result = await vamsSearchService.search({
      query,
      providers: providers as VamsProvider[],
      page,
      perPage,
      orientation,
      color,
      minWidth,
      minHeight,
      locale,
    });

    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    log.error("[VAMS Routes] Search error:", { message: errorMessage, stack: errorStack });
    res.status(500).json({
      success: false,
      error: `Search failed: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/vams/ingest
 * Ingest an image from a provider URL
 */
router.post("/ingest", async (req: Request, res: Response) => {
  try {
    const {
      providerId,
      provider,
      url,
      title,
      description,
      tags,
      generateVariants,
      generateAltText,
      altTextLocales,
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      });
    }

    const result = await vamsIngestionService.ingest({
      providerId,
      provider: provider as VamsProvider,
      url,
      title,
      description,
      tags,
      generateVariants: generateVariants as VamsVariantType[],
      generateAltText,
      altTextLocales,
    });

    res.json(result);
  } catch (error) {
    log.error("[VAMS Routes] Ingest error:", error);
    res.status(500).json({
      success: false,
      error: "Ingestion failed",
    });
  }
});

/**
 * POST /api/vams/generate
 * Generate an image using AI
 */
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      model,
      style,
      aspectRatio,
      quality,
      generateVariants,
      generateAltText,
      altTextLocales,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required",
      });
    }

    const result = await vamsGenerationService.generate({
      prompt,
      model,
      style,
      aspectRatio,
      quality,
      generateVariants: generateVariants as VamsVariantType[],
      generateAltText,
      altTextLocales,
    });

    res.json(result);
  } catch (error) {
    log.error("[VAMS Routes] Generate error:", error);
    res.status(500).json({
      success: false,
      error: "Generation failed",
    });
  }
});

/**
 * GET /api/vams/assets
 * List assets with filtering
 */
router.get("/assets", async (req: Request, res: Response) => {
  try {
    const { page = "1", perPage = "20", provider, status, search } = req.query;

    const pageNum = parseInt(page as string, 10);
    const perPageNum = Math.min(parseInt(perPage as string, 10), 100);
    const offset = (pageNum - 1) * perPageNum;

    let query = db
      .select()
      .from(vamsAssets)
      .orderBy(desc(vamsAssets.createdAt))
      .limit(perPageNum)
      .offset(offset);

    // Apply filters using where conditions
    const conditions: any[] = [];

    if (provider) {
      conditions.push(eq(vamsAssets.provider, provider as string));
    }

    if (status) {
      conditions.push(eq(vamsAssets.status, status as string));
    }

    if (search) {
      conditions.push(ilike(vamsAssets.title, `%${search}%`));
    }

    const assets =
      conditions.length > 0
        ? await db
            .select()
            .from(vamsAssets)
            .where(and(...conditions))
            .orderBy(desc(vamsAssets.createdAt))
            .limit(perPageNum)
            .offset(offset)
        : await db
            .select()
            .from(vamsAssets)
            .orderBy(desc(vamsAssets.createdAt))
            .limit(perPageNum)
            .offset(offset);

    // Get variants for each asset
    const assetIds = assets.map(a => a.id);
    const variants =
      assetIds.length > 0
        ? await db
            .select()
            .from(vamsAssetVariants)
            .where(inArray(vamsAssetVariants.assetId, assetIds))
        : [];

    // Group variants by asset
    const variantsByAsset: Record<string, typeof variants> = {};
    for (const v of variants) {
      if (!variantsByAsset[v.assetId]) {
        variantsByAsset[v.assetId] = [];
      }
      variantsByAsset[v.assetId].push(v);
    }

    const assetsWithVariants = assets.map(a => ({
      ...a,
      variants: variantsByAsset[a.id] || [],
    }));

    res.json({
      success: true,
      assets: assetsWithVariants,
      page: pageNum,
      perPage: perPageNum,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("[VAMS Routes] List assets error:", { message: errorMessage });
    res.status(500).json({
      success: false,
      error: `Failed to list assets: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/vams/assets/:id
 * Get single asset with variants
 */
router.get("/assets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await vamsIngestionService.getAsset(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: "Asset not found",
      });
    }

    res.json({
      success: true,
      asset,
    });
  } catch (error) {
    log.error("[VAMS Routes] Get asset error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get asset",
    });
  }
});

/**
 * DELETE /api/vams/assets/:id
 * Archive an asset (soft delete)
 */
router.delete("/assets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db
      .update(vamsAssets)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(vamsAssets.id, id));

    res.json({
      success: true,
      message: "Asset archived",
    });
  } catch (error) {
    log.error("[VAMS Routes] Delete asset error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete asset",
    });
  }
});

/**
 * POST /api/vams/attach
 * Attach an asset to content
 */
router.post("/attach", async (req: Request, res: Response) => {
  try {
    const { assetId, contentId, role, position, caption, altTextOverride } = req.body;

    if (!assetId || !contentId || !role) {
      return res.status(400).json({
        success: false,
        error: "assetId, contentId, and role are required",
      });
    }

    const success = await vamsIngestionService.attachToContent(assetId, contentId, role, {
      position,
      caption,
      altTextOverride,
    });

    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Failed to attach asset",
      });
    }

    res.json({
      success: true,
      message: "Asset attached to content",
    });
  } catch (error) {
    log.error("[VAMS Routes] Attach error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to attach asset",
    });
  }
});

/**
 * GET /api/vams/content/:contentId
 * Get all assets for a content item
 */
router.get("/content/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;

    const assets = await vamsIngestionService.getAssetsForContent(contentId);

    res.json({
      success: true,
      assets,
    });
  } catch (error) {
    log.error("[VAMS Routes] Get content assets error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get content assets",
    });
  }
});

/**
 * DELETE /api/vams/content/:contentId/assets/:assetId
 * Detach an asset from content
 */
router.delete("/content/:contentId/assets/:assetId", async (req: Request, res: Response) => {
  try {
    const { contentId, assetId } = req.params;

    await db
      .delete(vamsContentAssets)
      .where(
        and(eq(vamsContentAssets.contentId, contentId), eq(vamsContentAssets.assetId, assetId))
      );

    res.json({
      success: true,
      message: "Asset detached from content",
    });
  } catch (error) {
    log.error("[VAMS Routes] Detach error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to detach asset",
    });
  }
});

/**
 * POST /api/vams/cache/clear
 * Clear expired search cache
 */
router.post("/cache/clear", async (req: Request, res: Response) => {
  try {
    const cleared = await vamsSearchService.clearExpiredCache();

    res.json({
      success: true,
      clearedEntries: cleared,
    });
  } catch (error) {
    log.error("[VAMS Routes] Cache clear error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear cache",
    });
  }
});

export default router;
