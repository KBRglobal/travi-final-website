/**
 * AI Cost Forecast API Routes
 */

import type { Express } from "express";
import { requirePermission } from "../security";
import { getCostForecast } from "./index";

function isEnabled(): boolean {
  return process.env.ENABLE_AI_COST_FORECAST === "true";
}

export function registerAiCostForecastRoutes(app: Express): void {
  app.get(
    "/api/admin/ai-cost/forecast",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      if (!isEnabled()) {
        return res.status(503).json({ error: "Feature disabled", flag: "ENABLE_AI_COST_FORECAST" });
      }

      try {
        const forecast = await getCostForecast();
        res.json(forecast);
      } catch (error) {
        res.status(500).json({ error: "Failed to generate forecast" });
      }
    }
  );
}
