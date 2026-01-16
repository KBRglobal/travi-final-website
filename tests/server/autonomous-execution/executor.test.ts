/**
 * Tests for Executor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Executor,
  getExecutor,
  resetExecutor,
} from '../../../server/autonomous-execution/executor';
import {
  getExecutionPlanner,
  resetExecutionPlanner,
  ApprovedProposal,
} from '../../../server/autonomous-execution/planner';
import { resetSafetyGuards } from '../../../server/autonomous-execution/safety-guards';
import { resetRollbackManager } from '../../../server/autonomous-execution/rollback';

describe('Executor', () => {
  let executor: Executor;

  beforeEach(() => {
    resetExecutionPlanner();
    resetExecutor();
    resetSafetyGuards();
    resetRollbackManager();
    executor = getExecutor();
  });

  describe('execute', () => {
    it('should execute a simple plan', async () => {
      const planner = getExecutionPlanner();
      const proposals: ApprovedProposal[] = [
        {
          id: 'prop-1',
          type: 'content_update',
          target: '/page-1',
          priority: 'high',
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
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ];

      const plan = planner.createPlan('Exec Test', proposals);
      const result = await executor.execute(plan.id);

      expect(result.success).toBe(true);
      expect(result.completed).toBeGreaterThan(0);
    });

    it('should fail for non-existent plan', async () => {
      const result = await executor.execute('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Plan not found');
    });

    it('should fail for invalid plan', async () => {
      const planner = getExecutionPlanner();
      // Create plan with circular dependency
      const proposals: ApprovedProposal[] = [
        {
          id: 'prop-1',
          type: 'content_update',
          target: '/page-1',
          priority: 'high',
          changes: [],
          approvedBy: 'admin',
          approvedAt: new Date(),
          dependsOn: ['prop-2'],
        },
        {
          id: 'prop-2',
          type: 'content_update',
          target: '/page-2',
          priority: 'high',
          changes: [],
          approvedBy: 'admin',
          approvedAt: new Date(),
          dependsOn: ['prop-1'],
        },
      ];

      const plan = planner.createPlan('Invalid Plan', proposals);
      const result = await executor.execute(plan.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('getIsRunning', () => {
    it('should return false when not executing', () => {
      expect(executor.getIsRunning()).toBe(false);
    });
  });

  describe('getProgress', () => {
    it('should return progress for a plan', async () => {
      const planner = getExecutionPlanner();
      const proposals: ApprovedProposal[] = [
        {
          id: 'prop-1',
          type: 'content_update',
          target: '/page-1',
          priority: 'high',
          changes: [],
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ];

      const plan = planner.createPlan('Progress Test', proposals);
      await executor.execute(plan.id);

      const progress = executor.getProgress(plan.id);

      expect(progress).toBeDefined();
      expect(progress?.planId).toBe(plan.id);
      expect(progress?.total).toBe(1);
    });

    it('should return undefined for non-existent plan', () => {
      const progress = executor.getProgress('non-existent');
      expect(progress).toBeUndefined();
    });
  });

  describe('getRateLimitState', () => {
    it('should return rate limit state', () => {
      const state = executor.getRateLimitState();

      expect(state).toBeDefined();
      expect(state.hourlyBudget).toBeDefined();
      expect(state.dailyBudget).toBeDefined();
      expect(typeof state.itemsThisHour).toBe('number');
      expect(typeof state.itemsThisDay).toBe('number');
    });
  });

  describe('getAuditLog', () => {
    it('should return audit log entries', async () => {
      const planner = getExecutionPlanner();
      const proposals: ApprovedProposal[] = [
        {
          id: 'prop-1',
          type: 'content_update',
          target: '/page-1',
          priority: 'high',
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
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ];

      const plan = planner.createPlan('Audit Test', proposals);
      await executor.execute(plan.id);

      const log = executor.getAuditLog();

      expect(Array.isArray(log)).toBe(true);
      expect(log.length).toBeGreaterThan(0);
    });

    it('should filter by planId', async () => {
      const planner = getExecutionPlanner();
      const proposals: ApprovedProposal[] = [
        {
          id: 'prop-1',
          type: 'content_update',
          target: '/page-1',
          priority: 'high',
          changes: [],
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ];

      const plan1 = planner.createPlan('Plan 1', proposals);
      const plan2 = planner.createPlan('Plan 2', proposals);

      await executor.execute(plan1.id);
      await executor.execute(plan2.id);

      const log = executor.getAuditLog(plan1.id);

      expect(log.every((e) => e.planId === plan1.id)).toBe(true);
    });

    it('should respect limit', async () => {
      const planner = getExecutionPlanner();
      const proposals: ApprovedProposal[] = [
        {
          id: 'prop-1',
          type: 'content_update',
          target: '/page-1',
          priority: 'high',
          changes: [],
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ];

      const plan = planner.createPlan('Limit Test', proposals);
      await executor.execute(plan.id);

      const log = executor.getAuditLog(undefined, 2);

      expect(log.length).toBeLessThanOrEqual(2);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getExecutor();
      const instance2 = getExecutor();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getExecutor();
      resetExecutor();
      const instance2 = getExecutor();
      expect(instance1).not.toBe(instance2);
    });
  });
});
