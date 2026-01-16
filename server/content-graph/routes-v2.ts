/**
 * Content Dependency Graph v2 - Admin Routes
 *
 * Mount at: /api/admin/graph
 */

import { Router, Request, Response } from 'express';
import { isContentGraphEnabled, ContentWithDependencies } from './types-v2';
import {
  upsertNode,
  getNode,
  removeNode,
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
  batchBuild,
  getGraphStats,
  getGraphCacheStats,
  clearGraph,
} from './graph-engine';

const router = Router();

// Middleware to check if feature is enabled
function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isContentGraphEnabled()) {
    res.status(503).json({
      error: 'Content Graph is disabled',
      hint: 'Set ENABLE_CONTENT_GRAPH=true to enable',
    });
    return;
  }
  next();
}

router.use(requireEnabled);

/**
 * GET /stats
 * Get graph statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = getGraphStats();
    const cache = getGraphCacheStats();
    res.json({ stats, cache });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /rebuild
 * Batch rebuild graph
 */
router.post('/rebuild', (req: Request, res: Response) => {
  try {
    const contents: ContentWithDependencies[] = req.body.contents || [];

    if (!Array.isArray(contents)) {
      res.status(400).json({ error: 'contents array is required' });
      return;
    }

    const result = batchBuild(contents);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /content/:id/rebuild
 * Rebuild graph for single content
 */
router.post('/content/:id/rebuild', (req: Request, res: Response) => {
  try {
    const content: ContentWithDependencies = {
      contentId: req.params.id,
      title: req.body.title || 'Unknown',
      status: req.body.status || 'draft',
      locale: req.body.locale || 'en',
      url: req.body.url,
      internalLinks: req.body.internalLinks || [],
      entityMentions: req.body.entityMentions || [],
      mediaReferences: req.body.mediaReferences || [],
      relatedContent: req.body.relatedContent || [],
      parentId: req.body.parentId,
      translationGroupId: req.body.translationGroupId,
    };

    const result = buildFromContent(content);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /content/:id/deps
 * Get dependencies for content
 */
router.get('/content/:id/deps', (req: Request, res: Response) => {
  try {
    const node = getNode(req.params.id);
    if (!node) {
      res.status(404).json({ error: 'Content not found in graph' });
      return;
    }

    const outgoing = getOutgoingEdges(req.params.id);
    const incoming = getIncomingEdges(req.params.id);
    const dependencies = getDirectDependencies(req.params.id);
    const dependents = getDirectDependents(req.params.id);

    res.json({
      node,
      outgoing: { edges: outgoing, count: outgoing.length },
      incoming: { edges: incoming, count: incoming.length },
      dependencies: { nodes: dependencies, count: dependencies.length },
      dependents: { nodes: dependents, count: dependents.length },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /content/:id/impacted
 * Get impacted content (what breaks if this changes)
 */
router.get('/content/:id/impacted', (req: Request, res: Response) => {
  try {
    const depth = parseInt(req.query.depth as string) || 3;
    const analysis = analyzeImpact(req.params.id, depth);
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /orphans
 * Get orphaned content
 */
router.get('/orphans', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const orphans = findOrphans(limit);
    res.json({ orphans, count: orphans.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /hubs
 * Get hub nodes (high centrality)
 */
router.get('/hubs', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const hubs = findHubs(limit);
    res.json({ hubs, count: hubs.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /path
 * Find path between two nodes
 */
router.get('/path', (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      res.status(400).json({ error: 'from and to query parameters are required' });
      return;
    }

    const maxDepth = parseInt(req.query.maxDepth as string) || 10;
    const path = findPath(from as string, to as string, maxDepth);

    if (!path) {
      res.status(404).json({ error: 'No path found between nodes' });
      return;
    }

    res.json({ path });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /circular
 * Detect circular dependencies
 */
router.get('/circular', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const circles = detectCircularDependencies(limit);
    res.json({ circles, count: circles.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /nodes
 * Add or update a node directly
 */
router.post('/nodes', (req: Request, res: Response) => {
  try {
    const { id, type, title, status, locale, metadata, url } = req.body;

    if (!id || !type || !title) {
      res.status(400).json({ error: 'id, type, and title are required' });
      return;
    }

    const node = upsertNode(id, type, title, status || 'draft', locale || 'en', metadata || {}, url);
    res.json({ node });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * GET /nodes/:id
 * Get node by ID
 */
router.get('/nodes/:id', (req: Request, res: Response) => {
  try {
    const node = getNode(req.params.id);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    res.json({ node });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * DELETE /nodes/:id
 * Remove a node
 */
router.delete('/nodes/:id', (req: Request, res: Response) => {
  try {
    const removed = removeNode(req.params.id);
    res.json({ removed });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /clear
 * Clear entire graph (dangerous!)
 */
router.post('/clear', (req: Request, res: Response) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'CLEAR_ALL_GRAPH_DATA') {
      res.status(400).json({
        error: 'Confirmation required',
        hint: 'Send { "confirm": "CLEAR_ALL_GRAPH_DATA" } to proceed',
      });
      return;
    }

    clearGraph();
    res.json({ cleared: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export { router as contentGraphRoutesV2 };
