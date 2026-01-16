/**
 * Editorial SLA Admin Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  evaluateContentSla,
  getStaleContent,
  getSlaStats,
  getAllPolicies,
  setExemption,
  removeExemption,
  getViolations,
} from "./evaluator";
import { isSlaEnforcementEnabled } from "./types";

export function registerEditorialSlaRoutes(app: Express): void {
  app.get("/api/admin/sla/content/:contentId", requireAuth, async (req: Request, res: Response) => {
    if (!isSlaEnforcementEnabled()) {
      return res.json({ enabled: false, message: "SLA enforcement disabled" });
    }

    const { contentId } = req.params;
    const status = await evaluateContentSla(contentId);
    res.json({ enabled: true, ...status });
  });

  app.get("/api/admin/sla/stale", requireAuth, async (req: Request, res: Response) => {
    if (!isSlaEnforcementEnabled()) {
      return res.json({ enabled: false, items: [] });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const stale = await getStaleContent(limit);
    res.json({ enabled: true, items: stale, count: stale.length });
  });

  app.get("/api/admin/sla/stats", requireAuth, async (req: Request, res: Response) => {
    const stats = await getSlaStats();
    res.json({ enabled: isSlaEnforcementEnabled(), ...stats });
  });

  app.get("/api/admin/sla/policies", requireAuth, async (req: Request, res: Response) => {
    const policies = getAllPolicies();
    res.json({ policies, count: policies.length });
  });

  app.post("/api/admin/sla/exempt/:contentId", requireAuth, async (req: Request, res: Response) => {
    if (!isSlaEnforcementEnabled()) {
      return res.status(403).json({ error: "Feature disabled" });
    }

    const { contentId } = req.params;
    const { reason, expiresAt } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Reason required" });
    }

    setExemption(contentId, reason, expiresAt ? new Date(expiresAt) : undefined);
    res.json({ success: true, contentId, reason });
  });

  app.delete("/api/admin/sla/exempt/:contentId", requireAuth, async (req: Request, res: Response) => {
    const { contentId } = req.params;
    removeExemption(contentId);
    res.json({ success: true, contentId });
  });

  app.get("/api/admin/sla/violations", requireAuth, async (req: Request, res: Response) => {
    const contentId = req.query.contentId as string | undefined;
    const violations = getViolations(contentId);
    res.json({ violations, count: violations.length });
  });

  console.log("[EditorialSLA] Routes registered");
}
