/**
 * Media Intelligence v2 - Scoring Engine
 *
 * Deterministic scoring with weights and thresholds
 */

import {
  MediaAssetV2,
  MediaQualityScore,
  MediaGrade,
  MediaIssue,
  IssueSeverity,
  IssueType,
  RemediationRecommendation,
  PlacementRole,
  DEFAULT_SCORING_WEIGHTS,
  SIZE_THRESHOLDS,
  ScoringWeights,
} from './types-v2';

/**
 * Score an individual media asset
 */
export function scoreMediaAsset(
  asset: MediaAssetV2,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): MediaQualityScore {
  const issues: MediaIssue[] = [];
  const recommendations: RemediationRecommendation[] = [];
  let score = 100;
  let recId = 0;

  // 1. Alt text checks
  const altScore = scoreAltText(asset, issues, recommendations, recId);
  score -= (weights.altTextPresent + weights.altTextQuality) - altScore.score;
  recId = altScore.recId;

  // 2. Size appropriateness for placement
  const sizeScore = scoreSizeForPlacement(asset, issues, recommendations, recId);
  score -= weights.appropriateSize - sizeScore.score;
  recId = sizeScore.recId;

  // 3. Format optimization
  const formatScore = scoreFormat(asset, issues, recommendations, recId);
  score -= weights.optimalFormat - formatScore.score;
  recId = formatScore.recId;

  // 4. Orphan check
  const orphanScore = scoreOrphanStatus(asset, issues, recommendations, recId);
  score -= weights.hasUsage - orphanScore.score;
  recId = orphanScore.recId;

  // 5. Performance optimization
  const perfScore = scorePerformance(asset, issues, recommendations, recId);
  score -= weights.performanceOptimized - perfScore.score;

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Calculate sub-scores
  const seoScore = calculateSEOScore(asset, issues);
  const aeoScore = calculateAEOScore(asset, issues);
  const uxScore = calculateUXScore(asset, issues);
  const revenueScore = calculateRevenueReadinessScore(asset, issues);

  return {
    assetId: asset.id,
    score,
    grade: scoreToGrade(score),
    issues,
    recommendations: recommendations.sort((a, b) => b.impactScore - a.impactScore),
    seoScore,
    aeoScore,
    uxScore,
    revenueReadinessScore: revenueScore,
    scoredAt: new Date(),
  };
}

/**
 * Convert score to grade
 */
export function scoreToGrade(score: number): MediaGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Score alt text presence and quality
 */
function scoreAltText(
  asset: MediaAssetV2,
  issues: MediaIssue[],
  recommendations: RemediationRecommendation[],
  recId: number
): { score: number; recId: number } {
  let score = 35; // Max for alt text (25 + 10)

  if (!asset.classifier.altText) {
    score -= 25;
    issues.push({
      type: 'missing_alt',
      severity: 'critical',
      description: 'Image is missing alt text, which severely impacts accessibility and SEO',
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'generate_alt',
      description: 'Generate or add descriptive alt text for this image',
      fixCost: 'low',
      impactScore: 90,
      autoFixable: true,
    });
  } else if (asset.classifier.altTextQuality === 'poor') {
    score -= 10;
    issues.push({
      type: 'low_quality_alt',
      severity: 'medium',
      description: `Alt text "${asset.classifier.altText}" appears to be low quality or generic`,
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'generate_alt',
      description: 'Improve alt text with more descriptive content',
      fixCost: 'low',
      impactScore: 60,
      autoFixable: true,
    });
  }

  return { score, recId };
}

/**
 * Score size appropriateness for placement
 */
function scoreSizeForPlacement(
  asset: MediaAssetV2,
  issues: MediaIssue[],
  recommendations: RemediationRecommendation[],
  recId: number
): { score: number; recId: number } {
  let score = 20; // Max

  const primaryPlacement = asset.linkage.primaryPlacement || 'unknown';
  const thresholds = SIZE_THRESHOLDS[primaryPlacement];

  // Check minimum dimensions
  if (asset.classifier.width < thresholds.minWidth || asset.classifier.height < thresholds.minHeight) {
    score -= 15;
    issues.push({
      type: 'too_small_for_placement',
      severity: 'high',
      description: `Image is ${asset.classifier.width}x${asset.classifier.height}px, but ${primaryPlacement} placement requires at least ${thresholds.minWidth}x${thresholds.minHeight}px`,
      context: { placement: primaryPlacement, required: thresholds },
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'replace_hero',
      description: `Replace with higher resolution image (minimum ${thresholds.minWidth}x${thresholds.minHeight}px)`,
      fixCost: 'medium',
      impactScore: 85,
      autoFixable: false,
    });
  }

  // Check file size
  if (asset.classifier.fileSize > thresholds.maxBytes) {
    score -= 5;
    const oversizeKB = Math.round((asset.classifier.fileSize - thresholds.maxBytes) / 1024);
    issues.push({
      type: 'oversized_file',
      severity: 'medium',
      description: `File is ${oversizeKB}KB larger than recommended for ${primaryPlacement} placement`,
      context: { currentBytes: asset.classifier.fileSize, maxBytes: thresholds.maxBytes },
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'compress',
      description: `Compress image to under ${Math.round(thresholds.maxBytes / 1024)}KB`,
      fixCost: 'low',
      impactScore: 50,
      autoFixable: true,
    });
  }

  return { score, recId };
}

/**
 * Score format optimization
 */
function scoreFormat(
  asset: MediaAssetV2,
  issues: MediaIssue[],
  recommendations: RemediationRecommendation[],
  recId: number
): { score: number; recId: number } {
  let score = 15; // Max

  const modernFormats = ['webp', 'avif'];
  const acceptableFormats = ['webp', 'avif', 'jpg', 'jpeg', 'png', 'svg'];

  if (!acceptableFormats.includes(asset.classifier.format.toLowerCase())) {
    score -= 15;
    issues.push({
      type: 'wrong_format',
      severity: 'high',
      description: `Format "${asset.classifier.format}" is not recommended for web use`,
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'convert_format',
      description: 'Convert to WebP for better compression and quality',
      fixCost: 'low',
      impactScore: 70,
      autoFixable: true,
    });
  } else if (!modernFormats.includes(asset.classifier.format.toLowerCase())) {
    score -= 5;
    issues.push({
      type: 'wrong_format',
      severity: 'low',
      description: `Image uses legacy format "${asset.classifier.format}", consider WebP/AVIF`,
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'convert_format',
      description: 'Convert to WebP for 25-35% smaller file size',
      fixCost: 'low',
      impactScore: 40,
      autoFixable: true,
    });
  }

  return { score, recId };
}

/**
 * Score orphan status
 */
function scoreOrphanStatus(
  asset: MediaAssetV2,
  issues: MediaIssue[],
  recommendations: RemediationRecommendation[],
  recId: number
): { score: number; recId: number } {
  let score = 10; // Max

  if (asset.classifier.isOrphan) {
    score -= 10;
    issues.push({
      type: 'orphaned',
      severity: 'medium',
      description: 'Image is not used by any content',
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'delete_orphan',
      description: 'Consider removing this unused image to reduce storage',
      fixCost: 'low',
      impactScore: 20,
      autoFixable: false,
      dryRunOnly: true,
    });
  }

  return { score, recId };
}

/**
 * Score performance optimization
 */
function scorePerformance(
  asset: MediaAssetV2,
  issues: MediaIssue[],
  recommendations: RemediationRecommendation[],
  recId: number
): { score: number; recId: number } {
  let score = 10; // Max

  // Check if excessively large for any web use
  if (asset.classifier.fileSize > 2 * 1024 * 1024) { // > 2MB
    score -= 7;
    issues.push({
      type: 'oversized_file',
      severity: 'high',
      description: `File is ${Math.round(asset.classifier.fileSize / 1024 / 1024 * 10) / 10}MB, too large for web`,
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'compress',
      description: 'Compress to under 500KB for optimal loading',
      fixCost: 'low',
      impactScore: 80,
      autoFixable: true,
    });
  }

  // Check if dimensions are missing (can't lazy load properly)
  if (!asset.classifier.width || !asset.classifier.height) {
    score -= 3;
    issues.push({
      type: 'missing_dimensions',
      severity: 'medium',
      description: 'Image dimensions are unknown, may cause layout shifts',
    });
    recommendations.push({
      id: `rec-${recId++}`,
      action: 'add_dimensions',
      description: 'Analyze and store image dimensions for proper lazy loading',
      fixCost: 'low',
      impactScore: 45,
      autoFixable: true,
    });
  }

  return { score, recId };
}

/**
 * Calculate SEO-specific score
 */
function calculateSEOScore(asset: MediaAssetV2, issues: MediaIssue[]): number {
  let score = 100;

  // Alt text is critical for SEO
  if (issues.some(i => i.type === 'missing_alt')) score -= 40;
  if (issues.some(i => i.type === 'low_quality_alt')) score -= 15;

  // File name quality (should be descriptive)
  if (asset.filename.match(/^IMG_|^DSC_|^\d+\./i)) {
    score -= 10;
  }

  // Format matters for Core Web Vitals
  if (issues.some(i => i.type === 'wrong_format')) score -= 15;
  if (issues.some(i => i.type === 'oversized_file')) score -= 20;

  return Math.max(0, score);
}

/**
 * Calculate AEO (Answer Engine Optimization) score
 */
function calculateAEOScore(asset: MediaAssetV2, issues: MediaIssue[]): number {
  let score = 100;

  // Alt text is critical for AI understanding
  if (issues.some(i => i.type === 'missing_alt')) score -= 50;
  if (issues.some(i => i.type === 'low_quality_alt')) score -= 20;

  // EXIF data helps with context
  if (!asset.classifier.hasExif) score -= 10;

  // Orphaned images don't contribute to AEO
  if (asset.classifier.isOrphan) score -= 20;

  return Math.max(0, score);
}

/**
 * Calculate UX score
 */
function calculateUXScore(asset: MediaAssetV2, issues: MediaIssue[]): number {
  let score = 100;

  // Size issues affect UX
  if (issues.some(i => i.type === 'too_small_for_placement')) score -= 35;
  if (issues.some(i => i.type === 'oversized_file')) score -= 25;

  // Missing dimensions cause layout shifts
  if (issues.some(i => i.type === 'missing_dimensions')) score -= 20;

  // Format affects loading speed
  if (issues.some(i => i.type === 'wrong_format' && i.severity !== 'low')) score -= 15;

  return Math.max(0, score);
}

/**
 * Calculate revenue readiness score
 */
function calculateRevenueReadinessScore(asset: MediaAssetV2, issues: MediaIssue[]): number {
  let score = 100;

  // Critical issues block revenue potential
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  score -= criticalIssues * 25;

  // High issues reduce revenue potential
  const highIssues = issues.filter(i => i.severity === 'high').length;
  score -= highIssues * 15;

  // Usage indicates value
  if (asset.linkage.totalReferences === 0) score -= 20;

  // Performance data indicates value
  if (asset.performance.available && asset.performance.ctr > 0.02) {
    score = Math.min(100, score + 10); // Bonus for good performing assets
  }

  return Math.max(0, score);
}

/**
 * Check alt text quality
 */
export function assessAltTextQuality(altText: string | undefined): 'good' | 'poor' | 'missing' {
  if (!altText || altText.trim() === '') return 'missing';

  const text = altText.toLowerCase().trim();

  // Check for generic/poor alt text patterns
  const poorPatterns = [
    /^image$/,
    /^photo$/,
    /^picture$/,
    /^img_/,
    /^dsc_/,
    /^\d+$/,
    /^untitled$/,
    /^undefined$/,
    /^null$/,
    /^\.jpg$/,
    /^\.png$/,
    /^image of$/,
    /^picture of$/,
  ];

  for (const pattern of poorPatterns) {
    if (pattern.test(text)) return 'poor';
  }

  // Too short is likely poor
  if (text.length < 10) return 'poor';

  // Too long is also problematic
  if (text.length > 300) return 'poor';

  return 'good';
}

/**
 * Detect placement role from context
 */
export function detectPlacementRole(
  field: string,
  blockType?: string,
  position?: number
): PlacementRole {
  const fieldLower = field.toLowerCase();
  const blockLower = blockType?.toLowerCase() || '';

  if (fieldLower.includes('hero') || blockLower.includes('hero')) return 'hero';
  if (fieldLower.includes('thumbnail') || blockLower.includes('thumbnail')) return 'thumbnail';
  if (fieldLower.includes('card') || blockLower.includes('card')) return 'card';
  if (fieldLower.includes('background') || blockLower.includes('background')) return 'background';
  if (fieldLower.includes('icon') || blockLower.includes('icon')) return 'icon';
  if (position === 0) return 'hero'; // First image is often hero

  return 'inline';
}

/**
 * Calculate simple perceptual hash (difference hash)
 * For duplicate detection - returns hex string
 */
export function calculateSimpleHash(
  width: number,
  height: number,
  fileSize: number,
  format: string
): string {
  // Simple hash based on characteristics (real impl would use pixel data)
  const data = `${width}x${height}:${fileSize}:${format}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
