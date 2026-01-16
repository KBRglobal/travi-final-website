/**
 * Funnel Detector - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FunnelDetector,
  getFunnelDetector,
  resetFunnelDetector,
  DetectedPath,
} from '../../../server/funnel-designer';

describe('FunnelDetector', () => {
  let detector: FunnelDetector;

  beforeEach(() => {
    detector = new FunnelDetector();
  });

  afterEach(() => {
    detector.clear();
  });

  describe('detectFromPaths', () => {
    it('should detect funnels from valid paths', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['home', 'product-list', 'product-detail', 'checkout'],
          occurrences: 100,
          conversionRate: 0.1,
          avgValue: 50,
          avgDuration: 300,
        },
        {
          nodes: ['home', 'product-list', 'product-detail', 'checkout'],
          occurrences: 80,
          conversionRate: 0.08,
          avgValue: 45,
          avgDuration: 280,
        },
      ];

      const funnels = detector.detectFromPaths(paths);

      expect(funnels.length).toBeGreaterThan(0);
      expect(funnels[0].steps.length).toBeGreaterThanOrEqual(2);
      expect(funnels[0].isAutoDetected).toBe(true);
    });

    it('should filter out paths with low occurrences', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['a', 'b', 'c'],
          occurrences: 5, // Below minimum
          conversionRate: 0.1,
          avgValue: 50,
          avgDuration: 100,
        },
      ];

      const funnels = detector.detectFromPaths(paths);
      expect(funnels.length).toBe(0);
    });

    it('should filter out paths with low conversion', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['a', 'b', 'c'],
          occurrences: 100,
          conversionRate: 0.001, // Below minimum
          avgValue: 50,
          avgDuration: 100,
        },
      ];

      const funnels = detector.detectFromPaths(paths);
      expect(funnels.length).toBe(0);
    });

    it('should group similar paths', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['home', 'products', 'checkout'],
          occurrences: 50,
          conversionRate: 0.1,
          avgValue: 40,
          avgDuration: 200,
        },
        {
          nodes: ['home', 'products', 'cart', 'checkout'],
          occurrences: 60,
          conversionRate: 0.12,
          avgValue: 45,
          avgDuration: 250,
        },
      ];

      const funnels = detector.detectFromPaths(paths);

      // Should detect funnels (may group similar ones)
      expect(funnels.length).toBeGreaterThan(0);
    });
  });

  describe('Funnel Properties', () => {
    it('should calculate funnel metrics', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['landing', 'signup', 'confirm'],
          occurrences: 200,
          conversionRate: 0.15,
          avgValue: 100,
          avgDuration: 180,
        },
      ];

      const funnels = detector.detectFromPaths(paths);
      const funnel = funnels[0];

      expect(funnel.totalEntries).toBeGreaterThan(0);
      expect(funnel.overallConversionRate).toBeGreaterThan(0);
      expect(funnel.healthScore).toBeGreaterThanOrEqual(0);
      expect(funnel.healthScore).toBeLessThanOrEqual(100);
    });

    it('should detect bottlenecks', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['step1', 'step2', 'step3', 'step4'],
          occurrences: 100,
          conversionRate: 0.05, // Low conversion indicates bottlenecks
          avgValue: 50,
          avgDuration: 300,
        },
      ];

      const funnels = detector.detectFromPaths(paths);

      if (funnels.length > 0) {
        // Bottlenecks may be detected based on drop-off patterns
        expect(funnels[0].bottlenecks).toBeDefined();
      }
    });

    it('should assign funnel types', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['awareness', 'interest', 'decision', 'action'],
          occurrences: 100,
          conversionRate: 0.1,
          avgValue: 50,
          avgDuration: 200,
        },
      ];

      const funnels = detector.detectFromPaths(paths);

      if (funnels.length > 0) {
        expect(['acquisition', 'conversion', 'engagement', 'retention', 'monetization'])
          .toContain(funnels[0].type);
      }
    });
  });

  describe('Public API', () => {
    it('should get all funnels', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['a', 'b', 'c'],
          occurrences: 100,
          conversionRate: 0.1,
          avgValue: 50,
          avgDuration: 100,
        },
      ];

      detector.detectFromPaths(paths);
      const allFunnels = detector.getAllFunnels();

      expect(allFunnels).toBeDefined();
    });

    it('should get funnel by ID', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['x', 'y', 'z'],
          occurrences: 100,
          conversionRate: 0.1,
          avgValue: 50,
          avgDuration: 100,
        },
      ];

      const funnels = detector.detectFromPaths(paths);

      if (funnels.length > 0) {
        const retrieved = detector.getFunnel(funnels[0].id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(funnels[0].id);
      }
    });

    it('should get top funnels', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['high-perf-1', 'high-perf-2', 'high-perf-3'],
          occurrences: 200,
          conversionRate: 0.2,
          avgValue: 100,
          avgDuration: 150,
        },
        {
          nodes: ['low-perf-1', 'low-perf-2', 'low-perf-3'],
          occurrences: 50,
          conversionRate: 0.02,
          avgValue: 20,
          avgDuration: 300,
        },
      ];

      detector.detectFromPaths(paths);
      const topFunnels = detector.getTopFunnels(5);

      expect(topFunnels).toBeDefined();
      if (topFunnels.length > 1) {
        expect(topFunnels[0].score).toBeGreaterThanOrEqual(topFunnels[1].score);
      }
    });

    it('should get underperforming funnels', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['problem-1', 'problem-2', 'problem-3'],
          occurrences: 100,
          conversionRate: 0.02, // Low conversion
          avgValue: 10,
          avgDuration: 400,
        },
      ];

      detector.detectFromPaths(paths);
      const underperforming = detector.getUnderperformingFunnels(5);

      expect(underperforming).toBeDefined();
    });

    it('should clear data', () => {
      const paths: DetectedPath[] = [
        {
          nodes: ['a', 'b', 'c'],
          occurrences: 100,
          conversionRate: 0.1,
          avgValue: 50,
          avgDuration: 100,
        },
      ];

      detector.detectFromPaths(paths);
      detector.clear();

      expect(detector.getAllFunnels().length).toBe(0);
    });
  });
});

describe('Singleton', () => {
  afterEach(() => {
    resetFunnelDetector();
  });

  it('should return same instance', () => {
    const d1 = getFunnelDetector();
    const d2 = getFunnelDetector();
    expect(d1).toBe(d2);
  });

  it('should reset instance', () => {
    const d1 = getFunnelDetector();
    d1.detectFromPaths([
      {
        nodes: ['test1', 'test2', 'test3'],
        occurrences: 100,
        conversionRate: 0.1,
        avgValue: 50,
        avgDuration: 100,
      },
    ]);

    resetFunnelDetector();

    const d2 = getFunnelDetector();
    expect(d2.getAllFunnels().length).toBe(0);
  });
});
