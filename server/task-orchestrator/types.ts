/**
 * Autonomous Task Orchestrator - Types
 * Turns insights into ordered, executable work plans
 */

export interface ExecutionPlan {
  id: string;
  name: string;
  description: string;
  status: PlanStatus;
  priority: number;
  steps: ExecutionStep[];
  dependencies: PlanDependency[];
  estimatedDuration: number; // minutes
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export type PlanStatus = 'draft' | 'ready' | 'in_progress' | 'completed' | 'cancelled';

export interface ExecutionStep {
  id: string;
  order: number;
  taskId: string;
  taskType: string;
  targetId: string;
  action: StepAction;
  status: StepStatus;
  dependsOn: string[];
  estimatedDuration: number; // minutes
  priority: number;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  startedAt: Date | null;
  completedAt: Date | null;
}

export type StepAction =
  | 'create_content'
  | 'update_content'
  | 'generate_aeo'
  | 'add_links'
  | 'refresh_entities'
  | 'optimize_seo'
  | 'review_flag'
  | 'enrich_data';

export type StepStatus = 'pending' | 'ready' | 'blocked' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export interface PlanDependency {
  stepId: string;
  dependsOnStepId: string;
  type: DependencyType;
}

export type DependencyType = 'sequential' | 'parallel' | 'optional';

export interface PlanGenerationContext {
  priorities: Array<{
    targetId: string;
    priorityScore: number;
    primaryReason: string;
  }>;
  tasks: Array<{
    id: string;
    type: string;
    targetContentId?: string;
    targetEntity?: string;
    priority: string;
  }>;
  constraints: PlanConstraints;
}

export interface PlanConstraints {
  maxSteps: number;
  maxDuration: number; // minutes
  allowParallel: boolean;
  priorityThreshold: number;
  excludeTaskTypes?: string[];
}

export interface OrchestratorConfig {
  enabled: boolean;
  maxPlansInMemory: number;
  defaultMaxSteps: number;
  defaultMaxDuration: number;
  parallelExecutionEnabled: boolean;
  autoArchiveAfterHours: number;
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  enabled: false,
  maxPlansInMemory: 50,
  defaultMaxSteps: 20,
  defaultMaxDuration: 480, // 8 hours
  parallelExecutionEnabled: true,
  autoArchiveAfterHours: 24,
};

export const DEFAULT_CONSTRAINTS: PlanConstraints = {
  maxSteps: 20,
  maxDuration: 480,
  allowParallel: true,
  priorityThreshold: 30,
};

export interface PlanSummary {
  id: string;
  name: string;
  status: PlanStatus;
  stepCount: number;
  completedSteps: number;
  estimatedDuration: number;
  createdAt: Date;
}
