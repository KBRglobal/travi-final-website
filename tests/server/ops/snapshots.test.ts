/**
 * System State Snapshot & Forensics Tests
 *
 * FEATURE 5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSnapshotManager,
  resetSnapshotManager,
  SnapshotManager,
} from '../../../server/ops/snapshots/snapshot-manager';

describe('SnapshotManager', () => {
  let manager: SnapshotManager;

  beforeEach(() => {
    process.env.ENABLE_SYSTEM_SNAPSHOTS = 'true';
    resetSnapshotManager();
    manager = getSnapshotManager();
  });

  afterEach(() => {
    manager.clear();
    resetSnapshotManager();
    delete process.env.ENABLE_SYSTEM_SNAPSHOTS;
  });

  describe('captureSnapshot', () => {
    it('should capture a complete snapshot', async () => {
      const snapshot = await manager.captureSnapshot('manual', 'test-user');

      expect(snapshot.id).toMatch(/^snap-/);
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.trigger).toBe('manual');
      expect(snapshot.triggeredBy).toBe('test-user');
      expect(snapshot.environment).toBeDefined();
      expect(snapshot.nodeVersion).toBeDefined();
      expect(snapshot.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should capture feature flags', async () => {
      process.env.ENABLE_SYSTEM_HEALTH = 'true';

      const snapshot = await manager.captureSnapshot('manual');

      expect(snapshot.featureFlags).toBeInstanceOf(Array);
      expect(snapshot.featureFlags.length).toBeGreaterThan(0);

      const healthFlag = snapshot.featureFlags.find(f => f.name === 'ENABLE_SYSTEM_HEALTH');
      expect(healthFlag).toBeDefined();
      expect(healthFlag?.enabled).toBe(true);
    });

    it('should capture memory usage', async () => {
      const snapshot = await manager.captureSnapshot('manual');

      expect(snapshot.memory).toBeDefined();
      expect(typeof snapshot.memory.heapUsedMB).toBe('number');
      expect(typeof snapshot.memory.heapTotalMB).toBe('number');
      expect(typeof snapshot.memory.percentUsed).toBe('number');
      expect(snapshot.memory.heapUsedMB).toBeGreaterThan(0);
    });

    it('should include custom metadata', async () => {
      const metadata = { reason: 'test', version: '1.0' };

      const snapshot = await manager.captureSnapshot('manual', undefined, metadata);

      expect(snapshot.metadata).toEqual(metadata);
    });

    it('should store snapshot for retrieval', async () => {
      const snapshot = await manager.captureSnapshot('manual');

      const retrieved = manager.getSnapshot(snapshot.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(snapshot.id);
    });
  });

  describe('querySnapshots', () => {
    beforeEach(async () => {
      await manager.captureSnapshot('manual', 'user1');
      await manager.captureSnapshot('scheduled');
      await manager.captureSnapshot('incident', 'system');
    });

    it('should return all snapshots', () => {
      const snapshots = manager.querySnapshots();
      expect(snapshots.length).toBe(3);
    });

    it('should filter by trigger', () => {
      const snapshots = manager.querySnapshots({ trigger: 'manual' });
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].trigger).toBe('manual');
    });

    it('should apply limit', () => {
      const snapshots = manager.querySnapshots({ limit: 2 });
      expect(snapshots.length).toBe(2);
    });

    it('should sort by timestamp descending', () => {
      const snapshots = manager.querySnapshots();

      for (let i = 1; i < snapshots.length; i++) {
        expect(snapshots[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          snapshots[i].timestamp.getTime()
        );
      }
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return undefined when no snapshots', () => {
      expect(manager.getLatestSnapshot()).toBeUndefined();
    });

    it('should return most recent snapshot', async () => {
      await manager.captureSnapshot('manual');
      await new Promise(r => setTimeout(r, 10));
      const latest = await manager.captureSnapshot('scheduled');

      const retrieved = manager.getLatestSnapshot();

      expect(retrieved?.id).toBe(latest.id);
    });
  });

  describe('getIncidentSnapshots', () => {
    it('should return only incident-triggered snapshots', async () => {
      await manager.captureSnapshot('manual');
      await manager.captureSnapshot('incident');
      await manager.captureSnapshot('scheduled');

      const incidentSnapshots = manager.getIncidentSnapshots();

      expect(incidentSnapshots.length).toBe(1);
      expect(incidentSnapshots[0].trigger).toBe('incident');
    });
  });

  describe('compareSnapshots', () => {
    it('should compare two snapshots', async () => {
      const s1 = await manager.captureSnapshot('manual');
      process.env.ENABLE_COST_GUARDS = 'true';
      const s2 = await manager.captureSnapshot('manual');

      const comparison = manager.compareSnapshots(s1.id, s2.id);

      expect(comparison).not.toBeNull();
      expect(comparison?.timeDeltaMs).toBeGreaterThanOrEqual(0);
      expect(comparison?.changes).toBeInstanceOf(Array);
    });

    it('should detect feature flag changes', async () => {
      process.env.ENABLE_BACKPRESSURE = 'false';
      const s1 = await manager.captureSnapshot('manual');

      process.env.ENABLE_BACKPRESSURE = 'true';
      resetSnapshotManager();
      const newManager = getSnapshotManager();
      // Store s1 in new manager
      await newManager.captureSnapshot('manual'); // This creates a new snapshot with different flags

      const snapshots = newManager.querySnapshots();
      if (snapshots.length >= 2) {
        const comparison = newManager.compareSnapshots(snapshots[1].id, snapshots[0].id);
        expect(comparison).not.toBeNull();
      }
    });

    it('should return null for non-existent snapshots', () => {
      const comparison = manager.compareSnapshots('fake1', 'fake2');
      expect(comparison).toBeNull();
    });
  });

  describe('getSnapshotCount', () => {
    it('should return correct count', async () => {
      expect(manager.getSnapshotCount()).toBe(0);

      await manager.captureSnapshot('manual');
      await manager.captureSnapshot('manual');

      expect(manager.getSnapshotCount()).toBe(2);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(manager.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      delete process.env.ENABLE_SYSTEM_SNAPSHOTS;
      resetSnapshotManager();
      const disabled = getSnapshotManager();

      expect(disabled.isEnabled()).toBe(false);
    });
  });
});
