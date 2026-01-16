/**
 * Internal Competition Detector Module
 *
 * FEATURE 9: Internal Competition (Cannibalization) Detector
 */

export { registerInternalCompetitionRoutes } from "./routes";
export {
  analyzeCompetition,
  getCachedAnalysis,
  getCompetitionStats,
  getHighPriorityPairs,
  resolvePair,
  createCluster,
  getClusters,
} from "./detector";
export type {
  CompetitionPair,
  CompetitionAnalysis,
  CompetitionCluster,
  CompetitionStats,
  CompetitionType,
  CompetitionSeverity,
  ResolutionStrategy,
} from "./types";
export { isInternalCompetitionEnabled, OVERLAP_WEIGHTS, SEVERITY_THRESHOLDS } from "./types";
