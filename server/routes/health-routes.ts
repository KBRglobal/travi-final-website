/**
 * Health & System Status Routes
 * Health checks for load balancers, Kubernetes probes, and monitoring
 */

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../security";
import { storage } from "../storage";

// Get version info from environment
function getVersionInfo() {
  return {
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
  };
}

export function registerHealthRoutes(app: Express): void {
  // Health check endpoint for monitoring and load balancers
  app.get("/api/health", async (_req: Request, res: Response) => {
    const HEALTH_CHECK_TIMEOUT = 3000;
    const startTime = Date.now();

    const health: {
      status: string;
      timestamp: string;
      uptime: number;
      version: string;
      responseTime: number;
      checks: Record<
        string,
        { status: string; latency?: number; usage?: number; details?: string }
      >;
    } = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      responseTime: 0,
      checks: {
        database: { status: "unknown", latency: 0 },
        memory: { status: "healthy", usage: 0 },
        eventLoop: { status: "healthy", latency: 0 },
      },
    };

    const runCheckWithTimeout = async <T>(
      name: string,
      check: () => Promise<T>,
      timeout: number
    ): Promise<{ success: boolean; result?: T; error?: string; latency: number }> => {
      const checkStart = Date.now();
      try {
        const result = await Promise.race([
          check(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${name} check timeout`)), timeout)
          ),
        ]);
        return { success: true, result, latency: Date.now() - checkStart };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          latency: Date.now() - checkStart,
        };
      }
    };

    // Database check
    const dbCheck = await runCheckWithTimeout(
      "database",
      async () => {
        await db.execute(sql`SELECT 1`);
        return true;
      },
      HEALTH_CHECK_TIMEOUT
    );

    health.checks.database = {
      status: dbCheck.success ? "healthy" : "unhealthy",
      latency: dbCheck.latency,
      details: dbCheck.error,
    };
    if (!dbCheck.success) health.status = "unhealthy";

    // Memory check - use fixed max-old-space-size (4096MB) as reference
    // Node's heapTotal is dynamic and much smaller than the actual limit,
    // causing false "critical" alerts when heapUsed/heapTotal > 95%
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const MAX_HEAP_MB = 4096; // matches --max-old-space-size in Dockerfile
    const memoryPercent = Math.round((heapUsedMB / MAX_HEAP_MB) * 100);

    let memoryStatus = "healthy";
    if (memoryPercent > 90) {
      memoryStatus = "critical";
      health.status = "unhealthy";
    } else if (memoryPercent > 75) {
      memoryStatus = "warning";
    }

    health.checks.memory = {
      status: memoryStatus,
      usage: memoryPercent,
      details: `${heapUsedMB}MB / ${MAX_HEAP_MB}MB`,
    };

    // Event loop check
    const eventLoopStart = Date.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopLag = Date.now() - eventLoopStart;

    health.checks.eventLoop = {
      status: eventLoopLag > 100 ? "warning" : "healthy",
      latency: eventLoopLag,
      details: eventLoopLag > 100 ? "Event loop may be blocked" : undefined,
    };

    // Cache and Storage checks run in parallel with short timeout
    const SECONDARY_TIMEOUT = 2000;
    const [cacheCheck, storageCheck] = await Promise.all([
      runCheckWithTimeout(
        "cache",
        async () => {
          const { cache } = await import("../cache");
          return cache.healthCheck();
        },
        SECONDARY_TIMEOUT
      ),
      runCheckWithTimeout(
        "storage",
        async () => {
          const { getStorageManager } = await import("../services/storage-adapter");
          const storageManager = getStorageManager();
          return storageManager.healthCheck();
        },
        SECONDARY_TIMEOUT
      ),
    ]);

    if (cacheCheck.success && cacheCheck.result) {
      health.checks.cache = {
        status: cacheCheck.result.status,
        latency: cacheCheck.result.latency,
        details: `${cacheCheck.result.type}${cacheCheck.result.error ? ": " + cacheCheck.result.error : ""}`,
      };
    } else {
      health.checks.cache = {
        status: "unknown",
        details: cacheCheck.error || "Cache check failed",
      };
    }

    // Storage timeout/failure should NOT make the whole health check unhealthy
    if (storageCheck.success && storageCheck.result) {
      health.checks.storage = {
        status: storageCheck.result.status,
        latency: storageCheck.result.latency,
        details: `${storageCheck.result.primary || "fallback"}: ${storageCheck.result.fallback}${storageCheck.result.error ? " (" + storageCheck.result.error + ")" : ""}`,
      };
    } else {
      health.checks.storage = {
        status: "unknown",
        details: storageCheck.error || "Storage check skipped (timeout)",
      };
    }

    health.responseTime = Date.now() - startTime;

    if (health.responseTime > HEALTH_CHECK_TIMEOUT) {
      health.status = health.status === "unhealthy" ? "unhealthy" : "degraded";
    }

    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Kubernetes liveness probe
  app.get("/api/health/live", (_req: Request, res: Response) => {
    res.status(200).json({ status: "alive", timestamp: new Date().toISOString() });
  });

  // Kubernetes readiness probe
  app.get("/api/health/ready", async (_req: Request, res: Response) => {
    const READY_CHECK_TIMEOUT = 3000;

    try {
      await Promise.race([
        db.execute(sql`SELECT 1`),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database check timeout")), READY_CHECK_TIMEOUT)
        ),
      ]);
      res.status(200).json({ status: "ready", timestamp: new Date().toISOString() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Database unavailable";
      res
        .status(503)
        .json({ status: "not ready", error: errorMessage, timestamp: new Date().toISOString() });
    }
  });

  // API Version info
  app.get("/api/version", (_req: Request, res: Response) => {
    const versionInfo = getVersionInfo();
    res.json({
      ...versionInfo,
      timestamp: new Date().toISOString(),
    });
  });

  // System status (authenticated)
  app.get("/api/system-status", requireAuth, async (_req: Request, res: Response) => {
    try {
      const memUsage = process.memoryUsage();
      const contentCount = (await (storage as any).getContentCount?.()) || 0;

      res.json({
        status: "operational",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
        content: {
          total: contentCount,
        },
        environment: process.env.NODE_ENV || "development",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get system status" });
    }
  });

  // Workers status (authenticated)
  app.get("/api/system/workers", requireAuth, async (_req: Request, res: Response) => {
    try {
      const { jobQueue } = await import("../job-queue");
      const stats = await jobQueue.getStats();

      res.json({
        queue: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get worker status" });
    }
  });
}
