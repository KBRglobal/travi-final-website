/**
 * Organizational Memory & RCA Engine - Memory Repository
 *
 * Stores incidents, decisions, and events for analysis.
 */

import { log } from '../lib/logger';
import type { MemoryEvent, MemoryQuery, MemoryEventType } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[MemoryRepository] ${msg}`, data),
};

// Bounded storage
const MAX_EVENTS = 2000;

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class MemoryRepository {
  private events: Map<string, MemoryEvent> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_ORG_MEMORY === 'true';
    if (this.enabled) {
      logger.info('Memory Repository initialized');
    }
  }

  /**
   * Record a new event
   */
  record(event: Omit<MemoryEvent, 'id'>): MemoryEvent {
    const fullEvent: MemoryEvent = {
      ...event,
      id: generateEventId(),
    };

    this.events.set(fullEvent.id, fullEvent);
    this.enforceLimit();

    logger.info('Event recorded', {
      id: fullEvent.id,
      type: fullEvent.type,
      severity: fullEvent.severity,
    });

    return fullEvent;
  }

  /**
   * Get an event by ID
   */
  get(id: string): MemoryEvent | undefined {
    return this.events.get(id);
  }

  /**
   * Update an event
   */
  update(id: string, updates: Partial<MemoryEvent>): MemoryEvent | undefined {
    const event = this.events.get(id);
    if (!event) return undefined;

    const updated = { ...event, ...updates, id: event.id };
    this.events.set(id, updated);
    return updated;
  }

  /**
   * Mark event as resolved
   */
  resolve(id: string): MemoryEvent | undefined {
    const event = this.events.get(id);
    if (!event) return undefined;

    event.resolvedAt = new Date();
    event.durationMs = event.resolvedAt.getTime() - event.occurredAt.getTime();
    return event;
  }

  /**
   * Query events
   */
  query(query: MemoryQuery = {}): MemoryEvent[] {
    let results = Array.from(this.events.values());

    if (query.types?.length) {
      results = results.filter(e => query.types!.includes(e.type));
    }

    if (query.severity?.length) {
      results = results.filter(e => query.severity!.includes(e.severity));
    }

    if (query.affectedSystem) {
      results = results.filter(e => e.affectedSystems.includes(query.affectedSystem!));
    }

    if (query.since) {
      results = results.filter(e => e.occurredAt >= query.since!);
    }

    if (query.until) {
      results = results.filter(e => e.occurredAt <= query.until!);
    }

    if (query.rcaComplete !== undefined) {
      results = results.filter(e => e.rcaComplete === query.rcaComplete);
    }

    // Sort by occurrence date descending
    results.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get recent events
   */
  getRecent(limit = 20): MemoryEvent[] {
    return this.query({ limit });
  }

  /**
   * Get unresolved events
   */
  getUnresolved(): MemoryEvent[] {
    return Array.from(this.events.values()).filter(e => !e.resolvedAt);
  }

  /**
   * Get events needing RCA
   */
  getNeedingRCA(): MemoryEvent[] {
    return Array.from(this.events.values()).filter(
      e => !e.rcaComplete &&
           e.resolvedAt &&
           (e.severity === 'high' || e.severity === 'critical')
    );
  }

  /**
   * Get events by type
   */
  getByType(type: MemoryEventType): MemoryEvent[] {
    return this.query({ types: [type] });
  }

  /**
   * Get stats
   */
  getStats() {
    const all = Array.from(this.events.values());

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const e of all) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
    }

    const unresolved = all.filter(e => !e.resolvedAt).length;
    const needingRCA = this.getNeedingRCA().length;

    return {
      total: all.length,
      byType,
      bySeverity,
      unresolved,
      needingRCA,
    };
  }

  /**
   * Count events
   */
  count(): number {
    return this.events.size;
  }

  /**
   * Enforce storage limit
   */
  private enforceLimit(): void {
    if (this.events.size > MAX_EVENTS) {
      // Remove oldest resolved events with completed RCA
      const toRemove = Array.from(this.events.entries())
        .filter(([_, e]) => e.resolvedAt && e.rcaComplete)
        .sort((a, b) => a[1].occurredAt.getTime() - b[1].occurredAt.getTime())
        .slice(0, MAX_EVENTS / 4);

      for (const [id] of toRemove) {
        this.events.delete(id);
      }
    }
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: MemoryRepository | null = null;

export function getMemoryRepository(): MemoryRepository {
  if (!instance) {
    instance = new MemoryRepository();
  }
  return instance;
}

export function resetMemoryRepository(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { MemoryRepository };
