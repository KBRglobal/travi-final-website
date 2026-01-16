/**
 * Unified Workflow Engine
 *
 * CONSOLIDATION DECISION (2026-01-01):
 * This file unifies three separate workflow engine implementations:
 * 1. /server/workflows/workflow-engine.ts - Generic trigger-action workflows
 * 2. /server/approvals/workflow-engine.ts - Multi-step approval workflows
 * 3. /server/approval-workflow/workflow-engine.ts - Draft review workflows (in-memory, deprecated)
 *
 * RATIONALE:
 * - Reduces code duplication and maintenance burden
 * - Provides a single, consistent API for all workflow types
 * - Combines the best patterns from all three implementations
 * - Maintains backward compatibility through exported functions
 * - Uses database persistence for reliability (no in-memory state)
 *
 * FEATURES:
 * - Generic trigger-action workflows with conditional logic
 * - Multi-step approval workflows with state machine
 * - Content review workflows with stage transitions
 * - Execution tracking and error handling
 * - Feature flag support for gradual rollout
 * - Auto-approval and expiration support
 */

import { db } from "../db";
import {
  workflows,
  workflowExecutions,
  approvalRequests,
  approvalSteps,
  contents
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { webhookManager } from "../webhooks/webhook-manager";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

// Generic Workflow Types (from workflows/workflow-engine.ts)
export interface WorkflowTrigger {
  type: "content.created" | "content.published" | "content.updated" | "schedule" | "manual";
  conditions: Record<string, unknown>;
}

export interface WorkflowAction {
  type: "send_webhook" | "send_email" | "update_content" | "create_task" | "notify" | "create_approval";
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  status: "active" | "inactive" | "draft";
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  results: Array<{
    action: string;
    success: boolean;
    output?: unknown;
    error?: string;
  }>;
}

// Approval Workflow Types (from approvals/workflow-engine.ts)
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

// Content Review Types (from approval-workflow/workflow-engine.ts)
export type WorkflowStage =
  | "draft"
  | "pending_review"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "published";

export type TransitionAction =
  | "submit_for_review"
  | "start_review"
  | "request_changes"
  | "approve"
  | "reject"
  | "publish"
  | "unpublish"
  | "revert_to_draft";

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

export interface Approval {
  id: string;
  reviewerId: string;
  comment?: string;
  approvedAt: Date;
}

export interface Rejection {
  id: string;
  reviewerId: string;
  reason: string;
  rejectedAt: Date;
}

export interface ChangeRequest {
  id: string;
  reviewerId: string;
  comments: string;
  priority: "low" | "medium" | "high";
  resolved: boolean;
  requestedAt: Date;
  resolvedAt?: Date;
}

export interface WorkflowEvent {
  id: string;
  action: TransitionAction;
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  performedBy: string;
  comment?: string;
  timestamp: Date;
}

export interface TransitionResult {
  success: boolean;
  newState?: ContentWorkflowState;
  error?: string;
}

// =============================================================================
// FEATURE FLAGS
// =============================================================================

function isApprovalWorkflowEnabled(): boolean {
  return process.env.ENABLE_APPROVAL_WORKFLOWS === "true";
}

function isContentReviewEnabled(): boolean {
  return process.env.ENABLE_CONTENT_REVIEW === "true";
}

// =============================================================================
// BUILT-IN APPROVAL RULES
// =============================================================================

const BUILT_IN_RULES: WorkflowRule[] = [
  {
    id: "publish-standard",
    name: "Standard Publish Workflow",
    description: "Default approval for publishing content",
    condition: {
      requestType: "publish",
    },
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        approverType: "role",
        approverRole: "editor",
        notifyOnPending: true,
      },
    ],
    priority: 100,
    isActive: true,
  },
  {
    id: "publish-low-score",
    name: "Low Score Publish Workflow",
    description: "Additional approval for content with low ICE score",
    condition: {
      requestType: "publish",
      maxScore: 50,
    },
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        approverType: "role",
        approverRole: "editor",
        notifyOnPending: true,
      },
      {
        stepNumber: 2,
        name: "Admin Approval",
        approverType: "role",
        approverRole: "admin",
        notifyOnPending: true,
      },
    ],
    priority: 200,
    isActive: true,
  },
  {
    id: "delete-content",
    name: "Delete Content Workflow",
    description: "Approval required for content deletion",
    condition: {
      requestType: "delete",
    },
    steps: [
      {
        stepNumber: 1,
        name: "Admin Approval",
        approverType: "role",
        approverRole: "admin",
        notifyOnPending: true,
      },
    ],
    priority: 100,
    isActive: true,
  },
  {
    id: "regenerate-content",
    name: "Regenerate Content Workflow",
    description: "Approval for AI regeneration",
    condition: {
      requestType: "regenerate",
    },
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        approverType: "role",
        approverRole: "editor",
        autoApproveHours: 24,
        notifyOnPending: true,
      },
    ],
    priority: 100,
    isActive: true,
  },
  {
    id: "bulk-update",
    name: "Bulk Update Workflow",
    description: "Multi-step approval for bulk operations",
    condition: {
      requestType: "bulk_update",
    },
    steps: [
      {
        stepNumber: 1,
        name: "Editor Review",
        approverType: "role",
        approverRole: "editor",
        notifyOnPending: true,
      },
      {
        stepNumber: 2,
        name: "Admin Approval",
        approverType: "role",
        approverRole: "admin",
        notifyOnPending: true,
      },
    ],
    priority: 300,
    isActive: true,
  },
];

// =============================================================================
// GENERIC WORKFLOW ENGINE (from workflows/workflow-engine.ts)
// =============================================================================

export const genericWorkflowEngine = {
  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, unknown>
  ): Promise<ExecutionResult> {
    try {
      // Fetch workflow
      const workflow = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (workflow.length === 0 || workflow[0].status !== "active") {
        throw new Error("Workflow not found or inactive");
      }

      const config = workflow[0];

      // Create execution record
      const execution = await db
        .insert(workflowExecutions)
        .values({
          workflowId,
          status: "running",
          triggerData: triggerData,
        })
        .returning();

      const executionId = execution[0].id;

      try {
        // Check trigger conditions
        const trigger = config.trigger as unknown as WorkflowTrigger;
        const conditionsMet = await this.evaluateConditions(
          trigger.conditions,
          triggerData
        );

        if (!conditionsMet) {
          await db
            .update(workflowExecutions)
            .set({
              status: "completed",
              result: { skipped: true, reason: "Conditions not met" } as unknown as Record<string, unknown>,
              completedAt: new Date(),
            })
            .where(eq(workflowExecutions.id, executionId));

          return {
            success: true,
            executionId,
            results: [],
          };
        }

        // Execute actions
        const actions = (config.actions as unknown as WorkflowAction[]) || [];
        const results: ExecutionResult['results'] = [];

        for (const action of actions) {
          try {
            const result = await this.executeAction(action, triggerData);
            results.push({
              action: action.type,
              success: true,
              output: result,
            });
          } catch (error) {
            results.push({
              action: action.type,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Update execution status
        await db
          .update(workflowExecutions)
          .set({
            status: "completed",
            result: { actions: results } as unknown as Record<string, unknown>,
            completedAt: new Date(),
          })
          .where(eq(workflowExecutions.id, executionId));

        return {
          success: true,
          executionId,
          results,
        };
      } catch (error) {
        // Mark execution as failed
        await db
          .update(workflowExecutions)
          .set({
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date(),
          })
          .where(eq(workflowExecutions.id, executionId));

        throw error;
      }
    } catch (error) {
      console.error("[UnifiedWorkflow] Error executing workflow:", error);
      throw error;
    }
  },

  /**
   * Evaluate trigger conditions
   */
  async evaluateConditions(
    conditions: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // Simple condition evaluation
      for (const [key, value] of Object.entries(conditions)) {
        const dataValue = data[key];

        if (typeof value === "object" && value !== null) {
          // Handle operators
          const operators = value as Record<string, unknown>;

          if (operators.$eq !== undefined && dataValue !== operators.$eq) {
            return false;
          }
          if (operators.$ne !== undefined && dataValue === operators.$ne) {
            return false;
          }
          if (operators.$gt !== undefined && !(dataValue as number > (operators.$gt as number))) {
            return false;
          }
          if (operators.$lt !== undefined && !(dataValue as number < (operators.$lt as number))) {
            return false;
          }
          if (operators.$in !== undefined && !((operators.$in as unknown[]).includes(dataValue))) {
            return false;
          }
        } else {
          // Direct equality check
          if (dataValue !== value) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error("[UnifiedWorkflow] Error evaluating conditions:", error);
      return false;
    }
  },

  /**
   * Execute a workflow action
   */
  async executeAction(
    action: WorkflowAction,
    data: Record<string, unknown>
  ): Promise<unknown> {
    switch (action.type) {
      case "send_webhook":
        return this.executeWebhookAction(action.config, data);

      case "send_email":
        return this.executeEmailAction(action.config, data);

      case "update_content":
        return this.executeUpdateContentAction(action.config, data);

      case "notify":
        return this.executeNotifyAction(action.config, data);

      case "create_approval":
        return this.executeCreateApprovalAction(action.config, data);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  },

  /**
   * Execute webhook action
   */
  async executeWebhookAction(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const webhookId = config.webhookId as string;
    const event = (config.event as string) || "workflow.action";

    return webhookManager.deliverWebhook(webhookId, event, data);
  },

  /**
   * Execute email action
   */
  async executeEmailAction(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    // TODO: Implement email sending
    console.log("[UnifiedWorkflow] Email action:", config, data);
    return { sent: true };
  },

  /**
   * Execute update content action
   */
  async executeUpdateContentAction(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const contentId = (data.contentId || config.contentId) as string;
    const updates = config.updates as Record<string, unknown>;

    if (!contentId || !updates) {
      throw new Error("contentId and updates required");
    }

    await db
      .update(contents)
      .set(updates)
      .where(eq(contents.id, contentId));

    return { updated: true, contentId };
  },

  /**
   * Execute notify action
   */
  async executeNotifyAction(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    // TODO: Implement notification system
    console.log("[UnifiedWorkflow] Notify action:", config, data);
    return { notified: true };
  },

  /**
   * Execute create approval action
   */
  async executeCreateApprovalAction(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const requestType = config.requestType as RequestType;
    const resourceType = config.resourceType as string;
    const resourceId = (data.resourceId || config.resourceId) as string;
    const requesterId = (data.userId || config.requesterId) as string;

    if (!requestType || !resourceType || !resourceId || !requesterId) {
      throw new Error("Missing required approval parameters");
    }

    return approvalWorkflowEngine.createApprovalRequest(
      requestType,
      resourceType,
      resourceId,
      requesterId,
      {
        reason: config.reason as string,
        priority: config.priority as Priority,
        metadata: data,
      }
    );
  },

  /**
   * Trigger workflows based on event
   */
  async triggerEvent(
    eventType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      // Find workflows with matching trigger
      const matchingWorkflows = await db
        .select()
        .from(workflows)
        .where(eq(workflows.status, "active"));

      const executions = matchingWorkflows
        .filter(workflow => {
          const trigger = workflow.trigger as unknown as WorkflowTrigger;
          return trigger.type === eventType;
        })
        .map(workflow => this.executeWorkflow(workflow.id, data));

      await Promise.allSettled(executions);
    } catch (error) {
      console.error("[UnifiedWorkflow] Error triggering event:", error);
    }
  },
};

// =============================================================================
// APPROVAL WORKFLOW ENGINE (from approvals/workflow-engine.ts)
// =============================================================================

export const approvalWorkflowEngine = {
  /**
   * Create a new approval request
   */
  async createApprovalRequest(
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
    if (!isApprovalWorkflowEnabled()) {
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
    const context = {
      requestType,
      resourceType,
      contentType: options.contentType,
      score: options.score,
      metadata: options.metadata,
    };

    const rule = this.findMatchingRule(context);
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
      })
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
      });
    }

    return {
      success: true,
      requestId: request.id,
      status: "pending",
      currentStep: 1,
      totalSteps: rule.steps.length,
      message: `Approval request created with ${rule.steps.length} step(s)`,
    };
  },

  /**
   * Process an approval decision
   */
  async processDecision(
    requestId: string,
    decision: ApprovalDecision
  ): Promise<ApprovalResult> {
    if (!isApprovalWorkflowEnabled()) {
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

    if (this.isTerminalState(request.status as ApprovalStatus)) {
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
        })
        .where(eq(approvalSteps.id, currentStep.id));

      // Check if this was the last step
      if (request.currentStep >= request.totalSteps) {
        // All steps approved
        await db
          .update(approvalRequests)
          .set({
            status: "approved",
            updatedAt: now,
          })
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
        })
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
        })
        .where(eq(approvalSteps.id, currentStep.id));

      await db
        .update(approvalRequests)
        .set({
          status: "rejected",
          updatedAt: now,
        })
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
  },

  /**
   * Cancel an approval request
   */
  async cancelRequest(
    requestId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<ApprovalResult> {
    if (!isApprovalWorkflowEnabled()) {
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

    if (this.isTerminalState(request.status as ApprovalStatus)) {
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
      })
      .where(eq(approvalRequests.id, requestId));

    return {
      success: true,
      requestId,
      status: "cancelled",
      currentStep: request.currentStep,
      totalSteps: request.totalSteps,
      message: "Request cancelled",
    };
  },

  /**
   * Get pending approvals for a user/role
   */
  async getPendingApprovals(
    approverRole?: string,
    approverId?: string
  ): Promise<ApprovalRequest[]> {
    if (!isApprovalWorkflowEnabled()) return [];

    const requests = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.status, "pending"))
      .orderBy(desc(approvalRequests.createdAt));

    return requests as unknown as ApprovalRequest[];
  },

  /**
   * Get request details
   */
  async getRequestDetails(requestId: string): Promise<{
    request: ApprovalRequest;
    steps: ApprovalStep[];
  } | null> {
    if (!isApprovalWorkflowEnabled()) return null;

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
  },

  /**
   * Find matching workflow rule
   */
  findMatchingRule(context: {
    requestType: RequestType;
    resourceType: string;
    contentType?: string;
    score?: number;
    metadata?: Record<string, unknown>;
  }): WorkflowRule | null {
    const matchingRules = BUILT_IN_RULES.filter((rule) => {
      if (!rule.isActive) return false;
      return this.matchesCondition(rule.condition, context);
    });

    if (matchingRules.length === 0) return null;

    // Return highest priority rule
    matchingRules.sort((a, b) => b.priority - a.priority);
    return matchingRules[0];
  },

  /**
   * Check if context matches condition
   */
  matchesCondition(
    condition: WorkflowCondition,
    context: {
      requestType: RequestType;
      resourceType: string;
      contentType?: string;
      score?: number;
      metadata?: Record<string, unknown>;
    }
  ): boolean {
    // Request type match
    if (condition.requestType && condition.requestType !== context.requestType) {
      return false;
    }

    // Resource type match
    if (condition.resourceType && condition.resourceType !== context.resourceType) {
      return false;
    }

    // Content type match
    if (condition.contentType && condition.contentType !== context.contentType) {
      return false;
    }

    // Score range
    if (condition.minScore !== undefined && context.score !== undefined) {
      if (context.score < condition.minScore) return false;
    }
    if (condition.maxScore !== undefined && context.score !== undefined) {
      if (context.score > condition.maxScore) return false;
    }

    // Custom field match
    if (condition.customField && context.metadata) {
      const actualValue = context.metadata[condition.customField];
      if (actualValue !== condition.customValue) return false;
    }

    return true;
  },

  /**
   * Check if status is terminal
   */
  isTerminalState(status: ApprovalStatus): boolean {
    return ["approved", "rejected", "cancelled", "expired"].includes(status);
  },
};

// =============================================================================
// CONTENT REVIEW WORKFLOW ENGINE (from approval-workflow/workflow-engine.ts)
// Enhanced with database persistence instead of in-memory storage
// =============================================================================

// Valid transitions map
const VALID_TRANSITIONS: Record<WorkflowStage, TransitionAction[]> = {
  draft: ["submit_for_review"],
  pending_review: ["start_review", "revert_to_draft"],
  in_review: ["approve", "reject", "request_changes"],
  changes_requested: ["submit_for_review", "revert_to_draft"],
  approved: ["publish", "revert_to_draft"],
  rejected: ["revert_to_draft"],
  published: ["unpublish"],
};

/**
 * Get next stage for action
 */
function getNextStage(current: WorkflowStage, action: TransitionAction): WorkflowStage | null {
  const transitions: Record<TransitionAction, Partial<Record<WorkflowStage, WorkflowStage>>> = {
    submit_for_review: { draft: "pending_review", changes_requested: "pending_review" },
    start_review: { pending_review: "in_review" },
    request_changes: { in_review: "changes_requested" },
    approve: { in_review: "approved" },
    reject: { in_review: "rejected" },
    publish: { approved: "published" },
    unpublish: { published: "draft" },
    revert_to_draft: {
      pending_review: "draft",
      changes_requested: "draft",
      approved: "draft",
      rejected: "draft",
    },
  };

  return transitions[action]?.[current] || null;
}

export const contentReviewEngine = {
  /**
   * Initialize workflow for content
   * NOTE: This now uses database persistence via content metadata instead of in-memory storage
   */
  async initializeWorkflow(contentId: string): Promise<ContentWorkflowState> {
    if (!isContentReviewEnabled()) {
      throw new Error("Content review workflows are not enabled");
    }

    const state: ContentWorkflowState = {
      contentId,
      currentStage: "draft",
      approvals: [],
      rejections: [],
      changeRequests: [],
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in content metadata
    await db
      .update(contents)
      .set({
        metadata: { workflowState: state } as unknown as Record<string, unknown>,
      })
      .where(eq(contents.id, contentId));

    return state;
  },

  /**
   * Get workflow state from database
   */
  async getWorkflowState(contentId: string): Promise<ContentWorkflowState | null> {
    if (!isContentReviewEnabled()) return null;

    const [content] = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (!content) return null;

    const metadata = content.metadata as Record<string, unknown>;
    return (metadata?.workflowState as ContentWorkflowState) || null;
  },

  /**
   * Transition workflow
   */
  async transitionWorkflow(
    contentId: string,
    action: TransitionAction,
    performedBy: string,
    comment?: string
  ): Promise<TransitionResult> {
    if (!isContentReviewEnabled()) {
      return {
        success: false,
        error: "Content review workflows are not enabled",
      };
    }

    let state = await this.getWorkflowState(contentId);

    if (!state) {
      state = await this.initializeWorkflow(contentId);
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
      return { success: false, error: "Invalid transition" };
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
    if (action === "submit_for_review") {
      state.submittedBy = performedBy;
      state.submittedAt = new Date();
    } else if (action === "start_review") {
      state.assignedReviewer = performedBy;
      state.assignedAt = new Date();
    }

    // Persist to database
    await db
      .update(contents)
      .set({
        metadata: { workflowState: state } as unknown as Record<string, unknown>,
      })
      .where(eq(contents.id, contentId));

    return { success: true, newState: state };
  },

  /**
   * Add approval
   */
  async addApproval(
    contentId: string,
    reviewerId: string,
    comment?: string
  ): Promise<TransitionResult> {
    if (!isContentReviewEnabled()) {
      return { success: false, error: "Content review workflows are not enabled" };
    }

    const state = await this.getWorkflowState(contentId);
    if (!state) {
      return { success: false, error: "Workflow not found" };
    }

    if (state.currentStage !== "in_review") {
      return { success: false, error: "Content is not in review" };
    }

    const approval: Approval = {
      id: `apr-${Date.now()}`,
      reviewerId,
      comment,
      approvedAt: new Date(),
    };

    state.approvals.push(approval);

    // Check if we have enough approvals (default: 1)
    const minApprovals = 1;
    if (state.approvals.length >= minApprovals) {
      return this.transitionWorkflow(contentId, "approve", reviewerId, comment);
    }

    state.updatedAt = new Date();

    // Persist to database
    await db
      .update(contents)
      .set({
        metadata: { workflowState: state } as unknown as Record<string, unknown>,
      })
      .where(eq(contents.id, contentId));

    return { success: true, newState: state };
  },

  /**
   * Add rejection
   */
  async addRejection(
    contentId: string,
    reviewerId: string,
    reason: string
  ): Promise<TransitionResult> {
    if (!isContentReviewEnabled()) {
      return { success: false, error: "Content review workflows are not enabled" };
    }

    const state = await this.getWorkflowState(contentId);
    if (!state) {
      return { success: false, error: "Workflow not found" };
    }

    const rejection: Rejection = {
      id: `rej-${Date.now()}`,
      reviewerId,
      reason,
      rejectedAt: new Date(),
    };

    state.rejections.push(rejection);

    return this.transitionWorkflow(contentId, "reject", reviewerId, reason);
  },

  /**
   * Request changes
   */
  async requestChanges(
    contentId: string,
    reviewerId: string,
    comments: string,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<TransitionResult> {
    if (!isContentReviewEnabled()) {
      return { success: false, error: "Content review workflows are not enabled" };
    }

    const state = await this.getWorkflowState(contentId);
    if (!state) {
      return { success: false, error: "Workflow not found" };
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

    return this.transitionWorkflow(contentId, "request_changes", reviewerId, comments);
  },

  /**
   * Resolve change request
   */
  async resolveChangeRequest(
    contentId: string,
    changeRequestId: string
  ): Promise<boolean> {
    if (!isContentReviewEnabled()) return false;

    const state = await this.getWorkflowState(contentId);
    if (!state) return false;

    const cr = state.changeRequests.find(c => c.id === changeRequestId);
    if (!cr) return false;

    cr.resolved = true;
    cr.resolvedAt = new Date();
    state.updatedAt = new Date();

    // Persist to database
    await db
      .update(contents)
      .set({
        metadata: { workflowState: state } as unknown as Record<string, unknown>,
      })
      .where(eq(contents.id, contentId));

    return true;
  },

  /**
   * Get pending reviews
   */
  async getPendingReviews(): Promise<ContentWorkflowState[]> {
    if (!isContentReviewEnabled()) return [];

    const allContents = await db.select().from(contents);

    const pendingReviews: ContentWorkflowState[] = [];
    for (const content of allContents) {
      const metadata = content.metadata as Record<string, unknown>;
      const workflowState = metadata?.workflowState as ContentWorkflowState;

      if (workflowState &&
          (workflowState.currentStage === "pending_review" ||
           workflowState.currentStage === "in_review")) {
        pendingReviews.push(workflowState);
      }
    }

    return pendingReviews;
  },

  /**
   * Get content by stage
   */
  async getContentByStage(stage: WorkflowStage): Promise<ContentWorkflowState[]> {
    if (!isContentReviewEnabled()) return [];

    const allContents = await db.select().from(contents);

    const contentsByStage: ContentWorkflowState[] = [];
    for (const content of allContents) {
      const metadata = content.metadata as Record<string, unknown>;
      const workflowState = metadata?.workflowState as ContentWorkflowState;

      if (workflowState && workflowState.currentStage === stage) {
        contentsByStage.push(workflowState);
      }
    }

    return contentsByStage;
  },
};

// =============================================================================
// UNIFIED EXPORTS
// =============================================================================

/**
 * Unified workflow engine that provides a single interface for all workflow types
 */
export const unifiedWorkflowEngine = {
  // Generic workflows
  generic: genericWorkflowEngine,

  // Approval workflows
  approval: approvalWorkflowEngine,

  // Content review workflows
  review: contentReviewEngine,

  // Convenience methods
  async triggerEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
    return genericWorkflowEngine.triggerEvent(eventType, data);
  },

  async createApproval(
    requestType: RequestType,
    resourceType: string,
    resourceId: string,
    requesterId: string,
    options?: {
      reason?: string;
      priority?: Priority;
      metadata?: Record<string, unknown>;
      contentType?: string;
      score?: number;
    }
  ): Promise<ApprovalResult> {
    return approvalWorkflowEngine.createApprovalRequest(
      requestType,
      resourceType,
      resourceId,
      requesterId,
      options
    );
  },

  async reviewContent(
    contentId: string,
    action: TransitionAction,
    performedBy: string,
    comment?: string
  ): Promise<TransitionResult> {
    return contentReviewEngine.transitionWorkflow(contentId, action, performedBy, comment);
  },
};

console.log("[UnifiedWorkflow] Unified workflow engine loaded");
console.log("[UnifiedWorkflow] - Generic workflows: enabled");
console.log(`[UnifiedWorkflow] - Approval workflows: ${isApprovalWorkflowEnabled() ? "enabled" : "disabled"}`);
console.log(`[UnifiedWorkflow] - Content review: ${isContentReviewEnabled() ? "enabled" : "disabled"}`);
