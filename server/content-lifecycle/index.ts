/**
 * Content Lifecycle Timeline Module
 *
 * FEATURE 10: Content Lifecycle Timeline (Audit-grade)
 */

export { registerLifecycleRoutes } from "./routes";
export {
  recordEvent,
  getContentLifecycle,
  queryEvents,
  getTimelineStats,
  exportAudit,
  getRecentEvents,
  compareSnapshots,
  EventRecorders,
} from "./service";
export type {
  LifecycleEvent,
  ContentLifecycle,
  TimelineFilter,
  TimelineStats,
  AuditExport,
  EventType,
  EventSource,
  StateSnapshot,
} from "./types";
export { isLifecycleTimelineEnabled } from "./types";
