/**
 * Organizational Memory & RCA Engine - Admin API Routes
 */

import { Hono } from 'hono';
import { getMemoryRepository } from './repository';
import { runRCA, getRCA, getAllRCAs, getRCAStats } from './rca-engine';
import { detectPatterns, getPattern, queryPatterns, getActivePatterns, getPatternStats } from './patterns';
import { generateLearnings, getLearning, queryLearnings, getTopLearnings, updateLearningStatus, getLearningStats } from './learnings';
import type { MemoryEvent, MemoryEventType } from './types';

const app = new Hono();

/**
 * Check if org memory is enabled
 */
function checkEnabled() {
  return process.env.ENABLE_ORG_MEMORY === 'true';
}

/**
 * GET /
 * Org memory status
 */
app.get('/', (c) => {
  const enabled = checkEnabled();
  const repo = getMemoryRepository();

  return c.json({
    name: 'Organizational Memory & RCA Engine',
    enabled,
    stats: enabled ? {
      events: repo.count(),
      rca: getRCAStats(),
      patterns: getPatternStats(),
      learnings: getLearningStats(),
    } : null,
  });
});

// ============================================================
// INCIDENTS / EVENTS
// ============================================================

/**
 * GET /incidents
 * Get all memory events (incidents)
 */
app.get('/incidents', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const repo = getMemoryRepository();
  const types = c.req.query('types')?.split(',') as MemoryEventType[];
  const severity = c.req.query('severity')?.split(',');
  const affectedSystem = c.req.query('affectedSystem');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const results = repo.query({
    types,
    severity,
    affectedSystem,
    limit,
  });

  return c.json({
    incidents: results,
    count: results.length,
    stats: repo.getStats(),
  });
});

/**
 * GET /incidents/unresolved
 * Get unresolved events
 */
app.get('/incidents/unresolved', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const repo = getMemoryRepository();
  const results = repo.getUnresolved();

  return c.json({
    incidents: results,
    count: results.length,
  });
});

/**
 * GET /incidents/needing-rca
 * Get events needing RCA
 */
app.get('/incidents/needing-rca', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const repo = getMemoryRepository();
  const results = repo.getNeedingRCA();

  return c.json({
    incidents: results,
    count: results.length,
  });
});

/**
 * GET /incidents/:id
 * Get a specific event
 */
app.get('/incidents/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const id = c.req.param('id');
  const repo = getMemoryRepository();
  const event = repo.get(id);

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json(event);
});

/**
 * POST /incidents
 * Record a new event
 */
app.post('/incidents', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const body = await c.req.json() as Omit<MemoryEvent, 'id'>;

  if (!body.type || !body.title) {
    return c.json({ error: 'type and title are required' }, 400);
  }

  const repo = getMemoryRepository();
  const event = repo.record({
    ...body,
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    signals: body.signals || [],
    decisions: body.decisions || [],
    metadata: body.metadata || {},
    rcaComplete: false,
  });

  return c.json(event, 201);
});

/**
 * POST /incidents/:id/resolve
 * Mark event as resolved
 */
app.post('/incidents/:id/resolve', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const id = c.req.param('id');
  const repo = getMemoryRepository();
  const event = repo.resolve(id);

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json(event);
});

// ============================================================
// RCA
// ============================================================

/**
 * GET /rca
 * Get all RCA results
 */
app.get('/rca', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const limit = parseInt(c.req.query('limit') || '20', 10);
  const results = getAllRCAs(limit);

  return c.json({
    results,
    count: results.length,
    stats: getRCAStats(),
  });
});

/**
 * GET /rca/:id
 * Get a specific RCA result
 */
app.get('/rca/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const id = c.req.param('id');
  const result = getRCA(id);

  if (!result) {
    return c.json({ error: 'RCA not found' }, 404);
  }

  return c.json(result);
});

/**
 * POST /rca/:eventId/run
 * Run RCA on an event
 */
app.post('/rca/:eventId/run', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const eventId = c.req.param('eventId');
  const result = runRCA(eventId);

  if (!result) {
    return c.json({ error: 'Event not found or RCA failed' }, 404);
  }

  return c.json(result);
});

// ============================================================
// PATTERNS
// ============================================================

/**
 * GET /patterns
 * Get detected patterns
 */
app.get('/patterns', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const types = c.req.query('types')?.split(',') as any;
  const severity = c.req.query('severity')?.split(',');
  const minOccurrences = c.req.query('minOccurrences')
    ? parseInt(c.req.query('minOccurrences')!, 10)
    : undefined;
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const results = queryPatterns({
    types,
    severity,
    minOccurrences,
    limit,
  });

  return c.json({
    patterns: results,
    count: results.length,
    stats: getPatternStats(),
  });
});

/**
 * GET /patterns/active
 * Get active (worsening) patterns
 */
app.get('/patterns/active', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const results = getActivePatterns();

  return c.json({
    patterns: results,
    count: results.length,
  });
});

/**
 * GET /patterns/:id
 * Get a specific pattern
 */
app.get('/patterns/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const id = c.req.param('id');
  const pattern = getPattern(id);

  if (!pattern) {
    return c.json({ error: 'Pattern not found' }, 404);
  }

  return c.json(pattern);
});

/**
 * POST /patterns/detect
 * Run pattern detection
 */
app.post('/patterns/detect', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const detected = detectPatterns();

  return c.json({
    detected,
    count: detected.length,
    stats: getPatternStats(),
  });
});

// ============================================================
// LEARNINGS
// ============================================================

/**
 * GET /learnings
 * Get all learnings
 */
app.get('/learnings', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const categories = c.req.query('categories')?.split(',') as any;
  const status = c.req.query('status')?.split(',') as any;
  const minPriority = c.req.query('minPriority')
    ? parseInt(c.req.query('minPriority')!, 10)
    : undefined;
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const results = queryLearnings({
    categories,
    status,
    minPriority,
    limit,
  });

  return c.json({
    learnings: results,
    count: results.length,
    stats: getLearningStats(),
  });
});

/**
 * GET /learnings/top
 * Get top priority learnings
 */
app.get('/learnings/top', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const limit = parseInt(c.req.query('limit') || '10', 10);
  const results = getTopLearnings(limit);

  return c.json({
    learnings: results,
    count: results.length,
  });
});

/**
 * GET /learnings/:id
 * Get a specific learning
 */
app.get('/learnings/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const id = c.req.param('id');
  const learning = getLearning(id);

  if (!learning) {
    return c.json({ error: 'Learning not found' }, 404);
  }

  return c.json(learning);
});

/**
 * POST /learnings/generate
 * Generate learnings from RCAs and patterns
 */
app.post('/learnings/generate', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const generated = generateLearnings();

  return c.json({
    generated,
    count: generated.length,
    stats: getLearningStats(),
  });
});

/**
 * POST /learnings/:id/status
 * Update learning status
 */
app.post('/learnings/:id/status', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json() as { status: string };

  const validStatuses = ['proposed', 'accepted', 'implemented', 'rejected'];
  if (!body.status || !validStatuses.includes(body.status)) {
    return c.json({ error: 'Invalid status' }, 400);
  }

  const learning = updateLearningStatus(id, body.status as any);

  if (!learning) {
    return c.json({ error: 'Learning not found' }, 404);
  }

  return c.json(learning);
});

// ============================================================
// STATS
// ============================================================

/**
 * GET /stats
 * Get comprehensive stats
 */
app.get('/stats', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Org memory is disabled' }, 403);
  }

  const repo = getMemoryRepository();

  return c.json({
    events: repo.getStats(),
    rca: getRCAStats(),
    patterns: getPatternStats(),
    learnings: getLearningStats(),
  });
});

export default app;
