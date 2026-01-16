/**
 * Content Visual Coverage Engine
 *
 * Analyzes content for visual coverage including missing images,
 * gallery depth, and duplicate detection.
 */

import { db } from '../../db';
import { mediaAssets, contents } from '@shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import {
  getMediaIntelligenceConfig,
  COVERAGE_WEIGHTS,
  type IssueSeverity,
} from '../config';
import type {
  VisualCoverageAnalysis,
  MissingVisual,
  ImageAnalysisSummary,
  MediaIssue,
} from '../types';
import { log } from '../../lib/logger';
import {
  extractMediaReferencesFromContent,
  extractMediaReferencesFromBlocks,
  normalizeMediaPath,
} from '../../media/library/references';
import type { ContentBlock, GalleryImage } from '@shared/schema';

/**
 * Analyze visual coverage for a single content item
 */
export async function analyzeContentCoverage(
  contentId: string
): Promise<VisualCoverageAnalysis | null> {
  const config = getMediaIntelligenceConfig();

  // Get content from database
  const [content] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) {
    return null;
  }

  // Get all media assets for reference
  const allAssets = await db.select().from(mediaAssets);
  const assetByPath = new Map(allAssets.map(a => [a.path.toLowerCase(), a]));

  // Extract all image references from content
  const allRefs = extractMediaReferencesFromContent({
    id: content.id,
    heroImage: content.heroImage,
    cardImage: content.cardImage,
    blocks: content.blocks as ContentBlock[],
  });

  // Analyze hero image
  const heroAnalysis = content.heroImage
    ? analyzeImage(content.heroImage, content.heroImageAlt, 'hero', assetByPath)
    : null;

  // Analyze card image
  const cardAnalysis = content.cardImage
    ? analyzeImage(content.cardImage, content.cardImageAlt, 'card', assetByPath)
    : null;

  // Analyze gallery images from blocks
  const galleryImages = extractGalleryImages(content.blocks as ContentBlock[]);
  const galleryAnalyses = galleryImages.map(img =>
    analyzeImage(img.image, img.alt, 'gallery', assetByPath)
  );

  // Analyze inline images from blocks
  const inlineImages = extractInlineImages(content.blocks as ContentBlock[]);
  const inlineAnalyses = inlineImages.map(img =>
    analyzeImage(img.path, img.alt, 'inline', assetByPath)
  );

  // Detect missing visuals
  const missingVisuals = detectMissingVisuals(content, galleryImages.length, config);

  // Detect duplicates
  const duplicates = detectDuplicates(allRefs, contentId);

  // Calculate scores
  const scores = calculateCoverageScores(
    heroAnalysis,
    cardAnalysis,
    galleryAnalyses,
    inlineAnalyses,
    duplicates,
    config
  );

  // Generate issues
  const issues = generateCoverageIssues(
    content,
    heroAnalysis,
    cardAnalysis,
    galleryAnalyses,
    missingVisuals,
    duplicates,
    config
  );

  return {
    contentId: content.id,
    contentType: content.type,
    title: content.title,
    slug: content.slug,
    coverage: {
      hasHeroImage: !!content.heroImage,
      heroImageQuality: heroAnalysis?.performanceScore ?? null,
      hasCardImage: !!content.cardImage,
      cardImageQuality: cardAnalysis?.performanceScore ?? null,
      galleryImageCount: galleryImages.length,
      totalImageCount: allRefs.length,
    },
    missingVisuals,
    images: {
      hero: heroAnalysis,
      card: cardAnalysis,
      gallery: galleryAnalyses,
      inline: inlineAnalyses,
    },
    duplicates,
    scores,
    issues,
    analyzedAt: new Date(),
  };
}

/**
 * Analyze coverage for multiple content items
 */
export async function analyzeContentsCoverage(
  contentIds: string[]
): Promise<VisualCoverageAnalysis[]> {
  const results: VisualCoverageAnalysis[] = [];

  for (const contentId of contentIds) {
    try {
      const analysis = await analyzeContentCoverage(contentId);
      if (analysis) {
        results.push(analysis);
      }
    } catch (error) {
      log.error(`[MediaIntelligence] Failed to analyze content ${contentId}`, error);
    }
  }

  return results;
}

/**
 * Get coverage summary for all content
 */
export async function getCoverageSummary(): Promise<{
  totalContent: number;
  withHeroImage: number;
  withCardImage: number;
  withGallery: number;
  averageCoverageScore: number;
  missingVisualsCount: number;
  byContentType: Record<string, {
    total: number;
    withHero: number;
    avgScore: number;
  }>;
}> {
  const config = getMediaIntelligenceConfig();

  // Get all published content
  const allContent = await db
    .select()
    .from(contents)
    .where(eq(contents.status, 'published'));

  if (allContent.length === 0) {
    return {
      totalContent: 0,
      withHeroImage: 0,
      withCardImage: 0,
      withGallery: 0,
      averageCoverageScore: 0,
      missingVisualsCount: 0,
      byContentType: {},
    };
  }

  let withHeroImage = 0;
  let withCardImage = 0;
  let withGallery = 0;
  let totalScore = 0;
  let missingVisualsCount = 0;
  const byContentType: Record<string, { total: number; withHero: number; totalScore: number }> = {};

  for (const content of allContent) {
    // Track by content type
    if (!byContentType[content.type]) {
      byContentType[content.type] = { total: 0, withHero: 0, totalScore: 0 };
    }
    byContentType[content.type].total++;

    if (content.heroImage) {
      withHeroImage++;
      byContentType[content.type].withHero++;
    } else {
      missingVisualsCount++;
    }

    if (content.cardImage) {
      withCardImage++;
    } else {
      missingVisualsCount++;
    }

    // Count gallery images
    const galleryImages = extractGalleryImages(content.blocks as ContentBlock[]);
    if (galleryImages.length >= config.coverage.minGalleryImages) {
      withGallery++;
    } else if (galleryImages.length < config.coverage.minGalleryImages) {
      missingVisualsCount++;
    }

    // Calculate simple coverage score
    let score = 0;
    if (content.heroImage) score += 30;
    if (content.cardImage) score += 15;
    score += Math.min(25, (galleryImages.length / config.coverage.idealGalleryImages) * 25);
    if (content.heroImageAlt) score += 15;
    if (content.cardImageAlt) score += 15;

    totalScore += score;
    byContentType[content.type].totalScore += score;
  }

  // Calculate averages
  const byContentTypeResult: Record<string, { total: number; withHero: number; avgScore: number }> = {};
  for (const [type, stats] of Object.entries(byContentType)) {
    byContentTypeResult[type] = {
      total: stats.total,
      withHero: stats.withHero,
      avgScore: Math.round(stats.totalScore / stats.total),
    };
  }

  return {
    totalContent: allContent.length,
    withHeroImage,
    withCardImage,
    withGallery,
    averageCoverageScore: Math.round(totalScore / allContent.length),
    missingVisualsCount,
    byContentType: byContentTypeResult,
  };
}

/**
 * Find content with the lowest visual coverage
 */
export async function findPoorCoverageContent(
  limit: number = 20
): Promise<Array<{
  contentId: string;
  title: string;
  type: string;
  hasHero: boolean;
  hasCard: boolean;
  galleryCount: number;
  score: number;
  missingCount: number;
}>> {
  const config = getMediaIntelligenceConfig();

  const allContent = await db
    .select()
    .from(contents)
    .where(eq(contents.status, 'published'));

  const results: Array<{
    contentId: string;
    title: string;
    type: string;
    hasHero: boolean;
    hasCard: boolean;
    galleryCount: number;
    score: number;
    missingCount: number;
  }> = [];

  for (const content of allContent) {
    const galleryImages = extractGalleryImages(content.blocks as ContentBlock[]);

    let score = 0;
    let missingCount = 0;

    if (content.heroImage) {
      score += 30;
    } else {
      missingCount++;
    }

    if (content.cardImage) {
      score += 15;
    } else {
      missingCount++;
    }

    const galleryScore = Math.min(25, (galleryImages.length / config.coverage.idealGalleryImages) * 25);
    score += galleryScore;

    if (galleryImages.length < config.coverage.minGalleryImages) {
      missingCount++;
    }

    if (content.heroImageAlt) score += 15;
    if (content.cardImageAlt) score += 15;

    results.push({
      contentId: content.id,
      title: content.title,
      type: content.type,
      hasHero: !!content.heroImage,
      hasCard: !!content.cardImage,
      galleryCount: galleryImages.length,
      score,
      missingCount,
    });
  }

  // Sort by score ascending (worst first)
  results.sort((a, b) => a.score - b.score);

  return results.slice(0, limit);
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

function analyzeImage(
  imagePath: string,
  altText: string | null | undefined,
  context: 'hero' | 'card' | 'gallery' | 'inline',
  assetByPath: Map<string, { size: number; width: number | null; height: number | null; mimeType: string }>
): ImageAnalysisSummary {
  const normalizedPath = normalizeMediaPath(imagePath);
  const asset = assetByPath.get(normalizedPath.toLowerCase());

  // Calculate simple performance score
  let performanceScore = 50; // Default score

  if (asset) {
    // Format score
    if (asset.mimeType === 'image/webp' || asset.mimeType === 'image/avif') {
      performanceScore += 15;
    } else if (asset.mimeType === 'image/jpeg') {
      performanceScore += 5;
    }

    // Size score
    if (asset.size < 200 * 1024) { // Under 200KB
      performanceScore += 20;
    } else if (asset.size < 500 * 1024) { // Under 500KB
      performanceScore += 10;
    } else if (asset.size > 2 * 1024 * 1024) { // Over 2MB
      performanceScore -= 20;
    }

    // Dimensions score
    if (asset.width) {
      if (context === 'hero' && asset.width >= 1200) {
        performanceScore += 15;
      } else if (context === 'card' && asset.width >= 400 && asset.width <= 1000) {
        performanceScore += 15;
      } else if (context === 'gallery' && asset.width >= 800) {
        performanceScore += 10;
      }
    }
  }

  // Alt text quality
  let altQuality: number | null = null;
  if (altText) {
    altQuality = calculateAltQuality(altText);
    performanceScore = Math.min(100, performanceScore + (altQuality / 10));
  } else {
    performanceScore -= 10;
  }

  return {
    path: normalizedPath,
    url: imagePath.startsWith('/') ? imagePath : `/${imagePath}`,
    width: asset?.width ?? null,
    height: asset?.height ?? null,
    format: asset?.mimeType ?? 'unknown',
    sizeBytes: asset?.size ?? 0,
    hasAlt: !!altText,
    altText: altText ?? null,
    altQuality,
    performanceScore: Math.max(0, Math.min(100, performanceScore)),
  };
}

function calculateAltQuality(altText: string): number {
  if (!altText || altText.trim().length === 0) return 0;

  let score = 50;

  // Length check
  const len = altText.trim().length;
  if (len >= 10 && len <= 125) {
    score += 20;
  } else if (len < 10) {
    score -= 20;
  } else if (len > 125) {
    score -= 10;
  }

  // Check for generic patterns
  const genericPatterns = ['image', 'photo', 'picture', 'img', 'untitled', 'dsc_', 'img_'];
  const lowerAlt = altText.toLowerCase();
  const isGeneric = genericPatterns.some(p => lowerAlt.includes(p) && lowerAlt.length < 20);
  if (isGeneric) {
    score -= 30;
  }

  // Descriptive check (has multiple words)
  const wordCount = altText.trim().split(/\s+/).length;
  if (wordCount >= 3) {
    score += 15;
  }

  // Has capital letters (proper sentence)
  if (/[A-Z]/.test(altText)) {
    score += 5;
  }

  // Ends with punctuation or is complete
  if (/[.!?]$/.test(altText.trim())) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function extractGalleryImages(blocks: ContentBlock[] | null): GalleryImage[] {
  if (!blocks || !Array.isArray(blocks)) return [];

  const images: GalleryImage[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    const blockType = (block as { type?: string }).type;
    const data = (block as { data?: Record<string, unknown> }).data;

    if (!data) continue;

    if (blockType === 'gallery') {
      const galleryImages = data.images as GalleryImage[] | undefined;
      if (Array.isArray(galleryImages)) {
        images.push(...galleryImages);
      }
    }
  }

  return images;
}

function extractInlineImages(blocks: ContentBlock[] | null): Array<{ path: string; alt: string | null }> {
  if (!blocks || !Array.isArray(blocks)) return [];

  const images: Array<{ path: string; alt: string | null }> = [];

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    const blockType = (block as { type?: string }).type;
    const data = (block as { data?: Record<string, unknown> }).data;

    if (!data) continue;

    // Check for image blocks
    if (blockType === 'image') {
      const imagePath = data.image as string | undefined;
      const altText = data.alt as string | undefined;
      if (imagePath) {
        images.push({ path: imagePath, alt: altText ?? null });
      }
    }

    // Check for images in other block types
    if (data.image && typeof data.image === 'string') {
      images.push({ path: data.image, alt: (data.alt as string) ?? null });
    }

    // Check for background images
    if (data.backgroundImage && typeof data.backgroundImage === 'string') {
      images.push({ path: data.backgroundImage, alt: null });
    }
  }

  return images;
}

function detectMissingVisuals(
  content: { heroImage: string | null; cardImage: string | null; type: string },
  galleryCount: number,
  config: ReturnType<typeof getMediaIntelligenceConfig>
): MissingVisual[] {
  const missing: MissingVisual[] = [];

  if (!content.heroImage) {
    missing.push({
      type: 'hero',
      priority: 'critical',
      reason: 'Hero image is missing - critical for SEO and user engagement',
      suggestedAction: 'Add a high-quality hero image (recommended: 1920x1080px, WebP format)',
    });
  }

  if (!content.cardImage) {
    missing.push({
      type: 'card',
      priority: 'high',
      reason: 'Card image is missing - affects appearance in listings and social sharing',
      suggestedAction: 'Add a card image (recommended: 800x600px, WebP format)',
    });
  }

  if (galleryCount < config.coverage.minGalleryImages) {
    const needed = config.coverage.minGalleryImages - galleryCount;
    missing.push({
      type: 'gallery',
      priority: 'medium',
      reason: `Gallery has ${galleryCount} images, ${needed} more needed for good coverage`,
      suggestedAction: `Add ${needed} more gallery images to improve visual richness`,
    });
  }

  // Entity-specific checks
  if (['hotel', 'attraction', 'dining'].includes(content.type) && galleryCount < config.coverage.idealGalleryImages) {
    missing.push({
      type: 'entity_image',
      priority: 'medium',
      reason: `${content.type} content benefits from ${config.coverage.idealGalleryImages} gallery images for optimal user experience`,
      suggestedAction: 'Add more photos showcasing different aspects of this location',
    });
  }

  return missing;
}

function detectDuplicates(
  refs: Array<{ normalizedPath: string; source: string; contentId?: string }>,
  currentContentId: string
): {
  internalDuplicates: string[];
  crossContentDuplicates: Array<{
    imagePath: string;
    sharedWithContentIds: string[];
  }>;
} {
  // Count path occurrences within this content
  const pathCounts = new Map<string, number>();
  for (const ref of refs) {
    const count = pathCounts.get(ref.normalizedPath) || 0;
    pathCounts.set(ref.normalizedPath, count + 1);
  }

  // Find internal duplicates (same image used multiple times in same content)
  const internalDuplicates: string[] = [];
  for (const [path, count] of pathCounts.entries()) {
    if (count > 1) {
      internalDuplicates.push(path);
    }
  }

  // Note: Cross-content duplicate detection would require checking all content
  // This is a simplified implementation
  const crossContentDuplicates: Array<{
    imagePath: string;
    sharedWithContentIds: string[];
  }> = [];

  return {
    internalDuplicates,
    crossContentDuplicates,
  };
}

function calculateCoverageScores(
  heroAnalysis: ImageAnalysisSummary | null,
  cardAnalysis: ImageAnalysisSummary | null,
  galleryAnalyses: ImageAnalysisSummary[],
  inlineAnalyses: ImageAnalysisSummary[],
  duplicates: ReturnType<typeof detectDuplicates>,
  config: ReturnType<typeof getMediaIntelligenceConfig>
): {
  heroScore: number;
  cardScore: number;
  galleryScore: number;
  altTextScore: number;
  uniquenessScore: number;
  overall: number;
} {
  // Hero score
  let heroScore = 0;
  if (heroAnalysis) {
    heroScore = heroAnalysis.performanceScore;
    if (heroAnalysis.hasAlt && heroAnalysis.altQuality) {
      heroScore = (heroScore + heroAnalysis.altQuality) / 2;
    }
  }

  // Card score
  let cardScore = 0;
  if (cardAnalysis) {
    cardScore = cardAnalysis.performanceScore;
    if (cardAnalysis.hasAlt && cardAnalysis.altQuality) {
      cardScore = (cardScore + cardAnalysis.altQuality) / 2;
    }
  }

  // Gallery score
  let galleryScore = 0;
  if (galleryAnalyses.length > 0) {
    const avgPerformance = galleryAnalyses.reduce((sum, a) => sum + a.performanceScore, 0) / galleryAnalyses.length;
    const countScore = Math.min(100, (galleryAnalyses.length / config.coverage.idealGalleryImages) * 100);
    galleryScore = (avgPerformance + countScore) / 2;
  }

  // Alt text score
  const allImages = [heroAnalysis, cardAnalysis, ...galleryAnalyses, ...inlineAnalyses].filter(Boolean) as ImageAnalysisSummary[];
  let altTextScore = 0;
  if (allImages.length > 0) {
    const withAlt = allImages.filter(img => img.hasAlt).length;
    const altPresenceScore = (withAlt / allImages.length) * 50;
    const avgAltQuality = allImages
      .filter(img => img.altQuality !== null)
      .reduce((sum, img) => sum + (img.altQuality || 0), 0) / Math.max(1, allImages.filter(img => img.altQuality !== null).length);
    altTextScore = altPresenceScore + (avgAltQuality / 2);
  }

  // Uniqueness score
  let uniquenessScore = 100;
  if (duplicates.internalDuplicates.length > 0) {
    uniquenessScore -= duplicates.internalDuplicates.length * 20;
  }
  uniquenessScore = Math.max(0, uniquenessScore);

  // Overall weighted score
  const overall = Math.round(
    heroScore * COVERAGE_WEIGHTS.heroImage +
    cardScore * COVERAGE_WEIGHTS.cardImage +
    galleryScore * COVERAGE_WEIGHTS.galleryDepth +
    altTextScore * COVERAGE_WEIGHTS.altTextQuality +
    uniquenessScore * COVERAGE_WEIGHTS.uniqueness
  );

  return {
    heroScore: Math.round(heroScore),
    cardScore: Math.round(cardScore),
    galleryScore: Math.round(galleryScore),
    altTextScore: Math.round(altTextScore),
    uniquenessScore: Math.round(uniquenessScore),
    overall: Math.max(0, Math.min(100, overall)),
  };
}

function generateCoverageIssues(
  content: { id: string; heroImage: string | null; cardImage: string | null },
  heroAnalysis: ImageAnalysisSummary | null,
  cardAnalysis: ImageAnalysisSummary | null,
  galleryAnalyses: ImageAnalysisSummary[],
  missingVisuals: MissingVisual[],
  duplicates: ReturnType<typeof detectDuplicates>,
  config: ReturnType<typeof getMediaIntelligenceConfig>
): MediaIssue[] {
  const issues: MediaIssue[] = [];

  // Missing visuals as issues
  for (const mv of missingVisuals) {
    issues.push({
      id: `missing-${mv.type}-${content.id}`,
      type: `missing_${mv.type}`,
      severity: mv.priority as IssueSeverity,
      message: mv.reason,
      details: { suggestedAction: mv.suggestedAction },
      contentId: content.id,
    });
  }

  // Hero image issues
  if (heroAnalysis) {
    if (!heroAnalysis.hasAlt) {
      issues.push({
        id: `hero-no-alt-${content.id}`,
        type: 'missing_alt_text',
        severity: 'high',
        message: 'Hero image is missing alt text - critical for SEO and accessibility',
        details: { imagePath: heroAnalysis.path },
        contentId: content.id,
      });
    } else if (heroAnalysis.altQuality !== null && heroAnalysis.altQuality < 50) {
      issues.push({
        id: `hero-poor-alt-${content.id}`,
        type: 'poor_alt_text',
        severity: 'medium',
        message: 'Hero image has low-quality alt text',
        details: {
          imagePath: heroAnalysis.path,
          currentAlt: heroAnalysis.altText,
          quality: heroAnalysis.altQuality,
        },
        contentId: content.id,
      });
    }
  }

  // Card image issues
  if (cardAnalysis && !cardAnalysis.hasAlt) {
    issues.push({
      id: `card-no-alt-${content.id}`,
      type: 'missing_alt_text',
      severity: 'medium',
      message: 'Card image is missing alt text',
      details: { imagePath: cardAnalysis.path },
      contentId: content.id,
    });
  }

  // Duplicate issues
  for (const dupPath of duplicates.internalDuplicates) {
    issues.push({
      id: `dup-${dupPath}-${content.id}`,
      type: 'duplicate_image',
      severity: 'low',
      message: 'Same image is used multiple times in this content',
      details: { imagePath: dupPath },
      contentId: content.id,
    });
  }

  // Gallery images without alt text
  const galleryWithoutAlt = galleryAnalyses.filter(img => !img.hasAlt);
  if (galleryWithoutAlt.length > 0) {
    issues.push({
      id: `gallery-missing-alt-${content.id}`,
      type: 'gallery_missing_alt',
      severity: 'medium',
      message: `${galleryWithoutAlt.length} gallery image(s) missing alt text`,
      details: {
        count: galleryWithoutAlt.length,
        paths: galleryWithoutAlt.map(img => img.path),
      },
      contentId: content.id,
    });
  }

  return issues;
}
