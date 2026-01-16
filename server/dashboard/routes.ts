/**
 * Admin Dashboard Backend - Routes
 */

import { Hono } from 'hono';
import { getDashboardService } from './service';

const app = new Hono();

/**
 * Check if enabled
 */
function checkEnabled() {
  return process.env.ENABLE_ADMIN_DASHBOARD === 'true';
}

/**
 * GET /summary
 * Get dashboard summary
 */
app.get('/summary', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Admin dashboard is disabled' }, 403);
  }

  const service = getDashboardService();
  const summary = await service.getSummary();

  return c.json(summary);
});

/**
 * GET /content
 * Get content dashboard
 */
app.get('/content', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Admin dashboard is disabled' }, 403);
  }

  const service = getDashboardService();
  const dashboard = await service.getContentDashboard();

  return c.json(dashboard);
});

/**
 * GET /system
 * Get system dashboard
 */
app.get('/system', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Admin dashboard is disabled' }, 403);
  }

  const service = getDashboardService();
  const dashboard = await service.getSystemDashboard();

  return c.json(dashboard);
});

/**
 * GET /
 * Get basic status
 */
app.get('/', (c) => {
  const enabled = checkEnabled();

  return c.json({
    name: 'Admin Dashboard Backend',
    enabled,
    endpoints: enabled ? {
      summary: '/summary',
      content: '/content',
      system: '/system',
    } : null,
  });
});

export default app;
