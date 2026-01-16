/**
 * Octopus Engine - Engine Optimizer
 * Smart routing between cheap and expensive AI models
 *
 * Model Tiers:
 * - FAST (Cheap): Haiku, GPT-4o-mini - For bulk tasks, drafts, tagging
 * - BALANCED: Sonnet, GPT-4o - For quality content, reviews
 * - PREMIUM: Opus, GPT-4-turbo - For critical content, final polish
 *
 * Routing Logic:
 * - Bulk generation → FAST
 * - Entity extraction → BALANCED
 * - Final content polish → PREMIUM (only for immediate publish)
 * - Translations → FAST (with BALANCED review for critical)
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Engine Optimizer] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Engine Optimizer] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export type EngineTier = 'fast' | 'balanced' | 'premium';

export type TaskType =
  | 'entity_extraction'
  | 'content_generation'
  | 'translation'
  | 'tagging'
  | 'faq_generation'
  | 'comparison'
  | 'review_polish'
  | 'schema_generation'
  | 'bulk_draft'
  | 'final_publish';

export interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'openrouter' | 'deepseek';
  model: string;
  costPer1kTokens: number; // in USD
  maxTokens: number;
  supportsJson: boolean;
  speed: 'fast' | 'medium' | 'slow';
}

export interface EngineDecision {
  tier: EngineTier;
  model: ModelConfig;
  reason: string;
  estimatedCost: number;
  estimatedTimeMs: number;
}

export interface TaskRequest {
  type: TaskType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  isImmediatePublish: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  requiresAccuracy: boolean;
  language?: string;
}

export interface EngineStats {
  totalRequests: number;
  byTier: Record<EngineTier, number>;
  totalCostUSD: number;
  avgResponseTimeMs: number;
  costSavingsUSD: number; // vs always using premium
}

// ============================================================================
// Model Configurations
// ============================================================================

const MODELS: Record<EngineTier, ModelConfig[]> = {
  fast: [
    {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
      costPer1kTokens: 0.001,
      maxTokens: 8192,
      supportsJson: true,
      speed: 'fast',
    },
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      costPer1kTokens: 0.00015,
      maxTokens: 16384,
      supportsJson: true,
      speed: 'fast',
    },
    {
      provider: 'deepseek',
      model: 'deepseek-chat',
      costPer1kTokens: 0.00014,
      maxTokens: 8192,
      supportsJson: true,
      speed: 'fast',
    },
  ],
  balanced: [
    {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250514',
      costPer1kTokens: 0.003,
      maxTokens: 8192,
      supportsJson: true,
      speed: 'medium',
    },
    {
      provider: 'openai',
      model: 'gpt-4o',
      costPer1kTokens: 0.005,
      maxTokens: 16384,
      supportsJson: true,
      speed: 'medium',
    },
  ],
  premium: [
    {
      provider: 'anthropic',
      model: 'claude-opus-4-5-20250514',
      costPer1kTokens: 0.015,
      maxTokens: 8192,
      supportsJson: true,
      speed: 'slow',
    },
    {
      provider: 'openai',
      model: 'gpt-4-turbo',
      costPer1kTokens: 0.01,
      maxTokens: 16384,
      supportsJson: true,
      speed: 'slow',
    },
  ],
};

// Task type to default tier mapping
const TASK_TIER_MAP: Record<TaskType, EngineTier> = {
  entity_extraction: 'balanced',
  content_generation: 'balanced',
  translation: 'fast',
  tagging: 'fast',
  faq_generation: 'fast',
  comparison: 'balanced',
  review_polish: 'premium',
  schema_generation: 'fast',
  bulk_draft: 'fast',
  final_publish: 'premium',
};

// ============================================================================
// Engine State
// ============================================================================

let engineStats: EngineStats = {
  totalRequests: 0,
  byTier: { fast: 0, balanced: 0, premium: 0 },
  totalCostUSD: 0,
  avgResponseTimeMs: 0,
  costSavingsUSD: 0,
};

// Track available providers
const availableProviders = new Set<string>();

// ============================================================================
// Provider Detection
// ============================================================================

export function detectAvailableProviders(): string[] {
  const providers: string[] = [];

  // Check Anthropic
  if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    providers.push('anthropic');
    availableProviders.add('anthropic');
  }

  // Check OpenAI
  if (process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    providers.push('openai');
    availableProviders.add('openai');
  }

  // Check OpenRouter
  if (process.env.OPENROUTER_API_KEY || process.env.openrouterapi || process.env.travisite) {
    providers.push('openrouter');
    availableProviders.add('openrouter');
  }

  // Check DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    providers.push('deepseek');
    availableProviders.add('deepseek');
  }

  logger.info('Detected AI providers', { providers });
  return providers;
}

// ============================================================================
// Core Optimization Logic
// ============================================================================

/**
 * Determine optimal engine tier for a task
 */
export function determineEngineTier(request: TaskRequest): EngineDecision {
  let tier = TASK_TIER_MAP[request.type] || 'balanced';

  // Override logic based on conditions
  if (request.priority === 'critical' && request.isImmediatePublish) {
    // Critical immediate publish → Premium
    tier = 'premium';
  } else if (request.priority === 'low' || !request.isImmediatePublish) {
    // Low priority or draft → Fast (save costs)
    tier = tier === 'premium' ? 'balanced' : 'fast';
  }

  // If accuracy is critical, upgrade tier
  if (request.requiresAccuracy && tier === 'fast') {
    tier = 'balanced';
  }

  // Get best available model for this tier
  const model = getBestModelForTier(tier);

  // Calculate estimates
  const totalTokens = request.estimatedInputTokens + request.estimatedOutputTokens;
  const estimatedCost = (totalTokens / 1000) * model.costPer1kTokens;
  const premiumCost = (totalTokens / 1000) * MODELS.premium[0].costPer1kTokens;

  const estimatedTimeMs = model.speed === 'fast' ? 2000 :
                          model.speed === 'medium' ? 5000 : 10000;

  // Update stats
  engineStats.totalRequests++;
  engineStats.byTier[tier]++;
  engineStats.totalCostUSD += estimatedCost;
  engineStats.costSavingsUSD += (premiumCost - estimatedCost);

  const reason = generateDecisionReason(request, tier);

  logger.info('Engine decision made', {
    task: request.type,
    tier,
    model: model.model,
    estimatedCost: `$${estimatedCost.toFixed(4)}`,
    savings: `$${(premiumCost - estimatedCost).toFixed(4)}`,
  });

  return {
    tier,
    model,
    reason,
    estimatedCost,
    estimatedTimeMs,
  };
}

/**
 * Get the best available model for a tier
 */
function getBestModelForTier(tier: EngineTier): ModelConfig {
  const tierModels = MODELS[tier];

  // Find first model with available provider
  for (const model of tierModels) {
    if (availableProviders.has(model.provider)) {
      return model;
    }
  }

  // Fallback: try any available model from lower tiers
  if (tier === 'premium') {
    return getBestModelForTier('balanced');
  }
  if (tier === 'balanced') {
    return getBestModelForTier('fast');
  }

  // Last resort: return first model and hope for the best
  logger.warn('No available provider found, using default');
  return tierModels[0];
}

/**
 * Generate human-readable reason for decision
 */
function generateDecisionReason(request: TaskRequest, tier: EngineTier): string {
  const reasons: string[] = [];

  if (request.isImmediatePublish && request.priority === 'critical') {
    reasons.push('Critical content for immediate publish');
  }

  if (tier === 'fast') {
    if (request.type === 'translation') {
      reasons.push('Translation task - fast model sufficient');
    } else if (request.type === 'bulk_draft') {
      reasons.push('Bulk draft generation - optimizing for cost');
    } else if (!request.isImmediatePublish) {
      reasons.push('Draft content - cost optimization');
    }
  }

  if (tier === 'balanced') {
    if (request.type === 'entity_extraction') {
      reasons.push('Entity extraction requires good accuracy');
    } else if (request.requiresAccuracy) {
      reasons.push('Accuracy required - upgraded from fast tier');
    }
  }

  if (tier === 'premium') {
    if (request.type === 'final_publish') {
      reasons.push('Final publish polish - maximum quality');
    } else if (request.type === 'review_polish') {
      reasons.push('Review polish - ensuring top quality');
    }
  }

  return reasons.join('; ') || `Standard ${tier} tier for ${request.type}`;
}

// ============================================================================
// Batch Optimization
// ============================================================================

/**
 * Optimize a batch of tasks for cost efficiency
 */
export function optimizeBatch(tasks: TaskRequest[]): {
  decisions: EngineDecision[];
  totalEstimatedCost: number;
  totalEstimatedTimeMs: number;
  batchSuggestions: string[];
} {
  const decisions = tasks.map(task => determineEngineTier(task));

  const totalEstimatedCost = decisions.reduce((sum, d) => sum + d.estimatedCost, 0);
  const totalEstimatedTimeMs = decisions.reduce((sum, d) => sum + d.estimatedTimeMs, 0);

  const batchSuggestions: string[] = [];

  // Analyze batch and suggest optimizations
  const fastCount = decisions.filter(d => d.tier === 'fast').length;
  const premiumCount = decisions.filter(d => d.tier === 'premium').length;

  if (premiumCount > tasks.length * 0.5) {
    batchSuggestions.push('Consider reducing premium tier usage by marking non-critical content as drafts');
  }

  if (fastCount < tasks.length * 0.3) {
    batchSuggestions.push('Cost optimization: Move more tasks to fast tier by lowering priority');
  }

  return {
    decisions,
    totalEstimatedCost,
    totalEstimatedTimeMs,
    batchSuggestions,
  };
}

// ============================================================================
// Model-Specific Prompts
// ============================================================================

/**
 * Get model-specific prompt adjustments
 */
export function adjustPromptForModel(
  basePrompt: string,
  model: ModelConfig,
  outputFormat: 'json' | 'markdown' | 'text'
): string {
  let prompt = basePrompt;

  // JSON format adjustments
  if (outputFormat === 'json') {
    if (model.provider === 'anthropic') {
      prompt += '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation.';
    } else if (model.provider === 'openai') {
      // OpenAI handles JSON via response_format parameter
    } else if (model.provider === 'deepseek') {
      prompt += '\n\nOutput strictly valid JSON. No other text.';
    }
  }

  // Token limit warning for long prompts
  if (basePrompt.length > model.maxTokens * 3) {
    logger.warn('Prompt may be too long for model', {
      model: model.model,
      promptLength: basePrompt.length,
      maxTokens: model.maxTokens,
    });
  }

  return prompt;
}

// ============================================================================
// Cost Tracking & Reporting
// ============================================================================

/**
 * Get current engine stats
 */
export function getEngineStats(): EngineStats {
  return { ...engineStats };
}

/**
 * Reset engine stats
 */
export function resetEngineStats(): void {
  engineStats = {
    totalRequests: 0,
    byTier: { fast: 0, balanced: 0, premium: 0 },
    totalCostUSD: 0,
    avgResponseTimeMs: 0,
    costSavingsUSD: 0,
  };
}

/**
 * Generate cost report
 */
export function generateCostReport(): {
  summary: string;
  breakdown: Record<EngineTier, { count: number; percentage: number }>;
  recommendations: string[];
} {
  const total = engineStats.totalRequests || 1;

  const breakdown: Record<EngineTier, { count: number; percentage: number }> = {
    fast: {
      count: engineStats.byTier.fast,
      percentage: (engineStats.byTier.fast / total) * 100,
    },
    balanced: {
      count: engineStats.byTier.balanced,
      percentage: (engineStats.byTier.balanced / total) * 100,
    },
    premium: {
      count: engineStats.byTier.premium,
      percentage: (engineStats.byTier.premium / total) * 100,
    },
  };

  const recommendations: string[] = [];

  if (breakdown.premium.percentage > 30) {
    recommendations.push('High premium usage (>30%). Consider marking more content as drafts.');
  }

  if (breakdown.fast.percentage < 40) {
    recommendations.push('Low fast tier usage. Translations and tagging should use fast tier.');
  }

  if (engineStats.costSavingsUSD > 0) {
    recommendations.push(`Current savings: $${engineStats.costSavingsUSD.toFixed(2)} vs all-premium`);
  }

  const summary = `
Total Requests: ${engineStats.totalRequests}
Total Cost: $${engineStats.totalCostUSD.toFixed(2)}
Cost Savings: $${engineStats.costSavingsUSD.toFixed(2)}
Tier Distribution: Fast ${breakdown.fast.percentage.toFixed(1)}% | Balanced ${breakdown.balanced.percentage.toFixed(1)}% | Premium ${breakdown.premium.percentage.toFixed(1)}%
  `.trim();

  return { summary, breakdown, recommendations };
}

// ============================================================================
// Workflow Optimization Presets
// ============================================================================

/**
 * Pre-defined optimization profiles
 */
export const OPTIMIZATION_PROFILES = {
  // Maximum cost savings - drafts everywhere
  costSaver: {
    defaultTier: 'fast' as EngineTier,
    upgradeOnlyFor: ['final_publish', 'review_polish'],
    description: 'Maximum cost savings, quality review before publish',
  },

  // Balanced approach
  balanced: {
    defaultTier: 'balanced' as EngineTier,
    upgradeOnlyFor: ['final_publish'],
    description: 'Good quality with reasonable costs',
  },

  // Quality first - for important destinations
  qualityFirst: {
    defaultTier: 'balanced' as EngineTier,
    upgradeOnlyFor: ['content_generation', 'final_publish', 'review_polish'],
    description: 'Higher quality for all content, premium for publish',
  },

  // Speed first - for initial content burst
  speedFirst: {
    defaultTier: 'fast' as EngineTier,
    upgradeOnlyFor: [],
    description: 'Fastest generation, manual review required',
  },
};

export type OptimizationProfile = keyof typeof OPTIMIZATION_PROFILES;

/**
 * Apply optimization profile to task
 */
export function applyProfile(
  task: TaskRequest,
  profile: OptimizationProfile
): EngineDecision {
  const profileConfig = OPTIMIZATION_PROFILES[profile];

  // Override task tier based on profile
  const modifiedTask = { ...task };

  if (!profileConfig.upgradeOnlyFor.includes(task.type)) {
    // Downgrade to profile default
    modifiedTask.priority = 'low';
    modifiedTask.isImmediatePublish = false;
  }

  return determineEngineTier(modifiedTask);
}

// ============================================================================
// QA Status Check
// ============================================================================

export interface QAStatus {
  apiConnections: {
    name: string;
    configured: boolean;
    envVar: string;
  }[];
  aiProviders: {
    name: string;
    available: boolean;
    models: string[];
  }[];
  octopusModules: {
    name: string;
    status: 'ready' | 'missing_dependency' | 'error';
    dependency?: string;
  }[];
  overallStatus: 'ready' | 'partial' | 'not_ready';
  recommendations: string[];
}

export function runQACheck(): QAStatus {
  const apiConnections = [
    {
      name: 'Serper (PAA Research)',
      configured: !!process.env.SERPER_API_KEY,
      envVar: 'SERPER_API_KEY',
    },
    {
      name: 'Google Maps',
      configured: !!(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY),
      envVar: 'GOOGLE_MAPS_API_KEY',
    },
    {
      name: 'Anthropic AI',
      configured: !!(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL),
      envVar: 'AI_INTEGRATIONS_ANTHROPIC_API_KEY + AI_INTEGRATIONS_ANTHROPIC_BASE_URL',
    },
    {
      name: 'OpenAI',
      configured: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      envVar: 'OPENAI_API_KEY',
    },
    {
      name: 'OpenRouter',
      configured: !!(process.env.OPENROUTER_API_KEY || process.env.openrouterapi || process.env.travisite),
      envVar: 'OPENROUTER_API_KEY',
    },
    {
      name: 'DeepSeek',
      configured: !!process.env.DEEPSEEK_API_KEY,
      envVar: 'DEEPSEEK_API_KEY',
    },
  ];

  // Check AI providers
  detectAvailableProviders();
  const aiProviders = [
    {
      name: 'Anthropic',
      available: availableProviders.has('anthropic'),
      models: ['claude-3-5-haiku', 'claude-sonnet-4-5', 'claude-opus-4-5'],
    },
    {
      name: 'OpenAI',
      available: availableProviders.has('openai'),
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    },
    {
      name: 'DeepSeek',
      available: availableProviders.has('deepseek'),
      models: ['deepseek-chat'],
    },
  ];

  // Check Octopus modules
  const hasAI = aiProviders.some(p => p.available);
  const hasSerper = apiConnections.find(a => a.name.includes('Serper'))?.configured;
  const hasGoogleMaps = apiConnections.find(a => a.name.includes('Google Maps'))?.configured;

  const octopusModules = [
    {
      name: 'Entity Extractor',
      status: hasAI ? 'ready' as const : 'missing_dependency' as const,
      dependency: hasAI ? undefined : 'AI Provider (Anthropic/OpenAI)',
    },
    {
      name: 'Content Multiplier',
      status: 'ready' as const,
    },
    {
      name: 'Content Factory',
      status: hasAI ? 'ready' as const : 'missing_dependency' as const,
      dependency: hasAI ? undefined : 'AI Provider',
    },
    {
      name: 'PAA Researcher',
      status: hasSerper ? 'ready' as const : 'missing_dependency' as const,
      dependency: hasSerper ? undefined : 'SERPER_API_KEY',
    },
    {
      name: 'Google Maps Enricher',
      status: hasGoogleMaps ? 'ready' as const : 'missing_dependency' as const,
      dependency: hasGoogleMaps ? undefined : 'GOOGLE_MAPS_API_KEY',
    },
    {
      name: 'AEO Optimizer',
      status: 'ready' as const,
    },
    {
      name: 'Schema Generator',
      status: 'ready' as const,
    },
    {
      name: 'Internal Linker',
      status: 'ready' as const,
    },
  ];

  const recommendations: string[] = [];

  if (!hasAI) {
    recommendations.push('CRITICAL: No AI provider configured. Add AI_INTEGRATIONS_ANTHROPIC_API_KEY or OPENAI_API_KEY');
  }

  if (!hasSerper) {
    recommendations.push('Add SERPER_API_KEY for PAA research (improves FAQ quality)');
  }

  if (!hasGoogleMaps) {
    recommendations.push('Add GOOGLE_MAPS_API_KEY for location enrichment');
  }

  const readyCount = octopusModules.filter(m => m.status === 'ready').length;
  const overallStatus: QAStatus['overallStatus'] =
    !hasAI ? 'not_ready' :
    readyCount === octopusModules.length ? 'ready' : 'partial';

  return {
    apiConnections,
    aiProviders,
    octopusModules,
    overallStatus,
    recommendations,
  };
}

// Initialize on load
detectAvailableProviders();
