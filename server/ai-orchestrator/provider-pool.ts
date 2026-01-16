/**
 * AI Orchestrator - Provider Pool
 * 
 * Manages the pool of AI providers, their configurations, and availability.
 * Provides routing logic to select the best provider for a given task.
 * 
 * INVARIANTS:
 * - Image tasks MUST route through Image Engine (never direct to Freepik)
 * - Provider selection is deterministic for same input conditions
 * - No provider exhausts all credits (starvation prevention)
 */

import { log } from '../lib/logger';
import type {
  AIProvider,
  AITask,
  ProviderConfig,
  ProviderStatus,
  ProviderCapability,
  TaskCategory,
  RoutingDecision,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ProviderPool] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[ProviderPool] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[ProviderPool] ${msg}`, undefined, data),
};

/**
 * Default provider configurations
 * These can be overridden via environment variables or database config
 */
const DEFAULT_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    provider: 'anthropic',
    enabled: true,
    maxConcurrent: 5,
    rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
    creditLimit: { dailyLimit: 100, monthlyLimit: 2000, warningThreshold: 80, hardStop: false },
    capabilities: ['text-generation', 'chat-completion', 'vision', 'long-context', 'streaming'],
    fallbackOrder: 1,
  },
  {
    provider: 'openai',
    enabled: true,
    maxConcurrent: 5,
    rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
    creditLimit: { dailyLimit: 50, monthlyLimit: 1000, warningThreshold: 80, hardStop: false },
    capabilities: ['text-generation', 'chat-completion', 'vision', 'embeddings', 'function-calling'],
    fallbackOrder: 2,
  },
  {
    provider: 'gemini',
    enabled: true,
    maxConcurrent: 3,
    rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
    creditLimit: { dailyLimit: 30, monthlyLimit: 500, warningThreshold: 80, hardStop: false },
    capabilities: ['text-generation', 'chat-completion', 'long-context', 'vision'],
    fallbackOrder: 3,
  },
  {
    provider: 'deepseek',
    enabled: true,
    maxConcurrent: 3,
    rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
    creditLimit: { dailyLimit: 50, monthlyLimit: 800, warningThreshold: 80, hardStop: false },
    capabilities: ['text-generation', 'chat-completion', 'code-generation'],
    fallbackOrder: 4,
  },
  {
    provider: 'openrouter',
    enabled: true,
    maxConcurrent: 5,
    rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
    creditLimit: { dailyLimit: 30, monthlyLimit: 500, warningThreshold: 80, hardStop: false },
    capabilities: ['text-generation', 'chat-completion'],
    fallbackOrder: 5,
  },
  {
    provider: 'replit-ai',
    enabled: true,
    maxConcurrent: 3,
    rateLimit: { requestsPerMinute: 20, requestsPerHour: 300 },
    creditLimit: { dailyLimit: 100, monthlyLimit: 2000, warningThreshold: 90, hardStop: false },
    capabilities: ['text-generation', 'chat-completion', 'vision'],
    fallbackOrder: 6,
  },
  {
    provider: 'freepik',
    enabled: true,
    maxConcurrent: 2,
    rateLimit: { requestsPerMinute: 10, requestsPerHour: 100 },
    creditLimit: { dailyLimit: 50, monthlyLimit: 500, warningThreshold: 70, hardStop: true },
    capabilities: ['image-generation'],
    fallbackOrder: 99, // Never used as fallback for text tasks
  },
];

/**
 * Task category to required capabilities mapping
 */
const CATEGORY_CAPABILITIES: Record<TaskCategory, ProviderCapability[]> = {
  news: ['text-generation', 'chat-completion'],
  evergreen: ['text-generation', 'chat-completion', 'long-context'],
  enrichment: ['text-generation'],
  image: ['image-generation'],
  research: ['text-generation', 'long-context'],
  localization: ['text-generation'],
  // PHASE 5.3: New enforced categories
  content: ['text-generation', 'chat-completion'],
  seo: ['text-generation'],
  translation: ['text-generation'],
  internal: ['text-generation'],
};

/**
 * Task category priority order for provider selection
 * Higher priority categories get first pick of resources
 */
const CATEGORY_PRIORITY_ORDER: TaskCategory[] = [
  'news',        // Breaking news gets priority
  'evergreen',   // Destination content
  'content',     // General content
  'research',    // Fact-checking
  'seo',         // SEO tasks
  'enrichment',  // SEO improvements
  'translation', // Translation tasks
  'localization',// Translations (legacy)
  'internal',    // Internal operations
  'image',       // Images (routed via Image Engine)
];

export class ProviderPool {
  private configs: Map<AIProvider, ProviderConfig> = new Map();
  private status: Map<AIProvider, ProviderStatus> = new Map();
  private initialized = false;

  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    for (const config of DEFAULT_PROVIDER_CONFIGS) {
      this.configs.set(config.provider, config);
      this.status.set(config.provider, {
        provider: config.provider,
        available: config.enabled,
        currentLoad: 0,
        remainingCredits: config.creditLimit.dailyLimit,
        rateLimitRemaining: config.rateLimit.requestsPerMinute,
      });
    }
    this.initialized = true;
    logger.info('Provider pool initialized', { providerCount: this.configs.size });
  }

  /**
   * Get the best provider for a given task
   * 
   * CRITICAL: Image tasks are BLOCKED here - they MUST go through Image Engine
   * @throws Error if task.category === 'image' - this is a hard invariant violation
   */
  selectProvider(task: AITask): RoutingDecision {
    // HARD INVARIANT: Image tasks cannot be routed directly - THROW to enforce
    if (task.category === 'image') {
      const errorMessage = `INVARIANT VIOLATION: Image task ${task.id} submitted directly to ProviderPool. ` +
        `Image tasks MUST route through Image Engine API (/api/v1/images/*). ` +
        `This is a programming error that must be fixed.`;
      logger.error('Image task routing blocked - invariant violation', {
        taskId: task.id,
        category: task.category,
      });
      throw new Error(errorMessage);
    }

    const requiredCapabilities = CATEGORY_CAPABILITIES[task.category];
    const eligibleProviders = this.getEligibleProviders(requiredCapabilities);

    if (eligibleProviders.length === 0) {
      logger.error('No eligible providers available', {
        taskId: task.id,
        category: task.category,
        requiredCapabilities,
      });
      return {
        provider: 'anthropic', // Default fallback
        reason: 'No eligible providers - using default',
        alternatives: [],
        estimatedCost: 0,
        estimatedLatencyMs: 1000,
      };
    }

    // If task has preferred provider and it's eligible, use it
    if (task.provider && eligibleProviders.includes(task.provider)) {
      const status = this.status.get(task.provider);
      if (status?.available) {
        return {
          provider: task.provider,
          reason: 'Preferred provider available',
          alternatives: eligibleProviders.filter(p => p !== task.provider),
          estimatedCost: this.estimateCost(task.provider, task),
          estimatedLatencyMs: this.estimateLatency(task.provider),
        };
      }
    }

    // Select best available provider based on:
    // 1. Availability
    // 2. Current load
    // 3. Remaining credits
    // 4. Fallback order
    const sorted = eligibleProviders
      .map(provider => ({
        provider,
        config: this.configs.get(provider)!,
        status: this.status.get(provider)!,
      }))
      .filter(p => p.status.available)
      .sort((a, b) => {
        // Lower load is better
        const loadDiff = a.status.currentLoad - b.status.currentLoad;
        if (Math.abs(loadDiff) > 20) return loadDiff;
        
        // Higher remaining credits is better
        const creditDiff = b.status.remainingCredits - a.status.remainingCredits;
        if (Math.abs(creditDiff) > 10) return creditDiff < 0 ? 1 : -1;
        
        // Fall back to configured order
        return a.config.fallbackOrder - b.config.fallbackOrder;
      });

    if (sorted.length === 0) {
      return {
        provider: 'anthropic',
        reason: 'All providers unavailable - using default',
        alternatives: [],
        estimatedCost: 0,
        estimatedLatencyMs: 1000,
      };
    }

    const selected = sorted[0];
    return {
      provider: selected.provider,
      reason: `Selected based on load (${selected.status.currentLoad}%) and credits (${selected.status.remainingCredits})`,
      alternatives: sorted.slice(1).map(p => p.provider),
      estimatedCost: this.estimateCost(selected.provider, task),
      estimatedLatencyMs: this.estimateLatency(selected.provider),
    };
  }

  private getEligibleProviders(requiredCapabilities: ProviderCapability[]): AIProvider[] {
    const eligible: AIProvider[] = [];
    
    for (const [provider, config] of this.configs) {
      if (!config.enabled) continue;
      
      const hasAllCapabilities = requiredCapabilities.every(
        cap => config.capabilities.includes(cap)
      );
      
      if (hasAllCapabilities) {
        eligible.push(provider);
      }
    }
    
    return eligible;
  }

  private estimateCost(provider: AIProvider, _task: AITask): number {
    // Stub: Return estimated cost in credits
    const baseCosts: Record<AIProvider, number> = {
      anthropic: 1.0,
      openai: 0.8,
      gemini: 0.5,
      deepseek: 0.3,
      openrouter: 0.6,
      'replit-ai': 0.2,
      freepik: 2.0,
    };
    return baseCosts[provider] ?? 1.0;
  }

  private estimateLatency(provider: AIProvider): number {
    // Stub: Return estimated latency in ms
    const baseLatencies: Record<AIProvider, number> = {
      anthropic: 800,
      openai: 600,
      gemini: 700,
      deepseek: 1000,
      openrouter: 900,
      'replit-ai': 500,
      freepik: 2000,
    };
    return baseLatencies[provider] ?? 1000;
  }

  /**
   * Mark a provider as having an active request (increment load)
   */
  incrementLoad(provider: AIProvider): void {
    const status = this.status.get(provider);
    const config = this.configs.get(provider);
    if (!status || !config) return;

    // Calculate load as percentage of max concurrent
    const currentInFlight = Math.round((status.currentLoad / 100) * config.maxConcurrent);
    const newInFlight = currentInFlight + 1;
    status.currentLoad = Math.min(100, (newInFlight / config.maxConcurrent) * 100);
    
    this.status.set(provider, status);
  }

  /**
   * Mark a provider request as completed (decrement load)
   */
  decrementLoad(provider: AIProvider): void {
    const status = this.status.get(provider);
    const config = this.configs.get(provider);
    if (!status || !config) return;

    // Calculate load as percentage of max concurrent
    const currentInFlight = Math.round((status.currentLoad / 100) * config.maxConcurrent);
    const newInFlight = Math.max(0, currentInFlight - 1);
    status.currentLoad = (newInFlight / config.maxConcurrent) * 100;
    
    this.status.set(provider, status);
  }

  /**
   * Update provider status after a request
   */
  updateProviderStatus(
    provider: AIProvider,
    success: boolean,
    creditsUsed: number,
    _latencyMs: number
  ): void {
    const status = this.status.get(provider);
    if (!status) return;

    const config = this.configs.get(provider);
    
    status.remainingCredits = Math.max(0, status.remainingCredits - creditsUsed);
    status.rateLimitRemaining = Math.max(0, status.rateLimitRemaining - 1);
    
    // Decrement load when request completes
    this.decrementLoad(provider);
    
    if (success) {
      status.lastSuccessAt = new Date();
    } else {
      status.lastErrorAt = new Date();
    }

    // Check if provider should be marked unavailable
    if (config?.creditLimit.hardStop && status.remainingCredits <= 0) {
      status.available = false;
      logger.warn('Provider credit limit reached - marking unavailable', { provider });
    }

    this.status.set(provider, status);
  }

  /**
   * Get current status of all providers
   */
  getAllStatus(): ProviderStatus[] {
    return Array.from(this.status.values());
  }

  /**
   * Get status of a specific provider
   */
  getProviderStatus(provider: AIProvider): ProviderStatus | undefined {
    return this.status.get(provider);
  }

  /**
   * Reset daily limits (call at midnight UTC)
   */
  resetDailyLimits(): void {
    for (const [provider, config] of this.configs) {
      const status = this.status.get(provider);
      if (status) {
        status.remainingCredits = config.creditLimit.dailyLimit;
        status.rateLimitRemaining = config.rateLimit.requestsPerMinute;
        status.available = config.enabled;
        this.status.set(provider, status);
      }
    }
    logger.info('Daily limits reset for all providers');
  }
}

// Singleton instance
let poolInstance: ProviderPool | null = null;

export function getProviderPool(): ProviderPool {
  if (!poolInstance) {
    poolInstance = new ProviderPool();
  }
  return poolInstance;
}
