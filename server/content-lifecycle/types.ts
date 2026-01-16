/**
 * Content Lifecycle Timeline Types
 *
 * FEATURE 10: Content Lifecycle Timeline (Audit-grade)
 * Comprehensive audit trail of all content changes
 */

export type EventType =
  | 'created'
  | 'updated'
  | 'published'
  | 'unpublished'
  | 'scheduled'
  | 'archived'
  | 'deleted'
  | 'restored'
  | 'ownership_changed'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'ai_generated'
  | 'ai_edited'
  | 'merged'
  | 'split'
  | 'redirected'
  | 'experiment_started'
  | 'experiment_ended'
  | 'quality_scored'
  | 'decay_detected'
  | 'competition_detected'
  | 'sla_violated'
  | 'custom';

export type EventSource = 'user' | 'system' | 'ai' | 'scheduler' | 'automation' | 'api';

export interface LifecycleEvent {
  id: string;
  contentId: string;
  type: EventType;
  source: EventSource;
  userId?: string;
  userName?: string;
  timestamp: Date;
  description: string;
  metadata: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ContentLifecycle {
  contentId: string;
  contentTitle: string;
  contentType: string;
  createdAt: Date;
  createdBy?: string;
  currentStatus: string;
  events: LifecycleEvent[];
  totalEvents: number;
  lastActivity: Date;
  owners: string[];
  stateHistory: StateSnapshot[];
}

export interface StateSnapshot {
  timestamp: Date;
  status: string;
  version: number;
  hash: string; // Content hash for change detection
}

export interface TimelineFilter {
  contentId?: string;
  types?: EventType[];
  sources?: EventSource[];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface TimelineStats {
  totalEvents: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  byUser: { userId: string; userName: string; count: number }[];
  recentActivity: number; // Events in last 24h
  mostActiveContent: { contentId: string; title: string; eventCount: number }[];
}

export interface AuditExport {
  exportedAt: Date;
  exportedBy: string;
  contentId: string;
  format: 'json' | 'csv';
  eventCount: number;
  data: string;
}

export function isLifecycleTimelineEnabled(): boolean {
  return process.env.ENABLE_LIFECYCLE_TIMELINE === 'true';
}
