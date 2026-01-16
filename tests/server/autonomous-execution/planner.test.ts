/**
 * Tests for Execution Planner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutionPlanner,
  getExecutionPlanner,
  resetExecutionPlanner,
  ApprovedProposal,
} from '../../../server/autonomous-execution/planner';

describe('ExecutionPlanner', () => {
  let planner: ExecutionPlanner;

  beforeEach(() => {
    resetExecutionPlanner();
    planner = getExecutionPlanner();
  });

  describe('createPlan', () => {
    it('should create a plan with default config', () => {
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
              currentValue: 'Old Title',
              newValue: 'New Title',
              isReversible: true,
            },
          ],
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ];

      const plan = planner.createPlan('Test Plan', proposals);

      expect(plan).toBeDefined();
      expect(plan.name).toBe('Test Plan');
      expect(plan.status).toBe('pending');
      expect(plan.mode).toBe('staged');
      expect(plan.proposals).toHaveLength(1);
      expect(plan.config).toBeDefined();
      expect(plan.config.maxRiskScore).toBe(0.7); // Default is 0.7
    });

    it('should create a plan with custom mode', () => {
      const proposals: ApprovedProposal[] = [
        {
          id: 'prop-1',
          type: 'seo_fix',
          target: '/page-1',
          priority: 'medium',
          changes: [],
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ];

      const plan = planner.createPlan('Immediate Plan', proposals, 'immediate');

      expect(plan.mode).toBe('immediate');
    });

    it('should handle dependencies between proposals', () => {
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
        {
          id: 'prop-2',
          type: 'content_update',
          target: '/page-2',
          priority: 'medium',
          changes: [],
          approvedBy: 'admin',
          approvedAt: new Date(),
          dependsOn: ['prop-1'],
        },
      ];

      const plan = planner.createPlan('Dependent Plan', proposals);

      expect(plan.proposals).toHaveLength(2);
      // First proposal should come before second due to dependency
      const item1Index = plan.proposals.findIndex((p) => p.proposalId === 'prop-1');
      const item2Index = plan.proposals.findIndex((p) => p.proposalId === 'prop-2');
      expect(item1Index).toBeLessThan(item2Index);
    });
  });

  describe('validatePlan', () => {
    it('should validate a valid plan', () => {
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

      const plan = planner.createPlan('Valid Plan', proposals);
      const validation = planner.validatePlan(plan.id);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect circular dependencies', () => {
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

      const plan = planner.createPlan('Circular Plan', proposals);
      const validation = planner.validatePlan(plan.id);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Circular'))).toBe(true);
    });

    it('should return error for missing plan', () => {
      const validation = planner.validatePlan('non-existent');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Plan not found');
    });
  });

  describe('getPlan and getAllPlans', () => {
    it('should retrieve plan by ID', () => {
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

      const created = planner.createPlan('My Plan', proposals);
      const retrieved = planner.getPlan(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('My Plan');
    });

    it('should return undefined for non-existent plan', () => {
      const retrieved = planner.getPlan('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should get all plans', () => {
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

      planner.createPlan('Plan 1', proposals);
      planner.createPlan('Plan 2', proposals);
      planner.createPlan('Plan 3', proposals);

      const allPlans = planner.getAllPlans();
      expect(allPlans).toHaveLength(3);
    });
  });

  describe('cancelPlan', () => {
    it('should cancel a pending plan', () => {
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

      const plan = planner.createPlan('To Cancel', proposals);
      const cancelled = planner.cancelPlan(plan.id);

      expect(cancelled).toBeDefined();
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should return undefined for non-existent plan', () => {
      const cancelled = planner.cancelPlan('non-existent');
      expect(cancelled).toBeUndefined();
    });
  });

  describe('updatePlanStatus', () => {
    it('should update plan status', () => {
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

      const plan = planner.createPlan('Status Test', proposals);
      planner.updatePlanStatus(plan.id, 'running');

      const updated = planner.getPlan(plan.id);
      expect(updated?.status).toBe('running');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getExecutionPlanner();
      const instance2 = getExecutionPlanner();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getExecutionPlanner();
      instance1.createPlan('Test', []);

      resetExecutionPlanner();

      const instance2 = getExecutionPlanner();
      expect(instance2.getAllPlans()).toHaveLength(0);
    });
  });
});
