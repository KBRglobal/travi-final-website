/**
 * Technical SEO Audit - Checks Tests
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_CHECKS, SeoCheckType } from './types';

describe('SEO Audit Checks', () => {
  describe('Default Checks Configuration', () => {
    it('has all required check types', () => {
      const requiredChecks: SeoCheckType[] = [
        'missing_meta',
        'duplicate_titles',
        'thin_content',
        'broken_internal_links',
        'orphan_pages',
        'no_schema',
        'no_aeo_capsule',
        'missing_h1',
        'multiple_h1',
        'missing_alt_text',
        'long_title',
        'short_meta',
      ];

      for (const checkType of requiredChecks) {
        const check = DEFAULT_CHECKS.find(c => c.type === checkType);
        expect(check).toBeDefined();
      }
    });

    it('all checks have required properties', () => {
      for (const check of DEFAULT_CHECKS) {
        expect(check.type).toBeDefined();
        expect(check.name).toBeDefined();
        expect(check.description).toBeDefined();
        expect(check.severity).toBeDefined();
        expect(typeof check.enabled).toBe('boolean');
      }
    });

    it('has correct severity assignments', () => {
      const criticalChecks = DEFAULT_CHECKS.filter(c => c.severity === 'critical');
      const highChecks = DEFAULT_CHECKS.filter(c => c.severity === 'high');

      expect(criticalChecks.some(c => c.type === 'broken_internal_links')).toBe(true);
      expect(highChecks.some(c => c.type === 'missing_meta')).toBe(true);
      expect(highChecks.some(c => c.type === 'duplicate_titles')).toBe(true);
      expect(highChecks.some(c => c.type === 'missing_h1')).toBe(true);
    });
  });

  describe('Check Logic', () => {
    describe('Thin Content Detection', () => {
      const MIN_WORDS = 300;

      function countWords(blocks: Array<{ type: string; data?: { text?: string } }>): number {
        let wordCount = 0;
        for (const block of blocks) {
          if (block.type === 'paragraph' || block.type === 'text') {
            const text = String(block.data?.text || '');
            wordCount += text.split(/\s+/).filter(w => w.length > 0).length;
          }
        }
        return wordCount;
      }

      it('detects thin content correctly', () => {
        const blocks = [
          { type: 'paragraph', data: { text: 'Short content with few words.' } },
        ];

        const wordCount = countWords(blocks);
        expect(wordCount < MIN_WORDS).toBe(true);
      });

      it('passes adequate content', () => {
        const longText = Array(100).fill('word').join(' '); // 100 words
        const blocks = [
          { type: 'paragraph', data: { text: longText } },
          { type: 'paragraph', data: { text: longText } },
          { type: 'paragraph', data: { text: longText } },
          { type: 'paragraph', data: { text: longText } },
        ];

        const wordCount = countWords(blocks);
        expect(wordCount >= MIN_WORDS).toBe(true);
      });
    });

    describe('Duplicate Title Detection', () => {
      function findDuplicates(titles: string[]): Map<string, string[]> {
        const titleMap = new Map<string, string[]>();

        titles.forEach((title, index) => {
          const normalized = title.toLowerCase().trim();
          const existing = titleMap.get(normalized) || [];
          existing.push(`id-${index}`);
          titleMap.set(normalized, existing);
        });

        return new Map(
          Array.from(titleMap.entries()).filter(([, ids]) => ids.length > 1)
        );
      }

      it('detects duplicate titles', () => {
        const titles = ['Test Article', 'Another Article', 'test article'];
        const duplicates = findDuplicates(titles);

        expect(duplicates.size).toBe(1);
        expect(duplicates.get('test article')?.length).toBe(2);
      });

      it('handles case insensitivity', () => {
        const titles = ['HELLO WORLD', 'Hello World', 'hello world'];
        const duplicates = findDuplicates(titles);

        expect(duplicates.size).toBe(1);
        expect(duplicates.get('hello world')?.length).toBe(3);
      });

      it('returns empty for unique titles', () => {
        const titles = ['First', 'Second', 'Third'];
        const duplicates = findDuplicates(titles);

        expect(duplicates.size).toBe(0);
      });
    });

    describe('H1 Detection', () => {
      function countH1(blocks: Array<{ type: string; data?: { level?: number } }>): number {
        return blocks.filter(
          b => (b.type === 'header' || b.type === 'heading') && b.data?.level === 1
        ).length;
      }

      it('counts H1 tags correctly', () => {
        const blocks = [
          { type: 'heading', data: { level: 1 } },
          { type: 'paragraph', data: {} },
          { type: 'heading', data: { level: 2 } },
        ];

        expect(countH1(blocks)).toBe(1);
      });

      it('detects multiple H1 tags', () => {
        const blocks = [
          { type: 'header', data: { level: 1 } },
          { type: 'header', data: { level: 1 } },
        ];

        expect(countH1(blocks)).toBe(2);
      });

      it('detects missing H1', () => {
        const blocks = [
          { type: 'heading', data: { level: 2 } },
          { type: 'heading', data: { level: 3 } },
        ];

        expect(countH1(blocks)).toBe(0);
      });
    });
  });

  describe('Score Calculation', () => {
    it('calculates score correctly', () => {
      const issues = {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      };

      const penalty =
        issues.critical * 15 +
        issues.high * 8 +
        issues.medium * 4 +
        issues.low * 1;

      // 1*15 + 2*8 + 3*4 + 4*1 = 15 + 16 + 12 + 4 = 47
      expect(penalty).toBe(47);

      const score = Math.max(0, 100 - penalty);
      expect(score).toBe(53);
    });

    it('caps score at 0', () => {
      const issues = {
        critical: 10,
        high: 10,
        medium: 10,
        low: 10,
      };

      const penalty =
        issues.critical * 15 +
        issues.high * 8 +
        issues.medium * 4 +
        issues.low * 1;

      const score = Math.max(0, 100 - penalty);
      expect(score).toBe(0);
    });

    it('perfect score with no issues', () => {
      const issues = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      const penalty =
        issues.critical * 15 +
        issues.high * 8 +
        issues.medium * 4 +
        issues.low * 1;

      const score = Math.max(0, 100 - penalty);
      expect(score).toBe(100);
    });
  });
});
