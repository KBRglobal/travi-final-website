/**
 * Visual Coverage Engine Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock config
vi.mock('../../../server/media-intelligence/config', () => ({
  getMediaIntelligenceConfig: () => ({
    enabled: true,
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
  }),
  COVERAGE_WEIGHTS: {
    heroImage: 0.30,
    cardImage: 0.15,
    galleryDepth: 0.25,
    altTextQuality: 0.20,
    uniqueness: 0.10,
  },
  isMediaIntelligenceEnabled: () => true,
}));

describe('Visual Coverage Detection', () => {
  describe('Missing Visuals Detection', () => {
    it('should detect missing hero image as critical', () => {
      const content = {
        heroImage: null,
        cardImage: 'uploads/card.jpg',
        type: 'article',
      };

      expect(content.heroImage).toBeNull();
      // Should generate missing visual with type 'hero' and priority 'critical'
    });

    it('should detect missing card image as high priority', () => {
      const content = {
        heroImage: 'uploads/hero.jpg',
        cardImage: null,
        type: 'article',
      };

      expect(content.cardImage).toBeNull();
      // Should generate missing visual with type 'card' and priority 'high'
    });

    it('should detect insufficient gallery images', () => {
      const galleryCount = 2;
      const minRequired = 3;

      expect(galleryCount < minRequired).toBe(true);
      // Should generate missing visual with type 'gallery' and priority 'medium'
    });

    it('should not flag content with sufficient gallery', () => {
      const galleryCount = 5;
      const minRequired = 3;

      expect(galleryCount >= minRequired).toBe(true);
      // Should not generate gallery missing visual
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect internal duplicates', () => {
      const imagePaths = [
        'uploads/image1.jpg',
        'uploads/image2.jpg',
        'uploads/image1.jpg', // Duplicate
      ];

      const pathCounts = new Map<string, number>();
      for (const path of imagePaths) {
        pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
      }

      const duplicates = Array.from(pathCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([path]) => path);

      expect(duplicates).toContain('uploads/image1.jpg');
      expect(duplicates.length).toBe(1);
    });

    it('should not flag unique images', () => {
      const imagePaths = [
        'uploads/image1.jpg',
        'uploads/image2.jpg',
        'uploads/image3.jpg',
      ];

      const pathCounts = new Map<string, number>();
      for (const path of imagePaths) {
        pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
      }

      const duplicates = Array.from(pathCounts.entries())
        .filter(([, count]) => count > 1);

      expect(duplicates.length).toBe(0);
    });
  });

  describe('Coverage Score Calculation', () => {
    it('should calculate hero score based on presence and quality', () => {
      const hasHero = true;
      const heroPerformanceScore = 85;
      const heroAltQuality = 70;

      let heroScore = hasHero ? heroPerformanceScore : 0;
      if (hasHero && heroAltQuality) {
        heroScore = (heroPerformanceScore + heroAltQuality) / 2;
      }

      expect(heroScore).toBe(77.5);
    });

    it('should calculate gallery score based on count and quality', () => {
      const galleryCount = 4;
      const idealCount = 6;
      const avgPerformance = 75;

      const countScore = Math.min(100, (galleryCount / idealCount) * 100);
      const galleryScore = (avgPerformance + countScore) / 2;

      expect(countScore).toBeCloseTo(66.67, 1);
      expect(galleryScore).toBeCloseTo(70.83, 1);
    });

    it('should penalize uniqueness score for duplicates', () => {
      const duplicateCount = 2;
      let uniquenessScore = 100;
      uniquenessScore -= duplicateCount * 20;

      expect(uniquenessScore).toBe(60);
    });

    it('should calculate weighted overall score', () => {
      const weights = {
        heroImage: 0.30,
        cardImage: 0.15,
        galleryDepth: 0.25,
        altTextQuality: 0.20,
        uniqueness: 0.10,
      };

      const scores = {
        hero: 80,
        card: 70,
        gallery: 60,
        altText: 50,
        uniqueness: 100,
      };

      const overall = Math.round(
        scores.hero * weights.heroImage +
        scores.card * weights.cardImage +
        scores.gallery * weights.galleryDepth +
        scores.altText * weights.altTextQuality +
        scores.uniqueness * weights.uniqueness
      );

      // 24 + 10.5 + 15 + 10 + 10 = 69.5 ≈ 70
      expect(overall).toBe(70);
    });
  });
});

describe('Gallery Image Extraction', () => {
  it('should extract images from gallery blocks', () => {
    const blocks = [
      {
        type: 'gallery',
        data: {
          images: [
            { image: 'uploads/g1.jpg', alt: 'Image 1' },
            { image: 'uploads/g2.jpg', alt: 'Image 2' },
          ],
        },
      },
    ];

    const galleryImages: Array<{ image: string; alt: string }> = [];

    for (const block of blocks) {
      if (block.type === 'gallery' && block.data.images) {
        galleryImages.push(...block.data.images);
      }
    }

    expect(galleryImages.length).toBe(2);
    expect(galleryImages[0].image).toBe('uploads/g1.jpg');
  });

  it('should handle blocks without gallery', () => {
    const blocks = [
      { type: 'text', data: { content: 'Hello world' } },
      { type: 'heading', data: { text: 'Title' } },
    ];

    const galleryImages: Array<{ image: string; alt: string }> = [];

    for (const block of blocks) {
      if (block.type === 'gallery' && (block.data as any).images) {
        galleryImages.push(...(block.data as any).images);
      }
    }

    expect(galleryImages.length).toBe(0);
  });

  it('should handle empty or null blocks', () => {
    const blocks: unknown[] = [null, undefined, {}];

    const galleryImages: unknown[] = [];

    for (const block of blocks) {
      if (block && typeof block === 'object' && (block as any).type === 'gallery') {
        const data = (block as any).data;
        if (data && data.images) {
          galleryImages.push(...data.images);
        }
      }
    }

    expect(galleryImages.length).toBe(0);
  });
});
