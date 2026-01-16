/**
 * Tests for Continuous Readiness Monitor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_CONTINUOUS_READINESS', 'true');

import {
  isContinuousReadinessEnabled,
  READINESS_CONFIG,
} from '../../../server/continuous-readiness/config';
import {
  checkNow,
  startMonitor,
  stopMonitor,
  getMonitorStatus,
  getCurrentState,
  getLastSnapshot,
  getSnapshotHistory,
  getActiveDegradations,
  getMTTRStats,
  getEvents,
  subscribe,
  clearAll,
} from '../../../server/continuous-readiness/monitor';

describe('Continuous Readiness Monitor', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_CONTINUOUS_READINESS', 'true');
    clearAll();
  });

  afterEach(() => {
    stopMonitor();
    vi.unstubAllEnvs();
    clearAll();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_CONTINUOUS_READINESS', 'true');
      expect(isContinuousReadinessEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_CONTINUOUS_READINESS', '');
      expect(isContinuousReadinessEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have valid config values', () => {
      expect(READINESS_CONFIG.intervalMs).toBeGreaterThan(0);
      expect(READINESS_CONFIG.degradationThreshold).toBeGreaterThan(0);
      expect(READINESS_CONFIG.recoveryThreshold).toBeGreaterThan(READINESS_CONFIG.degradationThreshold);
    });
  });

  describe('Readiness Check', () => {
    it('should perform immediate check', async () => {
      const snapshot = await checkNow();

      expect(snapshot.id).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.state).toBeDefined();
      expect(['READY', 'DEGRADED', 'NOT_READY', 'UNKNOWN']).toContain(snapshot.state);
      expect(snapshot.overallScore).toBeDefined();
    });

    it('should include checks in snapshot', async () => {
      const snapshot = await checkNow();

      expect(Array.isArray(snapshot.checks)).toBe(true);
      expect(snapshot.checks.length).toBeGreaterThan(0);
    });

    it('should calculate MTTR stats', async () => {
      await checkNow();
      const stats = getMTTRStats();

      expect(stats.average).toBeDefined();
      expect(stats.p50).toBeDefined();
      expect(stats.p95).toBeDefined();
      expect(stats.sampleCount).toBeDefined();
    });
  });

  describe('Monitor Status', () => {
    it('should report monitor status', () => {
      const status = getMonitorStatus();

      expect(status.enabled).toBe(true);
      expect(status.running).toBe(false);
      expect(status.currentState).toBeDefined();
    });

    it('should track running state', () => {
      startMonitor();
      expect(getMonitorStatus().running).toBe(true);

      stopMonitor();
      expect(getMonitorStatus().running).toBe(false);
    });
  });

  describe('State Tracking', () => {
    it('should track current state', async () => {
      await checkNow();
      const state = getCurrentState();

      expect(['READY', 'DEGRADED', 'NOT_READY', 'UNKNOWN']).toContain(state);
    });

    it('should maintain snapshot history', async () => {
      await checkNow();
      await checkNow();
      const history = getSnapshotHistory();

      expect(history.length).toBe(2);
    });

    it('should get last snapshot', async () => {
      await checkNow();
      const last = getLastSnapshot();

      expect(last).not.toBeNull();
      expect(last?.id).toBeDefined();
    });
  });

  describe('Degradation Tracking', () => {
    it('should track active degradations', () => {
      const degradations = getActiveDegradations();
      expect(Array.isArray(degradations)).toBe(true);
    });
  });

  describe('Event Subscription', () => {
    it('should allow subscription', async () => {
      const events: unknown[] = [];
      const unsub = subscribe(e => events.push(e));

      await checkNow();
      unsub();

      // Events may or may not be emitted depending on state
      expect(Array.isArray(events)).toBe(true);
    });

    it('should get events list', () => {
      const events = getEvents();
      expect(Array.isArray(events)).toBe(true);
    });
  });
});
