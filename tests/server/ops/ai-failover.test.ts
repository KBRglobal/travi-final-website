/**
 * AI Provider Failover & Degraded Modes Tests
 *
 * FEATURE 3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAIFailoverController,
  resetAIFailoverController,
  AIFailoverController,
} from '../../../server/ops/ai-failover/ai-failover-controller';

describe('AIFailoverController', () => {
  let controller: AIFailoverController;

  beforeEach(() => {
    process.env.ENABLE_AI_FAILOVER = 'true';
    resetAIFailoverController();
    controller = getAIFailoverController();
  });

  afterEach(() => {
    controller.stop();
    resetAIFailoverController();
    delete process.env.ENABLE_AI_FAILOVER;
  });

  describe('recordRequest', () => {
    it('should record successful requests', () => {
      controller.recordRequest('anthropic', 100, true, false);
      controller.recordRequest('anthropic', 150, true, false);

      const status = controller.getProviderStatus('anthropic');
      expect(status?.metrics.requestCount).toBeGreaterThanOrEqual(2);
      expect(status?.metrics.successCount).toBeGreaterThanOrEqual(2);
    });

    it('should track failures', () => {
      controller.recordRequest('openai', 100, true, false);
      controller.recordRequest('openai', 0, false, false);

      const status = controller.getProviderStatus('openai');
      expect(status?.metrics.failureCount).toBeGreaterThanOrEqual(1);
    });

    it('should track timeouts separately', () => {
      controller.recordRequest('gemini', 5000, false, true);

      const status = controller.getProviderStatus('gemini');
      expect(status?.metrics.timeoutCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('state transitions', () => {
    it('should start providers as healthy', () => {
      const status = controller.getProviderStatus('anthropic');
      expect(status?.state).toBe('healthy');
    });

    it('should degrade provider with high error rate', () => {
      // Record enough requests with high error rate
      for (let i = 0; i < 15; i++) {
        controller.recordRequest('deepseek', 100, false, false);
      }
      for (let i = 0; i < 5; i++) {
        controller.recordRequest('deepseek', 100, true, false);
      }

      const status = controller.getProviderStatus('deepseek');
      // State might be degraded or disabled based on thresholds
      expect(['degraded', 'disabled']).toContain(status?.state);
    });

    it('should auto-disable with critical error rate', () => {
      // 50%+ error rate should disable
      for (let i = 0; i < 10; i++) {
        controller.recordRequest('openrouter', 100, false, false);
      }
      for (let i = 0; i < 5; i++) {
        controller.recordRequest('openrouter', 100, true, false);
      }

      const status = controller.getProviderStatus('openrouter');
      expect(status?.state).toBe('disabled');
    });
  });

  describe('disableProvider', () => {
    it('should manually disable a provider', () => {
      const success = controller.disableProvider('gemini', 'Maintenance');

      expect(success).toBe(true);

      const status = controller.getProviderStatus('gemini');
      expect(status?.state).toBe('disabled');
      expect(status?.disabledBy).toBe('manual');
      expect(status?.disabledReason).toContain('Maintenance');
    });
  });

  describe('enableProvider', () => {
    it('should re-enable a disabled provider', () => {
      controller.disableProvider('openai', 'Test');
      expect(controller.getProviderStatus('openai')?.state).toBe('disabled');

      const success = controller.enableProvider('openai');

      expect(success).toBe(true);
      expect(controller.getProviderStatus('openai')?.state).toBe('healthy');
    });
  });

  describe('getCurrentProvider', () => {
    it('should return default primary provider', () => {
      expect(controller.getCurrentProvider()).toBe('anthropic');
    });

    it('should failover when primary is disabled', () => {
      controller.disableProvider('anthropic', 'Test');

      const current = controller.getCurrentProvider();
      expect(current).not.toBe('anthropic');
    });
  });

  describe('shouldRunNonCritical', () => {
    it('should return true when providers are healthy', () => {
      expect(controller.shouldRunNonCritical()).toBe(true);
    });
  });

  describe('getConcurrencyLevel', () => {
    it('should return full by default', () => {
      expect(controller.getConcurrencyLevel()).toBe('full');
    });
  });

  describe('getState', () => {
    it('should return complete state', () => {
      const state = controller.getState();

      expect(state.primaryProvider).toBeDefined();
      expect(state.currentProvider).toBeDefined();
      expect(state.providers).toBeInstanceOf(Map);
      expect(state.concurrencyLevel).toBeDefined();
      expect(state.recentActions).toBeInstanceOf(Array);
    });
  });

  describe('getProviderStatuses', () => {
    it('should return all provider statuses', () => {
      const statuses = controller.getProviderStatuses();

      expect(statuses.length).toBeGreaterThan(0);
      for (const status of statuses) {
        expect(status.provider).toBeDefined();
        expect(status.state).toBeDefined();
        expect(status.metrics).toBeDefined();
      }
    });
  });

  describe('getRecentActions', () => {
    it('should track actions', () => {
      controller.disableProvider('anthropic', 'Test');
      controller.enableProvider('anthropic');

      const actions = controller.getRecentActions();

      expect(actions.length).toBeGreaterThanOrEqual(2);
    });
  });
});
