/**
 * Image Service - Unified image handling for the entire system
 * Consolidates all image upload, processing, and storage operations
 */

import { getStorageManager, StorageManager } from "./storage-adapter";
import {
  processImage,
  processImageWithThumbnail,
  validateAndProcess,
  generateUniqueFilename,
  getImageMetadata,
  ProcessedImage,
  ProcessingOptions,
  SUPPORTED_MIME_TYPES,
  convertToWebP,
} from "./image-processing";
import {
  getImageSEOService,
  ImageSEOContext,
  SEOImageMetadata,
  generateImageFilename,
} from "./image-seo-service";
import { validateUrlForSSRF } from "../security";

export type ImageSource = "upload" | "ai" | "freepik" | "external";

export interface ImageUploadOptions {
  source: ImageSource;
  altText?: string;
  contentId?: number;
  quality?: number;
  generateThumbnail?: boolean;
  prefix?: string;
  metadata?: Record<string, any>;
  // SEO options
  seoContext?: ImageSEOContext;
}

export interface StoredImage {
  id?: number;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  source: ImageSource;
  storage: string;
  altText?: string;
  contentId?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  // SEO metadata
  seo?: SEOImageMetadata;
}

export interface UploadResult {
  success: true;
  image: StoredImage;
}

export interface UploadError {
  success: false;
  error: string;
  code?: string;
}

export type ImageUploadResponse = UploadResult | UploadError;

export interface BatchUploadResult {
  successful: StoredImage[];
  failed: Array<{ filename: string; error: string }>;
  total: number;
}

/**
 * Main Image Service Class
 */
export class ImageService {
  private storageManager: StorageManager;

  constructor() {
    this.storageManager = getStorageManager();
  }

  /**
   * Upload an image from buffer (main entry point)
   */
  async uploadImage(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    options: ImageUploadOptions
  ): Promise<ImageUploadResponse> {
    const {
      source,
      altText,
      contentId,
      quality = 85,
      generateThumbnail = false,
      prefix,
      metadata,
      seoContext,
    } = options;

    // Validate and process the image
    const validation = await validateAndProcess(buffer, mimeType, originalFilename, {
      format: "webp",
      quality,
    });

    if (!validation.success) {
      return { success: false, error: (validation as { success: false; error: string }).error };
    }

    const processed = validation.image;

    // Generate filename: use SEO-optimized name if context provided
    let finalFilename: string;
    if (seoContext) {
      finalFilename = generateImageFilename(seoContext);
    } else {
      const uniqueFilename = generateUniqueFilename(originalFilename, prefix);
      finalFilename = `${uniqueFilename}.webp`;
    }

    // Determine storage path based on source
    const storagePath = this.getStoragePath(source, finalFilename);

    try {
      // Upload main image
      const { url, storage } = await this.storageManager.upload(storagePath, processed.buffer);

      // Upload thumbnail if requested
      let thumbnailUrl: string | undefined;
      if (generateThumbnail) {
        const { thumbnail } = await processImageWithThumbnail(buffer, originalFilename);
        const thumbPath = this.getStoragePath(source, `thumb-${finalFilename}`);
        const thumbResult = await this.storageManager.upload(thumbPath, thumbnail.buffer);
        thumbnailUrl = thumbResult.url;
      }

      // Generate SEO metadata if context provided
      let seoMetadata: SEOImageMetadata | undefined;
      if (seoContext) {
        const seoService = getImageSEOService();
        seoMetadata = seoService.generateSEOMetadata(seoContext, url, {
          width: processed.metadata.width,
          height: processed.metadata.height,
        });
      }

      const storedImage: StoredImage = {
        filename: finalFilename,
        originalFilename,
        url,
        thumbnailUrl,
        width: processed.metadata.width,
        height: processed.metadata.height,
        size: processed.metadata.size,
        mimeType: "image/webp",
        source,
        storage,
        altText: seoMetadata?.alt.en || altText,
        contentId,
        metadata,
        createdAt: new Date(),
        seo: seoMetadata,
      };

      return { success: true, image: storedImage };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error";

      return { success: false, error: message, code: "UPLOAD_FAILED" };
    }
  }

  /**
   * Upload image from URL (for AI-generated or external images)
   */
  async uploadFromUrl(
    url: string,
    filename: string,
    options: ImageUploadOptions
  ): Promise<ImageUploadResponse> {
    // SSRF Protection: Validate URL for external sources
    // AI/Freepik sources use trusted CDNs, but we validate anyway for defense in depth
    const ssrfCheck = validateUrlForSSRF(url);
    if (!ssrfCheck.valid) {
      return {
        success: false,
        error: `Invalid image URL: ${ssrfCheck.error}`,
        code: "SSRF_BLOCKED",
      };
    }

    try {
      const response = await fetch(ssrfCheck.sanitizedUrl!);
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch image: ${response.status} ${response.statusText}`,
          code: "FETCH_FAILED",
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine MIME type from response or default to jpeg
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const mimeType = SUPPORTED_MIME_TYPES.includes(contentType as any)
        ? contentType
        : "image/jpeg";

      return this.uploadImage(buffer, filename, mimeType, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown fetch error";

      return { success: false, error: message, code: "FETCH_ERROR" };
    }
  }

  /**
   * Upload multiple images (batch)
   */
  async uploadBatch(
    files: Array<{ buffer: Buffer; filename: string; mimeType: string }>,
    options: Omit<ImageUploadOptions, "prefix">
  ): Promise<BatchUploadResult> {
    const results: BatchUploadResult = {
      successful: [],
      failed: [],
      total: files.length,
    };

    for (const file of files) {
      const result = await this.uploadImage(file.buffer, file.filename, file.mimeType, {
        ...options,
        prefix: "batch",
      });

      if (result.success) {
        results.successful.push(result.image);
      } else {
        results.failed.push({ filename: file.filename, error: (result as UploadError).error });
      }
    }

    return results;
  }

  /**
   * Delete an image
   */
  async deleteImage(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract storage path from URL
      const storagePath = this.urlToStoragePath(url);
      if (storagePath) {
        await this.storageManager.delete(storagePath);
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown delete error";

      return { success: false, error: message };
    }
  }

  /**
   * Get storage status
   */
  getStorageStatus(): ReturnType<StorageManager["getStatus"]> {
    return this.storageManager.getStatus();
  }

  /**
   * Get supported MIME types
   */
  getSupportedMimeTypes(): readonly string[] {
    return SUPPORTED_MIME_TYPES;
  }

  /**
   * Helper: Get storage path based on source
   */
  private getStoragePath(source: ImageSource, filename: string): string {
    switch (source) {
      case "ai":
        return `public/ai-generated/${filename}`;
      case "freepik":
        return `public/freepik/${filename}`;
      case "external":
        return `public/external/${filename}`;
      case "upload":
      default:
        return `public/${filename}`;
    }
  }

  /**
   * Helper: Convert URL back to storage path
   */
  private urlToStoragePath(url: string): string | null {
    if (url.startsWith("/uploads/ai-generated/")) {
      return `public/ai-generated/${url.replace("/uploads/ai-generated/", "")}`;
    }
    if (url.startsWith("/uploads/freepik/")) {
      return `public/freepik/${url.replace("/uploads/freepik/", "")}`;
    }
    if (url.startsWith("/uploads/external/")) {
      return `public/external/${url.replace("/uploads/external/", "")}`;
    }
    if (url.startsWith("/uploads/")) {
      return `public/${url.replace("/uploads/", "")}`;
    }
    if (url.startsWith("/api/ai-images/")) {
      return `public/ai-generated/${url.replace("/api/ai-images/", "")}`;
    }
    if (url.startsWith("/object-storage/")) {
      return url.replace("/object-storage/", "");
    }
    return null;
  }
}

// Singleton instance
let imageServiceInstance: ImageService | null = null;

export function getImageService(): ImageService {
  if (!imageServiceInstance) {
    imageServiceInstance = new ImageService();
  }
  return imageServiceInstance;
}

// Reset service (useful for testing)
export function resetImageService(): void {
  imageServiceInstance = null;
}

// Export convenience functions
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: ImageUploadOptions
): Promise<ImageUploadResponse> {
  return getImageService().uploadImage(buffer, filename, mimeType, options);
}

export async function uploadImageFromUrl(
  url: string,
  filename: string,
  options: ImageUploadOptions
): Promise<ImageUploadResponse> {
  return getImageService().uploadFromUrl(url, filename, options);
}

export async function deleteImage(url: string): Promise<{ success: boolean; error?: string }> {
  return getImageService().deleteImage(url);
}
