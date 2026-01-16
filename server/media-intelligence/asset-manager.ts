/**
 * Media Intelligence v2 - Asset Manager
 *
 * Bounded memory asset storage with LRU caching
 */

import { LRUCache } from './lru-cache';
import {
  MediaAssetV2,
  AssetClassifier,
  ContentLinkage,
  PerformanceSignals,
  PlacementRole,
  MediaQualityScore,
  BatchScanRequest,
  BatchScanResult,
  ScanJobStatus,
  MediaStatsV2,
  MediaGrade,
  IssueSeverity,
  AltTextSuggestionV2,
  isAutoApplyEnabled,
} from './types-v2';
import {
  scoreMediaAsset,
  assessAltTextQuality,
  detectPlacementRole,
  calculateSimpleHash,
} from './scoring-engine';

// Bounded caches (configurable sizes, 10 min TTL)
const CACHE_SIZE = parseInt(process.env.MEDIA_CACHE_SIZE || '5000', 10);
const CACHE_TTL = parseInt(process.env.MEDIA_CACHE_TTL || '600000', 10);

const assetCache = new LRUCache<string, MediaAssetV2>(CACHE_SIZE, CACHE_TTL);
const scoreCache = new LRUCache<string, MediaQualityScore>(CACHE_SIZE, CACHE_TTL);
const altSuggestionCache = new LRUCache<string, AltTextSuggestionV2>(1000, CACHE_TTL);
const duplicateHashIndex = new LRUCache<string, string[]>(2000, CACHE_TTL);

// Scan job tracking (bounded)
const scanJobs = new LRUCache<string, ScanJobStatus>(100, 3600000); // 1 hour TTL

/**
 * Register or update a media asset
 */
export function registerAsset(
  id: string,
  url: string,
  filename: string,
  metadata: {
    type?: 'image' | 'video' | 'document' | 'unknown';
    format: string;
    mimeType: string;
    width: number;
    height: number;
    fileSize: number;
    altText?: string;
    hasExif?: boolean;
    exifData?: Record<string, unknown>;
  }
): MediaAssetV2 {
  const existing = assetCache.get(id);

  const altTextQuality = assessAltTextQuality(metadata.altText);
  const hash = calculateSimpleHash(
    metadata.width,
    metadata.height,
    metadata.fileSize,
    metadata.format
  );

  const classifier: AssetClassifier = {
    type: metadata.type || 'image',
    format: metadata.format,
    mimeType: metadata.mimeType,
    width: metadata.width,
    height: metadata.height,
    fileSize: metadata.fileSize,
    hasExif: metadata.hasExif || false,
    exifData: metadata.exifData,
    altText: metadata.altText,
    altTextQuality,
    duplicateSimilarityHash: hash,
    isOrphan: true, // Will be updated when linkage is tracked
  };

  const linkage: ContentLinkage = existing?.linkage || {
    referencedByContentIds: [],
    placementRoles: [],
    localeCoverage: [],
    totalReferences: 0,
  };

  const performance: PerformanceSignals = existing?.performance || {
    impressions: 0,
    clicks: 0,
    ctr: 0,
    available: false,
  };

  const asset: MediaAssetV2 = {
    id,
    url,
    filename,
    classifier,
    linkage,
    performance,
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  assetCache.set(id, asset);

  // Update duplicate hash index
  const existingDupes = duplicateHashIndex.get(hash) || [];
  if (!existingDupes.includes(id)) {
    existingDupes.push(id);
    duplicateHashIndex.set(hash, existingDupes);
  }

  return asset;
}

/**
 * Get asset by ID
 */
export function getAsset(id: string): MediaAssetV2 | undefined {
  return assetCache.get(id);
}

/**
 * Track content reference to asset
 */
export function trackAssetUsage(
  assetId: string,
  contentId: string,
  field: string,
  locale: string,
  blockType?: string,
  position?: number
): void {
  const asset = assetCache.get(assetId);
  if (!asset) return;

  const linkage = asset.linkage;

  // Add content reference if not already tracked
  if (!linkage.referencedByContentIds.includes(contentId)) {
    linkage.referencedByContentIds.push(contentId);
    // Keep bounded
    if (linkage.referencedByContentIds.length > 1000) {
      linkage.referencedByContentIds.shift();
    }
  }

  // Track placement role
  const role = detectPlacementRole(field, blockType, position);
  if (!linkage.placementRoles.includes(role)) {
    linkage.placementRoles.push(role);
  }

  // Track locale
  if (!linkage.localeCoverage.includes(locale)) {
    linkage.localeCoverage.push(locale);
  }

  linkage.totalReferences++;
  linkage.primaryPlacement = determinePrimaryPlacement(linkage.placementRoles);

  // Update orphan status
  asset.classifier.isOrphan = linkage.referencedByContentIds.length === 0;
  asset.updatedAt = new Date();

  assetCache.set(assetId, asset);

  // Invalidate score cache since linkage changed
  scoreCache.delete(assetId);
}

/**
 * Determine primary placement (highest priority)
 */
function determinePrimaryPlacement(roles: PlacementRole[]): PlacementRole {
  const priority: PlacementRole[] = ['hero', 'background', 'card', 'inline', 'thumbnail', 'icon', 'unknown'];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return 'unknown';
}

/**
 * Update performance signals for asset
 */
export function updatePerformanceSignals(
  assetId: string,
  impressions: number,
  clicks: number
): void {
  const asset = assetCache.get(assetId);
  if (!asset) return;

  asset.performance = {
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    available: true,
  };
  asset.updatedAt = new Date();

  assetCache.set(assetId, asset);
  scoreCache.delete(assetId); // Invalidate score
}

/**
 * Score a single asset (with caching)
 */
export function scoreAsset(assetId: string, forceRescore: boolean = false): MediaQualityScore | null {
  if (!forceRescore) {
    const cached = scoreCache.get(assetId);
    if (cached) return cached;
  }

  const asset = assetCache.get(assetId);
  if (!asset) return null;

  const score = scoreMediaAsset(asset);
  scoreCache.set(assetId, score);
  asset.lastScannedAt = new Date();
  assetCache.set(assetId, asset);

  return score;
}

/**
 * Batch scan assets
 */
export function batchScanAssets(request: BatchScanRequest): BatchScanResult {
  const startTime = Date.now();
  const results: MediaQualityScore[] = [];
  const errors: Array<{ assetId: string; error: string }> = [];
  let scanned = 0;
  let failed = 0;
  let skipped = 0;

  const assetIds = request.assetIds || assetCache.keys();
  const limit = request.limit || 1000;
  const offset = request.offset || 0;

  const toScan = assetIds.slice(offset, offset + limit);

  for (const assetId of toScan) {
    try {
      // Skip if recently scanned and not forcing rescan
      const asset = assetCache.get(assetId);
      if (!request.forceRescan && asset?.lastScannedAt) {
        const ageMs = Date.now() - asset.lastScannedAt.getTime();
        if (ageMs < 3600000) { // Less than 1 hour old
          skipped++;
          const cached = scoreCache.get(assetId);
          if (cached) results.push(cached);
          continue;
        }
      }

      const score = scoreAsset(assetId, request.forceRescan);
      if (score) {
        results.push(score);
        scanned++;
      } else {
        skipped++;
      }
    } catch (err) {
      failed++;
      errors.push({
        assetId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return {
    scanned,
    failed,
    skipped,
    duration: Date.now() - startTime,
    results,
    errors,
  };
}

/**
 * Create a scan job (async scanning)
 */
export function createScanJob(request: BatchScanRequest): string {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const assetIds = request.assetIds || assetCache.keys();
  const total = Math.min(assetIds.length, request.limit || assetIds.length);

  const job: ScanJobStatus = {
    jobId,
    status: 'pending',
    progress: 0,
    total,
    scanned: 0,
    failed: 0,
  };

  scanJobs.set(jobId, job);
  return jobId;
}

/**
 * Get scan job status
 */
export function getScanJobStatus(jobId: string): ScanJobStatus | undefined {
  return scanJobs.get(jobId);
}

/**
 * Get worst scoring assets
 */
export function getWorstAssets(limit: number = 20): MediaQualityScore[] {
  const scores: MediaQualityScore[] = [];

  for (const assetId of assetCache.keys()) {
    const score = scoreAsset(assetId);
    if (score) scores.push(score);
  }

  return scores
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

/**
 * Get orphaned assets
 */
export function getOrphanedAssets(limit: number = 100): MediaAssetV2[] {
  const orphans: MediaAssetV2[] = [];

  for (const asset of assetCache.values()) {
    if (asset.classifier.isOrphan) {
      orphans.push(asset);
      if (orphans.length >= limit) break;
    }
  }

  return orphans;
}

/**
 * Find potential duplicates
 */
export function findDuplicates(): Array<{ hash: string; assetIds: string[] }> {
  const duplicates: Array<{ hash: string; assetIds: string[] }> = [];

  for (const hash of duplicateHashIndex.keys()) {
    const ids = duplicateHashIndex.get(hash);
    if (ids && ids.length > 1) {
      // Verify assets still exist
      const validIds = ids.filter(id => assetCache.has(id));
      if (validIds.length > 1) {
        duplicates.push({ hash, assetIds: validIds });
      }
    }
  }

  return duplicates;
}

/**
 * Get assets missing alt text
 */
export function getAssetsMissingAlt(limit: number = 100): MediaAssetV2[] {
  const missing: MediaAssetV2[] = [];

  for (const asset of assetCache.values()) {
    if (asset.classifier.altTextQuality === 'missing') {
      missing.push(asset);
      if (missing.length >= limit) break;
    }
  }

  return missing;
}

/**
 * Store alt text suggestion
 */
export function storeAltSuggestion(
  assetId: string,
  suggestions: Array<{ text: string; confidence: number; source: 'ai' | 'filename' | 'tags' | 'objects' }>
): AltTextSuggestionV2 {
  const asset = assetCache.get(assetId);

  const suggestion: AltTextSuggestionV2 = {
    assetId,
    currentAlt: asset?.classifier.altText,
    suggestions,
    status: 'pending',
    generatedAt: new Date(),
  };

  altSuggestionCache.set(assetId, suggestion);

  // Auto-apply if enabled and high confidence
  if (isAutoApplyEnabled() && suggestions.length > 0 && suggestions[0].confidence >= 0.9) {
    applyAltSuggestion(assetId, suggestions[0].text);
    suggestion.status = 'applied';
    altSuggestionCache.set(assetId, suggestion);
  }

  return suggestion;
}

/**
 * Get alt suggestion for asset
 */
export function getAltSuggestion(assetId: string): AltTextSuggestionV2 | undefined {
  return altSuggestionCache.get(assetId);
}

/**
 * Apply alt text suggestion
 */
export function applyAltSuggestion(assetId: string, altText: string): boolean {
  const asset = assetCache.get(assetId);
  if (!asset) return false;

  asset.classifier.altText = altText;
  asset.classifier.altTextQuality = assessAltTextQuality(altText);
  asset.updatedAt = new Date();

  assetCache.set(assetId, asset);
  scoreCache.delete(assetId); // Invalidate score

  // Update suggestion status
  const suggestion = altSuggestionCache.get(assetId);
  if (suggestion) {
    suggestion.status = 'applied';
    altSuggestionCache.set(assetId, suggestion);
  }

  return true;
}

/**
 * Get media stats
 */
export function getMediaStatsV2(): MediaStatsV2 {
  const assets = assetCache.values();
  const scores: MediaQualityScore[] = [];

  let totalStorage = 0;
  let potentialSavings = 0;
  let orphaned = 0;
  let missingAlt = 0;
  let oversized = 0;

  const gradeDistribution: Record<MediaGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const issuesBySeverity: Record<IssueSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const asset of assets) {
    totalStorage += asset.classifier.fileSize;

    if (asset.classifier.isOrphan) orphaned++;
    if (asset.classifier.altTextQuality === 'missing') missingAlt++;
    if (asset.classifier.fileSize > 500000) {
      oversized++;
      potentialSavings += Math.round(asset.classifier.fileSize * 0.4); // Estimate 40% savings
    }

    const score = scoreAsset(asset.id);
    if (score) {
      scores.push(score);
      gradeDistribution[score.grade]++;
      for (const issue of score.issues) {
        issuesBySeverity[issue.severity]++;
      }
    }
  }

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;

  return {
    totalAssets: assetCache.size(),
    scannedAssets: scores.length,
    averageScore: avgScore,
    gradeDistribution,
    issuesBySeverity,
    orphanedAssets: orphaned,
    missingAltCount: missingAlt,
    oversizedCount: oversized,
    totalStorageBytes: totalStorage,
    potentialSavingsBytes: potentialSavings,
  };
}

/**
 * Clear caches (for testing)
 */
export function clearCaches(): void {
  assetCache.clear();
  scoreCache.clear();
  altSuggestionCache.clear();
  duplicateHashIndex.clear();
  scanJobs.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  assets: { size: number; maxSize: number };
  scores: { size: number; maxSize: number };
  suggestions: { size: number; maxSize: number };
} {
  return {
    assets: assetCache.stats(),
    scores: scoreCache.stats(),
    suggestions: altSuggestionCache.stats(),
  };
}

/**
 * Prune expired entries from all caches
 */
export function pruneCaches(): { pruned: number } {
  let pruned = 0;
  pruned += assetCache.prune();
  pruned += scoreCache.prune();
  pruned += altSuggestionCache.prune();
  pruned += duplicateHashIndex.prune();
  return { pruned };
}
