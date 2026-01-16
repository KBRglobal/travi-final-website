/**
 * Traffic Attribution - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AttributionStore,
  getAttributionStore,
  resetAttributionStore,
} from '../../../server/traffic-intel/attribution';

describe('AttributionStore', () => {
  let store: AttributionStore;

  beforeEach(() => {
    store = new AttributionStore();
  });

  afterEach(() => {
    store.clear();
    store.stop();
  });

  describe('record', () => {
    it('should record a visit', () => {
      store.record('content-1', 'organic_search', 'google');

      const summary = store.getSummary();
      expect(summary.totalVisits).toBe(1);
      expect(summary.channelBreakdown.organic_search).toBe(1);
    });

    it('should aggregate visits for same content/channel/source', () => {
      store.record('content-1', 'organic_search', 'google');
      store.record('content-1', 'organic_search', 'google');
      store.record('content-1', 'organic_search', 'google');

      const summary = store.getSummary();
      expect(summary.totalVisits).toBe(3);
    });

    it('should separate different channels', () => {
      store.record('content-1', 'organic_search', 'google');
      store.record('content-1', 'ai_search', 'chatgpt', { aiPlatform: 'chatgpt' });

      const summary = store.getSummary();
      expect(summary.channelBreakdown.organic_search).toBe(1);
      expect(summary.channelBreakdown.ai_search).toBe(1);
    });

    it('should track unique visitors', () => {
      store.record('content-1', 'direct', 'direct', { visitorId: 'visitor-1' });
      store.record('content-1', 'direct', 'direct', { visitorId: 'visitor-1' });
      store.record('content-1', 'direct', 'direct', { visitorId: 'visitor-2' });

      const data = store.getAggregatedData();
      expect(data[0].visits).toBe(3);
      expect(data[0].uniqueVisitors).toBe(2);
    });

    it('should track bounces', () => {
      store.record('content-1', 'direct', 'direct', { isBounce: true });
      store.record('content-1', 'direct', 'direct', { isBounce: false });

      const data = store.getAggregatedData();
      expect(data[0].bounceCount).toBe(1);
    });

    it('should track time on page', () => {
      store.record('content-1', 'direct', 'direct', { timeOnPage: 30 });
      store.record('content-1', 'direct', 'direct', { timeOnPage: 45 });

      const data = store.getAggregatedData();
      expect(data[0].totalTimeOnPage).toBe(75);
    });
  });

  describe('getContentStats', () => {
    it('should return stats for specific content', () => {
      store.record('content-1', 'organic_search', 'google');
      store.record('content-2', 'organic_search', 'bing');
      store.record('content-1', 'social', 'facebook');

      const stats = store.getContentStats('content-1');

      expect(stats.length).toBe(2);
      expect(stats.every((s) => s.contentId === 'content-1')).toBe(true);
    });

    it('should return empty array for non-existent content', () => {
      store.record('content-1', 'organic_search', 'google');

      const stats = store.getContentStats('content-999');

      expect(stats.length).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('should return correct channel breakdown', () => {
      store.record('content-1', 'organic_search', 'google');
      store.record('content-2', 'ai_search', 'chatgpt');
      store.record('content-3', 'social', 'facebook');
      store.record('content-4', 'direct', 'direct');
      store.record('content-5', 'referral', 'blog.com');

      const summary = store.getSummary();

      expect(summary.channelBreakdown.organic_search).toBe(1);
      expect(summary.channelBreakdown.ai_search).toBe(1);
      expect(summary.channelBreakdown.social).toBe(1);
      expect(summary.channelBreakdown.direct).toBe(1);
      expect(summary.channelBreakdown.referral).toBe(1);
      expect(summary.totalVisits).toBe(5);
    });
  });

  describe('getAggregatedData', () => {
    it('should return all aggregated entries', () => {
      store.record('content-1', 'organic_search', 'google');
      store.record('content-2', 'ai_search', 'chatgpt');

      const data = store.getAggregatedData();

      expect(data.length).toBe(2);
      expect(data.every((d) => d.visits >= 1)).toBe(true);
    });

    it('should include AI platform for AI traffic', () => {
      store.record('content-1', 'ai_search', 'chatgpt', { aiPlatform: 'chatgpt' });

      const data = store.getAggregatedData();

      expect(data[0].aiPlatform).toBe('chatgpt');
    });
  });
});

describe('Singleton Store', () => {
  afterEach(() => {
    resetAttributionStore();
  });

  it('should return same instance', () => {
    const store1 = getAttributionStore();
    const store2 = getAttributionStore();

    expect(store1).toBe(store2);
  });

  it('should reset instance', () => {
    const store1 = getAttributionStore();
    store1.record('content-1', 'direct', 'direct');

    resetAttributionStore();

    const store2 = getAttributionStore();
    expect(store2.getSummary().totalVisits).toBe(0);
  });
});
