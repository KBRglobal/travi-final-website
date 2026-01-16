/**
 * Funnel Designer Routes
 *
 * Admin API endpoints for the Autonomous Funnel Designer.
 */

import { Router, Request, Response } from 'express';
import { getFunnelDetector } from './detector';
import { getFunnelSimulator } from './simulator';
import { getFunnelProposalEngine } from './proposal-engine';
import type { DetectedPath, FunnelChange } from './types';

const ENABLE_FUNNEL_DESIGNER = process.env.ENABLE_FUNNEL_DESIGNER === 'true';
const ENABLE_FUNNEL_SIMULATION = process.env.ENABLE_FUNNEL_SIMULATION === 'true';

export function createFunnelDesignerRouter(): Router {
  const router = Router();

  // Feature flag middleware
  router.use((req: Request, res: Response, next) => {
    if (!ENABLE_FUNNEL_DESIGNER) {
      return res.status(404).json({ error: 'Funnel Designer is disabled' });
    }
    next();
  });

  // ==========================================================================
  // FUNNEL DETECTION
  // ==========================================================================

  /**
   * POST /detect - Detect funnels from path data
   */
  router.post('/detect', (req: Request, res: Response) => {
    try {
      const detector = getFunnelDetector();
      const paths = req.body.paths as DetectedPath[];

      if (!Array.isArray(paths)) {
        return res.status(400).json({ error: 'paths must be an array' });
      }

      const funnels = detector.detectFromPaths(paths);

      res.json({
        detected: funnels.length,
        funnels,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to detect funnels' });
    }
  });

  /**
   * GET /funnels - Get all detected funnels
   */
  router.get('/funnels', (req: Request, res: Response) => {
    try {
      const detector = getFunnelDetector();
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const order = req.query.order === 'worst' ? 'worst' : 'best';

      const funnels = order === 'worst'
        ? detector.getUnderperformingFunnels(limit)
        : detector.getTopFunnels(limit);

      res.json({
        total: detector.getAllFunnels().length,
        funnels,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get funnels' });
    }
  });

  /**
   * GET /funnels/:id - Get funnel by ID
   */
  router.get('/funnels/:id', (req: Request, res: Response) => {
    try {
      const detector = getFunnelDetector();
      const funnel = detector.getFunnel(req.params.id);

      if (!funnel) {
        return res.status(404).json({ error: 'Funnel not found' });
      }

      res.json(funnel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get funnel' });
    }
  });

  /**
   * GET /candidates - Get funnel candidates
   */
  router.get('/candidates', (req: Request, res: Response) => {
    try {
      const detector = getFunnelDetector();
      const candidates = detector.getCandidates();

      res.json({
        total: candidates.length,
        candidates,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get candidates' });
    }
  });

  // ==========================================================================
  // FUNNEL ANALYSIS
  // ==========================================================================

  /**
   * GET /funnels/:id/analysis - Analyze a funnel
   */
  router.get('/funnels/:id/analysis', (req: Request, res: Response) => {
    try {
      const detector = getFunnelDetector();
      const proposalEngine = getFunnelProposalEngine();

      const funnel = detector.getFunnel(req.params.id);
      if (!funnel) {
        return res.status(404).json({ error: 'Funnel not found' });
      }

      const analysis = proposalEngine.analyzeFunnel(funnel);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze funnel' });
    }
  });

  // ==========================================================================
  // SIMULATION
  // ==========================================================================

  /**
   * POST /simulate - Run a simulation
   */
  router.post('/simulate', (req: Request, res: Response) => {
    if (!ENABLE_FUNNEL_SIMULATION) {
      return res.status(404).json({ error: 'Funnel simulation is disabled' });
    }

    try {
      const detector = getFunnelDetector();
      const simulator = getFunnelSimulator();

      const { funnelId, changes, name } = req.body;

      const funnel = detector.getFunnel(funnelId);
      if (!funnel) {
        return res.status(404).json({ error: 'Funnel not found' });
      }

      if (!Array.isArray(changes)) {
        return res.status(400).json({ error: 'changes must be an array' });
      }

      const scenario = simulator.createScenario(
        name || 'Unnamed Simulation',
        funnel,
        changes as FunnelChange[]
      );

      const result = simulator.simulate(scenario.id);

      res.json({
        scenario,
        result,
      });
    } catch (error) {
      res.status(500).json({ error: 'Simulation failed' });
    }
  });

  /**
   * GET /simulations - Get all simulations
   */
  router.get('/simulations', (req: Request, res: Response) => {
    if (!ENABLE_FUNNEL_SIMULATION) {
      return res.status(404).json({ error: 'Funnel simulation is disabled' });
    }

    try {
      const simulator = getFunnelSimulator();
      const scenarios = simulator.getAllScenarios();
      const results = simulator.getAllResults();

      res.json({
        scenarios,
        results,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get simulations' });
    }
  });

  /**
   * POST /simulations/compare - Compare multiple scenarios
   */
  router.post('/simulations/compare', (req: Request, res: Response) => {
    if (!ENABLE_FUNNEL_SIMULATION) {
      return res.status(404).json({ error: 'Funnel simulation is disabled' });
    }

    try {
      const simulator = getFunnelSimulator();
      const { scenarioIds } = req.body;

      if (!Array.isArray(scenarioIds)) {
        return res.status(400).json({ error: 'scenarioIds must be an array' });
      }

      const comparison = simulator.compareScenarios(scenarioIds);
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: 'Comparison failed' });
    }
  });

  // ==========================================================================
  // PROPOSALS
  // ==========================================================================

  /**
   * POST /funnels/:id/proposals - Generate proposals for funnel
   */
  router.post('/funnels/:id/proposals', (req: Request, res: Response) => {
    try {
      const detector = getFunnelDetector();
      const proposalEngine = getFunnelProposalEngine();

      const funnel = detector.getFunnel(req.params.id);
      if (!funnel) {
        return res.status(404).json({ error: 'Funnel not found' });
      }

      const proposals = proposalEngine.generateProposals(funnel);

      res.json({
        generated: proposals.length,
        proposals,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate proposals' });
    }
  });

  /**
   * GET /proposals - Get all proposals
   */
  router.get('/proposals', (req: Request, res: Response) => {
    try {
      const proposalEngine = getFunnelProposalEngine();
      const status = req.query.status as string | undefined;

      let proposals;
      if (status) {
        proposals = proposalEngine.getProposalsByStatus(status as any);
      } else {
        proposals = proposalEngine.getAllProposals();
      }

      res.json({
        total: proposals.length,
        proposals,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get proposals' });
    }
  });

  /**
   * GET /proposals/:id - Get proposal by ID
   */
  router.get('/proposals/:id', (req: Request, res: Response) => {
    try {
      const proposalEngine = getFunnelProposalEngine();
      const proposal = proposalEngine.getProposal(req.params.id);

      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      res.json(proposal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get proposal' });
    }
  });

  /**
   * POST /proposals/:id/approve - Approve proposal
   */
  router.post('/proposals/:id/approve', (req: Request, res: Response) => {
    try {
      const proposalEngine = getFunnelProposalEngine();
      const { approvedBy } = req.body;

      const proposal = proposalEngine.approveProposal(req.params.id, approvedBy || 'admin');

      if (!proposal) {
        return res.status(400).json({ error: 'Cannot approve proposal' });
      }

      res.json(proposal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve proposal' });
    }
  });

  /**
   * POST /proposals/:id/reject - Reject proposal
   */
  router.post('/proposals/:id/reject', (req: Request, res: Response) => {
    try {
      const proposalEngine = getFunnelProposalEngine();
      const { rejectedBy, reason } = req.body;

      const proposal = proposalEngine.rejectProposal(
        req.params.id,
        rejectedBy || 'admin',
        reason || 'No reason provided'
      );

      if (!proposal) {
        return res.status(400).json({ error: 'Cannot reject proposal' });
      }

      res.json(proposal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to reject proposal' });
    }
  });

  /**
   * GET /summary - Get proposal summary
   */
  router.get('/summary', (req: Request, res: Response) => {
    try {
      const detector = getFunnelDetector();
      const proposalEngine = getFunnelProposalEngine();

      const funnels = detector.getAllFunnels();
      const proposalSummary = proposalEngine.getSummary();

      res.json({
        funnels: {
          total: funnels.length,
          healthy: funnels.filter((f) => f.healthScore >= 70).length,
          needsAttention: funnels.filter((f) => f.healthScore < 70 && f.healthScore >= 40).length,
          critical: funnels.filter((f) => f.healthScore < 40).length,
        },
        proposals: proposalSummary,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get summary' });
    }
  });

  return router;
}
