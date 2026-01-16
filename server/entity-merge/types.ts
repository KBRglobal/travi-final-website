/**
 * Entity Merge Types
 *
 * Types for duplicate detection and entity merging.
 *
 * FEATURE 4: Entity Merge & Canonicalization
 */

/**
 * Supported entity types for merging
 */
export type MergeableEntityType = 'destination' | 'attraction' | 'hotel' | 'article';

/**
 * Merge strategy when combining entities
 */
export type MergeStrategy =
  | 'keep_target'      // Keep target values, discard source
  | 'keep_source'      // Overwrite target with source values
  | 'merge_content'    // Combine content blocks, keep best of each field
  | 'interactive';     // Require manual review for each field

/**
 * Similarity match type
 */
export type MatchType =
  | 'exact_name'           // Exactly same name (case-insensitive)
  | 'fuzzy_name'           // Similar name (Levenshtein)
  | 'same_slug'            // Same slug
  | 'same_location_name'   // Same location + similar name
  | 'alias_match';         // Known alias mapping

/**
 * A potential duplicate pair
 */
export interface DuplicatePair {
  entityType: MergeableEntityType;
  entityA: {
    id: string;
    name: string;
    slug: string;
    location?: string;
    status: string;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  entityB: {
    id: string;
    name: string;
    slug: string;
    location?: string;
    status: string;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  matchType: MatchType;
  similarity: number; // 0.0 to 1.0
  confidence: 'high' | 'medium' | 'low';
  suggestedAction: 'merge' | 'review' | 'ignore';
  reasons: string[];
}

/**
 * Redirect mapping for merged entities
 */
export interface EntityRedirect {
  id: string;
  entityType: MergeableEntityType;
  fromId: string;
  fromSlug: string;
  toId: string;
  toSlug: string;
  mergedAt: Date;
  mergedBy: string;
}

/**
 * Merge operation request
 */
export interface MergeRequest {
  sourceId: string;
  targetId: string;
  strategy: MergeStrategy;
  mergedBy: string;
}

/**
 * Merge operation result
 */
export interface MergeResult {
  success: boolean;
  entityType: MergeableEntityType;
  sourceId: string;
  targetId: string;
  redirectCreated: boolean;
  referencesUpdated: number;
  error?: string;
}

/**
 * Duplicate detection options
 */
export interface DetectionOptions {
  entityType?: MergeableEntityType;
  minSimilarity?: number;
  includeResolved?: boolean;
  limit?: number;
}

/**
 * Detection result
 */
export interface DetectionResult {
  duplicates: DuplicatePair[];
  totalScanned: number;
  detectedAt: Date;
}

/**
 * Entity merge feature flags
 */
export function isEntityMergeEnabled(): boolean {
  return process.env.ENABLE_ENTITY_MERGE === 'true';
}

export function isMergeAutoSuggestEnabled(): boolean {
  return process.env.ENABLE_MERGE_AUTO_SUGGEST === 'true';
}

/**
 * Known alias mappings for common variations
 */
export const KNOWN_ALIASES: Record<string, string[]> = {
  'dubai': ['dubay', 'dubaï', 'dubái'],
  'burj khalifa': ['burj kalifa', 'burjkhalifa', 'burj-khalifa'],
  'palm jumeirah': ['palm jumeira', 'the palm', 'palm island'],
  'abu dhabi': ['abudhabi', 'abu-dhabi', 'abou dhabi'],
  'sharjah': ['sharja', 'alsharjah', 'al-sharjah'],
  'ras al khaimah': ['ras al-khaimah', 'rak', 'rasal khaimah'],
};

/**
 * Normalize a name for comparison
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^\w\s'-]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0 to 1) between two strings
 */
export function calculateSimilarity(a: string, b: string): number {
  const normalA = normalizeName(a);
  const normalB = normalizeName(b);

  if (normalA === normalB) return 1.0;

  const maxLen = Math.max(normalA.length, normalB.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normalA, normalB);
  return 1 - distance / maxLen;
}
