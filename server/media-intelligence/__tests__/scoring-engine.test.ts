/**
 * Media Intelligence v2 - Scoring Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  scoreMediaAsset,
  scoreToGrade,
  assessAltTextQuality,
  detectPlacementRole,
  calculateSimpleHash,
} from '../scoring-engine';
import { MediaAssetV2 } from '../types-v2';

describe('Scoring Engine', () => {
  describe('scoreToGrade', () => {
    it('should return A for scores >= 90', () => {
      expect(scoreToGrade(90)).toBe('A');
      expect(scoreToGrade(100)).toBe('A');
      expect(scoreToGrade(95)).toBe('A');
    });

    it('should return B for scores 80-89', () => {
      expect(scoreToGrade(80)).toBe('B');
      expect(scoreToGrade(89)).toBe('B');
    });

    it('should return C for scores 70-79', () => {
      expect(scoreToGrade(70)).toBe('C');
      expect(scoreToGrade(79)).toBe('C');
    });

    it('should return D for scores 60-69', () => {
      expect(scoreToGrade(60)).toBe('D');
      expect(scoreToGrade(69)).toBe('D');
    });

    it('should return F for scores < 60', () => {
      expect(scoreToGrade(59)).toBe('F');
      expect(scoreToGrade(0)).toBe('F');
    });
  });

  describe('assessAltTextQuality', () => {
    it('should return missing for empty or undefined alt text', () => {
      expect(assessAltTextQuality(undefined)).toBe('missing');
      expect(assessAltTextQuality('')).toBe('missing');
      expect(assessAltTextQuality('   ')).toBe('missing');
    });

    it('should return poor for generic alt text', () => {
      expect(assessAltTextQuality('image')).toBe('poor');
      expect(assessAltTextQuality('photo')).toBe('poor');
      expect(assessAltTextQuality('IMG_001')).toBe('poor');
      expect(assessAltTextQuality('123')).toBe('poor');
    });

    it('should return poor for very short alt text', () => {
      expect(assessAltTextQuality('hi')).toBe('poor');
      expect(assessAltTextQuality('abc')).toBe('poor');
    });

    it('should return good for descriptive alt text', () => {
      expect(assessAltTextQuality('A beautiful sunset over the ocean with orange and pink colors')).toBe('good');
      expect(assessAltTextQuality('Hotel lobby with marble floors and crystal chandelier')).toBe('good');
    });
  });

  describe('detectPlacementRole', () => {
    it('should detect hero placement', () => {
      expect(detectPlacementRole('heroImage', 'content')).toBe('hero');
      expect(detectPlacementRole('image', 'hero-block')).toBe('hero');
    });

    it('should detect card placement', () => {
      expect(detectPlacementRole('cardImage', 'content')).toBe('card');
      expect(detectPlacementRole('image', 'card-block')).toBe('card');
    });

    it('should detect thumbnail placement', () => {
      expect(detectPlacementRole('thumbnail', 'content')).toBe('thumbnail');
    });

    it('should detect first image as hero', () => {
      expect(detectPlacementRole('image', 'content', 0)).toBe('hero');
    });

    it('should return inline for unknown placements', () => {
      expect(detectPlacementRole('random', 'content', 5)).toBe('inline');
    });
  });

  describe('calculateSimpleHash', () => {
    it('should produce consistent hash for same inputs', () => {
      const hash1 = calculateSimpleHash(1920, 1080, 500000, 'jpg');
      const hash2 = calculateSimpleHash(1920, 1080, 500000, 'jpg');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different inputs', () => {
      const hash1 = calculateSimpleHash(1920, 1080, 500000, 'jpg');
      const hash2 = calculateSimpleHash(1920, 1080, 500001, 'jpg');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 8-character hex string', () => {
      const hash = calculateSimpleHash(1920, 1080, 500000, 'jpg');
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('scoreMediaAsset', () => {
    const createTestAsset = (overrides: Partial<MediaAssetV2> = {}): MediaAssetV2 => ({
      id: 'test-asset',
      url: 'https://example.com/image.jpg',
      filename: 'beautiful-beach.jpg',
      classifier: {
        type: 'image',
        format: 'webp',
        mimeType: 'image/webp',
        width: 1920,
        height: 1080,
        fileSize: 200000,
        hasExif: true,
        altText: 'A beautiful beach with crystal clear water',
        altTextQuality: 'good',
        duplicateSimilarityHash: 'abc12345',
        isOrphan: false,
        ...overrides.classifier,
      },
      linkage: {
        referencedByContentIds: ['content-1'],
        placementRoles: ['hero'],
        localeCoverage: ['en'],
        totalReferences: 1,
        primaryPlacement: 'hero',
        ...overrides.linkage,
      },
      performance: {
        impressions: 1000,
        clicks: 50,
        ctr: 0.05,
        available: true,
        ...overrides.performance,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('should score a well-optimized asset highly', () => {
      const asset = createTestAsset();
      const score = scoreMediaAsset(asset);

      expect(score.score).toBeGreaterThanOrEqual(80);
      expect(score.grade).toMatch(/^[AB]$/);
      expect(score.issues.length).toBeLessThanOrEqual(2);
    });

    it('should penalize missing alt text', () => {
      const asset = createTestAsset({
        classifier: {
          type: 'image',
          format: 'webp',
          mimeType: 'image/webp',
          width: 1920,
          height: 1080,
          fileSize: 200000,
          hasExif: true,
          altTextQuality: 'missing',
          duplicateSimilarityHash: 'abc12345',
          isOrphan: false,
        },
      });
      const score = scoreMediaAsset(asset);

      expect(score.score).toBeLessThan(80);
      expect(score.issues.some(i => i.type === 'missing_alt')).toBe(true);
      expect(score.recommendations.some(r => r.action === 'generate_alt')).toBe(true);
    });

    it('should penalize oversized files', () => {
      const asset = createTestAsset({
        classifier: {
          type: 'image',
          format: 'jpg',
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          fileSize: 3000000, // 3MB
          hasExif: true,
          altText: 'Test image',
          altTextQuality: 'good',
          duplicateSimilarityHash: 'abc12345',
          isOrphan: false,
        },
      });
      const score = scoreMediaAsset(asset);

      expect(score.issues.some(i => i.type === 'oversized_file')).toBe(true);
      expect(score.recommendations.some(r => r.action === 'compress')).toBe(true);
    });

    it('should penalize orphaned assets', () => {
      const asset = createTestAsset({
        classifier: {
          type: 'image',
          format: 'webp',
          mimeType: 'image/webp',
          width: 1920,
          height: 1080,
          fileSize: 200000,
          hasExif: true,
          altText: 'Test image',
          altTextQuality: 'good',
          duplicateSimilarityHash: 'abc12345',
          isOrphan: true,
        },
      });
      const score = scoreMediaAsset(asset);

      expect(score.issues.some(i => i.type === 'orphaned')).toBe(true);
    });

    it('should produce deterministic scores', () => {
      const asset = createTestAsset();
      const score1 = scoreMediaAsset(asset);
      const score2 = scoreMediaAsset(asset);

      expect(score1.score).toBe(score2.score);
      expect(score1.grade).toBe(score2.grade);
      expect(score1.issues.length).toBe(score2.issues.length);
    });

    it('should calculate sub-scores', () => {
      const asset = createTestAsset();
      const score = scoreMediaAsset(asset);

      expect(score.seoScore).toBeGreaterThanOrEqual(0);
      expect(score.seoScore).toBeLessThanOrEqual(100);
      expect(score.aeoScore).toBeGreaterThanOrEqual(0);
      expect(score.aeoScore).toBeLessThanOrEqual(100);
      expect(score.uxScore).toBeGreaterThanOrEqual(0);
      expect(score.uxScore).toBeLessThanOrEqual(100);
      expect(score.revenueReadinessScore).toBeGreaterThanOrEqual(0);
      expect(score.revenueReadinessScore).toBeLessThanOrEqual(100);
    });
  });
});
