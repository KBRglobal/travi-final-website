/**
 * Tests for Safety Guards
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SafetyGuards,
  getSafetyGuards,
  resetSafetyGuards,
} from '../../../server/autonomous-execution/safety-guards';
import type { ExecutionPlan, ExecutionItem } from '../../../server/autonomous-execution/types';

describe('SafetyGuards', () => {
  let guards: SafetyGuards;

  const createMockPlan = (overrides: Partial<ExecutionPlan> = {}): ExecutionPlan => ({
    id: 'plan-1',
    name: 'Test Plan',
    status: 'running',
    mode: 'staged',
    proposals: [],
    createdAt: new Date(),
    config: {
      maxConcurrent: 1,
      delayBetweenMs: 100,
      maxRiskScore: 0.5,
      maxAffectedContent: 10,
      rollbackOnErrorRate: 0.3,
      rollbackOnMetricDrop: 0.1,
      timeoutMs: 5000,
    },
    ...overrides,
  });

  const createMockItem = (overrides: Partial<ExecutionItem> = {}): ExecutionItem => ({
    id: 'item-1',
    proposalId: 'prop-1',
    proposalType: 'content_update',
    status: 'pending',
    priority: 'high',
    sequence: 1,
    changes: [
      {
        type: 'content_update',
        target: '/page-1',
        field: 'title',
        currentValue: 'Old',
        newValue: 'New',
        isReversible: true,
      },
    ],
    dependencies: [],
    ...overrides,
  });

  beforeEach(() => {
    resetSafetyGuards();
    guards = getSafetyGuards();
  });

  describe('runPreExecutionChecks', () => {
    it('should pass for low-risk items', () => {
      const plan = createMockPlan();
      const item = createMockItem({
        forecast: { riskLevel: 'low' },
      });

      const results = guards.runPreExecutionChecks(plan, item);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it('should fail for high-risk items when threshold is low', () => {
      const plan = createMockPlan({
        config: {
          maxConcurrent: 1,
          delayBetweenMs: 100,
          maxRiskScore: 0.3, // Low threshold
          maxAffectedContent: 10,
          rollbackOnErrorRate: 0.3,
          rollbackOnMetricDrop: 0.1,
          timeoutMs: 5000,
        },
      });
      const item = createMockItem({
        forecast: { riskLevel: 'high' },
      });

      const results = guards.runPreExecutionChecks(plan, item);

      expect(results.some((r) => !r.passed)).toBe(true);
    });

    it('should warn about non-reversible changes', () => {
      const plan = createMockPlan();
      const item = createMockItem({
        changes: [
          {
            type: 'content_update',
            target: '/page-1',
            field: 'url',
            currentValue: '/old-url',
            newValue: '/new-url',
            isReversible: false,
          },
        ],
      });

      const results = guards.runPreExecutionChecks(plan, item);

      const reversibilityCheck = results.find((r) =>
        r.message.includes('non-reversible')
      );
      expect(reversibilityCheck).toBeDefined();
      expect(reversibilityCheck?.severity).toBe('warning');
    });

    it('should fail when affected scope exceeds limit', () => {
      const plan = createMockPlan({
        config: {
          maxConcurrent: 1,
          delayBetweenMs: 100,
          maxRiskScore: 0.5,
          maxAffectedContent: 2, // Low limit
          rollbackOnErrorRate: 0.3,
          rollbackOnMetricDrop: 0.1,
          timeoutMs: 5000,
        },
      });
      const item = createMockItem({
        changes: [
          { type: 'content_update', target: '/page-1', field: 'title', currentValue: 'A', newValue: 'B', isReversible: true },
          { type: 'content_update', target: '/page-2', field: 'title', currentValue: 'A', newValue: 'B', isReversible: true },
          { type: 'content_update', target: '/page-3', field: 'title', currentValue: 'A', newValue: 'B', isReversible: true },
        ],
      });

      const results = guards.runPreExecutionChecks(plan, item);

      const scopeCheck = results.find((r) =>
        r.message.includes('Too many affected targets')
      );
      expect(scopeCheck).toBeDefined();
      expect(scopeCheck?.passed).toBe(false);
    });
  });

  describe('runDuringExecutionChecks', () => {
    it('should pass when error rate is acceptable', () => {
      const plan = createMockPlan({
        proposals: [
          { ...createMockItem(), status: 'completed' },
          { ...createMockItem({ id: 'item-2' }), status: 'completed' },
        ],
      });
      const item = createMockItem();

      const results = guards.runDuringExecutionChecks(plan, item);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it('should fail when error rate exceeds threshold', () => {
      const plan = createMockPlan({
        proposals: [
          { ...createMockItem(), status: 'failed' },
          { ...createMockItem({ id: 'item-2' }), status: 'failed' },
          { ...createMockItem({ id: 'item-3' }), status: 'completed' },
        ],
      });
      const item = createMockItem();

      const results = guards.runDuringExecutionChecks(plan, item);

      const errorRateCheck = results.find((r) =>
        r.message.includes('Error rate')
      );
      expect(errorRateCheck?.passed).toBe(false);
      expect(errorRateCheck?.shouldRollback).toBe(true);
    });

    it('should fail when execution times out', () => {
      const plan = createMockPlan({
        startedAt: new Date(Date.now() - 100000), // Started 100 seconds ago
        proposals: [createMockItem()],
        config: {
          maxConcurrent: 1,
          delayBetweenMs: 100,
          maxRiskScore: 0.5,
          maxAffectedContent: 10,
          rollbackOnErrorRate: 0.3,
          rollbackOnMetricDrop: 0.1,
          timeoutMs: 1000, // 1 second timeout per item
        },
      });
      const item = createMockItem();

      const results = guards.runDuringExecutionChecks(plan, item);

      const timeoutCheck = results.find((r) =>
        r.message.includes('timeout')
      );
      expect(timeoutCheck?.passed).toBe(false);
      expect(timeoutCheck?.shouldHalt).toBe(true);
    });
  });

  describe('runPostExecutionChecks', () => {
    it('should pass when metrics are stable', () => {
      const plan = createMockPlan();
      const item = createMockItem();
      const baseline = { traffic: 1000, conversions: 50 };
      const current = { traffic: 1050, conversions: 52 };

      const results = guards.runPostExecutionChecks(plan, item, baseline, current);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it('should fail when metrics drop significantly', () => {
      const plan = createMockPlan();
      const item = createMockItem();
      const baseline = { traffic: 1000, conversions: 50 };
      const current = { traffic: 500, conversions: 20 }; // 50% drop

      const results = guards.runPostExecutionChecks(plan, item, baseline, current);

      const metricCheck = results.find((r) =>
        r.message.includes('metric drops')
      );
      expect(metricCheck?.passed).toBe(false);
      expect(metricCheck?.shouldRollback).toBe(true);
    });
  });

  describe('runChecks', () => {
    it('should run checks for specified type', () => {
      const plan = createMockPlan();
      const item = createMockItem();

      const result = guards.runChecks('pre_execution', plan, item);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.shouldHalt).toBe('boolean');
      expect(typeof result.shouldRollback).toBe('boolean');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should aggregate results correctly', () => {
      const plan = createMockPlan();
      const item = createMockItem({
        forecast: { riskLevel: 'low' },
      });

      const result = guards.runChecks('pre_execution', plan, item);

      expect(result.passed).toBe(true);
      expect(result.shouldHalt).toBe(false);
      expect(result.shouldRollback).toBe(false);
    });
  });

  describe('addCheck', () => {
    it('should add custom check', () => {
      const customCheck = {
        id: 'custom_check',
        name: 'Custom Check',
        type: 'pre_execution' as const,
        check: () => ({
          passed: true,
          message: 'Custom check passed',
          severity: 'info' as const,
          shouldHalt: false,
          shouldRollback: false,
        }),
      };

      guards.addCheck(customCheck);
      const checks = guards.getAllChecks();

      expect(checks.some((c) => c.id === 'custom_check')).toBe(true);
    });
  });

  describe('getAllChecks and getChecksByType', () => {
    it('should return all checks', () => {
      const checks = guards.getAllChecks();

      expect(checks.length).toBeGreaterThan(0);
    });

    it('should filter checks by type', () => {
      const preChecks = guards.getChecksByType('pre_execution');
      const duringChecks = guards.getChecksByType('during_execution');
      const postChecks = guards.getChecksByType('post_execution');

      expect(preChecks.every((c) => c.type === 'pre_execution')).toBe(true);
      expect(duringChecks.every((c) => c.type === 'during_execution')).toBe(true);
      expect(postChecks.every((c) => c.type === 'post_execution')).toBe(true);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getSafetyGuards();
      const instance2 = getSafetyGuards();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getSafetyGuards();
      resetSafetyGuards();
      const instance2 = getSafetyGuards();
      expect(instance1).not.toBe(instance2);
    });
  });
});
