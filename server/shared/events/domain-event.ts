/**
 * Domain Event Types
 * Phase 1 Foundation: Typed event system for all domains
 */

/**
 * Metadata attached to every domain event
 */
export interface EventMetadata {
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** User/system that triggered the event */
  actor?: {
    type: 'user' | 'system' | 'scheduler';
    id?: string;
  };
  /** When the event was created */
  timestamp: Date;
  /** Source domain/module */
  source: string;
  /** Event version for schema evolution */
  version?: number;
}

/**
 * Base domain event interface
 */
export interface DomainEvent<T = unknown> {
  /** Event type identifier (e.g., 'content.published') */
  type: string;
  /** Event payload */
  payload: T;
  /** Event metadata */
  metadata: EventMetadata;
}

/**
 * Create a domain event with standardized metadata
 */
export function createDomainEvent<T>(
  type: string,
  payload: T,
  options: {
    correlationId?: string;
    actor?: EventMetadata['actor'];
    source: string;
    version?: number;
  }
): DomainEvent<T> {
  return {
    type,
    payload,
    metadata: {
      correlationId: options.correlationId,
      actor: options.actor,
      timestamp: new Date(),
      source: options.source,
      version: options.version ?? 1,
    },
  };
}

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

/**
 * Subscription info for tracking
 */
export interface Subscription {
  id: string;
  eventType: string;
  handlerName: string;
  subscribedAt: Date;
}
