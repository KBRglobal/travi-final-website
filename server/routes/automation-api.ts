import type { Express, Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import { webhooks, webhookLogs, workflows, workflowExecutions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requirePermission, getUserId } from "../security";

type AuthRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string; email?: string; name?: string } };
  session: Request["session"] & {
    userId?: string;
    id?: string;
  };
};

/**
 * Automation API Routes
 *
 * Handles workflow and automation endpoints:
 * - Webhooks (CRUD, testing, logs)
 * - Workflows (CRUD, execution, execution history)
 * - A/B Tests (CRUD, start/stop, results, variant assignment, tracking)
 */
export function registerAutomationApiRoutes(app: Express): void {
  const router = Router();

  // ============================================================================
  // WEBHOOKS
  // ============================================================================
  router.post(
    "/webhooks",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const webhook = await db
          .insert(webhooks)
          .values({
            ...req.body,
            createdBy: getUserId(req),
          })
          .returning();
        res.json(webhook[0]);
      } catch {
        res.status(500).json({ error: "Failed to create webhook" });
      }
    }
  );

  router.get(
    "/webhooks",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const allWebhooks = await db.select().from(webhooks);
        res.json(allWebhooks);
      } catch {
        res.status(500).json({ error: "Failed to fetch webhooks" });
      }
    }
  );

  router.post(
    "/webhooks/:id/test",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { webhookManager } = (await import("../webhooks/webhook-manager" as any)) as {
          webhookManager: { testWebhook: (id: string) => Promise<any> };
        };
        const { id } = req.params;
        const result = await webhookManager.testWebhook(id);
        res.json(result);
      } catch {
        res.status(500).json({ error: "Failed to test webhook" });
      }
    }
  );

  router.get(
    "/webhooks/:id/logs",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const logs = await db
          .select()
          .from(webhookLogs)
          .where(eq(webhookLogs.webhookId, id))
          .orderBy(desc(webhookLogs.createdAt))
          .limit(50);
        res.json(logs);
      } catch {
        res.status(500).json({ error: "Failed to fetch webhook logs" });
      }
    }
  );

  // ============================================================================
  // WORKFLOWS
  // ============================================================================
  router.post(
    "/workflows",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const workflow = await db
          .insert(workflows)
          .values({
            ...req.body,
            createdBy: getUserId(req),
          })
          .returning();
        res.json(workflow[0]);
      } catch {
        res.status(500).json({ error: "Failed to create workflow" });
      }
    }
  );

  router.get(
    "/workflows",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const allWorkflows = await db.select().from(workflows);
        res.json(allWorkflows);
      } catch {
        res.status(500).json({ error: "Failed to fetch workflows" });
      }
    }
  );

  router.post(
    "/workflows/:id/execute",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
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

  router.get(
    "/workflows/:id/executions",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
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

  // ============================================================================
  // A/B TESTING
  // ============================================================================
  router.post(
    "/ab-tests",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const ctaAbTesting = ((await import("../monetization/cta-ab-testing")) as any)
          .ctaAbTesting as {
          createTest: (data: any, userId: string | undefined) => Promise<string | null>;
        };
        const userId = getUserId(req);
        const testId = await ctaAbTesting.createTest(req.body, userId);
        if (testId) {
          res.json({ success: true, testId });
        } else {
          res.status(500).json({ error: "Failed to create test" });
        }
      } catch {
        res.status(500).json({ error: "Failed to create A/B test" });
      }
    }
  );

  router.get("/ab-tests", requireAuth, async (req: Request, res: Response) => {
    try {
      const ctaAbTesting = ((await import("../monetization/cta-ab-testing")) as any)
        .ctaAbTesting as { listTests: () => Promise<any[]> };
      const tests = await ctaAbTesting.listTests();
      res.json(tests);
    } catch {
      res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });

  router.post(
    "/ab-tests/:id/start",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const ctaAbTesting = ((await import("../monetization/cta-ab-testing")) as any)
          .ctaAbTesting as { startTest: (id: string) => Promise<boolean> };
        const { id } = req.params;
        const result = await ctaAbTesting.startTest(id);
        res.json({ success: result });
      } catch {
        res.status(500).json({ error: "Failed to start A/B test" });
      }
    }
  );

  router.post(
    "/ab-tests/:id/stop",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const ctaAbTesting = ((await import("../monetization/cta-ab-testing")) as any)
          .ctaAbTesting as { stopTest: (id: string) => Promise<boolean> };
        const { id } = req.params;
        const result = await ctaAbTesting.stopTest(id);
        res.json({ success: result });
      } catch {
        res.status(500).json({ error: "Failed to stop A/B test" });
      }
    }
  );

  router.get("/ab-tests/:id/results", requireAuth, async (req: Request, res: Response) => {
    try {
      const ctaAbTesting = ((await import("../monetization/cta-ab-testing")) as any)
        .ctaAbTesting as { getTestResults: (id: string) => Promise<any> };
      const { id } = req.params;
      const results = await ctaAbTesting.getTestResults(id);
      res.json(results);
    } catch {
      res.status(500).json({ error: "Failed to fetch A/B test results" });
    }
  });

  router.get("/ab-tests/:id/variant", async (req: Request, res: Response) => {
    try {
      const ctaAbTesting = ((await import("../monetization/cta-ab-testing")) as any)
        .ctaAbTesting as {
        getVariant: (id: string, userId: string, sessionId: string) => Promise<any>;
      };
      const { id } = req.params;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub || "";
      const sessionId = authReq.session?.id || req.ip || "";
      const variant = await ctaAbTesting.getVariant(id, userId, sessionId);
      res.json(variant);
    } catch {
      res.status(500).json({ error: "Failed to get variant" });
    }
  });

  router.post("/ab-tests/:id/track", async (req: Request, res: Response) => {
    try {
      const ctaAbTesting = ((await import("../monetization/cta-ab-testing")) as any)
        .ctaAbTesting as {
        trackEvent: (
          id: string,
          variantId: string,
          eventType: string,
          userId: string | undefined,
          sessionId: string,
          metadata: any
        ) => Promise<void>;
      };
      const { id } = req.params;
      const { variantId, eventType, metadata } = req.body;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;
      const sessionId = authReq.session?.id || req.ip || "";
      await ctaAbTesting.trackEvent(id, variantId, eventType, userId, sessionId, metadata);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to track event" });
    }
  });

  // Mount router at /api prefix
  app.use("/api", router);
}
