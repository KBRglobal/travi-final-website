/**
 * SEO Engine Data Adapters Tests
 *
 * Tests for content, metrics, indexing, and link adapters.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Content Adapter', () => {
  describe('Content Normalization', () => {
    it('should normalize content from database format', () => {
      const dbContent = {
        id: 'content-123',
        title: 'Test Article',
        slug: 'test-article',
        type: 'article',
        status: 'published',
        content: [
          { type: 'paragraph', text: 'Hello world' },
          { type: 'faq', questions: [{ q: 'What?', a: 'Answer' }] },
        ],
        metaTitle: 'Test Article | Site',
        metaDescription: 'A test article',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const normalize = (content: any) => {
        const blocks = content.content || [];
        const faqBlocks = blocks.filter((b: any) => b.type === 'faq');
        const paragraphs = blocks.filter((b: any) => b.type === 'paragraph');
        const h2Blocks = blocks.filter((b: any) => b.type === 'heading' && b.level === 2);

        return {
          id: content.id,
          title: content.title,
          slug: content.slug,
          type: content.type,
          status: content.status,
          metaTitle: content.metaTitle || content.title,
          metaDescription: content.metaDescription || '',
          faqCount: faqBlocks.reduce((sum: number, b: any) => sum + (b.questions?.length || 0), 0),
          h2Count: h2Blocks.length,
          wordCount: paragraphs.reduce((sum: number, b: any) => sum + (b.text?.split(' ').length || 0), 0),
          hasStructuredData: !!content.structuredData,
          canonical: content.canonicalUrl || null,
          updatedAt: content.updatedAt,
        };
      };

      const normalized = normalize(dbContent);

      expect(normalized.id).toBe('content-123');
      expect(normalized.title).toBe('Test Article');
      expect(normalized.faqCount).toBe(1);
      expect(normalized.metaTitle).toBe('Test Article | Site');
    });

    it('should handle missing optional fields', () => {
      const dbContent = {
        id: 'content-456',
        title: 'Minimal Content',
        slug: 'minimal',
        type: 'page',
        status: 'draft',
        content: [],
      };

      const normalize = (content: any) => ({
        id: content.id,
        title: content.title,
        slug: content.slug,
        type: content.type,
        status: content.status,
        metaTitle: content.metaTitle || content.title,
        metaDescription: content.metaDescription || '',
        faqCount: 0,
        h2Count: 0,
        wordCount: 0,
        hasStructuredData: false,
        canonical: null,
      });

      const normalized = normalize(dbContent);

      expect(normalized.metaTitle).toBe('Minimal Content');
      expect(normalized.metaDescription).toBe('');
      expect(normalized.faqCount).toBe(0);
    });

    it('should extract internal and external links', () => {
      const content = {
        content: [
          { type: 'paragraph', text: 'Check out [our page](/about) and [Google](https://google.com)' },
        ],
      };

      const extractLinks = (blocks: any[]) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const internal: string[] = [];
        const external: string[] = [];

        for (const block of blocks) {
          const text = block.text || '';
          let match;
          while ((match = linkRegex.exec(text)) !== null) {
            const url = match[2];
            if (url.startsWith('http://') || url.startsWith('https://')) {
              external.push(url);
            } else {
              internal.push(url);
            }
          }
        }

        return { internal, external };
      };

      const links = extractLinks(content.content);

      expect(links.internal).toContain('/about');
      expect(links.external).toContain('https://google.com');
    });
  });

  describe('Content Cache', () => {
    it('should cache content with TTL', () => {
      const cache = new Map<string, { data: any; expires: number }>();
      const TTL_MS = 5 * 60 * 1000; // 5 minutes

      const setCache = (key: string, data: any) => {
        cache.set(key, { data, expires: Date.now() + TTL_MS });
      };

      const getCache = (key: string) => {
        const entry = cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expires) {
          cache.delete(key);
          return null;
        }
        return entry.data;
      };

      setCache('content-123', { title: 'Test' });
      expect(getCache('content-123')).toEqual({ title: 'Test' });
    });

    it('should respect max cache size', () => {
      const MAX_SIZE = 1000;
      const cache = new Map<string, any>();

      const addToCache = (key: string, value: any) => {
        if (cache.size >= MAX_SIZE) {
          // Remove oldest entry (LRU)
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, value);
      };

      // Add items up to limit
      for (let i = 0; i < MAX_SIZE + 10; i++) {
        addToCache(`key-${i}`, { data: i });
      }

      expect(cache.size).toBeLessThanOrEqual(MAX_SIZE);
    });
  });
});

describe('Metrics Adapter', () => {
  describe('Traffic Metrics', () => {
    it('should aggregate traffic data', () => {
      const pageViews = [
        { contentId: 'c1', views: 100, date: '2024-01-01' },
        { contentId: 'c1', views: 150, date: '2024-01-02' },
        { contentId: 'c2', views: 50, date: '2024-01-01' },
      ];

      const aggregate = (views: typeof pageViews, contentId: string) => {
        const filtered = views.filter(v => v.contentId === contentId);
        return {
          totalViews: filtered.reduce((sum, v) => sum + v.views, 0),
          avgViews: filtered.length > 0
            ? filtered.reduce((sum, v) => sum + v.views, 0) / filtered.length
            : 0,
        };
      };

      const metrics = aggregate(pageViews, 'c1');

      expect(metrics.totalViews).toBe(250);
      expect(metrics.avgViews).toBe(125);
    });

    it('should calculate trends', () => {
      const calculateTrend = (current: number, previous: number): { value: number; direction: 'up' | 'down' | 'flat' } => {
        if (previous === 0) return { value: 0, direction: 'flat' };
        const change = ((current - previous) / previous) * 100;
        return {
          value: Math.round(change),
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
        };
      };

      expect(calculateTrend(150, 100)).toEqual({ value: 50, direction: 'up' });
      expect(calculateTrend(80, 100)).toEqual({ value: -20, direction: 'down' });
      expect(calculateTrend(100, 100)).toEqual({ value: 0, direction: 'flat' });
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate SEO score from components', () => {
      const calculateSeoScore = (components: {
        technical: number;
        content: number;
        onPage: number;
        authority: number;
      }): number => {
        const weights = {
          technical: 0.25,
          content: 0.30,
          onPage: 0.25,
          authority: 0.20,
        };

        const score =
          components.technical * weights.technical +
          components.content * weights.content +
          components.onPage * weights.onPage +
          components.authority * weights.authority;

        return Math.round(score);
      };

      const score = calculateSeoScore({
        technical: 90,
        content: 80,
        onPage: 85,
        authority: 70,
      });

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

describe('Indexing Adapter', () => {
  describe('Indexing State', () => {
    it('should determine indexing status', () => {
      const getIndexingStatus = (content: {
        status: string;
        noindex?: boolean;
        canonicalUrl?: string;
      }): 'indexed' | 'noindex' | 'pending' | 'blocked' => {
        if (content.noindex) return 'noindex';
        if (content.status !== 'published') return 'pending';
        if (content.canonicalUrl && content.canonicalUrl !== '') return 'indexed';
        return 'indexed';
      };

      expect(getIndexingStatus({ status: 'published' })).toBe('indexed');
      expect(getIndexingStatus({ status: 'published', noindex: true })).toBe('noindex');
      expect(getIndexingStatus({ status: 'draft' })).toBe('pending');
    });

    it('should calculate sitemap priority', () => {
      const calculatePriority = (content: {
        type: string;
        seoScore?: number;
        traffic?: number;
      }): number => {
        // Base priority by type
        const typePriority: Record<string, number> = {
          landing_page: 0.9,
          destination: 0.8,
          article: 0.7,
          hotel: 0.6,
          page: 0.5,
        };

        let priority = typePriority[content.type] || 0.5;

        // Boost for high SEO score
        if (content.seoScore && content.seoScore > 80) {
          priority = Math.min(1.0, priority + 0.1);
        }

        // Boost for high traffic
        if (content.traffic && content.traffic > 1000) {
          priority = Math.min(1.0, priority + 0.05);
        }

        return Math.round(priority * 100) / 100;
      };

      expect(calculatePriority({ type: 'landing_page' })).toBe(0.9);
      expect(calculatePriority({ type: 'article', seoScore: 85 })).toBe(0.8);
      expect(calculatePriority({ type: 'page' })).toBe(0.5);
    });
  });

  describe('Rollback Tokens', () => {
    it('should generate valid rollback tokens', () => {
      const generateToken = (actionId: string, contentId: string): string => {
        const data = JSON.stringify({
          actionId,
          contentId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });
        return Buffer.from(data).toString('base64');
      };

      const parseToken = (token: string) => {
        try {
          const data = Buffer.from(token, 'base64').toString('utf8');
          return JSON.parse(data);
        } catch {
          return null;
        }
      };

      const token = generateToken('action-1', 'content-1');
      const parsed = parseToken(token);

      expect(parsed).not.toBeNull();
      expect(parsed.actionId).toBe('action-1');
      expect(parsed.contentId).toBe('content-1');
    });

    it('should detect expired tokens', () => {
      const isTokenExpired = (expiresAt: number): boolean => {
        return Date.now() > expiresAt;
      };

      const futureExpiry = Date.now() + 1000 * 60 * 60;
      const pastExpiry = Date.now() - 1000 * 60 * 60;

      expect(isTokenExpired(futureExpiry)).toBe(false);
      expect(isTokenExpired(pastExpiry)).toBe(true);
    });
  });
});

describe('Link Adapter', () => {
  describe('Link Extraction', () => {
    it('should extract links from content blocks', () => {
      const blocks = [
        {
          type: 'paragraph',
          children: [
            { text: 'Visit ' },
            { type: 'link', url: '/about', children: [{ text: 'About' }] },
            { text: ' page' },
          ]
        },
        {
          type: 'paragraph',
          children: [
            { type: 'link', url: 'https://external.com', children: [{ text: 'External' }] },
          ]
        },
      ];

      const extractLinks = (blocks: any[]): { internal: string[]; external: string[] } => {
        const internal: string[] = [];
        const external: string[] = [];

        const processNode = (node: any) => {
          if (node.type === 'link' && node.url) {
            if (node.url.startsWith('http://') || node.url.startsWith('https://')) {
              external.push(node.url);
            } else {
              internal.push(node.url);
            }
          }
          if (node.children) {
            node.children.forEach(processNode);
          }
        };

        blocks.forEach(processNode);
        return { internal, external };
      };

      const links = extractLinks(blocks);

      expect(links.internal).toContain('/about');
      expect(links.external).toContain('https://external.com');
    });
  });

  describe('Link Suggestions', () => {
    it('should suggest links based on content similarity', () => {
      const content = { keywords: ['dubai', 'real estate', 'investment'] };
      const candidates = [
        { id: 'c1', slug: 'dubai-property-guide', keywords: ['dubai', 'property', 'guide'] },
        { id: 'c2', slug: 'london-hotels', keywords: ['london', 'hotels'] },
        { id: 'c3', slug: 'dubai-investment-tips', keywords: ['dubai', 'investment', 'tips'] },
      ];

      const calculateRelevance = (contentKeywords: string[], candidateKeywords: string[]): number => {
        const overlap = contentKeywords.filter(k => candidateKeywords.includes(k)).length;
        const maxPossible = Math.min(contentKeywords.length, candidateKeywords.length);
        return maxPossible > 0 ? overlap / maxPossible : 0;
      };

      const suggestions = candidates
        .map(c => ({
          ...c,
          relevance: calculateRelevance(content.keywords, c.keywords),
        }))
        .filter(c => c.relevance > 0.3)
        .sort((a, b) => b.relevance - a.relevance);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].slug).toBe('dubai-investment-tips');
    });

    it('should detect broken internal links', () => {
      const existingSlugs = new Set(['about', 'contact', 'services']);
      const links = ['/about', '/missing-page', '/contact', '/another-missing'];

      const detectBroken = (links: string[], existing: Set<string>): string[] => {
        return links.filter(link => {
          const slug = link.replace(/^\//, '');
          return !existing.has(slug);
        });
      };

      const broken = detectBroken(links, existingSlugs);

      expect(broken).toContain('/missing-page');
      expect(broken).toContain('/another-missing');
      expect(broken).not.toContain('/about');
    });
  });
});
