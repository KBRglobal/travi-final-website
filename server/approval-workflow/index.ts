/**
 * Draft Review & Approval Workflow
 *
 * Feature flag: ENABLE_APPROVAL_WORKFLOW=true
 */

export { isApprovalWorkflowEnabled } from './types';
export type {
  WorkflowStage,
  TransitionAction,
  WorkflowConfig,
  ContentWorkflowState,
  Approval,
  Rejection,
  ChangeRequest,
  WorkflowEvent,
  TransitionResult,
} from './types';

export {
  initializeWorkflow,
  getWorkflowState,
  transitionWorkflow,
  addApproval,
  addRejection,
  requestChanges,
  resolveChangeRequest,
  getPendingReviews,
  getContentByStage,
  getWorkflowConfig,
  updateWorkflowConfig,
  getWorkflowStats,
} from './workflow-engine';

export { workflowRoutes } from './routes';
