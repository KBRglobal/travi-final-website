/**
 * Media Intelligence v2 - Asset Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerAsset,
  getAsset,
  trackAssetUsage,
  scoreAsset,
  getOrphanedAssets,
  findDuplicates,
  getAssetsMissingAlt,
  clearCaches,
  getCacheStats,
} from '../asset-manager';

describe('Asset Manager', () => {
  beforeEach(() => {
    clearCaches();
  });

  describe('registerAsset', () => {
    it('should register a new asset', () => {
      const asset = registerAsset('test-1', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      expect(asset.id).toBe('test-1');
      expect(asset.filename).toBe('test.jpg');
      expect(asset.classifier.width).toBe(1920);
    });

    it('should mark asset as orphan initially', () => {
      const asset = registerAsset('test-2', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      expect(asset.classifier.isOrphan).toBe(true);
    });

    it('should assess alt text quality', () => {
      const withAlt = registerAsset('test-3', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
        altText: 'A beautiful landscape with mountains and lake',
      });

      expect(withAlt.classifier.altTextQuality).toBe('good');

      const withoutAlt = registerAsset('test-4', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      expect(withoutAlt.classifier.altTextQuality).toBe('missing');
    });
  });

  describe('getAsset', () => {
    it('should retrieve registered asset', () => {
      registerAsset('test-5', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      const asset = getAsset('test-5');
      expect(asset).toBeDefined();
      expect(asset!.id).toBe('test-5');
    });

    it('should return undefined for non-existent asset', () => {
      const asset = getAsset('non-existent');
      expect(asset).toBeUndefined();
    });
  });

  describe('trackAssetUsage', () => {
    it('should update orphan status when used', () => {
      registerAsset('test-6', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      trackAssetUsage('test-6', 'content-1', 'heroImage', 'en');

      const asset = getAsset('test-6');
      expect(asset!.classifier.isOrphan).toBe(false);
      expect(asset!.linkage.referencedByContentIds).toContain('content-1');
    });

    it('should detect placement role', () => {
      registerAsset('test-7', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      trackAssetUsage('test-7', 'content-1', 'heroImage', 'en', 'hero-block', 0);

      const asset = getAsset('test-7');
      expect(asset!.linkage.primaryPlacement).toBe('hero');
    });

    it('should track locale coverage', () => {
      registerAsset('test-8', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      trackAssetUsage('test-8', 'content-1', 'image', 'en');
      trackAssetUsage('test-8', 'content-2', 'image', 'de');

      const asset = getAsset('test-8');
      expect(asset!.linkage.localeCoverage).toContain('en');
      expect(asset!.linkage.localeCoverage).toContain('de');
    });
  });

  describe('scoreAsset', () => {
    it('should score an asset', () => {
      registerAsset('test-9', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'webp',
        mimeType: 'image/webp',
        width: 1920,
        height: 1080,
        fileSize: 200000,
        altText: 'A descriptive alt text for the image',
      });

      trackAssetUsage('test-9', 'content-1', 'heroImage', 'en');

      const score = scoreAsset('test-9');
      expect(score).toBeDefined();
      expect(score!.score).toBeGreaterThanOrEqual(0);
      expect(score!.score).toBeLessThanOrEqual(100);
    });

    it('should cache scores', () => {
      registerAsset('test-10', 'https://example.com/img.jpg', 'test.jpg', {
        format: 'webp',
        mimeType: 'image/webp',
        width: 1920,
        height: 1080,
        fileSize: 200000,
      });

      const score1 = scoreAsset('test-10');
      const score2 = scoreAsset('test-10');

      expect(score1!.score).toBe(score2!.score);
    });
  });

  describe('getOrphanedAssets', () => {
    it('should find orphaned assets', () => {
      registerAsset('orphan-1', 'https://example.com/img1.jpg', 'img1.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        fileSize: 100000,
      });

      registerAsset('used-1', 'https://example.com/img2.jpg', 'img2.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        fileSize: 100000,
      });

      trackAssetUsage('used-1', 'content-1', 'image', 'en');

      const orphans = getOrphanedAssets();
      expect(orphans.some(o => o.id === 'orphan-1')).toBe(true);
      expect(orphans.some(o => o.id === 'used-1')).toBe(false);
    });
  });

  describe('getAssetsMissingAlt', () => {
    it('should find assets missing alt text', () => {
      registerAsset('no-alt', 'https://example.com/img1.jpg', 'img1.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        fileSize: 100000,
      });

      registerAsset('has-alt', 'https://example.com/img2.jpg', 'img2.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        fileSize: 100000,
        altText: 'A descriptive alt text',
      });

      const missing = getAssetsMissingAlt();
      expect(missing.some(a => a.id === 'no-alt')).toBe(true);
      expect(missing.some(a => a.id === 'has-alt')).toBe(false);
    });
  });

  describe('findDuplicates', () => {
    it('should find potential duplicates by hash', () => {
      // Same dimensions and size should produce same hash
      registerAsset('dup-1', 'https://example.com/img1.jpg', 'img1.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      registerAsset('dup-2', 'https://example.com/img2.jpg', 'img2.jpg', {
        format: 'jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSize: 500000,
      });

      const duplicates = findDuplicates();
      const matchingDupe = duplicates.find(d =>
        d.assetIds.includes('dup-1') && d.assetIds.includes('dup-2')
      );
      expect(matchingDupe).toBeDefined();
    });
  });

  describe('bounded cache', () => {
    it('should track cache size', () => {
      for (let i = 0; i < 10; i++) {
        registerAsset(`cache-test-${i}`, `https://example.com/img${i}.jpg`, `img${i}.jpg`, {
          format: 'jpg',
          mimeType: 'image/jpeg',
          width: 800,
          height: 600,
          fileSize: 100000,
        });
      }

      const stats = getCacheStats();
      expect(stats.assets.size).toBe(10);
    });
  });
});
