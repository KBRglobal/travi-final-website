/**
 * SLA/Incidents + Alerting System
 * Feature Flag: ENABLE_INCIDENTS=true
 *
 * Detects critical conditions, raises alerts, and manages incident lifecycle
 * (open → acknowledged → resolved).
 */

export * from './types';
export * from './config';
export {
  updateJobQueueTick,
  setEventBusInitialized,
  recordDbQueryTime,
  updateSearchIndexLag,
  runAllDetectors,
  getDetectedIssues,
} from './detector';
export {
  startDetectionLoop,
  stopDetectionLoop,
  raiseManualIncident,
  listIncidents,
  getIncident,
  ackIncident,
  closeIncident,
  getSummary,
  getStatus,
  hasCriticalOpenIncidents,
} from './service';
export { clearAllIncidents } from './repository';
export { default as incidentsRoutes } from './routes';
