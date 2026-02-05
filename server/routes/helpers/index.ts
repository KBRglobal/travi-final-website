/**
 * Route Helpers - Centralized exports for utility functions
 */

// JSON utilities for AI response processing
export { cleanJsonFromMarkdown, safeParseJson } from "./json-utils";

// Authentication utilities
export {
  type AuthRequest,
  type PermissionKey,
  getUserId,
  requireRole,
  sanitizeForLog,
} from "./auth-utils";

// Image processing utilities
export {
  WEBP_QUALITY,
  SUPPORTED_IMAGE_FORMATS,
  type ConvertedImage,
  convertToWebP,
} from "./image-utils";

// Content block utilities
export {
  VALID_BLOCK_TYPES,
  normalizeBlock,
  createDefaultBlocks,
  validateAndNormalizeBlocks,
} from "./content-blocks";
