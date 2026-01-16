/**
 * Audit Log v2 - Repository
 * Query and summary functions for audit events
 */

import { getAuditEvents } from './emitter';
import type { AuditEvent, AuditQueryOptions, AuditSummary, AuditEventType, ResourceType } from './types';

// ============================================================================
// Query Functions
// ============================================================================

export function queryAuditEvents(options?: AuditQueryOptions): AuditEvent[] {
  let events = [...getAuditEvents()];

  if (options?.resourceType) {
    events = events.filter(e => e.resourceType === options.resourceType);
  }

  if (options?.resourceId) {
    events = events.filter(e => e.resourceId === options.resourceId);
  }

  if (options?.type) {
    events = events.filter(e => e.type === options.type);
  }

  if (options?.actorId) {
    events = events.filter(e => e.actorId === options.actorId);
  }

  if (options?.from) {
    events = events.filter(e => e.timestamp >= options.from!);
  }

  if (options?.to) {
    events = events.filter(e => e.timestamp <= options.to!);
  }

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const offset = options?.offset || 0;
  const limit = options?.limit || 100;

  return events.slice(offset, offset + limit);
}

export function getAuditEventById(id: string): AuditEvent | null {
  return getAuditEvents().find(e => e.id === id) || null;
}

// ============================================================================
// Summary Functions
// ============================================================================

export function getAuditSummary(): AuditSummary {
  const events = getAuditEvents();

  const eventsByType: Partial<Record<AuditEventType, number>> = {};
  const eventsByResourceType: Partial<Record<ResourceType, number>> = {};
  const actorIds = new Set<string>();
  let lastEventAt: Date | undefined;

  for (const event of events) {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    eventsByResourceType[event.resourceType] = (eventsByResourceType[event.resourceType] || 0) + 1;
    actorIds.add(event.actorId);

    if (!lastEventAt || event.timestamp > lastEventAt) {
      lastEventAt = event.timestamp;
    }
  }

  return {
    totalEvents: events.length,
    eventsByType,
    eventsByResourceType,
    lastEventAt,
    uniqueActors: actorIds.size,
  };
}

export function getTotalEventCount(): number {
  return getAuditEvents().length;
}
