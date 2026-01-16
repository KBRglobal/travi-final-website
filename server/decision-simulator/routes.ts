/**
 * Platform Decision Simulator - Admin API Routes
 */

import { Hono } from 'hono';
import { getScenarioManager } from './scenarios';
import { getSimulatorRepository } from './repository';
import { runSimulation, quickImpactCheck } from './impact-engine';
import type { SimulationRequest, ScenarioChange } from './types';

const app = new Hono();

/**
 * Check if simulator is enabled
 */
function checkEnabled() {
  return process.env.ENABLE_DECISION_SIMULATOR === 'true';
}

/**
 * GET /
 * Simulator status
 */
app.get('/', (c) => {
  const enabled = checkEnabled();
  const repo = getSimulatorRepository();
  const scenarios = getScenarioManager();

  return c.json({
    name: 'Platform Decision Simulator',
    enabled,
    stats: enabled ? {
      resultCount: repo.count(),
      templateCount: scenarios.listTemplates().length,
    } : null,
  });
});

/**
 * POST /run
 * Run a simulation
 */
app.post('/run', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const body = await c.req.json() as SimulationRequest;
  const scenarios = getScenarioManager();
  const repo = getSimulatorRepository();

  let scenario = body.scenario;

  // If scenarioId provided, look it up
  if (!scenario && body.scenarioId) {
    scenario = scenarios.get(body.scenarioId);
    if (!scenario) {
      return c.json({ error: 'Scenario not found' }, 404);
    }
  }

  if (!scenario) {
    return c.json({ error: 'Scenario or scenarioId is required' }, 400);
  }

  if (!scenario.changes || scenario.changes.length === 0) {
    return c.json({ error: 'Scenario must have at least one change' }, 400);
  }

  // Run simulation
  const result = runSimulation(scenario, body.options);

  // Store result
  repo.store(result);

  return c.json(result);
});

/**
 * POST /quick-check
 * Quick impact assessment without full simulation
 */
app.post('/quick-check', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const body = await c.req.json() as { changes: ScenarioChange[] };

  if (!body.changes || body.changes.length === 0) {
    return c.json({ error: 'Changes array is required' }, 400);
  }

  const result = quickImpactCheck(body.changes);

  return c.json(result);
});

/**
 * GET /scenarios
 * List available scenarios
 */
app.get('/scenarios', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const scenarios = getScenarioManager();
  const tags = c.req.query('tags')?.split(',');
  const type = c.req.query('type') as any;
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const results = scenarios.query({ tags, type, limit });

  return c.json({
    scenarios: results,
    count: results.length,
  });
});

/**
 * GET /scenarios/templates
 * List predefined scenario templates
 */
app.get('/scenarios/templates', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const scenarios = getScenarioManager();
  const templates = scenarios.listTemplates();

  return c.json({
    templates,
    count: templates.length,
  });
});

/**
 * GET /scenarios/:id
 * Get a specific scenario
 */
app.get('/scenarios/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const id = c.req.param('id');
  const scenarios = getScenarioManager();
  const scenario = scenarios.get(id);

  if (!scenario) {
    return c.json({ error: 'Scenario not found' }, 404);
  }

  return c.json(scenario);
});

/**
 * POST /scenarios
 * Create a custom scenario
 */
app.post('/scenarios', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const body = await c.req.json() as {
    name: string;
    description: string;
    changes: ScenarioChange[];
    tags?: string[];
  };

  if (!body.name || !body.description || !body.changes) {
    return c.json({ error: 'name, description, and changes are required' }, 400);
  }

  const scenarios = getScenarioManager();
  const scenario = scenarios.create(
    body.name,
    body.description,
    body.changes,
    body.tags
  );

  return c.json(scenario, 201);
});

/**
 * DELETE /scenarios/:id
 * Delete a custom scenario
 */
app.delete('/scenarios/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const id = c.req.param('id');
  const scenarios = getScenarioManager();

  // Don't allow deleting templates
  if (id.startsWith('template-')) {
    return c.json({ error: 'Cannot delete predefined templates' }, 400);
  }

  const deleted = scenarios.delete(id);

  if (!deleted) {
    return c.json({ error: 'Scenario not found' }, 404);
  }

  return c.json({ success: true });
});

/**
 * GET /result/:id
 * Get a simulation result
 */
app.get('/result/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const id = c.req.param('id');
  const repo = getSimulatorRepository();
  const result = repo.get(id);

  if (!result) {
    return c.json({ error: 'Result not found' }, 404);
  }

  return c.json(result);
});

/**
 * GET /results
 * Query simulation results
 */
app.get('/results', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const repo = getSimulatorRepository();
  const scenarioId = c.req.query('scenarioId');
  const since = c.req.query('since');
  const limit = parseInt(c.req.query('limit') || '20', 10);

  const results = repo.query({
    scenarioId,
    since: since ? new Date(since) : undefined,
    limit,
  });

  return c.json({
    results,
    count: results.length,
  });
});

/**
 * GET /stats
 * Get simulator statistics
 */
app.get('/stats', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Decision simulator is disabled' }, 403);
  }

  const repo = getSimulatorRepository();
  const stats = repo.getStats();

  return c.json(stats);
});

export default app;
