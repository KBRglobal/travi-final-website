/**
 * Enterprise Intelligence Hub - Executive Routes
 *
 * API endpoints for executive summaries.
 */

import { Hono } from 'hono';
import { generateSummary, getQuickHealth } from './summarizer';
import { getTopRisks } from './risk-scoring';
import { getTopOpportunities, getQuickWins } from './opportunities';
import { getSummaryRepository } from './repository';

const app = new Hono();

/**
 * GET /executive/summary
 * Generate and return a new executive summary
 */
app.get('/summary', async (c) => {
  const lookbackDays = parseInt(c.req.query('lookback') || '7', 10);
  const lookbackMs = lookbackDays * 24 * 3600000;

  const repo = getSummaryRepository();
  const previousHealth = repo.getLatestHealth();

  const summary = await generateSummary({ lookbackMs }, previousHealth || undefined);

  // Store for history
  repo.store(summary);

  return c.json(summary);
});

/**
 * GET /executive/summary/:id
 * Get a specific summary by ID
 */
app.get('/summary/:id', (c) => {
  const id = c.req.param('id');
  const repo = getSummaryRepository();
  const summary = repo.get(id);

  if (!summary) {
    return c.json({ error: 'Summary not found' }, 404);
  }

  return c.json(summary);
});

/**
 * GET /executive/latest
 * Get the most recent summary without regenerating
 */
app.get('/latest', (c) => {
  const repo = getSummaryRepository();
  const latest = repo.getLatest();

  if (!latest) {
    return c.json({ error: 'No summaries available' }, 404);
  }

  return c.json(latest);
});

/**
 * GET /executive/health
 * Quick health check
 */
app.get('/health', (c) => {
  const lookbackHours = parseInt(c.req.query('lookback') || '24', 10);
  const lookbackMs = lookbackHours * 3600000;

  const health = getQuickHealth(lookbackMs);
  return c.json(health);
});

/**
 * GET /executive/health/trend
 * Health score trend over time
 */
app.get('/health/trend', (c) => {
  const count = parseInt(c.req.query('count') || '10', 10);
  const repo = getSummaryRepository();
  const trend = repo.getHealthTrend(count);

  return c.json({ trend });
});

/**
 * GET /executive/risks
 * Get current top risks
 */
app.get('/risks', (c) => {
  const n = parseInt(c.req.query('n') || '5', 10);
  const lookbackDays = parseInt(c.req.query('lookback') || '7', 10);
  const lookbackMs = lookbackDays * 24 * 3600000;

  const risks = getTopRisks(n, lookbackMs);
  return c.json({ risks, count: risks.length });
});

/**
 * GET /executive/opportunities
 * Get current top opportunities
 */
app.get('/opportunities', (c) => {
  const n = parseInt(c.req.query('n') || '5', 10);
  const lookbackDays = parseInt(c.req.query('lookback') || '7', 10);
  const lookbackMs = lookbackDays * 24 * 3600000;

  const opportunities = getTopOpportunities(n, lookbackMs);
  return c.json({ opportunities, count: opportunities.length });
});

/**
 * GET /executive/quick-wins
 * Get quick win opportunities (low effort, high value)
 */
app.get('/quick-wins', (c) => {
  const lookbackDays = parseInt(c.req.query('lookback') || '7', 10);
  const lookbackMs = lookbackDays * 24 * 3600000;

  const quickWins = getQuickWins(lookbackMs);
  return c.json({ quickWins, count: quickWins.length });
});

/**
 * GET /executive/history
 * Get summary history
 */
app.get('/history', (c) => {
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const repo = getSummaryRepository();
  const summaries = repo.query({ limit });

  // Return lightweight version
  const history = summaries.map(s => ({
    id: s.id,
    generatedAt: s.generatedAt,
    healthScore: s.healthScore.overall,
    riskCount: s.topRisks.length,
    opportunityCount: s.topOpportunities.length,
    actionCount: s.weeklyActions.length,
  }));

  return c.json({ history, count: history.length });
});

export default app;
