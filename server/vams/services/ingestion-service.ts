/**
 * VAMS Ingestion Service
 * Import images from providers, process variants, and store
 */

import { db } from "../../db";
import { vamsAssets, vamsAssetVariants, vamsContentAssets } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import { VamsIngestionOptions, VamsIngestionResult } from "../types";
import { log } from "../../lib/logger";
import { v4 as uuidv4 } from "uuid";

// Import existing services
import { getStorageManager } from "../../services/storage-adapter";

export class VamsIngestionService {
  private static instance: VamsIngestionService;

  static getInstance(): VamsIngestionService {
    if (!VamsIngestionService.instance) {
      VamsIngestionService.instance = new VamsIngestionService();
    }
    return VamsIngestionService.instance;
  }

  /**
   * Ingest an image from a provider URL
   */
  async ingest(options: VamsIngestionOptions): Promise<VamsIngestionResult> {
    const startTime = Date.now();
    const assetId = uuidv4();

    try {
      log.info(`[VamsIngestion] Starting ingestion for ${options.url}`);

      // 1. Download the image
      const imageBuffer = await this.downloadImage(options.url);

      if (!imageBuffer) {
        return {
          success: false,
          error: "Failed to download image",
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 2. Upload to storage
      const storedUrl = await this.uploadToStorage(assetId, imageBuffer, "original");

      if (!storedUrl) {
        return {
          success: false,
          error: "Failed to upload to storage",
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 3. Create asset record
      await db.insert(vamsAssets).values({
        id: assetId,
        provider: options.provider || "url",
        providerId: options.providerId,
        originalUrl: options.url,
        storedUrl,
        title: options.title,
        description: options.description,
        altText: options.title,
        fileSize: imageBuffer.length,
        tags: options.tags || [],
        status: "ready",
      });

      log.info(`[VamsIngestion] Completed ingestion for asset ${assetId}`);

      return {
        success: true,
        assetId,
        storedUrl,
        altText: options.title,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      log.error("[VamsIngestion] Ingestion error:", error);

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
        error: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        log.error(`[VamsIngestion] Failed to download: ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      log.error("[VamsIngestion] Download error:", error);
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
      log.error("[VamsIngestion] Upload error:", error);
      return null;
    }
  }

  /**
   * Attach asset to content
   */
  async attachToContent(
    assetId: string,
    contentId: string,
    role: "hero" | "card" | "gallery" | "inline",
    options?: {
      position?: number;
      caption?: string;
      altTextOverride?: string;
    }
  ): Promise<boolean> {
    try {
      await db.insert(vamsContentAssets).values({
        contentId,
        assetId,
        role,
        position: options?.position,
        caption: options?.caption,
        altTextOverride: options?.altTextOverride,
      });

      return true;
    } catch (error) {
      log.error("[VamsIngestion] Attach error:", error);
      return false;
    }
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string) {
    try {
      const asset = await db.select().from(vamsAssets).where(eq(vamsAssets.id, assetId)).limit(1);

      if (asset.length === 0) return null;

      const variants = await db
        .select()
        .from(vamsAssetVariants)
        .where(eq(vamsAssetVariants.assetId, assetId));

      return {
        ...asset[0],
        variants,
      };
    } catch (error) {
      log.error("[VamsIngestion] Get asset error:", error);
      return null;
    }
  }

  /**
   * Get assets for content
   */
  async getAssetsForContent(contentId: string) {
    try {
      const contentAssets = await db
        .select()
        .from(vamsContentAssets)
        .where(eq(vamsContentAssets.contentId, contentId));

      const assets = await Promise.all(
        contentAssets.map(async ca => {
          const asset = await this.getAsset(ca.assetId);
          return {
            ...ca,
            asset,
          };
        })
      );

      return assets.filter(a => a.asset !== null);
    } catch (error) {
      log.error("[VamsIngestion] Get content assets error:", error);
      return [];
    }
  }
}

export const vamsIngestionService = VamsIngestionService.getInstance();
