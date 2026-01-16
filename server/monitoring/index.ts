/**
 * Monitoring Module
 * Centralized monitoring utilities for TRAVI CMS
 */

import type { Express } from "express";
import { createLogger } from "../lib/logger";
import {
  queryAnalyzerMiddleware,
  recordQuery,
  getQueryAnalyzerStats,
  resetQueryAnalyzerStats,
} from "./query-analyzer";
import {
  latencyTrackerMiddleware,
  getLatencyMetrics,
  getEndpointMetrics,
  resetLatencyMetrics,
  cleanupOldSamples,
} from "./latency-tracker";

// Re-export all monitoring utilities
export {
  queryAnalyzerMiddleware,
  recordQuery,
  getQueryAnalyzerStats,
  resetQueryAnalyzerStats,
  latencyTrackerMiddleware,
  getLatencyMetrics,
  getEndpointMetrics,
  resetLatencyMetrics,
  cleanupOldSamples,
};

const monitoringLog = createLogger("monitoring");

/**
 * Setup all monitoring middleware for the Express app
 */
export function setupMonitoring(app: Express): void {
  // Apply monitoring middleware
  app.use(latencyTrackerMiddleware);
  app.use(queryAnalyzerMiddleware);
  
  monitoringLog.info({
    type: "setup",
    message: "Monitoring middleware initialized",
    features: ["latency-tracking", "n+1-detection"],
  });
  
  // Schedule periodic cleanup of old latency samples (every 6 hours)
  const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    cleanupOldSamples(24); // Keep last 24 hours of data
  }, CLEANUP_INTERVAL_MS);
  
  monitoringLog.info({
    type: "setup",
    message: "Scheduled latency sample cleanup every 6 hours",
  });
}

/**
 * Get combined performance metrics
 */
export function getPerformanceMetrics(): {
  latency: ReturnType<typeof getLatencyMetrics>;
  queries: ReturnType<typeof getQueryAnalyzerStats>;
  timestamp: string;
} {
  return {
    latency: getLatencyMetrics(),
    queries: getQueryAnalyzerStats(),
    timestamp: new Date().toISOString(),
  };
}
