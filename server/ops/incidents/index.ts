/**
 * Incident Management System
 *
 * FEATURE 1: Automatic incident detection, recording, escalation, and resolution
 *
 * Integrates with:
 * - Health aggregator
 * - Cost guards
 * - Backpressure signals
 * - AI failover
 * - Data integrity watchdog
 *
 * Feature flag: ENABLE_INCIDENT_MANAGEMENT
 */

export * from './types';
export * from './incident-manager';

import { getIncidentManager } from './incident-manager';
import type { IncidentType, IncidentSeverity, IncidentSource, IncidentMetadata } from './types';

/**
 * Convenience function to create an incident
 */
export function createIncident(
  type: IncidentType,
  severity: IncidentSeverity,
  source: IncidentSource,
  title: string,
  description: string,
  metadata?: IncidentMetadata
) {
  return getIncidentManager().createIncident(type, severity, source, title, description, metadata);
}

/**
 * Check if there's an active incident of a given type
 */
export function hasActiveIncident(type: IncidentType): boolean {
  return getIncidentManager().hasActiveIncident(type);
}

/**
 * Auto-resolve incidents when condition clears
 */
export function autoResolveIncidents(
  type: IncidentType,
  source: IncidentSource,
  notes?: string
): number {
  return getIncidentManager().autoResolve(type, source, notes);
}
