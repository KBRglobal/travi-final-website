/**
 * Autonomous Task Orchestrator - Main Orchestrator
 * Manages execution plans lifecycle
 */

import {
  ExecutionPlan,
  ExecutionStep,
  PlanStatus,
  StepStatus,
  PlanSummary,
  PlanGenerationContext,
  PlanConstraints,
  DEFAULT_ORCHESTRATOR_CONFIG,
  DEFAULT_CONSTRAINTS,
} from './types';
import { generatePlan, optimizePlan, validatePlan } from './planner';

// Plan storage
const plans = new Map<string, ExecutionPlan>();
const MAX_PLANS = DEFAULT_ORCHESTRATOR_CONFIG.maxPlansInMemory;

function isEnabled(): boolean {
  return process.env.ENABLE_TASK_ORCHESTRATOR === 'true';
}

export async function createPlan(
  name?: string,
  constraints?: Partial<PlanConstraints>
): Promise<ExecutionPlan | null> {
  if (!isEnabled()) return null;

  try {
    // Gather context from strategy and growth-tasks modules
    const context = await gatherPlanContext(constraints);
    const plan = generatePlan(context, name);
    const optimizedPlan = optimizePlan(plan);
    const validation = validatePlan(optimizedPlan);

    if (!validation.valid) {
      console.warn('[Orchestrator] Plan validation warnings:', validation.errors);
    }

    // Enforce plan limit
    if (plans.size >= MAX_PLANS) {
      const oldest = Array.from(plans.entries())
        .filter(([, p]) => p.status === 'completed' || p.status === 'cancelled')
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
        .slice(0, 10);

      for (const [id] of oldest) {
        plans.delete(id);
      }
    }

    plans.set(optimizedPlan.id, optimizedPlan);
    console.log(`[Orchestrator] Created plan ${optimizedPlan.id} with ${optimizedPlan.steps.length} steps`);

    return optimizedPlan;
  } catch (error) {
    console.error('[Orchestrator] Plan creation error:', error);
    return null;
  }
}

async function gatherPlanContext(
  constraintOverrides?: Partial<PlanConstraints>
): Promise<PlanGenerationContext> {
  const constraints = { ...DEFAULT_CONSTRAINTS, ...constraintOverrides };

  // Get priorities from strategy engine
  let priorities: PlanGenerationContext['priorities'] = [];
  try {
    const { getTopPriorities } = await import('../strategy');
    const strategyPriorities = await getTopPriorities(50);
    priorities = strategyPriorities.map(p => ({
      targetId: p.targetId,
      priorityScore: p.priorityScore,
      primaryReason: p.primaryReason,
    }));
  } catch (error) {
    console.warn('[Orchestrator] Could not load strategy priorities:', error);
  }

  // Get tasks from growth-tasks module
  let tasks: PlanGenerationContext['tasks'] = [];
  try {
    const { getPendingTasks } = await import('../growth-tasks');
    const growthTasks = getPendingTasks();
    tasks = growthTasks.map(t => ({
      id: t.id,
      type: t.type,
      targetContentId: t.targetContentId,
      targetEntity: t.targetEntity,
      priority: t.priority,
    }));
  } catch (error) {
    console.warn('[Orchestrator] Could not load growth tasks:', error);
  }

  return { priorities, tasks, constraints };
}

export function getPlan(planId: string): ExecutionPlan | null {
  return plans.get(planId) || null;
}

export function getAllPlans(): ExecutionPlan[] {
  return Array.from(plans.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function getPlansByStatus(status: PlanStatus): ExecutionPlan[] {
  return getAllPlans().filter(p => p.status === status);
}

export function getPlanSummaries(): PlanSummary[] {
  return getAllPlans().map(plan => ({
    id: plan.id,
    name: plan.name,
    status: plan.status,
    stepCount: plan.steps.length,
    completedSteps: plan.steps.filter(s => s.status === 'completed').length,
    estimatedDuration: plan.estimatedDuration,
    createdAt: plan.createdAt,
  }));
}

export function updatePlanStatus(planId: string, status: PlanStatus): boolean {
  const plan = plans.get(planId);
  if (!plan) return false;

  plan.status = status;
  plan.updatedAt = new Date();
  return true;
}

export function updateStepStatus(
  planId: string,
  stepId: string,
  status: StepStatus,
  outputs?: Record<string, unknown>
): boolean {
  const plan = plans.get(planId);
  if (!plan) return false;

  const step = plan.steps.find(s => s.id === stepId);
  if (!step) return false;

  step.status = status;
  if (outputs) step.outputs = outputs;

  if (status === 'in_progress') {
    step.startedAt = new Date();
  } else if (status === 'completed' || status === 'failed') {
    step.completedAt = new Date();
  }

  // Update dependent steps
  if (status === 'completed') {
    for (const dependentStep of plan.steps) {
      if (dependentStep.dependsOn.includes(stepId)) {
        const allDepsComplete = dependentStep.dependsOn.every(depId => {
          const dep = plan.steps.find(s => s.id === depId);
          return dep?.status === 'completed';
        });
        if (allDepsComplete && dependentStep.status === 'blocked') {
          dependentStep.status = 'ready';
        }
      }
    }
  }

  plan.updatedAt = new Date();

  // Check if plan is complete
  const allComplete = plan.steps.every(
    s => s.status === 'completed' || s.status === 'skipped'
  );
  if (allComplete) {
    plan.status = 'completed';
  }

  return true;
}

export function getNextReadySteps(planId: string): ExecutionStep[] {
  const plan = plans.get(planId);
  if (!plan || plan.status !== 'ready' && plan.status !== 'in_progress') {
    return [];
  }

  return plan.steps.filter(s => s.status === 'ready');
}

export function deletePlan(planId: string): boolean {
  return plans.delete(planId);
}

export function archiveCompletedPlans(): number {
  let archived = 0;
  const cutoff = new Date(
    Date.now() - DEFAULT_ORCHESTRATOR_CONFIG.autoArchiveAfterHours * 60 * 60 * 1000
  );

  for (const [id, plan] of plans) {
    if (
      (plan.status === 'completed' || plan.status === 'cancelled') &&
      plan.updatedAt < cutoff
    ) {
      plans.delete(id);
      archived++;
    }
  }

  return archived;
}

export function getOrchestratorStats(): {
  totalPlans: number;
  byStatus: Record<PlanStatus, number>;
  totalSteps: number;
  completedSteps: number;
} {
  const allPlans = getAllPlans();
  const byStatus: Record<PlanStatus, number> = {
    draft: 0,
    ready: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  let totalSteps = 0;
  let completedSteps = 0;

  for (const plan of allPlans) {
    byStatus[plan.status]++;
    totalSteps += plan.steps.length;
    completedSteps += plan.steps.filter(s => s.status === 'completed').length;
  }

  return {
    totalPlans: allPlans.length,
    byStatus,
    totalSteps,
    completedSteps,
  };
}
