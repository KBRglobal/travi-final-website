/**
 * Media Performance Analyzer
 *
 * Analyzes media assets for performance metrics including file size,
 * dimensions, format efficiency, and SEO/AEO value.
 */

import { db } from '../../db';
import { mediaAssets, contents } from '@shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import {
  getMediaIntelligenceConfig,
  PERFORMANCE_WEIGHTS,
  type IssueSeverity,
  type ImageContext,
} from '../config';
import type {
  MediaPerformanceAnalysis,
  MediaIssue,
} from '../types';
import { log } from '../../lib/logger';
import {
  extractMediaReferencesFromContent,
} from '../../media/library/references';

/**
 * Analyze a single media asset's performance
 */
export async function analyzeAssetPerformance(
  assetId: string
): Promise<MediaPerformanceAnalysis | null> {
  const config = getMediaIntelligenceConfig();

  // Get asset from database
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId))
    .limit(1);

  if (!asset) {
    return null;
  }

  // Find all content that references this asset
  const allContent = await db
    .select({
      id: contents.id,
      heroImage: contents.heroImage,
      cardImage: contents.cardImage,
      blocks: contents.blocks,
    })
    .from(contents);

  // Determine usage
  const usageInfo = findAssetUsage(asset.path, allContent);

  // Calculate metrics and scores
  const metrics = calculateMetrics(asset, usageInfo);
  const scores = calculateScores(asset, metrics, config);
  const context = determineContext(asset.path, usageInfo);
  const issues = detectIssues(asset, metrics, context, config);

  return {
    assetId: asset.id,
    path: asset.path,
    url: asset.url,
    filename: asset.filename,
    metrics: {
      fileSizeBytes: asset.size,
      width: asset.width,
      height: asset.height,
      format: asset.mimeType,
      aspectRatio: asset.width && asset.height ? asset.width / asset.height : null,
      usageCount: usageInfo.usageCount,
      contentIds: usageInfo.contentIds,
    },
    scores,
    context,
    issues,
    analyzedAt: new Date(),
  };
}

/**
 * Analyze multiple assets in batch
 */
export async function analyzeAssetsPerformance(
  assetIds: string[]
): Promise<MediaPerformanceAnalysis[]> {
  const results: MediaPerformanceAnalysis[] = [];

  for (const assetId of assetIds) {
    try {
      const analysis = await analyzeAssetPerformance(assetId);
      if (analysis) {
        results.push(analysis);
      }
    } catch (error) {
      log.error(`[MediaIntelligence] Failed to analyze asset ${assetId}`, error);
    }
  }

  return results;
}

/**
 * Get performance summary for all assets
 */
export async function getPerformanceSummary(): Promise<{
  totalAssets: number;
  averageScore: number;
  byScoreRange: Record<string, number>;
  byFormat: Record<string, { count: number; avgSize: number }>;
  issueCount: number;
}> {
  const config = getMediaIntelligenceConfig();

  // Get all assets
  const assets = await db
    .select()
    .from(mediaAssets);

  if (assets.length === 0) {
    return {
      totalAssets: 0,
      averageScore: 0,
      byScoreRange: { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 },
      byFormat: {},
      issueCount: 0,
    };
  }

  // Get all content for usage analysis
  const allContent = await db
    .select({
      id: contents.id,
      heroImage: contents.heroImage,
      cardImage: contents.cardImage,
      blocks: contents.blocks,
    })
    .from(contents);

  let totalScore = 0;
  const byScoreRange = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
  const byFormat: Record<string, { count: number; totalSize: number }> = {};
  let issueCount = 0;

  for (const asset of assets) {
    const usageInfo = findAssetUsage(asset.path, allContent);
    const metrics = calculateMetrics(asset, usageInfo);
    const scores = calculateScores(asset, metrics, config);
    const context = determineContext(asset.path, usageInfo);
    const issues = detectIssues(asset, metrics, context, config);

    totalScore += scores.overall;
    issueCount += issues.length;

    // Categorize by score
    if (scores.overall >= 80) byScoreRange.excellent++;
    else if (scores.overall >= 60) byScoreRange.good++;
    else if (scores.overall >= 40) byScoreRange.fair++;
    else if (scores.overall >= 20) byScoreRange.poor++;
    else byScoreRange.critical++;

    // Track by format
    const format = asset.mimeType;
    if (!byFormat[format]) {
      byFormat[format] = { count: 0, totalSize: 0 };
    }
    byFormat[format].count++;
    byFormat[format].totalSize += asset.size;
  }

  // Calculate averages
  const formatStats: Record<string, { count: number; avgSize: number }> = {};
  for (const [format, stats] of Object.entries(byFormat)) {
    formatStats[format] = {
      count: stats.count,
      avgSize: Math.round(stats.totalSize / stats.count),
    };
  }

  return {
    totalAssets: assets.length,
    averageScore: Math.round(totalScore / assets.length),
    byScoreRange,
    byFormat: formatStats,
    issueCount,
  };
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

interface UsageInfo {
  usageCount: number;
  contentIds: string[];
  isHeroImage: boolean;
  isCardImage: boolean;
  isGalleryImage: boolean;
}

function findAssetUsage(
  assetPath: string,
  allContent: Array<{
    id: string;
    heroImage: string | null;
    cardImage: string | null;
    blocks: unknown;
  }>
): UsageInfo {
  const contentIds: string[] = [];
  let isHeroImage = false;
  let isCardImage = false;
  let isGalleryImage = false;

  for (const content of allContent) {
    let found = false;

    // Check hero image
    if (content.heroImage && normalizePathForComparison(content.heroImage) === normalizePathForComparison(assetPath)) {
      isHeroImage = true;
      found = true;
    }

    // Check card image
    if (content.cardImage && normalizePathForComparison(content.cardImage) === normalizePathForComparison(assetPath)) {
      isCardImage = true;
      found = true;
    }

    // Check blocks
    const refs = extractMediaReferencesFromContent({
      id: content.id,
      heroImage: null, // Already checked
      cardImage: null, // Already checked
      blocks: content.blocks as any,
    });

    for (const ref of refs) {
      if (normalizePathForComparison(ref.normalizedPath) === normalizePathForComparison(assetPath)) {
        isGalleryImage = true;
        found = true;
        break;
      }
    }

    if (found) {
      contentIds.push(content.id);
    }
  }

  return {
    usageCount: contentIds.length,
    contentIds,
    isHeroImage,
    isCardImage,
    isGalleryImage,
  };
}

function normalizePathForComparison(path: string): string {
  return path
    .replace(/^\/+/, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .toLowerCase();
}

interface AssetMetrics {
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  format: string;
  isOptimalFormat: boolean;
  compressionEfficiency: number;
  usageCount: number;
}

function calculateMetrics(
  asset: { size: number; width: number | null; height: number | null; mimeType: string },
  usageInfo: UsageInfo
): AssetMetrics {
  const aspectRatio = asset.width && asset.height ? asset.width / asset.height : null;

  // Check if format is optimal (WebP or AVIF)
  const isOptimalFormat = ['image/webp', 'image/avif'].includes(asset.mimeType);

  // Estimate compression efficiency (bytes per pixel)
  let compressionEfficiency = 1;
  if (asset.width && asset.height) {
    const pixels = asset.width * asset.height;
    const bytesPerPixel = asset.size / pixels;
    // Good compression: < 0.5 bytes/pixel for lossy, < 1 for lossless
    compressionEfficiency = Math.min(1, Math.max(0, 1 - (bytesPerPixel / 2)));
  }

  return {
    fileSizeBytes: asset.size,
    width: asset.width,
    height: asset.height,
    aspectRatio,
    format: asset.mimeType,
    isOptimalFormat,
    compressionEfficiency,
    usageCount: usageInfo.usageCount,
  };
}

function calculateScores(
  asset: { size: number; width: number | null; height: number | null; mimeType: string },
  metrics: AssetMetrics,
  config: ReturnType<typeof getMediaIntelligenceConfig>
): {
  fileSize: number;
  format: number;
  dimensions: number;
  usageValue: number;
  compression: number;
  overall: number;
} {
  // File size score (0-100)
  let fileSizeScore = 100;
  if (metrics.fileSizeBytes > config.performance.criticalFileSizeBytes) {
    fileSizeScore = 0;
  } else if (metrics.fileSizeBytes > config.performance.maxFileSizeBytes) {
    const overageRatio = (metrics.fileSizeBytes - config.performance.maxFileSizeBytes) /
      (config.performance.criticalFileSizeBytes - config.performance.maxFileSizeBytes);
    fileSizeScore = Math.max(0, Math.round(50 - (overageRatio * 50)));
  } else {
    const ratio = metrics.fileSizeBytes / config.performance.maxFileSizeBytes;
    fileSizeScore = Math.round(100 - (ratio * 50)); // 50-100 range
  }

  // Format score (0-100)
  let formatScore = 50; // Default for JPEG/PNG
  if (metrics.format === 'image/webp') formatScore = 100;
  else if (metrics.format === 'image/avif') formatScore = 100;
  else if (metrics.format === 'image/jpeg') formatScore = 70;
  else if (metrics.format === 'image/png') formatScore = 60;
  else if (metrics.format === 'image/gif') formatScore = 40;
  else if (metrics.format === 'image/svg+xml') formatScore = 90; // SVG is great for icons

  // Dimensions score (0-100)
  let dimensionsScore = 50;
  if (metrics.width && metrics.height) {
    // Check if dimensions are appropriate
    if (metrics.width >= config.performance.minImageWidth) {
      if (metrics.width <= config.performance.optimalHeroWidth * 1.5) {
        dimensionsScore = 100;
      } else {
        // Too large
        dimensionsScore = Math.max(30, 100 - ((metrics.width - config.performance.optimalHeroWidth) / 100));
      }
    } else {
      // Too small
      dimensionsScore = Math.max(0, (metrics.width / config.performance.minImageWidth) * 50);
    }
  }

  // Usage value score (0-100)
  let usageValueScore = 0;
  if (metrics.usageCount > 0) {
    usageValueScore = Math.min(100, 50 + (metrics.usageCount * 10));
  }

  // Compression score (0-100)
  const compressionScore = Math.round(metrics.compressionEfficiency * 100);

  // Calculate weighted overall score
  const overall = Math.round(
    fileSizeScore * PERFORMANCE_WEIGHTS.fileSize +
    formatScore * PERFORMANCE_WEIGHTS.format +
    dimensionsScore * PERFORMANCE_WEIGHTS.dimensions +
    usageValueScore * PERFORMANCE_WEIGHTS.usageValue +
    compressionScore * PERFORMANCE_WEIGHTS.compression
  );

  return {
    fileSize: fileSizeScore,
    format: formatScore,
    dimensions: dimensionsScore,
    usageValue: usageValueScore,
    compression: compressionScore,
    overall,
  };
}

function determineContext(
  assetPath: string,
  usageInfo: UsageInfo
): {
  imageContext: ImageContext;
  isHeroImage: boolean;
  isCardImage: boolean;
  isGalleryImage: boolean;
  seoValue: 'high' | 'medium' | 'low';
  aeoValue: 'high' | 'medium' | 'low';
} {
  let imageContext: ImageContext = 'unknown';
  let seoValue: 'high' | 'medium' | 'low' = 'low';
  let aeoValue: 'high' | 'medium' | 'low' = 'low';

  if (usageInfo.isHeroImage) {
    imageContext = 'hero';
    seoValue = 'high';
    aeoValue = 'high';
  } else if (usageInfo.isCardImage) {
    imageContext = 'card';
    seoValue = 'high';
    aeoValue = 'medium';
  } else if (usageInfo.isGalleryImage) {
    imageContext = 'gallery';
    seoValue = 'medium';
    aeoValue = 'medium';
  } else if (usageInfo.usageCount > 0) {
    imageContext = 'inline';
    seoValue = 'low';
    aeoValue = 'low';
  }

  // Check for special patterns in filename
  const lowerPath = assetPath.toLowerCase();
  if (lowerPath.includes('icon') || lowerPath.includes('logo')) {
    imageContext = lowerPath.includes('logo') ? 'logo' : 'icon';
    seoValue = imageContext === 'logo' ? 'high' : 'low';
  }

  return {
    imageContext,
    isHeroImage: usageInfo.isHeroImage,
    isCardImage: usageInfo.isCardImage,
    isGalleryImage: usageInfo.isGalleryImage,
    seoValue,
    aeoValue,
  };
}

function detectIssues(
  asset: { id: string; size: number; width: number | null; height: number | null; mimeType: string; path: string },
  metrics: AssetMetrics,
  context: ReturnType<typeof determineContext>,
  config: ReturnType<typeof getMediaIntelligenceConfig>
): MediaIssue[] {
  const issues: MediaIssue[] = [];

  // File size issues
  if (metrics.fileSizeBytes > config.performance.criticalFileSizeBytes) {
    issues.push({
      id: `size-critical-${asset.id}`,
      type: 'file_size_critical',
      severity: 'critical',
      message: `File size (${formatBytes(metrics.fileSizeBytes)}) exceeds critical threshold (${formatBytes(config.performance.criticalFileSizeBytes)})`,
      details: {
        currentSize: metrics.fileSizeBytes,
        threshold: config.performance.criticalFileSizeBytes,
      },
      assetId: asset.id,
    });
  } else if (metrics.fileSizeBytes > config.performance.maxFileSizeBytes) {
    issues.push({
      id: `size-warning-${asset.id}`,
      type: 'file_size_warning',
      severity: 'high',
      message: `File size (${formatBytes(metrics.fileSizeBytes)}) exceeds recommended threshold (${formatBytes(config.performance.maxFileSizeBytes)})`,
      details: {
        currentSize: metrics.fileSizeBytes,
        threshold: config.performance.maxFileSizeBytes,
      },
      assetId: asset.id,
    });
  }

  // Format issues
  if (!metrics.isOptimalFormat && metrics.format !== 'image/svg+xml') {
    issues.push({
      id: `format-${asset.id}`,
      type: 'suboptimal_format',
      severity: 'medium',
      message: `Image format (${metrics.format}) is not optimal. Consider converting to WebP.`,
      details: {
        currentFormat: metrics.format,
        recommendedFormat: 'image/webp',
      },
      assetId: asset.id,
    });
  }

  // Dimension issues for hero/card images
  if (context.isHeroImage && metrics.width && metrics.width < config.performance.optimalHeroWidth * 0.75) {
    issues.push({
      id: `hero-size-${asset.id}`,
      type: 'hero_undersized',
      severity: 'high',
      message: `Hero image width (${metrics.width}px) is below optimal (${config.performance.optimalHeroWidth}px)`,
      details: {
        currentWidth: metrics.width,
        optimalWidth: config.performance.optimalHeroWidth,
      },
      assetId: asset.id,
    });
  }

  if (context.isCardImage && metrics.width && metrics.width < config.performance.optimalCardWidth * 0.75) {
    issues.push({
      id: `card-size-${asset.id}`,
      type: 'card_undersized',
      severity: 'medium',
      message: `Card image width (${metrics.width}px) is below optimal (${config.performance.optimalCardWidth}px)`,
      details: {
        currentWidth: metrics.width,
        optimalWidth: config.performance.optimalCardWidth,
      },
      assetId: asset.id,
    });
  }

  // Oversized images (wasting bandwidth)
  if (metrics.width && metrics.width > config.performance.optimalHeroWidth * 2) {
    issues.push({
      id: `oversized-${asset.id}`,
      type: 'oversized_image',
      severity: 'medium',
      message: `Image width (${metrics.width}px) is excessively large. Consider resizing.`,
      details: {
        currentWidth: metrics.width,
        recommendedMaxWidth: config.performance.optimalHeroWidth,
      },
      assetId: asset.id,
    });
  }

  // Unused asset
  if (metrics.usageCount === 0) {
    issues.push({
      id: `unused-${asset.id}`,
      type: 'unused_asset',
      severity: 'low',
      message: 'Asset is not used in any content',
      details: {
        usageCount: 0,
      },
      assetId: asset.id,
    });
  }

  return issues;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
