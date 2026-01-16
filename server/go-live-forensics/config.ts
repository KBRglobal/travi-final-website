/**
 * Go-Live Timeline & Forensics - Configuration
 * Feature Flag: ENABLE_GO_LIVE_FORENSICS=false
 */

export function isGoLiveForensicsEnabled(): boolean {
  return process.env.ENABLE_GO_LIVE_FORENSICS === 'true';
}

export const FORENSICS_CONFIG = {
  maxEvents: parseInt(process.env.FORENSICS_MAX_EVENTS || '10000', 10),
  retentionDays: parseInt(process.env.FORENSICS_RETENTION_DAYS || '90', 10),
  queryDefaultLimit: parseInt(process.env.FORENSICS_QUERY_LIMIT || '100', 10),
  queryMaxLimit: parseInt(process.env.FORENSICS_QUERY_MAX_LIMIT || '1000', 10),
  snapshotIntervalMs: parseInt(process.env.FORENSICS_SNAPSHOT_INTERVAL_MS || '3600000', 10), // 1 hour
  version: '1.0.0',
} as const;
