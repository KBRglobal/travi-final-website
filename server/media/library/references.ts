/**
 * Media Reference Detection
 *
 * Parses content blocks and other fields to find media references.
 * Resilient to malformed JSON and various URL/path patterns.
 */

import type { ContentBlock } from '@shared/schema';

/** Pattern to match upload paths and URLs */
const UPLOAD_PATTERNS = [
  // Relative paths: uploads/filename.jpg, attached_assets/file.png
  /(?:uploads|attached_assets)\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|svg|pdf)/gi,
  // Absolute URLs: /uploads/filename.jpg
  /\/(?:uploads|attached_assets)\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|svg|pdf)/gi,
  // Full URLs with domain
  /https?:\/\/[^\s"'<>]+\/(?:uploads|attached_assets)\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|svg|pdf)/gi,
];

/** Fields in content blocks that commonly contain image URLs */
const IMAGE_FIELDS = [
  'image',
  'src',
  'url',
  'heroImage',
  'cardImage',
  'backgroundImage',
  'thumbnail',
  'cover',
  'logo',
  'icon',
];

export interface MediaReference {
  /** The path or URL found */
  path: string;
  /** Normalized path (relative to project root) */
  normalizedPath: string;
  /** Source: block type, field name, or location */
  source: string;
  /** Content ID if available */
  contentId?: string;
}

/**
 * Normalize a media path to a consistent format
 * Returns the relative path from project root (e.g., "uploads/image.jpg")
 */
export function normalizeMediaPath(pathOrUrl: string): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') {
    return '';
  }

  let normalized = pathOrUrl.trim();

  // Remove URL protocol and domain
  normalized = normalized.replace(/^https?:\/\/[^/]+/, '');

  // Remove leading slash
  normalized = normalized.replace(/^\/+/, '');

  // Extract just the uploads or attached_assets path
  const match = normalized.match(/(uploads|attached_assets)\/[^\s"'<>?#]+/i);
  if (match) {
    return match[0];
  }

  return normalized;
}

/**
 * Extract media references from a string (handles malformed JSON)
 */
export function extractMediaReferencesFromString(
  content: string,
  source: string,
  contentId?: string
): MediaReference[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const references: MediaReference[] = [];
  const seen = new Set<string>();

  for (const pattern of UPLOAD_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const path = match[0];
      const normalizedPath = normalizeMediaPath(path);

      if (normalizedPath && !seen.has(normalizedPath)) {
        seen.add(normalizedPath);
        references.push({
          path,
          normalizedPath,
          source,
          contentId,
        });
      }
    }
  }

  return references;
}

/**
 * Safely extract value from an object with type checking
 */
function safeGetValue(obj: unknown, key: string): unknown {
  if (obj && typeof obj === 'object' && key in obj) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}

/**
 * Recursively extract media references from an object
 */
function extractFromObject(
  obj: unknown,
  source: string,
  contentId?: string,
  depth = 0
): MediaReference[] {
  // Prevent infinite recursion
  if (depth > 10 || !obj) {
    return [];
  }

  const references: MediaReference[] = [];

  if (typeof obj === 'string') {
    // Check if the string itself is a media path
    const normalized = normalizeMediaPath(obj);
    if (normalized && (normalized.startsWith('uploads/') || normalized.startsWith('attached_assets/'))) {
      references.push({
        path: obj,
        normalizedPath: normalized,
        source,
        contentId,
      });
    }
    return references;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      references.push(...extractFromObject(obj[i], `${source}[${i}]`, contentId, depth + 1));
    }
    return references;
  }

  if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;

    // Check known image fields first
    for (const field of IMAGE_FIELDS) {
      const value = safeGetValue(record, field);
      if (typeof value === 'string' && value) {
        const normalized = normalizeMediaPath(value);
        if (normalized) {
          references.push({
            path: value,
            normalizedPath: normalized,
            source: `${source}.${field}`,
            contentId,
          });
        }
      }
    }

    // Recursively check all properties
    for (const [key, value] of Object.entries(record)) {
      if (!IMAGE_FIELDS.includes(key)) {
        references.push(...extractFromObject(value, `${source}.${key}`, contentId, depth + 1));
      }
    }
  }

  return references;
}

/**
 * Extract media references from content blocks
 */
export function extractMediaReferencesFromBlocks(
  blocks: ContentBlock[] | null | undefined,
  contentId?: string
): MediaReference[] {
  if (!blocks || !Array.isArray(blocks)) {
    return [];
  }

  const references: MediaReference[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block || typeof block !== 'object') {
      continue;
    }

    const blockType = (block as { type?: string }).type || 'unknown';
    const source = `blocks[${i}]:${blockType}`;

    // Extract from block data
    const data = (block as { data?: unknown }).data;
    if (data) {
      references.push(...extractFromObject(data, source, contentId));
    }
  }

  return references;
}

/**
 * Extract media references from content record
 */
export function extractMediaReferencesFromContent(
  content: {
    id: string;
    heroImage?: string | null;
    cardImage?: string | null;
    blocks?: ContentBlock[] | null;
  }
): MediaReference[] {
  const references: MediaReference[] = [];
  const contentId = content.id;

  // Check hero image
  if (content.heroImage) {
    const normalized = normalizeMediaPath(content.heroImage);
    if (normalized) {
      references.push({
        path: content.heroImage,
        normalizedPath: normalized,
        source: 'heroImage',
        contentId,
      });
    }
  }

  // Check card image
  if (content.cardImage) {
    const normalized = normalizeMediaPath(content.cardImage);
    if (normalized) {
      references.push({
        path: content.cardImage,
        normalizedPath: normalized,
        source: 'cardImage',
        contentId,
      });
    }
  }

  // Extract from blocks
  if (content.blocks) {
    references.push(...extractMediaReferencesFromBlocks(content.blocks, contentId));
  }

  return references;
}

/**
 * Parse potentially malformed JSON and extract references
 */
export function parseAndExtractReferences(
  jsonString: string,
  source: string,
  contentId?: string
): MediaReference[] {
  // First try to parse as JSON
  try {
    const parsed = JSON.parse(jsonString);
    return extractFromObject(parsed, source, contentId);
  } catch {
    // If JSON parsing fails, fall back to regex extraction
    return extractMediaReferencesFromString(jsonString, source, contentId);
  }
}

/**
 * Deduplicate references by normalized path
 */
export function deduplicateReferences(references: MediaReference[]): MediaReference[] {
  const seen = new Map<string, MediaReference>();

  for (const ref of references) {
    if (!seen.has(ref.normalizedPath)) {
      seen.set(ref.normalizedPath, ref);
    }
  }

  return Array.from(seen.values());
}
