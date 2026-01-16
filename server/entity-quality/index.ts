/**
 * Entity Quality: Dedup Scanner + Merge Suggestions
 * Feature Flag: ENABLE_ENTITY_QUALITY=true
 *
 * Identifies duplicate entities using deterministic similarity matching
 * and proposes merge operations for admin review.
 */

export * from './types';
export * from './config';
export {
  normalizeText,
  normalizePhone,
  normalizeWebsite,
  stringSimilarity,
  geoSimilarity,
  geoDistance,
  phoneSimilarity,
  websiteSimilarity,
} from './normalizer';
export { calculateMatch, scanForDuplicates, createScanResult } from './dedup-scanner';
export {
  addSuggestions,
  getSuggestionById,
  querySuggestions,
  ignoreSuggestion,
  markAsMerged,
  getSuggestionStats,
  getOpenCount,
  clearAllSuggestions,
} from './suggestion-store';
export { default as entityQualityRoutes } from './routes';


export { registerEntityQualityRoutes } from "./routes";
export { evaluateEntityQuality, getCachedQualityScore, getQualityGrade, getQualityStats } from "./evaluator";
export type {
  QualityDimension,
  QualityScore,
  QualityGrade,
  DimensionScore,
} from "./types";
export { isEntityQualityEnabled } from "./config";
export { DIMENSION_WEIGHTS, DEFAULT_THRESHOLDS } from "./types";
