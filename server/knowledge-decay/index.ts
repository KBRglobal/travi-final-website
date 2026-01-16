/**
 * Knowledge Decay Detection Module
 *
 * FEATURE 8: Knowledge Decay Detection
 */

export { registerKnowledgeDecayRoutes } from "./routes";
export {
  analyzeDecay,
  getCachedAnalysis,
  getDecayStats,
  getContentNeedingAttention,
  updateIndicatorStatus,
} from "./detector";
export type {
  DecayIndicator,
  DecayAnalysis,
  DecayStats,
  DecayType,
  DecaySeverity,
  DecayStatus,
} from "./types";
export { isKnowledgeDecayEnabled, DECAY_PATTERNS, DECAY_THRESHOLDS } from "./types";
