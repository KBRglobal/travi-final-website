/**
 * Tests for Blast Radius & Impact Simulator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_BLAST_RADIUS', 'true');

import {
  isBlastRadiusEnabled,
  BLAST_RADIUS_CONFIG,
} from '../../../server/blast-radius/config';
import {
  simulateBlastRadius,
  simulateMultiple,
  compareScenarios,
  getSimulationHistory,
  getStatus,
  clearAll,
} from '../../../server/blast-radius/simulator';
import type { ImpactTarget } from '../../../server/blast-radius/types';

describe('Blast Radius & Impact Simulator', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_BLAST_RADIUS', 'true');
    clearAll();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearAll();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_BLAST_RADIUS', 'true');
      expect(isBlastRadiusEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_BLAST_RADIUS', '');
      expect(isBlastRadiusEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have valid baseline metrics', () => {
      expect(BLAST_RADIUS_CONFIG.totalUsers).toBeGreaterThan(0);
      expect(BLAST_RADIUS_CONFIG.totalContent).toBeGreaterThan(0);
      expect(BLAST_RADIUS_CONFIG.totalRevenue).toBeGreaterThan(0);
    });

    it('should have valid severity thresholds', () => {
      const { severityThresholds } = BLAST_RADIUS_CONFIG;
      expect(severityThresholds.low).toBeLessThan(severityThresholds.medium);
      expect(severityThresholds.medium).toBeLessThan(severityThresholds.high);
      expect(severityThresholds.high).toBeLessThan(severityThresholds.critical);
    });
  });

  describe('Single Target Simulation', () => {
    it('should simulate feature impact', async () => {
      const target: ImpactTarget = { type: 'feature', id: 'search' };
      const result = await simulateBlastRadius(target);

      expect(result.id).toBeDefined();
      expect(result.target).toEqual(target);
      expect(result.severity).toBeDefined();
      expect(['none', 'low', 'medium', 'high', 'critical']).toContain(result.severity);
    });

    it('should simulate locale impact', async () => {
      const target: ImpactTarget = { type: 'locale', id: 'en-US' };
      const result = await simulateBlastRadius(target);

      expect(result.metrics.usersAffected).toBeGreaterThan(0);
      expect(result.metrics.usersAffectedPercent).toBeGreaterThan(0);
    });

    it('should simulate entity impact', async () => {
      const target: ImpactTarget = { type: 'entity', id: 'product-123' };
      const result = await simulateBlastRadius(target);

      expect(result.metrics).toBeDefined();
      expect(result.dependencies.length).toBeGreaterThan(0);
    });

    it('should include breakdown by locale', async () => {
      const target: ImpactTarget = { type: 'feature', id: 'checkout' };
      const result = await simulateBlastRadius(target);

      expect(result.breakdown.byLocale).toBeDefined();
      expect(Object.keys(result.breakdown.byLocale).length).toBeGreaterThan(0);
    });

    it('should include recommendations', async () => {
      const target: ImpactTarget = { type: 'feature', id: 'checkout' };
      const result = await simulateBlastRadius(target);

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Target Simulation', () => {
    it('should simulate multiple targets', async () => {
      const targets: ImpactTarget[] = [
        { type: 'feature', id: 'search' },
        { type: 'locale', id: 'de-DE' },
      ];
      const results = await simulateMultiple(targets);

      expect(results.length).toBe(2);
    });

    it('should compare scenarios', async () => {
      const targets: ImpactTarget[] = [
        { type: 'feature', id: 'search' },
        { type: 'locale', id: 'de-DE' },
      ];
      const results = await simulateMultiple(targets);
      const comparison = compareScenarios(results);

      expect(comparison.worstCase).not.toBeNull();
      expect(comparison.bestCase).not.toBeNull();
      expect(comparison.totalImpact).toBeDefined();
    });
  });

  describe('Simulation History', () => {
    it('should track simulation history', async () => {
      await simulateBlastRadius({ type: 'feature', id: 'search' });
      const history = getSimulationHistory();

      expect(history.length).toBe(1);
    });
  });

  describe('Status', () => {
    it('should report simulator status', () => {
      const status = getStatus();

      expect(status.enabled).toBe(true);
      expect(status.simulationsRun).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should cache results', async () => {
      const target: ImpactTarget = { type: 'feature', id: 'search' };
      const first = await simulateBlastRadius(target);
      const second = await simulateBlastRadius(target);

      expect(first.id).toBe(second.id);
    });
  });
});
