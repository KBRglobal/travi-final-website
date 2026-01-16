/**
 * User & Content Notification System - Types
 */

export type NotificationType =
  | 'content_published'
  | 'content_blocked'
  | 'content_needs_review'
  | 'system_warning'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'incident_created'
  | 'incident_resolved';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type NotificationStatus = 'unread' | 'read' | 'dismissed';

/**
 * Notification recipient
 */
export interface NotificationRecipient {
  userId: string;
  role?: string;
}

/**
 * Notification entity
 */
export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  status: NotificationStatus;

  // Content
  title: string;
  message: string;

  // Context
  entityId?: string;
  entityType?: string;
  entityTitle?: string;

  // Recipient
  recipientId: string;
  recipientRole?: string;

  // Action
  actionUrl?: string;
  actionLabel?: string;

  // Timestamps
  createdAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  expiresAt?: Date;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Create notification request
 */
export interface CreateNotificationRequest {
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  recipientId: string;
  recipientRole?: string;
  entityId?: string;
  entityType?: string;
  entityTitle?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Notification query
 */
export interface NotificationQuery {
  recipientId?: string;
  types?: NotificationType[];
  severities?: NotificationSeverity[];
  status?: NotificationStatus;
  entityId?: string;
  since?: Date;
  limit?: number;
}

/**
 * Notification counts
 */
export interface NotificationCounts {
  total: number;
  unread: number;
  bySeverity: Record<NotificationSeverity, number>;
  byType: Record<string, number>;
}

/**
 * Bulk notification request
 */
export interface BulkNotificationRequest {
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  recipientIds: string[];
  entityId?: string;
  entityType?: string;
  actionUrl?: string;
}
