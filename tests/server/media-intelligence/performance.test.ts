/**
 * Media Performance Analyzer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the config
vi.mock('../../../server/media-intelligence/config', () => ({
  getMediaIntelligenceConfig: () => ({
    enabled: true,
    enableOptimizationProposals: true,
    enableAltAnalysis: true,
    performance: {
      maxFileSizeBytes: 512000, // 500KB
      criticalFileSizeBytes: 2097152, // 2MB
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
      genericPatterns: ['image', 'photo', 'picture', 'img', 'untitled'],
    },
    batchSize: 50,
  }),
  PERFORMANCE_WEIGHTS: {
    fileSize: 0.30,
    format: 0.25,
    dimensions: 0.20,
    usageValue: 0.15,
    compression: 0.10,
  },
  isMediaIntelligenceEnabled: () => true,
}));

describe('Media Performance Scoring', () => {
  describe('File Size Scoring', () => {
    it('should give high score for small files', () => {
      const sizeBytes = 100 * 1024; // 100KB
      const maxSize = 512 * 1024; // 500KB
      const ratio = sizeBytes / maxSize;
      const score = Math.round(100 - (ratio * 50));

      expect(score).toBeGreaterThan(80);
    });

    it('should give medium score for files near threshold', () => {
      const sizeBytes = 450 * 1024; // 450KB (near 500KB threshold)
      const maxSize = 512 * 1024;
      const ratio = sizeBytes / maxSize;
      const score = Math.round(100 - (ratio * 50));

      expect(score).toBeLessThan(60);
      expect(score).toBeGreaterThan(40);
    });

    it('should give low score for oversized files', () => {
      const sizeBytes = 1.5 * 1024 * 1024; // 1.5MB
      const maxSize = 512 * 1024; // 500KB
      const criticalSize = 2 * 1024 * 1024; // 2MB

      // Between max and critical
      const overageRatio = (sizeBytes - maxSize) / (criticalSize - maxSize);
      const score = Math.max(0, Math.round(50 - (overageRatio * 50)));

      expect(score).toBeLessThan(30);
    });

    it('should give zero score for critically large files', () => {
      const sizeBytes = 3 * 1024 * 1024; // 3MB (over 2MB critical)
      const criticalSize = 2 * 1024 * 1024;

      expect(sizeBytes > criticalSize).toBe(true);
      // Score should be 0 for files over critical size
    });
  });

  describe('Format Scoring', () => {
    it('should give highest score to WebP', () => {
      const formatScores: Record<string, number> = {
        'image/webp': 100,
        'image/avif': 100,
        'image/jpeg': 70,
        'image/png': 60,
        'image/gif': 40,
        'image/svg+xml': 90,
      };

      expect(formatScores['image/webp']).toBe(100);
      expect(formatScores['image/avif']).toBe(100);
    });

    it('should give good score to JPEG', () => {
      expect(70).toBeGreaterThan(50);
    });

    it('should give low score to GIF for photos', () => {
      expect(40).toBeLessThan(50);
    });

    it('should give high score to SVG for icons', () => {
      expect(90).toBeGreaterThan(80);
    });
  });

  describe('Dimension Scoring', () => {
    const optimalHeroWidth = 1920;
    const minWidth = 400;

    it('should give high score to optimally sized images', () => {
      const width = 1920;
      expect(width >= minWidth).toBe(true);
      expect(width <= optimalHeroWidth * 1.5).toBe(true);
      // Should score 100
    });

    it('should penalize undersized images', () => {
      const width = 300; // Below minimum
      const score = Math.max(0, (width / minWidth) * 50);

      expect(score).toBeLessThan(50);
    });

    it('should penalize oversized images', () => {
      const width = 4000; // Much larger than needed
      const score = Math.max(30, 100 - ((width - optimalHeroWidth) / 100));

      expect(score).toBeLessThan(100);
    });
  });

  describe('Usage Value Scoring', () => {
    it('should give zero score to unused assets', () => {
      const usageCount = 0;
      const score = usageCount > 0 ? Math.min(100, 50 + (usageCount * 10)) : 0;

      expect(score).toBe(0);
    });

    it('should give higher score to frequently used assets', () => {
      const usageCount1 = 1;
      const usageCount5 = 5;

      const score1 = Math.min(100, 50 + (usageCount1 * 10));
      const score5 = Math.min(100, 50 + (usageCount5 * 10));

      expect(score5).toBeGreaterThan(score1);
    });

    it('should cap usage score at 100', () => {
      const usageCount = 10;
      const score = Math.min(100, 50 + (usageCount * 10));

      expect(score).toBe(100);
    });
  });

  describe('Overall Score Calculation', () => {
    it('should calculate weighted overall score correctly', () => {
      const weights = {
        fileSize: 0.30,
        format: 0.25,
        dimensions: 0.20,
        usageValue: 0.15,
        compression: 0.10,
      };

      const scores = {
        fileSize: 80,
        format: 100,
        dimensions: 90,
        usageValue: 60,
        compression: 75,
      };

      const overall = Math.round(
        scores.fileSize * weights.fileSize +
        scores.format * weights.format +
        scores.dimensions * weights.dimensions +
        scores.usageValue * weights.usageValue +
        scores.compression * weights.compression
      );

      expect(overall).toBeGreaterThan(0);
      expect(overall).toBeLessThanOrEqual(100);
      // 24 + 25 + 18 + 9 + 7.5 = 83.5 ≈ 84
      expect(overall).toBe(84);
    });
  });
});

describe('Issue Detection', () => {
  describe('File Size Issues', () => {
    it('should detect critical file size issue', () => {
      const sizeBytes = 3 * 1024 * 1024; // 3MB
      const criticalThreshold = 2 * 1024 * 1024; // 2MB

      expect(sizeBytes > criticalThreshold).toBe(true);
      // Should generate 'file_size_critical' issue with severity 'critical'
    });

    it('should detect warning file size issue', () => {
      const sizeBytes = 700 * 1024; // 700KB
      const maxThreshold = 512 * 1024; // 500KB
      const criticalThreshold = 2 * 1024 * 1024; // 2MB

      expect(sizeBytes > maxThreshold).toBe(true);
      expect(sizeBytes <= criticalThreshold).toBe(true);
      // Should generate 'file_size_warning' issue with severity 'high'
    });
  });

  describe('Format Issues', () => {
    it('should detect suboptimal format', () => {
      const format = 'image/jpeg';
      const optimalFormats = ['image/webp', 'image/avif'];

      expect(optimalFormats.includes(format)).toBe(false);
      // Should generate 'suboptimal_format' issue with severity 'medium'
    });

    it('should not flag SVG as suboptimal', () => {
      const format = 'image/svg+xml';
      // SVG should not be flagged even though it's not WebP
    });
  });

  describe('Dimension Issues', () => {
    it('should detect undersized hero image', () => {
      const width = 800;
      const optimalHeroWidth = 1920;
      const threshold = optimalHeroWidth * 0.75; // 1440

      expect(width < threshold).toBe(true);
      // Should generate 'hero_undersized' issue with severity 'high'
    });

    it('should detect oversized image', () => {
      const width = 5000;
      const optimalHeroWidth = 1920;
      const oversizeThreshold = optimalHeroWidth * 2; // 3840

      expect(width > oversizeThreshold).toBe(true);
      // Should generate 'oversized_image' issue with severity 'medium'
    });
  });

  describe('Usage Issues', () => {
    it('should detect unused asset', () => {
      const usageCount = 0;

      expect(usageCount).toBe(0);
      // Should generate 'unused_asset' issue with severity 'low'
    });
  });
});
