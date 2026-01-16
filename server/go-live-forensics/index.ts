/**
 * Go-Live Timeline & Forensics
 * Feature Flag: ENABLE_GO_LIVE_FORENSICS=false
 *
 * Immutable timeline log of go-live decisions, approvals, overrides,
 * and system events. Queryable by time range, type, and correlation.
 */

export { isGoLiveForensicsEnabled, FORENSICS_CONFIG } from './config';
export {
  recordEvent,
  recordDecision,
  recordApproval,
  recordOverride,
  recordIncident,
  recordDeployment,
  recordRollback,
  queryTimeline,
  getEventById,
  getEventsByCorrelation,
  getRecentEvents,
  getSummary,
  getStatus,
  exportEvents,
  pruneOldEvents,
  clearAll,
} from './timeline';
export type {
  ForensicsEventType,
  EventSeverity,
  ForensicsEvent,
  TimelineEntry,
  TimelineContext,
  TimelineQuery,
  TimelineResult,
  ForensicsSnapshot,
  ForensicsSummary,
  ForensicsStatus,
} from './types';
export { default as forensicsRoutes } from './routes';
