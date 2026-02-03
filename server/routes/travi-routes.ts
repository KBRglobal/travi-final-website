/**
 * TRAVI Content Generator Routes
 * Admin dashboard for AI content generation, processing, and export
 */

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, ilike } from "drizzle-orm";
import { traviConfig, traviDistricts } from "@shared/schema";
import { requireAuth, requirePermission } from "../security";

export function registerTraviRoutes(app: Express): void {
  // ============================================================================
  // TRAVI CONTENT GENERATOR (Admin dashboard for content generation)
  // ============================================================================

  // GET /api/admin/travi/stats - Returns usage stats and budget status
  app.get(
    "/api/admin/travi/stats",
    requireAuth,
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const { getBudgetStatus, getTodayUsageStats, isProcessingPaused } =
          await import("../travi/budget-manager");
        const { getRunningJobs } = await import("../travi/checkpoint-manager");
        const { DESTINATION_METADATA } = await import("../travi/destination-seeder");

        const budgetStatus = await getBudgetStatus();
        const todayUsage = await getTodayUsageStats();
        const runningJobs = await getRunningJobs();

        const todayCost = todayUsage.reduce(
          (sum, u) => sum + parseFloat(u.estimatedCost || "0"),
          0
        );
        const todayRequests = todayUsage.reduce((sum, u) => sum + u.requestCount, 0);
        const todaySuccess = todayUsage.reduce((sum, u) => sum + u.successCount, 0);
        const todayFailed = todayUsage.reduce((sum, u) => sum + u.failedCount, 0);

        res.json({
          budget: budgetStatus,
          today: {
            cost: todayCost,
            requests: todayRequests,
            success: todaySuccess,
            failed: todayFailed,
          },
          processingStatus: isProcessingPaused()
            ? "paused"
            : runningJobs.length > 0
              ? "running"
              : "idle",
          runningJobsCount: runningJobs.length,
          destinations: DESTINATION_METADATA.map(d => ({
            slug: d.slug,
            city: d.city,
            country: d.country,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch stats" });
      }
    }
  );

  // GET /api/admin/travi/jobs - Returns list of processing jobs
  app.get(
    "/api/admin/travi/jobs",
    requireAuth,
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const { getRecentJobs } = await import("../travi/checkpoint-manager");
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const jobs = await getRecentJobs(limit);

        res.json({
          jobs: jobs.map(job => ({
            id: job.jobId,
            type: job.jobType,
            status: job.status,
            totalItems: job.totalItems,
            processedItems: job.processedItems,
            successCount: job.successCount,
            failedCount: job.failedCount,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch jobs" });
      }
    }
  );

  // POST /api/admin/travi/process - Start processing a destination/category
  app.post(
    "/api/admin/travi/process",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { WHITELISTED_DESTINATIONS } = await import("../travi/validation");
        const { processDestinationCategory } = await import("../travi/processing-orchestrator");

        const { destination, category, dryRun, batchSize, maxLocations } = req.body;

        if (!destination || !category) {
          return res.status(400).json({ error: "destination and category are required" });
        }

        const validDestinations = WHITELISTED_DESTINATIONS.map(d => d.slug);
        if (!validDestinations.includes(destination)) {
          return res.status(400).json({ error: "Invalid destination" });
        }

        const validCategories = ["attraction", "restaurant", "hotel"];
        if (!validCategories.includes(category)) {
          return res
            .status(400)
            .json({ error: "Invalid category. Must be: attraction, restaurant, or hotel" });
        }

        // Start processing in background
        const result = await processDestinationCategory(destination, category, {
          dryRun: dryRun || false,
          batchSize: Math.min(batchSize || 10, 50),
          maxLocations: Math.min(maxLocations || 100, 500),
        });

        res.json({
          success: true,
          jobId: result.jobId,
          status: result.status,
          message: `Started processing ${category}s for ${destination}`,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to start processing" });
      }
    }
  );

  // POST /api/admin/travi/pause - Pause all processing
  app.post(
    "/api/admin/travi/pause",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { pauseProcessing } = await import("../travi/budget-manager");
        pauseProcessing("Manual pause from admin dashboard");
        res.json({ success: true, message: "Processing paused" });
      } catch (error) {
        res.status(500).json({ error: "Failed to pause processing" });
      }
    }
  );

  // POST /api/admin/travi/resume - Resume processing
  app.post(
    "/api/admin/travi/resume",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { resumeProcessing } = await import("../travi/budget-manager");
        resumeProcessing();
        res.json({ success: true, message: "Processing resumed" });
      } catch (error) {
        res.status(500).json({ error: "Failed to resume processing" });
      }
    }
  );

  // GET /api/admin/travi/logs - Get recent processing logs
  app.get(
    "/api/admin/travi/logs",
    requireAuth,
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const { getRecentLogs } = await import("../travi/processing-orchestrator");
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const logs = getRecentLogs(limit);
        res.json({ logs });
      } catch (error) {
        res.status(500).json({ error: "Failed to get logs" });
      }
    }
  );

  // GET /api/admin/travi/export - Export locations with attribution
  app.get(
    "/api/admin/travi/export",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const exportModule = await import("../travi/export-module");
        const { exportLocations } = exportModule;

        const { destination, category, format, includeIncomplete } = req.query;

        const result = (await exportLocations((destination as string) || undefined)) as any;

        // Return 400 if validation failed and there are errors
        if (!result.success && result.validationErrors?.length > 0) {
          return res.status(400).json({
            error: "Export validation failed",
            validationErrors: result.validationErrors,
            totalLocations: result.totalLocations,
            exportedLocations: result.exportedLocations,
          });
        }

        if (format === "csv") {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="travi-export-${Date.now()}.csv"`
          );
          res.send(result.csv);
        } else {
          res.json(result);
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to export locations" });
      }
    }
  );

  // GET /api/admin/travi/export/summary - Get export summary by destination
  app.get(
    "/api/admin/travi/export/summary",
    requireAuth,
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const exportModule = await import("../travi/export-module");
        const exportSummary = (exportModule as any).exportSummary;
        const summary = await exportSummary();
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: "Failed to get export summary" });
      }
    }
  );

  // GET /api/admin/travi/config - Get configuration settings
  app.get(
    "/api/admin/travi/config",
    requireAuth,
    requirePermission("canViewAll"),
    async (req, res) => {
      try {
        const { DESTINATION_METADATA } = await import("../travi/destination-seeder");
        const { getBudgetStatus } = await import("../travi/budget-manager");

        const apiKeys = {
          openai: {
            configured: !!(
              process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY
            ),
          },
          anthropic: { configured: !!process.env.ANTHROPIC_API_KEY },
          gemini: {
            configured: !!(
              process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GOOGLE_AI_API_KEY
            ),
          },
          freepik: { configured: !!process.env.FREEPIK_API_KEY },
          googlePlaces: { configured: !!process.env.GOOGLE_PLACES_API_KEY },
          tripadvisor: { configured: !!process.env.TRIPADVISOR_API_KEY },
          tiqets: { configured: !!process.env.TIQETS_API_TOKEN },
        };

        const budgetStatus = await getBudgetStatus();

        const budgetConfig = await db
          .select()
          .from(traviConfig)
          .where(eq(traviConfig.configKey, "budget_settings"))
          .limit(1);

        const persistedBudget =
          budgetConfig.length > 0 ? (budgetConfig[0].configValue as any)?.value : null;

        const destinationConfigs = await db
          .select()
          .from(traviConfig)
          .where(ilike(traviConfig.configKey, "destination_%"));

        const enabledMap = new Map<string, boolean>();
        for (const config of destinationConfigs) {
          const destId = config.configKey.replace("destination_", "");
          enabledMap.set(destId, (config.configValue as any)?.enabled ?? true);
        }

        const destinations = DESTINATION_METADATA.map(d => ({
          id: d.slug,
          name: d.city,
          country: d.country,
          enabled: enabledMap.has(d.slug) ? enabledMap.get(d.slug) : true,
          locationCount: 0,
        }));

        res.json({
          apiKeys,
          budget: {
            dailyLimit: persistedBudget?.dailyLimit || (budgetStatus as any).dailyLimit || 50,
            warningThreshold:
              persistedBudget?.warningThreshold || (budgetStatus as any).warningThreshold || 40,
            currentSpend: (budgetStatus as any).currentSpend || 0,
          },
          destinations,
          affiliateLink: "https://tiqets.tpo.lu/k16k6RXU",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get config" });
      }
    }
  );

  // POST /api/admin/travi/config/test-api - Test an API connection
  app.post(
    "/api/admin/travi/config/test-api",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { provider } = req.body;

        const tests: Record<string, boolean> = {
          openai: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          gemini: !!(process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GOOGLE_AI_API_KEY),
          freepik: !!process.env.FREEPIK_API_KEY,
          googlePlaces: !!process.env.GOOGLE_PLACES_API_KEY,
          tripadvisor: !!process.env.TRIPADVISOR_API_KEY,
          tiqets: !!process.env.TIQETS_API_TOKEN,
        };

        if (tests[provider]) {
          res.json({ success: true, message: `${provider} API key is configured` });
        } else {
          res.status(400).json({ error: `${provider} API key is not configured` });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to test API" });
      }
    }
  );

  // PATCH /api/admin/travi/config/budget - Update budget settings
  app.patch(
    "/api/admin/travi/config/budget",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { dailyLimit, warningThreshold } = req.body;

        const configKey = "budget_settings";
        const existing = await db
          .select()
          .from(traviConfig)
          .where(eq(traviConfig.configKey, configKey))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(traviConfig)
            .set({
              configValue: { value: { dailyLimit, warningThreshold } },
              updatedAt: new Date(),
            } as any)
            .where(eq(traviConfig.configKey, configKey));
        } else {
          await db.insert(traviConfig).values({
            configKey,
            configValue: { value: { dailyLimit, warningThreshold } },
          } as any);
        }

        res.json({
          success: true,
          message: "Budget settings updated",
          dailyLimit,
          warningThreshold,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update budget" });
      }
    }
  );

  // PATCH /api/admin/travi/config/destinations/:id - Toggle destination enabled status
  app.patch(
    "/api/admin/travi/config/destinations/:id",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { enabled } = req.body;

        const configKey = `destination_${id}`;

        const existing = await db
          .select()
          .from(traviConfig)
          .where(eq(traviConfig.configKey, configKey))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(traviConfig)
            .set({
              configValue: { enabled, destinationId: id },
              updatedAt: new Date(),
            } as any)
            .where(eq(traviConfig.configKey, configKey));
        } else {
          await db.insert(traviConfig).values({
            configKey,
            configValue: { enabled, destinationId: id },
          } as any);
        }

        res.json({
          success: true,
          destinationId: id,
          enabled,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update destination" });
      }
    }
  );

  // GET /api/admin/travi/districts - List all districts for a city
  app.get(
    "/api/admin/travi/districts",
    requireAuth,
    requirePermission("canViewAll"),
    async (req, res) => {
      try {
        const { city } = req.query;

        const query = city
          ? db
              .select()
              .from(traviDistricts)
              .where(eq(traviDistricts.city, city as string))
              .orderBy(traviDistricts.displayOrder)
          : db
              .select()
              .from(traviDistricts)
              .orderBy(traviDistricts.city, traviDistricts.displayOrder);

        const districts = await query;
        res.json(districts);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch districts" });
      }
    }
  );
}
