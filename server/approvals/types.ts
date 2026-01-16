/**
 * Approval & Workflow Types
 * Feature flag: ENABLE_APPROVAL_WORKFLOWS
 */

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "escalated"
  | "expired";

export type RequestType =
  | "publish"
  | "unpublish"
  | "delete"
  | "update"
  | "regenerate"
  | "bulk_update";

export type ApproverType = "user" | "role" | "team";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface ApprovalRequest {
  id: string;
  requestType: RequestType;
  resourceType: string;
  resourceId: string;
  requesterId: string;
  currentStep: number;
  totalSteps: number;
  status: ApprovalStatus;
  priority: Priority;
  reason?: string;
  metadata?: Record<string, unknown>;
  escalatedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalStep {
  id: string;
  requestId: string;
  stepNumber: number;
  approverType: ApproverType;
  approverId?: string;
  approverRole?: string;
  status: ApprovalStatus;
  decision?: "approved" | "rejected";
  decisionReason?: string;
  decidedBy?: string;
  decidedAt?: Date;
  autoApproveAt?: Date;
  createdAt: Date;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  condition: WorkflowCondition;
  steps: WorkflowStepConfig[];
  priority: number;
  isActive: boolean;
}

export interface WorkflowCondition {
  resourceType?: string;
  requestType?: RequestType;
  contentType?: string;
  minScore?: number;
  maxScore?: number;
  requiresAdmin?: boolean;
  customField?: string;
  customValue?: unknown;
}

export interface WorkflowStepConfig {
  stepNumber: number;
  name: string;
  approverType: ApproverType;
  approverId?: string;
  approverRole?: string;
  autoApproveHours?: number;
  notifyOnPending: boolean;
}

export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
  decidedBy: string;
}

export interface ApprovalResult {
  success: boolean;
  requestId: string;
  status: ApprovalStatus;
  currentStep: number;
  totalSteps: number;
  message: string;
  nextApprovers?: string[];
}

console.log("[Approvals] Types loaded");
