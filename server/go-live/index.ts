/**
 * Go-Live Checklist (System Readiness Gate)
 * Feature Flag: ENABLE_GO_LIVE_CHECKLIST=true
 *
 * Evaluates whether the system is safe to launch by checking
 * critical invariants and returning PASS/WARN/BLOCK status.
 */

export * from './types';
export * from './config';
export {
  checkDbConnection,
  checkEventBus,
  checkSearchIndex,
  checkAeoAvailable,
  checkJobQueue,
  checkNoCriticalIncidents,
  runCheck,
  CHECK_FUNCTIONS,
} from './checks';
export {
  evaluateGoLiveStatus,
  runSmokeTest,
  clearCache,
  isReadyForLaunch,
} from './evaluator';
export { default as goLiveRoutes } from './routes';
