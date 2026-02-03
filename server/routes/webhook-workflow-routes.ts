/**
 * Webhooks and Workflows Routes
 * CRUD for webhooks and workflow automation
 */

import type { Express, Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { webhooks, webhookLogs, workflows, workflowExecutions } from "@shared/schema";
import { requirePermission, type AuthRequest } from "../security";

// Helper to get user ID from auth request
function getUserId(req: AuthRequest): string | undefined {
  return (req as any).user?.claims?.sub || (req as any).user?.id;
}

export function registerWebhookWorkflowRoutes(app: Express): void {
  // ============================================================================
  // WEBHOOKS
  // ============================================================================
  app.post("/api/webhooks", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const webhook = await db
        .insert(webhooks)
        .values({
          ...req.body,
          createdBy: getUserId(req as AuthRequest),
        })
        .returning();
      res.json(webhook[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.get("/api/webhooks", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const allWebhooks = await db.select().from(webhooks);
      res.json(allWebhooks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.post("/api/webhooks/:id/test", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { webhookManager } = await import("../webhooks/webhook-manager");
      const { id } = req.params;
      const result = await webhookManager.testWebhook(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to test webhook" });
    }
  });

  app.get("/api/webhooks/:id/logs", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { id } = req.params;
      const logs = await db
        .select()
        .from(webhookLogs)
        .where(eq(webhookLogs.webhookId, id))
        .orderBy(desc(webhookLogs.createdAt))
        .limit(50);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhook logs" });
    }
  });

  // ============================================================================
  // WORKFLOWS
  // ============================================================================
  app.post("/api/workflows", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const workflow = await db
        .insert(workflows)
        .values({
          ...req.body,
          createdBy: getUserId(req as AuthRequest),
        })
        .returning();
      res.json(workflow[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  app.get("/api/workflows", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const allWorkflows = await db.select().from(workflows);
      res.json(allWorkflows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.post(
    "/api/workflows/:id/execute",
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const { workflowEngine } = await import("../workflows/workflow-engine");
        const { id } = req.params;
        const result = await workflowEngine.executeWorkflow(id, req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to execute workflow" });
      }
    }
  );

  app.get(
    "/api/workflows/:id/executions",
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const executions = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.workflowId, id))
          .orderBy(desc(workflowExecutions.startedAt))
          .limit(50);
        res.json(executions);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch workflow executions" });
      }
    }
  );
}
