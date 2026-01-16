/**
 * API Latency Tracking Middleware
 * Tracks response times, calculates percentiles, and logs slow requests
 */

import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../lib/logger";

const latencyLog = createLogger("latency-tracker");

// Thresholds for slow request logging
const SLOW_REQUEST_WARNING_MS = 2000; // 2 seconds
const SLOW_REQUEST_ERROR_MS = 5000; // 5 seconds

// Maximum samples to keep per endpoint for percentile calculations
const MAX_SAMPLES_PER_ENDPOINT = 1000;

interface LatencySample {
  duration: number;
  timestamp: number;
  statusCode: number;
}

interface EndpointMetrics {
  samples: LatencySample[];
  totalRequests: number;
  slowRequestCount: number;
  errorCount: number;
  lastUpdated: number;
}

// Store latency data by normalized endpoint path
const endpointMetrics = new Map<string, EndpointMetrics>();

// Global counters
let totalRequests = 0;
let totalSlowRequests = 0;

/**
 * Normalize endpoint path for grouping
 * Replaces dynamic segments with placeholders
 */
function normalizeEndpointPath(path: string, method: string): string {
  const normalizedPath = path
    // Replace UUIDs
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, ":id")
    // Replace numeric IDs
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    // Replace slugs (alphanumeric with dashes, longer than 3 chars after /)
    .replace(/\/[a-z0-9-]{4,}(?=\/|$)/gi, "/:slug");
  
  return `${method} ${normalizedPath}`;
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Get or create metrics for an endpoint
 */
function getOrCreateMetrics(endpoint: string): EndpointMetrics {
  if (!endpointMetrics.has(endpoint)) {
    endpointMetrics.set(endpoint, {
      samples: [],
      totalRequests: 0,
      slowRequestCount: 0,
      errorCount: 0,
      lastUpdated: Date.now(),
    });
  }
  return endpointMetrics.get(endpoint)!;
}

/**
 * Record a latency sample
 */
function recordSample(endpoint: string, duration: number, statusCode: number): void {
  const metrics = getOrCreateMetrics(endpoint);
  
  // Add sample
  metrics.samples.push({
    duration,
    timestamp: Date.now(),
    statusCode,
  });
  
  // Trim old samples if exceeding limit
  if (metrics.samples.length > MAX_SAMPLES_PER_ENDPOINT) {
    metrics.samples = metrics.samples.slice(-MAX_SAMPLES_PER_ENDPOINT);
  }
  
  metrics.totalRequests++;
  metrics.lastUpdated = Date.now();
  
  if (statusCode >= 500) {
    metrics.errorCount++;
  }
  
  if (duration >= SLOW_REQUEST_WARNING_MS) {
    metrics.slowRequestCount++;
    totalSlowRequests++;
  }
  
  totalRequests++;
}

/**
 * Calculate metrics for an endpoint
 */
function calculateEndpointMetrics(metrics: EndpointMetrics): {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  slowCount: number;
  errorCount: number;
} {
  if (metrics.samples.length === 0) {
    return {
      p50: 0,
      p95: 0,
      p99: 0,
      avg: 0,
      min: 0,
      max: 0,
      count: 0,
      slowCount: 0,
      errorCount: 0,
    };
  }
  
  const durations = metrics.samples.map(s => s.duration).sort((a, b) => a - b);
  const sum = durations.reduce((acc, val) => acc + val, 0);
  
  return {
    p50: calculatePercentile(durations, 50),
    p95: calculatePercentile(durations, 95),
    p99: calculatePercentile(durations, 99),
    avg: Math.round(sum / durations.length),
    min: durations[0],
    max: durations[durations.length - 1],
    count: metrics.totalRequests,
    slowCount: metrics.slowRequestCount,
    errorCount: metrics.errorCount,
  };
}

/**
 * Express middleware for latency tracking
 */
export function latencyTrackerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip non-API routes
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }
  
  const startTime = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const endpoint = normalizeEndpointPath(req.path, req.method);
    
    // Record the sample
    recordSample(endpoint, duration, res.statusCode);
    
    // Log slow requests
    if (duration >= SLOW_REQUEST_ERROR_MS) {
      latencyLog.error({
        type: "slow_request",
        severity: "error",
        endpoint,
        path: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        message: `Very slow request: ${duration}ms`,
      });
    } else if (duration >= SLOW_REQUEST_WARNING_MS) {
      latencyLog.warn({
        type: "slow_request",
        severity: "warning",
        endpoint,
        path: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        message: `Slow request: ${duration}ms`,
      });
    }
  });
  
  next();
}

/**
 * Get latency metrics for all endpoints
 */
export function getLatencyMetrics(): {
  endpoints: Record<string, {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
    count: number;
    slowCount: number;
    errorCount: number;
  }>;
  global: {
    totalRequests: number;
    totalSlowRequests: number;
    endpointCount: number;
  };
} {
  const endpoints: Record<string, ReturnType<typeof calculateEndpointMetrics>> = {};
  
  for (const [endpoint, metrics] of endpointMetrics) {
    endpoints[endpoint] = calculateEndpointMetrics(metrics);
  }
  
  return {
    endpoints,
    global: {
      totalRequests,
      totalSlowRequests,
      endpointCount: endpointMetrics.size,
    },
  };
}

/**
 * Get metrics for a specific endpoint
 */
export function getEndpointMetrics(method: string, path: string): ReturnType<typeof calculateEndpointMetrics> | null {
  const endpoint = normalizeEndpointPath(path, method);
  const metrics = endpointMetrics.get(endpoint);
  
  if (!metrics) return null;
  
  return calculateEndpointMetrics(metrics);
}

/**
 * Reset all metrics (for testing)
 */
export function resetLatencyMetrics(): void {
  endpointMetrics.clear();
  totalRequests = 0;
  totalSlowRequests = 0;
}

/**
 * Clean up old samples (older than specified hours)
 */
export function cleanupOldSamples(maxAgeHours: number = 24): void {
  const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  
  for (const [endpoint, metrics] of endpointMetrics) {
    metrics.samples = metrics.samples.filter(s => s.timestamp > cutoff);
    
    // Remove endpoint if no samples remain
    if (metrics.samples.length === 0) {
      endpointMetrics.delete(endpoint);
    }
  }
  
  latencyLog.info({
    type: "cleanup",
    message: `Cleaned up samples older than ${maxAgeHours} hours`,
    remainingEndpoints: endpointMetrics.size,
  });
}
