/**
 * VAMS Generation Service
 * AI image generation wrapper using existing DALL-E and Flux services
 */

import { db } from "../../db";
import { vamsAssets, vamsAssetVariants } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import { VamsGenerationOptions, VamsGenerationResult, VamsVariantType } from "../types";
import { log } from "../../lib/logger";
import { v4 as uuidv4 } from "uuid";

// Import existing AI services
import { generateImage as dalleGenerate } from "../../ai/image-generation";
import { getStorageManager } from "../../services/storage-adapter";

export class VamsGenerationService {
  private static instance: VamsGenerationService;

  static getInstance(): VamsGenerationService {
    if (!VamsGenerationService.instance) {
      VamsGenerationService.instance = new VamsGenerationService();
    }
    return VamsGenerationService.instance;
  }

  /**
   * Generate an image using AI
   */
  async generate(options: VamsGenerationOptions): Promise<VamsGenerationResult> {
    const startTime = Date.now();
    const assetId = uuidv4();
    const model = options.model || "dalle";

    try {
      log.info(
        `[VamsGeneration] Starting generation with ${model}: ${options.prompt.substring(0, 50)}...`
      );

      // 1. Generate the image
      const generationResult = await this.generateWithModel(model, options);

      if (!generationResult.success || !generationResult.url) {
        return {
          success: false,
          prompt: options.prompt,
          error: generationResult.error || "Generation failed",
          generationTimeMs: Date.now() - startTime,
        };
      }

      // 2. Download the generated image
      const imageBuffer = await this.downloadImage(generationResult.url);

      if (!imageBuffer) {
        return {
          success: false,
          prompt: options.prompt,
          error: "Failed to download generated image",
          generationTimeMs: Date.now() - startTime,
        };
      }

      // 3. Upload to permanent storage
      const storedUrl = await this.uploadToStorage(assetId, imageBuffer, "original");

      if (!storedUrl) {
        return {
          success: false,
          prompt: options.prompt,
          error: "Failed to upload to storage",
          generationTimeMs: Date.now() - startTime,
        };
      }

      // 4. Create asset record
      await db.insert(vamsAssets).values({
        id: assetId,
        provider: model === "dalle" ? "dalle" : "flux",
        originalUrl: generationResult.url,
        storedUrl,
        title: options.prompt.substring(0, 100),
        description: options.prompt,
        fileSize: imageBuffer.length,
        tags: this.extractTags(options.prompt),
        aiPrompt: options.prompt,
        aiModel: model,
        status: "processing",
      });

      // 5. Mark as ready
      await db
        .update(vamsAssets)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(vamsAssets.id, assetId));

      log.info(`[VamsGeneration] Completed generation for asset ${assetId}`);

      return {
        success: true,
        assetId,
        url: generationResult.url,
        storedUrl,
        prompt: options.prompt,
        model,
        generationTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      log.error("[VamsGeneration] Generation error:", error);

      // Mark as failed if asset was created
      try {
        await db
          .update(vamsAssets)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(vamsAssets.id, assetId));
      } catch {
        // Ignore cleanup errors
      }

      return {
        success: false,
        prompt: options.prompt,
        error: error instanceof Error ? error.message : "Unknown error",
        generationTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate image with specific model
   */
  private async generateWithModel(
    model: "dalle" | "flux",
    options: VamsGenerationOptions
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Map aspect ratio to size
      const size = this.mapAspectRatioToSize(options.aspectRatio || "1:1", model);

      if (model === "dalle") {
        const result = await dalleGenerate({
          prompt: options.prompt,
          size,
          style: options.style as "vivid" | "natural" | undefined,
          quality: options.quality,
        });

        return result;
      } else {
        // Flux generation - use the same interface
        const result = await dalleGenerate({
          prompt: options.prompt,
          size,
          model: "flux",
        });

        return result;
      }
    } catch (error) {
      log.error(`[VamsGeneration] ${model} error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }
  }

  /**
   * Map aspect ratio to model-specific size
   */
  private mapAspectRatioToSize(
    aspectRatio: VamsGenerationOptions["aspectRatio"],
    model: "dalle" | "flux"
  ): string {
    if (model === "dalle") {
      switch (aspectRatio) {
        case "1:1":
          return "1024x1024";
        case "16:9":
          return "1792x1024";
        case "9:16":
          return "1024x1792";
        case "4:3":
          return "1024x768";
        case "3:2":
          return "1024x683";
        default:
          return "1024x1024";
      }
    } else {
      // Flux uses aspect ratio strings
      return aspectRatio || "1:1";
    }
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        log.error(`[VamsGeneration] Failed to download: ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      log.error("[VamsGeneration] Download error:", error);
      return null;
    }
  }

  /**
   * Upload image to storage
   */
  private async uploadToStorage(
    assetId: string,
    buffer: Buffer,
    variant: string
  ): Promise<string | null> {
    try {
      const path = `vams/${assetId}/${variant}`;
      const result = await getStorageManager().upload(path, buffer);
      return result.url;
    } catch (error) {
      log.error("[VamsGeneration] Upload error:", error);
      return null;
    }
  }

  /**
   * Extract tags from prompt
   */
  private extractTags(prompt: string): string[] {
    // Simple tag extraction - split by common delimiters and filter
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Remove common words
    const stopWords = new Set([
      "the",
      "and",
      "with",
      "from",
      "that",
      "this",
      "have",
      "been",
      "would",
      "could",
      "should",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "under",
      "over",
    ]);

    return [...new Set(words.filter(w => !stopWords.has(w)))].slice(0, 10);
  }
}

export const vamsGenerationService = VamsGenerationService.getInstance();
