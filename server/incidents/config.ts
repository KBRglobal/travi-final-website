/**
 * SLA/Incidents + Alerting System - Configuration
 * Feature Flag: ENABLE_INCIDENTS=true
 */

export function isIncidentsEnabled(): boolean {
  return process.env.ENABLE_INCIDENTS === "true";
}

export const INCIDENTS_CONFIG = {
  // Detection interval in milliseconds
  detectionIntervalMs: Number.parseInt(process.env.INCIDENT_DETECTION_INTERVAL_MS || "60000", 10),

  // Maximum incidents to store in memory (ring buffer)
  maxIncidentsStored: Number.parseInt(process.env.MAX_INCIDENTS_STORED || "1000", 10),

  // Thresholds for detectors
  thresholds: {
    // Job queue stalled if last tick > this many ms ago
    jobQueueStalledMs: Number.parseInt(process.env.JOB_QUEUE_STALLED_MS || "300000", 10), // 5 min

    // DB query slow if > this many ms
    dbSlowThresholdMs: Number.parseInt(process.env.DB_SLOW_THRESHOLD_MS || "5000", 10),

    // Search index lag threshold in seconds
    searchIndexLagSeconds: Number.parseInt(process.env.SEARCH_INDEX_LAG_SECONDS || "3600", 10), // 1 hour
  },

  // Auto-resolve after this many ms of no recurrence
  autoResolveAfterMs: Number.parseInt(process.env.INCIDENT_AUTO_RESOLVE_MS || "3600000", 10), // 1 hour
} as const;
