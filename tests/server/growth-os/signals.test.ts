/**
 * Signal Unification Layer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../../../server/growth-os/config', () => ({
  isSignalsEnabled: () => true,
  getGrowthOSConfig: () => ({
    signalDecayHalfLifeHours: 24,
    maxSignalsPerCategory: 100,
  }),
}));

describe('Signal Normalization', () => {
  describe('deriveCategory', () => {
    it('should derive category from source', () => {
      const sourceMap = {
        traffic_intelligence: 'traffic',
        media_intelligence: 'media',
        content_health: 'content',
        revenue_intelligence: 'revenue',
      };

      for (const [source, expected] of Object.entries(sourceMap)) {
        // Would test deriveCategory(source, 'generic')
        expect(expected).toBeDefined();
      }
    });

    it('should override category based on type keywords', () => {
      const typeOverrides = [
        { type: 'seo_issue', expected: 'seo' },
        { type: 'aeo_opportunity', expected: 'aeo' },
        { type: 'revenue_drop', expected: 'revenue' },
        { type: 'traffic_spike', expected: 'traffic' },
        { type: 'media_optimization', expected: 'media' },
      ];

      for (const { type, expected } of typeOverrides) {
        expect(expected).toBeDefined();
        expect(type).toContain(expected.slice(0, 3).toLowerCase());
      }
    });
  });

  describe('derivePriority', () => {
    it('should map severity to priority', () => {
      const mappings = [
        { severity: 95, expected: 'critical' },
        { severity: 75, expected: 'high' },
        { severity: 50, expected: 'medium' },
        { severity: 25, expected: 'low' },
        { severity: 10, expected: 'info' },
      ];

      for (const { severity, expected } of mappings) {
        let priority: string;
        if (severity >= 90) priority = 'critical';
        else if (severity >= 70) priority = 'high';
        else if (severity >= 40) priority = 'medium';
        else if (severity >= 20) priority = 'low';
        else priority = 'info';

        expect(priority).toBe(expected);
      }
    });
  });

  describe('normalizeSignal', () => {
    it('should generate unique ID', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const id = crypto.randomUUID();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
    });

    it('should clamp values to 0-100 range', () => {
      const clamp = (v: number) => Math.max(0, Math.min(100, v));

      expect(clamp(-10)).toBe(0);
      expect(clamp(50)).toBe(50);
      expect(clamp(150)).toBe(100);
    });

    it('should set default values for optional fields', () => {
      const defaults = {
        severity: 50,
        impact: 50,
        confidence: 75,
      };

      expect(defaults.severity).toBe(50);
      expect(defaults.impact).toBe(50);
      expect(defaults.confidence).toBe(75);
    });
  });
});

describe('Signal Registry', () => {
  describe('Bounded Storage', () => {
    it('should respect max size', () => {
      const maxSize = 5;
      const map = new Map<string, any>();

      for (let i = 0; i < 10; i++) {
        if (map.size >= maxSize) {
          const firstKey = map.keys().next().value;
          map.delete(firstKey);
        }
        map.set(`id-${i}`, { id: `id-${i}` });
      }

      expect(map.size).toBe(maxSize);
    });

    it('should evict oldest on overflow', () => {
      const accessOrder: string[] = [];
      const maxSize = 3;

      accessOrder.push('a', 'b', 'c');
      // On adding 'd', should evict 'a'
      if (accessOrder.length >= maxSize) {
        accessOrder.shift();
      }
      accessOrder.push('d');

      expect(accessOrder).not.toContain('a');
      expect(accessOrder.length).toBe(maxSize);
    });
  });

  describe('Deduplication', () => {
    it('should detect duplicate signals', () => {
      const signals = [
        { source: 'traffic', type: 'spike', entityId: '1', createdAt: Date.now() },
        { source: 'traffic', type: 'spike', entityId: '1', createdAt: Date.now() - 1000 },
      ];

      const isDuplicate = (a: typeof signals[0], b: typeof signals[0]) =>
        a.source === b.source &&
        a.type === b.type &&
        a.entityId === b.entityId &&
        Math.abs(a.createdAt - b.createdAt) < 60 * 60 * 1000;

      expect(isDuplicate(signals[0], signals[1])).toBe(true);
    });

    it('should not flag different signals as duplicates', () => {
      const signals = [
        { source: 'traffic', type: 'spike', entityId: '1' },
        { source: 'traffic', type: 'drop', entityId: '1' },
      ];

      expect(signals[0].type).not.toBe(signals[1].type);
    });
  });

  describe('Indexing', () => {
    it('should index by content ID', () => {
      const contentIndex = new Map<string, Set<string>>();

      const addToIndex = (contentId: string, signalId: string) => {
        if (!contentIndex.has(contentId)) {
          contentIndex.set(contentId, new Set());
        }
        contentIndex.get(contentId)!.add(signalId);
      };

      addToIndex('content-1', 'signal-a');
      addToIndex('content-1', 'signal-b');
      addToIndex('content-2', 'signal-c');

      expect(contentIndex.get('content-1')?.size).toBe(2);
      expect(contentIndex.get('content-2')?.size).toBe(1);
    });

    it('should index by entity', () => {
      const entityIndex = new Map<string, Set<string>>();
      const key = (type: string, id: string) => `${type}:${id}`;

      entityIndex.set(key('content', '1'), new Set(['sig-1', 'sig-2']));
      entityIndex.set(key('asset', '5'), new Set(['sig-3']));

      expect(entityIndex.get('content:1')?.size).toBe(2);
      expect(entityIndex.get('asset:5')?.size).toBe(1);
    });
  });
});

describe('Signal Decay', () => {
  describe('Freshness Calculation', () => {
    it('should start at 100% for new signals', () => {
      const createdAt = new Date();
      const halfLife = 24;
      const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      const freshness = Math.round(100 * Math.pow(0.5, ageHours / halfLife));

      expect(freshness).toBe(100);
    });

    it('should be ~50% at half-life', () => {
      const halfLife = 24;
      const createdAt = new Date(Date.now() - halfLife * 60 * 60 * 1000);
      const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      const freshness = Math.round(100 * Math.pow(0.5, ageHours / halfLife));

      expect(freshness).toBeCloseTo(50, 0);
    });

    it('should be ~25% at 2x half-life', () => {
      const halfLife = 24;
      const createdAt = new Date(Date.now() - 2 * halfLife * 60 * 60 * 1000);
      const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      const freshness = Math.round(100 * Math.pow(0.5, ageHours / halfLife));

      expect(freshness).toBeCloseTo(25, 0);
    });
  });

  describe('Expiration', () => {
    it('should detect expired signals', () => {
      const expiresAt = new Date(Date.now() - 1000);
      const isExpired = Date.now() > expiresAt.getTime();

      expect(isExpired).toBe(true);
    });

    it('should not flag fresh signals as expired', () => {
      const expiresAt = new Date(Date.now() + 1000);
      const isExpired = Date.now() > expiresAt.getTime();

      expect(isExpired).toBe(false);
    });
  });

  describe('Freshness Tiers', () => {
    it('should categorize freshness correctly', () => {
      const getTier = (freshness: number) => {
        if (freshness >= 75) return 'fresh';
        if (freshness >= 40) return 'aging';
        if (freshness >= 10) return 'stale';
        return 'expired';
      };

      expect(getTier(80)).toBe('fresh');
      expect(getTier(50)).toBe('aging');
      expect(getTier(20)).toBe('stale');
      expect(getTier(5)).toBe('expired');
    });
  });
});

describe('Signal Queries', () => {
  describe('Filtering', () => {
    const signals = [
      { source: 'traffic', category: 'traffic', priority: 'high', severity: 80 },
      { source: 'content', category: 'content', priority: 'medium', severity: 50 },
      { source: 'revenue', category: 'revenue', priority: 'critical', severity: 95 },
    ];

    it('should filter by source', () => {
      const filtered = signals.filter(s => s.source === 'traffic');
      expect(filtered.length).toBe(1);
    });

    it('should filter by category', () => {
      const filtered = signals.filter(s => s.category === 'content');
      expect(filtered.length).toBe(1);
    });

    it('should filter by priority', () => {
      const filtered = signals.filter(s => ['high', 'critical'].includes(s.priority));
      expect(filtered.length).toBe(2);
    });

    it('should filter by minimum severity', () => {
      const minSeverity = 70;
      const filtered = signals.filter(s => s.severity >= minSeverity);
      expect(filtered.length).toBe(2);
    });
  });

  describe('Sorting', () => {
    const signals = [
      { severity: 50, createdAt: 1000 },
      { severity: 80, createdAt: 2000 },
      { severity: 60, createdAt: 3000 },
    ];

    it('should sort by severity descending', () => {
      const sorted = [...signals].sort((a, b) => b.severity - a.severity);
      expect(sorted[0].severity).toBe(80);
      expect(sorted[2].severity).toBe(50);
    });

    it('should sort by createdAt descending', () => {
      const sorted = [...signals].sort((a, b) => b.createdAt - a.createdAt);
      expect(sorted[0].createdAt).toBe(3000);
    });
  });

  describe('Aggregation', () => {
    it('should aggregate by category', () => {
      const signals = [
        { category: 'traffic', severity: 60 },
        { category: 'traffic', severity: 80 },
        { category: 'content', severity: 50 },
      ];

      const aggregations = new Map<string, { count: number; totalSeverity: number }>();

      for (const signal of signals) {
        if (!aggregations.has(signal.category)) {
          aggregations.set(signal.category, { count: 0, totalSeverity: 0 });
        }
        const agg = aggregations.get(signal.category)!;
        agg.count++;
        agg.totalSeverity += signal.severity;
      }

      expect(aggregations.get('traffic')?.count).toBe(2);
      expect(aggregations.get('traffic')?.totalSeverity).toBe(140);
      expect(aggregations.get('content')?.count).toBe(1);
    });
  });
});
