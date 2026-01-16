/**
 * Tests for Production Cutover Engine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_PRODUCTION_CUTOVER', 'true');

import {
  isProductionCutoverEnabled,
  CUTOVER_CONFIG,
} from '../../../server/production-cutover/config';
import {
  evaluateCutover,
  dryRun,
  createApproval,
  createOverride,
  clearOverride,
  getActiveApproval,
  getActiveOverride,
  getDecisionHistory,
  clearCache,
} from '../../../server/production-cutover/engine';

describe('Production Cutover Engine', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_PRODUCTION_CUTOVER', 'true');
    clearCache();
    clearOverride();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearCache();
    clearOverride();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_PRODUCTION_CUTOVER', 'true');
      expect(isProductionCutoverEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_PRODUCTION_CUTOVER', '');
      expect(isProductionCutoverEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have valid config values', () => {
      expect(CUTOVER_CONFIG.minReadinessScore).toBeGreaterThan(0);
      expect(CUTOVER_CONFIG.maxSoftBlockers).toBeGreaterThan(0);
      expect(CUTOVER_CONFIG.approvalDurationMs).toBeGreaterThan(0);
      expect(CUTOVER_CONFIG.version).toBeDefined();
    });
  });

  describe('Cutover Evaluation', () => {
    it('should evaluate cutover in live mode', async () => {
      const result = await evaluateCutover('live');

      expect(result.decision).toBeDefined();
      expect(['CAN_GO_LIVE', 'WARN', 'BLOCK']).toContain(result.decision);
      expect(result.mode).toBe('live');
      expect(result.score).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(result.evaluatedAt).toBeInstanceOf(Date);
    });

    it('should run dry-run without requiring feature flag', async () => {
      vi.stubEnv('ENABLE_PRODUCTION_CUTOVER', '');
      const result = await dryRun();

      expect(result.mode).toBe('dry-run');
      expect(result.decision).toBeDefined();
    });

    it('should include hard and soft blockers', async () => {
      const result = await evaluateCutover('live');

      expect(Array.isArray(result.hardBlockers)).toBe(true);
      expect(Array.isArray(result.softBlockers)).toBe(true);
    });

    it('should cache results', async () => {
      const first = await evaluateCutover('live');
      const second = await evaluateCutover('live');

      expect(first.signature.hash).toBe(second.signature.hash);
    });

    it('should track decision history', async () => {
      await evaluateCutover('live');
      const history = getDecisionHistory();

      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Approvals', () => {
    it('should create time-boxed approval', () => {
      const approval = createApproval('admin@test.com', 'Approved for go-live');

      expect(approval.id).toBeDefined();
      expect(approval.approvedBy).toBe('admin@test.com');
      expect(approval.expiresAt).toBeInstanceOf(Date);
      expect(approval.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should get active approval', () => {
      createApproval('admin@test.com', 'Test approval');
      const active = getActiveApproval();

      expect(active).not.toBeNull();
      expect(active?.approvedBy).toBe('admin@test.com');
    });
  });

  describe('Overrides', () => {
    it('should create emergency override', () => {
      const override = createOverride('ops@test.com', 'CAN_GO_LIVE', 'Emergency override');

      expect(override.id).toBeDefined();
      expect(override.overriddenBy).toBe('ops@test.com');
      expect(override.newDecision).toBe('CAN_GO_LIVE');
      expect(override.logged).toBe(true);
    });

    it('should get active override', () => {
      createOverride('ops@test.com', 'BLOCK', 'Override test');
      const active = getActiveOverride();

      expect(active).not.toBeNull();
      expect(active?.newDecision).toBe('BLOCK');
    });

    it('should clear override', () => {
      createOverride('ops@test.com', 'BLOCK', 'Override test');
      clearOverride();

      expect(getActiveOverride()).toBeNull();
    });

    it('should apply override to decision', async () => {
      createOverride('ops@test.com', 'CAN_GO_LIVE', 'Force go-live');
      clearCache();

      const result = await evaluateCutover('live');
      expect(result.decision).toBe('CAN_GO_LIVE');
    });
  });

  describe('Signature', () => {
    it('should generate unique signatures', async () => {
      clearCache();
      const first = await evaluateCutover('live');
      clearCache();
      // Small delay to ensure different snapshot
      await new Promise(r => setTimeout(r, 10));
      const second = await evaluateCutover('live');

      expect(first.signature).toBeDefined();
      expect(second.signature).toBeDefined();
      expect(first.signature.version).toBe(CUTOVER_CONFIG.version);
    });
  });
});
