/**
 * Content Repair API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import { simulateRepair, executeRepair, getRepairHistory, type RepairType } from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_REPAIR === "true";
}

const VALID_REPAIR_TYPES: RepairType[] = [
  "re_extract_entities",
  "regenerate_aeo",
  "rebuild_internal_links",
  "flag_for_review",
  "update_schema",
  "fix_broken_links",
];

export function registerContentRepairRoutes(app: Express): void {
  // Simulate a repair action (dry run)
  app.post(
    "/api/admin/content/:id/repair/simulate",
    requirePermission("canEdit"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_REPAIR" });
      }

      try {
        const { repairType } = req.body;
        if (!repairType || !VALID_REPAIR_TYPES.includes(repairType)) {
          return res.status(400).json({
            error: "Invalid repair type",
            validTypes: VALID_REPAIR_TYPES,
          });
        }

        const result = await simulateRepair(req.params.id, repairType);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to simulate repair",
        });
      }
    }
  );

  // Execute a repair action
  app.post("/api/admin/content/:id/repair/run", requirePermission("canEdit"), async (req, res) => {
    if (!isEnabled()) {
      return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_REPAIR" });
    }

    try {
      const { repairType, dryRun = true } = req.body;
      if (!repairType || !VALID_REPAIR_TYPES.includes(repairType)) {
        return res.status(400).json({
          error: "Invalid repair type",
          validTypes: VALID_REPAIR_TYPES,
        });
      }

      const result = await executeRepair(req.params.id, repairType, dryRun);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to execute repair",
      });
    }
  });

  // Get repair history for content
  app.get(
    "/api/admin/content/:id/repair/history",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_CONTENT_REPAIR" });
      }

      try {
        const history = await getRepairHistory(req.params.id);
        res.json({ items: history });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch repair history" });
      }
    }
  );
}
