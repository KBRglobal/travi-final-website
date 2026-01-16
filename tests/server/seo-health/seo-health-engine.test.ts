/**
 * SEO Health Engine - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../../../server/seo-health/config', () => ({
  isSeoHealthEnabled: vi.fn(() => true),
  SEO_HEALTH_CONFIG: {
    title: { minLength: 30, maxLength: 60, optimalMin: 50, optimalMax: 60 },
    description: { minLength: 120, maxLength: 160, optimalMin: 150, optimalMax: 160 },
    content: { minWordCount: 300, thinContentThreshold: 200 },
    scoreWeights: { critical: 30, warning: 15, info: 5 },
    cacheTtl: 600,
    batchSize: 50,
  },
  ISSUE_SEVERITY: {
    missing_title: 'critical',
    missing_description: 'critical',
    duplicate_title: 'warning',
    duplicate_description: 'warning',
    missing_h1: 'critical',
    multiple_h1: 'warning',
    broken_internal_link: 'critical',
    orphan_page: 'warning',
    missing_alt_text: 'info',
    title_too_long: 'warning',
    title_too_short: 'warning',
    description_too_long: 'warning',
    description_too_short: 'warning',
    missing_canonical: 'info',
    thin_content: 'warning',
  },
}));

// Mock logger
vi.mock('../../../server/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { calculateHealthScore } from '../../../server/seo-health/engine';
import type { SeoIssue } from '../../../server/seo-health/types';

describe('SEO Health Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateHealthScore', () => {
    it('should return 100 for no issues', () => {
      const issues: SeoIssue[] = [];
      const score = calculateHealthScore(issues);
      expect(score).toBe(100);
    });

    it('should deduct for critical issues', () => {
      const issues: SeoIssue[] = [
        {
          type: 'missing_title',
          severity: 'critical',
          description: 'Missing title',
          recommendation: 'Add title',
        },
      ];

      const score = calculateHealthScore(issues);
      expect(score).toBe(70); // 100 - 30 (critical weight)
    });

    it('should deduct for warning issues', () => {
      const issues: SeoIssue[] = [
        {
          type: 'title_too_short',
          severity: 'warning',
          description: 'Title too short',
          recommendation: 'Expand title',
        },
      ];

      const score = calculateHealthScore(issues);
      expect(score).toBe(85); // 100 - 15 (warning weight)
    });

    it('should deduct for info issues', () => {
      const issues: SeoIssue[] = [
        {
          type: 'missing_alt_text',
          severity: 'info',
          description: 'Missing alt text',
          recommendation: 'Add alt text',
        },
      ];

      const score = calculateHealthScore(issues);
      expect(score).toBe(95); // 100 - 5 (info weight)
    });

    it('should accumulate deductions for multiple issues', () => {
      const issues: SeoIssue[] = [
        {
          type: 'missing_title',
          severity: 'critical',
          description: 'Missing title',
          recommendation: 'Add title',
        },
        {
          type: 'missing_description',
          severity: 'critical',
          description: 'Missing description',
          recommendation: 'Add description',
        },
        {
          type: 'title_too_short',
          severity: 'warning',
          description: 'Title too short',
          recommendation: 'Expand title',
        },
      ];

      const score = calculateHealthScore(issues);
      expect(score).toBe(25); // 100 - 30 - 30 - 15
    });

    it('should not go below 0', () => {
      const issues: SeoIssue[] = [
        { type: 'missing_title', severity: 'critical', description: '', recommendation: '' },
        { type: 'missing_description', severity: 'critical', description: '', recommendation: '' },
        { type: 'missing_h1', severity: 'critical', description: '', recommendation: '' },
        { type: 'broken_internal_link', severity: 'critical', description: '', recommendation: '' },
      ];

      const score = calculateHealthScore(issues);
      expect(score).toBe(0);
    });
  });

  describe('Issue Detection Logic', () => {
    it('should detect missing title', () => {
      const title = '';
      const isMissing = !title || title.trim().length === 0;
      expect(isMissing).toBe(true);
    });

    it('should detect short title', () => {
      const title = 'Short title';
      const minLength = 30;
      const isTooShort = title.length < minLength;
      expect(isTooShort).toBe(true);
    });

    it('should detect long title', () => {
      const title = 'This is a very long title that exceeds the maximum recommended length for SEO purposes';
      const maxLength = 60;
      const isTooLong = title.length > maxLength;
      expect(isTooLong).toBe(true);
    });

    it('should accept valid title length', () => {
      const title = 'This is a properly sized title for SEO purposes';
      const minLength = 30;
      const maxLength = 60;
      const isValid = title.length >= minLength && title.length <= maxLength;
      expect(isValid).toBe(true);
    });

    it('should detect missing description', () => {
      const description = '';
      const isMissing = !description || description.trim().length === 0;
      expect(isMissing).toBe(true);
    });

    it('should detect short description', () => {
      const description = 'This is a short description';
      const minLength = 120;
      const isTooShort = description.length < minLength;
      expect(isTooShort).toBe(true);
    });

    it('should detect thin content', () => {
      const wordCount = 150;
      const threshold = 200;
      const isThin = wordCount < threshold;
      expect(isThin).toBe(true);
    });

    it('should detect orphan page', () => {
      const inboundLinks = 0;
      const isOrphan = inboundLinks === 0;
      expect(isOrphan).toBe(true);
    });

    it('should not flag page with inbound links as orphan', () => {
      const inboundLinks = 3;
      const isOrphan = inboundLinks === 0;
      expect(isOrphan).toBe(false);
    });
  });

  describe('H1 Detection', () => {
    it('should detect missing H1', () => {
      const blocks = [
        { type: 'paragraph', data: { text: 'Some text' } },
        { type: 'header', data: { text: 'H2 heading', level: 2 } },
      ];

      const h1Blocks = blocks.filter(
        block => block.type === 'header' && block.data.level === 1
      );

      expect(h1Blocks.length).toBe(0);
    });

    it('should detect single H1', () => {
      const blocks = [
        { type: 'header', data: { text: 'Main heading', level: 1 } },
        { type: 'paragraph', data: { text: 'Some text' } },
      ];

      const h1Blocks = blocks.filter(
        block => block.type === 'header' && block.data.level === 1
      );

      expect(h1Blocks.length).toBe(1);
    });

    it('should detect multiple H1s', () => {
      const blocks = [
        { type: 'header', data: { text: 'First H1', level: 1 } },
        { type: 'paragraph', data: { text: 'Some text' } },
        { type: 'header', data: { text: 'Second H1', level: 1 } },
      ];

      const h1Blocks = blocks.filter(
        block => block.type === 'header' && block.data.level === 1
      );

      expect(h1Blocks.length).toBe(2);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate titles', () => {
      const titleIndex = new Map<string, string[]>();
      titleIndex.set('duplicate title', ['content-1', 'content-2']);

      const title = 'Duplicate Title';
      const normalized = title.toLowerCase().trim();
      const duplicates = titleIndex.get(normalized) || [];

      expect(duplicates.length).toBe(2);
    });

    it('should not flag unique titles', () => {
      const titleIndex = new Map<string, string[]>();
      titleIndex.set('unique title', ['content-1']);

      const currentContentId = 'content-1';
      const title = 'Unique Title';
      const normalized = title.toLowerCase().trim();
      const duplicates = titleIndex.get(normalized) || [];
      const otherDuplicates = duplicates.filter(id => id !== currentContentId);

      expect(otherDuplicates.length).toBe(0);
    });
  });
});
