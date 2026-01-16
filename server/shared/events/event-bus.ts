/**
 * Enhanced Event Bus
 * Phase 1 Foundation: Domain event bus with kill switches and optional event store
 *
 * Features:
 * - Typed event emission and subscription
 * - Kill switch per event type (env KILL_EVENT_{TYPE}=true)
 * - Optional in-memory event store (ring buffer)
 * - Statistics and debugging
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../lib/logger';
import type { DomainEvent, EventHandler, Subscription, EventMetadata } from './domain-event';
import { createDomainEvent } from './domain-event';

const logger = createLogger('event-bus');

// Feature flags
const ENABLE_EVENT_BUS = process.env.ENABLE_FOUNDATION_EVENT_BUS === 'true';
const ENABLE_EVENT_STORE = process.env.ENABLE_EVENT_STORE === 'true';
const EVENT_STORE_MAX_SIZE = parseInt(process.env.EVENT_STORE_MAX_SIZE || '5000', 10);

/**
 * Check if an event type is killed (disabled)
 */
function isEventKilled(eventType: string): boolean {
  const envKey = `KILL_EVENT_${eventType.toUpperCase().replace(/\./g, '_')}`;
  return process.env[envKey] === 'true';
}

/**
 * Ring buffer for event store (bounded, FIFO)
 */
class EventStore {
  private buffer: DomainEvent[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(event: DomainEvent): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift(); // Remove oldest
    }
    this.buffer.push(event);
  }

  getAll(): DomainEvent[] {
    return [...this.buffer];
  }

  getByType(type: string): DomainEvent[] {
    return this.buffer.filter(e => e.type === type);
  }

  getRecent(count: number): DomainEvent[] {
    return this.buffer.slice(-count);
  }

  size(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}

/**
 * Event statistics
 */
interface EventStats {
  emitted: number;
  handled: number;
  failed: number;
  killed: number;
  lastEmittedAt: Date | null;
}

/**
 * Foundation Event Bus
 */
class FoundationEventBus extends EventEmitter {
  private static instance: FoundationEventBus;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private stats: Map<string, EventStats> = new Map();
  private eventStore: EventStore | null = null;
  private subscriptionIdCounter = 0;

  private constructor() {
    super();
    this.setMaxListeners(50);

    if (ENABLE_EVENT_STORE) {
      this.eventStore = new EventStore(EVENT_STORE_MAX_SIZE);
      logger.info({ maxSize: EVENT_STORE_MAX_SIZE }, 'Event store initialized');
    }
  }

  static getInstance(): FoundationEventBus {
    if (!FoundationEventBus.instance) {
      FoundationEventBus.instance = new FoundationEventBus();
    }
    return FoundationEventBus.instance;
  }

  /**
   * Emit a domain event
   */
  emitEvent<T>(
    type: string,
    payload: T,
    options: {
      correlationId?: string;
      actor?: EventMetadata['actor'];
      source: string;
    }
  ): boolean {
    // Feature flag check
    if (!ENABLE_EVENT_BUS) {
      return false;
    }

    // Kill switch check
    if (isEventKilled(type)) {
      this.incrementStat(type, 'killed');
      logger.warn({ eventType: type }, 'Event killed by kill switch');
      return false;
    }

    const event = createDomainEvent(type, payload, options);

    // Store event if event store is enabled
    if (this.eventStore) {
      this.eventStore.push(event);
    }

    // Update stats
    this.incrementStat(type, 'emitted');
    this.updateLastEmitted(type);

    // Log emission
    logger.debug(
      {
        eventType: type,
        correlationId: options.correlationId,
        source: options.source,
        subscriberCount: this.listenerCount(type),
      },
      'Emitting domain event'
    );

    // Emit the event
    this.emit(type, event);

    return true;
  }

  /**
   * Subscribe to an event type
   */
  subscribe<T>(
    eventType: string,
    handler: EventHandler<T>,
    handlerName: string
  ): string {
    const subscriptionId = `sub_${++this.subscriptionIdCounter}`;

    // Wrap handler with error handling
    const wrappedHandler = async (event: DomainEvent<T>) => {
      try {
        await handler(event);
        this.incrementStat(eventType, 'handled');
        logger.debug(
          {
            eventType,
            handlerName,
            correlationId: event.metadata.correlationId,
          },
          'Event handled successfully'
        );
      } catch (error) {
        this.incrementStat(eventType, 'failed');
        logger.error(
          {
            eventType,
            handlerName,
            correlationId: event.metadata.correlationId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Event handler failed'
        );
      }
    };

    this.on(eventType, wrappedHandler);

    // Track subscription
    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      handlerName,
      subscribedAt: new Date(),
    };

    const subs = this.subscriptions.get(eventType) || [];
    subs.push(subscription);
    this.subscriptions.set(eventType, subs);

    // Initialize stats for this event type if not present
    if (!this.stats.has(eventType)) {
      this.stats.set(eventType, {
        emitted: 0,
        handled: 0,
        failed: 0,
        killed: 0,
        lastEmittedAt: null,
      });
    }

    logger.info(
      {
        eventType,
        handlerName,
        subscriptionId,
        totalSubscribers: subs.length,
      },
      'Subscribed to event'
    );

    return subscriptionId;
  }

  /**
   * Get event bus statistics
   */
  getStats(): {
    enabled: boolean;
    eventStoreEnabled: boolean;
    eventStoreSize: number;
    events: Record<string, EventStats>;
    subscriptions: Record<string, number>;
  } {
    const events: Record<string, EventStats> = {};
    this.stats.forEach((stats, type) => {
      events[type] = { ...stats };
    });

    const subscriptions: Record<string, number> = {};
    this.subscriptions.forEach((subs, type) => {
      subscriptions[type] = subs.length;
    });

    return {
      enabled: ENABLE_EVENT_BUS,
      eventStoreEnabled: ENABLE_EVENT_STORE,
      eventStoreSize: this.eventStore?.size() ?? 0,
      events,
      subscriptions,
    };
  }

  /**
   * Get recent events from store (for debugging)
   */
  getRecentEvents(count: number = 100): DomainEvent[] {
    return this.eventStore?.getRecent(count) ?? [];
  }

  /**
   * Get events by type from store
   */
  getEventsByType(type: string): DomainEvent[] {
    return this.eventStore?.getByType(type) ?? [];
  }

  /**
   * Check if event bus is enabled
   */
  isEnabled(): boolean {
    return ENABLE_EVENT_BUS;
  }

  /**
   * Check if a specific event type is killed
   */
  isKilled(eventType: string): boolean {
    return isEventKilled(eventType);
  }

  private incrementStat(eventType: string, field: keyof Omit<EventStats, 'lastEmittedAt'>): void {
    const stats = this.stats.get(eventType) || {
      emitted: 0,
      handled: 0,
      failed: 0,
      killed: 0,
      lastEmittedAt: null,
    };
    stats[field]++;
    this.stats.set(eventType, stats);
  }

  private updateLastEmitted(eventType: string): void {
    const stats = this.stats.get(eventType);
    if (stats) {
      stats.lastEmittedAt = new Date();
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export const foundationEventBus = FoundationEventBus.getInstance();

/**
 * Helper to emit events with less boilerplate
 */
export function emitDomainEvent<T>(
  type: string,
  payload: T,
  source: string,
  correlationId?: string
): boolean {
  return foundationEventBus.emitEvent(type, payload, {
    correlationId,
    source,
    actor: { type: 'system' },
  });
}

/**
 * Helper to subscribe to events
 */
export function onDomainEvent<T>(
  type: string,
  handler: EventHandler<T>,
  handlerName: string
): string {
  return foundationEventBus.subscribe(type, handler, handlerName);
}
