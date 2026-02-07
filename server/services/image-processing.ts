/**
 * Image Processing Service
 * Handles image validation, conversion, resizing, and optimization
 */

import sharp from "sharp";

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}

export interface ProcessedImage {
  buffer: Buffer;
  metadata: ImageMetadata;
  filename: string;
}

export interface ProcessingOptions {
  format?: "webp" | "jpeg" | "png" | "original";
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  thumbnail?: boolean;
  thumbnailSize?: number;
}

export const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const DEFAULT_QUALITY = 85;
export const DEFAULT_THUMBNAIL_SIZE = 200;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate image MIME type
 */
export function isValidMimeType(mimeType: string): mimeType is SupportedMimeType {
  return SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType);
}

/**
 * Validate image buffer size
 */
export function isValidSize(buffer: Buffer, maxSize: number = MAX_IMAGE_SIZE): boolean {
  return buffer.length <= maxSize;
}

/**
 * Get image metadata from buffer
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: buffer.length,
    hasAlpha: metadata.hasAlpha || false,
  };
}

/**
 * Convert image to WebP format with optimization
 */
export async function convertToWebP(
  buffer: Buffer,
  quality: number = DEFAULT_QUALITY
): Promise<Buffer> {
  return sharp(buffer).webp({ quality }).toBuffer();
}

/**
 * Resize image while maintaining aspect ratio
 */
export async function resizeImage(
  buffer: Buffer,
  maxWidth: number,
  maxHeight?: number
): Promise<Buffer> {
  const options: sharp.ResizeOptions = {
    width: maxWidth,
    height: maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  };

  return sharp(buffer).resize(options).toBuffer();
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(
  buffer: Buffer,
  size: number = DEFAULT_THUMBNAIL_SIZE
): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Process image with full pipeline
 */
export async function processImage(
  buffer: Buffer,
  originalFilename: string,
  options: ProcessingOptions = {}
): Promise<ProcessedImage> {
  const { format = "webp", quality = DEFAULT_QUALITY, maxWidth, maxHeight } = options;

  let processedBuffer: Buffer;
  let sharpInstance = sharp(buffer);

  // Resize if needed
  if (maxWidth || maxHeight) {
    sharpInstance = sharpInstance.resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert format
  if (format === "webp") {
    processedBuffer = await sharpInstance.webp({ quality }).toBuffer();
  } else if (format === "jpeg") {
    processedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
  } else if (format === "png") {
    processedBuffer = await sharpInstance.png().toBuffer();
  } else {
    processedBuffer = await sharpInstance.toBuffer();
  }

  // Get metadata of processed image
  const metadata = await getImageMetadata(processedBuffer);

  // Generate filename
  const extension = format === "original" ? getExtensionFromFilename(originalFilename) : format;
  const baseName = getBaseFilename(originalFilename);
  const filename = `${baseName}.${extension}`;

  return {
    buffer: processedBuffer,
    metadata,
    filename,
  };
}

/**
 * Process image and generate thumbnail
 */
export async function processImageWithThumbnail(
  buffer: Buffer,
  originalFilename: string,
  options: ProcessingOptions = {}
): Promise<{ main: ProcessedImage; thumbnail: ProcessedImage }> {
  const main = await processImage(buffer, originalFilename, options);

  const thumbnailSize = options.thumbnailSize || DEFAULT_THUMBNAIL_SIZE;
  const thumbnailBuffer = await generateThumbnail(buffer, thumbnailSize);
  const thumbnailMetadata = await getImageMetadata(thumbnailBuffer);

  const baseName = getBaseFilename(originalFilename);
  const thumbnail: ProcessedImage = {
    buffer: thumbnailBuffer,
    metadata: thumbnailMetadata,
    filename: `thumb-${baseName}.webp`,
  };

  return { main, thumbnail };
}

/**
 * Validate and process uploaded image
 */
export async function validateAndProcess(
  buffer: Buffer,
  mimeType: string,
  originalFilename: string,
  options: ProcessingOptions = {}
): Promise<{ success: true; image: ProcessedImage } | { success: false; error: string }> {
  // Validate MIME type
  if (!isValidMimeType(mimeType)) {
    return {
      success: false,
      error: `Unsupported image type: ${mimeType}. Supported types: ${SUPPORTED_MIME_TYPES.join(", ")}`,
    };
  }

  // Validate size
  if (!isValidSize(buffer)) {
    return {
      success: false,
      error: `Image too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  try {
    const image = await processImage(buffer, originalFilename, options);
    return { success: true, image };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    return { success: false, error: `Image processing failed: ${message}` };
  }
}

/**
 * Helper: Get base filename without extension
 */
function getBaseFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
}

/**
 * Helper: Get extension from filename
 */
function getExtensionFromFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "bin";
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const baseName = getBaseFilename(originalFilename)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, "-")
    .replaceAll(/-+/g, "-")
    .substring(0, 50);

  const parts = [prefix, timestamp, random, baseName].filter(Boolean);
  return parts.join("-");
}
