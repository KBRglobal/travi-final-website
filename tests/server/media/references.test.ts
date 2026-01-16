/**
 * Media Library Reference Detection Tests
 *
 * Tests for extracting media references from content blocks
 * and detecting orphaned assets.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeMediaPath,
  extractMediaReferencesFromString,
  extractMediaReferencesFromBlocks,
  extractMediaReferencesFromContent,
  parseAndExtractReferences,
  deduplicateReferences,
} from '../../../server/media/library/references';
import type { ContentBlock } from '@shared/schema';

describe('Media Reference Detection', () => {
  describe('normalizeMediaPath', () => {
    it('should normalize relative paths', () => {
      expect(normalizeMediaPath('uploads/image.jpg')).toBe('uploads/image.jpg');
      expect(normalizeMediaPath('attached_assets/doc.pdf')).toBe('attached_assets/doc.pdf');
    });

    it('should normalize absolute paths', () => {
      expect(normalizeMediaPath('/uploads/image.jpg')).toBe('uploads/image.jpg');
      expect(normalizeMediaPath('/attached_assets/doc.pdf')).toBe('attached_assets/doc.pdf');
    });

    it('should normalize full URLs', () => {
      expect(normalizeMediaPath('https://example.com/uploads/image.jpg')).toBe('uploads/image.jpg');
      expect(normalizeMediaPath('http://localhost:3000/uploads/test.png')).toBe('uploads/test.png');
    });

    it('should handle paths with subdirectories', () => {
      expect(normalizeMediaPath('uploads/ai-generated/image.jpg')).toBe('uploads/ai-generated/image.jpg');
      expect(normalizeMediaPath('/uploads/2024/01/photo.png')).toBe('uploads/2024/01/photo.png');
    });

    it('should handle empty and invalid inputs', () => {
      expect(normalizeMediaPath('')).toBe('');
      expect(normalizeMediaPath(null as any)).toBe('');
      expect(normalizeMediaPath(undefined as any)).toBe('');
    });

    it('should handle URLs with query strings', () => {
      expect(normalizeMediaPath('uploads/image.jpg?v=123')).toBe('uploads/image.jpg');
      expect(normalizeMediaPath('/uploads/photo.png?width=800&height=600')).toBe('uploads/photo.png');
    });
  });

  describe('extractMediaReferencesFromString', () => {
    it('should extract upload paths from text', () => {
      const text = 'Check out this image: uploads/hero.jpg in the gallery';
      const refs = extractMediaReferencesFromString(text, 'test');

      expect(refs.length).toBe(1);
      expect(refs[0].normalizedPath).toBe('uploads/hero.jpg');
    });

    it('should extract multiple paths', () => {
      const text = `
        Hero: uploads/hero.jpg
        Card: attached_assets/card.png
        Gallery: uploads/gallery/photo1.webp
      `;
      const refs = extractMediaReferencesFromString(text, 'test');

      expect(refs.length).toBe(3);
      expect(refs.map(r => r.normalizedPath)).toContain('uploads/hero.jpg');
      expect(refs.map(r => r.normalizedPath)).toContain('attached_assets/card.png');
      expect(refs.map(r => r.normalizedPath)).toContain('uploads/gallery/photo1.webp');
    });

    it('should extract paths from JSON-like strings', () => {
      const json = '{"image": "uploads/test.jpg", "background": "/uploads/bg.png"}';
      const refs = extractMediaReferencesFromString(json, 'test');

      expect(refs.length).toBe(2);
    });

    it('should handle strings with no media references', () => {
      const text = 'This is just regular text without any media';
      const refs = extractMediaReferencesFromString(text, 'test');

      expect(refs.length).toBe(0);
    });

    it('should deduplicate references in same string', () => {
      const text = 'Image: uploads/same.jpg, again: uploads/same.jpg';
      const refs = extractMediaReferencesFromString(text, 'test');

      expect(refs.length).toBe(1);
    });
  });

  describe('extractMediaReferencesFromBlocks', () => {
    it('should extract from image block', () => {
      const blocks: ContentBlock[] = [
        {
          type: 'image',
          data: {
            image: 'uploads/content-image.jpg',
            alt: 'A test image',
          },
        },
      ];
      const refs = extractMediaReferencesFromBlocks(blocks, 'content-123');

      expect(refs.length).toBe(1);
      expect(refs[0].normalizedPath).toBe('uploads/content-image.jpg');
      expect(refs[0].contentId).toBe('content-123');
    });

    it('should extract from gallery block', () => {
      const blocks: ContentBlock[] = [
        {
          type: 'gallery',
          data: {
            images: [
              { image: 'uploads/gallery1.jpg', alt: 'Photo 1' },
              { image: 'uploads/gallery2.png', alt: 'Photo 2' },
              { image: 'attached_assets/gallery3.webp', alt: 'Photo 3' },
            ],
          },
        },
      ];
      const refs = extractMediaReferencesFromBlocks(blocks, 'content-123');

      expect(refs.length).toBe(3);
      expect(refs.map(r => r.normalizedPath)).toContain('uploads/gallery1.jpg');
      expect(refs.map(r => r.normalizedPath)).toContain('uploads/gallery2.png');
      expect(refs.map(r => r.normalizedPath)).toContain('attached_assets/gallery3.webp');
    });

    it('should extract from hero block', () => {
      const blocks: ContentBlock[] = [
        {
          type: 'hero',
          data: {
            backgroundImage: 'uploads/hero-bg.jpg',
            title: 'Welcome',
          },
        },
      ];
      const refs = extractMediaReferencesFromBlocks(blocks);

      expect(refs.length).toBeGreaterThan(0);
      expect(refs.some(r => r.normalizedPath === 'uploads/hero-bg.jpg')).toBe(true);
    });

    it('should extract from room_cards block', () => {
      const blocks: ContentBlock[] = [
        {
          type: 'room_cards',
          data: {
            rooms: [
              { image: 'uploads/room1.jpg', title: 'Deluxe Room' },
              { image: 'uploads/room2.jpg', title: 'Suite' },
            ],
          },
        },
      ];
      const refs = extractMediaReferencesFromBlocks(blocks);

      expect(refs.length).toBe(2);
    });

    it('should handle empty or null blocks', () => {
      expect(extractMediaReferencesFromBlocks(null)).toEqual([]);
      expect(extractMediaReferencesFromBlocks(undefined)).toEqual([]);
      expect(extractMediaReferencesFromBlocks([])).toEqual([]);
    });

    it('should handle malformed blocks gracefully', () => {
      const blocks: any[] = [
        null,
        undefined,
        { type: 'text' }, // no data
        { data: { image: 'uploads/test.jpg' } }, // no type
        { type: 'image', data: null }, // null data
      ];

      // Should not throw
      const refs = extractMediaReferencesFromBlocks(blocks as ContentBlock[]);
      expect(Array.isArray(refs)).toBe(true);
    });

    it('should handle deeply nested structures', () => {
      const blocks: ContentBlock[] = [
        {
          type: 'custom',
          data: {
            nested: {
              deeply: {
                image: 'uploads/nested-image.jpg',
              },
            },
          },
        },
      ];
      const refs = extractMediaReferencesFromBlocks(blocks);

      expect(refs.some(r => r.normalizedPath === 'uploads/nested-image.jpg')).toBe(true);
    });
  });

  describe('extractMediaReferencesFromContent', () => {
    it('should extract from heroImage field', () => {
      const content = {
        id: 'content-1',
        heroImage: 'uploads/hero.jpg',
        blocks: [],
      };
      const refs = extractMediaReferencesFromContent(content);

      expect(refs.length).toBe(1);
      expect(refs[0].normalizedPath).toBe('uploads/hero.jpg');
      expect(refs[0].source).toBe('heroImage');
    });

    it('should extract from cardImage field', () => {
      const content = {
        id: 'content-2',
        cardImage: 'uploads/card.png',
        blocks: [],
      };
      const refs = extractMediaReferencesFromContent(content);

      expect(refs.length).toBe(1);
      expect(refs[0].normalizedPath).toBe('uploads/card.png');
      expect(refs[0].source).toBe('cardImage');
    });

    it('should extract from all sources', () => {
      const content = {
        id: 'content-3',
        heroImage: 'uploads/hero.jpg',
        cardImage: 'uploads/card.png',
        blocks: [
          {
            type: 'image',
            data: { image: 'uploads/block-image.jpg' },
          },
        ],
      };
      const refs = extractMediaReferencesFromContent(content);

      expect(refs.length).toBe(3);
      expect(refs.map(r => r.normalizedPath)).toContain('uploads/hero.jpg');
      expect(refs.map(r => r.normalizedPath)).toContain('uploads/card.png');
      expect(refs.map(r => r.normalizedPath)).toContain('uploads/block-image.jpg');
    });

    it('should handle content with no media', () => {
      const content = {
        id: 'content-4',
        blocks: [{ type: 'text', data: { content: 'Just text' } }],
      };
      const refs = extractMediaReferencesFromContent(content);

      expect(refs.length).toBe(0);
    });
  });

  describe('parseAndExtractReferences', () => {
    it('should parse valid JSON and extract references', () => {
      const json = JSON.stringify({
        hero: { image: 'uploads/hero.jpg' },
        gallery: [
          { image: 'uploads/g1.jpg' },
          { image: 'uploads/g2.png' },
        ],
      });
      const refs = parseAndExtractReferences(json, 'test');

      expect(refs.length).toBe(3);
    });

    it('should fall back to regex for malformed JSON', () => {
      const malformedJson = '{ "image": "uploads/test.jpg", broken: }';
      const refs = parseAndExtractReferences(malformedJson, 'test');

      // Should still find the reference via regex
      expect(refs.length).toBeGreaterThan(0);
      expect(refs[0].normalizedPath).toBe('uploads/test.jpg');
    });

    it('should handle completely invalid input', () => {
      const refs = parseAndExtractReferences('not json at all', 'test');
      expect(Array.isArray(refs)).toBe(true);
    });
  });

  describe('deduplicateReferences', () => {
    it('should remove duplicate paths', () => {
      const refs = [
        { path: 'uploads/same.jpg', normalizedPath: 'uploads/same.jpg', source: 'a' },
        { path: '/uploads/same.jpg', normalizedPath: 'uploads/same.jpg', source: 'b' },
        { path: 'uploads/different.png', normalizedPath: 'uploads/different.png', source: 'c' },
      ];
      const deduped = deduplicateReferences(refs);

      expect(deduped.length).toBe(2);
    });

    it('should keep first occurrence', () => {
      const refs = [
        { path: 'uploads/test.jpg', normalizedPath: 'uploads/test.jpg', source: 'first' },
        { path: 'uploads/test.jpg', normalizedPath: 'uploads/test.jpg', source: 'second' },
      ];
      const deduped = deduplicateReferences(refs);

      expect(deduped.length).toBe(1);
      expect(deduped[0].source).toBe('first');
    });

    it('should handle empty array', () => {
      expect(deduplicateReferences([])).toEqual([]);
    });
  });
});

describe('Orphan Detection Mock Scenarios', () => {
  // These tests simulate orphan detection logic without DB

  const mockAssets = [
    { id: '1', path: 'uploads/used-image.jpg' },
    { id: '2', path: 'uploads/orphan-image.png' },
    { id: '3', path: 'uploads/gallery/photo.webp' },
    { id: '4', path: 'attached_assets/doc.pdf' },
  ];

  const mockContent = [
    {
      id: 'content-1',
      heroImage: 'uploads/used-image.jpg',
      blocks: [
        { type: 'gallery', data: { images: [{ image: 'uploads/gallery/photo.webp' }] } },
      ],
    },
    {
      id: 'content-2',
      blocks: [
        { type: 'text', data: { content: 'Check attached_assets/doc.pdf for details' } },
      ],
    },
  ];

  it('should identify referenced assets', () => {
    const allRefs = mockContent.flatMap(content =>
      extractMediaReferencesFromContent(content)
    );
    const referencedPaths = new Set(allRefs.map(r => r.normalizedPath));

    // Also check text content for references
    for (const content of mockContent) {
      for (const block of content.blocks || []) {
        if (block.data && typeof block.data === 'object') {
          const jsonStr = JSON.stringify(block.data);
          const textRefs = extractMediaReferencesFromString(jsonStr, 'block');
          for (const ref of textRefs) {
            referencedPaths.add(ref.normalizedPath);
          }
        }
      }
    }

    expect(referencedPaths.has('uploads/used-image.jpg')).toBe(true);
    expect(referencedPaths.has('uploads/gallery/photo.webp')).toBe(true);
    expect(referencedPaths.has('attached_assets/doc.pdf')).toBe(true);
  });

  it('should identify orphaned assets', () => {
    const allRefs = mockContent.flatMap(content =>
      extractMediaReferencesFromContent(content)
    );
    const referencedPaths = new Set(allRefs.map(r => r.normalizedPath));

    // Also scan text content
    for (const content of mockContent) {
      for (const block of content.blocks || []) {
        if (block.data) {
          const textRefs = extractMediaReferencesFromString(
            JSON.stringify(block.data),
            'block'
          );
          for (const ref of textRefs) {
            referencedPaths.add(ref.normalizedPath);
          }
        }
      }
    }

    const orphans = mockAssets.filter(asset => !referencedPaths.has(asset.path));

    expect(orphans.length).toBe(1);
    expect(orphans[0].path).toBe('uploads/orphan-image.png');
  });

  it('should handle content with no blocks', () => {
    const content = {
      id: 'empty',
      heroImage: null,
      blocks: null,
    };

    const refs = extractMediaReferencesFromContent(content as any);
    expect(refs.length).toBe(0);
  });

  it('should handle complex gallery structures', () => {
    const complexBlocks: ContentBlock[] = [
      {
        type: 'gallery',
        data: {
          images: [
            {
              image: 'uploads/g1.jpg',
              alt: 'Test',
              thumbnail: 'uploads/g1-thumb.jpg',
            },
            {
              image: 'uploads/g2.jpg',
              alt: 'Test 2',
            },
          ],
        },
      },
    ];

    const refs = extractMediaReferencesFromBlocks(complexBlocks);

    // Should find both main images and thumbnails
    expect(refs.some(r => r.normalizedPath === 'uploads/g1.jpg')).toBe(true);
    expect(refs.some(r => r.normalizedPath === 'uploads/g2.jpg')).toBe(true);
  });
});
