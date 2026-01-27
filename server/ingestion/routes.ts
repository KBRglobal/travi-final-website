/**
 * Ingestion Admin Routes
 * API endpoints for managing and monitoring data ingestion
 *
 * Note: Authentication is applied at the registration level in feature-routes.ts
 * using isAuthenticated and requireAdmin middleware
 */

import { Router, type Request, type Response } from "express";
import { ingestionScheduler } from "./scheduler";

const router = Router();

/**
 * Format status for frontend dashboard
 */
function formatStatusForDashboard(status: ReturnType<typeof ingestionScheduler.getSourceStatus>) {
  if (!status) return null;

  const lastRun = status.lastRun;
  const hasError = lastRun?.status === "failed";
  const hasSuccess = lastRun?.status === "completed";

  return {
    source: status.source.id,
    displayName: status.source.displayName,
    description: status.source.description,
    isRunning: status.isRunning,
    lastRun: lastRun?.startedAt?.toISOString() || null,
    lastSuccess: hasSuccess ? lastRun?.completedAt?.toISOString() : null,
    lastError: hasError ? lastRun?.completedAt?.toISOString() : null,
    errorMessage: hasError ? lastRun?.error : null,
    recordCount: lastRun?.result?.recordsProcessed || 0,
    schedule: status.source.config.cronSchedule || "Not scheduled",
    nextRun: status.nextScheduledRun?.toISOString() || null,
    enabled: status.source.config.enabled,
  };
}

/**
 * GET /api/admin/ingestion/status
 * Get status of all registered ingestion sources
 */
router.get("/status", async (_req: Request, res: Response) => {
  try {
    const statuses = ingestionScheduler.getAllStatus();
    const formatted = statuses.map(s => formatStatusForDashboard(s)).filter(Boolean);

    res.json({
      success: true,
      data: formatted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get ingestion status",
    });
  }
});

/**
 * GET /api/admin/ingestion/:source/status
 * Get status of a specific ingestion source
 */
router.get("/:source/status", async (req: Request, res: Response) => {
  try {
    const { source } = req.params;
    const status = ingestionScheduler.getSourceStatus(source);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: `Source not found: ${source}`,
      });
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get source status",
    });
  }
});

/**
 * POST /api/admin/ingestion/:source/run
 * Trigger manual ingestion for a specific source
 */
router.post("/:source/run", async (req: Request, res: Response) => {
  try {
    const { source } = req.params;

    // Check if source exists
    const status = ingestionScheduler.getSourceStatus(source);
    if (!status) {
      return res.status(404).json({
        success: false,
        error: `Source not found: ${source}`,
      });
    }

    // Check if already running
    if (ingestionScheduler.isRunning(source)) {
      return res.status(409).json({
        success: false,
        error: `Ingestion already running for source: ${source}`,
      });
    }

    // Trigger ingestion (async - don't wait for completion)

    // Run in background
    ingestionScheduler.runIngestion(source).catch(error => {});

    res.json({
      success: true,
      message: `Ingestion started for source: ${source}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to trigger ingestion",
    });
  }
});

/**
 * GET /api/admin/ingestion/:source/history
 * Get run history for a specific source
 */
router.get("/:source/history", async (req: Request, res: Response) => {
  try {
    const { source } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    // Check if source exists
    const status = ingestionScheduler.getSourceStatus(source);
    if (!status) {
      return res.status(404).json({
        success: false,
        error: `Source not found: ${source}`,
      });
    }

    const history = ingestionScheduler.getRunHistory(source, limit);

    res.json({
      success: true,
      data: history,
      meta: {
        source,
        limit,
        count: history.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get ingestion history",
    });
  }
});

export const ingestionRoutes = router;
