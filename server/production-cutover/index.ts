/**
 * Production Cutover Engine
 * Feature Flag: ENABLE_PRODUCTION_CUTOVER=false
 *
 * Single authoritative decision engine for go-live readiness.
 * Aggregates signals from platform-readiness, platform-governor,
 * and incidents to produce CAN_GO_LIVE / WARN / BLOCK decisions.
 */

export { isProductionCutoverEnabled, CUTOVER_CONFIG } from './config';
export {
  evaluateCutover,
  dryRun,
  createApproval,
  createOverride,
  clearOverride,
  getActiveApproval,
  getActiveOverride,
  getDecisionHistory,
  clearCache,
} from './engine';
export type {
  CutoverDecision,
  CutoverMode,
  CutoverBlocker,
  CutoverSignature,
  CutoverResult,
  TimeBoxedApproval,
  EmergencyOverride,
  SystemSnapshot,
  CutoverStatus,
} from './types';
export { default as cutoverRoutes } from './routes';
