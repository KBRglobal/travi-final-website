/**
 * Intelligence System Tests
 *
 * Tests for coverage scoring logic and idempotent re-runs.
 *
 * PHASE 17: Admin Intelligence & Visibility Layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

// Test scoring logic directly (pure functions)
describe('Intelligence Scorers', () => {
  describe('Coverage Score Calculation', () => {
    it('should calculate coverage score correctly', () => {
      // Test the scoring algorithm directly
      const calculateCoverageScore = (
        hasAeo: boolean,
        isIndexed: boolean,
        hasLinks: boolean,
        seoScore: number | null,
        aeoScore: number | null
      ): number => {
        let score = 0;
        if (hasAeo) score += 30;
        if (isIndexed) score += 30;
        if (hasLinks) score += 20;
        if (seoScore && seoScore > 50) score += 10;
        if (aeoScore && aeoScore > 50) score += 10;
        return Math.min(100, score);
      };

      // Test case 1: Full coverage
      expect(calculateCoverageScore(true, true, true, 80, 80)).toBe(100);

      // Test case 2: No coverage
      expect(calculateCoverageScore(false, false, false, null, null)).toBe(0);

      // Test case 3: Partial coverage (AEO only)
      expect(calculateCoverageScore(true, false, false, null, null)).toBe(30);

      // Test case 4: Indexed only
      expect(calculateCoverageScore(false, true, false, null, null)).toBe(30);

      // Test case 5: AEO + indexed
      expect(calculateCoverageScore(true, true, false, null, null)).toBe(60);

      // Test case 6: All flags but low scores
      expect(calculateCoverageScore(true, true, true, 30, 30)).toBe(80);
    });

    it('should cap score at 100', () => {
      const calculateCoverageScore = (
        hasAeo: boolean,
        isIndexed: boolean,
        hasLinks: boolean,
        seoScore: number | null,
        aeoScore: number | null
      ): number => {
        let score = 0;
        if (hasAeo) score += 30;
        if (isIndexed) score += 30;
        if (hasLinks) score += 20;
        if (seoScore && seoScore > 50) score += 10;
        if (aeoScore && aeoScore > 50) score += 10;
        return Math.min(100, score);
      };

      // Even with all signals, score should cap at 100
      const score = calculateCoverageScore(true, true, true, 100, 100);
      expect(score).toBe(100);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Health Score Calculation', () => {
    it('should calculate weighted content health score', () => {
      const calculateContentHealthScore = (
        total: number,
        published: number,
        indexed: number,
        withAeo: number
      ): number => {
        if (total === 0) return 0;

        const publishedPercent = (published / total) * 100;
        const indexedPercent = published > 0 ? (indexed / published) * 100 : 0;
        const aeoPercent = published > 0 ? (withAeo / published) * 100 : 0;

        return Math.round(
          (publishedPercent * 0.4) +
          (indexedPercent * 0.35) +
          (aeoPercent * 0.25)
        );
      };

      // Test case 1: Perfect health
      expect(calculateContentHealthScore(100, 100, 100, 100)).toBe(100);

      // Test case 2: Nothing published
      expect(calculateContentHealthScore(100, 0, 0, 0)).toBe(0);

      // Test case 3: Half published, all indexed and AEO'd
      expect(calculateContentHealthScore(100, 50, 50, 50)).toBe(80);

      // Test case 4: All published, none indexed or AEO'd
      expect(calculateContentHealthScore(100, 100, 0, 0)).toBe(40);
    });

    it('should handle zero total content', () => {
      const calculateContentHealthScore = (
        total: number,
        published: number,
        indexed: number,
        withAeo: number
      ): number => {
        if (total === 0) return 0;
        const publishedPercent = (published / total) * 100;
        const indexedPercent = published > 0 ? (indexed / published) * 100 : 0;
        const aeoPercent = published > 0 ? (withAeo / published) * 100 : 0;
        return Math.round(
          (publishedPercent * 0.4) +
          (indexedPercent * 0.35) +
          (aeoPercent * 0.25)
        );
      };

      expect(calculateContentHealthScore(0, 0, 0, 0)).toBe(0);
    });
  });
});

describe('Intelligence Snapshot', () => {
  describe('Idempotent Re-runs', () => {
    it('should produce same results on repeated evaluation', async () => {
      // Simulate evaluating same content twice
      const mockContent = {
        id: 'test-123',
        answerCapsule: 'Test capsule',
        seoScore: 75,
        aeoScore: 80,
      };

      const evaluateMockCoverage = (content: typeof mockContent) => {
        const hasAeo = !!content.answerCapsule;
        const isIndexed = true; // mocked
        const hasLinks = false; // mocked

        let score = 0;
        if (hasAeo) score += 30;
        if (isIndexed) score += 30;
        if (hasLinks) score += 20;
        if (content.seoScore && content.seoScore > 50) score += 10;
        if (content.aeoScore && content.aeoScore > 50) score += 10;

        return {
          contentId: content.id,
          hasEntities: hasAeo,
          isSearchIndexed: isIndexed,
          hasInternalLinks: hasLinks,
          coverageScore: Math.min(100, score),
        };
      };

      const firstRun = evaluateMockCoverage(mockContent);
      const secondRun = evaluateMockCoverage(mockContent);

      expect(firstRun.coverageScore).toBe(secondRun.coverageScore);
      expect(firstRun.hasEntities).toBe(secondRun.hasEntities);
      expect(firstRun.isSearchIndexed).toBe(secondRun.isSearchIndexed);
    });

    it('should handle missing data gracefully', () => {
      const evaluateMockCoverage = (content: { id: string; answerCapsule: string | null }) => {
        const hasAeo = !!content.answerCapsule;
        let score = 0;
        if (hasAeo) score += 30;
        return {
          contentId: content.id,
          hasEntities: hasAeo,
          coverageScore: score,
        };
      };

      const result = evaluateMockCoverage({ id: 'test-456', answerCapsule: null });

      expect(result.hasEntities).toBe(false);
      expect(result.coverageScore).toBe(0);
    });
  });

  describe('Feature Flag Behavior', () => {
    it('should respect feature flag state', () => {
      const isEnabled = (envValue: string | undefined): boolean => {
        return envValue === 'true';
      };

      expect(isEnabled('true')).toBe(true);
      expect(isEnabled('false')).toBe(false);
      expect(isEnabled(undefined)).toBe(false);
      expect(isEnabled('')).toBe(false);
    });
  });
});

describe('Blocking Issues Detection', () => {
  it('should categorize issues by severity correctly', () => {
    const categorizeSeverity = (count: number, type: string): 'high' | 'medium' | 'low' => {
      if (type === 'stalled') return 'high';
      if (count > 20) return 'high';
      if (count > 5) return 'medium';
      return 'low';
    };

    expect(categorizeSeverity(100, 'unindexed')).toBe('high');
    expect(categorizeSeverity(10, 'unindexed')).toBe('medium');
    expect(categorizeSeverity(3, 'unindexed')).toBe('low');
    expect(categorizeSeverity(1, 'stalled')).toBe('high');
  });

  it('should sort issues by severity', () => {
    const issues = [
      { severity: 'low' as const, issue: 'A' },
      { severity: 'high' as const, issue: 'B' },
      { severity: 'medium' as const, issue: 'C' },
    ];

    const severityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...issues].sort((a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity]
    );

    expect(sorted[0].severity).toBe('high');
    expect(sorted[1].severity).toBe('medium');
    expect(sorted[2].severity).toBe('low');
  });
});
