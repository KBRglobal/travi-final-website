/**
 * Storage Adapter - Unified storage abstraction layer
 * Provides consistent interface for R2 (Cloudflare) and Local Filesystem
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

export interface StorageAdapter {
  upload(key: string, buffer: Buffer): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
  getName(): string;
}

/**
 * Cloudflare R2 Storage Adapter (S3-compatible)
 */
export class R2StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET_NAME || "travi";
    this.publicUrl = process.env.R2_PUBLIC_URL || "https://cdn.travi.world";

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2 credentials not configured: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required"
      );
    }

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        const testKey = `.storage-test-${Date.now()}`;
        try {
          await this.client.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: testKey,
              Body: Buffer.from("test"),
            })
          );
          await this.client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: testKey,
            })
          );
          this.initialized = true;
        } catch (error) {
          throw new Error(`R2 connection test failed: ${error}`);
        }
      })();
    }

    return this.initPromise;
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    await this.ensureInitialized();
    const ext = key.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      mp4: "video/mp4",
      webm: "video/webm",
    };
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentTypes[ext] || "application/octet-stream",
        CacheControl: "public, max-age=31536000",
      })
    );
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (error) {
      console.error(error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async download(key: string): Promise<Buffer | null> {
    try {
      await this.ensureInitialized();
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      if (!response.Body) return null;
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  getName(): string {
    return "r2";
  }
}

/**
 * Legacy alias for backward compatibility
 */
export const ObjectStorageAdapter = R2StorageAdapter;

/**
 * Sanitize path to prevent directory traversal attacks
 */
function sanitizePath(key: string): string {
  // Remove any path traversal attempts
  return key
    .replace(/\.\./g, "")
    .replace(/^\/+/, "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/\\/g, "/");
}

/**
 * Local Filesystem Storage Adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;
  private urlPrefix: string;

  constructor(baseDir?: string, urlPrefix?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), "uploads");
    this.urlPrefix = urlPrefix || "/uploads";

    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    const sanitizedKey = sanitizePath(key);
    const filePath = this.getFilePath(sanitizedKey);

    // Security: Verify path is within base directory
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.baseDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error("Invalid file path: path traversal detected");
    }

    const dir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, buffer);
    return this.getUrl(sanitizedKey);
  }

  async delete(key: string): Promise<void> {
    const sanitizedKey = sanitizePath(key);
    const filePath = this.getFilePath(sanitizedKey);

    // Security: Verify path is within base directory
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.baseDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return;
    }

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async exists(key: string): Promise<boolean> {
    const sanitizedKey = sanitizePath(key);
    const filePath = this.getFilePath(sanitizedKey);

    // Security: Verify path is within base directory
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.baseDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return false;
    }

    return fs.existsSync(filePath);
  }

  getUrl(key: string): string {
    // Normalize key to URL path
    const normalizedKey = key.replace(/^public\//, "");
    return `${this.urlPrefix}/${normalizedKey}`;
  }

  getName(): string {
    return "local-filesystem";
  }

  private getFilePath(key: string): string {
    // Remove "public/" prefix if present for local storage
    const normalizedKey = key.replace(/^public\//, "");
    return path.join(this.baseDir, normalizedKey);
  }
}

/**
 * Storage Manager - Handles adapter selection and fallback logic
 */
export class StorageManager {
  private primaryAdapter: StorageAdapter | null = null;
  private fallbackAdapter: StorageAdapter;
  private initError: Error | null = null;
  private objectStorageEnabled: boolean;
  private primaryInitialized: boolean = false;

  constructor() {
    // Always have local storage as fallback
    this.fallbackAdapter = new LocalStorageAdapter();

    // Check if R2 Object Storage should be enabled (lazy initialization)
    this.objectStorageEnabled = !!(
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_ENDPOINT
    );

    if (this.objectStorageEnabled) {
    } else {
    }
  }

  /**
   * Lazy initialize primary adapter on first use
   */
  private async ensurePrimaryAdapter(): Promise<StorageAdapter | null> {
    if (this.primaryInitialized) {
      return this.primaryAdapter;
    }

    if (!this.objectStorageEnabled) {
      this.primaryInitialized = true;
      return null;
    }

    try {
      this.primaryAdapter = new ObjectStorageAdapter();
      // Test that it actually works
      const testKey = `.storage-init-test-${Date.now()}`;
      await this.primaryAdapter.upload(testKey, Buffer.from("init-test"));
      await this.primaryAdapter.delete(testKey);
      this.primaryInitialized = true;

      return this.primaryAdapter;
    } catch (error) {
      this.initError = error as Error;
      this.primaryInitialized = true;

      return null;
    }
  }

  /**
   * Upload with automatic fallback
   */
  async upload(key: string, buffer: Buffer): Promise<{ url: string; storage: string }> {
    // Try primary adapter first
    const primary = await this.ensurePrimaryAdapter();
    if (primary) {
      try {
        const url = await primary.upload(key, buffer);

        return { url, storage: primary.getName() };
      } catch (error) {
        console.error(error);
      }
    }

    // Fallback to local storage
    const url = await this.fallbackAdapter.upload(key, buffer);

    return { url, storage: this.fallbackAdapter.getName() };
  }

  /**
   * Delete from storage (tries both adapters)
   */
  async delete(key: string): Promise<void> {
    const promises: Promise<void>[] = [];

    const primary = await this.ensurePrimaryAdapter();
    if (primary) {
      promises.push(primary.delete(key));
    }
    promises.push(this.fallbackAdapter.delete(key));

    await Promise.allSettled(promises);
  }

  /**
   * Check if file exists in any storage
   */
  async exists(key: string): Promise<boolean> {
    const primary = await this.ensurePrimaryAdapter();
    if (primary) {
      const existsInPrimary = await primary.exists(key);
      if (existsInPrimary) return true;
    }
    return this.fallbackAdapter.exists(key);
  }

  /**
   * Download file from storage
   */
  async download(key: string): Promise<Buffer | null> {
    // Security: Sanitize key to prevent path traversal
    const sanitizedKey = sanitizePath(key);

    const primary = await this.ensurePrimaryAdapter();
    if (primary && "download" in primary) {
      const data = await (primary as R2StorageAdapter).download(sanitizedKey);
      if (data) return data;
    }
    // Try local fallback with path traversal protection
    const uploadsDir = path.join(process.cwd(), "uploads");
    const localPath = path.join(uploadsDir, sanitizedKey.replace(/^public\//, ""));

    // Security: Verify resolved path is within uploads directory
    const resolvedPath = path.resolve(localPath);
    const resolvedBase = path.resolve(uploadsDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return null;
    }

    if (fs.existsSync(localPath)) {
      return fs.promises.readFile(localPath);
    }
    return null;
  }

  /**
   * Get the active storage name
   */
  getActiveStorage(): string {
    return this.primaryAdapter?.getName() || this.fallbackAdapter.getName();
  }

  /**
   * Get initialization status
   */
  getStatus(): { primary: string | null; fallback: string; error: string | null } {
    return {
      primary: this.primaryAdapter?.getName() || null,
      fallback: this.fallbackAdapter.getName(),
      error: this.initError?.message || null,
    };
  }

  /**
   * Health check - verify storage connectivity
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    primary: string | null;
    fallback: string;
    latency?: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      // Test upload and delete
      const testKey = `.health-check-${Date.now()}`;
      const testData = Buffer.from("health-check");

      await this.upload(testKey, testData);
      await this.delete(testKey);

      const primary = await this.ensurePrimaryAdapter();

      return {
        status: primary ? "healthy" : "degraded",
        primary: primary?.getName() || null,
        fallback: this.fallbackAdapter.getName(),
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        primary: this.primaryAdapter?.getName() || null,
        fallback: this.fallbackAdapter.getName(),
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : "Storage health check failed",
      };
    }
  }
}

// Singleton instance
let storageManagerInstance: StorageManager | null = null;

export function getStorageManager(): StorageManager {
  if (!storageManagerInstance) {
    storageManagerInstance = new StorageManager();
  }
  return storageManagerInstance;
}

// Reset storage manager (useful for testing)
export function resetStorageManager(): void {
  storageManagerInstance = null;
}

// ============================================================================
// CACHE HEADERS CONFIGURATION
// ============================================================================

/**
 * Cache configuration for different file types
 */
export const IMAGE_CACHE_CONFIG = {
  // Immutable assets (versioned/hashed filenames) - cache for 1 year
  immutable: {
    "Cache-Control": "public, max-age=31536000, immutable",
    Vary: "Accept-Encoding",
  },
  // Static images - cache for 30 days
  static: {
    "Cache-Control": "public, max-age=2592000",
    Vary: "Accept-Encoding, Accept",
  },
  // Dynamic/user content - cache for 24 hours
  dynamic: {
    "Cache-Control": "public, max-age=86400",
    Vary: "Accept-Encoding",
  },
  // AI-generated images - cache for 7 days (might be regenerated)
  aiGenerated: {
    "Cache-Control": "public, max-age=604800",
    Vary: "Accept-Encoding",
  },
  // Thumbnails - cache for 30 days
  thumbnails: {
    "Cache-Control": "public, max-age=2592000",
    Vary: "Accept-Encoding",
  },
  // Private/authenticated content - short cache
  private: {
    "Cache-Control": "private, max-age=3600",
    Vary: "Authorization, Accept-Encoding",
  },
};

/**
 * Get appropriate cache headers based on file path/type
 */
export function getCacheHeaders(filePath: string): Record<string, string> {
  // Check for WebP format - add Accept to Vary
  const isWebP = filePath.endsWith(".webp");

  // AI generated images
  if (filePath.includes("ai-generated") || filePath.includes("generated")) {
    return IMAGE_CACHE_CONFIG.aiGenerated;
  }

  // Thumbnails
  if (filePath.includes("thumb") || filePath.includes("-sm") || filePath.includes("-md")) {
    return IMAGE_CACHE_CONFIG.thumbnails;
  }

  // Check for hashed/versioned filenames (contain timestamp or hash)
  const hasVersioning = /[-_][\da-f]{8,}[-_]|[-_]\d{13}[-_]/i.test(filePath);
  if (hasVersioning) {
    return IMAGE_CACHE_CONFIG.immutable;
  }

  // Default to static cache for images
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(filePath)) {
    return IMAGE_CACHE_CONFIG.static;
  }

  // Default
  return IMAGE_CACHE_CONFIG.dynamic;
}

/**
 * Express middleware to add cache headers for image responses
 */
export function imageCacheMiddleware() {
  return (req: any, res: any, next: any) => {
    const originalSend = res.send;

    res.send = function (body: any) {
      // Only apply to image responses
      const contentType = res.get("Content-Type") || "";
      if (contentType.startsWith("image/")) {
        const headers = getCacheHeaders(req.path);
        Object.entries(headers).forEach(([key, value]) => {
          res.set(key, value);
        });

        // Add ETag based on content length if not present
        if (!res.get("ETag") && body?.length) {
          res.set("ETag", `"${body.length}-${Date.now()}"`);
        }
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Apply cache headers to a response
 */
export function applyCacheHeaders(res: any, filePath: string): void {
  const headers = getCacheHeaders(filePath);
  Object.entries(headers).forEach(([key, value]) => {
    res.set(key, value);
  });
}
