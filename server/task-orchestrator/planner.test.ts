/**
 * Autonomous Task Orchestrator - Planner Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generatePlan,
  optimizePlan,
  validatePlan,
} from './planner';
import { PlanGenerationContext, ExecutionPlan } from './types';

describe('Task Orchestrator Planner', () => {
  describe('generatePlan', () => {
    it('should generate plan from context', () => {
      const context: PlanGenerationContext = {
        priorities: [
          { targetId: 'content-1', priorityScore: 80, primaryReason: 'low_health_score' },
          { targetId: 'content-2', priorityScore: 60, primaryReason: 'stale_content' },
        ],
        tasks: [
          { id: 'task-1', type: 'improve_aeo', targetContentId: 'content-1', priority: 'high' },
          { id: 'task-2', type: 'add_internal_links', targetContentId: 'content-2', priority: 'medium' },
        ],
        constraints: {
          maxSteps: 10,
          maxDuration: 240,
          allowParallel: true,
          priorityThreshold: 50,
        },
      };

      const plan = generatePlan(context, 'Test Plan');

      expect(plan.name).toBe('Test Plan');
      expect(plan.status).toBe('ready');
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps.length).toBeLessThanOrEqual(10);
    });

    it('should filter tasks by priority threshold', () => {
      const context: PlanGenerationContext = {
        priorities: [
          { targetId: 'content-1', priorityScore: 80, primaryReason: 'low_health_score' },
          { targetId: 'content-2', priorityScore: 20, primaryReason: 'stale_content' }, // Below threshold
        ],
        tasks: [
          { id: 'task-1', type: 'improve_aeo', targetContentId: 'content-1', priority: 'high' },
          { id: 'task-2', type: 'add_internal_links', targetContentId: 'content-2', priority: 'low' },
        ],
        constraints: {
          maxSteps: 10,
          maxDuration: 240,
          allowParallel: true,
          priorityThreshold: 50,
        },
      };

      const plan = generatePlan(context);

      // Only content-1 should be included (above threshold)
      const includedTargets = plan.steps.map(s => s.targetId);
      expect(includedTargets).toContain('content-1');
      expect(includedTargets).not.toContain('content-2');
    });

    it('should respect max duration constraint', () => {
      const context: PlanGenerationContext = {
        priorities: Array.from({ length: 50 }, (_, i) => ({
          targetId: `content-${i}`,
          priorityScore: 90,
          primaryReason: 'low_health_score' as const,
        })),
        tasks: Array.from({ length: 50 }, (_, i) => ({
          id: `task-${i}`,
          type: 'create_content', // 60 min each
          targetContentId: `content-${i}`,
          priority: 'high',
        })),
        constraints: {
          maxSteps: 100,
          maxDuration: 120, // Only 2 hours
          allowParallel: true,
          priorityThreshold: 30,
        },
      };

      const plan = generatePlan(context);

      expect(plan.estimatedDuration).toBeLessThanOrEqual(120);
    });

    it('should assign dependencies correctly', () => {
      const context: PlanGenerationContext = {
        priorities: [
          { targetId: 'content-1', priorityScore: 80, primaryReason: 'low_health_score' },
        ],
        tasks: [
          { id: 'task-1', type: 'update_stale_content', targetContentId: 'content-1', priority: 'high' },
          { id: 'task-2', type: 'improve_aeo', targetContentId: 'content-1', priority: 'high' }, // Depends on update
        ],
        constraints: {
          maxSteps: 10,
          maxDuration: 240,
          allowParallel: true,
          priorityThreshold: 30,
        },
      };

      const plan = generatePlan(context);

      // AEO step should depend on update step
      const aeoStep = plan.steps.find(s => s.action === 'generate_aeo');
      const updateStep = plan.steps.find(s => s.action === 'update_content');

      if (aeoStep && updateStep) {
        expect(aeoStep.dependsOn).toContain(updateStep.id);
      }
    });

    it('should handle empty context', () => {
      const context: PlanGenerationContext = {
        priorities: [],
        tasks: [],
        constraints: {
          maxSteps: 10,
          maxDuration: 240,
          allowParallel: true,
          priorityThreshold: 30,
        },
      };

      const plan = generatePlan(context);

      expect(plan.steps).toHaveLength(0);
      expect(plan.status).toBe('ready');
    });
  });

  describe('optimizePlan', () => {
    it('should optimize duration for parallel execution', () => {
      const context: PlanGenerationContext = {
        priorities: [
          { targetId: 'content-1', priorityScore: 80, primaryReason: 'low_health_score' },
          { targetId: 'content-2', priorityScore: 75, primaryReason: 'stale_content' },
        ],
        tasks: [
          { id: 'task-1', type: 'add_internal_links', targetContentId: 'content-1', priority: 'high' },
          { id: 'task-2', type: 'add_internal_links', targetContentId: 'content-2', priority: 'high' },
        ],
        constraints: {
          maxSteps: 10,
          maxDuration: 240,
          allowParallel: true,
          priorityThreshold: 30,
        },
      };

      const plan = generatePlan(context);
      const optimized = optimizePlan(plan);

      expect(optimized.metadata?.optimized).toBe(true);
      expect(optimized.estimatedDuration).toBeLessThanOrEqual(plan.estimatedDuration);
    });

    it('should preserve plan structure', () => {
      const context: PlanGenerationContext = {
        priorities: [{ targetId: 'content-1', priorityScore: 80, primaryReason: 'low_health_score' }],
        tasks: [{ id: 'task-1', type: 'improve_aeo', targetContentId: 'content-1', priority: 'high' }],
        constraints: {
          maxSteps: 10,
          maxDuration: 240,
          allowParallel: true,
          priorityThreshold: 30,
        },
      };

      const plan = generatePlan(context);
      const optimized = optimizePlan(plan);

      expect(optimized.id).toBe(plan.id);
      expect(optimized.name).toBe(plan.name);
      expect(optimized.steps.length).toBe(plan.steps.length);
    });
  });

  describe('validatePlan', () => {
    it('should validate a correct plan', () => {
      const context: PlanGenerationContext = {
        priorities: [{ targetId: 'content-1', priorityScore: 80, primaryReason: 'low_health_score' }],
        tasks: [{ id: 'task-1', type: 'improve_aeo', targetContentId: 'content-1', priority: 'high' }],
        constraints: {
          maxSteps: 10,
          maxDuration: 240,
          allowParallel: true,
          priorityThreshold: 30,
        },
      };

      const plan = generatePlan(context);
      const result = validatePlan(plan);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty plans', () => {
      const emptyPlan: ExecutionPlan = {
        id: 'test-plan',
        name: 'Empty Plan',
        description: 'No steps',
        status: 'ready',
        priority: 0,
        steps: [],
        dependencies: [],
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      const result = validatePlan(emptyPlan);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plan has no steps');
    });

    it('should detect invalid dependencies', () => {
      const invalidPlan: ExecutionPlan = {
        id: 'test-plan',
        name: 'Invalid Plan',
        description: 'Bad deps',
        status: 'ready',
        priority: 50,
        steps: [
          {
            id: 'step-1',
            order: 1,
            taskId: 'task-1',
            taskType: 'test',
            targetId: 'content-1',
            action: 'update_content',
            status: 'pending',
            dependsOn: ['non-existent-step'], // Invalid
            estimatedDuration: 30,
            priority: 50,
            inputs: {},
            startedAt: null,
            completedAt: null,
          },
        ],
        dependencies: [],
        estimatedDuration: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };

      const result = validatePlan(invalidPlan);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('non-existent'))).toBe(true);
    });
  });
});
