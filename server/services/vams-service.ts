/**
 * VAMS Service - Visual Asset Management System
 *
 * Provides intelligent image selection and management for content.
 * Integrates with stock photo providers (Unsplash, Pexels, Pixabay)
 * and generates AI images when needed.
 */

import { log } from "../lib/logger";
import { vamsStorage } from "../storage/vams.storage";
import { getImageService } from "./image-service";

import type { VamsAsset, VamsProvider, VamsVariantType } from "@shared/schema";

// Provider configurations
const PROVIDER_CONFIG = {
  unsplash: {
    baseUrl: "https://api.unsplash.com",
    apiKeyEnv: "UNSPLASH_ACCESS_KEY",
    rateLimit: 50, // requests per hour
  },
  pexels: {
    baseUrl: "https://api.pexels.com/v1",
    apiKeyEnv: "PEXELS_API_KEY",
    rateLimit: 200, // requests per hour
  },
  pixabay: {
    baseUrl: "https://pixabay.com/api",
    apiKeyEnv: "PIXABAY_API_KEY",
    rateLimit: 100, // requests per hour
  },
};

// Variant configurations for responsive images
const VARIANT_CONFIGS: Record<VamsVariantType, { width: number; height: number; quality: number }> =
  {
    hero: { width: 1920, height: 1080, quality: 85 },
    card: { width: 600, height: 400, quality: 80 },
    og: { width: 1200, height: 630, quality: 85 },
    thumbnail: { width: 300, height: 200, quality: 75 },
    gallery: { width: 1200, height: 800, quality: 80 },
    mobile: { width: 768, height: 512, quality: 75 },
  };

export interface ImageSearchResult {
  providerId: string;
  provider: VamsProvider;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  title?: string;
  description?: string;
  photographer?: string;
  photographerUrl?: string;
  license?: string;
  tags?: string[];
}

export interface ContentImageRequirements {
  contentId: string;
  contentType: string;
  title: string;
  keywords?: string[];
  destinationId?: string;
  destinationName?: string;
  category?: string;
}

export interface ImageSelectionResult {
  hero?: VamsAsset;
  card?: VamsAsset;
  og?: VamsAsset;
  thumbnail?: VamsAsset;
  gallery?: VamsAsset[];
}

export class VamsService {
  private providerKeys: Map<VamsProvider, string | undefined> = new Map();

  constructor() {
    // Load API keys from environment
    this.providerKeys.set("unsplash", process.env.UNSPLASH_ACCESS_KEY);
    this.providerKeys.set("pexels", process.env.PEXELS_API_KEY);
    this.providerKeys.set("pixabay", process.env.PIXABAY_API_KEY);
  }

  // ============================================================================
  // PROVIDER STATUS
  // ============================================================================

  getAvailableProviders(): VamsProvider[] {
    const available: VamsProvider[] = [];

    if (this.providerKeys.get("unsplash")) available.push("unsplash");
    if (this.providerKeys.get("pexels")) available.push("pexels");
    if (this.providerKeys.get("pixabay")) available.push("pixabay");

    return available;
  }

  isProviderAvailable(provider: VamsProvider): boolean {
    return !!this.providerKeys.get(provider);
  }

  // ============================================================================
  // SEARCH IMAGES
  // ============================================================================

  /**
   * Search for images across all available providers
   */
  async searchImages(
    query: string,
    options?: {
      providers?: VamsProvider[];
      limit?: number;
      orientation?: "landscape" | "portrait" | "square";
    }
  ): Promise<ImageSearchResult[]> {
    const providers = options?.providers || this.getAvailableProviders();
    const limit = options?.limit || 10;
    const results: ImageSearchResult[] = [];

    for (const provider of providers) {
      // Check cache first
      const cached = await vamsStorage.getCachedSearch(provider, query);
      if (cached && cached.results) {
        const cachedResults = (cached.results as any).items || [];
        results.push(
          ...cachedResults.map((item: any) => ({
            ...item,
            provider,
          }))
        );
        continue;
      }

      try {
        const providerResults = await this.searchProvider(
          provider,
          query,
          limit,
          options?.orientation
        );
        results.push(...providerResults);

        // Cache the results (expire in 1 hour)
        await vamsStorage.cacheSearch({
          provider,
          query,
          results: { items: providerResults, totalResults: providerResults.length },
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
      } catch (error) {
        log.warn(`[VAMS] Provider ${provider} search failed:`, error);
      }
    }

    return results;
  }

  /**
   * Search a specific provider
   */
  private async searchProvider(
    provider: VamsProvider,
    query: string,
    limit: number,
    orientation?: string
  ): Promise<ImageSearchResult[]> {
    const apiKey = this.providerKeys.get(provider);
    if (!apiKey) return [];

    switch (provider) {
      case "unsplash":
        return this.searchUnsplash(apiKey, query, limit, orientation);
      case "pexels":
        return this.searchPexels(apiKey, query, limit, orientation);
      case "pixabay":
        return this.searchPixabay(apiKey, query, limit, orientation);
      default:
        return [];
    }
  }

  private async searchUnsplash(
    apiKey: string,
    query: string,
    limit: number,
    orientation?: string
  ): Promise<ImageSearchResult[]> {
    try {
      const params = new URLSearchParams({
        query,
        per_page: String(limit),
        ...(orientation && { orientation }),
      });

      const response = await fetch(`${PROVIDER_CONFIG.unsplash.baseUrl}/search/photos?${params}`, {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.results || []).map((photo: any) => ({
        providerId: photo.id,
        provider: "unsplash" as VamsProvider,
        url: photo.urls.regular,
        thumbnailUrl: photo.urls.thumb,
        width: photo.width,
        height: photo.height,
        title: photo.description || photo.alt_description,
        description: photo.description,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        license: "Unsplash License",
        tags: photo.tags?.map((t: any) => t.title) || [],
      }));
    } catch (error) {
      log.error("[VAMS] Unsplash search error:", error);
      return [];
    }
  }

  private async searchPexels(
    apiKey: string,
    query: string,
    limit: number,
    orientation?: string
  ): Promise<ImageSearchResult[]> {
    try {
      const params = new URLSearchParams({
        query,
        per_page: String(limit),
        ...(orientation && { orientation }),
      });

      const response = await fetch(`${PROVIDER_CONFIG.pexels.baseUrl}/search?${params}`, {
        headers: {
          Authorization: apiKey,
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.photos || []).map((photo: any) => ({
        providerId: String(photo.id),
        provider: "pexels" as VamsProvider,
        url: photo.src.large2x || photo.src.large,
        thumbnailUrl: photo.src.tiny,
        width: photo.width,
        height: photo.height,
        title: photo.alt,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        license: "Pexels License",
        tags: [],
      }));
    } catch (error) {
      log.error("[VAMS] Pexels search error:", error);
      return [];
    }
  }

  private async searchPixabay(
    apiKey: string,
    query: string,
    limit: number,
    orientation?: string
  ): Promise<ImageSearchResult[]> {
    try {
      const params = new URLSearchParams({
        key: apiKey,
        q: query,
        per_page: String(limit),
        image_type: "photo",
        safesearch: "true",
        ...(orientation && { orientation }),
      });

      const response = await fetch(`${PROVIDER_CONFIG.pixabay.baseUrl}/?${params}`);

      if (!response.ok) return [];

      const data = await response.json();
      return (data.hits || []).map((photo: any) => ({
        providerId: String(photo.id),
        provider: "pixabay" as VamsProvider,
        url: photo.largeImageURL,
        thumbnailUrl: photo.previewURL,
        width: photo.imageWidth,
        height: photo.imageHeight,
        title: photo.tags,
        photographer: photo.user,
        photographerUrl: `https://pixabay.com/users/${photo.user}-${photo.user_id}/`,
        license: "Pixabay License",
        tags: photo.tags?.split(",").map((t: string) => t.trim()) || [],
      }));
    } catch (error) {
      log.error("[VAMS] Pixabay search error:", error);
      return [];
    }
  }

  // ============================================================================
  // ACQUIRE & STORE IMAGES
  // ============================================================================

  /**
   * Acquire an image from search results and store it
   */
  async acquireImage(searchResult: ImageSearchResult): Promise<VamsAsset | null> {
    // Check if we already have this image
    const existing = await vamsStorage.getAssetByProviderId(
      searchResult.provider,
      searchResult.providerId
    );
    if (existing) {
      await vamsStorage.incrementAssetUsage(existing.id);
      return existing;
    }

    try {
      // Download and process the image
      const imageService = getImageService();
      const result = await imageService.uploadFromUrl(
        searchResult.url,
        `vams-${searchResult.provider}-${searchResult.providerId}.webp`,
        {
          source: "external",
          altText: searchResult.title || undefined,
        }
      );

      if (!result.success) {
        log.error("[VAMS] Failed to acquire image:", (result as any).error);
        return null;
      }

      // Create asset record
      const asset = await vamsStorage.createAsset({
        provider: searchResult.provider,
        providerId: searchResult.providerId,
        status: "ready",
        originalUrl: searchResult.url,
        storedUrl: result.image.url,
        thumbnailUrl: searchResult.thumbnailUrl,
        filename: result.image.filename,
        mimeType: result.image.mimeType,
        width: searchResult.width,
        height: searchResult.height,
        fileSize: result.image.size,
        title: searchResult.title,
        altText: searchResult.title,
        photographer: searchResult.photographer,
        photographerUrl: searchResult.photographerUrl,
        license: searchResult.license,
        tags: searchResult.tags || [],
      });

      log.info(`[VAMS] Acquired image ${asset.id} from ${searchResult.provider}`);
      return asset;
    } catch (error) {
      log.error("[VAMS] Error acquiring image:", error);
      return null;
    }
  }

  // ============================================================================
  // CONTENT IMAGE SELECTION
  // ============================================================================

  /**
   * Automatically select and acquire images for content
   * This is the main entry point for editorial automation
   */
  async selectImagesForContent(
    requirements: ContentImageRequirements
  ): Promise<ImageSelectionResult> {
    const result: ImageSelectionResult = {};

    // Build search query from content requirements
    const searchQuery = this.buildSearchQuery(requirements);
    log.info(`[VAMS] Selecting images for "${requirements.title}" with query: "${searchQuery}"`);

    // Search for images
    const searchResults = await this.searchImages(searchQuery, {
      limit: 20,
      orientation: "landscape",
    });

    if (searchResults.length === 0) {
      log.warn(`[VAMS] No images found for query: ${searchQuery}`);
      return result;
    }

    // Score and rank images
    const rankedResults = this.rankImages(searchResults, requirements);

    // Acquire best images for each role
    if (rankedResults.length > 0) {
      const heroImage = await this.acquireImage(rankedResults[0]);
      if (heroImage) {
        result.hero = heroImage;
        result.og = heroImage; // Use same for OG by default

        // Link to content
        await vamsStorage.linkAssetToContent({
          contentId: requirements.contentId,
          assetId: heroImage.id,
          role: "hero",
        });
      }
    }

    // Card image (use second best or same as hero)
    if (rankedResults.length > 1) {
      const cardImage = await this.acquireImage(rankedResults[1]);
      if (cardImage) {
        result.card = cardImage;
        await vamsStorage.linkAssetToContent({
          contentId: requirements.contentId,
          assetId: cardImage.id,
          role: "card",
        });
      }
    } else if (result.hero) {
      result.card = result.hero;
    }

    // Gallery images (top 5 unique images)
    if (rankedResults.length > 2) {
      const galleryImages: VamsAsset[] = [];
      for (let i = 2; i < Math.min(7, rankedResults.length); i++) {
        const image = await this.acquireImage(rankedResults[i]);
        if (image) {
          galleryImages.push(image);
          await vamsStorage.linkAssetToContent({
            contentId: requirements.contentId,
            assetId: image.id,
            role: "gallery",
            position: i - 2,
          });
        }
      }
      result.gallery = galleryImages;
    }

    log.info(
      `[VAMS] Selected ${Object.keys(result).length} image roles for content ${requirements.contentId}`
    );
    return result;
  }

  /**
   * Build search query from content requirements
   */
  private buildSearchQuery(requirements: ContentImageRequirements): string {
    const parts: string[] = [];

    // Add destination if available
    if (requirements.destinationName) {
      parts.push(requirements.destinationName);
    }

    // Add keywords
    if (requirements.keywords && requirements.keywords.length > 0) {
      parts.push(...requirements.keywords.slice(0, 3));
    }

    // Add content type context
    if (requirements.contentType === "attraction") {
      parts.push("tourism landmark");
    } else if (requirements.contentType === "hotel") {
      parts.push("luxury hotel");
    } else if (requirements.contentType === "dining" || requirements.contentType === "restaurant") {
      parts.push("restaurant food");
    } else if (requirements.contentType === "article") {
      if (requirements.category) {
        parts.push(requirements.category);
      } else {
        parts.push("travel");
      }
    }

    // Extract key terms from title if not enough parts
    if (parts.length < 3) {
      const titleWords = requirements.title
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 3 && !["the", "and", "for", "with"].includes(w))
        .slice(0, 3);
      parts.push(...titleWords);
    }

    return [...new Set(parts)].join(" ");
  }

  /**
   * Rank images based on relevance to content requirements
   */
  private rankImages(
    images: ImageSearchResult[],
    requirements: ContentImageRequirements
  ): ImageSearchResult[] {
    return images
      .map(img => ({
        image: img,
        score: this.calculateImageScore(img, requirements),
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.image);
  }

  /**
   * Calculate relevance score for an image
   */
  private calculateImageScore(
    image: ImageSearchResult,
    requirements: ContentImageRequirements
  ): number {
    let score = 0;

    // Resolution score (prefer larger images)
    const pixels = image.width * image.height;
    if (pixels >= 1920 * 1080) score += 20;
    else if (pixels >= 1280 * 720) score += 15;
    else if (pixels >= 800 * 600) score += 10;

    // Aspect ratio score (prefer 16:9 or 4:3)
    const aspectRatio = image.width / image.height;
    if (aspectRatio >= 1.5 && aspectRatio <= 1.8)
      score += 15; // Close to 16:9
    else if (aspectRatio >= 1.2 && aspectRatio <= 1.5) score += 10; // Close to 4:3

    // Tag matching
    const keywords = requirements.keywords || [];
    const tags = image.tags || [];
    const tagMatches = tags.filter(tag =>
      keywords.some(kw => tag.toLowerCase().includes(kw.toLowerCase()))
    );
    score += tagMatches.length * 5;

    // Title/description matching
    const searchTerms = [
      requirements.title,
      requirements.destinationName,
      ...(requirements.keywords || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (image.title && image.title.toLowerCase().includes(searchTerms.substring(0, 20))) {
      score += 10;
    }

    // Provider preference (Unsplash often has higher quality)
    if (image.provider === "unsplash") score += 5;
    else if (image.provider === "pexels") score += 3;

    return score;
  }

  // ============================================================================
  // CONTENT IMAGE HOOKS
  // ============================================================================

  /**
   * Check if content needs images
   */
  contentNeedsImages(content: { heroImage?: string | null; cardImage?: string | null }): boolean {
    return !content.heroImage || !content.cardImage;
  }

  /**
   * Get images for content from VAMS
   */
  async getContentImages(
    contentId: string
  ): Promise<{ hero?: string; card?: string; gallery?: string[] }> {
    const assets = await vamsStorage.getContentAssets(contentId);

    const result: { hero?: string; card?: string; gallery?: string[] } = {};

    for (const item of assets) {
      if (item.asset?.storedUrl) {
        if (item.role === "hero") {
          result.hero = item.asset.storedUrl;
        } else if (item.role === "card") {
          result.card = item.asset.storedUrl;
        } else if (item.role === "gallery") {
          result.gallery = result.gallery || [];
          result.gallery.push(item.asset.storedUrl);
        }
      }
    }

    return result;
  }

  /**
   * Post-generation hook to add images to newly generated content
   */
  async postGenerationImageHook(
    contentId: string,
    contentTitle: string,
    contentType: string,
    destinationName?: string,
    keywords?: string[]
  ): Promise<ImageSelectionResult | null> {
    try {
      return await this.selectImagesForContent({
        contentId,
        contentType,
        title: contentTitle,
        keywords,
        destinationName,
      });
    } catch (error) {
      log.error("[VAMS] Post-generation hook failed:", error);
      return null;
    }
  }
}

// Singleton
let vamsServiceInstance: VamsService | null = null;

export function getVamsService(): VamsService {
  if (!vamsServiceInstance) {
    vamsServiceInstance = new VamsService();
  }
  return vamsServiceInstance;
}

// Convenience exports for backward compatibility with the stub
export const enrichContentWithImages = async (
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

export const getContentHeroImage = async (contentId: string) => {
  const images = await getVamsService().getContentImages(contentId);
  return images.hero || null;
};

export const getContentCardImage = async (contentId: string) => {
  const images = await getVamsService().getContentImages(contentId);
  return images.card || null;
};

export const getContentGalleryImages = async (contentId: string) => {
  const images = await getVamsService().getContentImages(contentId);
  return images.gallery || [];
};

export const contentNeedsImages = (content: {
  heroImage?: string | null;
  cardImage?: string | null;
}) => {
  return getVamsService().contentNeedsImages(content);
};

export const getContentImages = async (contentId: string) => {
  return getVamsService().getContentImages(contentId);
};
