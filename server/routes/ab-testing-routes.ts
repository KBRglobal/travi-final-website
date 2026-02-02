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
      const { ctaAbTesting } = await import("../monetization/cta-ab-testing");
      const userId = getUserId(req as AuthRequest);
      const testId = await ctaAbTesting.createTest(req.body, userId);
      if (testId) {
        res.json({ success: true, testId });
      } else {
        res.status(500).json({ error: "Failed to create test" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to create A/B test" });
    }
  });

  app.get("/api/ab-tests", requireAuth, async (req, res) => {
    try {
      const { ctaAbTesting } = await import("../monetization/cta-ab-testing");
      const tests = await ctaAbTesting.listTests();
      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });

  app.post("/api/ab-tests/:id/start", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { ctaAbTesting } = await import("../monetization/cta-ab-testing");
      const { id } = req.params;
      const result = await ctaAbTesting.startTest(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to start A/B test" });
    }
  });

  app.post("/api/ab-tests/:id/stop", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { ctaAbTesting } = await import("../monetization/cta-ab-testing");
      const { id } = req.params;
      const result = await ctaAbTesting.stopTest(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop A/B test" });
    }
  });

  app.get("/api/ab-tests/:id/results", requireAuth, async (req, res) => {
    try {
      const { ctaAbTesting } = await import("../monetization/cta-ab-testing");
      const { id } = req.params;
      const results = await ctaAbTesting.getTestResults(id);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B test results" });
    }
  });

  app.get("/api/ab-tests/:id/variant", async (req, res) => {
    try {
      const { ctaAbTesting } = await import("../monetization/cta-ab-testing");
      const { id } = req.params;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub || "";
      const sessionId = authReq.session?.id || req.ip || "";
      const variant = await ctaAbTesting.getVariant(id, userId, sessionId);
      res.json(variant);
    } catch (error) {
      res.status(500).json({ error: "Failed to get variant" });
    }
  });

  app.post("/api/ab-tests/:id/track", async (req, res) => {
    try {
      const { ctaAbTesting } = await import("../monetization/cta-ab-testing");
      const { id } = req.params;
      const { variantId, eventType, metadata } = req.body;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;
      const sessionId = authReq.session?.id || req.ip || "";
      await ctaAbTesting.trackEvent(id, variantId, eventType, userId, sessionId, metadata);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track event" });
    }
  });
}
