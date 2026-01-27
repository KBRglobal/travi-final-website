/**
 * Content Experiments Admin Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  createExperiment,
  getExperiment,
  startExperiment,
  pauseExperiment,
  resumeExperiment,
  endExperiment,
  recordImpression,
  recordConversion,
  assignVariant,
  calculateResults,
  getAllExperiments,
  getContentExperiments,
  getRunningExperiments,
  getExperimentStats,
} from "./service";
import { isExperimentsEnabled } from "./types";

export function registerContentExperimentsRoutes(app: Express): void {
  app.post("/api/admin/experiments", requireAuth, async (req: Request, res: Response) => {
    if (!isExperimentsEnabled()) {
      return res.status(403).json({ error: "Experiments disabled" });
    }
    const { name, contentId, description, trafficSplit, minimumSampleSize, confidenceLevel } =
      req.body;
    const createdBy = (req as any).user?.id || "system";
    const experiment = createExperiment(name, contentId, createdBy, {
      description,
      trafficSplit,
      minimumSampleSize,
      confidenceLevel,
    });
    res.json({ success: true, experiment });
  });

  app.get("/api/admin/experiments/:id", requireAuth, async (req: Request, res: Response) => {
    const experiment = getExperiment(req.params.id);
    res.json(experiment || { error: "Experiment not found" });
  });

  app.post("/api/admin/experiments/:id/start", requireAuth, async (req: Request, res: Response) => {
    const success = startExperiment(req.params.id);
    res.json({ success });
  });

  app.post("/api/admin/experiments/:id/pause", requireAuth, async (req: Request, res: Response) => {
    const success = pauseExperiment(req.params.id);
    res.json({ success });
  });

  app.post(
    "/api/admin/experiments/:id/resume",
    requireAuth,
    async (req: Request, res: Response) => {
      const success = resumeExperiment(req.params.id);
      res.json({ success });
    }
  );

  app.post("/api/admin/experiments/:id/end", requireAuth, async (req: Request, res: Response) => {
    const success = endExperiment(req.params.id);
    res.json({ success });
  });

  app.post(
    "/api/admin/experiments/:id/impression",
    requireAuth,
    async (req: Request, res: Response) => {
      const { variantType } = req.body;
      const success = recordImpression(req.params.id, variantType);
      res.json({ success });
    }
  );

  app.post(
    "/api/admin/experiments/:id/conversion",
    requireAuth,
    async (req: Request, res: Response) => {
      const { variantType } = req.body;
      const success = recordConversion(req.params.id, variantType);
      res.json({ success });
    }
  );

  app.get("/api/admin/experiments/:id/assign", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || "anonymous";
    const variant = assignVariant(req.params.id, userId);
    res.json({ variant });
  });

  app.get(
    "/api/admin/experiments/:id/results",
    requireAuth,
    async (req: Request, res: Response) => {
      const results = calculateResults(req.params.id);
      res.json(results || { error: "Could not calculate results" });
    }
  );

  app.get("/api/admin/experiments", requireAuth, async (req: Request, res: Response) => {
    const experiments = getAllExperiments();
    res.json({ experiments, count: experiments.length });
  });

  app.get(
    "/api/admin/experiments/content/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      const experiments = getContentExperiments(req.params.contentId);
      res.json({ experiments, count: experiments.length });
    }
  );

  app.get("/api/admin/experiments/running", requireAuth, async (req: Request, res: Response) => {
    const experiments = getRunningExperiments();
    res.json({ experiments, count: experiments.length });
  });

  app.get("/api/admin/experiments/stats", requireAuth, async (req: Request, res: Response) => {
    const stats = getExperimentStats();
    res.json({ enabled: isExperimentsEnabled(), ...stats });
  });
}
