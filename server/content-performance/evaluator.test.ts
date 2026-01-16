/**
 * Content Performance - Evaluator Tests
 */

import { describe, it, expect } from 'vitest';
import { PERFORMANCE_THRESHOLDS, PerformanceMetrics, IssueSeverity } from './types';

describe('Content Performance Evaluator', () => {
  describe('Thresholds', () => {
    it('has correct threshold values', () => {
      expect(PERFORMANCE_THRESHOLDS.LOW_CTR).toBe(0.02);
      expect(PERFORMANCE_THRESHOLDS.HIGH_BOUNCE).toBe(0.80);
      expect(PERFORMANCE_THRESHOLDS.LOW_DWELL).toBe(30);
      expect(PERFORMANCE_THRESHOLDS.POOR_POSITION).toBe(20);
      expect(PERFORMANCE_THRESHOLDS.MIN_IMPRESSIONS).toBe(100);
    });
  });

  describe('Issue Detection', () => {
    function detectLowCtr(metrics: PerformanceMetrics): boolean {
      return (
        metrics.impressions >= PERFORMANCE_THRESHOLDS.MIN_IMPRESSIONS &&
        metrics.ctr < PERFORMANCE_THRESHOLDS.LOW_CTR
      );
    }

    function detectHighBounce(metrics: PerformanceMetrics): boolean {
      return metrics.bounceRate >= PERFORMANCE_THRESHOLDS.HIGH_BOUNCE;
    }

    function detectNoClicks(metrics: PerformanceMetrics): boolean {
      return (
        metrics.impressions >= PERFORMANCE_THRESHOLDS.MIN_IMPRESSIONS &&
        metrics.clicks === 0
      );
    }

    it('detects low CTR correctly', () => {
      const metrics: PerformanceMetrics = {
        contentId: 'test',
        impressions: 200,
        clicks: 2,
        ctr: 0.01, // 1%
        avgPosition: 10,
        bounceRate: 0.5,
        avgDwellTime: 60,
        pageviews: 10,
        uniqueVisitors: 8,
        measuredAt: new Date(),
        periodDays: 30,
      };

      expect(detectLowCtr(metrics)).toBe(true);
    });

    it('does not flag low CTR with insufficient impressions', () => {
      const metrics: PerformanceMetrics = {
        contentId: 'test',
        impressions: 50,
        clicks: 0,
        ctr: 0,
        avgPosition: 10,
        bounceRate: 0.5,
        avgDwellTime: 60,
        pageviews: 10,
        uniqueVisitors: 8,
        measuredAt: new Date(),
        periodDays: 30,
      };

      expect(detectLowCtr(metrics)).toBe(false);
    });

    it('detects high bounce rate', () => {
      const metrics: PerformanceMetrics = {
        contentId: 'test',
        impressions: 100,
        clicks: 50,
        ctr: 0.5,
        avgPosition: 5,
        bounceRate: 0.85,
        avgDwellTime: 60,
        pageviews: 50,
        uniqueVisitors: 40,
        measuredAt: new Date(),
        periodDays: 30,
      };

      expect(detectHighBounce(metrics)).toBe(true);
    });

    it('detects no clicks despite impressions', () => {
      const metrics: PerformanceMetrics = {
        contentId: 'test',
        impressions: 500,
        clicks: 0,
        ctr: 0,
        avgPosition: 15,
        bounceRate: 0,
        avgDwellTime: 0,
        pageviews: 0,
        uniqueVisitors: 0,
        measuredAt: new Date(),
        periodDays: 30,
      };

      expect(detectNoClicks(metrics)).toBe(true);
    });
  });

  describe('Severity Calculation', () => {
    function calculateCtrSeverity(ctr: number): IssueSeverity {
      if (ctr < 0.005) return 'critical';
      if (ctr < 0.01) return 'high';
      if (ctr < 0.015) return 'medium';
      return 'low';
    }

    it('returns critical for very low CTR', () => {
      expect(calculateCtrSeverity(0.002)).toBe('critical');
    });

    it('returns high for low CTR', () => {
      expect(calculateCtrSeverity(0.008)).toBe('high');
    });

    it('returns medium for moderate CTR', () => {
      expect(calculateCtrSeverity(0.012)).toBe('medium');
    });

    it('returns low for borderline CTR', () => {
      expect(calculateCtrSeverity(0.018)).toBe('low');
    });
  });
});
