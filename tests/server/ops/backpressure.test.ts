/**
 * Backpressure & Load Shedding Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getBackpressureController,
  resetBackpressureController,
  BackpressureController,
} from '../../../server/ops/backpressure';
import { setOpsConfigForTest, resetOpsConfig } from '../../../server/ops/config';

describe('BackpressureController', () => {
  let controller: BackpressureController;

  beforeEach(() => {
    resetBackpressureController();
    resetOpsConfig();
    setOpsConfigForTest({
      backpressureEnabled: true,
      backpressure: {
        cpuThresholdPercent: 80,
        memoryThresholdPercent: 85,
        queueDepthThreshold: 50,
        aiLatencyThresholdMs: 3000,
        cooldownMs: 1000, // Short cooldown for testing
      },
    });
    controller = getBackpressureController();
  });

  afterEach(() => {
    controller.stop();
    resetBackpressureController();
    resetOpsConfig();
  });

  describe('getState', () => {
    it('should return initial state with no backpressure', () => {
      const state = controller.getState();

      expect(state.isActive).toBe(false);
      expect(state.level).toBe('none');
      expect(state.reason).toBeUndefined();
      expect(state.activatedAt).toBeUndefined();
    });

    it('should include current metrics', () => {
      const state = controller.getState();

      expect(state.metrics).toBeDefined();
      expect(typeof state.metrics.cpuUsage).toBe('number');
      expect(typeof state.metrics.memoryUsage).toBe('number');
      expect(typeof state.metrics.queueDepth).toBe('number');
      expect(typeof state.metrics.aiLatencyMs).toBe('number');
    });
  });

  describe('shouldAllowRequest', () => {
    it('should allow all requests when backpressure is none', () => {
      expect(controller.shouldAllowRequest(false)).toBe(true);
      expect(controller.shouldAllowRequest(true)).toBe(true);
    });

    it('should always allow critical requests', () => {
      controller.forceLevel('heavy', 'Test');

      expect(controller.shouldAllowRequest(true)).toBe(true);
    });

    it('should reject non-critical requests during heavy backpressure', () => {
      controller.forceLevel('heavy', 'Test');

      expect(controller.shouldAllowRequest(false)).toBe(false);
    });

    it('should allow non-critical requests during light backpressure', () => {
      controller.forceLevel('light', 'Test');

      expect(controller.shouldAllowRequest(false)).toBe(true);
    });
  });

  describe('shouldRunNonCriticalJobs', () => {
    it('should allow non-critical jobs when backpressure is none', () => {
      expect(controller.shouldRunNonCriticalJobs()).toBe(true);
    });

    it('should disable non-critical jobs during light backpressure', () => {
      controller.forceLevel('light', 'Test');

      expect(controller.shouldRunNonCriticalJobs()).toBe(false);
    });

    it('should disable non-critical jobs during heavy backpressure', () => {
      controller.forceLevel('heavy', 'Test');

      expect(controller.shouldRunNonCriticalJobs()).toBe(false);
    });
  });

  describe('forceLevel', () => {
    it('should set light backpressure', () => {
      controller.forceLevel('light', 'High CPU usage');

      const state = controller.getState();
      expect(state.isActive).toBe(true);
      expect(state.level).toBe('light');
      expect(state.activatedAt).toBeInstanceOf(Date);
    });

    it('should set heavy backpressure', () => {
      controller.forceLevel('heavy', 'System overload');

      const state = controller.getState();
      expect(state.isActive).toBe(true);
      expect(state.level).toBe('heavy');
    });

    it('should clear backpressure when set to none', () => {
      controller.forceLevel('heavy', 'Test');
      controller.forceLevel('none', 'Recovered');

      const state = controller.getState();
      expect(state.isActive).toBe(false);
      expect(state.level).toBe('none');
      expect(state.activatedAt).toBeUndefined();
    });
  });

  describe('getThrottleConfig', () => {
    it('should return high limits when no backpressure', () => {
      const config = controller.getThrottleConfig();

      expect(config.maxConcurrentAiCalls).toBe(10);
      expect(config.delayBetweenCallsMs).toBe(0);
      expect(config.disableNonCriticalJobs).toBe(false);
      expect(config.rejectNewRequests).toBe(false);
    });

    it('should return reduced limits during light backpressure', () => {
      controller.forceLevel('light', 'Test');

      const config = controller.getThrottleConfig();
      expect(config.maxConcurrentAiCalls).toBe(5);
      expect(config.delayBetweenCallsMs).toBe(100);
      expect(config.disableNonCriticalJobs).toBe(true);
      expect(config.rejectNewRequests).toBe(false);
    });

    it('should return minimal limits during heavy backpressure', () => {
      controller.forceLevel('heavy', 'Test');

      const config = controller.getThrottleConfig();
      expect(config.maxConcurrentAiCalls).toBe(2);
      expect(config.delayBetweenCallsMs).toBe(500);
      expect(config.disableNonCriticalJobs).toBe(true);
      expect(config.rejectNewRequests).toBe(true);
    });
  });

  describe('throttleAiCall and releaseAiCall', () => {
    it('should track concurrent AI calls', async () => {
      controller.forceLevel('light', 'Test');

      // First call should proceed immediately
      const start = Date.now();
      await controller.throttleAiCall();
      const elapsed = Date.now() - start;

      // Should have applied delay
      expect(elapsed).toBeGreaterThanOrEqual(100);

      controller.releaseAiCall();
    });

    it('should queue calls when at capacity', async () => {
      controller.forceLevel('heavy', 'Test'); // max 2 concurrent

      // Acquire 2 slots
      await controller.throttleAiCall();
      await controller.throttleAiCall();

      // Third call should be queued
      let resolved = false;
      const thirdCall = controller.throttleAiCall().then(() => {
        resolved = true;
      });

      // Give it time to potentially resolve (it shouldn't)
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(resolved).toBe(false);

      // Release one slot
      controller.releaseAiCall();

      // Now the third call should resolve
      await thirdCall;
      expect(resolved).toBe(true);

      // Cleanup
      controller.releaseAiCall();
      controller.releaseAiCall();
    });
  });

  describe('feature flag behavior', () => {
    it('should allow all requests when feature is disabled', () => {
      resetOpsConfig();
      setOpsConfigForTest({ backpressureEnabled: false });

      const newController = getBackpressureController();
      newController.forceLevel('heavy', 'Test');

      // Even with heavy level set, should allow because feature is disabled
      expect(newController.shouldAllowRequest(false)).toBe(true);
    });
  });
});
