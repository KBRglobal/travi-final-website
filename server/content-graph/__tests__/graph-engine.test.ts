/**
 * Content Dependency Graph v2 - Graph Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  upsertNode,
  getNode,
  removeNode,
  upsertEdge,
  removeEdge,
  getOutgoingEdges,
  getIncomingEdges,
  getDirectDependents,
  getDirectDependencies,
  analyzeImpact,
  findOrphans,
  findHubs,
  findPath,
  detectCircularDependencies,
  buildFromContent,
  getGraphStats,
  clearGraph,
} from '../graph-engine';
import { ContentWithDependencies } from '../types-v2';

describe('Graph Engine', () => {
  beforeEach(() => {
    clearGraph();
  });

  describe('upsertNode', () => {
    it('should create a new node', () => {
      const node = upsertNode('content-1', 'content', 'Test Article', 'published', 'en');

      expect(node.id).toBe('content-1');
      expect(node.type).toBe('content');
      expect(node.title).toBe('Test Article');
      expect(node.status).toBe('published');
    });

    it('should update existing node', () => {
      upsertNode('content-1', 'content', 'Original Title', 'draft', 'en');
      const updated = upsertNode('content-1', 'content', 'Updated Title', 'published', 'en');

      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('published');
    });

    it('should initialize degree counts', () => {
      const node = upsertNode('content-1', 'content', 'Test', 'published', 'en');

      expect(node.inDegree).toBe(0);
      expect(node.outDegree).toBe(0);
    });
  });

  describe('getNode', () => {
    it('should retrieve existing node', () => {
      upsertNode('content-1', 'content', 'Test', 'published', 'en');
      const node = getNode('content-1');

      expect(node).toBeDefined();
      expect(node!.id).toBe('content-1');
    });

    it('should return undefined for non-existent node', () => {
      const node = getNode('non-existent');
      expect(node).toBeUndefined();
    });
  });

  describe('upsertEdge', () => {
    it('should create an edge between nodes', () => {
      upsertNode('content-1', 'content', 'Source', 'published', 'en');
      upsertNode('content-2', 'content', 'Target', 'published', 'en');

      const edge = upsertEdge('content-1', 'content-2', 'internal_link');

      expect(edge.sourceContentId).toBe('content-1');
      expect(edge.targetId).toBe('content-2');
      expect(edge.dependencyType).toBe('internal_link');
    });

    it('should update degree counts', () => {
      upsertNode('content-1', 'content', 'Source', 'published', 'en');
      upsertNode('content-2', 'content', 'Target', 'published', 'en');

      upsertEdge('content-1', 'content-2', 'internal_link');

      const source = getNode('content-1');
      const target = getNode('content-2');

      expect(source!.outDegree).toBe(1);
      expect(target!.inDegree).toBe(1);
    });

    it('should be idempotent (same edge twice)', () => {
      upsertNode('content-1', 'content', 'Source', 'published', 'en');
      upsertNode('content-2', 'content', 'Target', 'published', 'en');

      upsertEdge('content-1', 'content-2', 'internal_link');
      upsertEdge('content-1', 'content-2', 'internal_link');

      const outgoing = getOutgoingEdges('content-1');
      expect(outgoing.length).toBe(1);
    });
  });

  describe('getDirectDependents', () => {
    it('should find nodes that depend on target', () => {
      upsertNode('content-1', 'content', 'Page 1', 'published', 'en');
      upsertNode('content-2', 'content', 'Page 2', 'published', 'en');
      upsertNode('content-3', 'content', 'Page 3', 'published', 'en');

      // 2 and 3 link to 1
      upsertEdge('content-2', 'content-1', 'internal_link');
      upsertEdge('content-3', 'content-1', 'internal_link');

      const dependents = getDirectDependents('content-1');

      expect(dependents.length).toBe(2);
      expect(dependents.map(d => d.id)).toContain('content-2');
      expect(dependents.map(d => d.id)).toContain('content-3');
    });
  });

  describe('getDirectDependencies', () => {
    it('should find nodes that source depends on', () => {
      upsertNode('content-1', 'content', 'Page 1', 'published', 'en');
      upsertNode('content-2', 'content', 'Page 2', 'published', 'en');
      upsertNode('entity-1', 'entity', 'Entity', 'published', 'en');

      upsertEdge('content-1', 'content-2', 'internal_link');
      upsertEdge('content-1', 'entity-1', 'entity_reference');

      const dependencies = getDirectDependencies('content-1');

      expect(dependencies.length).toBe(2);
      expect(dependencies.map(d => d.id)).toContain('content-2');
      expect(dependencies.map(d => d.id)).toContain('entity-1');
    });
  });

  describe('analyzeImpact', () => {
    it('should analyze impact of changes', () => {
      // Build a small graph: 1 <- 2, 1 <- 3, 2 <- 4
      upsertNode('content-1', 'content', 'Core Page', 'published', 'en');
      upsertNode('content-2', 'content', 'Dependent 1', 'published', 'en');
      upsertNode('content-3', 'content', 'Dependent 2', 'published', 'en');
      upsertNode('content-4', 'content', 'Transitive', 'published', 'en');

      upsertEdge('content-2', 'content-1', 'internal_link');
      upsertEdge('content-3', 'content-1', 'internal_link');
      upsertEdge('content-4', 'content-2', 'internal_link');

      const impact = analyzeImpact('content-1');

      expect(impact.directDependents.length).toBe(2);
      expect(impact.totalImpact).toBeGreaterThanOrEqual(2);
      expect(['low', 'medium', 'high', 'critical']).toContain(impact.cascadeRisk);
    });

    it('should generate recommended actions for high impact', () => {
      // Create many dependents
      upsertNode('hub', 'content', 'Hub Page', 'published', 'en');
      for (let i = 0; i < 25; i++) {
        upsertNode(`dep-${i}`, 'content', `Dependent ${i}`, 'published', 'en');
        upsertEdge(`dep-${i}`, 'hub', 'internal_link');
      }

      const impact = analyzeImpact('hub');

      expect(impact.cascadeRisk).toMatch(/high|critical/);
      expect(impact.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe('findOrphans', () => {
    it('should find isolated nodes', () => {
      upsertNode('orphan-1', 'content', 'Isolated', 'published', 'en');
      upsertNode('connected-1', 'content', 'Connected', 'published', 'en');
      upsertNode('connected-2', 'content', 'Connected 2', 'published', 'en');

      upsertEdge('connected-1', 'connected-2', 'internal_link');

      const orphans = findOrphans();

      expect(orphans.some(o => o.nodeId === 'orphan-1')).toBe(true);
      expect(orphans.some(o => o.nodeId === 'connected-1')).toBe(false);
    });

    it('should identify orphan reason', () => {
      upsertNode('no-incoming', 'content', 'No Incoming', 'published', 'en');
      upsertNode('target', 'content', 'Target', 'published', 'en');
      upsertEdge('no-incoming', 'target', 'internal_link');

      const orphans = findOrphans();
      const noIncoming = orphans.find(o => o.nodeId === 'no-incoming');

      expect(noIncoming).toBeDefined();
      expect(noIncoming!.reason).toBe('no_incoming');
    });
  });

  describe('findHubs', () => {
    it('should find highly connected nodes', () => {
      upsertNode('hub', 'content', 'Hub Page', 'published', 'en');
      for (let i = 0; i < 10; i++) {
        upsertNode(`page-${i}`, 'content', `Page ${i}`, 'published', 'en');
        upsertEdge(`page-${i}`, 'hub', 'internal_link');
      }

      const hubs = findHubs(5);

      expect(hubs.length).toBeGreaterThan(0);
      expect(hubs[0].node.id).toBe('hub');
      expect(hubs[0].inDegree).toBe(10);
    });
  });

  describe('findPath', () => {
    it('should find path between nodes', () => {
      upsertNode('start', 'content', 'Start', 'published', 'en');
      upsertNode('middle', 'content', 'Middle', 'published', 'en');
      upsertNode('end', 'content', 'End', 'published', 'en');

      upsertEdge('start', 'middle', 'internal_link');
      upsertEdge('middle', 'end', 'internal_link');

      const path = findPath('start', 'end');

      expect(path).not.toBeNull();
      expect(path!.path).toEqual(['start', 'middle', 'end']);
      expect(path!.length).toBe(2);
    });

    it('should return null for no path', () => {
      upsertNode('isolated-1', 'content', 'Isolated 1', 'published', 'en');
      upsertNode('isolated-2', 'content', 'Isolated 2', 'published', 'en');

      const path = findPath('isolated-1', 'isolated-2');
      expect(path).toBeNull();
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect cycles', () => {
      upsertNode('a', 'content', 'A', 'published', 'en');
      upsertNode('b', 'content', 'B', 'published', 'en');
      upsertNode('c', 'content', 'C', 'published', 'en');

      upsertEdge('a', 'b', 'internal_link');
      upsertEdge('b', 'c', 'internal_link');
      upsertEdge('c', 'a', 'internal_link'); // Creates cycle

      const circles = detectCircularDependencies();
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should return empty for acyclic graph', () => {
      upsertNode('a', 'content', 'A', 'published', 'en');
      upsertNode('b', 'content', 'B', 'published', 'en');
      upsertNode('c', 'content', 'C', 'published', 'en');

      upsertEdge('a', 'b', 'internal_link');
      upsertEdge('b', 'c', 'internal_link');

      const circles = detectCircularDependencies();
      expect(circles.length).toBe(0);
    });
  });

  describe('buildFromContent', () => {
    it('should build graph from content object', () => {
      const content: ContentWithDependencies = {
        contentId: 'article-1',
        title: 'Test Article',
        status: 'published',
        locale: 'en',
        url: '/test-article',
        internalLinks: [
          { targetId: 'article-2', anchor: 'Related Article' },
        ],
        entityMentions: [
          { entityId: 'entity-1', entityType: 'hotel' },
        ],
        mediaReferences: ['media-1'],
        relatedContent: [],
      };

      const result = buildFromContent(content);

      expect(result.nodesCreated).toBe(1);
      expect(result.edgesCreated).toBe(3);
      expect(result.errors.length).toBe(0);

      const node = getNode('article-1');
      expect(node).toBeDefined();
      expect(node!.title).toBe('Test Article');

      const outgoing = getOutgoingEdges('article-1');
      expect(outgoing.length).toBe(3);
    });
  });

  describe('getGraphStats', () => {
    it('should return graph statistics', () => {
      upsertNode('content-1', 'content', 'Page 1', 'published', 'en');
      upsertNode('content-2', 'content', 'Page 2', 'published', 'en');
      upsertEdge('content-1', 'content-2', 'internal_link');

      const stats = getGraphStats();

      expect(stats.totalNodes).toBe(2);
      expect(stats.totalEdges).toBe(1);
      expect(stats.nodesByType.content).toBe(2);
      expect(stats.edgesByType.internal_link).toBe(1);
    });
  });
});
