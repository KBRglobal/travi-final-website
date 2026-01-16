/**
 * Incident Management System Tests
 *
 * FEATURE 1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getIncidentManager,
  resetIncidentManager,
  IncidentManager,
} from '../../../server/ops/incidents/incident-manager';

describe('IncidentManager', () => {
  let manager: IncidentManager;

  beforeEach(() => {
    process.env.ENABLE_INCIDENT_MANAGEMENT = 'true';
    resetIncidentManager();
    manager = getIncidentManager();
  });

  afterEach(() => {
    manager.clear();
    resetIncidentManager();
    delete process.env.ENABLE_INCIDENT_MANAGEMENT;
  });

  describe('createIncident', () => {
    it('should create an incident with all required fields', () => {
      const incident = manager.createIncident(
        'system_down',
        'critical',
        'health_aggregator',
        'Database connection lost',
        'Unable to connect to primary database'
      );

      expect(incident).not.toBeNull();
      expect(incident!.id).toMatch(/^inc-/);
      expect(incident!.type).toBe('system_down');
      expect(incident!.severity).toBe('critical');
      expect(incident!.status).toBe('open');
      expect(incident!.source).toBe('health_aggregator');
      expect(incident!.title).toBe('Database connection lost');
      expect(incident!.detectedAt).toBeInstanceOf(Date);
    });

    it('should deduplicate similar incidents within window', () => {
      const first = manager.createIncident(
        'ai_provider_failed',
        'high',
        'ai_failover',
        'Provider down',
        'Anthropic API failing',
        { provider: 'anthropic' }
      );

      const second = manager.createIncident(
        'ai_provider_failed',
        'high',
        'ai_failover',
        'Provider down',
        'Anthropic API failing',
        { provider: 'anthropic' }
      );

      expect(first!.id).toBe(second!.id);
    });

    it('should return null when feature is disabled', () => {
      delete process.env.ENABLE_INCIDENT_MANAGEMENT;
      resetIncidentManager();
      const disabledManager = getIncidentManager();

      const incident = disabledManager.createIncident(
        'system_down',
        'critical',
        'health_aggregator',
        'Test',
        'Test'
      );

      expect(incident).toBeNull();
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge an open incident', () => {
      const incident = manager.createIncident(
        'queue_stalled',
        'high',
        'backpressure',
        'Queue stalled',
        'Job queue not processing'
      );

      const success = manager.acknowledge(incident!.id, 'admin@test.com');

      expect(success).toBe(true);

      const updated = manager.getIncident(incident!.id);
      expect(updated!.status).toBe('acknowledged');
      expect(updated!.acknowledgedBy).toBe('admin@test.com');
      expect(updated!.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('should not acknowledge already acknowledged incident', () => {
      const incident = manager.createIncident(
        'queue_stalled',
        'high',
        'backpressure',
        'Queue stalled',
        'Test'
      );

      manager.acknowledge(incident!.id, 'admin1');
      const success = manager.acknowledge(incident!.id, 'admin2');

      expect(success).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should resolve an incident', () => {
      const incident = manager.createIncident(
        'budget_exceeded',
        'medium',
        'cost_guards',
        'Budget exceeded',
        'Daily limit reached'
      );

      const success = manager.resolve(incident!.id, 'admin', 'Budget reset');

      expect(success).toBe(true);

      const updated = manager.getIncident(incident!.id);
      expect(updated!.status).toBe('resolved');
      expect(updated!.resolvedBy).toBe('admin');
      expect(updated!.resolutionNotes).toBe('Budget reset');
      expect(updated!.resolvedAt).toBeInstanceOf(Date);
    });

    it('should mark auto-resolved incidents correctly', () => {
      const incident = manager.createIncident(
        'budget_exceeded',
        'medium',
        'cost_guards',
        'Budget exceeded',
        'Test'
      );

      manager.resolve(incident!.id, 'system', 'Auto-cleared', true);

      const updated = manager.getIncident(incident!.id);
      expect(updated!.autoResolved).toBe(true);
    });
  });

  describe('autoResolve', () => {
    it('should auto-resolve matching open incidents', () => {
      manager.createIncident(
        'ai_provider_failed',
        'high',
        'ai_failover',
        'Provider 1 down',
        'Test'
      );
      manager.createIncident(
        'ai_provider_failed',
        'high',
        'ai_failover',
        'Provider 2 down',
        'Test',
        { provider: 'different' }
      );
      manager.createIncident(
        'system_down',
        'critical',
        'health_aggregator',
        'Other incident',
        'Test'
      );

      const count = manager.autoResolve('ai_provider_failed', 'ai_failover', 'Providers recovered');

      expect(count).toBe(2);

      const remaining = manager.getOpenIncidents();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].type).toBe('system_down');
    });
  });

  describe('listIncidents', () => {
    beforeEach(() => {
      manager.createIncident('system_down', 'critical', 'health_aggregator', 'Test 1', 'Desc');
      manager.createIncident('queue_stalled', 'high', 'backpressure', 'Test 2', 'Desc');
      manager.createIncident('budget_exceeded', 'medium', 'cost_guards', 'Test 3', 'Desc');
    });

    it('should list all incidents', () => {
      const incidents = manager.listIncidents();
      expect(incidents).toHaveLength(3);
    });

    it('should filter by type', () => {
      const incidents = manager.listIncidents({ type: 'system_down' });
      expect(incidents).toHaveLength(1);
      expect(incidents[0].type).toBe('system_down');
    });

    it('should filter by severity', () => {
      const incidents = manager.listIncidents({ severity: 'critical' });
      expect(incidents).toHaveLength(1);
    });

    it('should apply limit', () => {
      const incidents = manager.listIncidents({ limit: 2 });
      expect(incidents).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('should calculate correct statistics', () => {
      const inc1 = manager.createIncident('system_down', 'critical', 'health_aggregator', 'Test 1', 'D');
      manager.createIncident('queue_stalled', 'high', 'backpressure', 'Test 2', 'D');
      manager.createIncident('budget_exceeded', 'medium', 'cost_guards', 'Test 3', 'D');

      manager.resolve(inc1!.id, 'admin', 'Fixed');

      const stats = manager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.open).toBe(2);
      expect(stats.byStatus.resolved).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.openCount).toBe(2);
    });
  });

  describe('hasActiveIncident', () => {
    it('should return true when active incident exists', () => {
      manager.createIncident('system_down', 'critical', 'health_aggregator', 'Test', 'D');

      expect(manager.hasActiveIncident('system_down')).toBe(true);
      expect(manager.hasActiveIncident('queue_stalled')).toBe(false);
    });

    it('should return false after incident is resolved', () => {
      const incident = manager.createIncident('system_down', 'critical', 'health_aggregator', 'Test', 'D');
      manager.resolve(incident!.id, 'admin');

      expect(manager.hasActiveIncident('system_down')).toBe(false);
    });
  });
});
