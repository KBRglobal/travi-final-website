/**
 * Draft Review & Approval Workflow - Type Definitions
 *
 * Feature flag: ENABLE_APPROVAL_WORKFLOW=true
 */

export function isApprovalWorkflowEnabled(): boolean {
  return process.env.ENABLE_APPROVAL_WORKFLOW === 'true';
}

/**
 * Workflow stages.
 */
export type WorkflowStage =
  | 'draft'
  | 'pending_review'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'published';

/**
 * Transition actions.
 */
export type TransitionAction =
  | 'submit_for_review'
  | 'start_review'
  | 'request_changes'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'unpublish'
  | 'revert_to_draft';

/**
 * Workflow configuration.
 */
export interface WorkflowConfig {
  id: string;
  name: string;
  stages: WorkflowStage[];
  requiresApproval: boolean;
  minApprovals: number;
  autoPublishOnApproval: boolean;
  allowSelfApproval: boolean;
  reviewerRoles: string[];
}

/**
 * Content workflow state.
 */
export interface ContentWorkflowState {
  contentId: string;
  currentStage: WorkflowStage;
  previousStage?: WorkflowStage;
  submittedBy?: string;
  submittedAt?: Date;
  assignedReviewer?: string;
  assignedAt?: Date;
  approvals: Approval[];
  rejections: Rejection[];
  changeRequests: ChangeRequest[];
  history: WorkflowEvent[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Approval record.
 */
export interface Approval {
  id: string;
  reviewerId: string;
  comment?: string;
  approvedAt: Date;
}

/**
 * Rejection record.
 */
export interface Rejection {
  id: string;
  reviewerId: string;
  reason: string;
  rejectedAt: Date;
}

/**
 * Change request.
 */
export interface ChangeRequest {
  id: string;
  reviewerId: string;
  comments: string;
  priority: 'low' | 'medium' | 'high';
  resolved: boolean;
  requestedAt: Date;
  resolvedAt?: Date;
}

/**
 * Workflow event.
 */
export interface WorkflowEvent {
  id: string;
  action: TransitionAction;
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  performedBy: string;
  comment?: string;
  timestamp: Date;
}

/**
 * Transition result.
 */
export interface TransitionResult {
  success: boolean;
  newState?: ContentWorkflowState;
  error?: string;
}
