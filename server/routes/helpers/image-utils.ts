/**
 * Image Processing Utilities
 * WebP conversion and image handling for uploads
 */

import sharp from "sharp";

// WebP conversion settings
export const WEBP_QUALITY = 80;
export const SUPPORTED_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export interface ConvertedImage {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * Convert image buffer to WebP format for optimized storage
 */
export async function convertToWebP(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<ConvertedImage> {
  // Only convert supported image formats
  if (!SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
    return { buffer, filename: originalFilename, mimeType };
  }

  // Skip if already WebP
  if (mimeType === "image/webp") {
    const metadata = await sharp(buffer).metadata();
    return {
      buffer,
      filename: originalFilename,
      mimeType,
      width: metadata.width,
      height: metadata.height,
    };
  }

  try {
    // Get image metadata for dimensions
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Convert to WebP
    const webpBuffer = await image.webp({ quality: WEBP_QUALITY }).toBuffer();

    // Generate new filename with .webp extension
    const baseName = originalFilename.replace(/\.[^.]+$/, "");
    const webpFilename = `${baseName}.webp`;

    return {
      buffer: webpBuffer,
      filename: webpFilename,
      mimeType: "image/webp",
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    return { buffer, filename: originalFilename, mimeType };
  }
}
