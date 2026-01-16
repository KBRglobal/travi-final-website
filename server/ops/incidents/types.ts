/**
 * Incident Management System - Types
 *
 * FEATURE 1: Automatic incident detection, recording, and resolution
 */

export type IncidentType =
  | 'system_down'
  | 'queue_stalled'
  | 'ai_provider_failed'
  | 'budget_exceeded'
  | 'data_integrity_risk';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'open' | 'acknowledged' | 'mitigated' | 'resolved';

export type IncidentSource =
  | 'health_aggregator'
  | 'cost_guards'
  | 'backpressure'
  | 'ai_failover'
  | 'data_integrity'
  | 'manual';

export interface IncidentMetadata {
  component?: string;
  provider?: string;
  feature?: string;
  threshold?: number;
  currentValue?: number;
  errorMessage?: string;
  affectedEntities?: string[];
  [key: string]: unknown;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: IncidentSource;
  title: string;
  description: string;
  metadata: IncidentMetadata;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  mitigatedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  autoResolved: boolean;
}

export interface IncidentFilter {
  type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  source?: IncidentSource;
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface IncidentStats {
  total: number;
  byStatus: Record<IncidentStatus, number>;
  bySeverity: Record<IncidentSeverity, number>;
  byType: Record<IncidentType, number>;
  openCount: number;
  mttrMs?: number; // Mean Time To Resolution
}

export interface IncidentEvent {
  incidentId: string;
  action: 'created' | 'acknowledged' | 'mitigated' | 'resolved' | 'updated';
  timestamp: Date;
  actor?: string;
  notes?: string;
}
