/**
 * Unit Tests - Notification System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../server/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Notification Service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_NOTIFICATIONS = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_NOTIFICATIONS;
  });

  it('should initialize when enabled', async () => {
    const { getNotificationService, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const service = getNotificationService();
    expect(service.isEnabled()).toBe(true);
  });

  it('should create notification', async () => {
    const { getNotificationService, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const service = getNotificationService();

    const notification = service.create({
      type: 'content_published',
      severity: 'info',
      title: 'Test Notification',
      message: 'This is a test',
      recipientId: 'user-1',
    });

    expect(notification.id).toBeDefined();
    expect(notification.status).toBe('unread');
    expect(notification.title).toBe('Test Notification');
  });

  it('should mark notification as read', async () => {
    const { getNotificationService, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const service = getNotificationService();

    const notification = service.create({
      type: 'content_blocked',
      title: 'Test',
      message: 'Test',
      recipientId: 'user-1',
    });

    const result = service.markRead(notification.id);
    expect(result).toBe(true);

    const updated = service.get(notification.id);
    expect(updated?.status).toBe('read');
    expect(updated?.readAt).toBeDefined();
  });

  it('should query notifications by recipient', async () => {
    const { getNotificationService, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const service = getNotificationService();

    service.create({ type: 'content_published', title: 'N1', message: 'M1', recipientId: 'user-1' });
    service.create({ type: 'content_blocked', title: 'N2', message: 'M2', recipientId: 'user-1' });
    service.create({ type: 'system_warning', title: 'N3', message: 'M3', recipientId: 'user-2' });

    const user1Notifs = service.query({ recipientId: 'user-1' });
    expect(user1Notifs.length).toBe(2);

    const user2Notifs = service.query({ recipientId: 'user-2' });
    expect(user2Notifs.length).toBe(1);
  });

  it('should get unread count', async () => {
    const { getNotificationService, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const service = getNotificationService();

    const n1 = service.create({ type: 'content_published', title: 'N1', message: 'M1', recipientId: 'user-1' });
    service.create({ type: 'content_blocked', title: 'N2', message: 'M2', recipientId: 'user-1' });

    expect(service.getUnreadCount('user-1')).toBe(2);

    service.markRead(n1.id);
    expect(service.getUnreadCount('user-1')).toBe(1);
  });

  it('should filter by severity', async () => {
    const { getNotificationService, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const service = getNotificationService();

    service.create({ type: 'content_published', severity: 'info', title: 'Info', message: 'M', recipientId: 'user-1' });
    service.create({ type: 'content_blocked', severity: 'warning', title: 'Warn', message: 'M', recipientId: 'user-1' });
    service.create({ type: 'system_warning', severity: 'critical', title: 'Crit', message: 'M', recipientId: 'user-1' });

    const warnings = service.query({ recipientId: 'user-1', severities: ['warning'] });
    expect(warnings.length).toBe(1);
    expect(warnings[0].severity).toBe('warning');
  });

  it('should mark all as read', async () => {
    const { getNotificationService, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const service = getNotificationService();

    service.create({ type: 'content_published', title: 'N1', message: 'M', recipientId: 'user-1' });
    service.create({ type: 'content_blocked', title: 'N2', message: 'M', recipientId: 'user-1' });

    const count = service.markAllRead('user-1');
    expect(count).toBe(2);
    expect(service.getUnreadCount('user-1')).toBe(0);
  });

  it('should get notification counts', async () => {
    const { getNotificationService, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const service = getNotificationService();

    service.create({ type: 'content_published', severity: 'info', title: 'N1', message: 'M', recipientId: 'user-1' });
    service.create({ type: 'content_blocked', severity: 'warning', title: 'N2', message: 'M', recipientId: 'user-1' });

    const counts = service.getCounts('user-1');
    expect(counts.total).toBe(2);
    expect(counts.unread).toBe(2);
    expect(counts.bySeverity.info).toBe(1);
    expect(counts.bySeverity.warning).toBe(1);
  });
});

describe('Notification Triggers', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_NOTIFICATIONS = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_NOTIFICATIONS;
  });

  it('should notify content published', async () => {
    const { notifyContentPublished, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const notification = notifyContentPublished('user-1', 'content-1', 'My Article');

    expect(notification).not.toBeNull();
    expect(notification?.type).toBe('content_published');
    expect(notification?.entityId).toBe('content-1');
  });

  it('should notify content blocked', async () => {
    const { notifyContentBlocked, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const notification = notifyContentBlocked('user-1', 'content-1', 'My Article', 'Quality too low');

    expect(notification).not.toBeNull();
    expect(notification?.type).toBe('content_blocked');
    expect(notification?.severity).toBe('warning');
  });

  it('should return null when disabled', async () => {
    delete process.env.ENABLE_NOTIFICATIONS;
    vi.resetModules();

    const { notifyContentPublished, resetNotificationService } = await import(
      '../../../server/notifications/service'
    );

    resetNotificationService();
    const notification = notifyContentPublished('user-1', 'content-1', 'My Article');

    expect(notification).toBeNull();
  });
});
