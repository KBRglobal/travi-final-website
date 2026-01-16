/**
 * Media Library Module
 *
 * Admin feature for managing uploaded assets, detecting orphans,
 * and cleaning up unused files.
 *
 * FEATURE FLAG: Set ENABLE_MEDIA_LIBRARY=true to enable
 */

// Configuration
export {
  isMediaLibraryEnabled,
  getMediaLibraryConfig,
  getSupportedMimeTypes,
  type MediaLibraryConfig,
} from './config';

// Asset Indexer
export {
  scanUploadsAndIndex,
  getScanStats,
  type ScanResult,
} from './indexer';

// Reference Detection
export {
  normalizeMediaPath,
  extractMediaReferencesFromString,
  extractMediaReferencesFromBlocks,
  extractMediaReferencesFromContent,
  parseAndExtractReferences,
  deduplicateReferences,
  type MediaReference,
} from './references';

// Orphan Detection & Cleanup
export {
  detectOrphans,
  getOrphans,
  getOrphanCount,
  dryRunDelete,
  deleteOrphans,
  getOrphanStats,
  generateDeleteToken,
  validateDeleteToken,
  type OrphanAsset,
  type OrphanDetectionResult,
  type DeleteResult,
  type DryRunResult,
} from './orphans';
