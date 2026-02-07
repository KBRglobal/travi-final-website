/**
 * Media Library Configuration
 *
 * Feature flag and configuration for the media library system.
 * Disabled by default - set ENABLE_MEDIA_LIBRARY=true to enable.
 */

export interface MediaLibraryConfig {
  /** Whether the media library feature is enabled */
  enabled: boolean;
  /** Directories to scan for assets */
  scanDirectories: string[];
  /** Maximum files to process per scan batch */
  batchSize: number;
  /** Number of days before an orphan can be deleted */
  orphanGracePeriodDays: number;
  /** Supported image MIME types */
  supportedImageTypes: string[];
  /** Supported document MIME types */
  supportedDocumentTypes: string[];
}

/**
 * Check if the media library feature is enabled
 */
export function isMediaLibraryEnabled(): boolean {
  return process.env.ENABLE_MEDIA_LIBRARY === "true";
}

/**
 * Get media library configuration
 */
export function getMediaLibraryConfig(): MediaLibraryConfig {
  return {
    enabled: isMediaLibraryEnabled(),
    scanDirectories: ["uploads", "attached_assets"],
    batchSize: Number.parseInt(process.env.MEDIA_LIBRARY_BATCH_SIZE || "100", 10),
    orphanGracePeriodDays: Number.parseInt(process.env.MEDIA_LIBRARY_ORPHAN_GRACE_DAYS || "7", 10),
    supportedImageTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    supportedDocumentTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  };
}

/**
 * Get all supported MIME types
 */
export function getSupportedMimeTypes(): string[] {
  const config = getMediaLibraryConfig();
  return [...config.supportedImageTypes, ...config.supportedDocumentTypes];
}
