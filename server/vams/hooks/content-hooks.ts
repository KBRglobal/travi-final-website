/**
 * VAMS Content Hooks
 * Pipeline integration for automatic image enrichment during content generation
 */

import { db } from "../../db";
import { vamsContentAssets, vamsAssets } from "../../../shared/schema";
import { eq, and } from "drizzle-orm";
import { vamsSearchService } from "../services/search-service";
import { vamsIngestionService } from "../services/ingestion-service";
import { vamsGenerationService } from "../services/generation-service";
import { VamsVariantType, VamsProvider } from "../types";
import { log } from "../../lib/logger";

export interface ContentImageOptions {
  /**
   * Search query for finding relevant images
   */
  query: string;

  /**
   * Content ID to attach images to
   */
  contentId: string;

  /**
   * Preferred providers in order
   */
  providers?: VamsProvider[];

  /**
   * Role for the image (hero, card, gallery, inline)
   */
  role?: "hero" | "card" | "gallery" | "inline";

  /**
   * Number of images to find (for gallery)
   */
  count?: number;

  /**
   * Variant types to generate
   */
  variants?: VamsVariantType[];

  /**
   * Generate alt text
   */
  generateAltText?: boolean;

  /**
   * Alt text locales
   */
  altTextLocales?: string[];

  /**
   * Fallback to AI generation if no stock images found
   */
  fallbackToAI?: boolean;

  /**
   * AI generation model if fallback
   */
  aiModel?: "dalle" | "flux";

  /**
   * Image orientation preference
   */
  orientation?: "landscape" | "portrait" | "square" | "any";
}

export interface ContentImageResult {
  success: boolean;
  assetIds: string[];
  error?: string;
}

/**
 * Auto-enrich content with images during generation
 */
export async function enrichContentWithImages(
  options: ContentImageOptions
): Promise<ContentImageResult> {
  const assetIds: string[] = [];
  const count = options.count || 1;

  try {
    log.info(`[VamsHooks] Enriching content ${options.contentId} with ${count} images`);

    // 1. Search for stock images
    const searchResult = await vamsSearchService.search({
      query: options.query,
      providers: options.providers || ["unsplash", "pexels", "pixabay"],
      perPage: count * 3, // Get more options
      orientation: options.orientation,
    });

    let selectedImages = searchResult.results.slice(0, count);

    // 2. If not enough images and fallback enabled, generate with AI
    if (selectedImages.length < count && options.fallbackToAI) {
      log.info(`[VamsHooks] Not enough stock images, falling back to AI generation`);

      const remaining = count - selectedImages.length;

      for (let i = 0; i < remaining; i++) {
        const genResult = await vamsGenerationService.generate({
          prompt: options.query,
          model: options.aiModel || "dalle",
          generateVariants: options.variants,
          generateAltText: options.generateAltText,
          altTextLocales: options.altTextLocales,
        });

        if (genResult.success && genResult.assetId) {
          assetIds.push(genResult.assetId);

          // Attach to content
          await vamsIngestionService.attachToContent(
            genResult.assetId,
            options.contentId,
            options.role || "gallery",
            { position: assetIds.length - 1 }
          );
        }
      }
    }

    // 3. Ingest selected stock images
    for (let i = 0; i < selectedImages.length; i++) {
      const image = selectedImages[i];

      const ingestResult = await vamsIngestionService.ingest({
        providerId: image.providerId,
        provider: image.provider,
        url: image.url,
        title: image.title,
        description: image.description,
        tags: image.tags,
        generateVariants: options.variants,
        generateAltText: options.generateAltText,
        altTextLocales: options.altTextLocales,
      });

      if (ingestResult.success && ingestResult.assetId) {
        assetIds.push(ingestResult.assetId);

        // Attach to content
        await vamsIngestionService.attachToContent(
          ingestResult.assetId,
          options.contentId,
          options.role || "gallery",
          { position: i }
        );
      }
    }

    log.info(`[VamsHooks] Enriched content ${options.contentId} with ${assetIds.length} images`);

    return {
      success: assetIds.length > 0,
      assetIds,
    };
  } catch (error) {
    log.error("[VamsHooks] Enrichment error:", error);
    return {
      success: false,
      assetIds,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get hero image for content
 */
export async function getContentHeroImage(
  contentId: string,
  query: string,
  options?: Partial<ContentImageOptions>
): Promise<ContentImageResult> {
  return enrichContentWithImages({
    query,
    contentId,
    role: "hero",
    count: 1,
    variants: ["hero", "og", "mobile"],
    generateAltText: true,
    orientation: "landscape",
    ...options,
  });
}

/**
 * Get card image for content
 */
export async function getContentCardImage(
  contentId: string,
  query: string,
  options?: Partial<ContentImageOptions>
): Promise<ContentImageResult> {
  return enrichContentWithImages({
    query,
    contentId,
    role: "card",
    count: 1,
    variants: ["card", "thumbnail"],
    generateAltText: true,
    ...options,
  });
}

/**
 * Get gallery images for content
 */
export async function getContentGalleryImages(
  contentId: string,
  query: string,
  count: number = 6,
  options?: Partial<ContentImageOptions>
): Promise<ContentImageResult> {
  return enrichContentWithImages({
    query,
    contentId,
    role: "gallery",
    count,
    variants: ["gallery", "thumbnail"],
    generateAltText: true,
    ...options,
  });
}

/**
 * Hook: Post-generation image enrichment
 * Called after content is generated to add images
 */
export async function postGenerationImageHook(
  contentId: string,
  contentType: string,
  title: string,
  tags: string[]
): Promise<void> {
  try {
    // Build search query from title and tags
    const query = [title, ...tags.slice(0, 3)].join(" ");

    // Get hero image
    await getContentHeroImage(contentId, query, {
      fallbackToAI: true,
      altTextLocales: ["en", "he", "es", "de", "fr"],
    });

    // Get card image (often same as hero but different variant)
    // Skip if hero was successful - use the same asset
    const existingHero = await db
      .select()
      .from(vamsContentAssets)
      .where(and(eq(vamsContentAssets.contentId, contentId), eq(vamsContentAssets.role, "hero")))
      .limit(1);

    if (existingHero.length > 0) {
      // Use hero asset for card role too
      await vamsIngestionService.attachToContent(existingHero[0].assetId, contentId, "card");
    }

    log.info(`[VamsHooks] Post-generation hook completed for ${contentId}`);
  } catch (error) {
    log.error("[VamsHooks] Post-generation hook error:", error);
  }
}

/**
 * Hook: Check if content needs images
 */
export async function contentNeedsImages(contentId: string): Promise<{
  needsHero: boolean;
  needsCard: boolean;
  needsGallery: boolean;
}> {
  try {
    const assets = await db
      .select()
      .from(vamsContentAssets)
      .where(eq(vamsContentAssets.contentId, contentId));

    const roles = new Set(assets.map(a => a.role));

    return {
      needsHero: !roles.has("hero"),
      needsCard: !roles.has("card"),
      needsGallery: !roles.has("gallery"),
    };
  } catch (error) {
    log.error("[VamsHooks] Check needs images error:", error);
    return {
      needsHero: true,
      needsCard: true,
      needsGallery: true,
    };
  }
}

/**
 * Get all images for content with their variants
 */
export async function getContentImages(contentId: string) {
  return vamsIngestionService.getAssetsForContent(contentId);
}
