/**
 * Tests for Audit Log v2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_AUDIT_V2', 'true');

import { isAuditV2Enabled } from '../../../server/audit-v2/config';
import {
  auditLog,
  redactPayload,
  clearAuditEvents,
  auditContentAction,
  auditEntityAction,
  auditIncidentAction,
} from '../../../server/audit-v2/emitter';
import { queryAuditEvents, getAuditSummary } from '../../../server/audit-v2/repository';

describe('Audit Log v2', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_AUDIT_V2', 'true');
    clearAuditEvents();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearAuditEvents();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_AUDIT_V2', 'true');
      expect(isAuditV2Enabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_AUDIT_V2', '');
      expect(isAuditV2Enabled()).toBe(false);
    });
  });

  describe('Redaction', () => {
    it('should redact sensitive fields', () => {
      const payload = {
        name: 'Test User',
        password: 'secret123',
        token: 'abc123',
        email: 'test@example.com',
      };

      const redacted = redactPayload(payload);
      expect(redacted.name).toBe('Test User');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.email).toBe('test@example.com');
    });

    it('should redact nested fields', () => {
      const payload = {
        user: {
          name: 'Test',
          apiKey: 'key123',
        },
      };

      const redacted = redactPayload(payload);
      expect((redacted.user as any).name).toBe('Test');
      expect((redacted.user as any).apiKey).toBe('[REDACTED]');
    });

    it('should handle empty payload', () => {
      const redacted = redactPayload({});
      expect(redacted).toEqual({});
    });
  });

  describe('Event Logging', () => {
    it('should log audit event', () => {
      const event = auditLog(
        'content.publish',
        'user-123',
        'content',
        'content-456',
        { title: 'Test Content' }
      );

      expect(event).not.toBeNull();
      expect(event?.id).toBeDefined();
      expect(event?.type).toBe('content.publish');
      expect(event?.actorId).toBe('user-123');
      expect(event?.resourceType).toBe('content');
      expect(event?.resourceId).toBe('content-456');
    });

    it('should not log when disabled', () => {
      vi.stubEnv('ENABLE_AUDIT_V2', 'false');
      const event = auditLog(
        'content.publish',
        'user-123',
        'content',
        'content-456'
      );
      expect(event).toBeNull();
    });

    it('should log content action', () => {
      const event = auditContentAction('publish', 'user-1', 'content-1', {
        title: 'Article',
      });
      expect(event?.type).toBe('content.publish');
      expect(event?.resourceType).toBe('content');
    });

    it('should log entity action', () => {
      const event = auditEntityAction('merge', 'user-1', 'entity-1', {
        mergedFrom: ['e2', 'e3'],
      });
      expect(event?.type).toBe('entity.merge');
      expect(event?.resourceType).toBe('entity');
    });

    it('should log incident action', () => {
      const event = auditIncidentAction('ack', 'user-1', 'inc-1');
      expect(event?.type).toBe('incident.ack');
      expect(event?.resourceType).toBe('incident');
    });
  });

  describe('Query', () => {
    beforeEach(() => {
      auditLog('content.publish', 'user-1', 'content', 'c-1');
      auditLog('content.unpublish', 'user-2', 'content', 'c-2');
      auditLog('entity.merge', 'user-1', 'entity', 'e-1');
    });

    it('should query all events', () => {
      const events = queryAuditEvents();
      expect(events.length).toBe(3);
    });

    it('should filter by resource type', () => {
      const events = queryAuditEvents({ resourceType: 'content' });
      expect(events.length).toBe(2);
    });

    it('should filter by event type', () => {
      const events = queryAuditEvents({ type: 'entity.merge' });
      expect(events.length).toBe(1);
    });

    it('should filter by actor', () => {
      const events = queryAuditEvents({ actorId: 'user-1' });
      expect(events.length).toBe(2);
    });

    it('should support pagination', () => {
      const events = queryAuditEvents({ limit: 2 });
      expect(events.length).toBe(2);

      const page2 = queryAuditEvents({ limit: 2, offset: 2 });
      expect(page2.length).toBe(1);
    });
  });

  describe('Summary', () => {
    it('should calculate summary', () => {
      auditLog('content.publish', 'user-1', 'content', 'c-1');
      auditLog('content.publish', 'user-2', 'content', 'c-2');
      auditLog('entity.merge', 'user-1', 'entity', 'e-1');

      const summary = getAuditSummary();
      expect(summary.totalEvents).toBe(3);
      expect(summary.eventsByType['content.publish']).toBe(2);
      expect(summary.eventsByResourceType['content']).toBe(2);
      expect(summary.uniqueActors).toBe(2);
    });
  });
});
