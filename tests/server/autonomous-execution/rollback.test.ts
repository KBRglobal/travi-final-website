/**
 * Tests for Rollback Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RollbackManager,
  getRollbackManager,
  resetRollbackManager,
} from '../../../server/autonomous-execution/rollback';
import {
  getExecutionPlanner,
  resetExecutionPlanner,
  ApprovedProposal,
} from '../../../server/autonomous-execution/planner';
import type { ExecutionItem } from '../../../server/autonomous-execution/types';

describe('RollbackManager', () => {
  let rollbackManager: RollbackManager;

  const createMockItem = (overrides: Partial<ExecutionItem> = {}): ExecutionItem => ({
    id: 'item-1',
    proposalId: 'prop-1',
    proposalType: 'content_update',
    status: 'completed',
    priority: 'high',
    sequence: 1,
    changes: [
      {
        type: 'content_update',
        target: '/page-1',
        field: 'title',
        currentValue: 'Old Title',
        newValue: 'New Title',
        isReversible: true,
      },
    ],
    dependencies: [],
    ...overrides,
  });

  beforeEach(() => {
    resetExecutionPlanner();
    resetRollbackManager();
    rollbackManager = getRollbackManager();
  });

  describe('createRollbackPlan', () => {
    it('should create rollback plan for reversible changes', () => {
      const item = createMockItem();
      const plan = rollbackManager.createRollbackPlan(item);

      expect(plan).toBeDefined();
      expect(plan.itemId).toBe(item.id);
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].action).toBe('revert_content_update');
    });

    it('should skip non-reversible changes', () => {
      const item = createMockItem({
        changes: [
          {
            type: 'content_update',
            target: '/page-1',
            field: 'title',
            currentValue: 'Old',
            newValue: 'New',
            isReversible: true,
          },
          {
            type: 'url_change',
            target: '/page-1',
            field: 'slug',
            currentValue: '/old-slug',
            newValue: '/new-slug',
            isReversible: false,
          },
        ],
      });

      const plan = rollbackManager.createRollbackPlan(item);

      expect(plan.steps.length).toBe(1);
      expect(plan.risks.some((r) => r.includes('cannot be rolled back'))).toBe(true);
    });

    it('should reverse order of changes', () => {
      const item = createMockItem({
        changes: [
          {
            type: 'content_update',
            target: '/page-1',
            field: 'title',
            currentValue: 'Old Title',
            newValue: 'New Title',
            isReversible: true,
          },
          {
            type: 'content_update',
            target: '/page-1',
            field: 'description',
            currentValue: 'Old Desc',
            newValue: 'New Desc',
            isReversible: true,
          },
        ],
      });

      const plan = rollbackManager.createRollbackPlan(item);

      expect(plan.steps.length).toBe(2);
      // Second change should be rolled back first
      expect(plan.steps[0].data.field).toBe('description');
      expect(plan.steps[1].data.field).toBe('title');
    });

    it('should add complexity warning for many steps', () => {
      const changes = [];
      for (let i = 0; i < 10; i++) {
        changes.push({
          type: 'content_update',
          target: `/page-${i}`,
          field: 'title',
          currentValue: `Old ${i}`,
          newValue: `New ${i}`,
          isReversible: true,
        });
      }

      const item = createMockItem({ changes });
      const plan = rollbackManager.createRollbackPlan(item);

      expect(plan.risks.some((r) => r.includes('complexity'))).toBe(true);
    });
  });

  describe('executeRollback', () => {
    it('should execute rollback successfully', async () => {
      const item = createMockItem();
      rollbackManager.createRollbackPlan(item);

      const result = await rollbackManager.executeRollback(item.id);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for missing rollback plan', async () => {
      const result = await rollbackManager.executeRollback('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rollback plan not found');
    });

    it('should fail for empty rollback plan', async () => {
      const item = createMockItem({
        changes: [
          {
            type: 'url_change',
            target: '/page-1',
            field: 'slug',
            currentValue: '/old-slug',
            newValue: '/new-slug',
            isReversible: false,
          },
        ],
      });
      rollbackManager.createRollbackPlan(item);

      const result = await rollbackManager.executeRollback(item.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No reversible changes to rollback');
    });

    it('should call audit callback on each step', async () => {
      const item = createMockItem();
      rollbackManager.createRollbackPlan(item);

      const auditEntries: any[] = [];
      await rollbackManager.executeRollback(item.id, (entry) => {
        auditEntries.push(entry);
      });

      expect(auditEntries.length).toBe(1);
      expect(auditEntries[0].action).toBe('item_rolled_back');
      expect(auditEntries[0].result).toBe('success');
    });
  });

  describe('rollbackPlan', () => {
    it('should rollback all completed items in a plan', async () => {
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

      const plan = planner.createPlan('Rollback Test', proposals);
      // Simulate completed state
      plan.proposals[0].status = 'completed';

      const result = await rollbackManager.rollbackPlan(plan.id);

      expect(result.success).toBe(true);
      expect(result.rolledBack).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should fail for non-existent plan', async () => {
      const result = await rollbackManager.rollbackPlan('non-existent');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Plan not found');
    });

    it('should handle partial failures', async () => {
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
        {
          id: 'prop-2',
          type: 'content_update',
          target: '/page-2',
          priority: 'high',
          changes: [
            {
              type: 'url_change',
              target: '/page-2',
              field: 'slug',
              currentValue: '/old',
              newValue: '/new',
              isReversible: false,
            },
          ],
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ];

      const plan = planner.createPlan('Mixed Rollback', proposals);
      // Simulate completed state
      plan.proposals[0].status = 'completed';
      plan.proposals[1].status = 'completed';

      const result = await rollbackManager.rollbackPlan(plan.id);

      expect(result.rolledBack).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.success).toBe(false);
    });
  });

  describe('getRollbackPlan', () => {
    it('should retrieve stored rollback plan', () => {
      const item = createMockItem();
      rollbackManager.createRollbackPlan(item);

      const plan = rollbackManager.getRollbackPlan(item.id);

      expect(plan).toBeDefined();
      expect(plan?.itemId).toBe(item.id);
    });

    it('should return undefined for non-existent plan', () => {
      const plan = rollbackManager.getRollbackPlan('non-existent');
      expect(plan).toBeUndefined();
    });
  });

  describe('canRollback', () => {
    it('should return true for items with rollback plans', () => {
      const item = createMockItem();
      rollbackManager.createRollbackPlan(item);

      const result = rollbackManager.canRollback(item.id);

      expect(result.canRollback).toBe(true);
    });

    it('should return false for items without rollback plans', () => {
      const result = rollbackManager.canRollback('non-existent');

      expect(result.canRollback).toBe(false);
      expect(result.reason).toBe('No rollback plan available');
    });

    it('should return false for items with no reversible changes', () => {
      const item = createMockItem({
        changes: [
          {
            type: 'url_change',
            target: '/page-1',
            field: 'slug',
            currentValue: '/old',
            newValue: '/new',
            isReversible: false,
          },
        ],
      });
      rollbackManager.createRollbackPlan(item);

      const result = rollbackManager.canRollback(item.id);

      expect(result.canRollback).toBe(false);
      expect(result.reason).toBe('No reversible changes');
    });
  });

  describe('clear', () => {
    it('should clear all rollback plans', () => {
      const item = createMockItem();
      rollbackManager.createRollbackPlan(item);

      rollbackManager.clear();

      const plan = rollbackManager.getRollbackPlan(item.id);
      expect(plan).toBeUndefined();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getRollbackManager();
      const instance2 = getRollbackManager();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getRollbackManager();
      const item = createMockItem();
      instance1.createRollbackPlan(item);

      resetRollbackManager();

      const instance2 = getRollbackManager();
      expect(instance2.getRollbackPlan(item.id)).toBeUndefined();
    });
  });
});
