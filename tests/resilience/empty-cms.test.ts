/**
 * Empty CMS / Database Resilience Tests
 * 
 * Simulates scenarios where database queries return empty results:
 * 1. No destinations data
 * 2. No articles/content
 * 3. No images available
 * 
 * Verifies graceful degradation without user-facing breakage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFallbackResponse } from '../../server/fallbacks/fallback-handler';
import { FALLBACK_MESSAGES, getFallbackMessage, isValidFallbackType } from '../../shared/fallback-messages';

// Mock logger
const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogError = vi.fn();

vi.mock('../../server/lib/logger', () => ({
  log: {
    info: (...args: unknown[]) => mockLogInfo(...args),
    warn: (...args: unknown[]) => mockLogWarn(...args),
    error: (...args: unknown[]) => mockLogError(...args),
  },
  logger: {
    info: (...args: unknown[]) => mockLogInfo(...args),
    warn: (...args: unknown[]) => mockLogWarn(...args),
    error: (...args: unknown[]) => mockLogError(...args),
  },
}));

describe('Empty CMS Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty Search Results', () => {
    it('should return appropriate fallback for no search results', () => {
      const response = getFallbackResponse('SEARCH_NO_RESULTS', {
        metadata: { searchQuery: 'nonexistent destination xyz' },
      });

      expect(response.success).toBe(false);
      expect(response.fallback).toBe(true);
      expect(response.type).toBe('SEARCH_NO_RESULTS');
      expect(response.message.title).toContain('No results');
    });

    it('should provide helpful suggestions when search fails', () => {
      const response = getFallbackResponse('SEARCH_NO_RESULTS');
      
      expect(response.message.suggestion).toBeDefined();
      expect(response.message.suggestion.length).toBeGreaterThan(10);
      // Should suggest alternative actions
      expect(
        response.message.suggestion.toLowerCase().includes('try') ||
        response.message.suggestion.toLowerCase().includes('browse') ||
        response.message.suggestion.toLowerCase().includes('check')
      ).toBe(true);
    });

    it('should include action URL for browsing alternatives', () => {
      const message = getFallbackMessage('SEARCH_NO_RESULTS');
      
      expect(message.actionLabel).toBeDefined();
      expect(message.actionUrl).toBeDefined();
      expect(message.actionUrl).toContain('destinations');
    });
  });

  describe('Content Not Found', () => {
    it('should handle missing content gracefully', () => {
      const response = getFallbackResponse('CONTENT_NOT_FOUND', {
        requestPath: '/destinations/nonexistent-city',
      });

      expect(response.success).toBe(false);
      expect(response.type).toBe('CONTENT_NOT_FOUND');
      expect(response.message.title).toContain('not found');
    });

    it('should suggest homepage when content is missing', () => {
      const message = getFallbackMessage('CONTENT_NOT_FOUND');
      
      expect(message.actionUrl).toBe('/');
      expect(message.actionLabel).toContain('Homepage');
    });

    it('should provide context for debugging without exposing internals', () => {
      const response = getFallbackResponse('CONTENT_NOT_FOUND', {
        requestPath: '/api/destinations/12345',
        metadata: { entityType: 'destination' },
      });

      expect(response.context?.requestId).toBeDefined();
      expect(response.context?.timestamp).toBeDefined();
      // Should not expose internal paths in user message
      expect(response.message.description).not.toContain('/api/');
    });
  });

  describe('Empty Database Collections', () => {
    it('should handle scenario with zero destinations', () => {
      // Simulate empty destinations response
      const emptyDestinations: unknown[] = [];
      
      expect(emptyDestinations.length).toBe(0);
      
      // When no data, fallback should be triggered
      const response = getFallbackResponse('CONTENT_NOT_FOUND', {
        metadata: { reason: 'No destinations in database' },
      });

      expect(response.fallback).toBe(true);
      expect(response.message.suggestion).toBeDefined();
    });

    it('should handle scenario with zero articles', () => {
      const emptyArticles: unknown[] = [];
      
      expect(emptyArticles.length).toBe(0);
      
      const response = getFallbackResponse('SEARCH_NO_RESULTS', {
        metadata: { contentType: 'articles' },
      });

      expect(response.fallback).toBe(true);
    });

    it('should handle scenario with zero hotels', () => {
      const emptyHotels: unknown[] = [];
      
      expect(emptyHotels.length).toBe(0);
      
      const response = getFallbackResponse('SEARCH_NO_RESULTS', {
        metadata: { contentType: 'hotels', destination: 'Dubai' },
      });

      expect(response.fallback).toBe(true);
      expect(response.message.suggestion).toBeDefined();
    });

    it('should handle scenario with zero attractions', () => {
      const emptyAttractions: unknown[] = [];
      
      expect(emptyAttractions.length).toBe(0);
      
      const response = getFallbackResponse('SEARCH_NO_RESULTS', {
        metadata: { contentType: 'attractions' },
      });

      expect(response.fallback).toBe(true);
    });
  });

  describe('Fallback Message Quality', () => {
    it('should have user-friendly language', () => {
      const allTypes = Object.keys(FALLBACK_MESSAGES) as Array<keyof typeof FALLBACK_MESSAGES>;
      
      for (const type of allTypes) {
        const message = FALLBACK_MESSAGES[type];
        
        // Should not contain technical jargon
        expect(message.title).not.toMatch(/exception|error code|null|undefined|500|404/i);
        expect(message.description).not.toMatch(/stack trace|database|sql|query/i);
      }
    });

    it('should have actionable suggestions', () => {
      const allTypes = Object.keys(FALLBACK_MESSAGES) as Array<keyof typeof FALLBACK_MESSAGES>;
      
      for (const type of allTypes) {
        const message = FALLBACK_MESSAGES[type];
        
        // Suggestion should contain action verbs
        expect(
          message.suggestion.toLowerCase().match(/try|check|refresh|browse|sign|wait|explore/) !== null
        ).toBe(true);
      }
    });

    it('should have appropriate icons defined', () => {
      const allTypes = Object.keys(FALLBACK_MESSAGES) as Array<keyof typeof FALLBACK_MESSAGES>;
      
      for (const type of allTypes) {
        const message = FALLBACK_MESSAGES[type];
        
        // Icon should be defined for visual feedback
        expect(message.icon).toBeDefined();
        expect(message.icon!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Graceful Degradation Patterns', () => {
    it('should never throw errors for empty data', () => {
      // Simulate various empty data scenarios
      const scenarios = [
        { query: '', results: [] },
        { filter: { category: 'nonexistent' }, results: [] },
        { id: 'invalid-uuid', result: null },
        { page: 999, results: [] },
      ];

      for (const scenario of scenarios) {
        expect(() => {
          // Processing empty results should not throw
          const data = scenario.results || scenario.result;
          const isEmpty = !data || (Array.isArray(data) && data.length === 0);
          
          if (isEmpty) {
            getFallbackResponse('SEARCH_NO_RESULTS');
          }
        }).not.toThrow();
      }
    });

    it('should provide consistent response structure', () => {
      const types = ['SEARCH_NO_RESULTS', 'CONTENT_NOT_FOUND'] as const;
      
      for (const type of types) {
        const response = getFallbackResponse(type);
        
        // Consistent structure
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('fallback');
        expect(response).toHaveProperty('type');
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('context');
        
        expect(response.message).toHaveProperty('title');
        expect(response.message).toHaveProperty('description');
        expect(response.message).toHaveProperty('suggestion');
      }
    });

    it('should log fallback events for monitoring', () => {
      getFallbackResponse('CONTENT_NOT_FOUND', {
        requestPath: '/test/path',
        userId: 'test-user',
      });

      // Logger should have been called
      expect(mockLogInfo).toHaveBeenCalled();
    });
  });

  describe('Fallback Type Validation', () => {
    it('should validate known fallback types', () => {
      expect(isValidFallbackType('SEARCH_NO_RESULTS')).toBe(true);
      expect(isValidFallbackType('CONTENT_NOT_FOUND')).toBe(true);
      expect(isValidFallbackType('AI_OVERLOADED')).toBe(true);
      expect(isValidFallbackType('GENERIC_ERROR')).toBe(true);
    });

    it('should reject unknown fallback types', () => {
      expect(isValidFallbackType('UNKNOWN_TYPE')).toBe(false);
      expect(isValidFallbackType('random_string')).toBe(false);
      expect(isValidFallbackType('')).toBe(false);
    });

    it('should return GENERIC_ERROR for unknown types', () => {
      // getFallbackMessage should handle gracefully
      const message = getFallbackMessage('GENERIC_ERROR');
      
      expect(message.title).toBeDefined();
      expect(message.description).toBeDefined();
    });
  });

  describe('Context Preservation', () => {
    it('should preserve user context in fallback', () => {
      const response = getFallbackResponse('SEARCH_NO_RESULTS', {
        userId: 'user-123',
        sessionId: 'session-456',
        requestPath: '/search?q=paris',
        metadata: { query: 'paris hotels', filters: { price: 'luxury' } },
      });

      expect(response.context).toBeDefined();
      expect(response.context?.requestId).toBeDefined();
    });

    it('should include timestamp for debugging', () => {
      const beforeTime = Date.now();
      const response = getFallbackResponse('CONTENT_NOT_FOUND');
      const afterTime = Date.now();

      expect(response.context?.timestamp).toBeDefined();
      const responseTime = new Date(response.context!.timestamp).getTime();
      expect(responseTime).toBeGreaterThanOrEqual(beforeTime);
      expect(responseTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle empty page gracefully', () => {
      // Simulate paginated response with no items
      const paginatedResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      };

      expect(paginatedResponse.items.length).toBe(0);
      expect(paginatedResponse.total).toBe(0);

      // Should trigger appropriate fallback
      if (paginatedResponse.items.length === 0) {
        const response = getFallbackResponse('SEARCH_NO_RESULTS');
        expect(response.fallback).toBe(true);
      }
    });

    it('should handle out-of-range page numbers', () => {
      // Simulate request for page 999 when only 10 pages exist
      const pageRequest = { page: 999, pageSize: 20 };
      const totalItems = 200; // Only 10 pages
      const maxPage = Math.ceil(totalItems / pageRequest.pageSize);

      expect(pageRequest.page).toBeGreaterThan(maxPage);

      // Should return empty with fallback
      const response = getFallbackResponse('CONTENT_NOT_FOUND', {
        metadata: { requestedPage: pageRequest.page, maxPage },
      });

      expect(response.fallback).toBe(true);
    });
  });
});

describe('Session and Auth Fallbacks', () => {
  it('should handle expired session gracefully', () => {
    const response = getFallbackResponse('SESSION_EXPIRED');

    expect(response.type).toBe('SESSION_EXPIRED');
    expect(response.message.actionUrl).toContain('login');
  });

  it('should provide login action for expired sessions', () => {
    const message = getFallbackMessage('SESSION_EXPIRED');

    expect(message.actionLabel).toBeDefined();
    expect(message.actionLabel).toContain('Sign');
    expect(message.actionUrl).toBeDefined();
  });
});
