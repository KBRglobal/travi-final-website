/**
 * Intent Graph Routes
 *
 * Admin analytics endpoints for the Intent Graph.
 */

import { Router, Request, Response } from 'express';
import { getIntentGraphBuilder } from './graph-builder';
import { getIntentGraphScorer } from './scorer';
import { getIntentGraphQueryEngine } from './query-engine';
import type { IntentType, TrafficSignal } from './types';

const ENABLE_INTENT_GRAPH = process.env.ENABLE_INTENT_GRAPH === 'true';

export function createIntentGraphRouter(): Router {
  const router = Router();

  // Feature flag middleware
  router.use((req: Request, res: Response, next) => {
    if (!ENABLE_INTENT_GRAPH) {
      return res.status(404).json({ error: 'Intent Graph is disabled' });
    }
    next();
  });

  /**
   * GET /stats - Get graph statistics
   */
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const builder = getIntentGraphBuilder();
      const stats = builder.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get graph stats' });
    }
  });

  /**
   * GET /nodes - Get all nodes (paginated)
   */
  router.get('/nodes', (req: Request, res: Response) => {
    try {
      const builder = getIntentGraphBuilder();
      const type = req.query.type as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const { nodes } = builder.exportGraph();
      let filtered = type ? nodes.filter((n) => n.type === type) : nodes;

      // Sort by updated date
      filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      res.json({
        total: filtered.length,
        limit,
        offset,
        nodes: filtered.slice(offset, offset + limit),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get nodes' });
    }
  });

  /**
   * GET /nodes/:id - Get specific node
   */
  router.get('/nodes/:id', (req: Request, res: Response) => {
    try {
      const builder = getIntentGraphBuilder();
      const node = builder.getNode(req.params.id);

      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }

      const incomingEdges = builder.getIncomingEdges(req.params.id);
      const outgoingEdges = builder.getOutgoingEdges(req.params.id);

      res.json({
        node,
        incomingEdges,
        outgoingEdges,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get node' });
    }
  });

  /**
   * GET /edges - Get all edges (paginated)
   */
  router.get('/edges', (req: Request, res: Response) => {
    try {
      const builder = getIntentGraphBuilder();
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const { edges } = builder.exportGraph();

      // Sort by weight
      edges.sort((a, b) => b.weight - a.weight);

      res.json({
        total: edges.length,
        limit,
        offset,
        edges: edges.slice(offset, offset + limit),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get edges' });
    }
  });

  /**
   * GET /scores/nodes - Get node scores
   */
  router.get('/scores/nodes', (req: Request, res: Response) => {
    try {
      const scorer = getIntentGraphScorer();
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const order = req.query.order === 'worst' ? 'worst' : 'best';

      const scores = order === 'worst'
        ? scorer.getWorstNodes(limit)
        : scorer.getTopNodes(limit);

      res.json({ scores });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get node scores' });
    }
  });

  /**
   * GET /scores/edges - Get edge scores
   */
  router.get('/scores/edges', (req: Request, res: Response) => {
    try {
      const scorer = getIntentGraphScorer();
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const type = req.query.type as string;

      let scores;
      switch (type) {
        case 'friction':
          scores = scorer.getHighFrictionEdges(limit);
          break;
        case 'dropoff':
          scores = scorer.getHighDropOffEdges(limit);
          break;
        default:
          scores = scorer.scoreAllEdges().slice(0, limit);
      }

      res.json({ scores });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get edge scores' });
    }
  });

  /**
   * GET /scores/paths - Get path scores
   */
  router.get('/scores/paths', (req: Request, res: Response) => {
    try {
      const scorer = getIntentGraphScorer();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const type = req.query.type as string;

      let paths;
      switch (type) {
        case 'conversion':
          paths = scorer.getHighConversionPaths(limit);
          break;
        case 'value':
        default:
          paths = scorer.getHighValuePaths(limit);
      }

      res.json({ paths });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get path scores' });
    }
  });

  /**
   * GET /query/failing-intents - What intents fail before conversion?
   */
  router.get('/query/failing-intents', (req: Request, res: Response) => {
    try {
      const queryEngine = getIntentGraphQueryEngine();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = queryEngine.getFailingIntents(limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  /**
   * GET /query/breaking-content - Which content breaks journeys?
   */
  router.get('/query/breaking-content', (req: Request, res: Response) => {
    try {
      const queryEngine = getIntentGraphQueryEngine();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = queryEngine.getBreakingContent(limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  /**
   * GET /query/high-value-paths - What are the high value paths?
   */
  router.get('/query/high-value-paths', (req: Request, res: Response) => {
    try {
      const queryEngine = getIntentGraphQueryEngine();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = queryEngine.getHighValuePaths(limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  /**
   * GET /query/drop-off-points - Where do users drop off?
   */
  router.get('/query/drop-off-points', (req: Request, res: Response) => {
    try {
      const queryEngine = getIntentGraphQueryEngine();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = queryEngine.getDropOffPoints(limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  /**
   * GET /query/conversion-paths - What paths lead to conversion?
   */
  router.get('/query/conversion-paths', (req: Request, res: Response) => {
    try {
      const queryEngine = getIntentGraphQueryEngine();
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = queryEngine.getConversionPaths(limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  /**
   * GET /query/intent-flow - Get intent flow data (Sankey-style)
   */
  router.get('/query/intent-flow', (req: Request, res: Response) => {
    try {
      const queryEngine = getIntentGraphQueryEngine();
      const intentType = req.query.intent as IntentType | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      const result = queryEngine.getIntentFlow(intentType, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  /**
   * POST /signals - Ingest traffic signals
   */
  router.post('/signals', (req: Request, res: Response) => {
    try {
      const builder = getIntentGraphBuilder();
      const signals = req.body.signals as TrafficSignal[];

      if (!Array.isArray(signals)) {
        return res.status(400).json({ error: 'signals must be an array' });
      }

      // Parse dates
      const parsedSignals = signals.map((s) => ({
        ...s,
        timestamp: new Date(s.timestamp),
      }));

      const processed = builder.processSignals(parsedSignals);

      res.json({
        received: signals.length,
        processed,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process signals' });
    }
  });

  /**
   * GET /journeys - Get journeys (paginated)
   */
  router.get('/journeys', (req: Request, res: Response) => {
    try {
      const builder = getIntentGraphBuilder();
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const { journeys } = builder.exportGraph();

      // Sort by end date
      journeys.sort((a, b) => (b.endedAt?.getTime() || 0) - (a.endedAt?.getTime() || 0));

      res.json({
        total: journeys.length,
        limit,
        offset,
        journeys: journeys.slice(offset, offset + limit),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get journeys' });
    }
  });

  /**
   * GET /export - Export full graph
   */
  router.get('/export', (req: Request, res: Response) => {
    try {
      const builder = getIntentGraphBuilder();
      const data = builder.exportGraph();

      res.json({
        exportedAt: new Date(),
        ...data,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to export graph' });
    }
  });

  return router;
}
