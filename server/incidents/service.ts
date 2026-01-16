/**
 * SLA/Incidents + Alerting System - Service Layer
 * Orchestrates detection, creation, and management of incidents
 */

import { createLogger } from '../lib/logger';
import { isIncidentsEnabled, INCIDENTS_CONFIG } from './config';
import { runAllDetectors, getDetectedIssues } from './detector';
import {
  createIncident,
  getIncidents,
  getIncidentById,
  acknowledgeIncident,
  resolveIncident,
  findOpenIncidentBySource,
  getIncidentSummary,
  getOpenCriticalCount,
} from './repository';
import type {
  Incident,
  IncidentCreateInput,
  IncidentSummary,
  IncidentsStatus,
  IncidentStatus,
  IncidentSeverity,
  IncidentSource,
} from './types';

const logger = createLogger('incident-service');

let detectionInterval: NodeJS.Timeout | null = null;

// ============================================================================
// Detection Loop
// ============================================================================

function processDetectionResults(): void {
  const issues = getDetectedIssues();

  for (const issue of issues) {
    // Check if there's already an open incident for this source
    const existing = findOpenIncidentBySource(issue.source);

    if (!existing) {
      // Create new incident
      const incident = createIncident({
        source: issue.source,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        metadata: issue.metadata,
      });
      logger.warn({ incident }, 'New incident created');
    }
  }
}

export function startDetectionLoop(): void {
  if (!isIncidentsEnabled()) {
    logger.info('Incidents feature disabled, not starting detection loop');
    return;
  }

  if (detectionInterval) {
    logger.warn('Detection loop already running');
    return;
  }

  logger.info('Starting incident detection loop');
  detectionInterval = setInterval(
    processDetectionResults,
    INCIDENTS_CONFIG.detectionIntervalMs
  );

  // Run immediately on start
  processDetectionResults();
}

export function stopDetectionLoop(): void {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
    logger.info('Incident detection loop stopped');
  }
}

// ============================================================================
// Incident Management
// ============================================================================

export function raiseManualIncident(input: Omit<IncidentCreateInput, 'source'>): Incident {
  return createIncident({
    ...input,
    source: 'manual',
  });
}

export function listIncidents(options?: {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  source?: IncidentSource;
  limit?: number;
  offset?: number;
}): Incident[] {
  return getIncidents(options);
}

export function getIncident(id: string): Incident | null {
  return getIncidentById(id);
}

export function ackIncident(id: string, actorId: string): Incident | null {
  const result = acknowledgeIncident(id, actorId);
  if (result) {
    logger.info({ incidentId: id, actorId }, 'Incident acknowledged');
  }
  return result;
}

export function closeIncident(
  id: string,
  actorId: string,
  notes?: string
): Incident | null {
  const result = resolveIncident(id, actorId, notes);
  if (result) {
    logger.info({ incidentId: id, actorId, notes }, 'Incident resolved');
  }
  return result;
}

export function getSummary(): IncidentSummary {
  return getIncidentSummary();
}

export function getStatus(): IncidentsStatus {
  return {
    enabled: isIncidentsEnabled(),
    totalIncidents: getIncidentSummary().total,
    openIncidents: getIncidentSummary().open + getIncidentSummary().acknowledged,
    criticalOpen: getOpenCriticalCount(),
    config: {
      detectionIntervalMs: INCIDENTS_CONFIG.detectionIntervalMs,
      maxIncidentsStored: INCIDENTS_CONFIG.maxIncidentsStored,
    },
  };
}

export function hasCriticalOpenIncidents(): boolean {
  return getOpenCriticalCount() > 0;
}
