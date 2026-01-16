/**
 * Go-Live Timeline & Forensics - Type Definitions
 * Feature Flag: ENABLE_GO_LIVE_FORENSICS=false
 */

export type ForensicsEventType =
  | 'decision'
  | 'approval'
  | 'override'
  | 'state_change'
  | 'degradation'
  | 'recovery'
  | 'deployment'
  | 'rollback'
  | 'incident'
  | 'manual';

export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ForensicsEvent {
  id: string;
  timestamp: Date;
  type: ForensicsEventType;
  severity: EventSeverity;
  source: string;
  actor?: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  correlationId?: string;
  immutable: true;
  signature: string;
}

export interface TimelineEntry {
  event: ForensicsEvent;
  relatedEvents: string[];
  context: TimelineContext;
}

export interface TimelineContext {
  systemState: string;
  readinessScore?: number;
  activeIncidents: number;
  activeRestrictions: number;
}

export interface TimelineQuery {
  startTime?: Date;
  endTime?: Date;
  types?: ForensicsEventType[];
  sources?: string[];
  severities?: EventSeverity[];
  correlationId?: string;
  actor?: string;
  limit?: number;
  offset?: number;
}

export interface TimelineResult {
  events: ForensicsEvent[];
  total: number;
  query: TimelineQuery;
  executedAt: Date;
}

export interface ForensicsSnapshot {
  id: string;
  capturedAt: Date;
  events: ForensicsEvent[];
  summary: ForensicsSummary;
}

export interface ForensicsSummary {
  totalEvents: number;
  byType: Record<ForensicsEventType, number>;
  bySeverity: Record<EventSeverity, number>;
  bySource: Record<string, number>;
  firstEvent?: Date;
  lastEvent?: Date;
  uniqueActors: number;
}

export interface ForensicsStatus {
  enabled: boolean;
  totalEvents: number;
  oldestEvent?: Date;
  newestEvent?: Date;
  storageUsed: number;
}
