/**
 * Admin Activity Feed - Routes
 */

import { Hono } from 'hono';
import { getActivityFeedService } from './service';
import type { ActivityType, ActivityResult } from './types';

const app = new Hono();

/**
 * Check if enabled
 */
function checkEnabled() {
  return process.env.ENABLE_ACTIVITY_FEED === 'true';
}

/**
 * GET /
 * Get activity feed
 */
app.get('/', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Activity feed is disabled' }, 403);
  }

  const service = getActivityFeedService();

  const types = c.req.query('types')?.split(',') as ActivityType[];
  const results = c.req.query('results')?.split(',') as ActivityResult[];
  const actorId = c.req.query('actorId');
  const entityType = c.req.query('entityType');
  const since = c.req.query('since') ? new Date(c.req.query('since')!) : undefined;
  const until = c.req.query('until') ? new Date(c.req.query('until')!) : undefined;
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const activities = service.query({
    types,
    results,
    actorId,
    entityType,
    since,
    until,
    limit,
    offset,
  });

  return c.json({
    activities,
    count: activities.length,
    offset,
    limit,
  });
});

/**
 * GET /today
 * Get today's activities
 */
app.get('/today', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Activity feed is disabled' }, 403);
  }

  const service = getActivityFeedService();
  const activities = service.getToday();

  return c.json({
    activities,
    count: activities.length,
    date: new Date().toISOString().split('T')[0],
  });
});

/**
 * GET /summary
 * Get activity summary
 */
app.get('/summary', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Activity feed is disabled' }, 403);
  }

  const service = getActivityFeedService();

  const since = c.req.query('since') ? new Date(c.req.query('since')!) : undefined;
  const until = c.req.query('until') ? new Date(c.req.query('until')!) : undefined;

  const summary = service.getSummary(since, until);

  return c.json(summary);
});

/**
 * GET /content/:id
 * Get activity history for a specific content
 */
app.get('/content/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Activity feed is disabled' }, 403);
  }

  const id = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const service = getActivityFeedService();
  const history = service.getEntityHistory(id, limit);

  return c.json(history);
});

/**
 * GET /entity/:id
 * Get activity history for any entity
 */
app.get('/entity/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Activity feed is disabled' }, 403);
  }

  const id = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const service = getActivityFeedService();
  const history = service.getEntityHistory(id, limit);

  return c.json(history);
});

/**
 * GET /actor/:id
 * Get activities by a specific actor
 */
app.get('/actor/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Activity feed is disabled' }, 403);
  }

  const actorId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const service = getActivityFeedService();
  const activities = service.query({ actorId, limit });

  return c.json({
    actorId,
    activities,
    count: activities.length,
  });
});

/**
 * GET /:id
 * Get a specific activity
 */
app.get('/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Activity feed is disabled' }, 403);
  }

  const id = c.req.param('id');
  const service = getActivityFeedService();
  const activity = service.get(id);

  if (!activity) {
    return c.json({ error: 'Activity not found' }, 404);
  }

  return c.json(activity);
});

export default app;
