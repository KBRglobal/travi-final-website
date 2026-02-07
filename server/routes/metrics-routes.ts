/**
 * Prometheus Metrics Routes
 * Exposes application metrics in Prometheus format
 */

import type { Express, Request, Response } from "express";
import { log } from "../lib/logger";

// In-memory metrics storage
interface MetricValue {
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface Metric {
  name: string;
  help: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  values: MetricValue[];
}

const metrics: Map<string, Metric> = new Map();

// Initialize default metrics
function initializeMetrics() {
  // HTTP request metrics
  registerMetric("http_requests_total", "Total HTTP requests", "counter");
  registerMetric("http_request_duration_seconds", "HTTP request duration in seconds", "histogram");
  registerMetric("http_requests_in_flight", "Current HTTP requests being processed", "gauge");

  // Application metrics
  registerMetric("app_info", "Application information", "gauge");
  registerMetric("app_uptime_seconds", "Application uptime in seconds", "gauge");

  // Database metrics
  registerMetric("db_connections_active", "Active database connections", "gauge");
  registerMetric("db_connections_idle", "Idle database connections", "gauge");
  registerMetric("db_query_duration_seconds", "Database query duration", "histogram");

  // Cache metrics
  registerMetric("cache_hits_total", "Total cache hits", "counter");
  registerMetric("cache_misses_total", "Total cache misses", "counter");
  registerMetric("cache_size_bytes", "Cache size in bytes", "gauge");

  // Job queue metrics
  registerMetric("job_queue_size", "Number of jobs in queue", "gauge");
  registerMetric("job_processed_total", "Total jobs processed", "counter");
  registerMetric("job_failed_total", "Total jobs failed", "counter");

  // AI service metrics
  registerMetric("ai_requests_total", "Total AI API requests", "counter");
  registerMetric("ai_tokens_used_total", "Total AI tokens used", "counter");
  registerMetric("ai_request_duration_seconds", "AI request duration", "histogram");

  // Content metrics
  registerMetric("content_total", "Total content items", "gauge");
  registerMetric("content_published", "Published content items", "gauge");

  // Memory metrics
  registerMetric("nodejs_heap_size_bytes", "Node.js heap size", "gauge");
  registerMetric("nodejs_heap_used_bytes", "Node.js heap used", "gauge");
  registerMetric("nodejs_external_memory_bytes", "Node.js external memory", "gauge");

  // Event loop metrics
  registerMetric("nodejs_eventloop_lag_seconds", "Node.js event loop lag", "gauge");

  // Set initial app info
  setGauge("app_info", 1, { version: "1.0.0", node_version: process.version });
}

/**
 * Register a new metric
 */
function registerMetric(name: string, help: string, type: Metric["type"]) {
  if (!metrics.has(name)) {
    metrics.set(name, { name, help, type, values: [] });
  }
}

/**
 * Increment a counter
 */
export function incCounter(name: string, value: number = 1, labels: Record<string, string> = {}) {
  const metric = metrics.get(name);
  if (!metric || metric.type !== "counter") return;

  const labelKey = JSON.stringify(labels);
  const existing = metric.values.find(v => JSON.stringify(v.labels) === labelKey);

  if (existing) {
    existing.value += value;
    existing.timestamp = Date.now();
  } else {
    metric.values.push({ value, labels, timestamp: Date.now() });
  }
}

/**
 * Set a gauge value
 */
export function setGauge(name: string, value: number, labels: Record<string, string> = {}) {
  const metric = metrics.get(name);
  if (!metric || metric.type !== "gauge") return;

  const labelKey = JSON.stringify(labels);
  const existing = metric.values.find(v => JSON.stringify(v.labels) === labelKey);

  if (existing) {
    existing.value = value;
    existing.timestamp = Date.now();
  } else {
    metric.values.push({ value, labels, timestamp: Date.now() });
  }
}

/**
 * Observe a histogram value
 */
export function observeHistogram(name: string, value: number, labels: Record<string, string> = {}) {
  // For simplicity, we'll track sum and count
  const metric = metrics.get(name);
  if (!metric || metric.type !== "histogram") return;

  const sumName = `${name}_sum`;
  const countName = `${name}_count`;

  incCounter(countName, 1, labels);
  incCounter(sumName, value, labels);
}

/**
 * Format metrics in Prometheus format
 */
function formatMetrics(): string {
  const lines: string[] = [];
  const startTime = Date.now() - process.uptime() * 1000;

  // Update dynamic metrics
  updateDynamicMetrics();

  for (const metric of metrics.values()) {
    // Help and type
    lines.push(`# HELP ${metric.name} ${metric.help}`, `# TYPE ${metric.name} ${metric.type}`);

    // Values
    for (const { value, labels } of metric.values) {
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");

      if (labelStr) {
        lines.push(`${metric.name}{${labelStr}} ${value}`);
      } else {
        lines.push(`${metric.name} ${value}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Update dynamic metrics (memory, uptime, etc.)
 */
function updateDynamicMetrics() {
  // Memory metrics
  const memUsage = process.memoryUsage();
  setGauge("nodejs_heap_size_bytes", memUsage.heapTotal);
  setGauge("nodejs_heap_used_bytes", memUsage.heapUsed);
  setGauge("nodejs_external_memory_bytes", memUsage.external);

  // Uptime
  setGauge("app_uptime_seconds", process.uptime());

  // Event loop lag (simple approximation)
  const start = Date.now();
  setImmediate(() => {
    const lag = (Date.now() - start) / 1000;
    setGauge("nodejs_eventloop_lag_seconds", lag);
  });
}

/**
 * Middleware to track HTTP metrics
 */
export function httpMetricsMiddleware(req: Request, res: Response, next: () => void) {
  const startTime = Date.now();

  // Increment in-flight requests
  incCounter("http_requests_in_flight", 1, { method: req.method });

  // On response finish
  res.on("finish", () => {
    const duration = (Date.now() - startTime) / 1000;
    const labels = {
      method: req.method,
      status: String(res.statusCode),
      path: req.route?.path || req.path,
    };

    incCounter("http_requests_total", 1, labels);
    observeHistogram("http_request_duration_seconds", duration, labels);
    incCounter("http_requests_in_flight", -1, { method: req.method });
  });

  next();
}

/**
 * Register metrics routes
 */
export function registerMetricsRoutes(app: Express) {
  // Initialize metrics on first load
  initializeMetrics();

  // Metrics endpoint (Prometheus format)
  app.get("/api/metrics", (req: Request, res: Response) => {
    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(formatMetrics());
  });

  // JSON metrics endpoint (for internal use)
  app.get("/api/metrics/json", (req: Request, res: Response) => {
    updateDynamicMetrics();

    const result: Record<string, unknown> = {};
    for (const [name, metric] of metrics) {
      result[name] = {
        help: metric.help,
        type: metric.type,
        values: metric.values,
      };
    }

    res.json(result);
  });

  log.info("[Metrics] Prometheus metrics endpoint registered at /api/metrics");
}

// Export for use in other modules
export { incCounter as incrementCounter, setGauge as setMetricGauge };
