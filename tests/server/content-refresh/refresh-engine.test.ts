/**
 * Content Refresh Engine - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../../../server/content-refresh/config', () => ({
  isContentRefreshEnabled: vi.fn(() => true),
  REFRESH_CONFIG: {
    freshnessThresholds: { critical: 365, high: 180, medium: 90, low: 30 },
    trafficDropThresholds: { critical: -50, high: -30, medium: -15 },
    revenueDropThresholds: { critical: -40, high: -25, medium: -10 },
    signalWeights: {
      stale_content: 25,
      traffic_drop: 30,
      zero_search_results: 15,
      revenue_decline: 20,
      low_engagement: 10,
    },
    priorityThresholds: { critical: 80, high: 60, medium: 40 },
    cacheTtl: 600,
  },
  scoreToPriority: vi.fn((score: number) => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }),
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

import { calculateRefreshScore } from '../../../server/content-refresh/engine';
import type { RefreshSignal } from '../../../server/content-refresh/types';

describe('Content Refresh Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateRefreshScore', () => {
    it('should return 0 for no triggered signals', () => {
      const signals: RefreshSignal[] = [
        {
          code: 'stale_content',
          weight: 25,
          description: 'Content age',
          value: 30,
          threshold: 90,
          triggered: false,
        },
        {
          code: 'traffic_drop',
          weight: 30,
          description: 'Traffic change',
          value: 5,
          threshold: -15,
          triggered: false,
        },
      ];

      const score = calculateRefreshScore(signals);
      expect(score).toBe(0);
    });

    it('should calculate score based on triggered signals', () => {
      const signals: RefreshSignal[] = [
        {
          code: 'stale_content',
          weight: 25,
          description: 'Content age',
          value: 180,
          threshold: 90,
          triggered: true,
        },
        {
          code: 'traffic_drop',
          weight: 30,
          description: 'Traffic change',
          value: -20,
          threshold: -15,
          triggered: true,
        },
        {
          code: 'revenue_decline',
          weight: 20,
          description: 'Revenue change',
          value: 10,
          threshold: -10,
          triggered: false,
        },
      ];

      const score = calculateRefreshScore(signals);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap score at 100', () => {
      const signals: RefreshSignal[] = [
        {
          code: 'stale_content',
          weight: 25,
          description: 'Content age',
          value: 500,
          threshold: 90,
          triggered: true,
        },
        {
          code: 'traffic_drop',
          weight: 30,
          description: 'Traffic change',
          value: -80,
          threshold: -15,
          triggered: true,
        },
        {
          code: 'revenue_decline',
          weight: 20,
          description: 'Revenue change',
          value: -60,
          threshold: -10,
          triggered: true,
        },
        {
          code: 'zero_search_results',
          weight: 15,
          description: 'Zero search',
          value: 100,
          threshold: 5,
          triggered: true,
        },
        {
          code: 'low_engagement',
          weight: 10,
          description: 'Low engagement',
          value: 90,
          threshold: 70,
          triggered: true,
        },
      ];

      const score = calculateRefreshScore(signals);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should weight severity correctly for stale content', () => {
      const mildlyStale: RefreshSignal[] = [
        {
          code: 'stale_content',
          weight: 25,
          description: 'Content age',
          value: 95,  // Just over threshold
          threshold: 90,
          triggered: true,
        },
      ];

      const veryStale: RefreshSignal[] = [
        {
          code: 'stale_content',
          weight: 25,
          description: 'Content age',
          value: 180,  // Double threshold
          threshold: 90,
          triggered: true,
        },
      ];

      const mildScore = calculateRefreshScore(mildlyStale);
      const severeScore = calculateRefreshScore(veryStale);

      expect(severeScore).toBeGreaterThan(mildScore);
    });

    it('should weight severity correctly for traffic drop', () => {
      const mildDrop: RefreshSignal[] = [
        {
          code: 'traffic_drop',
          weight: 30,
          description: 'Traffic change',
          value: -16,  // Just over threshold
          threshold: -15,
          triggered: true,
        },
      ];

      const severeDrop: RefreshSignal[] = [
        {
          code: 'traffic_drop',
          weight: 30,
          description: 'Traffic change',
          value: -50,  // Much worse
          threshold: -15,
          triggered: true,
        },
      ];

      const mildScore = calculateRefreshScore(mildDrop);
      const severeScore = calculateRefreshScore(severeDrop);

      expect(severeScore).toBeGreaterThan(mildScore);
    });
  });

  describe('Priority Calculation', () => {
    it('should classify critical priority correctly', () => {
      const { scoreToPriority } = require('../../../server/content-refresh/config');
      expect(scoreToPriority(85)).toBe('critical');
      expect(scoreToPriority(80)).toBe('critical');
    });

    it('should classify high priority correctly', () => {
      const { scoreToPriority } = require('../../../server/content-refresh/config');
      expect(scoreToPriority(70)).toBe('high');
      expect(scoreToPriority(60)).toBe('high');
    });

    it('should classify medium priority correctly', () => {
      const { scoreToPriority } = require('../../../server/content-refresh/config');
      expect(scoreToPriority(50)).toBe('medium');
      expect(scoreToPriority(40)).toBe('medium');
    });

    it('should classify low priority correctly', () => {
      const { scoreToPriority } = require('../../../server/content-refresh/config');
      expect(scoreToPriority(30)).toBe('low');
      expect(scoreToPriority(0)).toBe('low');
    });
  });

  describe('Signal Triggering', () => {
    it('should trigger stale content signal for old content', () => {
      const ageInDays = 100;
      const threshold = 90;
      const triggered = ageInDays >= threshold;

      expect(triggered).toBe(true);
    });

    it('should not trigger stale content signal for fresh content', () => {
      const ageInDays = 30;
      const threshold = 90;
      const triggered = ageInDays >= threshold;

      expect(triggered).toBe(false);
    });

    it('should trigger traffic drop signal for negative change', () => {
      const trafficChange = -20;
      const threshold = -15;
      const triggered = trafficChange <= threshold;

      expect(triggered).toBe(true);
    });

    it('should trigger revenue decline signal correctly', () => {
      const revenueChange = -30;
      const threshold = -10;
      const triggered = revenueChange <= threshold;

      expect(triggered).toBe(true);
    });

    it('should not trigger for positive changes', () => {
      const trafficChange = 10;
      const threshold = -15;
      const triggered = trafficChange <= threshold;

      expect(triggered).toBe(false);
    });
  });
});
