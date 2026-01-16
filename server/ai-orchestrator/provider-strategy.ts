/**
 * AI Orchestrator - Provider Strategy Layer
 * 
 * TASK 6: Future-proof provider management
 * 
 * Features:
 * - Provider scorecards with cost/latency/quality metrics
 * - Recommendation engine for optimal provider selection
 * - Provider removal simulation for impact analysis
 * 
 * HARD CONSTRAINTS:
 * - Uses existing telemetry data from health-tracker.ts and cost-analytics.ts
 * - Read-only simulation (no actual provider changes)
 * - No schema changes
 */

import { log } from '../lib/logger';
import { getHealthTracker } from './health-tracker';
import { getCostAnalytics, PROVIDER_RATES, CATEGORY_VALUE_MAP } from './cost-analytics';
import type { AIProvider, TaskCategory } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ProviderStrategy] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[ProviderStrategy] ${msg}`, data),
};

/**
 * Provider scorecard - comprehensive view of a provider's current state
 */
export interface ProviderScorecard {
  name: AIProvider;
  costPer1K: number;           // Cost per 1K tokens in USD
  avgLatencyMs: number;        // Average response latency
  qualityScore: number;        // 0-100 quality score
  availability: number;        // 0-100 availability percentage
  lastUpdated: Date;
  details: {
    successRate: number;       // From health tracker
    p95LatencyMs: number;      // P95 latency
    sampleCount: number;       // Number of recent samples
    isHealthy: boolean;        // Current health status
    degradedSince?: Date;      // If degraded, when it started
  };
}

/**
 * Provider recommendation result
 */
export interface ProviderRecommendation {
  category?: TaskCategory;     // Task category this recommendation applies to
  provider: AIProvider;
  reason: string;
  alternatives: Array<{
    provider: AIProvider;
    reason: string;
    tradeoff: string;
  }>;
  scores: {
    cost: number;              // 0-100 (higher = cheaper)
    latency: number;           // 0-100 (higher = faster)
    quality: number;           // 0-100 (higher = better)
    availability: number;      // 0-100 (higher = more available)
    composite: number;         // Weighted composite score
  };
}

/**
 * Provider removal simulation result
 */
export interface ProviderRemovalSimulation {
  provider: AIProvider;
  affectedTasks: {
    category: TaskCategory;
    estimatedCount: number;
    impact: 'critical' | 'high' | 'medium' | 'low';
  }[];
  fallbackPlan: Array<{
    taskCategory: TaskCategory;
    fallbackProvider: AIProvider;
    fallbackReason: string;
  }>;
  estimatedCostIncrease: {
    percentage: number;
    absolutePerMonth: number;  // Estimated USD per month
    breakdown: Record<TaskCategory, number>;
  };
  risks: string[];
  recommendations: string[];
}

/**
 * Provider capabilities for task routing
 */
const PROVIDER_CAPABILITIES: Record<AIProvider, TaskCategory[]> = {
  anthropic: ['content', 'news', 'evergreen', 'seo', 'research', 'enrichment', 'translation', 'localization', 'internal'],
  openai: ['content', 'news', 'evergreen', 'seo', 'research', 'enrichment', 'translation', 'localization', 'internal'],
  gemini: ['content', 'news', 'evergreen', 'research', 'translation', 'localization', 'internal'],
  deepseek: ['content', 'seo', 'enrichment', 'translation', 'internal'],
  openrouter: ['content', 'news', 'evergreen', 'seo', 'enrichment', 'translation', 'internal'],
  'replit-ai': ['content', 'seo', 'enrichment', 'internal'],
  freepik: ['image'],
};

/**
 * Quality scores based on model capabilities (subjective baseline)
 */
const BASE_QUALITY_SCORES: Record<AIProvider, number> = {
  anthropic: 95,    // Claude - highest quality for content
  openai: 92,       // GPT-4 - excellent quality
  gemini: 88,       // Gemini - good quality, strong on research
  deepseek: 80,     // DeepSeek - good for cost, decent quality
  openrouter: 85,   // Varies by model, average estimate
  'replit-ai': 78,  // Good for simple tasks
  freepik: 90,      // Image quality is high
};

/**
 * Category to provider priority mapping
 */
const CATEGORY_PROVIDER_PRIORITY: Record<TaskCategory, AIProvider[]> = {
  content: ['anthropic', 'openai', 'gemini', 'deepseek', 'openrouter', 'replit-ai'],
  news: ['anthropic', 'openai', 'gemini', 'openrouter'],
  evergreen: ['anthropic', 'openai', 'gemini', 'openrouter'],
  seo: ['anthropic', 'openai', 'deepseek', 'openrouter', 'replit-ai'],
  research: ['gemini', 'anthropic', 'openai'],
  enrichment: ['deepseek', 'anthropic', 'openai', 'openrouter', 'replit-ai'],
  translation: ['anthropic', 'openai', 'gemini', 'deepseek', 'openrouter'],
  localization: ['anthropic', 'openai', 'gemini', 'deepseek'],
  internal: ['deepseek', 'replit-ai', 'openrouter', 'anthropic'],
  image: ['freepik'],
};

/**
 * Weight configuration for composite scoring
 */
const SCORE_WEIGHTS = {
  cost: 0.25,
  latency: 0.20,
  quality: 0.35,
  availability: 0.20,
};

/**
 * Get provider scorecard with current metrics
 */
export function getProviderScorecard(provider: AIProvider): ProviderScorecard {
  const healthTracker = getHealthTracker();
  const health = healthTracker.getHealth(provider);
  
  const costPer1K = PROVIDER_RATES[provider] || 0.01;
  const baseQuality = BASE_QUALITY_SCORES[provider] || 75;
  
  const successRate = health?.successRate ?? 1.0;
  const avgLatencyMs = health?.averageLatencyMs ?? 1000;
  const p95LatencyMs = health?.p95LatencyMs ?? 2000;
  const isHealthy = health?.isHealthy ?? true;
  const sampleCount = health?.events?.length ?? 0;
  
  const availability = isHealthy ? (successRate * 100) : (successRate * 50);
  
  const qualityAdjustment = successRate >= 0.95 ? 0 : 
                            successRate >= 0.90 ? -5 :
                            successRate >= 0.80 ? -10 : -20;
  const qualityScore = Math.max(0, Math.min(100, baseQuality + qualityAdjustment));

  return {
    name: provider,
    costPer1K,
    avgLatencyMs: Math.round(avgLatencyMs),
    qualityScore: Math.round(qualityScore),
    availability: Math.round(availability),
    lastUpdated: health?.lastChecked ?? new Date(),
    details: {
      successRate: Math.round(successRate * 100) / 100,
      p95LatencyMs: Math.round(p95LatencyMs),
      sampleCount,
      isHealthy,
      degradedSince: health?.degradedSince,
    },
  };
}

/**
 * Get scorecards for all providers
 */
export function getAllProviderScorecards(): ProviderScorecard[] {
  const providers: AIProvider[] = [
    'anthropic', 'openai', 'gemini', 'deepseek', 
    'openrouter', 'replit-ai', 'freepik'
  ];
  
  return providers.map(getProviderScorecard);
}

/**
 * Calculate normalized scores for comparison (0-100, higher is better)
 */
function calculateNormalizedScores(scorecard: ProviderScorecard): {
  cost: number;
  latency: number;
  quality: number;
  availability: number;
  composite: number;
} {
  const maxCost = Math.max(...Object.values(PROVIDER_RATES));
  const costScore = Math.round((1 - scorecard.costPer1K / maxCost) * 100);
  
  const maxLatency = 10000;
  const latencyScore = Math.round(Math.max(0, (1 - scorecard.avgLatencyMs / maxLatency)) * 100);
  
  const qualityScore = scorecard.qualityScore;
  const availabilityScore = scorecard.availability;
  
  const composite = Math.round(
    costScore * SCORE_WEIGHTS.cost +
    latencyScore * SCORE_WEIGHTS.latency +
    qualityScore * SCORE_WEIGHTS.quality +
    availabilityScore * SCORE_WEIGHTS.availability
  );

  return {
    cost: costScore,
    latency: latencyScore,
    quality: qualityScore,
    availability: availabilityScore,
    composite,
  };
}

/**
 * Get recommended provider for a task category
 */
export function getRecommendedProvider(taskCategory: TaskCategory): ProviderRecommendation {
  const priorityProviders = CATEGORY_PROVIDER_PRIORITY[taskCategory] || ['anthropic'];
  
  const scorecards = priorityProviders.map(provider => ({
    provider,
    scorecard: getProviderScorecard(provider),
    scores: calculateNormalizedScores(getProviderScorecard(provider)),
  }));
  
  const availableProviders = scorecards.filter(s => s.scorecard.details.isHealthy);
  
  if (availableProviders.length === 0) {
    logger.warn('No healthy providers available for category', { taskCategory });
    const fallback = scorecards[0];
    return {
      category: taskCategory,
      provider: fallback.provider,
      reason: 'No healthy providers available - using default with degraded status',
      alternatives: [],
      scores: fallback.scores,
    };
  }
  
  availableProviders.sort((a, b) => b.scores.composite - a.scores.composite);
  
  const recommended = availableProviders[0];
  const alternatives = availableProviders.slice(1, 4).map(alt => ({
    provider: alt.provider,
    reason: getAlternativeReason(alt, recommended),
    tradeoff: getTradeoff(alt, recommended),
  }));

  return {
    category: taskCategory,
    provider: recommended.provider,
    reason: getRecommendationReason(recommended, taskCategory),
    alternatives,
    scores: recommended.scores,
  };
}

/**
 * Generate reason for recommendation
 */
function getRecommendationReason(
  recommended: { provider: AIProvider; scorecard: ProviderScorecard; scores: ReturnType<typeof calculateNormalizedScores> },
  category: TaskCategory
): string {
  const { provider, scorecard, scores } = recommended;
  const parts: string[] = [];
  
  if (scores.quality >= 90) parts.push('highest quality');
  if (scores.latency >= 80) parts.push('fast response times');
  if (scores.cost >= 80) parts.push('cost-effective');
  if (scores.availability >= 95) parts.push('highly available');
  
  if (parts.length === 0) {
    parts.push('best overall balance');
  }
  
  return `Best for ${category}: ${parts.join(', ')} (composite score: ${scores.composite})`;
}

/**
 * Generate reason for alternative provider
 */
function getAlternativeReason(
  alt: { provider: AIProvider; scores: ReturnType<typeof calculateNormalizedScores> },
  recommended: { provider: AIProvider; scores: ReturnType<typeof calculateNormalizedScores> }
): string {
  if (alt.scores.cost > recommended.scores.cost + 10) {
    return 'More cost-effective option';
  }
  if (alt.scores.latency > recommended.scores.latency + 10) {
    return 'Faster response times';
  }
  if (alt.scores.quality > recommended.scores.quality) {
    return 'Higher quality output';
  }
  return 'Reliable fallback option';
}

/**
 * Generate tradeoff description
 */
function getTradeoff(
  alt: { provider: AIProvider; scores: ReturnType<typeof calculateNormalizedScores> },
  recommended: { provider: AIProvider; scores: ReturnType<typeof calculateNormalizedScores> }
): string {
  const diffs: string[] = [];
  
  const costDiff = alt.scores.cost - recommended.scores.cost;
  const latencyDiff = alt.scores.latency - recommended.scores.latency;
  const qualityDiff = alt.scores.quality - recommended.scores.quality;
  
  if (costDiff < -10) diffs.push('higher cost');
  if (latencyDiff < -10) diffs.push('slower');
  if (qualityDiff < -5) diffs.push('lower quality');
  
  if (diffs.length === 0) return 'Similar performance';
  return `Tradeoffs: ${diffs.join(', ')}`;
}

/**
 * Simulate provider removal and analyze impact
 */
export function simulateProviderRemoval(provider: AIProvider): ProviderRemovalSimulation {
  logger.info('Simulating provider removal', { provider });
  
  const affectedCategories = PROVIDER_CAPABILITIES[provider] || [];
  const costAnalytics = getCostAnalytics();
  const metrics = costAnalytics.getValueMetrics();
  
  const affectedTasks = affectedCategories.map(category => {
    const categoryMetrics = metrics.costByCategory.find(c => c.category === category);
    const value = CATEGORY_VALUE_MAP[category] || 'low';
    
    return {
      category,
      estimatedCount: categoryMetrics?.taskCount || 0,
      impact: getImpactLevel(category, value, provider),
    };
  });
  
  const fallbackPlan = affectedCategories.map(category => {
    const alternatives = CATEGORY_PROVIDER_PRIORITY[category]?.filter(p => p !== provider) || [];
    const fallbackProvider = alternatives[0] || 'anthropic';
    
    return {
      taskCategory: category,
      fallbackProvider,
      fallbackReason: `Next priority provider for ${category} tasks`,
    };
  });
  
  const estimatedCostIncrease = calculateCostIncrease(provider, fallbackPlan, metrics);
  const risks = generateRisks(provider, affectedTasks);
  const recommendations = generateRecommendations(provider, affectedTasks, fallbackPlan);

  return {
    provider,
    affectedTasks,
    fallbackPlan,
    estimatedCostIncrease,
    risks,
    recommendations,
  };
}

/**
 * Determine impact level based on category and provider role
 */
function getImpactLevel(
  category: TaskCategory,
  value: 'high' | 'medium' | 'low',
  provider: AIProvider
): 'critical' | 'high' | 'medium' | 'low' {
  const isPrimaryProvider = CATEGORY_PROVIDER_PRIORITY[category]?.[0] === provider;
  
  if (value === 'high' && isPrimaryProvider) return 'critical';
  if (value === 'high' || isPrimaryProvider) return 'high';
  if (value === 'medium') return 'medium';
  return 'low';
}

/**
 * Calculate estimated cost increase from provider removal
 */
function calculateCostIncrease(
  removedProvider: AIProvider,
  fallbackPlan: ProviderRemovalSimulation['fallbackPlan'],
  metrics: ReturnType<typeof getCostAnalytics>['getValueMetrics'] extends () => infer R ? R : never
): ProviderRemovalSimulation['estimatedCostIncrease'] {
  const removedRate = PROVIDER_RATES[removedProvider] || 0.01;
  const breakdown: Record<TaskCategory, number> = {} as Record<TaskCategory, number>;
  let totalIncrease = 0;
  
  for (const plan of fallbackPlan) {
    const fallbackRate = PROVIDER_RATES[plan.fallbackProvider] || 0.01;
    const rateDiff = fallbackRate - removedRate;
    
    const categoryMetrics = metrics.costByCategory.find(c => c.category === plan.taskCategory);
    const estimatedTokensPerMonth = (categoryMetrics?.totalTokens || 0) * 30;
    const costDiff = (estimatedTokensPerMonth / 1000) * rateDiff;
    
    breakdown[plan.taskCategory] = Math.max(0, costDiff);
    totalIncrease += Math.max(0, costDiff);
  }
  
  const currentMonthlyEstimate = metrics.totalCostAllTime * 30 || 100;
  const percentage = currentMonthlyEstimate > 0 
    ? Math.round((totalIncrease / currentMonthlyEstimate) * 100)
    : 0;

  return {
    percentage,
    absolutePerMonth: Math.round(totalIncrease * 100) / 100,
    breakdown,
  };
}

/**
 * Generate risk assessment for provider removal
 */
function generateRisks(
  provider: AIProvider,
  affectedTasks: ProviderRemovalSimulation['affectedTasks']
): string[] {
  const risks: string[] = [];
  
  const criticalTasks = affectedTasks.filter(t => t.impact === 'critical');
  if (criticalTasks.length > 0) {
    risks.push(`Critical impact on ${criticalTasks.length} task categories: ${criticalTasks.map(t => t.category).join(', ')}`);
  }
  
  if (provider === 'anthropic') {
    risks.push('Removing primary content generation provider may significantly impact content quality');
  }
  
  if (provider === 'freepik') {
    risks.push('Image generation capability will be unavailable - no direct fallback');
  }
  
  if (provider === 'gemini') {
    risks.push('Long-context and research capabilities may be degraded');
  }
  
  if (provider === 'deepseek') {
    risks.push('Cost-effective processing will shift to more expensive providers');
  }
  
  const totalAffected = affectedTasks.reduce((sum, t) => sum + t.estimatedCount, 0);
  if (totalAffected > 100) {
    risks.push(`High volume impact: ~${totalAffected} tasks may need rerouting`);
  }

  return risks;
}

/**
 * Generate recommendations for provider removal scenario
 */
function generateRecommendations(
  provider: AIProvider,
  affectedTasks: ProviderRemovalSimulation['affectedTasks'],
  fallbackPlan: ProviderRemovalSimulation['fallbackPlan']
): string[] {
  const recommendations: string[] = [];
  
  recommendations.push('Ensure fallback providers have sufficient credit limits before removal');
  recommendations.push('Monitor latency and error rates closely after migration');
  
  if (affectedTasks.some(t => t.impact === 'critical')) {
    recommendations.push('Consider gradual migration with A/B testing for critical workloads');
  }
  
  const fallbackProviders = [...new Set(fallbackPlan.map(p => p.fallbackProvider))];
  recommendations.push(`Verify API keys and rate limits for: ${fallbackProviders.join(', ')}`);
  
  if (provider === 'anthropic' || provider === 'openai') {
    recommendations.push('Update quality benchmarks and review output quality post-migration');
  }
  
  recommendations.push('Keep provider configuration ready for quick rollback if needed');

  return recommendations;
}

/**
 * Get recommendations for all task categories
 * 
 * TASK 6 REQUIREMENT: getProviderRecommendations()
 * Returns recommendations considering cost sensitivity, latency requirements, and quality needs
 */
export function getProviderRecommendations(): ProviderRecommendation[] {
  const categories: TaskCategory[] = [
    'content', 'news', 'evergreen', 'seo', 'research',
    'enrichment', 'translation', 'localization', 'internal', 'image'
  ];
  
  const recommendations: ProviderRecommendation[] = [];
  
  for (const category of categories) {
    const recommendation = getRecommendedProvider(category);
    recommendations.push(recommendation);
  }
  
  logger.info('Provider recommendations generated', {
    count: recommendations.length,
    categories: categories.length,
  });
  
  return recommendations;
}

/**
 * Get strategy overview - summary of all providers and recommendations
 */
export function getStrategyOverview(): {
  scorecards: ProviderScorecard[];
  categoryRecommendations: Record<TaskCategory, ProviderRecommendation>;
  overallHealth: {
    healthyProviders: number;
    degradedProviders: number;
    avgAvailability: number;
  };
} {
  const scorecards = getAllProviderScorecards();
  
  const categories: TaskCategory[] = [
    'content', 'news', 'evergreen', 'seo', 'research',
    'enrichment', 'translation', 'localization', 'internal', 'image'
  ];
  
  const categoryRecommendations: Record<TaskCategory, ProviderRecommendation> = {} as Record<TaskCategory, ProviderRecommendation>;
  for (const category of categories) {
    categoryRecommendations[category] = getRecommendedProvider(category);
  }
  
  const healthyProviders = scorecards.filter(s => s.details.isHealthy).length;
  const degradedProviders = scorecards.length - healthyProviders;
  const avgAvailability = Math.round(
    scorecards.reduce((sum, s) => sum + s.availability, 0) / scorecards.length
  );

  logger.info('Strategy overview generated', {
    healthyProviders,
    degradedProviders,
    avgAvailability,
  });

  return {
    scorecards,
    categoryRecommendations,
    overallHealth: {
      healthyProviders,
      degradedProviders,
      avgAvailability,
    },
  };
}

/**
 * Singleton instance access
 */
class ProviderStrategy {
  getScorecard = getProviderScorecard;
  getAllScorecards = getAllProviderScorecards;
  getRecommendation = getRecommendedProvider;
  getRecommendations = getProviderRecommendations;
  simulateRemoval = simulateProviderRemoval;
  getOverview = getStrategyOverview;
}

let instance: ProviderStrategy | null = null;

export function getProviderStrategy(): ProviderStrategy {
  if (!instance) {
    instance = new ProviderStrategy();
    logger.info('Provider Strategy initialized');
  }
  return instance;
}

export { ProviderStrategy };
