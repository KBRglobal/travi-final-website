/**
 * Approval Workflow Engine
 *
 * @deprecated This file has been consolidated into ../workflows/unified-workflow-engine.ts (2026-01-01)
 * Please use: import { unifiedWorkflowEngine } from '../workflows/unified-workflow-engine'
 * Migration: unifiedWorkflowEngine.approval provides the same interface
 *
 * This file will be removed in a future release.
 *
 * Feature flag: ENABLE_APPROVAL_WORKFLOWS
 */

import { db } from "../db";
import { approvalRequests, approvalSteps } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  ApprovalRequest,
  ApprovalStep,
  ApprovalStatus,
  RequestType,
  Priority,
  ApprovalResult,
  ApprovalDecision,
} from "./types";
import { findMatchingRule, RuleMatchContext } from "./rules";
import {
  canTransition,
  validateTransition,
  isTerminalState,
  TransitionContext,
} from "./state-machine";

function isEnabled(): boolean {
  return process.env.ENABLE_APPROVAL_WORKFLOWS === "true";
}

/**
 * Create a new approval request
 * @deprecated Use unifiedWorkflowEngine.approval.createApprovalRequest instead
 */
export async function createApprovalRequest(
  requestType: RequestType,
  resourceType: string,
  resourceId: string,
  requesterId: string,
  options: {
    reason?: string;
    priority?: Priority;
    metadata?: Record<string, unknown>;
    contentType?: string;
    score?: number;
  } = {}
): Promise<ApprovalResult> {
  if (!isEnabled()) {
    return {
      success: true,
      requestId: "auto-approved",
      status: "approved",
      currentStep: 1,
      totalSteps: 1,
      message: "Approval workflows disabled - auto approved",
    };
  }

  // Find matching workflow rule
  const context: RuleMatchContext = {
    requestType,
    resourceType,
    contentType: options.contentType,
    score: options.score,
    metadata: options.metadata,
  };

  const rule = findMatchingRule(context);
  if (!rule) {
    // No rule = auto approve
    return {
      success: true,
      requestId: "no-rule-auto-approved",
      status: "approved",
      currentStep: 1,
      totalSteps: 1,
      message: "No approval rule matched - auto approved",
    };
  }

  // Calculate expiry if steps have auto-approve
  let expiresAt: Date | undefined;
  const firstStepAutoApprove = rule.steps[0]?.autoApproveHours;
  if (firstStepAutoApprove) {
    expiresAt = new Date(Date.now() + firstStepAutoApprove * 60 * 60 * 1000);
  }

  // Create the request
  const [request] = await db
    .insert(approvalRequests)
    .values({
      requestType,
      resourceType,
      resourceId,
      requesterId,
      currentStep: 1,
      totalSteps: rule.steps.length,
      status: "pending",
      priority: options.priority || "normal",
      reason: options.reason,
      metadata: options.metadata,
      expiresAt,
    } as any)
    .returning();

  // Create approval steps
  for (const stepConfig of rule.steps) {
    let autoApproveAt: Date | undefined;
    if (stepConfig.autoApproveHours) {
      autoApproveAt = new Date(
        Date.now() + stepConfig.autoApproveHours * 60 * 60 * 1000
      );
    }

    await db.insert(approvalSteps).values({
      requestId: request.id,
      stepNumber: stepConfig.stepNumber,
      approverType: stepConfig.approverType,
      approverId: stepConfig.approverId,
      approverRole: stepConfig.approverRole,
      status: stepConfig.stepNumber === 1 ? "pending" : "pending",
      autoApproveAt,
    } as any);
  }

  return {
    success: true,
    requestId: request.id,
    status: "pending",
    currentStep: 1,
    totalSteps: rule.steps.length,
    message: `Approval request created with ${rule.steps.length} step(s)`,
  };
}

/**
 * Process an approval decision
 * @deprecated Use unifiedWorkflowEngine.approval.processDecision instead
 */
export async function processDecision(
  requestId: string,
  decision: ApprovalDecision
): Promise<ApprovalResult> {
  if (!isEnabled()) {
    return {
      success: false,
      requestId,
      status: "pending",
      currentStep: 0,
      totalSteps: 0,
      message: "Approval workflows disabled",
    };
  }

  // Get the request
  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, requestId))
    .limit(1);

  if (!request) {
    return {
      success: false,
      requestId,
      status: "pending",
      currentStep: 0,
      totalSteps: 0,
      message: "Request not found",
    };
  }

  if (isTerminalState(request.status as ApprovalStatus)) {
    return {
      success: false,
      requestId,
      status: request.status as ApprovalStatus,
      currentStep: request.currentStep,
      totalSteps: request.totalSteps,
      message: `Request already in terminal state: ${request.status}`,
    };
  }

  // Get current step
  const [currentStep] = await db
    .select()
    .from(approvalSteps)
    .where(
      and(
        eq(approvalSteps.requestId, requestId),
        eq(approvalSteps.stepNumber, request.currentStep)
      )
    )
    .limit(1);

  if (!currentStep) {
    return {
      success: false,
      requestId,
      status: request.status as ApprovalStatus,
      currentStep: request.currentStep,
      totalSteps: request.totalSteps,
      message: "Current step not found",
    };
  }

  const now = new Date();

  if (decision.approved) {
    // Approve the current step
    await db
      .update(approvalSteps)
      .set({
        status: "approved",
        decision: "approved",
        decisionReason: decision.reason,
        decidedBy: decision.decidedBy,
        decidedAt: now,
      } as any)
      .where(eq(approvalSteps.id, currentStep.id));

    // Check if this was the last step
    if (request.currentStep >= request.totalSteps) {
      // All steps approved
      await db
        .update(approvalRequests)
        .set({
          status: "approved",
          updatedAt: now,
        } as any)
        .where(eq(approvalRequests.id, requestId));

      return {
        success: true,
        requestId,
        status: "approved",
        currentStep: request.currentStep,
        totalSteps: request.totalSteps,
        message: "All steps approved - request approved",
      };
    }

    // Move to next step
    const nextStep = request.currentStep + 1;
    await db
      .update(approvalRequests)
      .set({
        currentStep: nextStep,
        updatedAt: now,
      } as any)
      .where(eq(approvalRequests.id, requestId));

    return {
      success: true,
      requestId,
      status: "pending",
      currentStep: nextStep,
      totalSteps: request.totalSteps,
      message: `Step ${request.currentStep} approved - moved to step ${nextStep}`,
    };
  } else {
    // Reject
    await db
      .update(approvalSteps)
      .set({
        status: "rejected",
        decision: "rejected",
        decisionReason: decision.reason,
        decidedBy: decision.decidedBy,
        decidedAt: now,
      } as any)
      .where(eq(approvalSteps.id, currentStep.id));

    await db
      .update(approvalRequests)
      .set({
        status: "rejected",
        updatedAt: now,
      } as any)
      .where(eq(approvalRequests.id, requestId));

    return {
      success: true,
      requestId,
      status: "rejected",
      currentStep: request.currentStep,
      totalSteps: request.totalSteps,
      message: `Request rejected at step ${request.currentStep}`,
    };
  }
}

/**
 * Cancel an approval request
 * @deprecated Use unifiedWorkflowEngine.approval.cancelRequest instead
 */
export async function cancelRequest(
  requestId: string,
  cancelledBy: string,
  reason?: string
): Promise<ApprovalResult> {
  if (!isEnabled()) {
    return {
      success: false,
      requestId,
      status: "pending",
      currentStep: 0,
      totalSteps: 0,
      message: "Approval workflows disabled",
    };
  }

  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, requestId))
    .limit(1);

  if (!request) {
    return {
      success: false,
      requestId,
      status: "pending",
      currentStep: 0,
      totalSteps: 0,
      message: "Request not found",
    };
  }

  if (isTerminalState(request.status as ApprovalStatus)) {
    return {
      success: false,
      requestId,
      status: request.status as ApprovalStatus,
      currentStep: request.currentStep,
      totalSteps: request.totalSteps,
      message: `Cannot cancel - already in state: ${request.status}`,
    };
  }

  await db
    .update(approvalRequests)
    .set({
      status: "cancelled",
      metadata: {
        ...(request.metadata as Record<string, unknown>),
        cancelledBy,
        cancelReason: reason,
      },
      updatedAt: new Date(),
    } as any)
    .where(eq(approvalRequests.id, requestId));

  return {
    success: true,
    requestId,
    status: "cancelled",
    currentStep: request.currentStep,
    totalSteps: request.totalSteps,
    message: "Request cancelled",
  };
}

/**
 * Get pending approvals for a user/role
 * @deprecated Use unifiedWorkflowEngine.approval.getPendingApprovals instead
 */
export async function getPendingApprovals(
  approverRole?: string,
  approverId?: string
): Promise<ApprovalRequest[]> {
  if (!isEnabled()) return [];

  const requests = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.status, "pending"))
    .orderBy(desc(approvalRequests.createdAt));

  return requests as unknown as ApprovalRequest[];
}

/**
 * Get request details
 * @deprecated Use unifiedWorkflowEngine.approval.getRequestDetails instead
 */
export async function getRequestDetails(requestId: string): Promise<{
  request: ApprovalRequest;
  steps: ApprovalStep[];
} | null> {
  if (!isEnabled()) return null;

  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, requestId))
    .limit(1);

  if (!request) return null;

  const steps = await db
    .select()
    .from(approvalSteps)
    .where(eq(approvalSteps.requestId, requestId))
    .orderBy(approvalSteps.stepNumber);

  return {
    request: request as unknown as ApprovalRequest,
    steps: steps as unknown as ApprovalStep[],
  };
}

console.log("[Approvals] WorkflowEngine loaded");
