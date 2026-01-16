/**
 * Dynamic Budget Recommender Module
 * Analyzes traffic patterns and suggests optimal budget configurations
 */

export * from './types';
export {
  computeTrafficMetrics,
  analyzeTimePatterns,
  recommendBudget,
  generateRecommendationBatch,
  getRecommendations,
  clearRecommendationCache,
} from './recommender';
