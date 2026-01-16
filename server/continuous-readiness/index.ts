/**
 * Continuous Readiness Monitor
 * Feature Flag: ENABLE_CONTINUOUS_READINESS=false
 *
 * Periodic reevaluation of platform readiness with degradation
 * detection, event emission, and MTTR tracking.
 */

export { isContinuousReadinessEnabled, READINESS_CONFIG } from './config';
export {
  checkNow,
  startMonitor,
  stopMonitor,
  getMonitorStatus,
  getCurrentState,
  getLastSnapshot,
  getSnapshotHistory,
  getActiveDegradations,
  getAllDegradations,
  getMTTRStats,
  getEvents,
  subscribe,
  clearAll,
} from './monitor';
export type {
  ReadinessState,
  ReadinessCheck,
  ReadinessSnapshot,
  DegradationEvent,
  MTTRStats,
  ReadinessEvent,
  MonitorConfig,
  MonitorStatus,
} from './types';
export { default as readinessRoutes } from './routes';
