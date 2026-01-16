/**
 * Link Opportunities API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import { getLinkOpportunities } from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_LINK_OPPORTUNITIES === "true";
}

export function registerLinkOpportunityRoutes(app: Express): void {
  app.get(
    "/api/admin/content/:id/link-opportunities",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_LINK_OPPORTUNITIES" });
      }

      try {
        const { limit } = req.query;
        const result = await getLinkOpportunities(
          req.params.id,
          parseInt(limit as string) || 20
        );
        res.json(result);
      } catch (error) {
        console.error("[LinkOpportunities] Error:", error);
        res.status(500).json({ error: "Failed to fetch link opportunities" });
      }
    }
  );

  console.log("[LinkOpportunities] Routes registered");
}
