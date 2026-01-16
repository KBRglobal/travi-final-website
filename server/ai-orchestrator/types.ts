/**
 * AI Orchestrator - Type Definitions
 * 
 * Central type definitions for the AI orchestration layer.
 * This module defines the contracts between providers, policies, and consumers.
 */

export type AIProvider = 
  | 'anthropic'    // Claude - primary for content generation
  | 'openai'       // GPT - fallback, vision capabilities
  | 'gemini'       // Google - research, long context
  | 'deepseek'     // Cost-effective alternative
  | 'openrouter'   // Multi-model routing
  | 'replit-ai'    // Replit's hosted models
  | 'freepik';     // Image generation (via Image Engine only)

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export type TaskCategory = 
  | 'news'           // Breaking news, time-sensitive
  | 'evergreen'      // Guides, destination content
  | 'enrichment'     // SEO, translations, metadata
  | 'image'          // Image generation/acquisition (via Image Engine only)
  | 'research'       // PAA, fact-checking
  | 'localization'   // Multi-language translation
  // PHASE 5.3: Enforced categories for all AI calls
  | 'content'        // General content generation
  | 'seo'            // SEO-specific tasks
  | 'translation'    // Translation tasks
  | 'internal';      // System/internal operations

export interface AITask {
  id: string;
  category: TaskCategory;
  priority: TaskPriority;
  provider?: AIProvider;  // Preferred provider (optional)
  payload: unknown;
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
}

export interface AITaskResult {
  taskId: string;
  success: boolean;
  provider: AIProvider;
  result?: unknown;
  error?: string;
  latencyMs: number;
  creditsUsed: number;
  timestamp: Date;
}

export interface ProviderConfig {
  provider: AIProvider;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  maxConcurrent: number;
  rateLimit: RateLimitConfig;
  creditLimit: CreditLimitConfig;
  capabilities: ProviderCapability[];
  fallbackOrder: number;  // Lower = higher priority as fallback
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerMinute?: number;
  tokensPerDay?: number;
}

export interface CreditLimitConfig {
  dailyLimit: number;
  monthlyLimit: number;
  warningThreshold: number;  // Percentage (0-100)
  hardStop: boolean;         // Stop all requests when limit reached
}

export type ProviderCapability = 
  | 'text-generation'
  | 'chat-completion'
  | 'vision'
  | 'embeddings'
  | 'image-generation'
  | 'code-generation'
  | 'long-context'
  | 'streaming'
  | 'function-calling';

export interface ProviderStatus {
  provider: AIProvider;
  available: boolean;
  currentLoad: number;       // 0-100 percentage
  remainingCredits: number;
  rateLimitRemaining: number;
  lastError?: string;
  lastSuccessAt?: Date;
  lastErrorAt?: Date;
}

export interface OrchestratorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCreditsUsed: number;
  averageLatencyMs: number;
  providerBreakdown: Record<AIProvider, ProviderMetrics>;
}

export interface ProviderMetrics {
  requests: number;
  successes: number;
  failures: number;
  creditsUsed: number;
  averageLatencyMs: number;
  rateLimitHits: number;
}

export interface BackpressureState {
  isActive: boolean;
  reason?: string;
  affectedProviders: AIProvider[];
  estimatedRecoveryMs?: number;
  queueDepth: number;
}

export interface RoutingDecision {
  provider: AIProvider;
  reason: string;
  alternatives: AIProvider[];
  estimatedCost: number;
  estimatedLatencyMs: number;
}
