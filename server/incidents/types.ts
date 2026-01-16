/**
 * SLA/Incidents + Alerting System - Type Definitions
 * Feature Flag: ENABLE_INCIDENTS=true
 */

export type IncidentSeverity = 'info' | 'warn' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';
export type IncidentSource =
  | 'job_queue_stalled'
  | 'event_bus_not_initialized'
  | 'search_index_lag'
  | 'rss_failure'
  | 'aeo_generator_failure'
  | 'ai_provider_down'
  | 'db_slow'
  | 'manual';

export interface Incident {
  id: string;
  source: IncidentSource;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface IncidentCreateInput {
  source: IncidentSource;
  severity: IncidentSeverity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentSummary {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  bySeverity: {
    info: number;
    warn: number;
    critical: number;
  };
  bySource: Partial<Record<IncidentSource, number>>;
  lastIncidentAt?: Date;
}

export interface DetectorResult {
  hasIssue: boolean;
  source: IncidentSource;
  severity: IncidentSeverity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentsStatus {
  enabled: boolean;
  totalIncidents: number;
  openIncidents: number;
  criticalOpen: number;
  config: {
    detectionIntervalMs: number;
    maxIncidentsStored: number;
  };
}
