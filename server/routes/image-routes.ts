/**
 * Unified Image Routes
 * Consolidated API endpoints for all image operations
 */

import { Express, Request, Response, NextFunction } from "express";
// @ts-ignore - multer has complex types
import multer from "multer";
import {
  getImageService,
  uploadImage,
  uploadImageFromUrl,
  deleteImage,
  StoredImage,
  UploadError,
  ImageUploadOptions,
} from "../services/image-service";
import {
  getExternalImageService,
  AIGenerationOptions,
  FreepikSearchOptions,
} from "../services/external-image-service";
import { SUPPORTED_MIME_TYPES } from "../services/image-processing";
import {
  getImageSEOService,
  generateImageSEOMetadata,
  generateAIImagePrompt,
  generateImageFilename,
  ImageSEOContext,
  ImageCategory,
  ContentType,
  ImagePurpose,
  DUBAI_AREAS,
} from "../services/image-seo-service";
import {
  rateLimiters,
  requirePermission,
  checkReadOnlyMode,
  checkAiUsageLimit,
  safeMode,
} from "../security";

// Multer configuration for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_MIME_TYPES.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

/**
 * Register all image routes
 */
export function registerImageRoutes(app: Express) {
  const imageService = getImageService();
  const externalImageService = getExternalImageService();

  // ============================================================================
  // UPLOAD ROUTES
  // ============================================================================

  /**
   * POST /api/images/upload
   * Upload a single image from file
   */
  app.post(
    "/api/images/upload",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file provided" });
        }

        const { altText, contentId, seoContext } = req.body;

        // Parse SEO context if provided as JSON string
        let parsedSeoContext: ImageSEOContext | undefined;
        if (seoContext) {
          try {
            parsedSeoContext = typeof seoContext === "string" ? JSON.parse(seoContext) : seoContext;
          } catch (e) {
            console.error(e);
          }
        }

        const result = await uploadImage(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          {
            source: "upload",
            altText,
            contentId: contentId ? parseInt(contentId) : undefined,
            seoContext: parsedSeoContext,
          }
        );

        if (!result.success) {
          return res.status(400).json({ error: (result as UploadError).error });
        }

        res.json({
          success: true,
          image: result.image,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * POST /api/images/upload-batch
   * Upload multiple images
   */
  app.post(
    "/api/images/upload-batch",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    upload.array("files", 10),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No files provided" });
        }

        const { altText, contentId } = req.body;

        const result = await imageService.uploadBatch(
          files.map(f => ({
            buffer: f.buffer,
            filename: f.originalname,
            mimeType: f.mimetype,
          })),
          {
            source: "upload",
            altText,
            contentId: contentId ? parseInt(contentId) : undefined,
          }
        );

        res.json({
          success: true,
          total: result.total,
          successful: result.successful.length,
          failed: result.failed.length,
          images: result.successful,
          errors: result.failed,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Batch upload failed";
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * POST /api/images/upload-url
   * Upload image from external URL
   */
  app.post(
    "/api/images/upload-url",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const { url, filename, altText, contentId } = req.body;

        if (!url) {
          return res.status(400).json({ error: "URL is required" });
        }

        const result = await uploadImageFromUrl(url, filename || `external-${Date.now()}.jpg`, {
          source: "external",
          altText,
          contentId: contentId ? parseInt(contentId) : undefined,
        });

        if (!result.success) {
          return res.status(400).json({ error: (result as UploadError).error });
        }

        res.json({
          success: true,
          image: result.image,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "URL upload failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // ============================================================================
  // AI GENERATION ROUTES
  // ============================================================================

  /**
   * POST /api/images/generate-ai
   * Generate and store an AI image
   */
  app.post(
    "/api/images/generate-ai",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req: Request, res: Response) => {
      // Check if AI is disabled
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }

      try {
        const { prompt, filename, size, quality, style, provider, altText, contentId } = req.body;

        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        const options: AIGenerationOptions & { altText?: string; contentId?: number } = {
          size: size || "1792x1024",
          quality: quality || "hd",
          style: style || "natural",
          provider: provider || "auto",
          altText,
          contentId: contentId ? parseInt(contentId) : undefined,
        };

        const result = await externalImageService.generateAndStoreAIImage(
          prompt,
          filename || `ai-${Date.now()}.jpg`,
          options
        );

        if (!result.success) {
          return res.status(500).json({ error: (result as UploadError).error });
        }

        res.json({
          success: true,
          image: result.image,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI generation failed";
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * POST /api/images/generate-ai-batch
   * Generate multiple AI images from prompts
   */
  app.post(
    "/api/images/generate-ai-batch",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req: Request, res: Response) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }

      try {
        const { prompts, options, contentId } = req.body;

        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
          return res.status(400).json({ error: "Prompts array is required" });
        }

        if (prompts.length > 5) {
          return res.status(400).json({ error: "Maximum 5 prompts per batch" });
        }

        const results: {
          successful: StoredImage[];
          failed: Array<{ prompt: string; error: string }>;
        } = {
          successful: [],
          failed: [],
        };

        for (const item of prompts) {
          const prompt = typeof item === "string" ? item : item.prompt;
          const filename = typeof item === "string" ? `ai-${Date.now()}.jpg` : item.filename;

          const result = await externalImageService.generateAndStoreAIImage(prompt, filename, {
            ...options,
            contentId: contentId ? parseInt(contentId) : undefined,
          });

          if (result.success) {
            results.successful.push(result.image);
          } else {
            results.failed.push({ prompt, error: (result as UploadError).error });
          }
        }

        res.json({
          success: true,
          total: prompts.length,
          successful: results.successful.length,
          failed: results.failed.length,
          images: results.successful,
          errors: results.failed,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI batch generation failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // ============================================================================
  // FREEPIK ROUTES
  // ============================================================================

  /**
   * POST /api/images/search-freepik
   * Search Freepik for images
   */
  app.post(
    "/api/images/search-freepik",
    requirePermission("canAccessMediaLibrary"),
    async (req: Request, res: Response) => {
      try {
        const { query, limit, page, orientation, premium } = req.body;

        if (!query) {
          return res.status(400).json({ error: "Query is required" });
        }

        const options: FreepikSearchOptions = {
          limit: limit || 20,
          page: page || 1,
          orientation,
          premium,
        };

        const result = await externalImageService.searchFreepik(query, options);

        if (!result.success) {
          return res
            .status(500)
            .json({ error: (result as { success: false; error: string }).error });
        }

        res.json({
          success: true,
          results: result.results,
          count: result.results.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Freepik search failed";
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * POST /api/images/download-freepik
   * Download and store image from Freepik
   */
  app.post(
    "/api/images/download-freepik",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const { url, filename, altText, contentId } = req.body;

        if (!url) {
          return res.status(400).json({ error: "URL is required" });
        }

        const result = await externalImageService.downloadFromFreepik(
          url,
          filename || `freepik-${Date.now()}.jpg`,
          {
            altText,
            contentId: contentId ? parseInt(contentId) : undefined,
          }
        );

        if (!result.success) {
          return res.status(500).json({ error: (result as UploadError).error });
        }

        res.json({
          success: true,
          image: result.image,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Freepik download failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // ============================================================================
  // DELETE ROUTES
  // ============================================================================

  /**
   * DELETE /api/images
   * Delete an image by URL
   */
  app.delete(
    "/api/images",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const { url } = req.body;

        if (!url) {
          return res.status(400).json({ error: "URL is required" });
        }

        const result = await deleteImage(url);

        if (!result.success) {
          return res.status(500).json({ error: result.error || "Delete failed" });
        }

        res.json({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Delete failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // ============================================================================
  // SEO ROUTES
  // ============================================================================

  /**
   * POST /api/images/seo/generate-metadata
   * Generate complete SEO metadata for an image
   */
  app.post(
    "/api/images/seo/generate-metadata",
    requirePermission("canCreate"),
    async (req: Request, res: Response) => {
      try {
        const { context, imageUrl, width, height } = req.body;

        if (!context) {
          return res.status(400).json({ error: "SEO context is required" });
        }

        // Validate required context fields
        if (!context.contentType || !context.entityName || !context.category) {
          return res.status(400).json({
            error: "SEO context must include contentType, entityName, and category",
          });
        }

        const seoService = getImageSEOService();
        const metadata = seoService.generateSEOMetadata(
          context as ImageSEOContext,
          imageUrl || "",
          width && height ? { width: parseInt(width), height: parseInt(height) } : undefined
        );

        res.json({
          success: true,
          metadata,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "SEO generation failed";
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * POST /api/images/seo/generate-prompt
   * Generate SEO-optimized AI image prompt
   */
  app.post(
    "/api/images/seo/generate-prompt",
    requirePermission("canCreate"),
    async (req: Request, res: Response) => {
      try {
        const { context } = req.body;

        if (!context) {
          return res.status(400).json({ error: "SEO context is required" });
        }

        if (!context.contentType || !context.entityName || !context.category) {
          return res.status(400).json({
            error: "SEO context must include contentType, entityName, and category",
          });
        }

        const prompt = generateAIImagePrompt(context as ImageSEOContext);

        res.json({
          success: true,
          prompt,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Prompt generation failed";
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * POST /api/images/seo/generate-filename
   * Generate SEO-optimized filename
   */
  app.post(
    "/api/images/seo/generate-filename",
    requirePermission("canCreate"),
    async (req: Request, res: Response) => {
      try {
        const { context } = req.body;

        if (!context) {
          return res.status(400).json({ error: "SEO context is required" });
        }

        if (!context.contentType || !context.entityName || !context.category) {
          return res.status(400).json({
            error: "SEO context must include contentType, entityName, and category",
          });
        }

        const filename = generateImageFilename(context as ImageSEOContext);

        res.json({
          success: true,
          filename,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Filename generation failed";
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * POST /api/images/seo/generate-and-upload
   * Generate SEO-optimized AI image with full metadata
   */
  app.post(
    "/api/images/seo/generate-and-upload",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req: Request, res: Response) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }

      try {
        const { context, options = {} } = req.body;

        if (!context) {
          return res.status(400).json({ error: "SEO context is required" });
        }

        if (!context.contentType || !context.entityName || !context.category) {
          return res.status(400).json({
            error:
              "SEO context must include contentType, entityName, entitySlug, category, location, and purpose",
          });
        }

        // Generate SEO-optimized prompt
        const seoService = getImageSEOService();
        const seoPrompt = seoService.generateAIPrompt(context as ImageSEOContext);
        const seoFilename = seoService.generateFilename(context as ImageSEOContext);

        // Generate the image using external service
        const result = await externalImageService.generateAndStoreAIImage(seoPrompt, seoFilename, {
          ...options,
          size: options.size || "1792x1024",
          quality: options.quality || "hd",
          style: options.style || "natural",
        });

        if (!result.success) {
          return res.status(500).json({ error: (result as UploadError).error });
        }

        // Generate complete SEO metadata
        const seoMetadata = seoService.generateSEOMetadata(
          context as ImageSEOContext,
          result.image.url,
          { width: result.image.width, height: result.image.height }
        );

        res.json({
          success: true,
          image: {
            ...result.image,
            seo: seoMetadata,
          },
          seoPromptUsed: seoPrompt,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "SEO image generation failed";
        res.status(500).json({ error: message });
      }
    }
  );

  /**
   * GET /api/images/seo/areas
   * Get list of Dubai areas with SEO data
   */
  app.get("/api/images/seo/areas", async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        areas: DUBAI_AREAS,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch areas" });
    }
  });

  /**
   * GET /api/images/seo/categories
   * Get available image categories by content type
   */
  app.get("/api/images/seo/categories/:contentType?", async (req: Request, res: Response) => {
    try {
      const contentTypes: ContentType[] = [
        "hotel",
        "attraction",
        "restaurant",
        "beach",
        "district",
        "event",
        "real-estate",
        "article",
        "itinerary",
        "transport",
      ];
      const categories: ImageCategory[] = [
        "exterior",
        "interior",
        "lobby",
        "room",
        "suite",
        "pool",
        "spa",
        "dining",
        "view",
        "beach",
        "activity",
        "architecture",
        "entrance",
        "exhibit",
        "dish",
        "chef",
        "bar",
        "balcony",
        "bedroom",
        "bathroom",
        "kitchen",
        "living-room",
        "amenities",
        "panorama",
        "sunset",
        "night",
        "aerial",
        "crowd",
        "performance",
        "fireworks",
        "hero",
        "featured",
        "gallery",
        "content",
      ];
      const purposes: ImagePurpose[] = [
        "hero",
        "featured",
        "content",
        "gallery",
        "thumbnail",
        "og-image",
      ];

      res.json({
        success: true,
        contentTypes,
        categories,
        purposes,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  /**
   * POST /api/images/seo/generate-html
   * Generate complete HTML with picture element, caption, and Schema.org markup
   */
  app.post(
    "/api/images/seo/generate-html",
    requirePermission("canCreate"),
    async (req: Request, res: Response) => {
      try {
        const { context, imageUrl, width, height, format = "figure" } = req.body;

        if (!context || !imageUrl) {
          return res.status(400).json({ error: "SEO context and imageUrl are required" });
        }

        const seoService = getImageSEOService();
        const dimensions =
          width && height ? { width: parseInt(width), height: parseInt(height) } : undefined;

        let html: string;
        if (format === "picture") {
          html = seoService.generatePictureHTML(context as ImageSEOContext, imageUrl, dimensions);
        } else {
          html = seoService.generateFigureHTML(context as ImageSEOContext, imageUrl, dimensions);
        }

        const metadata = seoService.generateSEOMetadata(
          context as ImageSEOContext,
          imageUrl,
          dimensions
        );

        res.json({
          success: true,
          html,
          metadata,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "HTML generation failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // ============================================================================
  // IMAGE SEO ENFORCEMENT (For Image Editor Component)
  // ============================================================================

  /**
   * POST /api/image-seo/enforce
   * Generates missing SEO tags while preserving existing ones
   * Used by the ImageSEOEditor component
   */
  app.post(
    "/api/image-seo/enforce",
    requirePermission("canCreate"),
    async (req: Request, res: Response) => {
      try {
        const { url, contentType, context: contentTitle, existingTags } = req.body;

        if (!url) {
          return res.status(400).json({ error: "Image URL is required" });
        }

        // Build SEO context from the request
        // Map content type to a valid ImageCategory
        const categoryMap: Record<string, ImageCategory> = {
          hotel: "exterior",
          dining: "dining",
          attraction: "exterior",
          event: "crowd",
          article: "hero",
          district: "panorama",
          itinerary: "activity",
          transport: "exterior",
        };

        // Create slug from entity name
        const entitySlug = (contentTitle || "dubai-image")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const seoContext: ImageSEOContext = {
          contentType: (contentType || "article") as ContentType,
          // FAIL-FAST: Do not use implicit Dubai fallback for entity name or location
          entityName: contentTitle || entitySlug || "Image",
          entitySlug,
          category: categoryMap[contentType] || "hero",
          purpose: "content" as ImagePurpose,
          location: {
            area: existingTags?.contentLocation || undefined,
          },
          language: "en",
        };

        const seoService = getImageSEOService();
        const generatedMetadata = seoService.generateSEOMetadata(seoContext, url);

        // Merge existing tags with generated ones (existing takes priority)
        const tags = {
          alt: existingTags?.alt || generatedMetadata.alt.en || "",
          altHe: existingTags?.altHe || generatedMetadata.alt.he || "",
          altAr: existingTags?.altAr || generatedMetadata.alt.ar || "",
          title: existingTags?.title || generatedMetadata.title.en || "",
          caption: existingTags?.caption || generatedMetadata.caption.en || "",
          keywords: existingTags?.keywords || [],
          contentLocation: existingTags?.contentLocation || "Dubai, UAE",
        };

        // Auto-generate keywords if empty
        if (!tags.keywords || tags.keywords.length === 0) {
          const keywordsFromTitle = (contentTitle || "")
            .toLowerCase()
            .split(/[\s,]+/)
            .filter((word: string) => word.length > 3)
            .slice(0, 5);
          const keywordsFromType = [contentType, "dubai", "travel"].filter(Boolean);
          tags.keywords = [...new Set([...keywordsFromTitle, ...keywordsFromType])].slice(0, 10);
        }

        res.json({
          success: true,
          tags,
          generated: {
            alt: !existingTags?.alt,
            altHe: !existingTags?.altHe,
            altAr: !existingTags?.altAr,
            title: !existingTags?.title,
            caption: !existingTags?.caption,
            keywords: !existingTags?.keywords || existingTags.keywords.length === 0,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "SEO enforcement failed";
        res.status(500).json({ error: message });
      }
    }
  );

  // ============================================================================
  // STATUS ROUTES
  // ============================================================================

  /**
   * GET /api/images/status
   * Get storage status and configuration
   */
  app.get(
    "/api/images/status",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const status = imageService.getStorageStatus();
        const supportedTypes = imageService.getSupportedMimeTypes();

        res.json({
          success: true,
          storage: status,
          supportedMimeTypes: supportedTypes,
          maxFileSize: "10MB",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get status" });
      }
    }
  );
}
