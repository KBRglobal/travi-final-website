/**
 * User & Content Notification System - Routes
 */

import { Hono } from 'hono';
import { getNotificationService } from './service';
import type { NotificationType, NotificationSeverity } from './types';

const app = new Hono();

/**
 * Check if enabled
 */
function checkEnabled() {
  return process.env.ENABLE_NOTIFICATIONS === 'true';
}

/**
 * GET /
 * Get notifications for a user
 */
app.get('/', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const service = getNotificationService();

  // In production, get from auth context
  const recipientId = c.req.query('recipientId') || 'default-user';
  const types = c.req.query('types')?.split(',') as NotificationType[];
  const severities = c.req.query('severities')?.split(',') as NotificationSeverity[];
  const status = c.req.query('status') as any;
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const notifications = service.query({
    recipientId,
    types,
    severities,
    status,
    limit,
  });

  return c.json({
    notifications,
    count: notifications.length,
  });
});

/**
 * GET /unread-count
 * Get unread notification count
 */
app.get('/unread-count', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const service = getNotificationService();
  const recipientId = c.req.query('recipientId') || 'default-user';
  const count = service.getUnreadCount(recipientId);

  return c.json({ count });
});

/**
 * GET /counts
 * Get notification counts by category
 */
app.get('/counts', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const service = getNotificationService();
  const recipientId = c.req.query('recipientId') || 'default-user';
  const counts = service.getCounts(recipientId);

  return c.json(counts);
});

/**
 * GET /:id
 * Get a specific notification
 */
app.get('/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const id = c.req.param('id');
  const service = getNotificationService();
  const notification = service.get(id);

  if (!notification) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  return c.json(notification);
});

/**
 * POST /:id/read
 * Mark notification as read
 */
app.post('/:id/read', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const id = c.req.param('id');
  const service = getNotificationService();
  const success = service.markRead(id);

  if (!success) {
    return c.json({ error: 'Notification not found or already read' }, 400);
  }

  return c.json({ success: true, id });
});

/**
 * POST /read-all
 * Mark all notifications as read for a user
 */
app.post('/read-all', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const service = getNotificationService();
  const recipientId = c.req.query('recipientId') || 'default-user';
  const count = service.markAllRead(recipientId);

  return c.json({ success: true, markedRead: count });
});

/**
 * POST /:id/dismiss
 * Dismiss a notification
 */
app.post('/:id/dismiss', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const id = c.req.param('id');
  const service = getNotificationService();
  const success = service.dismiss(id);

  if (!success) {
    return c.json({ error: 'Notification not found' }, 400);
  }

  return c.json({ success: true, id });
});

/**
 * POST /
 * Create a notification (admin only)
 */
app.post('/', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const body = await c.req.json();

  if (!body.type || !body.title || !body.message || !body.recipientId) {
    return c.json({ error: 'type, title, message, and recipientId are required' }, 400);
  }

  const service = getNotificationService();
  const notification = service.create(body);

  return c.json(notification, 201);
});

/**
 * POST /cleanup
 * Cleanup old notifications (admin only)
 */
app.post('/cleanup', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Notifications are disabled' }, 403);
  }

  const days = parseInt(c.req.query('days') || '30', 10);
  const service = getNotificationService();
  const deleted = service.cleanup(days);

  return c.json({ success: true, deleted });
});

export default app;
