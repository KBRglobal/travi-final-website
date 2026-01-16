/**
 * Autonomous Task Orchestrator - Planner
 * Generates execution plans from tasks and priorities
 */

import {
  ExecutionPlan,
  ExecutionStep,
  PlanDependency,
  StepAction,
  PlanGenerationContext,
  PlanConstraints,
  DEFAULT_CONSTRAINTS,
} from './types';

function generatePlanId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Map task types to step actions
const taskToActionMap: Record<string, StepAction> = {
  create_content: 'create_content',
  enrich_entity: 'enrich_data',
  add_internal_links: 'add_links',
  improve_aeo: 'generate_aeo',
  update_stale_content: 'update_content',
  optimize_conversion: 'optimize_seo',
  fill_content_gap: 'create_content',
  rescue_orphan: 'add_links',
};

// Estimated duration per action type (minutes)
const actionDurations: Record<StepAction, number> = {
  create_content: 60,
  update_content: 30,
  generate_aeo: 15,
  add_links: 10,
  refresh_entities: 20,
  optimize_seo: 25,
  review_flag: 5,
  enrich_data: 20,
};

// Dependency rules: which actions should come before others
const dependencyRules: Record<StepAction, StepAction[]> = {
  create_content: [],
  update_content: [],
  generate_aeo: ['create_content', 'update_content'],
  add_links: ['create_content', 'update_content'],
  refresh_entities: ['create_content', 'update_content'],
  optimize_seo: ['generate_aeo', 'add_links'],
  review_flag: [],
  enrich_data: ['create_content'],
};

function determineAction(taskType: string): StepAction {
  return taskToActionMap[taskType] || 'review_flag';
}

function findDependencies(
  step: ExecutionStep,
  allSteps: ExecutionStep[]
): string[] {
  const action = step.action;
  const requiredActions = dependencyRules[action] || [];

  return allSteps
    .filter(
      s =>
        s.id !== step.id &&
        s.targetId === step.targetId &&
        requiredActions.includes(s.action)
    )
    .map(s => s.id);
}

export function generatePlan(
  context: PlanGenerationContext,
  name?: string
): ExecutionPlan {
  const constraints = context.constraints || DEFAULT_CONSTRAINTS;
  const steps: ExecutionStep[] = [];

  // Combine priorities and tasks
  const priorityMap = new Map<string, number>();
  for (const priority of context.priorities) {
    priorityMap.set(priority.targetId, priority.priorityScore);
  }

  // Convert tasks to steps
  const eligibleTasks = context.tasks
    .filter(task => {
      const targetId = task.targetContentId || task.targetEntity;
      if (!targetId) return false;

      const priority = priorityMap.get(targetId) || 0;
      return priority >= constraints.priorityThreshold;
    })
    .slice(0, constraints.maxSteps);

  let order = 1;
  let totalDuration = 0;

  for (const task of eligibleTasks) {
    const targetId = task.targetContentId || task.targetEntity || '';
    const action = determineAction(task.type);
    const duration = actionDurations[action];

    if (totalDuration + duration > constraints.maxDuration) {
      break;
    }

    const step: ExecutionStep = {
      id: generateStepId(),
      order,
      taskId: task.id,
      taskType: task.type,
      targetId,
      action,
      status: 'pending',
      dependsOn: [],
      estimatedDuration: duration,
      priority: priorityMap.get(targetId) || 50,
      inputs: {
        taskType: task.type,
        originalPriority: task.priority,
      },
      outputs: undefined,
      startedAt: null,
      completedAt: null,
    };

    steps.push(step);
    totalDuration += duration;
    order++;
  }

  // Build dependencies
  const dependencies: PlanDependency[] = [];
  for (const step of steps) {
    const deps = findDependencies(step, steps);
    step.dependsOn = deps;

    for (const depStepId of deps) {
      dependencies.push({
        stepId: step.id,
        dependsOnStepId: depStepId,
        type: 'sequential',
      });
    }
  }

  // Update step statuses based on dependencies
  for (const step of steps) {
    if (step.dependsOn.length === 0) {
      step.status = 'ready';
    } else {
      step.status = 'blocked';
    }
  }

  // Sort steps by dependency order
  const sortedSteps = topologicalSort(steps);

  // Reassign order numbers
  sortedSteps.forEach((step, idx) => {
    step.order = idx + 1;
  });

  return {
    id: generatePlanId(),
    name: name || `Execution Plan ${new Date().toISOString().split('T')[0]}`,
    description: `Auto-generated plan with ${steps.length} steps`,
    status: 'ready',
    priority: Math.max(...steps.map(s => s.priority), 0),
    steps: sortedSteps,
    dependencies,
    estimatedDuration: totalDuration,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      constraints,
      taskCount: context.tasks.length,
      priorityCount: context.priorities.length,
    },
  };
}

function topologicalSort(steps: ExecutionStep[]): ExecutionStep[] {
  const result: ExecutionStep[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const stepMap = new Map(steps.map(s => [s.id, s]));

  function visit(stepId: string): void {
    if (visited.has(stepId)) return;
    if (visiting.has(stepId)) {
      // Circular dependency - skip
      return;
    }

    visiting.add(stepId);
    const step = stepMap.get(stepId);
    if (step) {
      for (const depId of step.dependsOn) {
        visit(depId);
      }
      visited.add(stepId);
      visiting.delete(stepId);
      result.push(step);
    }
  }

  for (const step of steps) {
    visit(step.id);
  }

  return result;
}

export function optimizePlan(plan: ExecutionPlan): ExecutionPlan {
  const optimized = { ...plan, steps: [...plan.steps] };

  // Group parallel-executable steps
  const parallelGroups: ExecutionStep[][] = [];
  let currentGroup: ExecutionStep[] = [];

  for (const step of optimized.steps) {
    if (step.dependsOn.length === 0 ||
        step.dependsOn.every(depId =>
          optimized.steps.find(s => s.id === depId)?.status === 'completed'
        )) {
      currentGroup.push(step);
    } else {
      if (currentGroup.length > 0) {
        parallelGroups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(step);
    }
  }

  if (currentGroup.length > 0) {
    parallelGroups.push(currentGroup);
  }

  // Estimate optimized duration (parallel steps counted once)
  let optimizedDuration = 0;
  for (const group of parallelGroups) {
    optimizedDuration += Math.max(...group.map(s => s.estimatedDuration));
  }

  optimized.estimatedDuration = optimizedDuration;
  optimized.metadata = {
    ...optimized.metadata,
    parallelGroups: parallelGroups.length,
    optimized: true,
  };

  return optimized;
}

export function validatePlan(plan: ExecutionPlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (plan.steps.length === 0) {
    errors.push('Plan has no steps');
  }

  // Check for circular dependencies
  const stepIds = new Set(plan.steps.map(s => s.id));
  for (const step of plan.steps) {
    for (const depId of step.dependsOn) {
      if (!stepIds.has(depId)) {
        errors.push(`Step ${step.id} depends on non-existent step ${depId}`);
      }
    }
  }

  // Check for missing targets
  for (const step of plan.steps) {
    if (!step.targetId) {
      errors.push(`Step ${step.id} has no target`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
