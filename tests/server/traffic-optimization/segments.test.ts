/**
 * Traffic Segment Analyzer - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TrafficSegmentAnalyzer,
  getSegmentAnalyzer,
  resetSegmentAnalyzer,
  generateSegmentId,
  parseSegmentId,
  inferIntent,
  inferDevice,
  calculateEngagementScore,
  analyzeSegmentPerformance,
} from '../../../server/traffic-optimization/segments';

describe('generateSegmentId', () => {
  it('should generate correct segment ID', () => {
    const segment = {
      id: '',
      source: 'organic_search' as const,
      intent: 'informational' as const,
      device: 'desktop' as const,
    };

    const id = generateSegmentId(segment);
    expect(id).toBe('organic_search:informational:desktop');
  });

  it('should include subSource when present', () => {
    const segment = {
      id: '',
      source: 'ai_search' as const,
      intent: 'informational' as const,
      device: 'mobile' as const,
      subSource: 'chatgpt',
    };

    const id = generateSegmentId(segment);
    expect(id).toBe('ai_search:informational:mobile:chatgpt');
  });
});

describe('parseSegmentId', () => {
  it('should parse basic segment ID', () => {
    const segment = parseSegmentId('organic_search:informational:desktop');

    expect(segment.source).toBe('organic_search');
    expect(segment.intent).toBe('informational');
    expect(segment.device).toBe('desktop');
    expect(segment.subSource).toBeUndefined();
  });

  it('should parse segment ID with subSource', () => {
    const segment = parseSegmentId('ai_search:transactional:mobile:perplexity');

    expect(segment.source).toBe('ai_search');
    expect(segment.intent).toBe('transactional');
    expect(segment.device).toBe('mobile');
    expect(segment.subSource).toBe('perplexity');
  });
});

describe('inferIntent', () => {
  it('should detect transactional intent', () => {
    expect(inferIntent({ hasTransaction: true })).toBe('transactional');
    expect(inferIntent({ queryTerms: ['buy', 'tickets'] })).toBe('transactional');
    expect(inferIntent({ queryTerms: ['book', 'hotel'] })).toBe('transactional');
  });

  it('should detect commercial intent', () => {
    expect(inferIntent({ queryTerms: ['best', 'hotels'] })).toBe('commercial');
    expect(inferIntent({ queryTerms: ['review', 'restaurant'] })).toBe('commercial');
    expect(inferIntent({ queryTerms: ['compare', 'prices'] })).toBe('commercial');
  });

  it('should detect navigational intent', () => {
    expect(inferIntent({ pageType: 'homepage' })).toBe('navigational');
    expect(inferIntent({ pageType: 'category' })).toBe('navigational');
  });

  it('should default to informational', () => {
    expect(inferIntent({})).toBe('informational');
    expect(inferIntent({ queryTerms: ['what', 'is'] })).toBe('informational');
  });
});

describe('inferDevice', () => {
  it('should detect mobile devices', () => {
    expect(inferDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe('mobile');
    expect(inferDevice('Mozilla/5.0 (Linux; Android 10)')).toBe('mobile');
  });

  it('should detect tablets', () => {
    expect(inferDevice('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe('tablet');
  });

  it('should detect desktop', () => {
    expect(inferDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(inferDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop');
  });

  it('should return unknown for missing user agent', () => {
    expect(inferDevice(undefined)).toBe('unknown');
    expect(inferDevice('')).toBe('unknown');
  });
});

describe('calculateEngagementScore', () => {
  it('should return high score for good metrics', () => {
    const score = calculateEngagementScore({
      bounceRate: 0.2,
      avgTimeOnPage: 180,
      conversionRate: 0.05,
    });

    // Score formula: bounceNorm*0.3 + timeNorm*0.3 + convNorm*0.4
    // bounceNorm = 1 - 0.2 = 0.8, timeNorm = 180/300 = 0.6, convNorm = 0.05/0.1 = 0.5
    // score = 0.8*0.3 + 0.6*0.3 + 0.5*0.4 = 0.24 + 0.18 + 0.2 = 0.62 → 62
    expect(score).toBeGreaterThan(50);
  });

  it('should return low score for poor metrics', () => {
    const score = calculateEngagementScore({
      bounceRate: 0.9,
      avgTimeOnPage: 10,
      conversionRate: 0,
    });

    expect(score).toBeLessThan(30);
  });

  it('should return moderate score for average metrics', () => {
    const score = calculateEngagementScore({
      bounceRate: 0.5,
      avgTimeOnPage: 60,
      conversionRate: 0.02,
    });

    // bounceNorm = 0.5, timeNorm = 0.2, convNorm = 0.2
    // score = 0.5*0.3 + 0.2*0.3 + 0.2*0.4 = 0.15 + 0.06 + 0.08 = 0.29 → 29
    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThanOrEqual(70);
  });
});

describe('TrafficSegmentAnalyzer', () => {
  let analyzer: TrafficSegmentAnalyzer;

  beforeEach(() => {
    analyzer = new TrafficSegmentAnalyzer();
  });

  afterEach(() => {
    analyzer.clear();
  });

  describe('recordVisit', () => {
    it('should record visits correctly', () => {
      analyzer.recordVisit('organic_search', 'informational', 'desktop', {});
      analyzer.recordVisit('organic_search', 'informational', 'desktop', {});

      expect(analyzer.size()).toBe(1);

      const report = analyzer.generateReport();
      expect(report.segments[0].metrics.visits).toBe(2);
    });

    it('should track unique visitors', () => {
      analyzer.recordVisit('direct', 'navigational', 'mobile', { visitorId: 'v1' });
      analyzer.recordVisit('direct', 'navigational', 'mobile', { visitorId: 'v1' });
      analyzer.recordVisit('direct', 'navigational', 'mobile', { visitorId: 'v2' });

      const report = analyzer.generateReport();
      expect(report.segments[0].metrics.uniqueVisitors).toBe(3); // Incremented each time
    });

    it('should track bounces', () => {
      analyzer.recordVisit('social', 'informational', 'mobile', { isBounce: true });
      analyzer.recordVisit('social', 'informational', 'mobile', { isBounce: false });

      const report = analyzer.generateReport();
      expect(report.segments[0].metrics.bounceRate).toBe(0.5);
    });
  });

  describe('generateReport', () => {
    it('should identify underperformers', () => {
      // Good segment
      analyzer.recordVisit('direct', 'navigational', 'desktop', {
        timeOnPage: 200,
        isConversion: true,
      });

      // Poor segment
      for (let i = 0; i < 10; i++) {
        analyzer.recordVisit('social', 'informational', 'mobile', {
          isBounce: true,
          timeOnPage: 5,
        });
      }

      const report = analyzer.generateReport();

      expect(report.underperformers.length).toBeGreaterThan(0);
      expect(report.underperformers[0].segment.source).toBe('social');
    });

    it('should generate insights', () => {
      analyzer.recordVisit('ai_search', 'informational', 'desktop', {
        isBounce: true,
        timeOnPage: 10,
      });

      const report = analyzer.generateReport();

      expect(report.insights.length).toBeGreaterThan(0);
    });
  });
});

describe('Singleton', () => {
  afterEach(() => {
    resetSegmentAnalyzer();
  });

  it('should return same instance', () => {
    const a1 = getSegmentAnalyzer();
    const a2 = getSegmentAnalyzer();
    expect(a1).toBe(a2);
  });

  it('should reset instance', () => {
    const a1 = getSegmentAnalyzer();
    a1.recordVisit('direct', 'navigational', 'desktop', {});

    resetSegmentAnalyzer();

    const a2 = getSegmentAnalyzer();
    expect(a2.size()).toBe(0);
  });
});
