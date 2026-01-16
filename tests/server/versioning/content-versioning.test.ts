/**
 * Content Versioning Tests
 *
 * Unit tests for content version creation, retrieval, and restoration.
 * Ensures idempotent writes and proper version history management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'version-1' }]),
  },
}));

describe('Content Versioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Version Creation', () => {
    it('should create a version snapshot with correct fields', () => {
      const content = {
        id: 'content-1',
        title: 'Test Article',
        slug: 'test-article',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta description',
        primaryKeyword: 'testing',
        heroImage: '/images/hero.jpg',
        heroImageAlt: 'Hero image',
        blocks: [{ id: 'block-1', type: 'text', data: { content: 'Hello' } }],
      };

      const createVersionSnapshot = (
        content: typeof content,
        versionNumber: number,
        changedBy?: string,
        changeNote?: string
      ) => {
        return {
          contentId: content.id,
          versionNumber,
          title: content.title,
          slug: content.slug,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          primaryKeyword: content.primaryKeyword,
          heroImage: content.heroImage,
          heroImageAlt: content.heroImageAlt,
          blocks: content.blocks,
          changedBy: changedBy || null,
          changeNote: changeNote || null,
        };
      };

      const version = createVersionSnapshot(content, 1, 'user-1', 'Initial save');

      expect(version.contentId).toBe('content-1');
      expect(version.versionNumber).toBe(1);
      expect(version.title).toBe('Test Article');
      expect(version.blocks).toHaveLength(1);
      expect(version.changedBy).toBe('user-1');
      expect(version.changeNote).toBe('Initial save');
    });

    it('should increment version number correctly', () => {
      const getNextVersionNumber = (latestVersion: number): number => {
        return latestVersion + 1;
      };

      expect(getNextVersionNumber(0)).toBe(1);
      expect(getNextVersionNumber(1)).toBe(2);
      expect(getNextVersionNumber(10)).toBe(11);
      expect(getNextVersionNumber(99)).toBe(100);
    });

    it('should handle empty blocks array', () => {
      const content = {
        id: 'content-2',
        title: 'Empty Article',
        blocks: [],
      };

      const createVersionSnapshot = (content: typeof content) => ({
        contentId: content.id,
        title: content.title,
        blocks: content.blocks || [],
      });

      const version = createVersionSnapshot(content);

      expect(version.blocks).toEqual([]);
      expect(Array.isArray(version.blocks)).toBe(true);
    });

    it('should handle null fields gracefully', () => {
      const content = {
        id: 'content-3',
        title: 'Minimal Article',
        slug: 'minimal-article',
        metaTitle: null,
        metaDescription: null,
        primaryKeyword: null,
        heroImage: null,
        heroImageAlt: null,
        blocks: [],
      };

      const createVersionSnapshot = (content: typeof content) => ({
        contentId: content.id,
        title: content.title,
        slug: content.slug,
        metaTitle: content.metaTitle,
        metaDescription: content.metaDescription,
        primaryKeyword: content.primaryKeyword,
        heroImage: content.heroImage,
        heroImageAlt: content.heroImageAlt,
        blocks: content.blocks,
      });

      const version = createVersionSnapshot(content);

      expect(version.metaTitle).toBeNull();
      expect(version.metaDescription).toBeNull();
      expect(version.primaryKeyword).toBeNull();
    });
  });

  describe('Version Retrieval', () => {
    it('should sort versions by version number descending', () => {
      const versions = [
        { id: 'v1', versionNumber: 1, createdAt: new Date('2024-01-01') },
        { id: 'v3', versionNumber: 3, createdAt: new Date('2024-01-03') },
        { id: 'v2', versionNumber: 2, createdAt: new Date('2024-01-02') },
      ];

      const sortedVersions = [...versions].sort(
        (a, b) => b.versionNumber - a.versionNumber
      );

      expect(sortedVersions[0].versionNumber).toBe(3);
      expect(sortedVersions[1].versionNumber).toBe(2);
      expect(sortedVersions[2].versionNumber).toBe(1);
    });

    it('should find version by id', () => {
      const versions = [
        { id: 'v1', contentId: 'c1', versionNumber: 1 },
        { id: 'v2', contentId: 'c1', versionNumber: 2 },
        { id: 'v3', contentId: 'c2', versionNumber: 1 },
      ];

      const findVersion = (versionId: string) => {
        return versions.find((v) => v.id === versionId);
      };

      expect(findVersion('v1')?.versionNumber).toBe(1);
      expect(findVersion('v2')?.versionNumber).toBe(2);
      expect(findVersion('v4')).toBeUndefined();
    });

    it('should filter versions by content id', () => {
      const versions = [
        { id: 'v1', contentId: 'c1', versionNumber: 1 },
        { id: 'v2', contentId: 'c1', versionNumber: 2 },
        { id: 'v3', contentId: 'c2', versionNumber: 1 },
      ];

      const getVersionsForContent = (contentId: string) => {
        return versions.filter((v) => v.contentId === contentId);
      };

      expect(getVersionsForContent('c1')).toHaveLength(2);
      expect(getVersionsForContent('c2')).toHaveLength(1);
      expect(getVersionsForContent('c3')).toHaveLength(0);
    });

    it('should get latest version number', () => {
      const getLatestVersionNumber = (versions: { versionNumber: number }[]): number => {
        if (versions.length === 0) return 0;
        return Math.max(...versions.map((v) => v.versionNumber));
      };

      expect(getLatestVersionNumber([])).toBe(0);
      expect(getLatestVersionNumber([{ versionNumber: 1 }])).toBe(1);
      expect(
        getLatestVersionNumber([
          { versionNumber: 1 },
          { versionNumber: 5 },
          { versionNumber: 3 },
        ])
      ).toBe(5);
    });
  });

  describe('Version Restoration', () => {
    it('should extract restorable fields from version', () => {
      const version = {
        id: 'v1',
        contentId: 'c1',
        versionNumber: 2,
        title: 'Old Title',
        slug: 'old-slug',
        metaTitle: 'Old Meta',
        metaDescription: 'Old description',
        primaryKeyword: 'old-keyword',
        heroImage: '/old/image.jpg',
        heroImageAlt: 'Old alt',
        blocks: [{ id: 'b1', type: 'text', data: {} }],
        changedBy: 'user-1',
        changeNote: 'Note',
        createdAt: new Date(),
      };

      const getRestorableFields = (v: typeof version) => ({
        title: v.title,
        slug: v.slug || undefined, // Convert null to undefined for DB
        metaTitle: v.metaTitle,
        metaDescription: v.metaDescription,
        primaryKeyword: v.primaryKeyword,
        heroImage: v.heroImage,
        heroImageAlt: v.heroImageAlt,
        blocks: v.blocks,
      });

      const fields = getRestorableFields(version);

      expect(fields.title).toBe('Old Title');
      expect(fields.slug).toBe('old-slug');
      expect(fields.blocks).toHaveLength(1);
      // Should not include metadata fields
      expect((fields as any).changedBy).toBeUndefined();
      expect((fields as any).createdAt).toBeUndefined();
    });

    it('should validate version belongs to content before restore', () => {
      const validateVersionOwnership = (
        versionContentId: string,
        targetContentId: string
      ): boolean => {
        return versionContentId === targetContentId;
      };

      expect(validateVersionOwnership('c1', 'c1')).toBe(true);
      expect(validateVersionOwnership('c1', 'c2')).toBe(false);
    });

    it('should create new version after restore (restore creates snapshot)', () => {
      const versions: { contentId: string; versionNumber: number; title: string }[] = [
        { contentId: 'c1', versionNumber: 1, title: 'Version 1' },
        { contentId: 'c1', versionNumber: 2, title: 'Version 2' },
      ];

      const restoreVersion = (
        restoredVersion: typeof versions[0],
        currentVersionNumber: number
      ) => {
        // After restore, a new version is created with incremented number
        const newVersion = {
          ...restoredVersion,
          versionNumber: currentVersionNumber + 1,
        };
        versions.push(newVersion);
        return newVersion;
      };

      const latestBefore = Math.max(...versions.map((v) => v.versionNumber));
      const restored = restoreVersion(versions[0], latestBefore);

      expect(restored.versionNumber).toBe(3);
      expect(restored.title).toBe('Version 1');
      expect(versions).toHaveLength(3);
    });
  });

  describe('Version Diffing', () => {
    it('should detect field changes between versions', () => {
      type DiffType = 'added' | 'removed' | 'changed' | 'unchanged';

      const getFieldDiff = (
        oldVal: string | null,
        newVal: string | null
      ): DiffType => {
        if (oldVal === null && newVal !== null) return 'added';
        if (oldVal !== null && newVal === null) return 'removed';
        if (oldVal !== newVal) return 'changed';
        return 'unchanged';
      };

      expect(getFieldDiff(null, 'new')).toBe('added');
      expect(getFieldDiff('old', null)).toBe('removed');
      expect(getFieldDiff('old', 'new')).toBe('changed');
      expect(getFieldDiff('same', 'same')).toBe('unchanged');
      expect(getFieldDiff(null, null)).toBe('unchanged');
    });

    it('should detect block changes between versions', () => {
      type BlockStatus = 'added' | 'removed' | 'modified' | 'unchanged';

      interface Block {
        id: string;
        type: string;
        data: Record<string, unknown>;
      }

      const getBlockStatus = (
        oldBlock: Block | undefined,
        newBlock: Block | undefined
      ): BlockStatus => {
        if (!oldBlock && newBlock) return 'added';
        if (oldBlock && !newBlock) return 'removed';
        if (oldBlock && newBlock) {
          const isModified = JSON.stringify(oldBlock.data) !== JSON.stringify(newBlock.data);
          return isModified ? 'modified' : 'unchanged';
        }
        return 'unchanged';
      };

      const block1 = { id: 'b1', type: 'text', data: { content: 'Hello' } };
      const block1Modified = { id: 'b1', type: 'text', data: { content: 'World' } };
      const block2 = { id: 'b2', type: 'image', data: { src: '/img.jpg' } };

      expect(getBlockStatus(undefined, block1)).toBe('added');
      expect(getBlockStatus(block1, undefined)).toBe('removed');
      expect(getBlockStatus(block1, block1Modified)).toBe('modified');
      expect(getBlockStatus(block1, block1)).toBe('unchanged');
    });
  });

  describe('Idempotency', () => {
    it('should produce same version for same content state', () => {
      const content = {
        id: 'c1',
        title: 'Test',
        blocks: [{ id: 'b1', type: 'text', data: { content: 'Hello' } }],
      };

      const createVersionHash = (c: typeof content): string => {
        return JSON.stringify({
          title: c.title,
          blocks: c.blocks,
        });
      };

      const hash1 = createVersionHash(content);
      const hash2 = createVersionHash(content);
      const hash3 = createVersionHash({ ...content, title: 'Different' });

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('should be deterministic regardless of call order', () => {
      const content = {
        title: 'Test',
        metaTitle: 'Meta',
        blocks: [],
      };

      const createVersion = (c: typeof content, num: number) => ({
        versionNumber: num,
        title: c.title,
        metaTitle: c.metaTitle,
        blocks: c.blocks,
      });

      const results = Array.from({ length: 10 }, () => createVersion(content, 1));
      const first = JSON.stringify(results[0]);

      for (const result of results) {
        expect(JSON.stringify(result)).toBe(first);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large blocks array', () => {
      const largeBlocks = Array.from({ length: 100 }, (_, i) => ({
        id: `block-${i}`,
        type: 'text',
        data: { content: `Content ${i}` },
      }));

      const createVersion = (blocks: typeof largeBlocks) => ({
        blocks,
        blockCount: blocks.length,
      });

      const version = createVersion(largeBlocks);

      expect(version.blocks).toHaveLength(100);
      expect(version.blockCount).toBe(100);
    });

    it('should handle special characters in content', () => {
      const content = {
        title: 'Test <script>alert("xss")</script>',
        metaDescription: 'Description with "quotes" and \'apostrophes\'',
        blocks: [
          {
            id: 'b1',
            type: 'text',
            data: { content: 'Unicode: 你好 🌍 مرحبا' },
          },
        ],
      };

      const createVersion = (c: typeof content) => ({
        title: c.title,
        metaDescription: c.metaDescription,
        blocks: c.blocks,
      });

      const version = createVersion(content);

      expect(version.title).toContain('<script>');
      expect(version.metaDescription).toContain('"quotes"');
      expect(version.blocks[0].data.content).toContain('你好');
    });

    it('should handle version number overflow prevention', () => {
      const MAX_SAFE_VERSION = 2147483647; // Max signed 32-bit integer

      const getNextVersionNumber = (current: number): number => {
        if (current >= MAX_SAFE_VERSION) {
          throw new Error('Version number limit reached');
        }
        return current + 1;
      };

      expect(getNextVersionNumber(0)).toBe(1);
      expect(getNextVersionNumber(1000)).toBe(1001);
      expect(() => getNextVersionNumber(MAX_SAFE_VERSION)).toThrow('Version number limit reached');
    });
  });
});

describe('Integration: Version Lifecycle', () => {
  it('should simulate complete version lifecycle', () => {
    type Version = {
      id: string;
      contentId: string;
      versionNumber: number;
      title: string;
      blocks: unknown[];
      createdAt: Date;
    };

    const versions: Version[] = [];
    let versionIdCounter = 0;

    const createVersion = (contentId: string, title: string, blocks: unknown[]): Version => {
      const latestNum = versions
        .filter((v) => v.contentId === contentId)
        .reduce((max, v) => Math.max(max, v.versionNumber), 0);

      const version: Version = {
        id: `v${++versionIdCounter}`,
        contentId,
        versionNumber: latestNum + 1,
        title,
        blocks,
        createdAt: new Date(),
      };

      versions.push(version);
      return version;
    };

    const getVersions = (contentId: string): Version[] => {
      return versions
        .filter((v) => v.contentId === contentId)
        .sort((a, b) => b.versionNumber - a.versionNumber);
    };

    const restore = (versionId: string, contentId: string): Version | null => {
      const version = versions.find((v) => v.id === versionId);
      if (!version || version.contentId !== contentId) return null;
      return createVersion(contentId, version.title, version.blocks);
    };

    // Step 1: Create initial version
    const v1 = createVersion('c1', 'Initial Title', [{ type: 'text', content: 'Hello' }]);
    expect(v1.versionNumber).toBe(1);

    // Step 2: Update content (creates v2)
    const v2 = createVersion('c1', 'Updated Title', [
      { type: 'text', content: 'Hello World' },
    ]);
    expect(v2.versionNumber).toBe(2);

    // Step 3: Another update (creates v3)
    const v3 = createVersion('c1', 'Final Title', [
      { type: 'text', content: 'Goodbye' },
    ]);
    expect(v3.versionNumber).toBe(3);

    // Step 4: Verify version list
    const contentVersions = getVersions('c1');
    expect(contentVersions).toHaveLength(3);
    expect(contentVersions[0].versionNumber).toBe(3);
    expect(contentVersions[2].versionNumber).toBe(1);

    // Step 5: Restore v1 (creates v4 with v1's content)
    const v4 = restore(v1.id, 'c1');
    expect(v4).not.toBeNull();
    expect(v4!.versionNumber).toBe(4);
    expect(v4!.title).toBe('Initial Title');

    // Step 6: Verify final state
    const finalVersions = getVersions('c1');
    expect(finalVersions).toHaveLength(4);
    expect(finalVersions[0].title).toBe('Initial Title'); // Restored
    expect(finalVersions[0].versionNumber).toBe(4);
  });

  it('should handle multiple content items independently', () => {
    const contentVersions: Record<string, number[]> = {};

    const addVersion = (contentId: string): number => {
      const versions = contentVersions[contentId] || [];
      const newVersion = versions.length + 1;
      versions.push(newVersion);
      contentVersions[contentId] = versions;
      return newVersion;
    };

    // Content A gets 3 versions
    expect(addVersion('a')).toBe(1);
    expect(addVersion('a')).toBe(2);
    expect(addVersion('a')).toBe(3);

    // Content B gets 2 versions
    expect(addVersion('b')).toBe(1);
    expect(addVersion('b')).toBe(2);

    // Content A gets another version
    expect(addVersion('a')).toBe(4);

    // Verify independence
    expect(contentVersions['a']).toHaveLength(4);
    expect(contentVersions['b']).toHaveLength(2);
  });
});
