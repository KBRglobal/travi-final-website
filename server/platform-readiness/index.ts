/**
 * Platform Readiness & Go-Live Command Center
 * Feature Flag: ENABLE_PLATFORM_READINESS=false
 *
 * Answers: "Can this platform safely go live RIGHT NOW, and if not — why?"
 * Read-only system with zero side effects.
 */

export * from './types';
export * from './config';
export { collectAllSignals, collectSignal } from './collectors';
export { buildChecklist } from './checklist';
export {
  evaluateReadiness,
  simulateGoLive,
  clearCache,
  getBlockers,
  isReady,
} from './evaluator';
export { default as platformReadinessRoutes } from './routes';
