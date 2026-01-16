/**
 * User & Content Notification System - Service
 */

import { log } from '../lib/logger';
import type {
  Notification,
  NotificationType,
  NotificationSeverity,
  CreateNotificationRequest,
  NotificationQuery,
  NotificationCounts,
  BulkNotificationRequest,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Notifications] ${msg}`, data),
};

// Bounded storage
const MAX_NOTIFICATIONS = 5000;
const MAX_PER_USER = 200;

/**
 * Generate unique notification ID
 */
function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private byRecipient: Map<string, Set<string>> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_NOTIFICATIONS === 'true';
    if (this.enabled) {
      logger.info('Notification Service initialized');
    }
  }

  /**
   * Create a notification
   */
  create(request: CreateNotificationRequest): Notification {
    const notification: Notification = {
      id: generateNotificationId(),
      type: request.type,
      severity: request.severity || 'info',
      status: 'unread',
      title: request.title,
      message: request.message,
      recipientId: request.recipientId,
      recipientRole: request.recipientRole,
      entityId: request.entityId,
      entityType: request.entityType,
      entityTitle: request.entityTitle,
      actionUrl: request.actionUrl,
      actionLabel: request.actionLabel,
      createdAt: new Date(),
      expiresAt: request.expiresAt,
      metadata: request.metadata,
    };

    this.notifications.set(notification.id, notification);

    // Index by recipient
    if (!this.byRecipient.has(request.recipientId)) {
      this.byRecipient.set(request.recipientId, new Set());
    }
    this.byRecipient.get(request.recipientId)!.add(notification.id);

    // Enforce limits
    this.enforceUserLimit(request.recipientId);
    this.enforceGlobalLimit();

    logger.info('Notification created', {
      id: notification.id,
      type: notification.type,
      recipientId: notification.recipientId,
    });

    return notification;
  }

  /**
   * Create notifications for multiple recipients
   */
  createBulk(request: BulkNotificationRequest): Notification[] {
    const notifications: Notification[] = [];

    for (const recipientId of request.recipientIds) {
      const notification = this.create({
        type: request.type,
        severity: request.severity,
        title: request.title,
        message: request.message,
        recipientId,
        entityId: request.entityId,
        entityType: request.entityType,
        actionUrl: request.actionUrl,
      });
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Get notification by ID
   */
  get(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  /**
   * Mark notification as read
   */
  markRead(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification || notification.status === 'read') {
      return false;
    }

    notification.status = 'read';
    notification.readAt = new Date();
    return true;
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllRead(recipientId: string): number {
    const userNotifs = this.byRecipient.get(recipientId);
    if (!userNotifs) return 0;

    let count = 0;
    for (const id of userNotifs) {
      if (this.markRead(id)) count++;
    }
    return count;
  }

  /**
   * Dismiss notification
   */
  dismiss(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    notification.status = 'dismissed';
    notification.dismissedAt = new Date();
    return true;
  }

  /**
   * Query notifications
   */
  query(query: NotificationQuery = {}): Notification[] {
    let results: Notification[];

    // Start from recipient index if available
    if (query.recipientId) {
      const userNotifs = this.byRecipient.get(query.recipientId);
      if (!userNotifs) return [];
      results = Array.from(userNotifs)
        .map(id => this.notifications.get(id)!)
        .filter(Boolean);
    } else {
      results = Array.from(this.notifications.values());
    }

    // Apply filters
    if (query.types?.length) {
      results = results.filter(n => query.types!.includes(n.type));
    }

    if (query.severities?.length) {
      results = results.filter(n => query.severities!.includes(n.severity));
    }

    if (query.status) {
      results = results.filter(n => n.status === query.status);
    }

    if (query.entityId) {
      results = results.filter(n => n.entityId === query.entityId);
    }

    if (query.since) {
      results = results.filter(n => n.createdAt >= query.since!);
    }

    // Filter expired
    const now = new Date();
    results = results.filter(n => !n.expiresAt || n.expiresAt > now);

    // Sort by creation date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get unread count for user
   */
  getUnreadCount(recipientId: string): number {
    const notifications = this.query({ recipientId, status: 'unread' });
    return notifications.length;
  }

  /**
   * Get notification counts for user
   */
  getCounts(recipientId: string): NotificationCounts {
    const all = this.query({ recipientId });

    const bySeverity: Record<NotificationSeverity, number> = {
      info: 0,
      warning: 0,
      critical: 0,
    };

    const byType: Record<string, number> = {};
    let unread = 0;

    for (const n of all) {
      bySeverity[n.severity]++;
      byType[n.type] = (byType[n.type] || 0) + 1;
      if (n.status === 'unread') unread++;
    }

    return {
      total: all.length,
      unread,
      bySeverity,
      byType,
    };
  }

  /**
   * Delete old notifications
   */
  cleanup(olderThanDays = 30): number {
    const threshold = new Date(Date.now() - olderThanDays * 24 * 3600000);
    let deleted = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.createdAt < threshold && notification.status !== 'unread') {
        this.notifications.delete(id);
        const userNotifs = this.byRecipient.get(notification.recipientId);
        if (userNotifs) userNotifs.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Enforce per-user limit
   */
  private enforceUserLimit(recipientId: string): void {
    const userNotifs = this.byRecipient.get(recipientId);
    if (!userNotifs || userNotifs.size <= MAX_PER_USER) return;

    // Get user notifications sorted by date
    const sorted = Array.from(userNotifs)
      .map(id => this.notifications.get(id)!)
      .filter(Boolean)
      .filter(n => n.status !== 'unread')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Remove oldest read notifications
    const toRemove = sorted.slice(0, userNotifs.size - MAX_PER_USER);
    for (const n of toRemove) {
      this.notifications.delete(n.id);
      userNotifs.delete(n.id);
    }
  }

  /**
   * Enforce global limit
   */
  private enforceGlobalLimit(): void {
    if (this.notifications.size <= MAX_NOTIFICATIONS) return;

    // Remove oldest read/dismissed notifications
    const sorted = Array.from(this.notifications.values())
      .filter(n => n.status !== 'unread')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const toRemove = sorted.slice(0, this.notifications.size - MAX_NOTIFICATIONS);
    for (const n of toRemove) {
      this.notifications.delete(n.id);
      const userNotifs = this.byRecipient.get(n.recipientId);
      if (userNotifs) userNotifs.delete(n.id);
    }
  }

  /**
   * Clear all notifications (for testing)
   */
  clear(): void {
    this.notifications.clear();
    this.byRecipient.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get total count
   */
  count(): number {
    return this.notifications.size;
  }
}

// Singleton
let instance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!instance) {
    instance = new NotificationService();
  }
  return instance;
}

export function resetNotificationService(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { NotificationService };

// ============================================================
// NOTIFICATION TRIGGERS (for use by other systems)
// ============================================================

/**
 * Notify about content publication
 */
export function notifyContentPublished(
  recipientId: string,
  contentId: string,
  contentTitle: string
): Notification | null {
  const service = getNotificationService();
  if (!service.isEnabled()) return null;

  return service.create({
    type: 'content_published',
    severity: 'info',
    title: 'Content Published',
    message: `"${contentTitle}" has been published successfully.`,
    recipientId,
    entityId: contentId,
    entityType: 'content',
    entityTitle: contentTitle,
    actionUrl: `/admin/content/${contentId}`,
    actionLabel: 'View Content',
  });
}

/**
 * Notify about content being blocked
 */
export function notifyContentBlocked(
  recipientId: string,
  contentId: string,
  contentTitle: string,
  reason: string
): Notification | null {
  const service = getNotificationService();
  if (!service.isEnabled()) return null;

  return service.create({
    type: 'content_blocked',
    severity: 'warning',
    title: 'Content Blocked',
    message: `"${contentTitle}" was blocked: ${reason}`,
    recipientId,
    entityId: contentId,
    entityType: 'content',
    entityTitle: contentTitle,
    actionUrl: `/admin/content/${contentId}`,
    actionLabel: 'Review Content',
  });
}

/**
 * Notify about content needing review
 */
export function notifyContentNeedsReview(
  recipientId: string,
  contentId: string,
  contentTitle: string
): Notification | null {
  const service = getNotificationService();
  if (!service.isEnabled()) return null;

  return service.create({
    type: 'content_needs_review',
    severity: 'info',
    title: 'Content Needs Review',
    message: `"${contentTitle}" is ready for your review.`,
    recipientId,
    entityId: contentId,
    entityType: 'content',
    entityTitle: contentTitle,
    actionUrl: `/admin/content/${contentId}/review`,
    actionLabel: 'Review Now',
  });
}

/**
 * Notify about system warning
 */
export function notifySystemWarning(
  recipientIds: string[],
  title: string,
  message: string,
  severity: NotificationSeverity = 'warning'
): Notification[] {
  const service = getNotificationService();
  if (!service.isEnabled()) return [];

  return service.createBulk({
    type: 'system_warning',
    severity,
    title,
    message,
    recipientIds,
  });
}

/**
 * Notify about incident
 */
export function notifyIncident(
  recipientIds: string[],
  incidentId: string,
  title: string,
  severity: NotificationSeverity
): Notification[] {
  const service = getNotificationService();
  if (!service.isEnabled()) return [];

  return service.createBulk({
    type: 'incident_created',
    severity,
    title: 'Incident Created',
    message: title,
    recipientIds,
    entityId: incidentId,
    entityType: 'incident',
    actionUrl: `/admin/incidents/${incidentId}`,
  });
}
