/**
 * Draft Review & Approval - Workflow Engine
 *
 * @deprecated This file has been consolidated into ../workflows/unified-workflow-engine.ts (2026-01-01)
 * Please use: import { unifiedWorkflowEngine } from '../workflows/unified-workflow-engine'
 * Migration: unifiedWorkflowEngine.review provides enhanced functionality with database persistence
 *
 * This file will be removed in a future release.
 *
 * IMPORTANT: This implementation uses in-memory storage and will lose data on restart.
 * The unified engine uses database persistence via content metadata for reliability.
 */

import {
  WorkflowStage,
  TransitionAction,
  WorkflowConfig,
  ContentWorkflowState,
  TransitionResult,
  WorkflowEvent,
  Approval,
  Rejection,
  ChangeRequest,
} from './types';

// In-memory stores
const workflowStates = new Map<string, ContentWorkflowState>();
const workflowConfigs = new Map<string, WorkflowConfig>();

// Default workflow config
const DEFAULT_CONFIG: WorkflowConfig = {
  id: 'default',
  name: 'Default Workflow',
  stages: ['draft', 'pending_review', 'in_review', 'approved', 'published'],
  requiresApproval: true,
  minApprovals: 1,
  autoPublishOnApproval: false,
  allowSelfApproval: false,
  reviewerRoles: ['editor', 'reviewer', 'admin'],
};

workflowConfigs.set('default', DEFAULT_CONFIG);

/**
 * Valid transitions map.
 */
const VALID_TRANSITIONS: Record<WorkflowStage, TransitionAction[]> = {
  draft: ['submit_for_review'],
  pending_review: ['start_review', 'revert_to_draft'],
  in_review: ['approve', 'reject', 'request_changes'],
  changes_requested: ['submit_for_review', 'revert_to_draft'],
  approved: ['publish', 'revert_to_draft'],
  rejected: ['revert_to_draft'],
  published: ['unpublish'],
};

/**
 * Get next stage for action.
 */
function getNextStage(current: WorkflowStage, action: TransitionAction): WorkflowStage | null {
  const transitions: Record<TransitionAction, Partial<Record<WorkflowStage, WorkflowStage>>> = {
    submit_for_review: { draft: 'pending_review', changes_requested: 'pending_review' },
    start_review: { pending_review: 'in_review' },
    request_changes: { in_review: 'changes_requested' },
    approve: { in_review: 'approved' },
    reject: { in_review: 'rejected' },
    publish: { approved: 'published' },
    unpublish: { published: 'draft' },
    revert_to_draft: {
      pending_review: 'draft',
      changes_requested: 'draft',
      approved: 'draft',
      rejected: 'draft',
    },
  };

  return transitions[action]?.[current] || null;
}

/**
 * Initialize workflow for content.
 * @deprecated Use unifiedWorkflowEngine.review.initializeWorkflow instead (provides DB persistence)
 */
export function initializeWorkflow(contentId: string): ContentWorkflowState {
  const state: ContentWorkflowState = {
    contentId,
    currentStage: 'draft',
    approvals: [],
    rejections: [],
    changeRequests: [],
    history: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  workflowStates.set(contentId, state);
  return state;
}

/**
 * Get workflow state.
 * @deprecated Use unifiedWorkflowEngine.review.getWorkflowState instead (provides DB persistence)
 */
export function getWorkflowState(contentId: string): ContentWorkflowState | null {
  return workflowStates.get(contentId) || null;
}

/**
 * Transition workflow.
 * @deprecated Use unifiedWorkflowEngine.review.transitionWorkflow instead (provides DB persistence)
 */
export function transitionWorkflow(
  contentId: string,
  action: TransitionAction,
  performedBy: string,
  comment?: string
): TransitionResult {
  let state = workflowStates.get(contentId);

  if (!state) {
    state = initializeWorkflow(contentId);
  }

  // Check if transition is valid
  const validActions = VALID_TRANSITIONS[state.currentStage];
  if (!validActions.includes(action)) {
    return {
      success: false,
      error: `Cannot perform ${action} from ${state.currentStage} stage`,
    };
  }

  const nextStage = getNextStage(state.currentStage, action);
  if (!nextStage) {
    return { success: false, error: 'Invalid transition' };
  }

  // Record event
  const event: WorkflowEvent = {
    id: `evt-${Date.now()}`,
    action,
    fromStage: state.currentStage,
    toStage: nextStage,
    performedBy,
    comment,
    timestamp: new Date(),
  };

  // Update state
  state.previousStage = state.currentStage;
  state.currentStage = nextStage;
  state.history.push(event);
  state.updatedAt = new Date();

  // Handle specific actions
  if (action === 'submit_for_review') {
    state.submittedBy = performedBy;
    state.submittedAt = new Date();
  } else if (action === 'start_review') {
    state.assignedReviewer = performedBy;
    state.assignedAt = new Date();
  }

  workflowStates.set(contentId, state);

  return { success: true, newState: state };
}

/**
 * Add approval.
 * @deprecated Use unifiedWorkflowEngine.review.addApproval instead (provides DB persistence)
 */
export function addApproval(
  contentId: string,
  reviewerId: string,
  comment?: string
): TransitionResult {
  const state = workflowStates.get(contentId);
  if (!state) {
    return { success: false, error: 'Workflow not found' };
  }

  if (state.currentStage !== 'in_review') {
    return { success: false, error: 'Content is not in review' };
  }

  const approval: Approval = {
    id: `apr-${Date.now()}`,
    reviewerId,
    comment,
    approvedAt: new Date(),
  };

  state.approvals.push(approval);

  // Check if we have enough approvals
  const config = workflowConfigs.get('default')!;
  if (state.approvals.length >= config.minApprovals) {
    return transitionWorkflow(contentId, 'approve', reviewerId, comment);
  }

  state.updatedAt = new Date();
  workflowStates.set(contentId, state);

  return { success: true, newState: state };
}

/**
 * Add rejection.
 * @deprecated Use unifiedWorkflowEngine.review.addRejection instead (provides DB persistence)
 */
export function addRejection(
  contentId: string,
  reviewerId: string,
  reason: string
): TransitionResult {
  const state = workflowStates.get(contentId);
  if (!state) {
    return { success: false, error: 'Workflow not found' };
  }

  const rejection: Rejection = {
    id: `rej-${Date.now()}`,
    reviewerId,
    reason,
    rejectedAt: new Date(),
  };

  state.rejections.push(rejection);

  return transitionWorkflow(contentId, 'reject', reviewerId, reason);
}

/**
 * Request changes.
 * @deprecated Use unifiedWorkflowEngine.review.requestChanges instead (provides DB persistence)
 */
export function requestChanges(
  contentId: string,
  reviewerId: string,
  comments: string,
  priority: 'low' | 'medium' | 'high' = 'medium'
): TransitionResult {
  const state = workflowStates.get(contentId);
  if (!state) {
    return { success: false, error: 'Workflow not found' };
  }

  const changeRequest: ChangeRequest = {
    id: `cr-${Date.now()}`,
    reviewerId,
    comments,
    priority,
    resolved: false,
    requestedAt: new Date(),
  };

  state.changeRequests.push(changeRequest);

  return transitionWorkflow(contentId, 'request_changes', reviewerId, comments);
}

/**
 * Resolve change request.
 * @deprecated Use unifiedWorkflowEngine.review.resolveChangeRequest instead (provides DB persistence)
 */
export function resolveChangeRequest(
  contentId: string,
  changeRequestId: string
): boolean {
  const state = workflowStates.get(contentId);
  if (!state) return false;

  const cr = state.changeRequests.find(c => c.id === changeRequestId);
  if (!cr) return false;

  cr.resolved = true;
  cr.resolvedAt = new Date();
  state.updatedAt = new Date();

  workflowStates.set(contentId, state);
  return true;
}

/**
 * Get pending reviews.
 * @deprecated Use unifiedWorkflowEngine.review.getPendingReviews instead (provides DB persistence)
 */
export function getPendingReviews(): ContentWorkflowState[] {
  return Array.from(workflowStates.values())
    .filter(s => s.currentStage === 'pending_review' || s.currentStage === 'in_review');
}

/**
 * Get content by stage.
 * @deprecated Use unifiedWorkflowEngine.review.getContentByStage instead (provides DB persistence)
 */
export function getContentByStage(stage: WorkflowStage): ContentWorkflowState[] {
  return Array.from(workflowStates.values())
    .filter(s => s.currentStage === stage);
}

/**
 * Get workflow config.
 */
export function getWorkflowConfig(configId: string = 'default'): WorkflowConfig | null {
  return workflowConfigs.get(configId) || null;
}

/**
 * Update workflow config.
 */
export function updateWorkflowConfig(
  configId: string,
  updates: Partial<WorkflowConfig>
): WorkflowConfig | null {
  const existing = workflowConfigs.get(configId);
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  workflowConfigs.set(configId, updated);
  return updated;
}

/**
 * Get workflow stats.
 */
export function getWorkflowStats(): Record<WorkflowStage, number> {
  const stats: Record<WorkflowStage, number> = {
    draft: 0,
    pending_review: 0,
    in_review: 0,
    changes_requested: 0,
    approved: 0,
    rejected: 0,
    published: 0,
  };

  for (const state of workflowStates.values()) {
    stats[state.currentStage]++;
  }

  return stats;
}
