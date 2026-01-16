/**
 * System State Snapshot & Forensics - Types
 *
 * FEATURE 5: Be able to answer "what exactly was the system state at time X"
 */

export type SnapshotTrigger = 'manual' | 'scheduled' | 'incident' | 'startup' | 'shutdown';

export interface FeatureFlagSnapshot {
  name: string;
  enabled: boolean;
  value?: string;
}

export interface JobQueueSnapshot {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  stuck: number;
  poison: number;
}

export interface AIProviderSnapshot {
  name: string;
  state: 'healthy' | 'degraded' | 'disabled';
  errorRate: number;
  latencyMs: number;
}

export interface IncidentSnapshot {
  id: string;
  type: string;
  severity: string;
  status: string;
  detectedAt: Date;
}

export interface MemorySnapshot {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rsssMB: number;
  percentUsed: number;
}

export interface SystemSnapshot {
  id: string;
  timestamp: Date;
  trigger: SnapshotTrigger;
  triggeredBy?: string;

  // Environment
  environment: string;
  nodeVersion: string;
  uptime: number;

  // Feature flags
  featureFlags: FeatureFlagSnapshot[];

  // Job queue state
  jobQueue: JobQueueSnapshot;

  // AI providers
  aiProviders: AIProviderSnapshot[];

  // Active incidents
  activeIncidents: IncidentSnapshot[];

  // System resources
  memory: MemorySnapshot;

  // Kill switches
  killSwitches: Array<{
    subsystem: string;
    enabled: boolean;
    reason?: string;
  }>;

  // Custom data
  metadata: Record<string, unknown>;
}

export interface SnapshotQuery {
  since?: Date;
  until?: Date;
  trigger?: SnapshotTrigger;
  limit?: number;
}
