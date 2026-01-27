/**
 * Pre-Publish Checklist Routes
 *
 * API endpoints for the pre-publish checklist system.
 *
 * FEATURE 5: Pre-Publish Checklist UI
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../../security";
import { evaluateChecklist, passesRequiredChecks } from "./evaluator";

/**
 * Register checklist routes
 */
export function registerChecklistRoutes(app: Express): void {
  /**
   * GET /api/admin/content/:id/publish-checklist
   *
   * Get the pre-publish checklist for a content item.
   * Shows all checks with pass/fail status and detailed messages.
   */
  app.get(
    "/api/admin/content/:id/publish-checklist",
    requireAuth,
    async (req: Request, res: Response) => {
      const { id } = req.params;

      try {
        const checklist = await evaluateChecklist(id);
        res.json(checklist);
      } catch (error) {
        res.status(500).json({
          error: "Failed to evaluate checklist",
          contentId: id,
        });
      }
    }
  );

  /**
   * GET /api/admin/content/:id/can-publish
   *
   * Quick check if content can be published.
   * Returns just a boolean for UI button state.
   */
  app.get(
    "/api/admin/content/:id/can-publish",
    requireAuth,
    async (req: Request, res: Response) => {
      const { id } = req.params;

      try {
        const canPublish = await passesRequiredChecks(id);
        res.json({
          contentId: id,
          canPublish,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          contentId: id,
          canPublish: false,
          error: "Check failed",
        });
      }
    }
  );
}
