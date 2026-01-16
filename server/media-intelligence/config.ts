/**
 * Media Intelligence Configuration
 *
 * Feature flags and configuration for the Media Intelligence & Optimization Engine.
 * All features are disabled by default for safety.
 */

export interface MediaIntelligenceConfig {
  /** Master switch for the entire media intelligence system */
  enabled: boolean;
  /** Enable optimization proposals generation */
  enableOptimizationProposals: boolean;
  /** Enable alt text analysis */
  enableAltAnalysis: boolean;
  /** Performance thresholds */
  performance: {
    /** Maximum file size in bytes before warning (default: 500KB) */
    maxFileSizeBytes: number;
    /** Maximum file size in bytes before critical (default: 2MB) */
    criticalFileSizeBytes: number;
    /** Optimal width for hero images */
    optimalHeroWidth: number;
    /** Optimal width for card images */
    optimalCardWidth: number;
    /** Optimal width for gallery images */
    optimalGalleryWidth: number;
    /** Minimum acceptable image width */
    minImageWidth: number;
    /** Preferred formats (in order of preference) */
    preferredFormats: string[];
  };
  /** Visual coverage thresholds */
  coverage: {
    /** Minimum gallery images for good coverage */
    minGalleryImages: number;
    /** Ideal gallery images for excellent coverage */
    idealGalleryImages: number;
    /** Maximum reuse count before flagging as overused */
    maxImageReuseCount: number;
  };
  /** Alt text quality thresholds */
  altText: {
    /** Minimum alt text length */
    minLength: number;
    /** Maximum alt text length */
    maxLength: number;
    /** Generic alt text patterns to flag */
    genericPatterns: string[];
  };
  /** Batch processing limits */
  batchSize: number;
}

/**
 * Check if media intelligence is enabled
 */
export function isMediaIntelligenceEnabled(): boolean {
  return process.env.ENABLE_MEDIA_INTELLIGENCE === 'true';
}

/**
 * Check if optimization proposals are enabled
 */
export function isOptimizationProposalsEnabled(): boolean {
  return process.env.ENABLE_MEDIA_OPTIMIZATION_PROPOSALS !== 'false'; // Default true
}

/**
 * Check if alt text analysis is enabled
 */
export function isAltAnalysisEnabled(): boolean {
  return process.env.ENABLE_MEDIA_ALT_ANALYSIS !== 'false'; // Default true
}

/**
 * Get media intelligence configuration
 */
export function getMediaIntelligenceConfig(): MediaIntelligenceConfig {
  return {
    enabled: isMediaIntelligenceEnabled(),
    enableOptimizationProposals: isOptimizationProposalsEnabled(),
    enableAltAnalysis: isAltAnalysisEnabled(),
    performance: {
      maxFileSizeBytes: parseInt(process.env.MEDIA_MAX_FILE_SIZE || '512000', 10), // 500KB
      criticalFileSizeBytes: parseInt(process.env.MEDIA_CRITICAL_FILE_SIZE || '2097152', 10), // 2MB
      optimalHeroWidth: 1920,
      optimalCardWidth: 800,
      optimalGalleryWidth: 1200,
      minImageWidth: 400,
      preferredFormats: ['image/webp', 'image/avif', 'image/jpeg'],
    },
    coverage: {
      minGalleryImages: 3,
      idealGalleryImages: 6,
      maxImageReuseCount: 3,
    },
    altText: {
      minLength: 10,
      maxLength: 125,
      genericPatterns: [
        'image',
        'photo',
        'picture',
        'img',
        'untitled',
        'screenshot',
        'dsc_',
        'img_',
        'photo_',
      ],
    },
    batchSize: parseInt(process.env.MEDIA_INTELLIGENCE_BATCH_SIZE || '50', 10),
  };
}

/**
 * Performance score weight factors
 */
export const PERFORMANCE_WEIGHTS = {
  fileSize: 0.30,      // 30% - file size impact
  format: 0.25,        // 25% - format optimization
  dimensions: 0.20,    // 20% - appropriate sizing
  usageValue: 0.15,    // 15% - SEO/content value
  compression: 0.10,   // 10% - compression efficiency
};

/**
 * Visual coverage score weight factors
 */
export const COVERAGE_WEIGHTS = {
  heroImage: 0.30,     // 30% - hero image presence
  cardImage: 0.15,     // 15% - card image presence
  galleryDepth: 0.25,  // 25% - gallery image count
  altTextQuality: 0.20, // 20% - alt text coverage
  uniqueness: 0.10,    // 10% - image uniqueness
};

/**
 * Issue severity levels
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Recommendation types
 */
export type RecommendationType =
  | 'convert_format'
  | 'resize'
  | 'compress'
  | 'add_missing_image'
  | 'add_alt_text'
  | 'improve_alt_text'
  | 'remove_duplicate'
  | 'replace_stock'
  | 'add_gallery_images'
  | 'optimize_dimensions';

/**
 * Image context types for SEO/AEO value
 */
export type ImageContext =
  | 'hero'
  | 'card'
  | 'gallery'
  | 'inline'
  | 'background'
  | 'icon'
  | 'logo'
  | 'unknown';
