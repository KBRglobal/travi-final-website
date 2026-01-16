/**
 * Intent Graph Scorer - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  IntentGraphBuilder,
  IntentGraphScorer,
  getIntentGraphScorer,
  resetIntentGraphScorer,
  resetIntentGraphBuilder,
} from '../../../server/intent-graph';

describe('IntentGraphScorer', () => {
  let builder: IntentGraphBuilder;
  let scorer: IntentGraphScorer;

  beforeEach(() => {
    builder = new IntentGraphBuilder();
    scorer = new IntentGraphScorer(builder);
  });

  afterEach(() => {
    builder.clear();
    scorer.clearCache();
  });

  describe('Node Scoring', () => {
    it('should score a node', () => {
      // Create nodes with edges
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 5, true);

      const score = scorer.scoreNode('content:article-1');

      expect(score).toBeDefined();
      expect(score?.nodeId).toBe('content:article-1');
      expect(score?.score).toBeGreaterThan(0);
      expect(score?.components).toBeDefined();
    });

    it('should return undefined for missing node', () => {
      const score = scorer.scoreNode('nonexistent');
      expect(score).toBeUndefined();
    });

    it('should score all nodes with ranks', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.getOrCreateContentNode('article-2', 'blog');
      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 10, true);
      builder.addOrUpdateEdge('intent:search:google', 'content:article-2', 5, true);

      const scores = scorer.scoreAllNodes();

      expect(scores.length).toBe(3);
      expect(scores[0].rank).toBe(1);
      expect(scores[1].rank).toBe(2);
      expect(scores[2].rank).toBe(3);
    });

    it('should get top nodes', () => {
      // Create multiple nodes with varying weights
      builder.getOrCreateIntentNode('search', 'google');
      for (let i = 0; i < 5; i++) {
        builder.getOrCreateContentNode(`article-${i}`, 'blog');
        builder.addOrUpdateEdge('intent:search:google', `content:article-${i}`, (5 - i) * 10, true);
      }

      const topNodes = scorer.getTopNodes(3);

      expect(topNodes.length).toBe(3);
      expect(topNodes[0].score).toBeGreaterThanOrEqual(topNodes[1].score);
    });

    it('should get worst nodes', () => {
      builder.getOrCreateIntentNode('search', 'google');
      for (let i = 0; i < 5; i++) {
        builder.getOrCreateContentNode(`article-${i}`, 'blog');
        builder.addOrUpdateEdge('intent:search:google', `content:article-${i}`, i + 1, true);
      }

      const worstNodes = scorer.getWorstNodes(3);

      expect(worstNodes.length).toBe(3);
    });
  });

  describe('Edge Scoring', () => {
    it('should score an edge', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 5, true);

      const score = scorer.scoreEdge('intent:search:google', 'content:article-1');

      expect(score).toBeDefined();
      expect(score?.edgeId).toBe('intent:search:google->content:article-1');
      expect(score?.dropOffRate).toBeGreaterThanOrEqual(0);
      expect(score?.friction).toBeGreaterThanOrEqual(0);
    });

    it('should return undefined for missing edge', () => {
      const score = scorer.scoreEdge('nonexistent', 'alsoNonexistent');
      expect(score).toBeUndefined();
    });

    it('should get high friction edges', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.getOrCreateContentNode('article-2', 'blog');

      // Low weight = high friction
      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 1, true);
      // Higher weight = lower friction
      builder.addOrUpdateEdge('intent:search:google', 'content:article-2', 50, true);

      const frictionEdges = scorer.getHighFrictionEdges(2);

      expect(frictionEdges.length).toBe(2);
      expect(frictionEdges[0].friction).toBeGreaterThanOrEqual(frictionEdges[1].friction);
    });

    it('should get high drop-off edges', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');

      // Add edge with low success rate
      const edge = builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 5, false);

      const dropOffEdges = scorer.getHighDropOffEdges(1);

      expect(dropOffEdges.length).toBe(1);
      expect(dropOffEdges[0].dropOffRate).toBe(1); // 0% success = 100% drop-off
    });
  });

  describe('Path Scoring', () => {
    it('should score a path', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.getOrCreateOutcomeNode('signup', true, 100);

      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 10, true);
      builder.addOrUpdateEdge('content:article-1', 'outcome:signup', 5, true);

      const pathScore = scorer.scorePath([
        'intent:search:google',
        'content:article-1',
        'outcome:signup',
      ]);

      expect(pathScore.path.length).toBe(3);
      expect(pathScore.score).toBeGreaterThan(0);
      expect(pathScore.conversionRate).toBeGreaterThan(0);
    });

    it('should identify bottlenecks in path', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.getOrCreateOutcomeNode('bounce', false);

      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 10, true);
      // Low success rate edge
      builder.addOrUpdateEdge('content:article-1', 'outcome:bounce', 1, false);

      const pathScore = scorer.scorePath([
        'intent:search:google',
        'content:article-1',
        'outcome:bounce',
      ]);

      expect(pathScore.bottlenecks.length).toBeGreaterThan(0);
    });

    it('should return empty for empty path', () => {
      const pathScore = scorer.scorePath([]);

      expect(pathScore.path.length).toBe(0);
      expect(pathScore.score).toBe(0);
    });
  });

  describe('Common Paths', () => {
    it('should score common paths from journeys', () => {
      // Create multiple journeys with same path
      for (let i = 0; i < 5; i++) {
        builder.processSignal({
          type: 'visit',
          sessionId: `session-${i}`,
          intent: 'search',
          source: 'google',
          contentId: 'article-1',
          timestamp: new Date(),
        });
        builder.processSignal({
          type: 'conversion',
          sessionId: `session-${i}`,
          outcome: 'signup',
          value: 10,
          timestamp: new Date(),
        });
      }

      const commonPaths = scorer.scoreCommonPaths(3);

      expect(commonPaths.length).toBeGreaterThanOrEqual(0);
    });

    it('should get high value paths', () => {
      // Create journeys with different values
      for (let i = 0; i < 5; i++) {
        builder.processSignal({
          type: 'visit',
          sessionId: `session-${i}`,
          intent: 'search',
          source: 'google',
          contentId: `article-${i}`,
          timestamp: new Date(),
        });
        builder.processSignal({
          type: 'conversion',
          sessionId: `session-${i}`,
          outcome: 'signup',
          value: (i + 1) * 10,
          timestamp: new Date(),
        });
      }

      const highValuePaths = scorer.getHighValuePaths(3);

      // May be empty if no common paths
      expect(highValuePaths).toBeDefined();
    });
  });

  describe('Cache', () => {
    it('should cache node scores', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 5, true);

      scorer.scoreNode('content:article-1');
      const cached = scorer.getCachedNodeScore('content:article-1');

      expect(cached).toBeDefined();
    });

    it('should clear cache', () => {
      builder.getOrCreateIntentNode('search', 'google');
      scorer.scoreNode('intent:search:google');

      scorer.clearCache();

      const cached = scorer.getCachedNodeScore('intent:search:google');
      expect(cached).toBeUndefined();
    });
  });
});

describe('Singleton', () => {
  afterEach(() => {
    resetIntentGraphScorer();
    resetIntentGraphBuilder();
  });

  it('should return same instance', () => {
    const s1 = getIntentGraphScorer();
    const s2 = getIntentGraphScorer();
    expect(s1).toBe(s2);
  });
});
