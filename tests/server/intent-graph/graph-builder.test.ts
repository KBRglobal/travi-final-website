/**
 * Intent Graph Builder - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  IntentGraphBuilder,
  getIntentGraphBuilder,
  resetIntentGraphBuilder,
} from '../../../server/intent-graph';

describe('IntentGraphBuilder', () => {
  let builder: IntentGraphBuilder;

  beforeEach(() => {
    builder = new IntentGraphBuilder();
  });

  afterEach(() => {
    builder.clear();
  });

  describe('Node Management', () => {
    it('should create intent nodes', () => {
      const node = builder.getOrCreateIntentNode('search', 'google');

      expect(node.type).toBe('intent');
      expect(node.intentType).toBe('search');
      expect(node.source).toBe('google');
      expect(node.id).toBe('intent:search:google');
    });

    it('should return existing intent node', () => {
      const node1 = builder.getOrCreateIntentNode('browse', 'direct');
      const node2 = builder.getOrCreateIntentNode('browse', 'direct');

      expect(node1.id).toBe(node2.id);
    });

    it('should create content nodes', () => {
      const node = builder.getOrCreateContentNode('article-123', 'blog', 'test-slug', 'Test Title');

      expect(node.type).toBe('content');
      expect(node.contentId).toBe('article-123');
      expect(node.slug).toBe('test-slug');
      expect(node.title).toBe('Test Title');
    });

    it('should create action nodes', () => {
      const node = builder.getOrCreateActionNode('click', 5);

      expect(node.type).toBe('action');
      expect(node.actionType).toBe('click');
      expect(node.value).toBe(5);
    });

    it('should create outcome nodes', () => {
      const node = builder.getOrCreateOutcomeNode('signup', true, 100);

      expect(node.type).toBe('outcome');
      expect(node.outcomeType).toBe('signup');
      expect(node.isPositive).toBe(true);
      expect(node.value).toBe(100);
    });

    it('should get node by ID', () => {
      builder.getOrCreateIntentNode('compare', 'referral');
      const retrieved = builder.getNode('intent:compare:referral');

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('intent');
    });

    it('should get nodes by type', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateIntentNode('browse', 'direct');
      builder.getOrCreateContentNode('c1', 'blog');

      const intentNodes = builder.getNodesByType('intent');
      expect(intentNodes.length).toBe(2);

      const contentNodes = builder.getNodesByType('content');
      expect(contentNodes.length).toBe(1);
    });
  });

  describe('Edge Management', () => {
    it('should create edges between nodes', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');

      const edge = builder.addOrUpdateEdge(
        'intent:search:google',
        'content:article-1',
        1,
        true
      );

      expect(edge.sourceId).toBe('intent:search:google');
      expect(edge.targetId).toBe('content:article-1');
      expect(edge.weight).toBe(1);
      expect(edge.count).toBe(1);
    });

    it('should update existing edges', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');

      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 1, true);
      const edge = builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 2, true);

      expect(edge.count).toBe(2);
      expect(edge.weight).toBeGreaterThan(1);
    });

    it('should get outgoing edges', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.getOrCreateContentNode('article-2', 'blog');

      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 1, true);
      builder.addOrUpdateEdge('intent:search:google', 'content:article-2', 1, true);

      const outgoing = builder.getOutgoingEdges('intent:search:google');
      expect(outgoing.length).toBe(2);
    });

    it('should get incoming edges', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateIntentNode('browse', 'direct');
      builder.getOrCreateContentNode('article-1', 'blog');

      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 1, true);
      builder.addOrUpdateEdge('intent:browse:direct', 'content:article-1', 1, true);

      const incoming = builder.getIncomingEdges('content:article-1');
      expect(incoming.length).toBe(2);
    });
  });

  describe('Journey Management', () => {
    it('should record journey steps', () => {
      const intentNode = builder.getOrCreateIntentNode('search', 'google');
      const contentNode = builder.getOrCreateContentNode('article-1', 'blog');

      builder.recordJourneyStep('session-1', intentNode.id);
      const journey = builder.recordJourneyStep('session-1', contentNode.id, intentNode.id);

      expect(journey.nodes.length).toBe(2);
      expect(journey.nodes[0]).toBe(intentNode.id);
      expect(journey.nodes[1]).toBe(contentNode.id);
    });

    it('should complete journey with outcome', () => {
      const intentNode = builder.getOrCreateIntentNode('search', 'google');
      builder.recordJourneyStep('session-1', intentNode.id);

      const journey = builder.completeJourney('session-1', 'signup', 50);

      expect(journey).toBeDefined();
      expect(journey?.isComplete).toBe(true);
      expect(journey?.outcome).toBe('signup');
      expect(journey?.value).toBe(50);
    });

    it('should get active journey', () => {
      const intentNode = builder.getOrCreateIntentNode('search', 'google');
      builder.recordJourneyStep('session-1', intentNode.id);

      const journey = builder.getActiveJourney('session-1');
      expect(journey).toBeDefined();
      expect(journey?.isComplete).toBe(false);
    });
  });

  describe('Signal Processing', () => {
    it('should process traffic signal', () => {
      builder.processSignal({
        type: 'visit',
        sessionId: 'session-1',
        intent: 'search',
        source: 'google',
        contentId: 'article-1',
        action: 'read',
        timestamp: new Date(),
      });

      const stats = builder.getStats();
      expect(stats.nodeCount).toBeGreaterThan(0);
    });

    it('should process signal with outcome', () => {
      builder.processSignal({
        type: 'conversion',
        sessionId: 'session-1',
        contentId: 'article-1',
        outcome: 'signup',
        value: 100,
        timestamp: new Date(),
      });

      const stats = builder.getStats();
      expect(stats.nodeCount).toBeGreaterThan(0);
      expect(stats.journeyCount).toBe(1);
    });

    it('should process batch signals', () => {
      const signals = [
        { type: 'visit' as const, sessionId: 's1', intent: 'search' as const, source: 'google', timestamp: new Date() },
        { type: 'visit' as const, sessionId: 's2', intent: 'browse' as const, source: 'direct', timestamp: new Date() },
        { type: 'visit' as const, sessionId: 's3', intent: 'compare' as const, source: 'referral', timestamp: new Date() },
      ];

      const processed = builder.processSignals(signals);
      expect(processed).toBe(3);
    });
  });

  describe('Statistics', () => {
    it('should generate graph statistics', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 1, true);

      const stats = builder.getStats();

      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
      expect(stats.generatedAt).toBeDefined();
    });

    it('should export graph data', () => {
      builder.getOrCreateIntentNode('search', 'google');
      builder.getOrCreateContentNode('article-1', 'blog');
      builder.addOrUpdateEdge('intent:search:google', 'content:article-1', 1, true);

      const exported = builder.exportGraph();

      expect(exported.nodes.length).toBe(2);
      expect(exported.edges.length).toBe(1);
    });
  });
});

describe('Singleton', () => {
  afterEach(() => {
    resetIntentGraphBuilder();
  });

  it('should return same instance', () => {
    const b1 = getIntentGraphBuilder();
    const b2 = getIntentGraphBuilder();
    expect(b1).toBe(b2);
  });

  it('should reset instance', () => {
    const b1 = getIntentGraphBuilder();
    b1.getOrCreateIntentNode('search', 'google');

    resetIntentGraphBuilder();

    const b2 = getIntentGraphBuilder();
    const stats = b2.getStats();
    expect(stats.nodeCount).toBe(0);
  });
});
