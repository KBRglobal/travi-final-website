/**
 * Media & Image Intelligence - Analyzer
 */

import {
  ImageMetadata,
  ImageAnalysis,
  ImageQuality,
  QualityIssue,
  OptimizationSuggestion,
  AltTextSuggestion,
  MediaUsage,
} from './types';

// In-memory stores
const imageMetadata = new Map<string, ImageMetadata>();
const imageAnalyses = new Map<string, ImageAnalysis>();
const mediaUsages = new Map<string, MediaUsage>();

/**
 * Analyze image.
 */
export async function analyzeImage(imageId: string): Promise<ImageAnalysis | null> {
  const metadata = imageMetadata.get(imageId);
  if (!metadata) return null;

  // Mock analysis - in production would use image processing library
  const analysis: ImageAnalysis = {
    imageId,
    dominantColors: extractDominantColors(metadata),
    brightness: calculateBrightness(),
    contrast: calculateContrast(),
    sharpness: calculateSharpness(),
    hasText: false,
    faces: [],
    objects: detectObjects(metadata),
    tags: generateTags(metadata),
    quality: assessQuality(metadata),
    analyzedAt: new Date(),
  };

  imageAnalyses.set(imageId, analysis);
  return analysis;
}

/**
 * Extract dominant colors (mock).
 */
function extractDominantColors(_metadata: ImageMetadata): string[] {
  return ['#3366FF', '#FFFFFF', '#333333'];
}

/**
 * Calculate brightness (mock).
 */
function calculateBrightness(): number {
  return 0.5 + Math.random() * 0.3;
}

/**
 * Calculate contrast (mock).
 */
function calculateContrast(): number {
  return 0.4 + Math.random() * 0.4;
}

/**
 * Calculate sharpness (mock).
 */
function calculateSharpness(): number {
  return 0.6 + Math.random() * 0.3;
}

/**
 * Detect objects (mock).
 */
function detectObjects(metadata: ImageMetadata): Array<{ label: string; confidence: number; boundingBox: { x: number; y: number; width: number; height: number } }> {
  const objects = [];
  if (metadata.filename.includes('beach')) {
    objects.push({
      label: 'beach',
      confidence: 0.92,
      boundingBox: { x: 0, y: 0, width: metadata.width, height: metadata.height },
    });
  }
  if (metadata.filename.includes('hotel')) {
    objects.push({
      label: 'building',
      confidence: 0.88,
      boundingBox: { x: 0, y: 0, width: metadata.width, height: metadata.height },
    });
  }
  return objects;
}

/**
 * Generate tags (mock).
 */
function generateTags(metadata: ImageMetadata): string[] {
  const tags: string[] = [];
  const filename = metadata.filename.toLowerCase();

  if (filename.includes('beach')) tags.push('beach', 'ocean', 'travel');
  if (filename.includes('hotel')) tags.push('hotel', 'accommodation', 'travel');
  if (filename.includes('food')) tags.push('food', 'restaurant', 'dining');
  if (filename.includes('city')) tags.push('city', 'urban', 'architecture');

  if (metadata.width > 1920) tags.push('high-resolution');
  if (metadata.hasAlpha) tags.push('transparent');

  return tags;
}

/**
 * Assess image quality.
 */
function assessQuality(metadata: ImageMetadata): ImageQuality {
  const issues: QualityIssue[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check resolution
  if (metadata.width < 800 || metadata.height < 600) {
    issues.push({
      type: 'low_resolution',
      severity: 'high',
      description: 'Image resolution is too low for quality display',
    });
    score -= 25;
    recommendations.push('Use a higher resolution image (minimum 800x600)');
  }

  // Check file size
  if (metadata.fileSize > 2 * 1024 * 1024) {
    issues.push({
      type: 'oversized',
      severity: 'medium',
      description: 'Image file size is too large',
    });
    score -= 15;
    recommendations.push('Compress the image to reduce file size');
  }

  // Check format
  if (!['webp', 'avif'].includes(metadata.format)) {
    issues.push({
      type: 'wrong_format',
      severity: 'low',
      description: 'Image is not in a modern format',
    });
    score -= 10;
    recommendations.push('Convert to WebP for better compression');
  }

  return {
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}

/**
 * Get optimization suggestions.
 */
export function getOptimizationSuggestions(imageId: string): OptimizationSuggestion | null {
  const metadata = imageMetadata.get(imageId);
  if (!metadata) return null;

  const targetWidth = Math.min(metadata.width, 1920);
  const targetHeight = Math.round((targetWidth / metadata.width) * metadata.height);
  const estimatedNewSize = Math.round(metadata.fileSize * 0.4); // WebP typically 60% smaller

  return {
    imageId,
    currentSize: metadata.fileSize,
    suggestedSize: estimatedNewSize,
    suggestedFormat: 'webp',
    suggestedDimensions: { width: targetWidth, height: targetHeight },
    estimatedSavings: metadata.fileSize - estimatedNewSize,
    reason: 'Convert to WebP and resize for optimal web delivery',
  };
}

/**
 * Generate alt text suggestion.
 */
export function suggestAltText(imageId: string, currentAlt?: string): AltTextSuggestion | null {
  const analysis = imageAnalyses.get(imageId);
  const metadata = imageMetadata.get(imageId);

  if (!metadata) return null;

  const basedOn: string[] = [];
  let suggestedAlt = '';

  // Use detected objects
  if (analysis?.objects.length) {
    const objects = analysis.objects.map(o => o.label).join(', ');
    suggestedAlt = `Image showing ${objects}`;
    basedOn.push('object detection');
  }

  // Use tags
  if (analysis?.tags.length && !suggestedAlt) {
    suggestedAlt = `Image related to ${analysis.tags.slice(0, 3).join(', ')}`;
    basedOn.push('image tags');
  }

  // Use filename as fallback
  if (!suggestedAlt) {
    const name = metadata.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    suggestedAlt = `Image: ${name}`;
    basedOn.push('filename');
  }

  return {
    imageId,
    currentAlt,
    suggestedAlt,
    confidence: basedOn.includes('object detection') ? 0.85 : 0.6,
    basedOn,
  };
}

/**
 * Register image metadata.
 */
export function registerImage(metadata: Omit<ImageMetadata, 'createdAt' | 'updatedAt'>): ImageMetadata {
  const image: ImageMetadata = {
    ...metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  imageMetadata.set(metadata.id, image);
  return image;
}

/**
 * Track media usage.
 */
export function trackMediaUsage(mediaId: string, contentId: string, field: string): void {
  const existing = mediaUsages.get(mediaId) || {
    mediaId,
    usedIn: [],
    usageCount: 0,
  };

  // Check if already tracked
  const alreadyTracked = existing.usedIn.some(
    u => u.contentId === contentId && u.field === field
  );

  if (!alreadyTracked) {
    existing.usedIn.push({ contentId, field, addedAt: new Date() });
    existing.usageCount++;
    existing.lastUsed = new Date();
    mediaUsages.set(mediaId, existing);
  }
}

/**
 * Get media usage.
 */
export function getMediaUsage(mediaId: string): MediaUsage | null {
  return mediaUsages.get(mediaId) || null;
}

/**
 * Find unused media.
 */
export function findUnusedMedia(): ImageMetadata[] {
  const usedIds = new Set(mediaUsages.keys());
  return Array.from(imageMetadata.values())
    .filter(m => !usedIds.has(m.id));
}

/**
 * Get analysis.
 */
export function getImageAnalysis(imageId: string): ImageAnalysis | null {
  return imageAnalyses.get(imageId) || null;
}

/**
 * Get images needing optimization.
 */
export function getImagesNeedingOptimization(limit: number = 50): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  for (const metadata of imageMetadata.values()) {
    if (suggestions.length >= limit) break;

    const suggestion = getOptimizationSuggestions(metadata.id);
    if (suggestion && suggestion.estimatedSavings > 50000) { // > 50KB savings
      suggestions.push(suggestion);
    }
  }

  return suggestions.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
}

/**
 * Get media stats.
 */
export function getMediaStats(): {
  totalImages: number;
  analyzedImages: number;
  totalSize: number;
  unusedCount: number;
  averageQuality: number;
} {
  const images = Array.from(imageMetadata.values());
  const analyses = Array.from(imageAnalyses.values());
  const unused = findUnusedMedia();

  const totalSize = images.reduce((sum, img) => sum + img.fileSize, 0);
  const avgQuality = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.quality.score, 0) / analyses.length
    : 0;

  return {
    totalImages: images.length,
    analyzedImages: analyses.length,
    totalSize,
    unusedCount: unused.length,
    averageQuality: Math.round(avgQuality),
  };
}
