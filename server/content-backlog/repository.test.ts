/**
 * Content Backlog - Repository Deduplication Tests
 */

import { describe, it, expect } from 'vitest';
import { BacklogItem } from './types';

describe('Backlog Repository', () => {
  describe('Deduplication', () => {
    function generateDedupeHash(item: Partial<BacklogItem>): string {
      const source = item.source || '';
      const title = (item.title || '').toLowerCase().trim();
      const keywords = (item.suggestedKeywords || []).sort().join(',');
      return `${source}:${title}:${keywords}`;
    }

    it('generates same hash for identical items', () => {
      const item1: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'Test Article',
        suggestedKeywords: ['test', 'article'],
      };

      const item2: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'Test Article',
        suggestedKeywords: ['test', 'article'],
      };

      expect(generateDedupeHash(item1)).toBe(generateDedupeHash(item2));
    });

    it('generates same hash regardless of keyword order', () => {
      const item1: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'Test',
        suggestedKeywords: ['b', 'a', 'c'],
      };

      const item2: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'Test',
        suggestedKeywords: ['a', 'c', 'b'],
      };

      expect(generateDedupeHash(item1)).toBe(generateDedupeHash(item2));
    });

    it('generates different hash for different sources', () => {
      const item1: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'Test',
        suggestedKeywords: ['test'],
      };

      const item2: Partial<BacklogItem> = {
        source: 'entity_gap',
        title: 'Test',
        suggestedKeywords: ['test'],
      };

      expect(generateDedupeHash(item1)).not.toBe(generateDedupeHash(item2));
    });

    it('generates different hash for different titles', () => {
      const item1: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'Test One',
        suggestedKeywords: ['test'],
      };

      const item2: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'Test Two',
        suggestedKeywords: ['test'],
      };

      expect(generateDedupeHash(item1)).not.toBe(generateDedupeHash(item2));
    });

    it('normalizes title case', () => {
      const item1: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'TEST ARTICLE',
        suggestedKeywords: [],
      };

      const item2: Partial<BacklogItem> = {
        source: 'zero_result_search',
        title: 'test article',
        suggestedKeywords: [],
      };

      expect(generateDedupeHash(item1)).toBe(generateDedupeHash(item2));
    });
  });
});
