/**
 * AI Orchestrator - Future Parallelism Hooks
 * 
 * INACTIVE BY DEFAULT: Prepared hooks for future model-level routing,
 * credit reservation, and backpressure handling.
 * 
 * INVARIANT: All hooks are OFF by default. No behavior changes until explicitly enabled.
 * INVARIANT: This is scaffolding only - no production impact.
 */

import type { AIProvider, TaskCategory, TaskPriority } from './types';

/**
 * Model-level routing configuration
 * 
 * FUTURE: Enable to route specific models to specific providers
 * CURRENTLY: OFF - all routing uses default provider pool logic
 */
export interface ModelRoutingConfig {
  enabled: false; // LOCKED OFF
  routes: {
    modelId: string;
    preferredProviders: AIProvider[];
    fallbackProviders: AIProvider[];
    maxLatencyMs: number;
  }[];
}

export const MODEL_ROUTING_CONFIG: ModelRoutingConfig = {
  enabled: false,
  routes: [
    // EXAMPLE: Claude-specific routing (INACTIVE)
    // {
    //   modelId: 'claude-3-opus',
    //   preferredProviders: ['anthropic'],
    //   fallbackProviders: ['openrouter'],
    //   maxLatencyMs: 10000,
    // },
    // {
    //   modelId: 'gpt-4-turbo',
    //   preferredProviders: ['openai'],
    //   fallbackProviders: ['openrouter', 'replit-ai'],
    //   maxLatencyMs: 8000,
    // },
  ],
};

/**
 * Credit reservation per task category
 * 
 * FUTURE: Enable to reserve credits for specific categories
 * CURRENTLY: OFF - credit monitor uses simple limits
 */
export interface CreditReservationConfig {
  enabled: false; // LOCKED OFF
  reservations: Record<TaskCategory, {
    minReservedPercent: number;
    maxPercent: number;
    priority: number;
  }>;
}

export const CREDIT_RESERVATION_CONFIG: CreditReservationConfig = {
  enabled: false,
  reservations: {
    news: { minReservedPercent: 20, maxPercent: 40, priority: 1 },
    evergreen: { minReservedPercent: 25, maxPercent: 50, priority: 2 },
    enrichment: { minReservedPercent: 10, maxPercent: 30, priority: 4 },
    image: { minReservedPercent: 0, maxPercent: 0, priority: 99 }, // Images via Image Engine
    research: { minReservedPercent: 15, maxPercent: 35, priority: 3 },
    localization: { minReservedPercent: 10, maxPercent: 25, priority: 5 },
  },
};

/**
 * Backpressure configuration
 * 
 * FUTURE: Enable to apply backpressure based on queue depth
 * CURRENTLY: OFF - rate policy handles basic limits
 */
export interface BackpressureConfig {
  enabled: false; // LOCKED OFF
  thresholds: {
    warningQueueDepth: number;
    criticalQueueDepth: number;
    maxQueueDepth: number;
  };
  actions: {
    onWarning: 'log' | 'slow' | 'reject';
    onCritical: 'log' | 'slow' | 'reject';
    onMax: 'log' | 'slow' | 'reject';
  };
}

export const BACKPRESSURE_CONFIG: BackpressureConfig = {
  enabled: false,
  thresholds: {
    warningQueueDepth: 50,
    criticalQueueDepth: 100,
    maxQueueDepth: 200,
  },
  actions: {
    onWarning: 'log',
    onCritical: 'slow',
    onMax: 'reject',
  },
};

/**
 * Provider health check configuration
 * 
 * FUTURE: Enable to perform periodic health checks
 * CURRENTLY: OFF - providers marked unavailable on failure
 */
export interface HealthCheckConfig {
  enabled: false; // LOCKED OFF
  intervalMs: number;
  timeoutMs: number;
  failureThreshold: number;
  recoveryThreshold: number;
}

export const HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  enabled: false,
  intervalMs: 30000,
  timeoutMs: 5000,
  failureThreshold: 3,
  recoveryThreshold: 2,
};

/**
 * Hook: Model-level routing decision
 * 
 * STUB: Returns null when disabled (which is always, currently)
 * FUTURE: Returns preferred provider for a specific model
 */
export function hookModelRouting(modelId: string): AIProvider | null {
  if (!MODEL_ROUTING_CONFIG.enabled) return null;
  
  const route = MODEL_ROUTING_CONFIG.routes.find(r => r.modelId === modelId);
  if (!route) return null;
  
  // Would check provider availability and return best match
  return route.preferredProviders[0] ?? null;
}

/**
 * Hook: Credit reservation check
 * 
 * STUB: Returns true when disabled (allows all requests)
 * FUTURE: Returns false if category has exhausted its reservation
 */
export function hookCreditReservation(
  _category: TaskCategory,
  _estimatedCredits: number
): { allowed: boolean; reason?: string } {
  if (!CREDIT_RESERVATION_CONFIG.enabled) {
    return { allowed: true };
  }
  
  // Would check category-specific reservation and return decision
  return { allowed: true };
}

/**
 * Hook: Backpressure check
 * 
 * STUB: Returns 'proceed' when disabled
 * FUTURE: Returns action based on queue depth
 */
export function hookBackpressureCheck(
  _queueDepth: number
): 'proceed' | 'slow' | 'reject' {
  if (!BACKPRESSURE_CONFIG.enabled) {
    return 'proceed';
  }
  
  // Would check thresholds and return appropriate action
  return 'proceed';
}

/**
 * Hook: Priority queue ordering
 * 
 * STUB: Returns priority as-is when disabled
 * FUTURE: Adjusts priority based on category and load
 */
export function hookPriorityAdjustment(
  priority: TaskPriority,
  _category: TaskCategory,
  _currentLoad: number
): TaskPriority {
  // Currently just passes through
  return priority;
}

/**
 * Hook: Provider failover decision
 * 
 * STUB: Returns null when disabled (use default failover)
 * FUTURE: Returns specific failover provider based on context
 */
export function hookFailoverDecision(
  _failedProvider: AIProvider,
  _category: TaskCategory,
  _retryCount: number
): AIProvider | null {
  // Currently returns null - use default fallback order
  return null;
}
