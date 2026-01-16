/**
 * Autonomy Enforcement SDK - Types
 * Core types for policy enforcement across the system
 */

import { PolicyDecision, PolicyReason, BudgetStatus, ActionType, PolicyTarget } from '../policy/types';

// Feature types that can be guarded
export type GuardedFeature =
  | 'chat'
  | 'octopus'
  | 'search'
  | 'aeo'
  | 'translation'
  | 'images'
  | 'content_enrichment'
  | 'seo_optimization'
  | 'internal_linking'
  | 'background_job'
  | 'publishing';

// Context provided when requesting enforcement
export interface EnforcementContext {
  feature: GuardedFeature;
  action: ActionType;
  entityId?: string;
  contentId?: string;
  locale?: string;
  requesterId?: string;
  estimatedTokens?: number;
  estimatedCost?: number;
  metadata?: Record<string, unknown>;
}

// Result of enforcement check
export interface EnforcementResult {
  allowed: boolean;
  decision: PolicyDecision;
  reasons: PolicyReason[];
  warnings: string[];
  budgetRemaining?: {
    actions: number;
    tokens: number;
    aiSpendCents: number;
  };
  matchedPolicy?: string;
  overrideActive?: boolean;
  evaluatedAt: Date;
}

// Typed error for blocked operations
export class AutonomyBlockedError extends Error {
  public readonly code = 'AUTONOMY_BLOCKED';
  public readonly decision: PolicyDecision = 'BLOCK';
  public readonly reasons: PolicyReason[];
  public readonly feature: GuardedFeature;
  public readonly action: ActionType;
  public readonly matchedPolicy?: string;
  public readonly retryAfter?: number;

  constructor(
    message: string,
    params: {
      reasons: PolicyReason[];
      feature: GuardedFeature;
      action: ActionType;
      matchedPolicy?: string;
      retryAfter?: number;
    }
  ) {
    super(message);
    this.name = 'AutonomyBlockedError';
    this.reasons = params.reasons;
    this.feature = params.feature;
    this.action = params.action;
    this.matchedPolicy = params.matchedPolicy;
    this.retryAfter = params.retryAfter;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      decision: this.decision,
      reasons: this.reasons,
      feature: this.feature,
      action: this.action,
      matchedPolicy: this.matchedPolicy,
      retryAfter: this.retryAfter,
    };
  }
}

// Override definition
export interface EnforcementOverride {
  id: string;
  targetKey: string;
  feature: GuardedFeature;
  reason: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

// Consumption record for budget tracking
export interface ConsumptionRecord {
  feature: GuardedFeature;
  action: ActionType;
  tokensUsed: number;
  aiSpendCents: number;
  success: boolean;
  durationMs: number;
  timestamp: Date;
}

// Degraded mode fallback response
export interface DegradedResponse<T = unknown> {
  isDegraded: true;
  reason: string;
  fallbackData: T;
  retryAfter?: number;
}

// Configuration for enforcement
export interface EnforcementConfig {
  enabled: boolean;
  degradedModeEnabled: boolean;
  defaultBlockMessage: string;
  evaluationTimeoutMs: number;
  budgetCheckTimeoutMs: number;
  maxCacheSize: number;
  cacheTtlMs: number;
}

export const DEFAULT_ENFORCEMENT_CONFIG: EnforcementConfig = {
  enabled: process.env.ENABLE_AUTONOMY_POLICY === 'true',
  degradedModeEnabled: process.env.ENABLE_AUTONOMY_DEGRADED_MODE === 'true',
  defaultBlockMessage: process.env.AUTONOMY_BLOCK_MESSAGE || 'This operation is temporarily limited by system policies.',
  evaluationTimeoutMs: 3000,
  budgetCheckTimeoutMs: 2000,
  maxCacheSize: 1000,
  cacheTtlMs: 30000,
};

// Job blocking result (for job queue integration)
export interface JobBlockResult {
  blocked: boolean;
  reason?: string;
  rescheduleAfterMs?: number;
  shouldRetry: boolean;
}
