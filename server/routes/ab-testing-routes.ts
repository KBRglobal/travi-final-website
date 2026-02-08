/**
 * A/B Testing Routes
 * Endpoints for managing and tracking A/B tests
 */

import type { Express } from "express";
import { requireAuth, requirePermission, type AuthRequest } from "../security";

// Helper to get user ID from auth request
function getUserId(req: AuthRequest): string | undefined {
  return (req as any).user?.claims?.sub || (req as any).user?.id;
}

export function registerAbTestingRoutes(app: Express): void {
  // ============================================================================
  // A/B TESTING
  // ============================================================================
  app.post("/api/ab-tests", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const ctaAbTesting = (await import("../monetization/cta-ab-testing")) as any;
      const userId = getUserId(req as AuthRequest);
      const testId = await ctaAbTesting.ctaAbTestingService.createTest(req.body, userId);
      if (testId) {
        res.json({ success: true, testId });
      } else {
        res.status(500).json({ error: "Failed to create test" });
      }
    } catch {
      res.status(500).json({ error: "Failed to create A/B test" });
    }
  });

  app.get("/api/ab-tests", requireAuth, async (req, res) => {
    try {
      const ctaAbTesting = (await import("../monetization/cta-ab-testing")) as any;
      const tests = await ctaAbTesting.ctaAbTestingService.getTests();
      res.json(tests);
    } catch {
      res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });

  app.post("/api/ab-tests/:id/start", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const ctaAbTesting = (await import("../monetization/cta-ab-testing")) as any;
      const { id } = req.params;
      const result = await ctaAbTesting.ctaAbTestingService.updateTest(id, { status: "running" });
      res.json({ success: result });
    } catch {
      res.status(500).json({ error: "Failed to start A/B test" });
    }
  });

  app.post("/api/ab-tests/:id/stop", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const ctaAbTesting = (await import("../monetization/cta-ab-testing")) as any;
      const { id } = req.params;
      const result = await ctaAbTesting.ctaAbTestingService.updateTest(id, { status: "stopped" });
      res.json({ success: result });
    } catch {
      res.status(500).json({ error: "Failed to stop A/B test" });
    }
  });

  app.get("/api/ab-tests/:id/results", requireAuth, async (req, res) => {
    try {
      const ctaAbTesting = (await import("../monetization/cta-ab-testing")) as any;
      const { id } = req.params;
      const results = await ctaAbTesting.ctaAbTestingService.getResults(id);
      res.json(results);
    } catch {
      res.status(500).json({ error: "Failed to fetch A/B test results" });
    }
  });

  app.get("/api/ab-tests/:id/variant", async (req, res) => {
    try {
      const ctaAbTesting = (await import("../monetization/cta-ab-testing")) as any;
      const { id } = req.params;
      const variant = await ctaAbTesting.ctaAbTestingService.getTest(id);
      res.json(variant);
    } catch {
      res.status(500).json({ error: "Failed to get variant" });
    }
  });

  app.post("/api/ab-tests/:id/track", async (req, res) => {
    try {
      const ctaAbTesting = (await import("../monetization/cta-ab-testing")) as any;
      const { id } = req.params;
      const { variantId } = req.body;
      await ctaAbTesting.ctaAbTestingService.recordConversion(id, variantId);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to track event" });
    }
  });
}
