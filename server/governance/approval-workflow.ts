/**
 * Approval Workflow Engine
 * Multi-step approval workflows with escalation
 */

import { db } from "../db";
import {
  approvalRequests,
  approvalSteps,
  users,
  userRoleAssignments,
  governanceRoles,
} from "@shared/schema";
import { eq, and, inArray, sql, or } from "drizzle-orm";
import {
  ApprovalWorkflow,
  ApprovalWorkflowStep,
  ApprovalRequest,
  ApprovalStepRecord,
  ApprovalStatus,
  ApprovalStepType,
  AdminRole,
  Resource,
  Action,
} from "./types";
import { logApprovalEvent } from "./security-logger";

// ============================================================================
// DEFAULT WORKFLOWS
// ============================================================================

const DEFAULT_WORKFLOWS: ApprovalWorkflow[] = [
  {
    id: "publish-content",
    name: "Content Publishing Approval",
    description: "Requires manager approval before publishing content",
    resourceTypes: ["content"],
    actions: ["publish"],
    contentTypes: ["article", "landing_page", "case_study"],
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        type: "role",
        approverRoles: ["editor", "manager", "admin"],
        requiredApprovals: 1,
        timeoutHours: 24,
        escalateTo: {
          type: "role",
          roles: ["manager"],
        },
      },
      {
        stepNumber: 2,
        name: "Manager Approval",
        type: "role",
        approverRoles: ["manager", "admin", "super_admin"],
        requiredApprovals: 1,
        timeoutHours: 48,
        escalateTo: {
          type: "role",
          roles: ["admin"],
        },
      },
    ],
    isActive: true,
    createdBy: "system",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "delete-content",
    name: "Content Deletion Approval",
    description: "Requires manager approval before deleting content",
    resourceTypes: ["content"],
    actions: ["delete"],
    steps: [
      {
        stepNumber: 1,
        name: "Manager Approval",
        type: "role",
        approverRoles: ["manager", "admin", "super_admin"],
        requiredApprovals: 1,
        timeoutHours: 72,
      },
    ],
    isActive: true,
    createdBy: "system",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-role-change",
    name: "User Role Change Approval",
    description: "Requires admin approval for role changes",
    resourceTypes: ["users"],
    actions: ["manage_roles"],
    steps: [
      {
        stepNumber: 1,
        name: "Admin Approval",
        type: "role",
        approverRoles: ["admin", "super_admin"],
        requiredApprovals: 1,
        timeoutHours: 24,
      },
    ],
    isActive: true,
    createdBy: "system",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "policy-change",
    name: "Policy Change Approval",
    description: "Requires super admin approval for policy changes",
    resourceTypes: ["policies"],
    actions: ["create", "edit", "delete"],
    steps: [
      {
        stepNumber: 1,
        name: "Admin Review",
        type: "role",
        approverRoles: ["admin", "super_admin"],
        requiredApprovals: 1,
        timeoutHours: 24,
      },
      {
        stepNumber: 2,
        name: "Super Admin Approval",
        type: "role",
        approverRoles: ["super_admin"],
        requiredApprovals: 1,
        timeoutHours: 48,
      },
    ],
    isActive: true,
    createdBy: "system",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// In-memory workflow storage (would be in DB in production)
const workflows = new Map<string, ApprovalWorkflow>(
  DEFAULT_WORKFLOWS.map((w) => [w.id, w])
);

// ============================================================================
// WORKFLOW SERVICE
// ============================================================================

class ApprovalWorkflowService {
  /**
   * Check if action requires approval
   */
  async requiresApproval(
    resource: Resource,
    action: Action,
    contentType?: string
  ): Promise<ApprovalWorkflow | null> {
    for (const workflow of workflows.values()) {
      if (!workflow.isActive) continue;
      if (!workflow.resourceTypes.includes(resource)) continue;
      if (!workflow.actions.includes(action)) continue;
      if (workflow.contentTypes && contentType && !workflow.contentTypes.includes(contentType)) continue;
      return workflow;
    }
    return null;
  }

  /**
   * Create approval request
   */
  async createRequest(params: {
    workflowId: string;
    requestType: string;
    resourceType: Resource;
    resourceId: string;
    resourceTitle?: string;
    action: Action;
    requesterId: string;
    requesterName?: string;
    priority?: "low" | "normal" | "high" | "urgent";
    reason?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<ApprovalRequest> {
    const workflow = workflows.get(params.workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${params.workflowId} not found`);
    }

    const requestId = `apr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const firstStep = workflow.steps[0];
    const dueAt = firstStep.timeoutHours
      ? new Date(now.getTime() + firstStep.timeoutHours * 60 * 60 * 1000)
      : undefined;

    // Insert request
    const [request] = await db
      .insert(approvalRequests)
      .values({
        id: requestId,
        requestType: params.requestType,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        requesterId: params.requesterId,
        currentStep: 1,
        totalSteps: workflow.steps.length,
        status: "pending",
        priority: params.priority || "normal",
        reason: params.reason,
        metadata: {
          ...params.metadata,
          workflowId: params.workflowId,
          resourceTitle: params.resourceTitle,
          requesterName: params.requesterName,
          action: params.action,
        },
        expiresAt: dueAt,
      })
      .returning();

    // Create first step
    await this.createStepRecord(requestId, firstStep, dueAt);

    // Log event
    await logApprovalEvent({
      eventType: "approval_requested",
      userId: params.requesterId,
      userName: params.requesterName,
      resource: params.resourceType,
      resourceId: params.resourceId,
      approvalRequestId: requestId,
      reason: params.reason,
      ipAddress: params.ipAddress,
      metadata: {
        workflowId: params.workflowId,
        action: params.action,
      },
    });

    return {
      id: requestId,
      workflowId: params.workflowId,
      requestType: params.requestType,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceTitle: params.resourceTitle,
      action: params.action,
      requesterId: params.requesterId,
      requesterName: params.requesterName,
      currentStep: 1,
      totalSteps: workflow.steps.length,
      status: "pending",
      priority: params.priority || "normal",
      reason: params.reason,
      metadata: params.metadata,
      dueAt,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Process approval decision
   */
  async processDecision(params: {
    requestId: string;
    decision: "approved" | "rejected";
    decidedBy: string;
    decidedByName?: string;
    reason?: string;
    ipAddress?: string;
  }): Promise<{
    request: ApprovalRequest;
    isComplete: boolean;
    nextStep?: ApprovalStepRecord;
  }> {
    // Get request
    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, params.requestId));

    if (!request) {
      throw new Error(`Approval request ${params.requestId} not found`);
    }

    if (request.status !== "pending" && request.status !== "in_progress") {
      throw new Error(`Request is not pending (status: ${request.status})`);
    }

    const metadata = request.metadata as Record<string, unknown> | null;
    const workflowId = metadata?.workflowId as string;
    const workflow = workflows.get(workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Update current step
    await db
      .update(approvalSteps)
      .set({
        status: params.decision,
        decision: params.decision,
        decisionReason: params.reason,
        decidedBy: params.decidedBy,
        decidedAt: new Date(),
      })
      .where(
        and(
          eq(approvalSteps.requestId, params.requestId),
          eq(approvalSteps.stepNumber, request.currentStep)
        )
      );

    // Log event
    await logApprovalEvent({
      eventType: params.decision === "approved" ? "approval_granted" : "approval_denied",
      userId: params.decidedBy,
      userName: params.decidedByName,
      resource: request.resourceType as Resource,
      resourceId: request.resourceId,
      approvalRequestId: params.requestId,
      decision: params.decision,
      reason: params.reason,
      ipAddress: params.ipAddress,
    });

    // Handle rejection
    if (params.decision === "rejected") {
      await db
        .update(approvalRequests)
        .set({
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(eq(approvalRequests.id, params.requestId));

      return {
        request: {
          ...this.mapRequest(request),
          status: "rejected",
        },
        isComplete: true,
      };
    }

    // Handle approval - check if more steps
    const nextStepNumber = request.currentStep + 1;

    if (nextStepNumber > workflow.steps.length) {
      // All steps complete
      await db
        .update(approvalRequests)
        .set({
          status: "approved",
          updatedAt: new Date(),
        })
        .where(eq(approvalRequests.id, params.requestId));

      return {
        request: {
          ...this.mapRequest(request),
          status: "approved",
        },
        isComplete: true,
      };
    }

    // Create next step
    const nextWorkflowStep = workflow.steps.find((s) => s.stepNumber === nextStepNumber);
    if (!nextWorkflowStep) {
      throw new Error(`Step ${nextStepNumber} not found in workflow`);
    }

    const dueAt = nextWorkflowStep.timeoutHours
      ? new Date(Date.now() + nextWorkflowStep.timeoutHours * 60 * 60 * 1000)
      : undefined;

    await db
      .update(approvalRequests)
      .set({
        currentStep: nextStepNumber,
        status: "in_progress",
        updatedAt: new Date(),
        expiresAt: dueAt,
      })
      .where(eq(approvalRequests.id, params.requestId));

    const nextStep = await this.createStepRecord(params.requestId, nextWorkflowStep, dueAt);

    return {
      request: {
        ...this.mapRequest(request),
        currentStep: nextStepNumber,
        status: "in_progress",
      },
      isComplete: false,
      nextStep,
    };
  }

  /**
   * Escalate request
   */
  async escalate(params: {
    requestId: string;
    reason: string;
    escalatedBy: string;
    ipAddress?: string;
  }): Promise<void> {
    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, params.requestId));

    if (!request) {
      throw new Error(`Request ${params.requestId} not found`);
    }

    await db
      .update(approvalRequests)
      .set({
        status: "escalated",
        escalatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(approvalRequests.id, params.requestId));

    await logApprovalEvent({
      eventType: "approval_escalated",
      userId: params.escalatedBy,
      resource: request.resourceType as Resource,
      resourceId: request.resourceId,
      approvalRequestId: params.requestId,
      reason: params.reason,
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Get pending requests for user
   */
  async getPendingForUser(userId: string): Promise<ApprovalRequest[]> {
    // Get user roles
    const roleAssignments = await db
      .select({
        roleId: userRoleAssignments.roleId,
      })
      .from(userRoleAssignments)
      .where(
        and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.isActive, true)
        )
      );

    const roleIds = roleAssignments.map((r) => r.roleId);

    // Get role names
    const roles = await db
      .select()
      .from(governanceRoles)
      .where(inArray(governanceRoles.id, roleIds));

    const roleNames = roles.map((r) => r.name);

    // Find pending requests where user can approve
    const pendingSteps = await db
      .select()
      .from(approvalSteps)
      .where(
        and(
          eq(approvalSteps.status, "pending"),
          or(
            eq(approvalSteps.approverId, userId),
            ...roleNames.map((role) => eq(approvalSteps.approverRole, role))
          )
        )
      );

    const requestIds = pendingSteps.map((s) => s.requestId);

    if (requestIds.length === 0) {
      return [];
    }

    const requests = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          inArray(approvalRequests.id, requestIds),
          or(
            eq(approvalRequests.status, "pending"),
            eq(approvalRequests.status, "in_progress")
          )
        )
      );

    return requests.map(this.mapRequest);
  }

  /**
   * Get request by ID
   */
  async getRequest(requestId: string): Promise<ApprovalRequest | null> {
    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, requestId));

    return request ? this.mapRequest(request) : null;
  }

  /**
   * Get steps for request
   */
  async getSteps(requestId: string): Promise<ApprovalStepRecord[]> {
    const steps = await db
      .select()
      .from(approvalSteps)
      .where(eq(approvalSteps.requestId, requestId))
      .orderBy(approvalSteps.stepNumber);

    return steps.map(this.mapStep);
  }

  /**
   * Check for expired requests and handle timeout
   */
  async processTimeouts(): Promise<number> {
    const now = new Date();

    const expiredRequests = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          or(
            eq(approvalRequests.status, "pending"),
            eq(approvalRequests.status, "in_progress")
          ),
          sql`${approvalRequests.expiresAt} < ${now}`
        )
      );

    for (const request of expiredRequests) {
      const metadata = request.metadata as Record<string, unknown> | null;
      const workflowId = metadata?.workflowId as string;
      const workflow = workflows.get(workflowId);

      if (!workflow) continue;

      const currentStep = workflow.steps.find((s) => s.stepNumber === request.currentStep);

      if (currentStep?.escalateTo) {
        // Escalate
        await this.escalate({
          requestId: request.id,
          reason: "Timeout - auto escalated",
          escalatedBy: "system",
        });
      } else if (currentStep?.autoApprove) {
        // Auto approve
        await this.processDecision({
          requestId: request.id,
          decision: "approved",
          decidedBy: "system",
          decidedByName: "Auto-approval",
          reason: "Timeout - auto approved",
        });
      } else {
        // Mark as expired
        await db
          .update(approvalRequests)
          .set({
            status: "expired",
            updatedAt: now,
          })
          .where(eq(approvalRequests.id, request.id));

        await logApprovalEvent({
          eventType: "approval_expired",
          userId: "system",
          resource: request.resourceType as Resource,
          resourceId: request.resourceId,
          approvalRequestId: request.id,
          reason: "Request expired without decision",
        });
      }
    }

    return expiredRequests.length;
  }

  /**
   * Create step record in database
   */
  private async createStepRecord(
    requestId: string,
    step: ApprovalWorkflowStep,
    dueAt?: Date
  ): Promise<ApprovalStepRecord> {
    const stepId = `aps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(approvalSteps).values({
      id: stepId,
      requestId,
      stepNumber: step.stepNumber,
      approverType: step.type,
      approverRole: step.approverRoles?.[0],
      approverId: step.approverUserIds?.[0],
      status: "pending",
      autoApproveAt: step.autoApprove && step.timeoutHours
        ? new Date(Date.now() + step.timeoutHours * 60 * 60 * 1000)
        : undefined,
    });

    return {
      id: stepId,
      requestId,
      stepNumber: step.stepNumber,
      stepName: step.name,
      approverType: step.type,
      approverRole: step.approverRoles?.[0] as AdminRole,
      status: "pending",
      dueAt,
      createdAt: new Date(),
    };
  }

  /**
   * Map database record to ApprovalRequest
   */
  private mapRequest(record: typeof approvalRequests.$inferSelect): ApprovalRequest {
    const metadata = record.metadata as Record<string, unknown> | null;
    return {
      id: record.id,
      workflowId: metadata?.workflowId as string || "",
      requestType: record.requestType,
      resourceType: record.resourceType as Resource,
      resourceId: record.resourceId,
      resourceTitle: metadata?.resourceTitle as string,
      action: metadata?.action as Action || "view",
      requesterId: record.requesterId,
      requesterName: metadata?.requesterName as string,
      currentStep: record.currentStep,
      totalSteps: record.totalSteps,
      status: record.status as ApprovalStatus,
      priority: record.priority as "low" | "normal" | "high" | "urgent",
      reason: record.reason || undefined,
      metadata,
      dueAt: record.expiresAt || undefined,
      escalatedAt: record.escalatedAt || undefined,
      createdAt: record.createdAt!,
      updatedAt: record.updatedAt!,
    };
  }

  /**
   * Map database record to ApprovalStepRecord
   */
  private mapStep(record: typeof approvalSteps.$inferSelect): ApprovalStepRecord {
    return {
      id: record.id,
      requestId: record.requestId,
      stepNumber: record.stepNumber,
      stepName: `Step ${record.stepNumber}`,
      approverType: record.approverType as ApprovalStepType,
      approverId: record.approverId || undefined,
      approverRole: record.approverRole as AdminRole | undefined,
      status: record.status as ApprovalStatus,
      decision: record.decision as "approved" | "rejected" | undefined,
      decisionReason: record.decisionReason || undefined,
      decidedBy: record.decidedBy || undefined,
      decidedAt: record.decidedAt || undefined,
      dueAt: record.autoApproveAt || undefined,
      createdAt: record.createdAt!,
    };
  }

  /**
   * Register a new workflow
   */
  registerWorkflow(workflow: ApprovalWorkflow): void {
    workflows.set(workflow.id, workflow);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): ApprovalWorkflow[] {
    return Array.from(workflows.values());
  }

  /**
   * Check if user can approve a step
   */
  async canApprove(userId: string, step: ApprovalStepRecord): Promise<boolean> {
    // Specific user assignment
    if (step.approverId === userId) {
      return true;
    }

    // Role-based approval
    if (step.approverRole) {
      const roleAssignments = await db
        .select({
          roleName: governanceRoles.name,
        })
        .from(userRoleAssignments)
        .innerJoin(governanceRoles, eq(governanceRoles.id, userRoleAssignments.roleId))
        .where(
          and(
            eq(userRoleAssignments.userId, userId),
            eq(userRoleAssignments.isActive, true)
          )
        );

      return roleAssignments.some((r) => r.roleName === step.approverRole);
    }

    return false;
  }
}

// Singleton instance
export const approvalWorkflowService = new ApprovalWorkflowService();

console.log("[Governance] Approval Workflow Service loaded");
