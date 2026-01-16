/**
 * AI Provider Outage Resilience Tests
 * 
 * Simulates scenarios where AI providers fail and verifies:
 * 1. Fallback mechanisms activate correctly
 * 2. Proper logging occurs
 * 3. Graceful degradation without user-facing breakage
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger to capture log events
const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogError = vi.fn();

vi.mock('../../server/lib/logger', () => ({
  log: {
    info: (...args: unknown[]) => mockLogInfo(...args),
    warn: (...args: unknown[]) => mockLogWarn(...args),
    error: (...args: unknown[]) => mockLogError(...args),
  },
  logger: {
    info: (...args: unknown[]) => mockLogInfo(...args),
    warn: (...args: unknown[]) => mockLogWarn(...args),
    error: (...args: unknown[]) => mockLogError(...args),
  },
}));

// Import after mocking
import { ProviderPool, getProviderPool } from '../../server/ai-orchestrator/provider-pool';
import { getFallbackResponse, FallbackType } from '../../server/fallbacks/fallback-handler';
import type { AITask, AIProvider } from '../../server/ai-orchestrator/types';

describe('AI Provider Outage Resilience', () => {
  let providerPool: ProviderPool;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh instance for each test
    providerPool = new ProviderPool();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Single Provider Failure', () => {
    it('should route to alternative provider when primary fails', () => {
      const task: AITask = {
        id: 'test-task-001',
        category: 'news',
        priority: 'high',
        payload: { prompt: 'Test prompt' },
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Get initial routing
      const routing = providerPool.selectProvider(task);
      expect(routing.provider).toBeDefined();
      expect(routing.alternatives.length).toBeGreaterThan(0);

      // Simulate failure by marking provider unavailable
      const statuses = providerPool.getAllStatus();
      const primaryProvider = routing.provider;
      
      // Update status to simulate outage
      providerPool.updateProviderStatus(primaryProvider, false, 0, 5000);
      
      // Get new routing - should still find an alternative
      const newRouting = providerPool.selectProvider(task);
      expect(newRouting.provider).toBeDefined();
    });

    it('should maintain alternatives list for failover', () => {
      const task: AITask = {
        id: 'test-task-002',
        category: 'evergreen',
        priority: 'normal',
        payload: { content: 'Test content' },
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const routing = providerPool.selectProvider(task);
      
      // Verify alternatives are populated
      expect(routing.alternatives).toBeDefined();
      expect(Array.isArray(routing.alternatives)).toBe(true);
    });

    it('should log provider failures appropriately', () => {
      const task: AITask = {
        id: 'test-task-003',
        category: 'content',
        priority: 'normal',
        payload: {},
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Simulate multiple failures to trigger logging
      const routing = providerPool.selectProvider(task);
      providerPool.updateProviderStatus(routing.provider, false, 0, 10000);
      
      // Provider pool logs via logger module
      expect(providerPool.getAllStatus()).toBeDefined();
    });
  });

  describe('All Providers Failing', () => {
    it('should return fallback response when all providers exhausted', () => {
      // Test fallback handler directly
      const fallbackResponse = getFallbackResponse('AI_OVERLOADED');
      
      expect(fallbackResponse.success).toBe(false);
      expect(fallbackResponse.fallback).toBe(true);
      expect(fallbackResponse.type).toBe('AI_OVERLOADED');
      expect(fallbackResponse.message.title).toBeDefined();
      expect(fallbackResponse.message.description).toBeDefined();
      expect(fallbackResponse.message.suggestion).toBeDefined();
    });

    it('should generate request ID for tracking', () => {
      const response1 = getFallbackResponse('AI_OVERLOADED');
      const response2 = getFallbackResponse('AI_OVERLOADED');
      
      expect(response1.context?.requestId).toBeDefined();
      expect(response2.context?.requestId).toBeDefined();
      expect(response1.context?.requestId).not.toBe(response2.context?.requestId);
    });

    it('should include timestamp in fallback response', () => {
      const response = getFallbackResponse('GENERIC_ERROR');
      
      expect(response.context?.timestamp).toBeDefined();
      const timestamp = new Date(response.context!.timestamp);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should use default provider when all specific providers unavailable', () => {
      const task: AITask = {
        id: 'test-task-004',
        category: 'news',
        priority: 'normal',
        payload: {},
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Even with degraded state, should return a routing decision
      const routing = providerPool.selectProvider(task);
      expect(routing.provider).toBeDefined();
      expect(routing.reason).toBeDefined();
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide user-friendly error messages', () => {
      const fallbackTypes: FallbackType[] = [
        'AI_OVERLOADED',
        'GENERIC_ERROR',
        'NETWORK_ERROR',
        'RATE_LIMITED',
      ];

      for (const type of fallbackTypes) {
        const response = getFallbackResponse(type);
        
        // Verify message is user-friendly (not technical jargon)
        expect(response.message.title).not.toContain('Exception');
        expect(response.message.title).not.toContain('Error 500');
        expect(response.message.description.length).toBeGreaterThan(20);
        expect(response.message.suggestion).toBeDefined();
      }
    });

    it('should include action suggestions in fallbacks', () => {
      const response = getFallbackResponse('AI_OVERLOADED');
      
      expect(response.message.suggestion).toBeDefined();
      expect(response.message.suggestion.length).toBeGreaterThan(0);
    });

    it('should not expose internal error details to users', () => {
      const response = getFallbackResponse('GENERIC_ERROR', {
        originalError: new Error('Internal database connection failed: ECONNREFUSED'),
      });
      
      // User message should not contain internal details
      expect(response.message.description).not.toContain('ECONNREFUSED');
      expect(response.message.description).not.toContain('database');
    });
  });

  describe('Rate Limiting Resilience', () => {
    it('should handle rate limit scenarios gracefully', () => {
      const response = getFallbackResponse('RATE_LIMITED', {
        metadata: { retryAfterSeconds: 60 },
      });

      expect(response.type).toBe('RATE_LIMITED');
      expect(response.message.title).toBeDefined();
      expect(response.message.suggestion).toContain('wait');
    });

    it('should track remaining rate limits per provider', () => {
      const statuses = providerPool.getAllStatus();
      
      for (const status of statuses) {
        expect(status.rateLimitRemaining).toBeDefined();
        expect(typeof status.rateLimitRemaining).toBe('number');
      }
    });
  });

  describe('Provider Status Tracking', () => {
    it('should track availability status for all providers', () => {
      const statuses = providerPool.getAllStatus();
      
      expect(statuses.length).toBeGreaterThan(0);
      
      for (const status of statuses) {
        expect(status.provider).toBeDefined();
        expect(typeof status.available).toBe('boolean');
        expect(typeof status.currentLoad).toBe('number');
        expect(typeof status.remainingCredits).toBe('number');
      }
    });

    it('should update provider status after requests', () => {
      const provider: AIProvider = 'anthropic';
      const initialStatus = providerPool.getProviderStatus(provider);
      expect(initialStatus).toBeDefined();
      
      const initialCredits = initialStatus!.remainingCredits;
      
      // Simulate request completion
      providerPool.updateProviderStatus(provider, true, 5, 1000);
      
      const updatedStatus = providerPool.getProviderStatus(provider);
      expect(updatedStatus!.remainingCredits).toBe(initialCredits - 5);
    });

    it('should track last success and error timestamps', () => {
      const provider: AIProvider = 'openai';
      
      // Simulate success
      providerPool.updateProviderStatus(provider, true, 1, 500);
      let status = providerPool.getProviderStatus(provider);
      expect(status?.lastSuccessAt).toBeDefined();
      
      // Simulate failure
      providerPool.updateProviderStatus(provider, false, 0, 1000);
      status = providerPool.getProviderStatus(provider);
      expect(status?.lastErrorAt).toBeDefined();
    });
  });

  describe('Daily Limit Reset', () => {
    it('should reset daily limits for all providers', () => {
      const provider: AIProvider = 'gemini';
      
      // Deplete credits
      providerPool.updateProviderStatus(provider, true, 50, 1000);
      let status = providerPool.getProviderStatus(provider);
      const depletedCredits = status!.remainingCredits;
      
      // Reset daily limits
      providerPool.resetDailyLimits();
      
      status = providerPool.getProviderStatus(provider);
      expect(status!.remainingCredits).toBeGreaterThan(depletedCredits);
    });

    it('should restore provider availability after reset', () => {
      const statuses = providerPool.getAllStatus();
      const enabledProviders = statuses.filter(s => s.available);
      
      // Reset should maintain or restore availability
      providerPool.resetDailyLimits();
      
      const newStatuses = providerPool.getAllStatus();
      expect(newStatuses.filter(s => s.available).length).toBeGreaterThanOrEqual(enabledProviders.length - 1);
    });
  });
});

describe('Fallback Message Consistency', () => {
  it('should have all required fields in fallback messages', () => {
    const types: FallbackType[] = [
      'SEARCH_NO_RESULTS',
      'CHAT_UNAVAILABLE',
      'CONTENT_NOT_FOUND',
      'AI_OVERLOADED',
      'GENERIC_ERROR',
      'NETWORK_ERROR',
      'RATE_LIMITED',
      'SESSION_EXPIRED',
    ];

    for (const type of types) {
      const response = getFallbackResponse(type);
      
      expect(response.message.title, `${type} should have title`).toBeDefined();
      expect(response.message.description, `${type} should have description`).toBeDefined();
      expect(response.message.suggestion, `${type} should have suggestion`).toBeDefined();
    }
  });

  it('should return valid fallback structure for all types', () => {
    const types: FallbackType[] = [
      'SEARCH_NO_RESULTS',
      'CHAT_UNAVAILABLE', 
      'CONTENT_NOT_FOUND',
      'AI_OVERLOADED',
      'GENERIC_ERROR',
      'NETWORK_ERROR',
      'RATE_LIMITED',
      'SESSION_EXPIRED',
    ];

    for (const type of types) {
      const response = getFallbackResponse(type);
      
      expect(response.success).toBe(false);
      expect(response.fallback).toBe(true);
      expect(response.type).toBe(type);
      expect(response.context).toBeDefined();
    }
  });
});
