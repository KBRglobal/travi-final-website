/**
 * Action Synthesizer
 *
 * Generates executable action plans from prioritized candidates.
 */

import { randomUUID } from 'crypto';
import type { ActionCandidate, ActionType } from '../prioritization/types';
import type {
  ActionPlan,
  ExecutionStep,
  StepType,
  SynthesisOptions,
  PlanSummary,
} from './types';
import { isActionsEnabled, getGrowthOSConfig } from '../config';
import { log } from '../../lib/logger';

/**
 * Step templates by action type
 */
const STEP_TEMPLATES: Record<ActionType, Array<{ type: StepType; name: string; required: boolean; canRollback: boolean }>> = {
  content_update: [
    { type: 'validation', name: 'Validate content exists', required: true, canRollback: false },
    { type: 'backup', name: 'Create content backup', required: false, canRollback: false },
    { type: 'execution', name: 'Update content', required: true, canRollback: true },
    { type: 'verification', name: 'Verify changes', required: false, canRollback: false },
    { type: 'notification', name: 'Send update notification', required: false, canRollback: false },
  ],
  content_create: [
    { type: 'validation', name: 'Validate content data', required: true, canRollback: false },
    { type: 'preparation', name: 'Prepare content structure', required: true, canRollback: false },
    { type: 'execution', name: 'Create content', required: true, canRollback: true },
    { type: 'verification', name: 'Verify content created', required: true, canRollback: false },
    { type: 'notification', name: 'Send creation notification', required: false, canRollback: false },
  ],
  content_archive: [
    { type: 'validation', name: 'Validate content can be archived', required: true, canRollback: false },
    { type: 'backup', name: 'Create archive backup', required: true, canRollback: false },
    { type: 'execution', name: 'Archive content', required: true, canRollback: true },
    { type: 'cleanup', name: 'Update references', required: false, canRollback: false },
  ],
  media_optimize: [
    { type: 'validation', name: 'Validate media asset', required: true, canRollback: false },
    { type: 'backup', name: 'Backup original media', required: true, canRollback: false },
    { type: 'execution', name: 'Optimize media', required: true, canRollback: true },
    { type: 'verification', name: 'Verify optimization quality', required: true, canRollback: false },
  ],
  media_replace: [
    { type: 'validation', name: 'Validate replacement media', required: true, canRollback: false },
    { type: 'backup', name: 'Backup original media', required: true, canRollback: false },
    { type: 'preparation', name: 'Prepare replacement', required: true, canRollback: false },
    { type: 'execution', name: 'Replace media', required: true, canRollback: true },
    { type: 'verification', name: 'Verify replacement', required: true, canRollback: false },
    { type: 'cleanup', name: 'Update media references', required: true, canRollback: true },
  ],
  seo_fix: [
    { type: 'validation', name: 'Validate SEO issue', required: true, canRollback: false },
    { type: 'backup', name: 'Backup SEO metadata', required: false, canRollback: false },
    { type: 'execution', name: 'Apply SEO fix', required: true, canRollback: true },
    { type: 'verification', name: 'Verify SEO improvement', required: false, canRollback: false },
  ],
  aeo_enhance: [
    { type: 'validation', name: 'Validate AEO opportunity', required: true, canRollback: false },
    { type: 'backup', name: 'Backup content structure', required: false, canRollback: false },
    { type: 'execution', name: 'Apply AEO enhancement', required: true, canRollback: true },
    { type: 'verification', name: 'Verify AEO markup', required: true, canRollback: false },
  ],
  ux_improvement: [
    { type: 'validation', name: 'Validate UX change', required: true, canRollback: false },
    { type: 'backup', name: 'Backup current state', required: true, canRollback: false },
    { type: 'preparation', name: 'Prepare UX changes', required: true, canRollback: false },
    { type: 'execution', name: 'Apply UX improvement', required: true, canRollback: true },
    { type: 'verification', name: 'Verify UX improvement', required: true, canRollback: false },
  ],
  revenue_action: [
    { type: 'validation', name: 'Validate revenue action', required: true, canRollback: false },
    { type: 'backup', name: 'Backup monetization config', required: true, canRollback: false },
    { type: 'execution', name: 'Apply revenue action', required: true, canRollback: true },
    { type: 'verification', name: 'Verify revenue setup', required: true, canRollback: false },
    { type: 'notification', name: 'Notify revenue team', required: false, canRollback: false },
  ],
  ops_remediation: [
    { type: 'validation', name: 'Validate ops issue', required: true, canRollback: false },
    { type: 'backup', name: 'Backup system state', required: true, canRollback: false },
    { type: 'preparation', name: 'Prepare remediation', required: true, canRollback: false },
    { type: 'execution', name: 'Apply remediation', required: true, canRollback: true },
    { type: 'verification', name: 'Verify system health', required: true, canRollback: false },
    { type: 'notification', name: 'Notify ops team', required: true, canRollback: false },
  ],
  governance_compliance: [
    { type: 'validation', name: 'Validate compliance requirement', required: true, canRollback: false },
    { type: 'backup', name: 'Backup current policy', required: true, canRollback: false },
    { type: 'execution', name: 'Apply compliance update', required: true, canRollback: true },
    { type: 'verification', name: 'Verify compliance', required: true, canRollback: false },
    { type: 'notification', name: 'Notify compliance team', required: true, canRollback: false },
  ],
};

/**
 * Default step durations by type (seconds)
 */
const DEFAULT_STEP_DURATIONS: Record<StepType, number> = {
  validation: 2,
  backup: 5,
  preparation: 10,
  execution: 30,
  verification: 5,
  notification: 2,
  cleanup: 10,
};

/**
 * Create execution step
 */
function createStep(
  template: { type: StepType; name: string; required: boolean; canRollback: boolean },
  description: string
): ExecutionStep {
  return {
    id: randomUUID(),
    type: template.type,
    name: template.name,
    description,
    status: 'pending',
    required: template.required,
    canRollback: template.canRollback,
    estimatedDurationSeconds: DEFAULT_STEP_DURATIONS[template.type],
    actualDurationSeconds: null,
    error: null,
    output: {},
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Synthesize action plan from candidate
 */
export function synthesizePlan(
  candidate: ActionCandidate,
  options: SynthesisOptions = {}
): ActionPlan {
  const templates = STEP_TEMPLATES[candidate.type] || STEP_TEMPLATES.content_update;

  // Filter templates based on options
  let filteredTemplates = [...templates];

  if (!options.includeBackup) {
    filteredTemplates = filteredTemplates.filter(t => t.type !== 'backup');
  }

  if (!options.includeVerification) {
    filteredTemplates = filteredTemplates.filter(t => t.type !== 'verification');
  }

  if (options.maxSteps && filteredTemplates.length > options.maxSteps) {
    // Keep required steps, trim optional ones
    const required = filteredTemplates.filter(t => t.required);
    const optional = filteredTemplates.filter(t => !t.required);
    filteredTemplates = [
      ...required,
      ...optional.slice(0, options.maxSteps - required.length),
    ];
  }

  // Create steps
  const steps = filteredTemplates.map((template, idx) =>
    createStep(template, `Step ${idx + 1}: ${template.name} for ${candidate.title}`)
  );

  // Calculate total estimated duration
  const estimatedDurationSeconds = steps.reduce(
    (sum, step) => sum + step.estimatedDurationSeconds,
    0
  );

  // Determine if auto-executable
  const autoExecutable =
    candidate.reversibility !== 'irreversible' &&
    candidate.complexity !== 'expert' &&
    candidate.dimensions.risk < 50;

  // Determine if approval required
  const requiresApproval =
    options.requireApproval !== false &&
    (candidate.dimensions.risk >= 60 ||
      candidate.reversibility === 'irreversible' ||
      candidate.complexity === 'expert');

  return {
    id: randomUUID(),
    candidateId: candidate.id,
    actionType: candidate.type,
    title: candidate.title,
    description: candidate.description,
    status: 'draft',
    steps,
    currentStepIndex: 0,
    autoExecutable,
    requiresApproval,
    approved: false,
    approvedBy: null,
    approvedAt: null,
    entityType: candidate.entityType,
    entityId: candidate.entityId,
    contentIds: candidate.contentIds,
    estimatedDurationSeconds,
    rollbackPlanId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    metadata: {
      sourceCandidate: candidate,
      synthesisOptions: options,
    },
  };
}

/**
 * Synthesize plans for multiple candidates
 */
export function synthesizePlans(
  candidates: ActionCandidate[],
  options: SynthesisOptions = {}
): ActionPlan[] {
  if (!isActionsEnabled()) return [];

  const config = getGrowthOSConfig();
  const plans: ActionPlan[] = [];

  for (const candidate of candidates.slice(0, config.maxActionCandidates)) {
    try {
      const plan = synthesizePlan(candidate, options);
      plans.push(plan);
    } catch (error) {
      log.error(`[GrowthOS] Failed to synthesize plan for ${candidate.id}:`, error);
    }
  }

  return plans;
}

/**
 * Approve a plan
 */
export function approvePlan(plan: ActionPlan, approvedBy: string): ActionPlan {
  return {
    ...plan,
    approved: true,
    approvedBy,
    approvedAt: new Date(),
    status: 'ready',
    updatedAt: new Date(),
  };
}

/**
 * Mark plan ready for execution
 */
export function markReady(plan: ActionPlan): ActionPlan {
  if (plan.requiresApproval && !plan.approved) {
    throw new Error('Plan requires approval before marking ready');
  }

  return {
    ...plan,
    status: 'ready',
    updatedAt: new Date(),
  };
}

/**
 * Cancel a plan
 */
export function cancelPlan(plan: ActionPlan, reason: string): ActionPlan {
  return {
    ...plan,
    status: 'cancelled',
    updatedAt: new Date(),
    metadata: {
      ...plan.metadata,
      cancellationReason: reason,
      cancelledAt: new Date(),
    },
  };
}

/**
 * Get plan summary
 */
export function getPlanSummary(plan: ActionPlan): PlanSummary {
  const stepsCompleted = plan.steps.filter(s => s.status === 'completed').length;

  return {
    id: plan.id,
    title: plan.title,
    actionType: plan.actionType,
    status: plan.status,
    stepsCompleted,
    totalSteps: plan.steps.length,
    estimatedDurationSeconds: plan.estimatedDurationSeconds,
    approved: plan.approved,
    requiresApproval: plan.requiresApproval,
    createdAt: plan.createdAt,
  };
}

/**
 * Plan storage (in-memory, bounded)
 */
class PlanRegistry {
  private plans: Map<string, ActionPlan> = new Map();
  private maxPlans = 500;

  add(plan: ActionPlan): void {
    // Evict oldest if at capacity
    if (this.plans.size >= this.maxPlans) {
      const oldest = [...this.plans.values()].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )[0];
      if (oldest) {
        this.plans.delete(oldest.id);
      }
    }

    this.plans.set(plan.id, plan);
  }

  get(id: string): ActionPlan | undefined {
    return this.plans.get(id);
  }

  update(plan: ActionPlan): void {
    if (this.plans.has(plan.id)) {
      this.plans.set(plan.id, plan);
    }
  }

  delete(id: string): boolean {
    return this.plans.delete(id);
  }

  getByStatus(status: ActionPlan['status']): ActionPlan[] {
    return [...this.plans.values()].filter(p => p.status === status);
  }

  getAll(): ActionPlan[] {
    return [...this.plans.values()];
  }

  getPending(): ActionPlan[] {
    return this.getByStatus('draft').concat(this.getByStatus('ready'));
  }

  getActive(): ActionPlan[] {
    return this.getByStatus('executing');
  }

  clear(): void {
    this.plans.clear();
  }

  get size(): number {
    return this.plans.size;
  }
}

export const planRegistry = new PlanRegistry();

/**
 * Estimate batch execution time
 */
export function estimateBatchDuration(plans: ActionPlan[]): number {
  return plans.reduce((sum, plan) => sum + plan.estimatedDurationSeconds, 0);
}

/**
 * Get plans ready for execution
 */
export function getReadyPlans(): ActionPlan[] {
  return planRegistry.getByStatus('ready');
}

/**
 * Get plans requiring approval
 */
export function getPendingApproval(): ActionPlan[] {
  return planRegistry
    .getByStatus('draft')
    .filter(p => p.requiresApproval && !p.approved);
}
