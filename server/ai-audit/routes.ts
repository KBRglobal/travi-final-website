/**
 * AI Audit Trail Admin Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  recordAiOperation,
  reviewAuditEntry,
  getAuditEntry,
  queryAuditLog,
  getContentAuditHistory,
  getAuditStats,
  getPendingReviews,
  exportAuditLog,
} from "./service";
import { isAiAuditEnabled, type AiOperationType, type AuditStatus } from "./types";

export function registerAiAuditRoutes(app: Express): void {
  app.post("/api/admin/ai-audit/record", requireAuth, async (req: Request, res: Response) => {
    if (!isAiAuditEnabled()) {
      return res.status(403).json({ error: "AI audit disabled" });
    }
    const {
      contentId,
      operationType,
      model,
      prompt,
      output,
      promptTokens,
      outputTokens,
      cost,
      duration,
      metadata,
    } = req.body;
    const createdBy = (req as any).user?.id || "system";
    const entry = recordAiOperation(contentId, operationType, model, prompt, output, createdBy, {
      promptTokens,
      outputTokens,
      cost,
      duration,
      metadata,
    });
    res.json({ success: true, entry });
  });

  app.post(
    "/api/admin/ai-audit/:entryId/review",
    requireAuth,
    async (req: Request, res: Response) => {
      const { status, notes } = req.body;
      const reviewedBy = (req as any).user?.id || "system";
      const success = reviewAuditEntry(
        req.params.entryId,
        status as AuditStatus,
        reviewedBy,
        notes
      );
      res.json({ success });
    }
  );

  app.get("/api/admin/ai-audit/:entryId", requireAuth, async (req: Request, res: Response) => {
    const entry = getAuditEntry(req.params.entryId);
    res.json(entry || { error: "Entry not found" });
  });

  app.get(
    "/api/admin/ai-audit/content/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      const history = getContentAuditHistory(req.params.contentId);
      res.json({ history, count: history.length });
    }
  );

  app.get("/api/admin/ai-audit/query", requireAuth, async (req: Request, res: Response) => {
    const filter = {
      contentId: req.query.contentId as string,
      operationType: req.query.operationType as AiOperationType,
      status: req.query.status as AuditStatus,
      model: req.query.model as string,
      limit: parseInt(req.query.limit as string) || 100,
    };
    const entries = queryAuditLog(filter);
    res.json({ entries, count: entries.length });
  });

  app.get("/api/admin/ai-audit/stats", requireAuth, async (req: Request, res: Response) => {
    const stats = getAuditStats();
    res.json({ enabled: isAiAuditEnabled(), ...stats });
  });

  app.get("/api/admin/ai-audit/pending", requireAuth, async (req: Request, res: Response) => {
    const pending = getPendingReviews();
    res.json({ pending, count: pending.length });
  });

  app.get("/api/admin/ai-audit/export", requireAuth, async (req: Request, res: Response) => {
    const json = exportAuditLog();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=ai-audit-log.json");
    res.send(json);
  });
}
