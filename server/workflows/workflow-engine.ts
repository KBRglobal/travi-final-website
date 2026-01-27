/**
 * Workflow Engine
 *
 * @deprecated This file has been consolidated into unified-workflow-engine.ts (2026-01-01)
 * Please use: import { unifiedWorkflowEngine } from './unified-workflow-engine'
 * Migration: unifiedWorkflowEngine.generic provides the same interface
 *
 * This file will be removed in a future release.
 *
 * Automates content workflows with triggers, conditions, and actions
 * - Event-based triggers
 * - Conditional logic
 * - Action execution
 * - Execution tracking
 */

import { db } from "../db";
import { workflows, workflowExecutions, contents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { webhookManager } from "../webhooks/webhook-manager";

export interface WorkflowTrigger {
  type: "content.created" | "content.published" | "content.updated" | "schedule" | "manual";
  conditions: Record<string, unknown>;
}

export interface WorkflowAction {
  type: "send_webhook" | "send_email" | "update_content" | "create_task" | "notify";
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

/**
 * @deprecated Use unifiedWorkflowEngine.generic instead
 * This export is maintained for backward compatibility only
 */
export const workflowEngine = {
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
        const conditionsMet = await this.evaluateConditions(trigger.conditions, triggerData);

        if (!conditionsMet) {
          await db
            .update(workflowExecutions)
            .set({
              status: "completed",
              result: { skipped: true, reason: "Conditions not met" } as unknown as Record<
                string,
                unknown
              >,
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
        const results: ExecutionResult["results"] = [];

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
          if (operators.$gt !== undefined && !((dataValue as number) > (operators.$gt as number))) {
            return false;
          }
          if (operators.$lt !== undefined && !((dataValue as number) < (operators.$lt as number))) {
            return false;
          }
          if (operators.$in !== undefined && !(operators.$in as unknown[]).includes(dataValue)) {
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
      return false;
    }
  },

  /**
   * Execute a workflow action
   */
  async executeAction(action: WorkflowAction, data: Record<string, unknown>): Promise<unknown> {
    switch (action.type) {
      case "send_webhook":
        return this.executeWebhookAction(action.config, data);

      case "send_email":
        return this.executeEmailAction(action.config, data);

      case "update_content":
        return this.executeUpdateContentAction(action.config, data);

      case "notify":
        return this.executeNotifyAction(action.config, data);

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

    await db.update(contents).set(updates).where(eq(contents.id, contentId));

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

    return { notified: true };
  },

  /**
   * Trigger workflows based on event
   */
  async triggerEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
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
    } catch (error) {}
  },
};
