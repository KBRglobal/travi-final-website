/**
 * Foundation Events Module
 * Phase 1 Foundation: Export all event system components
 */

export {
  createDomainEvent,
  type DomainEvent,
  type EventHandler,
  type EventMetadata,
  type Subscription,
} from './domain-event';

export {
  foundationEventBus,
  emitDomainEvent,
  onDomainEvent,
} from './event-bus';

export {
  bridgeContentPublished,
  bridgeContentUpdated,
  createLegacyForwarder,
} from './legacy-adapter';
