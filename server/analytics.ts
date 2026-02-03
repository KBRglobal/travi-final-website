/**
 * Analytics Module - Re-exports from analytics/index.ts
 * Provides unified analytics tracking for the application
 */

export {
  recordLoopEntry,
  recordLoopStep,
  trackEvent,
  trackPageView,
  type LoopEntry,
  type LoopStep,
} from "./analytics/index";

export default {};
