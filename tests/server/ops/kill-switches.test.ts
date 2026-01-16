/**
 * Kill Switch Framework Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getKillSwitchManager,
  resetKillSwitchManager,
  KillSwitchManager,
  isSubsystemKilled,
  enableKillSwitch,
  disableKillSwitch,
} from '../../../server/ops/kill-switches';
import { setOpsConfigForTest, resetOpsConfig } from '../../../server/ops/config';
import type { Subsystem } from '../../../server/ops/types';

describe('KillSwitchManager', () => {
  let manager: KillSwitchManager;

  beforeEach(() => {
    // Clear any environment kill switches
    delete process.env.KILL_SEARCH;
    delete process.env.KILL_AEO;
    delete process.env.KILL_OCTOPUS;
    delete process.env.KILL_MONETIZATION;
    delete process.env.KILL_CHAT;

    resetKillSwitchManager();
    resetOpsConfig();
    setOpsConfigForTest({ killSwitchesEnabled: true });
    manager = getKillSwitchManager();
  });

  afterEach(() => {
    manager.stop();
    resetKillSwitchManager();
    resetOpsConfig();
  });

  describe('isKilled', () => {
    it('should return false for all subsystems by default', () => {
      const subsystems: Subsystem[] = ['search', 'aeo', 'octopus', 'monetization', 'chat'];

      for (const subsystem of subsystems) {
        expect(manager.isKilled(subsystem)).toBe(false);
      }
    });

    it('should return true when kill switch is enabled', () => {
      manager.enable('search', 'api', 'Testing kill switch');

      expect(manager.isKilled('search')).toBe(true);
      expect(manager.isKilled('aeo')).toBe(false);
    });

    it('should return false when feature flag is disabled', () => {
      resetOpsConfig();
      setOpsConfigForTest({ killSwitchesEnabled: false });

      manager.enable('search', 'api', 'Testing');

      expect(manager.isKilled('search')).toBe(false);
    });
  });

  describe('enable', () => {
    it('should enable a kill switch', () => {
      const success = manager.enable('aeo', 'api', 'Maintenance mode', 'admin@test.com');

      expect(success).toBe(true);
      expect(manager.isKilled('aeo')).toBe(true);

      const state = manager.getState('aeo');
      expect(state?.enabled).toBe(true);
      expect(state?.reason).toBe('Maintenance mode');
      expect(state?.source).toBe('api');
    });

    it('should record enable timestamp', () => {
      const before = new Date();
      manager.enable('octopus', 'api', 'Testing');
      const after = new Date();

      const state = manager.getState('octopus');
      expect(state?.enabledAt).toBeDefined();
      expect(state!.enabledAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state!.enabledAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should support timed overrides', async () => {
      // Enable for 100ms
      manager.enable('monetization', 'api', 'Temporary disable', undefined, 100);

      expect(manager.isKilled('monetization')).toBe(true);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check again - should have expired
      expect(manager.isKilled('monetization')).toBe(false);
    });
  });

  describe('disable', () => {
    it('should disable a kill switch', () => {
      manager.enable('chat', 'api', 'Testing');
      expect(manager.isKilled('chat')).toBe(true);

      const success = manager.disable('chat', 'api', 'Restored');

      expect(success).toBe(true);
      expect(manager.isKilled('chat')).toBe(false);
    });

    it('should return true when already disabled', () => {
      const success = manager.disable('search', 'api');

      expect(success).toBe(true);
    });
  });

  describe('toggle', () => {
    it('should enable when currently disabled', () => {
      expect(manager.isKilled('search')).toBe(false);

      manager.toggle('search', 'api', 'Toggled', 'admin');

      expect(manager.isKilled('search')).toBe(true);
    });

    it('should disable when currently enabled', () => {
      manager.enable('search', 'api', 'Initial');
      expect(manager.isKilled('search')).toBe(true);

      manager.toggle('search', 'api', 'Toggled back');

      expect(manager.isKilled('search')).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return undefined for unknown subsystem', () => {
      const state = manager.getState('nonexistent' as Subsystem);

      expect(state).toBeUndefined();
    });

    it('should return current state for valid subsystem', () => {
      const state = manager.getState('search');

      expect(state).toBeDefined();
      expect(state?.subsystem).toBe('search');
      expect(state?.enabled).toBe(false);
      expect(state?.source).toBe('env');
    });
  });

  describe('getAllStates', () => {
    it('should return states for all subsystems', () => {
      const states = manager.getAllStates();

      expect(states).toHaveLength(5);

      const subsystemNames = states.map(s => s.subsystem);
      expect(subsystemNames).toContain('search');
      expect(subsystemNames).toContain('aeo');
      expect(subsystemNames).toContain('octopus');
      expect(subsystemNames).toContain('monetization');
      expect(subsystemNames).toContain('chat');
    });
  });

  describe('getKilledSubsystems', () => {
    it('should return empty array when nothing is killed', () => {
      expect(manager.getKilledSubsystems()).toEqual([]);
    });

    it('should return list of killed subsystems', () => {
      manager.enable('search', 'api', 'Test');
      manager.enable('aeo', 'api', 'Test');

      const killed = manager.getKilledSubsystems();

      expect(killed).toHaveLength(2);
      expect(killed).toContain('search');
      expect(killed).toContain('aeo');
    });
  });

  describe('getEventHistory', () => {
    it('should record enable/disable events', () => {
      manager.enable('search', 'api', 'Enable test');
      manager.disable('search', 'api', 'Disable test');

      const history = manager.getEventHistory();

      expect(history.length).toBeGreaterThanOrEqual(2);

      const enableEvent = history.find(e => e.action === 'enabled' && e.subsystem === 'search');
      const disableEvent = history.find(e => e.action === 'disabled' && e.subsystem === 'search');

      expect(enableEvent).toBeDefined();
      expect(enableEvent?.reason).toBe('Enable test');
      expect(disableEvent).toBeDefined();
      expect(disableEvent?.reason).toBe('Disable test');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      manager.enable('search', 'api', 'Test');
      manager.enable('aeo', 'api', 'Test');

      const stats = manager.getStats();

      expect(stats.totalSubsystems).toBe(5);
      expect(stats.killedCount).toBe(2);
      expect(stats.activeCount).toBe(3);
      expect(stats.eventCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('environment variable integration', () => {
    it('should respect environment kill switches', () => {
      process.env.KILL_SEARCH = 'true';

      resetKillSwitchManager();
      const newManager = getKillSwitchManager();

      expect(newManager.isKilled('search')).toBe(true);

      const state = newManager.getState('search');
      expect(state?.source).toBe('env');

      // Cleanup
      delete process.env.KILL_SEARCH;
    });

    it('should not allow API to disable env-based kill switch', () => {
      process.env.KILL_AEO = 'true';

      resetKillSwitchManager();
      const newManager = getKillSwitchManager();

      const success = newManager.disable('aeo', 'api', 'Attempt to disable');

      expect(success).toBe(false);
      expect(newManager.isKilled('aeo')).toBe(true);

      // Cleanup
      delete process.env.KILL_AEO;
    });
  });

  describe('convenience functions', () => {
    it('isSubsystemKilled should work', () => {
      expect(isSubsystemKilled('search')).toBe(false);

      enableKillSwitch('search', 'Test');

      expect(isSubsystemKilled('search')).toBe(true);

      disableKillSwitch('search', 'Test');

      expect(isSubsystemKilled('search')).toBe(false);
    });
  });
});
