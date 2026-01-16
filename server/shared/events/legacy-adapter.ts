/**
 * Legacy Event Adapter
 * Phase 1 Foundation: Bridge between existing content events and foundation event bus
 *
 * This adapter allows gradual migration without breaking existing subscribers.
 * When ENABLE_FOUNDATION_EVENT_BUS is true, content events are also emitted
 * through the foundation event bus.
 */

import { foundationEventBus } from './event-bus';
import type { DomainEvent } from './domain-event';

// Feature flag
const ENABLE_EVENT_BRIDGE = process.env.ENABLE_FOUNDATION_EVENT_BUS === 'true';

/**
 * Bridge content.published events to foundation event bus
 * Call this from the existing contentEvents.emitPublished()
 */
export function bridgeContentPublished(
  contentId: string,
  contentType: string,
  title: string,
  slug: string,
  previousStatus: string,
  source: 'manual' | 'scheduled' | 'auto-pilot',
  correlationId?: string
): void {
  if (!ENABLE_EVENT_BRIDGE) {
    return;
  }

  foundationEventBus.emitEvent(
    'content.published',
    {
      contentId,
      contentType,
      title,
      slug,
      previousStatus,
      publishedAt: new Date(),
      source,
    },
    {
      correlationId,
      source: 'content-domain',
      actor: { type: 'system' },
    }
  );
}

/**
 * Bridge content.updated events to foundation event bus
 */
export function bridgeContentUpdated(
  contentId: string,
  contentType: string,
  title: string,
  slug: string,
  status: string,
  changedFields?: string[],
  correlationId?: string
): void {
  if (!ENABLE_EVENT_BRIDGE) {
    return;
  }

  foundationEventBus.emitEvent(
    'content.updated',
    {
      contentId,
      contentType,
      title,
      slug,
      status,
      updatedAt: new Date(),
      changedFields,
    },
    {
      correlationId,
      source: 'content-domain',
      actor: { type: 'system' },
    }
  );
}

/**
 * Subscribe to foundation events and forward to legacy system
 * (reverse direction - for future use)
 */
export function createLegacyForwarder(
  legacyEmitter: { emit: (type: string, data: unknown) => void }
): void {
  if (!ENABLE_EVENT_BRIDGE) {
    return;
  }

  // This can be extended to forward foundation events to legacy systems
  // Currently a no-op placeholder for future migration needs
}
