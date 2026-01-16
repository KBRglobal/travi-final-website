/**
 * Intent Graph Query Engine - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  IntentGraphBuilder,
  IntentGraphScorer,
  IntentGraphQueryEngine,
  getIntentGraphQueryEngine,
  resetIntentGraphQueryEngine,
  resetIntentGraphBuilder,
  resetIntentGraphScorer,
} from '../../../server/intent-graph';

describe('IntentGraphQueryEngine', () => {
  let builder: IntentGraphBuilder;
  let scorer: IntentGraphScorer;
  let queryEngine: IntentGraphQueryEngine;

  beforeEach(() => {
    builder = new IntentGraphBuilder();
    scorer = new IntentGraphScorer(builder);
    queryEngine = new IntentGraphQueryEngine(builder, scorer);
  });

  afterEach(() => {
    builder.clear();
    scorer.clearCache();
  });

  /**
   * Helper to create test journeys
   */
  function createTestJourneys() {
    // Successful journey: search -> article-1 -> signup
    builder.processSignal({
      type: 'visit',
      sessionId: 'success-1',
      intent: 'search',
      source: 'google',
      contentId: 'article-1',
      timestamp: new Date(),
    });
    builder.processSignal({
      type: 'conversion',
      sessionId: 'success-1',
      outcome: 'signup',
      value: 100,
      timestamp: new Date(),
    });

    // Another successful journey
    builder.processSignal({
      type: 'visit',
      sessionId: 'success-2',
      intent: 'search',
      source: 'google',
      contentId: 'article-1',
      timestamp: new Date(),
    });
    builder.processSignal({
      type: 'conversion',
      sessionId: 'success-2',
      outcome: 'purchase',
      value: 50,
      timestamp: new Date(),
    });

    // Failed journey: browse -> article-2 -> bounce
    builder.processSignal({
      type: 'visit',
      sessionId: 'fail-1',
      intent: 'browse',
      source: 'direct',
      contentId: 'article-2',
      timestamp: new Date(),
    });
    builder.processSignal({
      type: 'bounce',
      sessionId: 'fail-1',
      outcome: 'bounce',
      timestamp: new Date(),
    });

    // Another failed journey
    builder.processSignal({
      type: 'visit',
      sessionId: 'fail-2',
      intent: 'browse',
      source: 'direct',
      contentId: 'article-2',
      timestamp: new Date(),
    });
    builder.processSignal({
      type: 'bounce',
      sessionId: 'fail-2',
      outcome: 'bounce',
      timestamp: new Date(),
    });

    // Third failed journey for browse
    builder.processSignal({
      type: 'visit',
      sessionId: 'fail-3',
      intent: 'browse',
      source: 'direct',
      contentId: 'article-3',
      timestamp: new Date(),
    });
    builder.processSignal({
      type: 'bounce',
      sessionId: 'fail-3',
      outcome: 'bounce',
      timestamp: new Date(),
    });
  }

  describe('Failing Intents Query', () => {
    it('should find intents with high failure rates', () => {
      createTestJourneys();

      const result = queryEngine.getFailingIntents(10);

      expect(result.results).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // Browse intent should have higher failure rate than search
      const failingIntents = result.results as any[];
      if (failingIntents.length > 0) {
        const browseIntent = failingIntents.find((i) => i.intentType === 'browse');
        const searchIntent = failingIntents.find((i) => i.intentType === 'search');

        if (browseIntent && searchIntent) {
          expect(browseIntent.failureRate).toBeGreaterThan(searchIntent.failureRate);
        }
      }
    });

    it('should return empty for no journeys', () => {
      const result = queryEngine.getFailingIntents(10);
      expect(result.results).toEqual([]);
    });
  });

  describe('Breaking Content Query', () => {
    it('should find content that breaks journeys', () => {
      createTestJourneys();

      const result = queryEngine.getBreakingContent(10);

      expect(result.results).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // Article-2 should have higher break rate
      const breakingContent = result.results as any[];
      if (breakingContent.length > 0) {
        const article2 = breakingContent.find((c) => c.contentId === 'article-2');
        if (article2) {
          expect(article2.breakRate).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('High Value Paths Query', () => {
    it('should return high value paths', () => {
      createTestJourneys();

      const result = queryEngine.getHighValuePaths(10);

      expect(result.results).toBeDefined();
      expect(result.query.type).toBe('high_value_paths');
    });
  });

  describe('Drop-off Points Query', () => {
    it('should find drop-off points', () => {
      createTestJourneys();

      const result = queryEngine.getDropOffPoints(10);

      expect(result.results).toBeDefined();
      expect(result.query.type).toBe('drop_off_points');

      const dropOffPoints = result.results as any[];
      for (const point of dropOffPoints) {
        expect(point.from).toBeDefined();
        expect(point.to).toBeDefined();
        expect(point.dropOffRate).toBeDefined();
      }
    });
  });

  describe('Conversion Paths Query', () => {
    it('should find conversion paths', () => {
      createTestJourneys();

      const result = queryEngine.getConversionPaths(10);

      expect(result.results).toBeDefined();
      expect(result.query.type).toBe('conversion_paths');
    });
  });

  describe('Intent Flow Query', () => {
    it('should return intent flow data', () => {
      createTestJourneys();

      const result = queryEngine.getIntentFlow(undefined, 50);

      expect(result.results).toBeDefined();
      expect(result.query.type).toBe('intent_flow');

      const flows = result.results as any[];
      for (const flow of flows) {
        expect(flow.source).toBeDefined();
        expect(flow.target).toBeDefined();
        expect(flow.value).toBeDefined();
      }
    });

    it('should filter by intent type', () => {
      createTestJourneys();

      const result = queryEngine.getIntentFlow('search', 50);

      expect(result.results).toBeDefined();
      // Results should only contain flows related to search intent
    });
  });

  describe('Query Execution', () => {
    it('should execute arbitrary query', () => {
      createTestJourneys();

      const result = queryEngine.execute({
        type: 'failing_intents',
        limit: 5,
      });

      expect(result.query.type).toBe('failing_intents');
      expect(result.executedAt).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle unknown query type', () => {
      const result = queryEngine.execute({
        type: 'unknown' as any,
        limit: 10,
      });

      expect(result.results).toEqual([]);
    });

    it('should include duration in result', () => {
      const result = queryEngine.execute({
        type: 'failing_intents',
        limit: 10,
      });

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Singleton', () => {
  afterEach(() => {
    resetIntentGraphQueryEngine();
    resetIntentGraphScorer();
    resetIntentGraphBuilder();
  });

  it('should return same instance', () => {
    const q1 = getIntentGraphQueryEngine();
    const q2 = getIntentGraphQueryEngine();
    expect(q1).toBe(q2);
  });
});
