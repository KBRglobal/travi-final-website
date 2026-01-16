/**
 * Tests for Go-Live Timeline & Forensics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_GO_LIVE_FORENSICS', 'true');

import {
  isGoLiveForensicsEnabled,
  FORENSICS_CONFIG,
} from '../../../server/go-live-forensics/config';
import {
  recordEvent,
  recordDecision,
  recordApproval,
  recordOverride,
  recordIncident,
  recordDeployment,
  recordRollback,
  queryTimeline,
  getEventById,
  getEventsByCorrelation,
  getRecentEvents,
  getSummary,
  getStatus,
  exportEvents,
  clearAll,
} from '../../../server/go-live-forensics/timeline';

describe('Go-Live Timeline & Forensics', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_GO_LIVE_FORENSICS', 'true');
    clearAll();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearAll();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_GO_LIVE_FORENSICS', 'true');
      expect(isGoLiveForensicsEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_GO_LIVE_FORENSICS', '');
      expect(isGoLiveForensicsEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have valid config values', () => {
      expect(FORENSICS_CONFIG.maxEvents).toBeGreaterThan(0);
      expect(FORENSICS_CONFIG.retentionDays).toBeGreaterThan(0);
      expect(FORENSICS_CONFIG.queryDefaultLimit).toBeGreaterThan(0);
    });
  });

  describe('Event Recording', () => {
    it('should record generic event', () => {
      const event = recordEvent(
        'manual',
        'info',
        'test',
        'Test Event',
        'Test description',
        { key: 'value' }
      );

      expect(event.id).toBeDefined();
      expect(event.type).toBe('manual');
      expect(event.severity).toBe('info');
      expect(event.immutable).toBe(true);
      expect(event.signature).toBeDefined();
    });

    it('should record decision', () => {
      const event = recordDecision('CAN_GO_LIVE', 'cutover', { score: 85 }, 'admin');

      expect(event.type).toBe('decision');
      expect(event.actor).toBe('admin');
    });

    it('should record approval', () => {
      const event = recordApproval('admin@test.com', 'Approved for go-live', { approvalId: '123' });

      expect(event.type).toBe('approval');
      expect(event.actor).toBe('admin@test.com');
    });

    it('should record override', () => {
      const event = recordOverride('ops@test.com', 'BLOCK', 'CAN_GO_LIVE', 'Emergency override');

      expect(event.type).toBe('override');
      expect(event.severity).toBe('warning');
    });

    it('should record incident', () => {
      const event = recordIncident('INC-001', 'critical', 'Database Down', 'Primary DB unreachable');

      expect(event.type).toBe('incident');
      expect(event.severity).toBe('critical');
      expect(event.correlationId).toBe('INC-001');
    });

    it('should record deployment', () => {
      const event = recordDeployment('v1.2.3', 'production', 'deploy-bot');

      expect(event.type).toBe('deployment');
      expect(event.data.version).toBe('v1.2.3');
    });

    it('should record rollback', () => {
      const event = recordRollback('v1.2.3', 'v1.2.2', 'Critical bug found', 'ops@test.com');

      expect(event.type).toBe('rollback');
      expect(event.severity).toBe('error');
    });
  });

  describe('Event Immutability', () => {
    it('should generate signature for events', () => {
      const event = recordEvent('manual', 'info', 'test', 'Test', 'Description');

      expect(event.signature).toBeDefined();
      expect(event.signature.length).toBe(8);
    });
  });

  describe('Timeline Query', () => {
    it('should query all events', () => {
      recordEvent('manual', 'info', 'test', 'Event 1', 'Desc 1');
      recordEvent('manual', 'warning', 'test', 'Event 2', 'Desc 2');

      const result = queryTimeline();

      expect(result.events.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should filter by type', () => {
      recordEvent('decision', 'info', 'test', 'Decision', 'Desc');
      recordEvent('manual', 'info', 'test', 'Manual', 'Desc');

      const result = queryTimeline({ types: ['decision'] });

      expect(result.events.length).toBe(1);
      expect(result.events[0].type).toBe('decision');
    });

    it('should filter by severity', () => {
      recordEvent('manual', 'info', 'test', 'Info', 'Desc');
      recordEvent('manual', 'error', 'test', 'Error', 'Desc');

      const result = queryTimeline({ severities: ['error'] });

      expect(result.events.length).toBe(1);
      expect(result.events[0].severity).toBe('error');
    });

    it('should filter by time range', () => {
      recordEvent('manual', 'info', 'test', 'Event', 'Desc');

      const result = queryTimeline({
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(Date.now() + 60000),
      });

      expect(result.events.length).toBe(1);
    });

    it('should support pagination', () => {
      for (let i = 0; i < 5; i++) {
        recordEvent('manual', 'info', 'test', `Event ${i}`, 'Desc');
      }

      const result = queryTimeline({ limit: 2, offset: 1 });

      expect(result.events.length).toBe(2);
      expect(result.total).toBe(5);
    });
  });

  describe('Event Lookup', () => {
    it('should get event by id', () => {
      const created = recordEvent('manual', 'info', 'test', 'Event', 'Desc');
      const found = getEventById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should get events by correlation', () => {
      recordEvent('incident', 'error', 'test', 'Incident', 'Desc', {}, { correlationId: 'INC-001' });
      recordEvent('manual', 'info', 'test', 'Update', 'Desc', {}, { correlationId: 'INC-001' });

      const events = getEventsByCorrelation('INC-001');

      expect(events.length).toBe(2);
    });

    it('should get recent events', () => {
      for (let i = 0; i < 5; i++) {
        recordEvent('manual', 'info', 'test', `Event ${i}`, 'Desc');
      }

      const recent = getRecentEvents(3);

      expect(recent.length).toBe(3);
    });
  });

  describe('Summary & Statistics', () => {
    it('should generate summary', () => {
      recordEvent('decision', 'info', 'cutover', 'Decision', 'Desc');
      recordEvent('manual', 'error', 'test', 'Error', 'Desc');

      const summary = getSummary();

      expect(summary.totalEvents).toBe(2);
      expect(summary.byType.decision).toBe(1);
      expect(summary.byType.manual).toBe(1);
      expect(summary.bySeverity.info).toBe(1);
      expect(summary.bySeverity.error).toBe(1);
    });

    it('should report status', () => {
      recordEvent('manual', 'info', 'test', 'Event', 'Desc');

      const status = getStatus();

      expect(status.enabled).toBe(true);
      expect(status.totalEvents).toBe(1);
    });
  });

  describe('Export', () => {
    it('should export all events', () => {
      recordEvent('manual', 'info', 'test', 'Event 1', 'Desc');
      recordEvent('manual', 'info', 'test', 'Event 2', 'Desc');

      const exported = exportEvents();

      expect(exported.length).toBe(2);
    });
  });
});
