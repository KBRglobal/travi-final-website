/**
 * Workflows Routes
 * CRUD for workflow automation
 *
 * Note: Webhook CRUD routes (GET/POST/PATCH/DELETE /api/webhooks, test, logs)
 * are handled by enterprise-routes.ts. Only workflow routes remain here.
 */

import type { Express } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { workflows, workflowExecutions } from "@shared/schema";
import { requirePermission, type AuthRequest } from "../security";

// Helper to get user ID from auth request
function getUserId(req: AuthRequest): string | undefined {
  return (req as any).user?.claims?.sub || (req as any).user?.id;
}

export function registerWebhookWorkflowRoutes(app: Express): void {
  // ============================================================================
  // WORKFLOWS (webhook routes removed - handled by enterprise-routes.ts)
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
    } catch {
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  app.get("/api/workflows", requirePermission("canManageSettings"), async (_req, res) => {
    try {
      const allWorkflows = await db.select().from(workflows);
      res.json(allWorkflows);
    } catch {
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
      } catch {
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
      } catch {
        res.status(500).json({ error: "Failed to fetch workflow executions" });
      }
    }
  );
}
