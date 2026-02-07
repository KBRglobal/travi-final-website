/**
 * SLA/Incidents + Alerting System - Detectors
 * Checks various system health signals
 */

import { createLogger } from "../lib/logger";
import { INCIDENTS_CONFIG } from "./config";
import type { DetectorResult } from "./types";

const logger = createLogger("incident-detector");

// Track last known states for detecting issues
let lastJobQueueTick: Date | null = null;
let eventBusInitialized = false;
let lastDbQueryMs = 0;
let lastSearchIndexCheck: Date | null = null;
let searchIndexLagSeconds = 0;

// ============================================================================
// External State Updates (called by other systems)
// ============================================================================

export function updateJobQueueTick(): void {
  lastJobQueueTick = new Date();
}

export function setEventBusInitialized(initialized: boolean): void {
  eventBusInitialized = initialized;
}

export function recordDbQueryTime(ms: number): void {
  lastDbQueryMs = ms;
}

export function updateSearchIndexLag(lagSeconds: number): void {
  lastSearchIndexCheck = new Date();
  searchIndexLagSeconds = lagSeconds;
}

// ============================================================================
// Individual Detectors
// ============================================================================

function detectJobQueueStalled(): DetectorResult {
  const now = Date.now();
  const stalledThreshold = INCIDENTS_CONFIG.thresholds.jobQueueStalledMs;

  if (!lastJobQueueTick) {
    return {
      hasIssue: false,
      source: "job_queue_stalled",
      severity: "info",
      title: "Job queue status unknown",
      description: "Job queue has not reported any ticks yet",
    };
  }

  const msSinceLastTick = now - lastJobQueueTick.getTime();

  if (msSinceLastTick > stalledThreshold) {
    return {
      hasIssue: true,
      source: "job_queue_stalled",
      severity: msSinceLastTick > stalledThreshold * 2 ? "critical" : "warn",
      title: "Job queue appears stalled",
      description: `Last tick was ${Math.round(msSinceLastTick / 1000)}s ago (threshold: ${stalledThreshold / 1000}s)`,
      metadata: { lastTick: lastJobQueueTick.toISOString(), msSinceLastTick },
    };
  }

  return {
    hasIssue: false,
    source: "job_queue_stalled",
    severity: "info",
    title: "Job queue healthy",
    description: "Job queue is ticking normally",
  };
}

function detectEventBusNotInitialized(): DetectorResult {
  if (!eventBusInitialized) {
    return {
      hasIssue: true,
      source: "event_bus_not_initialized",
      severity: "critical",
      title: "Event bus not initialized",
      description:
        "The event bus system has not been initialized. Event-driven features will not work.",
    };
  }

  return {
    hasIssue: false,
    source: "event_bus_not_initialized",
    severity: "info",
    title: "Event bus initialized",
    description: "Event bus is running normally",
  };
}

function detectDbSlow(): DetectorResult {
  const threshold = INCIDENTS_CONFIG.thresholds.dbSlowThresholdMs;

  if (lastDbQueryMs > threshold) {
    return {
      hasIssue: true,
      source: "db_slow",
      severity: lastDbQueryMs > threshold * 3 ? "critical" : "warn",
      title: "Database queries slow",
      description: `Last query took ${lastDbQueryMs}ms (threshold: ${threshold}ms)`,
      metadata: { lastQueryMs: lastDbQueryMs, threshold },
    };
  }

  return {
    hasIssue: false,
    source: "db_slow",
    severity: "info",
    title: "Database performance normal",
    description: "Database queries within threshold",
  };
}

function detectSearchIndexLag(): DetectorResult {
  const threshold = INCIDENTS_CONFIG.thresholds.searchIndexLagSeconds;

  if (searchIndexLagSeconds > threshold) {
    return {
      hasIssue: true,
      source: "search_index_lag",
      severity: searchIndexLagSeconds > threshold * 2 ? "critical" : "warn",
      title: "Search index lagging",
      description: `Search index is ${searchIndexLagSeconds}s behind (threshold: ${threshold}s)`,
      metadata: { lagSeconds: searchIndexLagSeconds, threshold },
    };
  }

  return {
    hasIssue: false,
    source: "search_index_lag",
    severity: "info",
    title: "Search index up to date",
    description: "Search indexing is within acceptable lag",
  };
}

// ============================================================================
// Run All Detectors
// ============================================================================

export function runAllDetectors(): DetectorResult[] {
  const results: DetectorResult[] = [];

  try {
    results.push(detectJobQueueStalled());
  } catch (err) {
    logger.error({ err }, "Job queue detector failed");
  }

  try {
    results.push(detectEventBusNotInitialized());
  } catch (err) {
    logger.error({ err }, "Event bus detector failed");
  }

  try {
    results.push(detectDbSlow());
  } catch (err) {
    logger.error({ err }, "DB slow detector failed");
  }

  try {
    results.push(detectSearchIndexLag());
  } catch (err) {
    logger.error({ err }, "Search index detector failed");
  }

  return results;
}

export function getDetectedIssues(): DetectorResult[] {
  return runAllDetectors().filter(r => r.hasIssue);
}
