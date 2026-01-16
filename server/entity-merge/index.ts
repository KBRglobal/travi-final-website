/**
 * Entity Merge Module
 *
 * Duplicate detection and entity canonicalization.
 *
 * FEATURE 4: Entity Merge & Canonicalization
 */

export { registerEntityMergeRoutes } from "./routes";
export { detectDuplicates, findDuplicatesFor, getDuplicateStats } from "./detector";
export { mergeEntities, undoMerge, getAllRedirects, getRedirect, getMergeHistory } from "./merger";
export {
  type MergeableEntityType,
  type MergeStrategy,
  type DuplicatePair,
  type EntityRedirect,
  type MergeRequest,
  type MergeResult,
  isEntityMergeEnabled,
  normalizeName,
  calculateSimilarity,
} from "./types";
