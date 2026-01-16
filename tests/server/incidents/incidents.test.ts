/**
 * Tests for SLA/Incidents + Alerting System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_INCIDENTS', 'true');

import {
  isIncidentsEnabled,
  INCIDENTS_CONFIG,
} from '../../../server/incidents/config';
import {
  createIncident,
  getIncidentById,
  getIncidents,
  acknowledgeIncident,
  resolveIncident,
  findOpenIncidentBySource,
  getIncidentSummary,
  getOpenCriticalCount,
  clearAllIncidents,
} from '../../../server/incidents/repository';
import {
  updateJobQueueTick,
  setEventBusInitialized,
  runAllDetectors,
  getDetectedIssues,
} from '../../../server/incidents/detector';
import type { IncidentCreateInput } from '../../../server/incidents/types';

describe('Incidents System', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_INCIDENTS', 'true');
    clearAllIncidents();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearAllIncidents();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_INCIDENTS', 'true');
      expect(isIncidentsEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_INCIDENTS', '');
      expect(isIncidentsEnabled()).toBe(false);
    });
  });

  describe('Repository', () => {
    it('should create an incident', () => {
      const input: IncidentCreateInput = {
        source: 'manual',
        severity: 'warn',
        title: 'Test Incident',
        description: 'Testing incident creation',
      };

      const incident = createIncident(input);
      expect(incident.id).toBeDefined();
      expect(incident.status).toBe('open');
      expect(incident.severity).toBe('warn');
      expect(incident.createdAt).toBeInstanceOf(Date);
    });

    it('should get incident by id', () => {
      const incident = createIncident({
        source: 'db_slow',
        severity: 'critical',
        title: 'DB Slow',
        description: 'Database is slow',
      });

      const found = getIncidentById(incident.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(incident.id);
    });

    it('should list incidents with filters', () => {
      createIncident({
        source: 'db_slow',
        severity: 'critical',
        title: 'Critical Issue',
        description: 'Critical',
      });
      createIncident({
        source: 'manual',
        severity: 'warn',
        title: 'Warning Issue',
        description: 'Warning',
      });

      const all = getIncidents();
      expect(all.length).toBe(2);

      const critical = getIncidents({ severity: 'critical' });
      expect(critical.length).toBe(1);

      const manual = getIncidents({ source: 'manual' });
      expect(manual.length).toBe(1);
    });

    it('should acknowledge incident', () => {
      const incident = createIncident({
        source: 'manual',
        severity: 'warn',
        title: 'Test',
        description: 'Test',
      });

      const acked = acknowledgeIncident(incident.id, 'admin-user');
      expect(acked?.status).toBe('acknowledged');
      expect(acked?.acknowledgedBy).toBe('admin-user');
      expect(acked?.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('should resolve incident', () => {
      const incident = createIncident({
        source: 'manual',
        severity: 'warn',
        title: 'Test',
        description: 'Test',
      });

      const resolved = resolveIncident(incident.id, 'admin-user', 'Fixed the issue');
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedBy).toBe('admin-user');
      expect(resolved?.resolutionNotes).toBe('Fixed the issue');
    });

    it('should find open incident by source', () => {
      createIncident({
        source: 'db_slow',
        severity: 'critical',
        title: 'DB Slow',
        description: 'Slow',
      });

      const found = findOpenIncidentBySource('db_slow');
      expect(found).not.toBeNull();
      expect(found?.source).toBe('db_slow');

      const notFound = findOpenIncidentBySource('manual');
      expect(notFound).toBeNull();
    });

    it('should calculate incident summary', () => {
      createIncident({
        source: 'db_slow',
        severity: 'critical',
        title: 'Critical',
        description: 'Critical',
      });
      const warn = createIncident({
        source: 'manual',
        severity: 'warn',
        title: 'Warning',
        description: 'Warning',
      });
      acknowledgeIncident(warn.id, 'admin');

      const summary = getIncidentSummary();
      expect(summary.total).toBe(2);
      expect(summary.open).toBe(1);
      expect(summary.acknowledged).toBe(1);
      expect(summary.bySeverity.critical).toBe(1);
      expect(summary.bySeverity.warn).toBe(1);
    });

    it('should count open critical incidents', () => {
      createIncident({
        source: 'db_slow',
        severity: 'critical',
        title: 'Critical',
        description: 'Critical',
      });
      createIncident({
        source: 'manual',
        severity: 'warn',
        title: 'Warning',
        description: 'Warning',
      });

      expect(getOpenCriticalCount()).toBe(1);
    });
  });

  describe('Detector', () => {
    it('should run all detectors', () => {
      const results = runAllDetectors();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should detect event bus not initialized', () => {
      setEventBusInitialized(false);
      const issues = getDetectedIssues();
      const eventBusIssue = issues.find(i => i.source === 'event_bus_not_initialized');
      expect(eventBusIssue).toBeDefined();
      expect(eventBusIssue?.severity).toBe('critical');
    });

    it('should not detect issue when event bus is initialized', () => {
      setEventBusInitialized(true);
      const issues = getDetectedIssues();
      const eventBusIssue = issues.find(i => i.source === 'event_bus_not_initialized');
      expect(eventBusIssue).toBeUndefined();
    });

    it('should update job queue tick', () => {
      updateJobQueueTick();
      const issues = getDetectedIssues();
      const jobQueueIssue = issues.find(i => i.source === 'job_queue_stalled');
      expect(jobQueueIssue).toBeUndefined();
    });
  });

  describe('Bounded Storage', () => {
    it('should enforce max incidents limit', () => {
      const maxSize = INCIDENTS_CONFIG.maxIncidentsStored;

      // Create more incidents than max
      for (let i = 0; i < maxSize + 10; i++) {
        createIncident({
          source: 'manual',
          severity: 'info',
          title: `Incident ${i}`,
          description: `Description ${i}`,
        });
      }

      const all = getIncidents({ limit: maxSize + 100 });
      expect(all.length).toBeLessThanOrEqual(maxSize);
    });
  });
});
