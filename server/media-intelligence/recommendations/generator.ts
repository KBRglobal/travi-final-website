/**
 * Media Optimization Recommendation Engine
 *
 * Generates actionable recommendations for media optimization including
 * format conversion, resizing, compression, and content improvements.
 */

import { randomUUID } from 'crypto';
import { db } from '../../db';
import { mediaAssets, contents } from '@shared/schema';
import { eq, sql, and, lt, gt, isNull, not, inArray } from 'drizzle-orm';
import {
  getMediaIntelligenceConfig,
  isOptimizationProposalsEnabled,
  type RecommendationType,
  type IssueSeverity,
} from '../config';
import type {
  MediaRecommendation,
  MediaPerformanceAnalysis,
  VisualCoverageAnalysis,
  MediaIssue,
} from '../types';
import { analyzeAssetPerformance } from '../performance/analyzer';
import { analyzeContentCoverage } from '../coverage/analyzer';
import { log } from '../../lib/logger';

/**
 * Generate recommendations for a single asset
 */
export async function generateAssetRecommendations(
  assetId: string
): Promise<MediaRecommendation[]> {
  if (!isOptimizationProposalsEnabled()) {
    return [];
  }

  const analysis = await analyzeAssetPerformance(assetId);
  if (!analysis) {
    return [];
  }

  return generateRecommendationsFromAnalysis(analysis);
}

/**
 * Generate recommendations for a single content item
 */
export async function generateContentRecommendations(
  contentId: string
): Promise<MediaRecommendation[]> {
  if (!isOptimizationProposalsEnabled()) {
    return [];
  }

  const analysis = await analyzeContentCoverage(contentId);
  if (!analysis) {
    return [];
  }

  return generateRecommendationsFromCoverage(analysis);
}

/**
 * Generate all recommendations for the system
 */
export async function generateAllRecommendations(options?: {
  limit?: number;
  priorityThreshold?: IssueSeverity;
}): Promise<MediaRecommendation[]> {
  const config = getMediaIntelligenceConfig();
  const limit = options?.limit ?? config.batchSize;
  const recommendations: MediaRecommendation[] = [];

  // Get assets with performance issues
  const assets = await db
    .select()
    .from(mediaAssets)
    .limit(limit);

  for (const asset of assets) {
    const assetRecs = await generateAssetRecommendations(asset.id);
    recommendations.push(...assetRecs);
  }

  // Get content with coverage issues
  const contentList = await db
    .select({ id: contents.id })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .limit(limit);

  for (const content of contentList) {
    const contentRecs = await generateContentRecommendations(content.id);
    recommendations.push(...contentRecs);
  }

  // Filter by priority if specified
  if (options?.priorityThreshold) {
    const priorityOrder: Record<IssueSeverity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };
    const threshold = priorityOrder[options.priorityThreshold];
    return recommendations.filter(r => priorityOrder[r.priority] >= threshold);
  }

  // Sort by priority
  return recommendations.sort((a, b) => {
    const order: Record<IssueSeverity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };
    return order[b.priority] - order[a.priority];
  });
}

/**
 * Get recommendation by ID
 */
export function getRecommendationById(
  recommendations: MediaRecommendation[],
  id: string
): MediaRecommendation | undefined {
  return recommendations.find(r => r.id === id);
}

// ============================================================================
// Internal Recommendation Generators
// ============================================================================

function generateRecommendationsFromAnalysis(
  analysis: MediaPerformanceAnalysis
): MediaRecommendation[] {
  const recommendations: MediaRecommendation[] = [];
  const config = getMediaIntelligenceConfig();

  // Format conversion recommendation
  if (analysis.metrics.format !== 'image/webp' &&
      analysis.metrics.format !== 'image/avif' &&
      analysis.metrics.format !== 'image/svg+xml') {
    const estimatedSavings = estimateWebPSavings(analysis.metrics.fileSizeBytes, analysis.metrics.format);

    recommendations.push(createRecommendation({
      assetId: analysis.assetId,
      type: 'convert_format',
      priority: analysis.metrics.fileSizeBytes > config.performance.maxFileSizeBytes ? 'high' : 'medium',
      title: 'Convert to WebP format',
      description: `Converting ${analysis.filename} from ${formatMimeType(analysis.metrics.format)} to WebP could reduce file size by ~${Math.round(estimatedSavings / analysis.metrics.fileSizeBytes * 100)}%`,
      impact: {
        performanceGain: 15,
        seoImpact: 'positive',
        aeoImpact: 'neutral',
        estimatedSavingsBytes: estimatedSavings,
      },
      action: {
        type: 'convert_format',
        params: {
          fromFormat: analysis.metrics.format,
          toFormat: 'image/webp',
          quality: 85,
        },
        reversible: true,
        riskLevel: 'low',
        requiresApproval: true,
      },
      proposal: {
        currentValue: analysis.metrics.format,
        proposedValue: 'image/webp',
      },
    }));
  }

  // File size reduction recommendation
  if (analysis.metrics.fileSizeBytes > config.performance.maxFileSizeBytes) {
    const targetSize = config.performance.maxFileSizeBytes;
    const severity: IssueSeverity = analysis.metrics.fileSizeBytes > config.performance.criticalFileSizeBytes
      ? 'critical' : 'high';

    recommendations.push(createRecommendation({
      assetId: analysis.assetId,
      type: 'compress',
      priority: severity,
      title: 'Compress image to reduce file size',
      description: `File size (${formatBytes(analysis.metrics.fileSizeBytes)}) exceeds recommended limit. Compress to ~${formatBytes(targetSize)} for better performance.`,
      impact: {
        performanceGain: 25,
        seoImpact: 'positive',
        aeoImpact: 'neutral',
        estimatedSavingsBytes: analysis.metrics.fileSizeBytes - targetSize,
      },
      action: {
        type: 'compress',
        params: {
          targetSize,
          quality: 80,
        },
        reversible: true,
        riskLevel: 'low',
        requiresApproval: true,
      },
      proposal: {
        currentValue: analysis.metrics.fileSizeBytes,
        proposedValue: targetSize,
      },
    }));
  }

  // Resize oversized images
  if (analysis.metrics.width && analysis.metrics.width > config.performance.optimalHeroWidth * 1.5) {
    const targetWidth = config.performance.optimalHeroWidth;
    const estimatedNewHeight = analysis.metrics.height
      ? Math.round(analysis.metrics.height * (targetWidth / analysis.metrics.width))
      : null;

    recommendations.push(createRecommendation({
      assetId: analysis.assetId,
      type: 'resize',
      priority: 'medium',
      title: 'Resize oversized image',
      description: `Image width (${analysis.metrics.width}px) is larger than needed. Resize to ${targetWidth}px for optimal loading.`,
      impact: {
        performanceGain: 20,
        seoImpact: 'neutral',
        aeoImpact: 'neutral',
        estimatedSavingsBytes: estimateResizeSavings(
          analysis.metrics.fileSizeBytes,
          analysis.metrics.width,
          analysis.metrics.height || 0,
          targetWidth,
          estimatedNewHeight || 0
        ),
      },
      action: {
        type: 'resize',
        params: {
          maxWidth: targetWidth,
          maintainAspectRatio: true,
        },
        reversible: true,
        riskLevel: 'low',
        requiresApproval: true,
      },
      proposal: {
        currentValue: { width: analysis.metrics.width, height: analysis.metrics.height },
        proposedValue: { width: targetWidth, height: estimatedNewHeight },
      },
    }));
  }

  // Undersized hero image
  if (analysis.context.isHeroImage &&
      analysis.metrics.width &&
      analysis.metrics.width < config.performance.optimalHeroWidth * 0.75) {
    recommendations.push(createRecommendation({
      assetId: analysis.assetId,
      type: 'optimize_dimensions',
      priority: 'high',
      title: 'Replace undersized hero image',
      description: `Hero image is only ${analysis.metrics.width}px wide. Replace with higher resolution image (${config.performance.optimalHeroWidth}px recommended).`,
      impact: {
        performanceGain: 0,
        seoImpact: 'positive',
        aeoImpact: 'positive',
        estimatedSavingsBytes: null,
      },
      action: {
        type: 'replace',
        params: {
          recommendedWidth: config.performance.optimalHeroWidth,
          context: 'hero',
        },
        reversible: true,
        riskLevel: 'medium',
        requiresApproval: true,
      },
      proposal: {
        currentValue: analysis.metrics.width,
        proposedValue: config.performance.optimalHeroWidth,
      },
    }));
  }

  // Unused asset
  if (analysis.metrics.usageCount === 0) {
    recommendations.push(createRecommendation({
      assetId: analysis.assetId,
      type: 'remove_duplicate',
      priority: 'low',
      title: 'Consider removing unused asset',
      description: `This asset is not used in any content and may be safe to remove.`,
      impact: {
        performanceGain: 5,
        seoImpact: 'neutral',
        aeoImpact: 'neutral',
        estimatedSavingsBytes: analysis.metrics.fileSizeBytes,
      },
      action: {
        type: 'remove',
        params: {},
        reversible: false,
        riskLevel: 'medium',
        requiresApproval: true,
      },
    }));
  }

  return recommendations;
}

function generateRecommendationsFromCoverage(
  analysis: VisualCoverageAnalysis
): MediaRecommendation[] {
  const recommendations: MediaRecommendation[] = [];
  const config = getMediaIntelligenceConfig();

  // Missing hero image
  if (!analysis.coverage.hasHeroImage) {
    recommendations.push(createRecommendation({
      contentId: analysis.contentId,
      type: 'add_missing_image',
      priority: 'critical',
      title: 'Add hero image',
      description: `Content "${analysis.title}" is missing a hero image. This is critical for SEO and user engagement.`,
      impact: {
        performanceGain: 0,
        seoImpact: 'positive',
        aeoImpact: 'positive',
        estimatedSavingsBytes: null,
      },
      action: {
        type: 'add_image',
        params: {
          slot: 'hero',
          recommendedWidth: config.performance.optimalHeroWidth,
          recommendedHeight: 1080,
        },
        reversible: true,
        riskLevel: 'none',
        requiresApproval: true,
      },
    }));
  }

  // Missing card image
  if (!analysis.coverage.hasCardImage) {
    recommendations.push(createRecommendation({
      contentId: analysis.contentId,
      type: 'add_missing_image',
      priority: 'high',
      title: 'Add card image',
      description: `Content "${analysis.title}" is missing a card image for listings and social sharing.`,
      impact: {
        performanceGain: 0,
        seoImpact: 'positive',
        aeoImpact: 'neutral',
        estimatedSavingsBytes: null,
      },
      action: {
        type: 'add_image',
        params: {
          slot: 'card',
          recommendedWidth: config.performance.optimalCardWidth,
          recommendedHeight: 600,
        },
        reversible: true,
        riskLevel: 'none',
        requiresApproval: true,
      },
    }));
  }

  // Insufficient gallery images
  if (analysis.coverage.galleryImageCount < config.coverage.minGalleryImages) {
    const needed = config.coverage.minGalleryImages - analysis.coverage.galleryImageCount;
    recommendations.push(createRecommendation({
      contentId: analysis.contentId,
      type: 'add_gallery_images',
      priority: 'medium',
      title: `Add ${needed} more gallery images`,
      description: `Content has ${analysis.coverage.galleryImageCount} gallery images. Adding ${needed} more would improve visual coverage.`,
      impact: {
        performanceGain: 0,
        seoImpact: 'positive',
        aeoImpact: 'positive',
        estimatedSavingsBytes: null,
      },
      action: {
        type: 'add_gallery',
        params: {
          neededCount: needed,
          recommendedWidth: config.performance.optimalGalleryWidth,
        },
        reversible: true,
        riskLevel: 'none',
        requiresApproval: true,
      },
    }));
  }

  // Missing alt text on hero
  if (analysis.images.hero && !analysis.images.hero.hasAlt) {
    recommendations.push(createRecommendation({
      contentId: analysis.contentId,
      assetId: undefined, // Alt text is on content, not asset
      type: 'add_alt_text',
      priority: 'high',
      title: 'Add hero image alt text',
      description: 'Hero image is missing alt text, which is critical for SEO and accessibility.',
      impact: {
        performanceGain: 0,
        seoImpact: 'positive',
        aeoImpact: 'positive',
        estimatedSavingsBytes: null,
      },
      action: {
        type: 'add_alt_text',
        params: {
          imageSlot: 'hero',
          imagePath: analysis.images.hero.path,
        },
        reversible: true,
        riskLevel: 'none',
        requiresApproval: true,
      },
    }));
  }

  // Poor alt text quality on hero
  if (analysis.images.hero?.hasAlt &&
      analysis.images.hero.altQuality !== null &&
      analysis.images.hero.altQuality < 50) {
    recommendations.push(createRecommendation({
      contentId: analysis.contentId,
      type: 'improve_alt_text',
      priority: 'medium',
      title: 'Improve hero image alt text',
      description: `Current alt text "${analysis.images.hero.altText}" could be more descriptive.`,
      impact: {
        performanceGain: 0,
        seoImpact: 'positive',
        aeoImpact: 'positive',
        estimatedSavingsBytes: null,
      },
      action: {
        type: 'improve_alt_text',
        params: {
          imageSlot: 'hero',
          currentAlt: analysis.images.hero.altText,
        },
        reversible: true,
        riskLevel: 'none',
        requiresApproval: true,
      },
      proposal: {
        currentValue: analysis.images.hero.altText,
        proposedValue: null, // Would be generated by alt-quality module
      },
    }));
  }

  // Gallery images without alt text
  const galleryWithoutAlt = analysis.images.gallery.filter(img => !img.hasAlt);
  if (galleryWithoutAlt.length > 0) {
    recommendations.push(createRecommendation({
      contentId: analysis.contentId,
      type: 'add_alt_text',
      priority: 'medium',
      title: `Add alt text to ${galleryWithoutAlt.length} gallery images`,
      description: 'Some gallery images are missing alt text for accessibility.',
      impact: {
        performanceGain: 0,
        seoImpact: 'positive',
        aeoImpact: 'positive',
        estimatedSavingsBytes: null,
      },
      action: {
        type: 'add_gallery_alt_text',
        params: {
          imagePaths: galleryWithoutAlt.map(img => img.path),
        },
        reversible: true,
        riskLevel: 'none',
        requiresApproval: true,
      },
    }));
  }

  // Duplicate images
  if (analysis.duplicates.internalDuplicates.length > 0) {
    recommendations.push(createRecommendation({
      contentId: analysis.contentId,
      type: 'remove_duplicate',
      priority: 'low',
      title: 'Remove duplicate images',
      description: `${analysis.duplicates.internalDuplicates.length} image(s) are used multiple times in this content.`,
      impact: {
        performanceGain: 5,
        seoImpact: 'neutral',
        aeoImpact: 'neutral',
        estimatedSavingsBytes: null,
      },
      action: {
        type: 'deduplicate',
        params: {
          duplicatePaths: analysis.duplicates.internalDuplicates,
        },
        reversible: true,
        riskLevel: 'low',
        requiresApproval: true,
      },
    }));
  }

  return recommendations;
}

// ============================================================================
// Utility Functions
// ============================================================================

function createRecommendation(params: {
  assetId?: string | null;
  contentId?: string | null;
  type: RecommendationType;
  priority: IssueSeverity;
  title: string;
  description: string;
  impact: MediaRecommendation['impact'];
  action: MediaRecommendation['action'];
  proposal?: MediaRecommendation['proposal'];
}): MediaRecommendation {
  return {
    id: randomUUID(),
    assetId: params.assetId ?? null,
    contentId: params.contentId ?? null,
    type: params.type,
    priority: params.priority,
    title: params.title,
    description: params.description,
    impact: params.impact,
    action: params.action,
    proposal: params.proposal,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function estimateWebPSavings(currentSize: number, currentFormat: string): number {
  // Estimated savings based on format
  const savingsRatio: Record<string, number> = {
    'image/jpeg': 0.25, // ~25% smaller
    'image/png': 0.50,  // ~50% smaller (especially for photos)
    'image/gif': 0.30,  // ~30% smaller
  };
  return Math.round(currentSize * (savingsRatio[currentFormat] || 0.20));
}

function estimateResizeSavings(
  currentSize: number,
  currentWidth: number,
  currentHeight: number,
  newWidth: number,
  newHeight: number
): number {
  const currentPixels = currentWidth * currentHeight;
  const newPixels = newWidth * newHeight;
  const ratio = newPixels / currentPixels;
  return Math.round(currentSize * (1 - ratio));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatMimeType(mimeType: string): string {
  const formats: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'image/avif': 'AVIF',
    'image/svg+xml': 'SVG',
  };
  return formats[mimeType] || mimeType;
}
