/**
 * VAMS (Visual Asset Management System) - Main Entry Point
 *
 * This module provides intelligent image selection and management for content.
 * Integrates with stock photo providers (Unsplash, Pexels, Pixabay) and
 * supports AI image generation.
 */

import { Router } from "express";
import {
  getVamsService,
  getContentImages,
  type ImageSearchResult,
  type ContentImageRequirements,
  type ImageSelectionResult,
} from "../services/vams-service";
import { vamsStorage } from "../storage/vams.storage";
import { log } from "../lib/logger";

// ============================================================================
// EXPRESS ROUTES
// ============================================================================

const router = Router();

/**
 * Search images across providers
 * GET /api/vams/search?q=dubai+skyline&providers=unsplash,pexels&limit=20
 */
router.get("/search", async (req, res) => {
  try {
    const { q, providers, limit, orientation } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const vams = getVamsService();
    const results = await vams.searchImages(q, {
      providers: providers ? ((providers as string).split(",") as any) : undefined,
      limit: limit ? Number.parseInt(limit as string, 10) : 10,
      orientation: orientation as any,
    });

    res.json({
      query: q,
      count: results.length,
      results,
    });
  } catch (error) {
    log.error("[VAMS API] Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * Get available providers
 * GET /api/vams/providers
 */
router.get("/providers", async (_req, res) => {
  try {
    const vams = getVamsService();
    const providers = vams.getAvailableProviders();

    res.json({
      available: providers,
      total: providers.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get providers" });
  }
});

/**
 * Get asset by ID
 * GET /api/vams/assets/:id
 */
router.get("/assets/:id", async (req, res) => {
  try {
    const asset = await vamsStorage.getAsset(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const variants = await vamsStorage.getVariants(asset.id);

    res.json({ asset, variants });
  } catch (error) {
    res.status(500).json({ error: "Failed to get asset" });
  }
});

/**
 * List assets
 * GET /api/vams/assets?provider=unsplash&status=ready&limit=50
 */
router.get("/assets", async (req, res) => {
  try {
    const { provider, status, limit, offset } = req.query;

    const assets = await vamsStorage.getAssets({
      provider: provider as any,
      status: status as any,
      limit: limit ? Number.parseInt(limit as string, 10) : 50,
      offset: offset ? Number.parseInt(offset as string, 10) : 0,
    });

    res.json({
      count: assets.length,
      assets,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to list assets" });
  }
});

/**
 * Acquire an image from search results
 * POST /api/vams/acquire
 */
router.post("/acquire", async (req, res) => {
  try {
    const searchResult = req.body as ImageSearchResult;

    if (!searchResult.providerId || !searchResult.provider || !searchResult.url) {
      return res.status(400).json({
        error: "Missing required fields: providerId, provider, url",
      });
    }

    const vams = getVamsService();
    const asset = await vams.acquireImage(searchResult);

    if (!asset) {
      return res.status(500).json({ error: "Failed to acquire image" });
    }

    res.json({ asset });
  } catch (error) {
    log.error("[VAMS API] Acquire error:", error);
    res.status(500).json({ error: "Failed to acquire image" });
  }
});

/**
 * Select images for content
 * POST /api/vams/select-for-content
 */
router.post("/select-for-content", async (req, res) => {
  try {
    const requirements = req.body as ContentImageRequirements;

    if (!requirements.contentId || !requirements.title) {
      return res.status(400).json({
        error: "Missing required fields: contentId, title",
      });
    }

    const vams = getVamsService();
    const result = await vams.selectImagesForContent(requirements);

    res.json({
      contentId: requirements.contentId,
      selectedImages: {
        hero: result.hero?.storedUrl,
        card: result.card?.storedUrl,
        og: result.og?.storedUrl,
        gallery: result.gallery?.map(a => a.storedUrl),
      },
      assets: result,
    });
  } catch (error) {
    log.error("[VAMS API] Selection error:", error);
    res.status(500).json({ error: "Failed to select images" });
  }
});

/**
 * Get content images
 * GET /api/vams/content/:contentId/images
 */
router.get("/content/:contentId/images", async (req, res) => {
  try {
    const images = await getContentImages(req.params.contentId);
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: "Failed to get content images" });
  }
});

/**
 * Get VAMS stats
 * GET /api/vams/stats
 */
router.get("/stats", async (_req, res) => {
  try {
    const stats = await vamsStorage.getAssetStats();
    const providers = getVamsService().getAvailableProviders();

    res.json({
      ...stats,
      availableProviders: providers,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
export const vamsRoutes = router;

// Re-export service and storage
export { getVamsService, VamsService } from "../services/vams-service";
export { vamsStorage } from "../storage/vams.storage";

// Re-export convenience functions
export {
  enrichContentWithImages,
  getContentHeroImage,
  getContentCardImage,
  getContentGalleryImages,
  contentNeedsImages,
  getContentImages,
} from "../services/vams-service";

// Provider exports (for backward compatibility)
export class UnsplashProvider {
  async search(query: string) {
    return getVamsService().searchImages(query, { providers: ["unsplash"] });
  }
}
export const unsplashProvider = new UnsplashProvider();

export class PexelsProvider {
  async search(query: string) {
    return getVamsService().searchImages(query, { providers: ["pexels"] });
  }
}
export const pexelsProvider = new PexelsProvider();

export class PixabayProvider {
  async search(query: string) {
    return getVamsService().searchImages(query, { providers: ["pixabay"] });
  }
}
export const pixabayProvider = new PixabayProvider();

export const getAvailableProviders = () => getVamsService().getAvailableProviders();
export const getProvider = (name: string) => {
  const providers: Record<string, any> = {
    unsplash: unsplashProvider,
    pexels: pexelsProvider,
    pixabay: pixabayProvider,
  };
  return providers[name] || null;
};
export const getProviderStatus = () => ({
  enabled: getVamsService().getAvailableProviders().length > 0,
  providers: getVamsService().getAvailableProviders(),
});

// Search/Ingestion service exports (for backward compatibility)
export class VamsSearchService {
  async search(query: string, options?: any) {
    return getVamsService().searchImages(query, options);
  }
}
export const vamsSearchService = new VamsSearchService();

export class VamsIngestionService {
  async acquire(result: ImageSearchResult) {
    return getVamsService().acquireImage(result);
  }
}
export const vamsIngestionService = new VamsIngestionService();

export class VamsGenerationService {
  async generateForContent(requirements: ContentImageRequirements) {
    return getVamsService().selectImagesForContent(requirements);
  }
}
export const vamsGenerationService = new VamsGenerationService();

export const postGenerationImageHook = async (
  contentId: string,
  title: string,
  type: string,
  destinationName?: string,
  keywords?: string[]
) => {
  return getVamsService().postGenerationImageHook(
    contentId,
    title,
    type,
    destinationName,
    keywords
  );
};

export type ContentImageOptions = ContentImageRequirements;
export type ContentImageResult = ImageSelectionResult;
