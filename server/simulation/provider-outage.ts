/**
 * Provider Outage Simulator
 * 
 * TASK 9: Simulation Mode - "What if" analysis
 * 
 * Simulates AI provider outages to predict:
 * - Fallback provider activation
 * - Cost increase from fallback routing
 * - Affected task categories
 * 
 * HARD CONSTRAINTS:
 * - Read-only, no actual provider state changes
 * - No production side effects
 * - Admin access only (enforced at route level)
 */

import { log } from '../lib/logger';
import { getDiagnosticsSnapshot } from '../ai-orchestrator';
import type { AIProvider, TaskCategory } from '../ai-orchestrator/types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ProviderOutageSimulator] ${msg}`, data),
};

export interface ProviderOutageSimulationResult {
  success: boolean;
  simulation: {
    type: 'provider-outage';
    provider: string;
    timestamp: string;
  };
  currentState: {
    provider: {
      name: string;
      available: boolean;
      currentLoad: number;
      dailyUsagePercent: number;
    };
    otherProviders: {
      name: string;
      available: boolean;
      currentLoad: number;
      canAbsorbLoad: boolean;
    }[];
  };
  projectedImpact: {
    fallbackChain: string[];
    primaryFallback: string | null;
    secondaryFallback: string | null;
    wouldHaveFallback: boolean;
    affectedCategories: string[];
    unaffectedCategories: string[];
    estimatedCapacityLoss: number;
  };
  costAnalysis: {
    currentCostPerHour: number;
    projectedCostPerHour: number;
    costIncreasePercent: number;
    costIncreaseReason: string;
  };
  predictions: {
    tasksAffected: number;
    tasksRerouted: number;
    tasksBlocked: number;
    estimatedQueueBacklog: number;
    recoveryTimeMinutes: number;
  };
  recommendations: string[];
  readOnlyMode: true;
}

const VALID_PROVIDERS: AIProvider[] = [
  'anthropic',
  'openai',
  'gemini',
  'deepseek',
  'openrouter',
  'replit-ai',
  'freepik',
];

const PROVIDER_CAPABILITIES: Record<AIProvider, TaskCategory[]> = {
  'anthropic': ['news', 'evergreen', 'content', 'seo', 'translation', 'internal', 'research', 'localization', 'enrichment'],
  'openai': ['news', 'evergreen', 'content', 'seo', 'translation', 'internal', 'research', 'localization', 'enrichment'],
  'gemini': ['news', 'evergreen', 'content', 'research', 'localization'],
  'deepseek': ['content', 'seo', 'internal', 'enrichment'],
  'openrouter': ['content', 'seo', 'translation'],
  'replit-ai': ['content', 'internal'],
  'freepik': ['image'],
};

const FALLBACK_ORDER: AIProvider[] = [
  'anthropic',
  'openai',
  'gemini',
  'deepseek',
  'openrouter',
  'replit-ai',
];

const COST_PER_REQUEST: Record<AIProvider, number> = {
  'anthropic': 0.015,
  'openai': 0.012,
  'gemini': 0.008,
  'deepseek': 0.003,
  'openrouter': 0.010,
  'replit-ai': 0.005,
  'freepik': 0.020,
};

export function simulateProviderOutage(provider: string): ProviderOutageSimulationResult {
  const normalizedProvider = provider.toLowerCase() as AIProvider;
  
  if (!VALID_PROVIDERS.includes(normalizedProvider)) {
    return {
      success: false,
      simulation: {
        type: 'provider-outage',
        provider: provider,
        timestamp: new Date().toISOString(),
      },
      currentState: {
        provider: { name: provider, available: false, currentLoad: 0, dailyUsagePercent: 0 },
        otherProviders: [],
      },
      projectedImpact: {
        fallbackChain: [],
        primaryFallback: null,
        secondaryFallback: null,
        wouldHaveFallback: false,
        affectedCategories: [],
        unaffectedCategories: [],
        estimatedCapacityLoss: 0,
      },
      costAnalysis: {
        currentCostPerHour: 0,
        projectedCostPerHour: 0,
        costIncreasePercent: 0,
        costIncreaseReason: `Invalid provider: ${provider}. Valid providers: ${VALID_PROVIDERS.join(', ')}`,
      },
      predictions: {
        tasksAffected: 0,
        tasksRerouted: 0,
        tasksBlocked: 0,
        estimatedQueueBacklog: 0,
        recoveryTimeMinutes: 0,
      },
      recommendations: [`Provider "${provider}" is not recognized. Use one of: ${VALID_PROVIDERS.join(', ')}`],
      readOnlyMode: true,
    };
  }

  logger.info('Running provider outage simulation', { provider: normalizedProvider });

  const diagnostics = getDiagnosticsSnapshot();

  const targetProvider = diagnostics.providers.find(p => p.provider === normalizedProvider);
  const otherProviders = diagnostics.providers.filter(p => p.provider !== normalizedProvider);

  const currentProviderState = {
    name: normalizedProvider,
    available: targetProvider?.available ?? false,
    currentLoad: targetProvider?.currentLoad ?? 0,
    dailyUsagePercent: targetProvider?.percentDailyUsed ?? 0,
  };

  const otherProviderStates = otherProviders.map(p => ({
    name: p.provider,
    available: p.available,
    currentLoad: p.currentLoad,
    canAbsorbLoad: p.available && p.currentLoad < 70,
  }));

  const affectedCategories = PROVIDER_CAPABILITIES[normalizedProvider] || [];
  const unaffectedCategories: TaskCategory[] = ['image'];
  if (normalizedProvider !== 'freepik') {
    unaffectedCategories.push('image');
  }

  const fallbackChain = FALLBACK_ORDER.filter(p => {
    if (p === normalizedProvider) return false;
    const providerState = otherProviders.find(op => op.provider === p);
    return providerState?.available ?? false;
  });

  const compatibleFallbacks = fallbackChain.filter(fb => {
    const fbCapabilities = PROVIDER_CAPABILITIES[fb];
    return affectedCategories.some(cat => fbCapabilities.includes(cat));
  });

  const primaryFallback = compatibleFallbacks[0] || null;
  const secondaryFallback = compatibleFallbacks[1] || null;
  const wouldHaveFallback = primaryFallback !== null;

  const estimatedCapacityLoss = currentProviderState.currentLoad / diagnostics.providers.length;

  const avgRequestsPerHour = 100;
  const providerShare = 1 / diagnostics.providers.filter(p => p.available).length;
  const currentCostPerHour = avgRequestsPerHour * COST_PER_REQUEST[normalizedProvider] * providerShare;

  let projectedCostPerHour = currentCostPerHour;
  let costIncreaseReason = 'No cost change';

  if (primaryFallback) {
    const fallbackCost = COST_PER_REQUEST[primaryFallback];
    const originalCost = COST_PER_REQUEST[normalizedProvider];
    projectedCostPerHour = avgRequestsPerHour * fallbackCost * providerShare;
    
    if (fallbackCost > originalCost) {
      costIncreaseReason = `Fallback to ${primaryFallback} has higher per-request cost`;
    } else if (fallbackCost < originalCost) {
      costIncreaseReason = `Fallback to ${primaryFallback} has lower per-request cost`;
    } else {
      costIncreaseReason = 'Similar cost structure with fallback provider';
    }
  } else {
    costIncreaseReason = 'No fallback available - tasks may be blocked';
  }

  const costIncreasePercent = currentCostPerHour > 0 
    ? Math.round(((projectedCostPerHour - currentCostPerHour) / currentCostPerHour) * 100)
    : 0;

  const estimatedTasksPerHour = 50;
  const tasksAffected = Math.ceil(estimatedTasksPerHour * providerShare);
  const tasksRerouted = wouldHaveFallback ? tasksAffected : 0;
  const tasksBlocked = wouldHaveFallback ? 0 : tasksAffected;
  const estimatedQueueBacklog = tasksBlocked * 2;
  const recoveryTimeMinutes = wouldHaveFallback ? 5 : 30;

  const recommendations: string[] = [];

  if (!wouldHaveFallback) {
    recommendations.push(
      `CRITICAL: No fallback available for ${normalizedProvider}. Tasks in categories [${affectedCategories.join(', ')}] would be blocked.`
    );
    recommendations.push('Consider enabling additional providers or configuring fallback routes');
  } else {
    recommendations.push(
      `Automatic failover to ${primaryFallback} would handle affected traffic`
    );
  }

  if (normalizedProvider === 'anthropic') {
    recommendations.push(
      'Anthropic is the primary provider. Outage would significantly impact content generation.'
    );
  }

  if (costIncreasePercent > 20) {
    recommendations.push(
      `Warning: ${costIncreasePercent}% cost increase expected during fallback period`
    );
  }

  if (normalizedProvider === 'freepik') {
    recommendations.push(
      'Image generation would be unavailable. Consider pre-generating critical images.'
    );
  }

  return {
    success: true,
    simulation: {
      type: 'provider-outage',
      provider: normalizedProvider,
      timestamp: new Date().toISOString(),
    },
    currentState: {
      provider: currentProviderState,
      otherProviders: otherProviderStates,
    },
    projectedImpact: {
      fallbackChain: compatibleFallbacks,
      primaryFallback,
      secondaryFallback,
      wouldHaveFallback,
      affectedCategories,
      unaffectedCategories: [...new Set(unaffectedCategories)],
      estimatedCapacityLoss: Math.round(estimatedCapacityLoss),
    },
    costAnalysis: {
      currentCostPerHour: Math.round(currentCostPerHour * 100) / 100,
      projectedCostPerHour: Math.round(projectedCostPerHour * 100) / 100,
      costIncreasePercent,
      costIncreaseReason,
    },
    predictions: {
      tasksAffected,
      tasksRerouted,
      tasksBlocked,
      estimatedQueueBacklog,
      recoveryTimeMinutes,
    },
    recommendations,
    readOnlyMode: true,
  };
}
