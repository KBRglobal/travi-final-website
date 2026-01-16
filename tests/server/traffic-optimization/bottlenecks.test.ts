/**
 * Bottleneck Detector - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BottleneckDetector,
  getBottleneckDetector,
  resetBottleneckDetector,
} from '../../../server/traffic-optimization/bottlenecks';

describe('BottleneckDetector', () => {
  let detector: BottleneckDetector;

  beforeEach(() => {
    detector = new BottleneckDetector();
  });

  afterEach(() => {
    detector.clear();
  });

  describe('High Impressions Low Engagement', () => {
    it('should detect when engagement is low despite high impressions', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        slug: 'test-article',
        title: 'Test Article',
        impressions: 500,
        visits: 100,
        bounceRate: 0.8,
        avgTimeOnPage: 15,
        conversionRate: 0.001,
        ctr: 0.05,
      });

      const bottlenecks = detector.detect();

      expect(bottlenecks.length).toBeGreaterThan(0);
      const hiLe = bottlenecks.find((b) => b.type === 'high_impressions_low_engagement');
      expect(hiLe).toBeDefined();
      // Severity depends on impact score calculation
      expect(['low', 'medium', 'high', 'critical']).toContain(hiLe?.severity);
    });

    it('should not detect when engagement is good', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 500,
        visits: 100,
        bounceRate: 0.3,
        avgTimeOnPage: 180,
        conversionRate: 0.05,
        ctr: 0.08,
      });

      const bottlenecks = detector.detect();
      const hiLe = bottlenecks.find((b) => b.type === 'high_impressions_low_engagement');
      expect(hiLe).toBeUndefined();
    });

    it('should not detect with low impressions', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 50, // Below threshold
        visits: 10,
        bounceRate: 0.9,
        avgTimeOnPage: 5,
        conversionRate: 0,
        ctr: 0.01,
      });

      const bottlenecks = detector.detect();
      const hiLe = bottlenecks.find((b) => b.type === 'high_impressions_low_engagement');
      expect(hiLe).toBeUndefined();
    });
  });

  describe('High Impressions Low CTR', () => {
    it('should detect when CTR is low despite high impressions', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 1000,
        visits: 10,
        bounceRate: 0.5,
        avgTimeOnPage: 120,
        conversionRate: 0.02,
        ctr: 0.01, // Very low CTR
      });

      const bottlenecks = detector.detect();
      const hiLc = bottlenecks.find((b) => b.type === 'high_impressions_low_ctr');
      expect(hiLc).toBeDefined();
      expect(hiLc?.suggestedActions).toContain('Rewrite title for better click appeal');
    });
  });

  describe('High CTR Low Dwell', () => {
    it('should detect when dwell time is low despite high CTR', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 200,
        visits: 50,
        bounceRate: 0.7,
        avgTimeOnPage: 10, // Very low dwell time
        conversionRate: 0.01,
        ctr: 0.08, // High CTR
      });

      const bottlenecks = detector.detect();
      const hcLd = bottlenecks.find((b) => b.type === 'high_ctr_low_dwell');
      expect(hcLd).toBeDefined();
      expect(hcLd?.description).toContain('users leave after only');
    });
  });

  describe('High Bounce Rate', () => {
    it('should detect high bounce rate', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 100,
        visits: 100,
        bounceRate: 0.85, // Above 0.7 threshold
        avgTimeOnPage: 30,
        conversionRate: 0.01,
        ctr: 0.03,
      });

      const bottlenecks = detector.detect();
      const hbr = bottlenecks.find((b) => b.type === 'high_bounce_rate');
      expect(hbr).toBeDefined();
      expect(hbr?.suggestedActions).toContain('Improve content relevance to search intent');
    });
  });

  describe('AI Traffic Non-AEO', () => {
    it('should detect AI traffic landing on non-AEO content', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        title: 'AI Target Article',
        impressions: 200,
        visits: 100,
        bounceRate: 0.5,
        avgTimeOnPage: 60,
        conversionRate: 0.02,
        ctr: 0.05,
        aiVisibilityScore: 20,
        hasAeoCapsule: false,
        segments: [
          {
            segment: {
              id: 'ai_search:informational:desktop',
              source: 'ai_search',
              intent: 'informational',
              device: 'desktop',
            },
            visits: 50,
            uniqueVisitors: 45,
            bounceRate: 0.4,
            avgTimeOnPage: 90,
            conversionRate: 0.01,
            engagementScore: 60,
          },
        ],
      });

      const bottlenecks = detector.detect();
      const aiNonAeo = bottlenecks.find((b) => b.type === 'ai_traffic_non_aeo');
      expect(aiNonAeo).toBeDefined();
      expect(aiNonAeo?.suggestedActions).toContain('Add concise answer capsule (40-60 words)');
    });

    it('should not detect when content has AEO capsule and good AI score', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 200,
        visits: 100,
        bounceRate: 0.5,
        avgTimeOnPage: 60,
        conversionRate: 0.02,
        ctr: 0.05,
        aiVisibilityScore: 75, // Good AI score
        hasAeoCapsule: true,
        segments: [
          {
            segment: {
              id: 'ai_search:informational:desktop',
              source: 'ai_search',
              intent: 'informational',
              device: 'desktop',
            },
            visits: 50,
            uniqueVisitors: 45,
            bounceRate: 0.4,
            avgTimeOnPage: 90,
            conversionRate: 0.01,
            engagementScore: 60,
          },
        ],
      });

      const bottlenecks = detector.detect();
      const aiNonAeo = bottlenecks.find((b) => b.type === 'ai_traffic_non_aeo');
      expect(aiNonAeo).toBeUndefined();
    });
  });

  describe('Low Conversion', () => {
    it('should detect low conversion with sufficient traffic', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 500,
        visits: 200,
        bounceRate: 0.4,
        avgTimeOnPage: 120,
        conversionRate: 0.005, // Below 1% threshold
        ctr: 0.05,
      });

      const bottlenecks = detector.detect();
      const lc = bottlenecks.find((b) => b.type === 'low_conversion');
      expect(lc).toBeDefined();
    });

    it('should not detect with low traffic', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 100,
        visits: 30, // Below 50 visit threshold
        bounceRate: 0.4,
        avgTimeOnPage: 120,
        conversionRate: 0.005,
        ctr: 0.05,
      });

      const bottlenecks = detector.detect();
      const lc = bottlenecks.find((b) => b.type === 'low_conversion');
      expect(lc).toBeUndefined();
    });
  });

  describe('Content Freshness Decay', () => {
    it('should detect stale content', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 120); // 120 days ago

      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 200,
        visits: 100,
        bounceRate: 0.5,
        avgTimeOnPage: 60,
        conversionRate: 0.02,
        ctr: 0.05,
        lastUpdated: oldDate,
      });

      const bottlenecks = detector.detect();
      const cfd = bottlenecks.find((b) => b.type === 'content_freshness_decay');
      expect(cfd).toBeDefined();
      expect(cfd?.description).toContain("hasn't been updated");
    });

    it('should not detect recently updated content', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 200,
        visits: 100,
        bounceRate: 0.5,
        avgTimeOnPage: 60,
        conversionRate: 0.02,
        ctr: 0.05,
        lastUpdated: recentDate,
      });

      const bottlenecks = detector.detect();
      const cfd = bottlenecks.find((b) => b.type === 'content_freshness_decay');
      expect(cfd).toBeUndefined();
    });
  });

  describe('generateReport', () => {
    it('should generate report sorted by severity', () => {
      // Add content that will trigger different severity bottlenecks
      detector.addContentMetrics({
        contentId: 'critical-content',
        impressions: 5000,
        visits: 500,
        bounceRate: 0.95,
        avgTimeOnPage: 5,
        conversionRate: 0,
        ctr: 0.01,
      });

      detector.addContentMetrics({
        contentId: 'minor-content',
        impressions: 150,
        visits: 50,
        bounceRate: 0.75,
        avgTimeOnPage: 25,
        conversionRate: 0.008,
        ctr: 0.02,
      });

      detector.detect();
      const report = detector.generateReport();

      expect(report.totalBottlenecks).toBeGreaterThan(0);
      expect(report.criticalCount + report.highCount).toBeGreaterThan(0);

      // Check that bottlenecks are sorted by severity
      if (report.bottlenecks.length > 1) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        for (let i = 1; i < report.bottlenecks.length; i++) {
          const prevSev = severityOrder[report.bottlenecks[i - 1].severity];
          const currSev = severityOrder[report.bottlenecks[i].severity];
          expect(currSev).toBeGreaterThanOrEqual(prevSev);
        }
      }
    });

    it('should include top priority bottlenecks', () => {
      detector.addContentMetrics({
        contentId: 'test-1',
        impressions: 1000,
        visits: 100,
        bounceRate: 0.9,
        avgTimeOnPage: 10,
        conversionRate: 0.001,
        ctr: 0.01,
      });

      detector.detect();
      const report = detector.generateReport();

      expect(report.topPriority).toBeDefined();
      expect(report.topPriority.length).toBeLessThanOrEqual(10);
    });
  });

  describe('detectForContent', () => {
    it('should only detect bottlenecks for specific content', () => {
      detector.addContentMetrics({
        contentId: 'content-1',
        impressions: 500,
        visits: 100,
        bounceRate: 0.9,
        avgTimeOnPage: 10,
        conversionRate: 0.001,
        ctr: 0.01,
      });

      detector.addContentMetrics({
        contentId: 'content-2',
        impressions: 500,
        visits: 100,
        bounceRate: 0.3,
        avgTimeOnPage: 180,
        conversionRate: 0.05,
        ctr: 0.08,
      });

      const bottlenecks = detector.detectForContent('content-1');

      expect(bottlenecks.length).toBeGreaterThan(0);
      expect(bottlenecks.every((b) => b.affectedContent[0].contentId === 'content-1')).toBe(true);
    });
  });
});

describe('Singleton', () => {
  afterEach(() => {
    resetBottleneckDetector();
  });

  it('should return same instance', () => {
    const d1 = getBottleneckDetector();
    const d2 = getBottleneckDetector();
    expect(d1).toBe(d2);
  });

  it('should reset instance', () => {
    const d1 = getBottleneckDetector();
    d1.addContentMetrics({
      contentId: 'test',
      impressions: 100,
      visits: 10,
      bounceRate: 0.5,
      avgTimeOnPage: 60,
      conversionRate: 0.02,
      ctr: 0.05,
    });

    resetBottleneckDetector();

    const d2 = getBottleneckDetector();
    const report = d2.generateReport();
    expect(report.totalBottlenecks).toBe(0);
  });
});
