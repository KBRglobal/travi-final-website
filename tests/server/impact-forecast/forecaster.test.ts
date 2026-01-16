/**
 * Impact Forecaster - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ImpactForecaster,
  getImpactForecaster,
  resetImpactForecaster,
} from '../../../server/impact-forecast';

describe('ImpactForecaster', () => {
  let forecaster: ImpactForecaster;

  beforeEach(() => {
    forecaster = new ImpactForecaster();
  });

  afterEach(() => {
    forecaster.clear();
  });

  describe('createInput', () => {
    it('should create forecast input', () => {
      const input = forecaster.createInput(
        'content_change',
        'proposal-123',
        'title_change',
        [{ type: 'title_change', target: 'article-1', rationale: 'Improve CTR' }],
        { currentTraffic: 1000, currentRevenue: 10000 }
      );

      expect(input.id).toBeDefined();
      expect(input.source).toBe('content_change');
      expect(input.proposalId).toBe('proposal-123');
      expect(input.changes.length).toBe(1);
    });
  });

  describe('forecast', () => {
    it('should generate forecast for valid input', () => {
      const input = forecaster.createInput(
        'content_change',
        'proposal-1',
        'content_update',
        [
          { type: 'content_update', target: 'article-1', rationale: 'Update content' },
        ],
        { currentTraffic: 1000, currentConversion: 0.03, currentRevenue: 10000 }
      );

      const forecast = forecaster.forecast(input.id);

      expect(forecast).toBeDefined();
      expect(forecast?.traffic).toBeDefined();
      expect(forecast?.conversion).toBeDefined();
      expect(forecast?.revenue).toBeDefined();
      expect(forecast?.seoRisk).toBeDefined();
      expect(forecast?.aeoRisk).toBeDefined();
      expect(forecast?.cannibalization).toBeDefined();
    });

    it('should include confidence scores', () => {
      const input = forecaster.createInput(
        'content_change',
        'proposal-2',
        'aeo_optimization',
        [{ type: 'aeo_optimization', target: 'article-1', rationale: 'Add AEO' }],
        { currentTraffic: 500 }
      );

      const forecast = forecaster.forecast(input.id);

      expect(forecast?.confidence).toBeGreaterThan(0);
      expect(forecast?.confidence).toBeLessThanOrEqual(1);
      expect(forecast?.traffic.confidence).toBeDefined();
    });

    it('should assess SEO risk', () => {
      const input = forecaster.createInput(
        'content_change',
        'proposal-3',
        'url_change',
        [{ type: 'url_change', target: 'article-1', rationale: 'Change URL' }],
        {}
      );

      const forecast = forecaster.forecast(input.id);

      expect(forecast?.seoRisk.level).toBeDefined();
      expect(['minimal', 'low', 'medium', 'high', 'critical']).toContain(forecast?.seoRisk.level);
    });

    it('should assess AEO risk', () => {
      const input = forecaster.createInput(
        'content_change',
        'proposal-4',
        'content_removal',
        [{
          type: 'content_removal',
          target: 'article-1',
          field: 'answer_capsule',
          rationale: 'Remove answer section'
        }],
        {}
      );

      const forecast = forecaster.forecast(input.id);

      expect(forecast?.aeoRisk.level).toBeDefined();
    });

    it('should detect cannibalization risk', () => {
      const input = forecaster.createInput(
        'content_change',
        'proposal-5',
        'add_content',
        [{ type: 'add_content', target: 'new-article', rationale: 'Add similar content' }],
        { relatedContentIds: ['article-1', 'article-2'] }
      );

      const forecast = forecaster.forecast(input.id);

      expect(forecast?.cannibalization).toBeDefined();
    });

    it('should generate explanation', () => {
      const input = forecaster.createInput(
        'funnel_change',
        'proposal-6',
        'structure_change',
        [{ type: 'structure_change', target: 'funnel-1', rationale: 'Simplify' }],
        { currentTraffic: 1000 }
      );

      const forecast = forecaster.forecast(input.id);

      expect(forecast?.explanation).toBeDefined();
      expect(forecast?.explanation.summary).toBeDefined();
      expect(forecast?.explanation.keyDrivers.length).toBeGreaterThan(0);
    });

    it('should return undefined for missing input', () => {
      const forecast = forecaster.forecast('nonexistent');
      expect(forecast).toBeUndefined();
    });
  });

  describe('quickForecast', () => {
    it('should generate forecast without separate input creation', () => {
      const forecast = forecaster.quickForecast(
        'experiment',
        'exp-1',
        'ab_test',
        [{ type: 'cta_optimization', target: 'page-1', rationale: 'Test CTA' }],
        { currentConversion: 0.02 }
      );

      expect(forecast).toBeDefined();
      expect(forecast?.inputId).toBeDefined();
    });
  });

  describe('compareForecasts', () => {
    it('should compare multiple forecasts', () => {
      const f1 = forecaster.quickForecast(
        'content_change',
        'option-a',
        'title_change',
        [{ type: 'title_change', target: 'article', rationale: 'Option A' }],
        { currentTraffic: 1000 }
      );

      const f2 = forecaster.quickForecast(
        'content_change',
        'option-b',
        'content_update',
        [{ type: 'content_update', target: 'article', rationale: 'Option B' }],
        { currentTraffic: 1000 }
      );

      if (f1 && f2) {
        const comparison = forecaster.compareForecasts([f1.id, f2.id]);

        expect(comparison.forecasts.length).toBe(2);
        expect(comparison.bestOption).toBeDefined();
        expect(comparison.analysis.length).toBe(2);
      }
    });

    it('should identify pros and cons', () => {
      const forecast = forecaster.quickForecast(
        'content_change',
        'proposal',
        'title_change',
        [{ type: 'title_change', target: 'article', rationale: 'Improve' }],
        { currentTraffic: 1000, currentRevenue: 10000 }
      );

      if (forecast) {
        const comparison = forecaster.compareForecasts([forecast.id]);

        expect(comparison.analysis[0].pros).toBeDefined();
        expect(comparison.analysis[0].cons).toBeDefined();
      }
    });
  });

  describe('Data Management', () => {
    it('should get forecast by ID', () => {
      const forecast = forecaster.quickForecast(
        'content_change',
        'test',
        'test',
        [{ type: 'content_update', target: 'test', rationale: 'test' }],
        {}
      );

      if (forecast) {
        const retrieved = forecaster.getForecast(forecast.id);
        expect(retrieved).toBe(forecast);
      }
    });

    it('should get all forecasts', () => {
      forecaster.quickForecast('content_change', 'p1', 't1', [], {});
      forecaster.quickForecast('content_change', 'p2', 't2', [], {});

      const all = forecaster.getAllForecasts();
      expect(all.length).toBe(2);
    });

    it('should clear all data', () => {
      forecaster.quickForecast('content_change', 'test', 'test', [], {});
      forecaster.clear();

      expect(forecaster.getAllForecasts().length).toBe(0);
    });
  });
});

describe('Singleton', () => {
  afterEach(() => {
    resetImpactForecaster();
  });

  it('should return same instance', () => {
    const f1 = getImpactForecaster();
    const f2 = getImpactForecaster();
    expect(f1).toBe(f2);
  });

  it('should reset instance', () => {
    const f1 = getImpactForecaster();
    f1.quickForecast('content_change', 'test', 'test', [], {});

    resetImpactForecaster();

    const f2 = getImpactForecaster();
    expect(f2.getAllForecasts().length).toBe(0);
  });
});
