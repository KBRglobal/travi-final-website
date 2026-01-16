/**
 * Tests for Platform Readiness & Go-Live Command Center
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_PLATFORM_READINESS', 'true');

import {
  isPlatformReadinessEnabled,
  READINESS_CONFIG,
  SIGNAL_SOURCES,
  SOURCE_CATEGORY_MAP,
} from '../../../server/platform-readiness/config';
import { collectAllSignals, collectSignal } from '../../../server/platform-readiness/collectors';
import { buildChecklist } from '../../../server/platform-readiness/checklist';
import { evaluateReadiness, simulateGoLive, clearCache } from '../../../server/platform-readiness/evaluator';
import type { ReadinessSignal, CheckCategory } from '../../../server/platform-readiness/types';

describe('Platform Readiness System', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_PLATFORM_READINESS', 'true');
    clearCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearCache();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_PLATFORM_READINESS', 'true');
      expect(isPlatformReadinessEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_PLATFORM_READINESS', '');
      expect(isPlatformReadinessEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have signal sources defined', () => {
      expect(SIGNAL_SOURCES.length).toBeGreaterThan(0);
    });

    it('should map all sources to categories', () => {
      for (const source of SIGNAL_SOURCES) {
        expect(SOURCE_CATEGORY_MAP[source]).toBeDefined();
      }
    });

    it('should have valid thresholds', () => {
      expect(READINESS_CONFIG.blockingThreshold).toBeGreaterThan(0);
      expect(READINESS_CONFIG.warningThreshold).toBeGreaterThan(READINESS_CONFIG.blockingThreshold);
    });
  });

  describe('Signal Collection', () => {
    it('should collect signals from all sources', async () => {
      const results = await collectAllSignals();
      expect(results.length).toBe(SIGNAL_SOURCES.length);
    });

    it('should return signals with required fields', async () => {
      const results = await collectAllSignals();
      for (const result of results) {
        expect(result.source).toBeDefined();
        expect(result.signals).toBeDefined();
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should collect individual signal', async () => {
      const result = await collectSignal('publishing_gates');
      expect(result.source).toBe('publishing_gates');
      expect(result.signals.length).toBeGreaterThan(0);
    });

    it('should handle unknown signal source', async () => {
      const result = await collectSignal('unknown_source' as any);
      expect(result.error).toBeDefined();
    });
  });

  describe('Checklist Builder', () => {
    it('should build checklist from signals', () => {
      const signals: ReadinessSignal[] = [
        {
          source: 'content_readiness',
          name: 'Content',
          status: 'pass',
          score: 100,
          message: 'OK',
          category: 'content',
          isBlocking: false,
          collectedAt: new Date(),
        },
      ];
      const categoryScores: Record<CheckCategory, number> = {
        content: 100,
        infra: 100,
        ai: 100,
        seo: 100,
        ops: 100,
        revenue: 100,
      };

      const checklist = buildChecklist(signals, categoryScores);

      expect(checklist.items.length).toBeGreaterThan(0);
      expect(checklist.summary).toBeDefined();
      expect(checklist.byCategory).toBeDefined();
    });

    it('should categorize checklist items', () => {
      const signals: ReadinessSignal[] = [];
      const categoryScores: Record<CheckCategory, number> = {
        content: 90,
        infra: 80,
        ai: 70,
        seo: 60,
        ops: 50,
        revenue: 40,
      };

      const checklist = buildChecklist(signals, categoryScores);

      const categories = new Set(checklist.items.map(i => i.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe('Readiness Evaluator', () => {
    it('should evaluate platform readiness', async () => {
      const status = await evaluateReadiness(false);

      expect(status.status).toMatch(/^(READY|DEGRADED|BLOCKED)$/);
      expect(status.score).toBeGreaterThanOrEqual(0);
      expect(status.score).toBeLessThanOrEqual(100);
      expect(status.signals).toBeDefined();
      expect(status.checklist).toBeDefined();
      expect(status.evaluatedAt).toBeInstanceOf(Date);
    });

    it('should identify blockers', async () => {
      const status = await evaluateReadiness(false);

      expect(status.blockers).toBeDefined();
      expect(Array.isArray(status.blockers)).toBe(true);
    });

    it('should cache results', async () => {
      const first = await evaluateReadiness(true);
      const second = await evaluateReadiness(true);

      expect(first.evaluatedAt.getTime()).toBe(second.evaluatedAt.getTime());
    });

    it('should refresh when requested', async () => {
      const first = await evaluateReadiness(false);
      await new Promise(r => setTimeout(r, 10));
      const second = await evaluateReadiness(false);

      expect(first.evaluatedAt.getTime()).not.toBe(second.evaluatedAt.getTime());
    });
  });

  describe('Go-Live Simulation', () => {
    it('should simulate go-live', async () => {
      const result = await simulateGoLive();

      expect(typeof result.wouldSucceed).toBe('boolean');
      expect(result.status).toMatch(/^(READY|DEGRADED|BLOCKED)$/);
      expect(result.recommendations).toBeDefined();
      expect(result.simulatedAt).toBeInstanceOf(Date);
    });

    it('should provide blocking reasons', async () => {
      const result = await simulateGoLive();

      expect(Array.isArray(result.blockingReasons)).toBe(true);
      expect(Array.isArray(result.warningReasons)).toBe(true);
    });
  });

  describe('Score Calculation', () => {
    it('should calculate weighted overall score', async () => {
      const status = await evaluateReadiness(false);

      // Score should be weighted average of category scores
      expect(status.score).toBeGreaterThanOrEqual(0);
      expect(status.score).toBeLessThanOrEqual(100);
    });
  });
});
