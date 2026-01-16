/**
 * Event Bus Tests
 * Phase 1 Foundation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to set env vars before importing the event bus
describe('Event Bus', () => {
  describe('with feature flag OFF (default)', () => {
    beforeEach(() => {
      vi.resetModules();
      delete process.env.ENABLE_FOUNDATION_EVENT_BUS;
      delete process.env.ENABLE_EVENT_STORE;
    });

    it('should report as disabled', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');
      expect(foundationEventBus.isEnabled()).toBe(false);
    });

    it('should return false when emitting events while disabled', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      const result = foundationEventBus.emitEvent(
        'test.event',
        { data: 'test' },
        { source: 'test' }
      );

      expect(result).toBe(false);
    });
  });

  describe('with feature flag ON', () => {
    beforeEach(() => {
      vi.resetModules();
      process.env.ENABLE_FOUNDATION_EVENT_BUS = 'true';
    });

    afterEach(() => {
      delete process.env.ENABLE_FOUNDATION_EVENT_BUS;
      delete process.env.ENABLE_EVENT_STORE;
    });

    it('should report as enabled', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');
      expect(foundationEventBus.isEnabled()).toBe(true);
    });

    it('should emit and receive events', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      const handler = vi.fn();
      foundationEventBus.subscribe('test.event', handler, 'test-handler');

      foundationEventBus.emitEvent(
        'test.event',
        { message: 'hello' },
        { source: 'test' }
      );

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].payload).toEqual({ message: 'hello' });
    });

    it('should include metadata in events', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      const handler = vi.fn();
      foundationEventBus.subscribe('test.metadata', handler, 'metadata-handler');

      foundationEventBus.emitEvent(
        'test.metadata',
        { data: 'test' },
        {
          source: 'test-source',
          correlationId: 'cid_12345',
          actor: { type: 'user', id: 'user-123' },
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const event = handler.mock.calls[0][0];
      expect(event.metadata.source).toBe('test-source');
      expect(event.metadata.correlationId).toBe('cid_12345');
      expect(event.metadata.actor).toEqual({ type: 'user', id: 'user-123' });
      expect(event.metadata.timestamp).toBeInstanceOf(Date);
    });

    it('should track stats correctly', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      foundationEventBus.subscribe('stats.event', vi.fn(), 'stats-handler');
      foundationEventBus.emitEvent('stats.event', {}, { source: 'test' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = foundationEventBus.getStats();
      expect(stats.enabled).toBe(true);
      expect(stats.subscriptions['stats.event']).toBe(1);
    });
  });

  describe('kill switch', () => {
    beforeEach(() => {
      vi.resetModules();
      process.env.ENABLE_FOUNDATION_EVENT_BUS = 'true';
    });

    afterEach(() => {
      delete process.env.ENABLE_FOUNDATION_EVENT_BUS;
      delete process.env.KILL_EVENT_KILLED_EVENT;
    });

    it('should block events when kill switch is active', async () => {
      process.env.KILL_EVENT_KILLED_EVENT = 'true';

      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      const handler = vi.fn();
      foundationEventBus.subscribe('killed.event', handler, 'killed-handler');

      const result = foundationEventBus.emitEvent(
        'killed.event',
        { data: 'test' },
        { source: 'test' }
      );

      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should report kill switch status', async () => {
      process.env.KILL_EVENT_SOME_EVENT = 'true';

      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      expect(foundationEventBus.isKilled('some.event')).toBe(true);
      expect(foundationEventBus.isKilled('other.event')).toBe(false);
    });
  });

  describe('event store', () => {
    beforeEach(() => {
      vi.resetModules();
      process.env.ENABLE_FOUNDATION_EVENT_BUS = 'true';
      process.env.ENABLE_EVENT_STORE = 'true';
      process.env.EVENT_STORE_MAX_SIZE = '10';
    });

    afterEach(() => {
      delete process.env.ENABLE_FOUNDATION_EVENT_BUS;
      delete process.env.ENABLE_EVENT_STORE;
      delete process.env.EVENT_STORE_MAX_SIZE;
    });

    it('should store events when enabled', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      foundationEventBus.emitEvent('stored.event', { num: 1 }, { source: 'test' });
      foundationEventBus.emitEvent('stored.event', { num: 2 }, { source: 'test' });

      const events = foundationEventBus.getRecentEvents(10);
      expect(events.length).toBe(2);
    });

    it('should respect max size (ring buffer)', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      // Emit 15 events (max is 10)
      for (let i = 0; i < 15; i++) {
        foundationEventBus.emitEvent('ring.event', { num: i }, { source: 'test' });
      }

      const stats = foundationEventBus.getStats();
      expect(stats.eventStoreSize).toBeLessThanOrEqual(10);
    });

    it('should filter events by type', async () => {
      const { foundationEventBus } = await import('../../../server/shared/events/event-bus');

      foundationEventBus.emitEvent('type.a', { data: 'a' }, { source: 'test' });
      foundationEventBus.emitEvent('type.b', { data: 'b' }, { source: 'test' });
      foundationEventBus.emitEvent('type.a', { data: 'a2' }, { source: 'test' });

      const typeAEvents = foundationEventBus.getEventsByType('type.a');
      expect(typeAEvents.length).toBe(2);
      expect(typeAEvents.every((e) => e.type === 'type.a')).toBe(true);
    });
  });
});

describe('Domain Event Creation', () => {
  it('should create event with correct structure', async () => {
    const { createDomainEvent } = await import('../../../server/shared/events/domain-event');

    const event = createDomainEvent(
      'content.published',
      { contentId: '123' },
      {
        source: 'content-service',
        correlationId: 'cid_abc',
        version: 2,
      }
    );

    expect(event.type).toBe('content.published');
    expect(event.payload).toEqual({ contentId: '123' });
    expect(event.metadata.source).toBe('content-service');
    expect(event.metadata.correlationId).toBe('cid_abc');
    expect(event.metadata.version).toBe(2);
    expect(event.metadata.timestamp).toBeInstanceOf(Date);
  });
});
