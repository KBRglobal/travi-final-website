/**
 * Analytics Module Exports
 * 
 * Central export point for all analytics functionality.
 * Includes growth loop metrics, realtime dashboard, and integrations.
 */

// Growth Loop Metrics
export {
  recordLoopEvent,
  recordLoopEntry,
  recordLoopStep,
  getLoopMetrics,
  getLoopMetricsByType,
  resetLoopMetrics,
  type LoopType,
  type LoopStage,
  type SearchLoopStage,
  type ChatLoopStage,
  type ContentLoopStage,
  type GrowthMetrics,
} from './growth-metrics';
