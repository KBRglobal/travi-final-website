/**
 * Simulation Mode - Index & API Routes
 * 
 * TASK 9: "What if" analysis system
 * 
 * Exports all simulators and registers API endpoints:
 * - /api/simulation/run - Unified simulation engine
 * - /api/simulation/scenarios - List available scenarios
 * - /api/simulation/compare - Compare multiple scenarios
 * - /api/simulation/traffic-spike - Traffic spike analysis
 * - /api/simulation/provider-outage - Provider failure analysis
 * - /api/simulation/content-explosion - Content influx analysis
 * 
 * HARD CONSTRAINTS:
 * - Read-only mode only
 * - No production side effects
 * - Admin access only
 * 
 * SAFETY GUARANTEES:
 * - isSimulationMode flag active during simulations
 * - All writes blocked in simulation mode
 * - In-memory calculations only
 */

import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../middleware/idor-protection';
import { log } from '../lib/logger';
import { simulateTrafficSpike, type TrafficSimulationResult } from './traffic-simulator';
import { simulateProviderOutage, type ProviderOutageSimulationResult } from './provider-outage';
import { simulateContentExplosion, type ContentExplosionSimulationResult } from './content-explosion';
import {
  runSimulation,
  runQuickSimulation,
  compareScenarios,
  listAvailableScenarios,
  getSimulationStatus,
  isSimulationMode,
  assertNotSimulationMode,
  type UnifiedSimulationResult,
  type SimulationParams,
  type SimulationComparison,
} from './simulator';
import {
  type SimulationScenario,
  type ScenarioType,
  getScenarioById,
  getAllScenarios,
  PREDEFINED_SCENARIOS,
} from './scenarios';

export { simulateTrafficSpike, type TrafficSimulationResult } from './traffic-simulator';
export { simulateProviderOutage, type ProviderOutageSimulationResult } from './provider-outage';
export { simulateContentExplosion, type ContentExplosionSimulationResult } from './content-explosion';

export {
  runSimulation,
  runQuickSimulation,
  compareScenarios,
  listAvailableScenarios,
  getSimulationStatus,
  isSimulationMode,
  assertNotSimulationMode,
  type UnifiedSimulationResult,
  type SimulationParams,
  type SimulationComparison,
} from './simulator';

export {
  type SimulationScenario,
  type ScenarioType,
  getScenarioById,
  getAllScenarios,
  PREDEFINED_SCENARIOS,
} from './scenarios';

const router = Router();

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SimulationAPI] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[SimulationAPI] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[SimulationAPI] ${msg}`, undefined, data),
};

/**
 * GET /api/simulation/traffic-spike
 * 
 * Simulates traffic spike to predict system behavior
 * 
 * Query params:
 * - multiplier: Traffic multiplier (1-100, default 2)
 * 
 * Returns: TrafficSimulationResult
 */
router.get('/traffic-spike', requireAdmin(), (req: Request, res: Response) => {
  try {
    const multiplier = Math.max(1, Math.min(100, Number(req.query.multiplier) || 2));
    
    logger.info('Traffic spike simulation requested', {
      multiplier,
      userId: (req as any).dbUser?.id,
    });

    const result = simulateTrafficSpike(multiplier);
    
    res.json(result);
  } catch (error) {
    logger.error('Traffic spike simulation failed', { error: String(error) });
    res.status(500).json({
      success: false,
      error: 'Simulation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      readOnlyMode: true,
    });
  }
});

/**
 * GET /api/simulation/provider-outage
 * 
 * Simulates AI provider outage to predict fallback behavior
 * 
 * Query params:
 * - provider: Provider name (anthropic, openai, gemini, deepseek, openrouter, replit-ai, freepik)
 * 
 * Returns: ProviderOutageSimulationResult
 */
router.get('/provider-outage', requireAdmin(), (req: Request, res: Response) => {
  try {
    const provider = String(req.query.provider || 'anthropic');
    
    logger.info('Provider outage simulation requested', {
      provider,
      userId: (req as any).dbUser?.id,
    });

    const result = simulateProviderOutage(provider);
    
    res.json(result);
  } catch (error) {
    logger.error('Provider outage simulation failed', { error: String(error) });
    res.status(500).json({
      success: false,
      error: 'Simulation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      readOnlyMode: true,
    });
  }
});

/**
 * GET /api/simulation/content-explosion
 * 
 * Simulates content influx to predict storage and processing impact
 * 
 * Query params:
 * - count: Number of content items (1-10000, default 100)
 * 
 * Returns: ContentExplosionSimulationResult
 */
router.get('/content-explosion', requireAdmin(), (req: Request, res: Response) => {
  try {
    const count = Math.max(1, Math.min(10000, Number(req.query.count) || 100));
    
    logger.info('Content explosion simulation requested', {
      count,
      userId: (req as any).dbUser?.id,
    });

    const result = simulateContentExplosion(count);
    
    res.json(result);
  } catch (error) {
    logger.error('Content explosion simulation failed', { error: String(error) });
    res.status(500).json({
      success: false,
      error: 'Simulation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      readOnlyMode: true,
    });
  }
});

/**
 * GET /api/simulation/scenarios
 * 
 * Returns list of available pre-defined simulation scenarios
 */
router.get('/scenarios', requireAdmin(), (_req: Request, res: Response) => {
  try {
    const scenarios = listAvailableScenarios();
    res.json({
      success: true,
      scenarios,
      count: scenarios.length,
      readOnlyMode: true,
    });
  } catch (error) {
    logger.error('Failed to list scenarios', { error: String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to list scenarios',
      readOnlyMode: true,
    });
  }
});

/**
 * POST /api/simulation/run
 * 
 * Runs a unified simulation using scenario ID or custom parameters
 * 
 * Body:
 * - scenarioId: string (e.g., 'traffic-10x', 'outage-anthropic', 'content-10x')
 * - params: { multiplier?, provider?, contentCount? } (optional overrides)
 * 
 * Returns: UnifiedSimulationResult
 */
router.post('/run', requireAdmin(), (req: Request, res: Response) => {
  try {
    const { scenarioId, params } = req.body;

    if (!scenarioId) {
      res.status(400).json({
        success: false,
        error: 'Missing scenarioId',
        availableScenarios: Object.keys(PREDEFINED_SCENARIOS),
        readOnlyMode: true,
      });
      return;
    }

    logger.info('Unified simulation requested', {
      scenarioId,
      params,
      userId: (req as any).dbUser?.id,
    });

    const result = runSimulation(scenarioId, params);
    res.json(result);
  } catch (error) {
    logger.error('Unified simulation failed', { error: String(error) });
    res.status(500).json({
      success: false,
      error: 'Simulation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      readOnlyMode: true,
    });
  }
});

/**
 * POST /api/simulation/compare
 * 
 * Compares multiple simulation scenarios
 * 
 * Body:
 * - scenarioIds: string[] (array of scenario IDs to compare)
 * 
 * Returns: SimulationComparison
 */
router.post('/compare', requireAdmin(), (req: Request, res: Response) => {
  try {
    const { scenarioIds } = req.body;

    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Must provide at least 2 scenario IDs to compare',
        availableScenarios: Object.keys(PREDEFINED_SCENARIOS),
        readOnlyMode: true,
      });
      return;
    }

    logger.info('Scenario comparison requested', {
      scenarioIds,
      userId: (req as any).dbUser?.id,
    });

    const result = compareScenarios(scenarioIds);
    res.json({
      success: true,
      ...result,
      readOnlyMode: true,
    });
  } catch (error) {
    logger.error('Scenario comparison failed', { error: String(error) });
    res.status(500).json({
      success: false,
      error: 'Comparison failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      readOnlyMode: true,
    });
  }
});

/**
 * GET /api/simulation/status
 * 
 * Returns simulation system status and available endpoints
 */
router.get('/status', requireAdmin(), (_req: Request, res: Response) => {
  const simStatus = getSimulationStatus();
  
  res.json({
    status: 'operational',
    readOnlyMode: true,
    timestamp: new Date().toISOString(),
    activeSimulation: simStatus,
    safetyGuarantees: {
      isSimulationMode: simStatus.isActive,
      writesBlocked: true,
      productionSideEffects: false,
      inMemoryOnly: true,
    },
    endpoints: [
      {
        path: '/api/simulation/run',
        method: 'POST',
        description: 'Run unified simulation with scenario ID',
        body: { scenarioId: 'string', params: 'object (optional overrides)' },
      },
      {
        path: '/api/simulation/scenarios',
        method: 'GET',
        description: 'List all available pre-defined scenarios',
        params: {},
      },
      {
        path: '/api/simulation/compare',
        method: 'POST',
        description: 'Compare multiple scenarios side-by-side',
        body: { scenarioIds: 'string[] (min 2)' },
      },
      {
        path: '/api/simulation/traffic-spike',
        method: 'GET',
        description: 'Simulate traffic spike and predict load tier changes',
        params: { multiplier: 'number (1-100, default 2)' },
      },
      {
        path: '/api/simulation/provider-outage',
        method: 'GET',
        description: 'Simulate AI provider outage and predict fallback behavior',
        params: { provider: 'string (anthropic, openai, gemini, deepseek, openrouter, replit-ai, freepik)' },
      },
      {
        path: '/api/simulation/content-explosion',
        method: 'GET',
        description: 'Simulate content influx and predict storage/processing impact',
        params: { count: 'number (1-10000, default 100)' },
      },
    ],
    availableScenarios: Object.keys(PREDEFINED_SCENARIOS),
    constraints: [
      'All simulations are strictly read-only',
      'No production side effects',
      'All writes blocked in simulation mode',
      'In-memory calculations only',
      'Admin access required',
    ],
  });
});

export default router;

export function registerSimulationRoutes(app: any): void {
  app.use('/api/simulation', router);
  logger.info('Simulation routes registered at /api/simulation/*');
}
