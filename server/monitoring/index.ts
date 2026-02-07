/**
 * Performance Monitoring System
 *
 * Tracks request latency, error rates, active connections,
 * memory usage, and event loop lag using in-memory rolling windows.
 */

import type { Express, Request, Response, NextFunction } from "express";
import { createLogger } from "../lib/logger";

const monitorLog = createLogger("monitoring");

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROLLING_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const SLOW_REQUEST_THRESHOLD_MS = 1000; // Log requests slower than 1s
const EVENT_LOOP_SAMPLE_INTERVAL_MS = 2000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // Clean stale entries every 60s

// ============================================================================
// TYPES
// ============================================================================

interface RequestRecord {
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

interface RouteMetrics {
  count: number;
  errorCount: number;
  latencies: number[];
}

// ============================================================================
// STATE
// ============================================================================

let isRunning = false;
let activeConnections = 0;
const requestRecords: RequestRecord[] = [];
let eventLoopLagMs = 0;
let eventLoopSampler: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// ============================================================================
// EVENT LOOP LAG MEASUREMENT
// ============================================================================

function startEventLoopSampler(): void {
  if (eventLoopSampler) return;
  eventLoopSampler = setInterval(() => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delta = Number(process.hrtime.bigint() - start) / 1e6; // ms
      eventLoopLagMs = Math.round(delta * 100) / 100;
    });
  }, EVENT_LOOP_SAMPLE_INTERVAL_MS);
  // Allow process to exit even if sampler is running
  eventLoopSampler.unref();
}

function stopEventLoopSampler(): void {
  if (eventLoopSampler) {
    clearInterval(eventLoopSampler);
    eventLoopSampler = null;
  }
}

// ============================================================================
// ROLLING WINDOW CLEANUP
// ============================================================================

function pruneOldRecords(): void {
  const cutoff = Date.now() - ROLLING_WINDOW_MS;
  while (requestRecords.length > 0 && requestRecords[0].timestamp < cutoff) {
    requestRecords.shift();
  }
}

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(pruneOldRecords, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// ============================================================================
// PERCENTILE CALCULATION
// ============================================================================

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ============================================================================
// ROUTE NORMALIZATION
// ============================================================================

/** Collapse UUID/numeric path segments into `:id` to group routes. */
function normalizeRoute(path: string): string {
  return path
    .replaceAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replaceAll(/\/\d+(?=\/|$)/g, "/:id");
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

function monitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isRunning) {
    next();
    return;
  }

  activeConnections++;
  const start = process.hrtime.bigint();

  const onFinish = (): void => {
    activeConnections = Math.max(0, activeConnections - 1);
    res.removeListener("finish", onFinish);
    res.removeListener("close", onFinish);

    const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1e4) / 100; // 2 decimal places

    const route = normalizeRoute(req.path);

    requestRecords.push({
      route,
      method: req.method,
      statusCode: res.statusCode,
      durationMs,
      timestamp: Date.now(),
    });

    // Log slow requests
    if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
      monitorLog.warn({
        type: "slow_request",
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      });
    }
  };

  res.on("finish", onFinish);
  res.on("close", onFinish);
  next();
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Install monitoring middleware on the Express app.
 * Signature must stay compatible: `setupMonitoring(app)`.
 */
export function setupMonitoring(...args: unknown[]): void {
  const app = args[0] as Express | undefined;
  if (!app || typeof (app as any).use !== "function") {
    return;
  }

  (app as Express).use(monitoringMiddleware);
  startEventLoopSampler();
  startCleanup();
  isRunning = true;
  monitorLog.info("Performance monitoring activated");
}

export function startMonitoring(): void {
  startEventLoopSampler();
  startCleanup();
  isRunning = true;
}

export function stopMonitoring(): void {
  isRunning = false;
  stopEventLoopSampler();
  stopCleanup();
}

export function getMonitoringStatus(): { running: boolean } {
  return { running: isRunning };
}

/**
 * Return aggregated performance metrics over the rolling window.
 * Backward-compatible: includes legacy `cpu`, `memory`, `requests` keys.
 */
export function getPerformanceMetrics(): Record<string, unknown> {
  pruneOldRecords();

  const memUsage = process.memoryUsage();

  // Aggregate per-route metrics
  const routeMap = new Map<string, RouteMetrics>();
  let totalErrors = 0;

  for (const rec of requestRecords) {
    const key = `${rec.method} ${rec.route}`;
    let entry = routeMap.get(key);
    if (!entry) {
      entry = { count: 0, errorCount: 0, latencies: [] };
      routeMap.set(key, entry);
    }
    entry.count++;
    entry.latencies.push(rec.durationMs);
    if (rec.statusCode >= 500) {
      entry.errorCount++;
      totalErrors++;
    }
  }

  // Build per-route summary with percentiles
  const routes: Record<
    string,
    {
      count: number;
      errorCount: number;
      p50: number;
      p95: number;
      p99: number;
      avg: number;
    }
  > = {};

  for (const [key, entry] of routeMap) {
    const sorted = entry.latencies.slice().sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    routes[key] = {
      count: entry.count,
      errorCount: entry.errorCount,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      avg: Math.round((sum / sorted.length) * 100) / 100,
    };
  }

  // Status code breakdown
  const statusCodes: Record<number, number> = {};
  for (const rec of requestRecords) {
    statusCodes[rec.statusCode] = (statusCodes[rec.statusCode] || 0) + 1;
  }

  // Global latency percentiles
  const allLatencies = requestRecords.map(r => r.durationMs).sort((a, b) => a - b);
  const globalSum = allLatencies.reduce((a, b) => a + b, 0);

  return {
    // Legacy keys for backward compatibility
    cpu: process.cpuUsage().user / 1e6, // seconds of CPU time
    memory: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    requests: requestRecords.length,

    // Detailed metrics
    window: {
      durationMs: ROLLING_WINDOW_MS,
      recordCount: requestRecords.length,
    },
    activeConnections,
    eventLoopLagMs,
    memoryUsage: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      externalMB: Math.round(memUsage.external / 1024 / 1024),
    },
    globalLatency: {
      p50: percentile(allLatencies, 50),
      p95: percentile(allLatencies, 95),
      p99: percentile(allLatencies, 99),
      avg: allLatencies.length > 0 ? Math.round((globalSum / allLatencies.length) * 100) / 100 : 0,
    },
    errorRate:
      requestRecords.length > 0
        ? Math.round((totalErrors / requestRecords.length) * 10000) / 100
        : 0, // percentage
    statusCodes,
    routes,
  };
}
