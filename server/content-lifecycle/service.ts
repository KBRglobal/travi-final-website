/**
 * Content Lifecycle Timeline Service
 *
 * Provides audit-grade tracking of all content changes and events.
 */

import { db } from "../db";
import { contents as content } from "../../shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import type {
  LifecycleEvent,
  ContentLifecycle,
  TimelineFilter,
  TimelineStats,
  AuditExport,
  EventType,
  EventSource,
  StateSnapshot,
} from "./types";

// In-memory event storage
const eventsStore = new Map<string, LifecycleEvent[]>();
const stateSnapshots = new Map<string, StateSnapshot[]>();

/**
 * Record a lifecycle event
 */
export function recordEvent(
  contentId: string,
  type: EventType,
  source: EventSource,
  description: string,
  options: {
    userId?: string;
    userName?: string;
    metadata?: Record<string, unknown>;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): LifecycleEvent {
  const event: LifecycleEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    contentId,
    type,
    source,
    userId: options.userId,
    userName: options.userName,
    timestamp: new Date(),
    description,
    metadata: options.metadata || {},
    previousState: options.previousState,
    newState: options.newState,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  };

  // Store the event
  const events = eventsStore.get(contentId) || [];
  events.push(event);
  eventsStore.set(contentId, events);

  // If state changed, record snapshot
  if (options.newState) {
    recordStateSnapshot(contentId, options.newState);
  }

  return event;
}

/**
 * Record a state snapshot
 */
function recordStateSnapshot(contentId: string, state: Record<string, unknown>): void {
  const snapshots = stateSnapshots.get(contentId) || [];

  const snapshot: StateSnapshot = {
    timestamp: new Date(),
    status: (state.status as string) || 'unknown',
    version: snapshots.length + 1,
    hash: hashState(state),
  };

  snapshots.push(snapshot);
  stateSnapshots.set(contentId, snapshots);
}

/**
 * Hash state for change detection
 */
function hashState(state: Record<string, unknown>): string {
  const json = JSON.stringify(state, Object.keys(state).sort());
  return crypto.createHash('md5').update(json).digest('hex').substring(0, 12);
}

/**
 * Get content lifecycle with all events
 */
export async function getContentLifecycle(contentId: string): Promise<ContentLifecycle> {
  const [contentItem] = await db.select().from(content).where(eq(content.id, parseInt(contentId))).limit(1);

  if (!contentItem) {
    throw new Error(`Content ${contentId} not found`);
  }

  const events = eventsStore.get(contentId) || [];
  const snapshots = stateSnapshots.get(contentId) || [];

  // Sort events by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Extract unique owners from ownership events
  const owners = new Set<string>();
  for (const event of events) {
    if (event.type === 'ownership_changed' && event.userId) {
      owners.add(event.userId);
    }
  }

  return {
    contentId,
    contentTitle: contentItem.title || 'Untitled',
    contentType: contentItem.contentType || 'unknown',
    createdAt: contentItem.createdAt ? new Date(contentItem.createdAt) : new Date(),
    createdBy: events.find(e => e.type === 'created')?.userId,
    currentStatus: contentItem.status || 'draft',
    events,
    totalEvents: events.length,
    lastActivity: events.length > 0 ? events[events.length - 1].timestamp : new Date(),
    owners: Array.from(owners),
    stateHistory: snapshots,
  };
}

/**
 * Query events with filters
 */
export async function queryEvents(filter: TimelineFilter): Promise<LifecycleEvent[]> {
  let allEvents: LifecycleEvent[] = [];

  if (filter.contentId) {
    allEvents = eventsStore.get(filter.contentId) || [];
  } else {
    for (const events of eventsStore.values()) {
      allEvents.push(...events);
    }
  }

  // Apply filters
  if (filter.types && filter.types.length > 0) {
    allEvents = allEvents.filter(e => filter.types!.includes(e.type));
  }

  if (filter.sources && filter.sources.length > 0) {
    allEvents = allEvents.filter(e => filter.sources!.includes(e.source));
  }

  if (filter.userId) {
    allEvents = allEvents.filter(e => e.userId === filter.userId);
  }

  if (filter.startDate) {
    allEvents = allEvents.filter(e => new Date(e.timestamp) >= filter.startDate!);
  }

  if (filter.endDate) {
    allEvents = allEvents.filter(e => new Date(e.timestamp) <= filter.endDate!);
  }

  // Sort by timestamp descending (newest first)
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const offset = filter.offset || 0;
  const limit = filter.limit || 100;

  return allEvents.slice(offset, offset + limit);
}

/**
 * Get timeline statistics
 */
export async function getTimelineStats(): Promise<TimelineStats> {
  const allEvents: LifecycleEvent[] = [];
  for (const events of eventsStore.values()) {
    allEvents.push(...events);
  }

  const byType: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byUserMap = new Map<string, { userName: string; count: number }>();
  const byContentMap = new Map<string, { title: string; count: number }>();

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  let recentActivity = 0;

  for (const event of allEvents) {
    // Count by type
    byType[event.type] = (byType[event.type] || 0) + 1;

    // Count by source
    bySource[event.source] = (bySource[event.source] || 0) + 1;

    // Count by user
    if (event.userId) {
      const existing = byUserMap.get(event.userId);
      byUserMap.set(event.userId, {
        userName: event.userName || event.userId,
        count: (existing?.count || 0) + 1,
      });
    }

    // Count by content
    const contentData = byContentMap.get(event.contentId);
    byContentMap.set(event.contentId, {
      title: (event.metadata?.contentTitle as string) || event.contentId,
      count: (contentData?.count || 0) + 1,
    });

    // Count recent activity
    if (new Date(event.timestamp).getTime() > oneDayAgo) {
      recentActivity++;
    }
  }

  // Sort users by count
  const byUser = Array.from(byUserMap.entries())
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Sort content by count
  const mostActiveContent = Array.from(byContentMap.entries())
    .map(([contentId, data]) => ({ contentId, title: data.title, eventCount: data.count }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 10);

  return {
    totalEvents: allEvents.length,
    byType,
    bySource,
    byUser,
    recentActivity,
    mostActiveContent,
  };
}

/**
 * Export audit trail for a content item
 */
export async function exportAudit(
  contentId: string,
  format: 'json' | 'csv',
  exportedBy: string
): Promise<AuditExport> {
  const lifecycle = await getContentLifecycle(contentId);

  let data: string;

  if (format === 'json') {
    data = JSON.stringify(lifecycle, null, 2);
  } else {
    // CSV format
    const headers = ['id', 'type', 'source', 'timestamp', 'userId', 'userName', 'description'];
    const rows = lifecycle.events.map(e => [
      e.id,
      e.type,
      e.source,
      new Date(e.timestamp).toISOString(),
      e.userId || '',
      e.userName || '',
      `"${e.description.replace(/"/g, '""')}"`,
    ]);

    data = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  return {
    exportedAt: new Date(),
    exportedBy,
    contentId,
    format,
    eventCount: lifecycle.totalEvents,
    data,
  };
}

/**
 * Get recent events across all content
 */
export async function getRecentEvents(limit: number = 50): Promise<LifecycleEvent[]> {
  return queryEvents({ limit });
}

/**
 * Compare two state snapshots
 */
export function compareSnapshots(
  contentId: string,
  version1: number,
  version2: number
): { added: string[]; removed: string[]; changed: string[] } | null {
  const snapshots = stateSnapshots.get(contentId) || [];

  const snap1 = snapshots.find(s => s.version === version1);
  const snap2 = snapshots.find(s => s.version === version2);

  if (!snap1 || !snap2) return null;

  // Since we only have hashes, we can only detect if they're different
  // A full implementation would store complete state
  return {
    added: [],
    removed: [],
    changed: snap1.hash !== snap2.hash ? ['content'] : [],
  };
}

/**
 * Convenience methods for common events
 */
export const EventRecorders = {
  contentCreated: (contentId: string, userId: string, userName?: string) =>
    recordEvent(contentId, 'created', 'user', 'Content created', { userId, userName }),

  contentUpdated: (contentId: string, userId: string, fields: string[], userName?: string) =>
    recordEvent(contentId, 'updated', 'user', `Updated: ${fields.join(', ')}`, { userId, userName, metadata: { fields } }),

  contentPublished: (contentId: string, userId: string, userName?: string) =>
    recordEvent(contentId, 'published', 'user', 'Content published', { userId, userName }),

  contentScheduled: (contentId: string, scheduledDate: Date, userId?: string) =>
    recordEvent(contentId, 'scheduled', 'user', `Scheduled for ${scheduledDate.toISOString()}`, { userId, metadata: { scheduledDate } }),

  aiGenerated: (contentId: string, model: string, operation: string) =>
    recordEvent(contentId, 'ai_generated', 'ai', `AI ${operation} using ${model}`, { metadata: { model, operation } }),

  slaViolation: (contentId: string, slaType: string, daysOverdue: number) =>
    recordEvent(contentId, 'sla_violated', 'system', `SLA violation: ${slaType} (${daysOverdue} days overdue)`, { metadata: { slaType, daysOverdue } }),

  qualityScored: (contentId: string, score: number, grade: string) =>
    recordEvent(contentId, 'quality_scored', 'system', `Quality scored: ${score}% (${grade})`, { metadata: { score, grade } }),
};
