/**
 * SLA/Incidents + Alerting System - Repository
 * In-memory storage with bounded size (ring buffer behavior)
 */

import { randomUUID } from "node:crypto";
import { INCIDENTS_CONFIG } from "./config";
import type {
  Incident,
  IncidentCreateInput,
  IncidentStatus,
  IncidentSummary,
  IncidentSource,
  IncidentSeverity,
} from "./types";

// In-memory storage with bounded size
const incidents: Incident[] = [];
const maxSize = INCIDENTS_CONFIG.maxIncidentsStored;

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `inc_${Date.now()}_${randomUUID().slice(0, 6)}`;
}

function enforceMaxSize(): void {
  while (incidents.length > maxSize) {
    // Remove oldest resolved incidents first
    const resolvedIndex = incidents.findIndex(i => i.status === "resolved");
    if (resolvedIndex >= 0) {
      incidents.splice(resolvedIndex, 1);
    } else {
      // If no resolved incidents, remove oldest
      incidents.shift();
    }
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

export function createIncident(input: IncidentCreateInput): Incident {
  const incident: Incident = {
    id: generateId(),
    source: input.source,
    severity: input.severity,
    status: "open",
    title: input.title,
    description: input.description,
    metadata: input.metadata,
    createdAt: new Date(),
  };

  incidents.push(incident);
  enforceMaxSize();

  return incident;
}

export function getIncidentById(id: string): Incident | null {
  return incidents.find(i => i.id === id) || null;
}

export function getIncidents(options?: {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  source?: IncidentSource;
  limit?: number;
  offset?: number;
}): Incident[] {
  let result = [...incidents];

  if (options?.status) {
    result = result.filter(i => i.status === options.status);
  }
  if (options?.severity) {
    result = result.filter(i => i.severity === options.severity);
  }
  if (options?.source) {
    result = result.filter(i => i.source === options.source);
  }

  // Sort by createdAt descending (newest first)
  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const offset = options?.offset || 0;
  const limit = options?.limit || 50;

  return result.slice(offset, offset + limit);
}

export function acknowledgeIncident(id: string, acknowledgedBy: string): Incident | null {
  const incident = incidents.find(i => i.id === id);
  if (!incident) return null;
  if (incident.status !== "open") return incident;

  incident.status = "acknowledged";
  incident.acknowledgedAt = new Date();
  incident.acknowledgedBy = acknowledgedBy;

  return incident;
}

export function resolveIncident(
  id: string,
  resolvedBy: string,
  resolutionNotes?: string
): Incident | null {
  const incident = incidents.find(i => i.id === id);
  if (!incident) return null;
  if (incident.status === "resolved") return incident;

  incident.status = "resolved";
  incident.resolvedAt = new Date();
  incident.resolvedBy = resolvedBy;
  incident.resolutionNotes = resolutionNotes;

  return incident;
}

export function findOpenIncidentBySource(source: IncidentSource): Incident | null {
  return incidents.find(i => i.source === source && i.status !== "resolved") || null;
}

// ============================================================================
// Summary
// ============================================================================

export function getIncidentSummary(): IncidentSummary {
  const byStatus = {
    open: 0,
    acknowledged: 0,
    resolved: 0,
  };

  const bySeverity = {
    info: 0,
    warn: 0,
    critical: 0,
  };

  const bySource: Partial<Record<IncidentSource, number>> = {};
  let lastIncidentAt: Date | undefined;

  for (const incident of incidents) {
    byStatus[incident.status]++;
    bySeverity[incident.severity]++;
    bySource[incident.source] = (bySource[incident.source] || 0) + 1;

    if (!lastIncidentAt || incident.createdAt > lastIncidentAt) {
      lastIncidentAt = incident.createdAt;
    }
  }

  return {
    total: incidents.length,
    open: byStatus.open,
    acknowledged: byStatus.acknowledged,
    resolved: byStatus.resolved,
    bySeverity,
    bySource,
    lastIncidentAt,
  };
}

export function getOpenCriticalCount(): number {
  return incidents.filter(i => i.status !== "resolved" && i.severity === "critical").length;
}

// ============================================================================
// Clear (for testing)
// ============================================================================

export function clearAllIncidents(): void {
  incidents.length = 0;
}
