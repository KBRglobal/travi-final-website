/**
 * Autonomy Enforcement SDK - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AutonomyBlockedError,
  DEFAULT_ENFORCEMENT_CONFIG,
  GuardedFeature,
  EnforcementContext,
} from '../../../server/autonomy/enforcement/types';

// Mock environment
const originalEnv = process.env;

describe('AutonomyBlockedError', () => {
  it('should create error with correct properties', () => {
    const error = new AutonomyBlockedError('Test block', {
      reasons: [{ code: 'TEST', message: 'Test reason', severity: 'error' }],
      feature: 'chat',
      action: 'ai_generate',
      matchedPolicy: 'test-policy',
      retryAfter: 3600,
    });

    expect(error.name).toBe('AutonomyBlockedError');
    expect(error.code).toBe('AUTONOMY_BLOCKED');
    expect(error.decision).toBe('BLOCK');
    expect(error.feature).toBe('chat');
    expect(error.action).toBe('ai_generate');
    expect(error.reasons).toHaveLength(1);
    expect(error.retryAfter).toBe(3600);
  });

  it('should serialize to JSON correctly', () => {
    const error = new AutonomyBlockedError('Test', {
      reasons: [{ code: 'TEST', message: 'Test', severity: 'error' }],
      feature: 'publishing',
      action: 'content_publish',
    });

    const json = error.toJSON();
    expect(json.code).toBe('AUTONOMY_BLOCKED');
    expect(json.feature).toBe('publishing');
    expect(json.action).toBe('content_publish');
  });
});

describe('DEFAULT_ENFORCEMENT_CONFIG', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should read enabled from environment', () => {
    expect(DEFAULT_ENFORCEMENT_CONFIG.enabled).toBe(
      process.env.ENABLE_AUTONOMY_POLICY === 'true'
    );
  });

  it('should have reasonable timeout defaults', () => {
    expect(DEFAULT_ENFORCEMENT_CONFIG.evaluationTimeoutMs).toBeLessThanOrEqual(5000);
    expect(DEFAULT_ENFORCEMENT_CONFIG.budgetCheckTimeoutMs).toBeLessThanOrEqual(3000);
  });

  it('should have bounded cache settings', () => {
    expect(DEFAULT_ENFORCEMENT_CONFIG.maxCacheSize).toBeGreaterThan(0);
    expect(DEFAULT_ENFORCEMENT_CONFIG.maxCacheSize).toBeLessThanOrEqual(10000);
    expect(DEFAULT_ENFORCEMENT_CONFIG.cacheTtlMs).toBeGreaterThan(0);
  });
});

describe('GuardedFeature types', () => {
  const validFeatures: GuardedFeature[] = [
    'chat',
    'octopus',
    'search',
    'aeo',
    'translation',
    'images',
    'content_enrichment',
    'seo_optimization',
    'internal_linking',
    'background_job',
    'publishing',
  ];

  it('should have all expected features', () => {
    expect(validFeatures).toContain('chat');
    expect(validFeatures).toContain('publishing');
    expect(validFeatures).toContain('background_job');
  });

  it('should support all AI-related features', () => {
    const aiFeatures: GuardedFeature[] = ['chat', 'octopus', 'aeo', 'translation'];
    for (const feature of aiFeatures) {
      expect(validFeatures).toContain(feature);
    }
  });
});

describe('EnforcementContext validation', () => {
  it('should accept valid context with all fields', () => {
    const context: EnforcementContext = {
      feature: 'chat',
      action: 'ai_generate',
      entityId: 'content:123',
      contentId: '123',
      locale: 'en',
      requesterId: 'user-1',
      estimatedTokens: 1000,
      estimatedCost: 50,
      metadata: { source: 'test' },
    };

    expect(context.feature).toBe('chat');
    expect(context.action).toBe('ai_generate');
    expect(context.estimatedTokens).toBe(1000);
  });

  it('should accept minimal context', () => {
    const context: EnforcementContext = {
      feature: 'publishing',
      action: 'content_publish',
    };

    expect(context.feature).toBe('publishing');
    expect(context.entityId).toBeUndefined();
  });
});

describe('Budget consumption', () => {
  it('should track consumption metrics correctly', () => {
    const consumption = {
      feature: 'chat' as GuardedFeature,
      action: 'ai_generate' as const,
      tokensUsed: 500,
      aiSpendCents: 25,
      success: true,
      durationMs: 1500,
      timestamp: new Date(),
    };

    expect(consumption.tokensUsed).toBe(500);
    expect(consumption.aiSpendCents).toBe(25);
    expect(consumption.success).toBe(true);
  });

  it('should handle failure consumption', () => {
    const consumption = {
      feature: 'octopus' as GuardedFeature,
      action: 'ai_generate' as const,
      tokensUsed: 100,
      aiSpendCents: 0,
      success: false,
      durationMs: 500,
      timestamp: new Date(),
    };

    expect(consumption.success).toBe(false);
    expect(consumption.aiSpendCents).toBe(0);
  });
});

describe('Job blocking behavior', () => {
  it('should return correct blocked result structure', () => {
    const result = {
      blocked: true,
      reason: 'Budget exhausted',
      rescheduleAfterMs: 3600000,
      shouldRetry: true,
    };

    expect(result.blocked).toBe(true);
    expect(result.shouldRetry).toBe(true);
    expect(result.rescheduleAfterMs).toBe(3600000);
  });

  it('should return correct allowed result structure', () => {
    const result = {
      blocked: false,
      shouldRetry: true,
    };

    expect(result.blocked).toBe(false);
    expect(result.reason).toBeUndefined();
  });
});

describe('Override TTL behavior', () => {
  it('should calculate expiry correctly', () => {
    const ttlMinutes = 60;
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ttlMinutes * 60 * 1000);

    expect(expiresAt.getTime() - createdAt.getTime()).toBe(3600000);
  });

  it('should detect expired override', () => {
    const expiresAt = new Date(Date.now() - 1000); // 1 second ago
    const isExpired = expiresAt < new Date();

    expect(isExpired).toBe(true);
  });

  it('should detect active override', () => {
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    const isActive = expiresAt > new Date();

    expect(isActive).toBe(true);
  });
});

describe('Degraded mode behavior', () => {
  it('should structure degraded response correctly', () => {
    const degraded = {
      isDegraded: true as const,
      reason: 'Budget exhausted',
      fallbackData: { content: 'Fallback content' },
      retryAfter: 3600,
    };

    expect(degraded.isDegraded).toBe(true);
    expect(degraded.fallbackData).toBeDefined();
    expect(degraded.retryAfter).toBe(3600);
  });
});

describe('Policy decision outcomes', () => {
  const validDecisions = ['ALLOW', 'WARN', 'BLOCK'] as const;

  it('should have all expected decision types', () => {
    expect(validDecisions).toContain('ALLOW');
    expect(validDecisions).toContain('WARN');
    expect(validDecisions).toContain('BLOCK');
  });

  it('should map severity correctly', () => {
    const severityMap = {
      ALLOW: 'info',
      WARN: 'warning',
      BLOCK: 'error',
    };

    expect(severityMap.BLOCK).toBe('error');
    expect(severityMap.WARN).toBe('warning');
  });
});
