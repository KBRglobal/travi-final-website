/**
 * Image Intelligence API Routes
 * Endpoints for automatic image processing with AI-powered analysis
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import {
  imageIntelligence,
  type ImageContext,
  type ProcessedImageResult,
} from "./image-intelligence";
import { getStorageManager } from "../services/storage-adapter";
import { SUPPORTED_LOCALES, type Locale } from "@shared/schema";
import { requireAuth } from "../security";
import { log } from "../lib/logger";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ============================================================================
// Types
// ============================================================================

interface ProcessImageRequest {
  usage: ImageContext["usage"];
  contentType?: string;
  destination?: string;
  entityName?: string;
  additionalContext?: string;
  locales?: string; // Comma-separated locale codes
  generateThumbnail?: string; // "true" or "false"
  generateOgImage?: string;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/media-intelligence/process
 * Process a single image with full AI pipeline
 */
router.post(
  "/process",
  requireAuth,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const body = req.body as ProcessImageRequest;

      // Parse context
      const context: ImageContext = {
        usage: (body.usage as ImageContext["usage"]) || "gallery",
        contentType: body.contentType,
        destination: body.destination,
        entityName: body.entityName,
        additionalContext: body.additionalContext,
      };

      // Parse locales
      let locales: Locale[] = ["en", "ar", "hi", "zh", "fr"]; // Default top 5
      if (body.locales) {
        const requestedLocales = body.locales.split(",").map(l => l.trim());
        const validLocales = SUPPORTED_LOCALES.map(l => l.code);
        locales = requestedLocales.filter(l => validLocales.includes(l as Locale)) as Locale[];
      }

      // Process image
      const result = await imageIntelligence.processImageIntelligent(req.file.buffer, context, {
        locales,
        generateThumbnail: body.generateThumbnail !== "false",
        generateOgImage: body.generateOgImage === "true",
      });

      // Upload to storage
      const storage = getStorageManager();
      const baseKey = `public/images/${context.contentType || "general"}`;

      const uploads: Record<string, string> = {};

      // Upload main image
      const mainUpload = await storage.upload(`${baseKey}/${result.filename}`, result.main.buffer);
      uploads.main = mainUpload.url;

      // Upload thumbnail
      if (result.thumbnail) {
        const thumbUpload = await storage.upload(
          `${baseKey}/thumbnails/${result.thumbnail.filename}`,
          result.thumbnail.buffer
        );
        uploads.thumbnail = thumbUpload.url;
      }

      // Upload OG image
      if (result.ogImage) {
        const ogUpload = await storage.upload(
          `${baseKey}/og/${result.ogImage.filename}`,
          result.ogImage.buffer
        );
        uploads.ogImage = ogUpload.url;
      }

      res.json({
        success: true,
        urls: uploads,
        filename: result.filename,
        analysis: result.analysis,
        altTexts: result.altTexts,
        metadata: result.metadata,
      });
    } catch (error) {
      log.error("[MediaIntelligence] Process error:", error);
      res.status(500).json({
        error: "Image processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/media-intelligence/analyze
 * Analyze image without processing (returns analysis only)
 */
router.post(
  "/analyze",
  requireAuth,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const body = req.body as ProcessImageRequest;

      const context: ImageContext = {
        usage: (body.usage as ImageContext["usage"]) || "gallery",
        contentType: body.contentType,
        destination: body.destination,
        entityName: body.entityName,
        additionalContext: body.additionalContext,
      };

      const analysis = await imageIntelligence.analyzeImage(req.file.buffer, context);

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      log.error("[MediaIntelligence] Analyze error:", error);
      res.status(500).json({
        error: "Image analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/media-intelligence/generate-alt
 * Generate alt text for existing image URL
 */
router.post("/generate-alt", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      imageUrl,
      context,
      locales = ["en", "ar", "hi", "zh", "fr"],
    } = req.body as {
      imageUrl: string;
      context: ImageContext;
      locales?: Locale[];
    };

    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(400).json({ error: "Failed to fetch image" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Analyze image
    const analysis = await imageIntelligence.analyzeImage(imageBuffer, context);

    // Generate alt texts
    const altTexts = await imageIntelligence.generateMultiLanguageAltText(
      analysis,
      context,
      locales
    );

    res.json({
      success: true,
      analysis,
      altTexts,
    });
  } catch (error) {
    log.error("[MediaIntelligence] Generate alt error:", error);
    res.status(500).json({
      error: "Alt text generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/media-intelligence/compress
 * Compress image to target size for specific usage
 */
router.post(
  "/compress",
  requireAuth,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { usage = "gallery" } = req.body as { usage?: ImageContext["usage"] };

      const { buffer, quality, iterations } = await imageIntelligence.compressToTarget(
        req.file.buffer,
        usage
      );

      // Return compressed image
      res.set({
        "Content-Type": "image/webp",
        "Content-Disposition": `attachment; filename="compressed.webp"`,
        "X-Original-Size": req.file.size.toString(),
        "X-Compressed-Size": buffer.length.toString(),
        "X-Compression-Ratio": Math.round((1 - buffer.length / req.file.size) * 100).toString(),
        "X-Quality": quality.toString(),
        "X-Iterations": iterations.toString(),
      });

      res.send(buffer);
    } catch (error) {
      log.error("[MediaIntelligence] Compress error:", error);
      res.status(500).json({
        error: "Image compression failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/media-intelligence/batch
 * Process multiple images in batch
 */
router.post(
  "/batch",
  requireAuth,
  upload.array("images", 10), // Max 10 images
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }

      const { contexts, locales = ["en", "ar", "hi", "zh", "fr"] } = req.body as {
        contexts: ImageContext[];
        locales?: Locale[];
      };

      // Parse contexts (may come as JSON string)
      let parsedContexts: ImageContext[] = contexts;
      if (typeof contexts === "string") {
        parsedContexts = JSON.parse(contexts);
      }

      // Build image array
      const images = files.map((file, index) => ({
        buffer: file.buffer,
        context: parsedContexts[index] || {
          usage: "gallery" as const,
        },
      }));

      // Process batch
      const results = await imageIntelligence.processImagesBatch(images, {
        locales,
        concurrency: 3,
      });

      // Upload successful results
      const storage = getStorageManager();
      const uploadResults: Array<{
        success: boolean;
        urls?: Record<string, string>;
        error?: string;
        metadata?: ProcessedImageResult["metadata"];
        altTexts?: ProcessedImageResult["altTexts"];
      }> = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if ("error" in result) {
          uploadResults.push({ success: false, error: result.error });
          continue;
        }

        try {
          const context = images[i].context;
          const baseKey = `public/images/${context.contentType || "general"}`;
          const uploads: Record<string, string> = {};

          // Upload main
          const mainUpload = await storage.upload(
            `${baseKey}/${result.filename}`,
            result.main.buffer
          );
          uploads.main = mainUpload.url;

          // Upload thumbnail
          if (result.thumbnail) {
            const thumbUpload = await storage.upload(
              `${baseKey}/thumbnails/${result.thumbnail.filename}`,
              result.thumbnail.buffer
            );
            uploads.thumbnail = thumbUpload.url;
          }

          uploadResults.push({
            success: true,
            urls: uploads,
            metadata: result.metadata,
            altTexts: result.altTexts,
          });
        } catch (uploadError) {
          uploadResults.push({
            success: false,
            error: uploadError instanceof Error ? uploadError.message : "Upload failed",
          });
        }
      }

      res.json({
        success: true,
        processed: results.length,
        results: uploadResults,
      });
    } catch (error) {
      log.error("[MediaIntelligence] Batch error:", error);
      res.status(500).json({
        error: "Batch processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/media-intelligence/supported-locales
 * Get list of supported locales for alt text generation
 */
router.get("/supported-locales", (_req: Request, res: Response) => {
  res.json({
    locales: SUPPORTED_LOCALES.map(l => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      tier: l.tier,
    })),
    total: SUPPORTED_LOCALES.length,
  });
});

/**
 * GET /api/media-intelligence/size-targets
 * Get size targets for different usage types
 */
router.get("/size-targets", (_req: Request, res: Response) => {
  const SIZE_TARGETS = {
    hero: { maxWidth: 1920, maxHeight: 1080, maxSize: 300 * 1024, quality: 85 },
    thumbnail: { maxWidth: 400, maxHeight: 300, maxSize: 50 * 1024, quality: 80 },
    gallery: { maxWidth: 1200, maxHeight: 800, maxSize: 200 * 1024, quality: 85 },
    inline: { maxWidth: 800, maxHeight: 600, maxSize: 150 * 1024, quality: 80 },
    icon: { maxWidth: 128, maxHeight: 128, maxSize: 20 * 1024, quality: 75 },
    "og-image": { maxWidth: 1200, maxHeight: 630, maxSize: 200 * 1024, quality: 90 },
  };

  res.json({
    targets: Object.entries(SIZE_TARGETS).map(([usage, config]) => ({
      usage,
      ...config,
      maxSizeKB: Math.round(config.maxSize / 1024),
    })),
  });
});

export function registerMediaIntelligenceRoutes(app: any): void {
  app.use("/api/media-intelligence", router);
}

export { router as mediaIntelligenceRouter };
