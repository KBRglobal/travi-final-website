/**
 * File Upload Security
 * 
 * Provides comprehensive file upload validation including:
 * - Magic bytes validation (actual file type detection)
 * - MIME type verification
 * - File size limits
 * - Malicious content detection
 * - Safe filename generation
 */

import FileType from 'file-type';
import crypto from 'crypto';
import path from 'path';

/**
 * File type configuration
 */
export const ALLOWED_FILE_TYPES = {
  images: {
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  documents: {
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    maxSize: 25 * 1024 * 1024, // 25MB
  },
};

/**
 * Magic bytes for file type detection
 */
const MAGIC_BYTES = {
  jpg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF header (check for WEBP after)
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
};

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  detectedType?: {
    ext: string;
    mime: string;
  };
  safeFilename?: string;
}

/**
 * Validate file by checking magic bytes
 */
function validateMagicBytes(buffer: Buffer): { ext: string; mime: string } | null {
  // Check for JPG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // Check for PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }

  // Check for GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { ext: 'gif', mime: 'image/gif' };
  }

  // Check for WEBP (RIFF header followed by WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  // Check for PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { ext: 'pdf', mime: 'application/pdf' };
  }

  return null;
}

/**
 * Check for malicious content in images
 * Looks for embedded scripts or suspicious patterns
 * Only checks the first 10KB to avoid memory issues with large files
 */
function detectMaliciousContent(buffer: Buffer): boolean {
  // Only check first 10KB for performance and memory safety
  const maxCheckSize = 10 * 1024;
  const checkBuffer = buffer.length > maxCheckSize 
    ? buffer.subarray(0, maxCheckSize) 
    : buffer;
  
  const content = checkBuffer.toString('utf8', 0, Math.min(checkBuffer.length, 2048));

  // Check for script tags
  if (/<script/i.test(content)) {
    return true;
  }

  // Check for PHP tags
  if (/<\?php/i.test(content)) {
    return true;
  }

  // Check for common shell commands
  if (/(\$\(|\`|\bexec\b|\beval\b|\bsystem\b)/i.test(content)) {
    return true;
  }

  // Check for HTML event handlers
  if (/on(load|error|click|mouseover)\s*=/i.test(content)) {
    return true;
  }

  return false;
}

/**
 * Generate a safe filename with random hash
 */
export function generateSafeFilename(originalFilename: string, fileType: string): string {
  // Generate random hash
  const hash = crypto.randomBytes(16).toString('hex');
  
  // Get extension
  const ext = path.extname(originalFilename).toLowerCase().replace(/[^a-z0-9]/g, '');
  const validExt = ext || fileType;

  // Create safe filename: hash + extension
  return `${hash}.${validExt}`;
}

/**
 * Validate uploaded file
 */
export async function validateUploadedFile(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType: string,
  maxSize?: number
): Promise<FileValidationResult> {
  const errors: string[] = [];

  // Check if buffer is empty
  if (!buffer || buffer.length === 0) {
    errors.push('File is empty');
    return { valid: false, errors };
  }

  // Check file size
  if (maxSize && buffer.length > maxSize) {
    errors.push(`File size (${Math.round(buffer.length / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`);
  }

  // Detect actual file type using magic bytes
  const magicBytesResult = validateMagicBytes(buffer);
  
  if (!magicBytesResult) {
    errors.push('Unable to determine file type or unsupported file format');
    return { valid: false, errors };
  }

  // Use file-type library for additional validation
  let fileTypeResult;
  try {
    fileTypeResult = await FileType.fromBuffer(buffer);
  } catch (error) {
    console.error('Error detecting file type:', error);
  }

  // Verify MIME type matches detected type
  if (fileTypeResult && fileTypeResult.mime !== magicBytesResult.mime) {
    errors.push(`File type mismatch: declared as ${declaredMimeType}, but detected as ${fileTypeResult.mime}`);
  }

  // Check if file type is allowed
  const isImageType = ALLOWED_FILE_TYPES.images.mimeTypes.includes(magicBytesResult.mime);
  const isDocumentType = ALLOWED_FILE_TYPES.documents.mimeTypes.includes(magicBytesResult.mime);

  if (!isImageType && !isDocumentType) {
    errors.push(`File type ${magicBytesResult.mime} is not allowed`);
  }

  // Check file size against type-specific limits
  if (isImageType && buffer.length > ALLOWED_FILE_TYPES.images.maxSize) {
    errors.push(`Image file size exceeds maximum allowed size of ${ALLOWED_FILE_TYPES.images.maxSize / 1024 / 1024}MB`);
  }

  if (isDocumentType && buffer.length > ALLOWED_FILE_TYPES.documents.maxSize) {
    errors.push(`Document file size exceeds maximum allowed size of ${ALLOWED_FILE_TYPES.documents.maxSize / 1024 / 1024}MB`);
  }

  // Check for malicious content
  if (isImageType && detectMaliciousContent(buffer)) {
    errors.push('File contains potentially malicious content');
  }

  // Check for double extensions (e.g., image.jpg.exe)
  const extensionCount = (originalFilename.match(/\./g) || []).length;
  if (extensionCount > 1) {
    errors.push('Files with multiple extensions are not allowed');
  }

  // Generate safe filename
  const safeFilename = generateSafeFilename(originalFilename, magicBytesResult.ext);

  return {
    valid: errors.length === 0,
    errors,
    detectedType: magicBytesResult,
    safeFilename,
  };
}

/**
 * Validate file before upload (without buffer)
 * For initial client-side validation
 */
export function validateFileMetadata(
  filename: string,
  fileSize: number,
  mimeType: string
): FileValidationResult {
  const errors: string[] = [];

  // Check filename
  if (!filename || filename.length === 0) {
    errors.push('Filename is required');
    return { valid: false, errors };
  }

  // Check for null bytes in filename
  if (filename.includes('\0')) {
    errors.push('Invalid filename');
  }

  // Check for path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('Filename contains invalid characters');
  }

  // Check extension
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const isAllowedImage = ALLOWED_FILE_TYPES.images.extensions.includes(ext);
  const isAllowedDocument = ALLOWED_FILE_TYPES.documents.extensions.includes(ext);

  if (!isAllowedImage && !isAllowedDocument) {
    errors.push(`File extension .${ext} is not allowed`);
  }

  // Check MIME type
  const isAllowedMimeType =
    ALLOWED_FILE_TYPES.images.mimeTypes.includes(mimeType) ||
    ALLOWED_FILE_TYPES.documents.mimeTypes.includes(mimeType);

  if (!isAllowedMimeType) {
    errors.push(`MIME type ${mimeType} is not allowed`);
  }

  // Check file size
  const isImage = ALLOWED_FILE_TYPES.images.mimeTypes.includes(mimeType);
  const isDocument = ALLOWED_FILE_TYPES.documents.mimeTypes.includes(mimeType);

  if (isImage && fileSize > ALLOWED_FILE_TYPES.images.maxSize) {
    errors.push(`Image file size exceeds maximum of ${ALLOWED_FILE_TYPES.images.maxSize / 1024 / 1024}MB`);
  }

  if (isDocument && fileSize > ALLOWED_FILE_TYPES.documents.maxSize) {
    errors.push(`Document file size exceeds maximum of ${ALLOWED_FILE_TYPES.documents.maxSize / 1024 / 1024}MB`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get allowed file types for client-side validation
 */
export function getAllowedFileTypes(): {
  extensions: string[];
  mimeTypes: string[];
  maxSizes: { [key: string]: number };
} {
  return {
    extensions: [
      ...ALLOWED_FILE_TYPES.images.extensions,
      ...ALLOWED_FILE_TYPES.documents.extensions,
    ],
    mimeTypes: [
      ...ALLOWED_FILE_TYPES.images.mimeTypes,
      ...ALLOWED_FILE_TYPES.documents.mimeTypes,
    ],
    maxSizes: {
      image: ALLOWED_FILE_TYPES.images.maxSize,
      document: ALLOWED_FILE_TYPES.documents.maxSize,
    },
  };
}
