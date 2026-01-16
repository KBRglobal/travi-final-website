/**
 * AI Provider Management
 * Handles multi-provider AI client initialization with fallback chain
 * Uses native SDKs for each provider with unified interface
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentTier, ModelConfig } from "./types";

// ============================================================================
// Unified AI Interface
// ============================================================================

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" } | { type: "text" };
}

export interface AICompletionResult {
  content: string;
  provider: string;
  model: string;
}

export interface UnifiedAIProvider {
  name: string;
  model: string;
  generateCompletion: (options: AICompletionOptions) => Promise<AICompletionResult>;
}

// ============================================================================
// API Key Validation
// ============================================================================

export function getValidOpenAIKey(): string | null {
  const integrationsKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (integrationsKey && !integrationsKey.includes('DUMMY')) {
    return integrationsKey;
  }
  const directKey = process.env.OPENAI_API_KEY;
  if (directKey && !directKey.includes('DUMMY')) {
    return directKey;
  }
  return null;
}

// ============================================================================
// OpenAI Provider
// ============================================================================

function createOpenAIProvider(): UnifiedAIProvider | null {
  const apiKey = getValidOpenAIKey();
  if (!apiKey) return null;
  
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });

  return {
    name: "openai",
    model: "gpt-4o-mini",
    generateCompletion: async (options) => {
      const completion = await client.chat.completions.create({
        model: options.model || "gpt-4o-mini",
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 12000,
        ...(options.responseFormat?.type === "json_object" ? { response_format: { type: "json_object" } } : {}),
      });
      return {
        content: completion.choices[0]?.message?.content || "",
        provider: "openai",
        model: options.model || "gpt-4o-mini",
      };
    },
  };
}

// ============================================================================
// Anthropic Provider (using native SDK)
// ============================================================================

function createAnthropicProvider(): UnifiedAIProvider | null {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  
  if (!baseURL || !apiKey) return null;
  
  const client = new Anthropic({
    apiKey,
    baseURL,
  });

  return {
    name: "anthropic",
    model: "claude-sonnet-4-5",
    generateCompletion: async (options) => {
      const systemMessage = options.messages.find(m => m.role === "system");
      const userMessages = options.messages.filter(m => m.role !== "system");
      
      const messages = userMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      let systemPrompt = systemMessage?.content || "";
      if (options.responseFormat?.type === "json_object") {
        systemPrompt += "\n\nIMPORTANT: You MUST respond with valid JSON only. No other text before or after the JSON.";
      }

      const response = await client.messages.create({
        model: options.model || "claude-sonnet-4-5",
        max_tokens: options.maxTokens ?? 8192,
        system: systemPrompt,
        messages,
      });

      // Extract all text content blocks and concatenate them
      const textParts: string[] = [];
      for (const block of response.content) {
        if (block.type === "text") {
          textParts.push(block.text);
        }
      }
      const content = textParts.join("\n");
      
      if (!content) {
        throw new Error("Empty response from Anthropic - no text content blocks found");
      }
      
      return {
        content,
        provider: "anthropic",
        model: options.model || "claude-sonnet-4-5",
      };
    },
  };
}

// ============================================================================
// OpenRouter Provider (OpenAI-compatible)
// ============================================================================

function createOpenRouterProvider(): UnifiedAIProvider | null {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.New_open_routers || process.env.openrouterapi || process.env.OPENROUTERAPI || process.env.travisite;
  if (!apiKey) return null;
  
  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "https://travi.world",
      "X-Title": "Travi CMS",
    },
  });

  return {
    name: "openrouter",
    model: "anthropic/claude-3.5-sonnet",
    generateCompletion: async (options) => {
      const completion = await client.chat.completions.create({
        model: options.model || "anthropic/claude-3.5-sonnet",
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 12000,
      });
      return {
        content: completion.choices[0]?.message?.content || "",
        provider: "openrouter",
        model: options.model || "anthropic/claude-3.5-sonnet",
      };
    },
  };
}

// ============================================================================
// DeepSeek Provider (OpenAI-compatible)
// ============================================================================

function createDeepSeekProvider(): UnifiedAIProvider | null {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });

  return {
    name: "deepseek",
    model: "deepseek-chat",
    generateCompletion: async (options) => {
      // DeepSeek API has max_tokens limit of 8192
      const maxTokens = Math.min(options.maxTokens ?? 8192, 8192);
      const completion = await client.chat.completions.create({
        model: options.model || "deepseek-chat",
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: maxTokens,
      });
      return {
        content: completion.choices[0]?.message?.content || "",
        provider: "deepseek",
        model: options.model || "deepseek-chat",
      };
    },
  };
}

// ============================================================================
// Replit AI Provider (Free tier via Replit AI Integrations)
// Uses the special modelfarm proxy - no external API key needed
// ============================================================================

function createReplitAIProvider(): UnifiedAIProvider | null {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  
  // Replit AI Integrations uses a dummy key with special base URL
  if (!baseURL || !apiKey) return null;
  
  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  return {
    name: "replit-ai",
    model: "gpt-4o-mini",
    generateCompletion: async (options) => {
      // Replit AI uses max_completion_tokens instead of max_tokens for newer models
      const completion = await client.chat.completions.create({
        model: options.model || "gpt-4o-mini",
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 8192,
        ...(options.responseFormat?.type === "json_object" ? { response_format: { type: "json_object" } } : {}),
      });
      return {
        content: completion.choices[0]?.message?.content || "",
        provider: "replit-ai",
        model: options.model || "gpt-4o-mini",
      };
    },
  };
}

// ============================================================================
// Provider Availability Tracking
// ============================================================================

const failedProviders = new Set<string>();
const failedProviderExpiry = new Map<string, number>();
const creditExhaustedProviders = new Set<string>();
const creditExhaustedExpiry = new Map<string, number>();

export type FailureReason = "rate_limited" | "no_credits" | "error";

export function markProviderFailed(provider: string, reason: FailureReason = "rate_limited"): void {
  if (reason === "no_credits") {
    // Credit exhaustion lasts longer (1 hour) since balance won't change quickly
    creditExhaustedProviders.add(provider);
    creditExhaustedExpiry.set(provider, Date.now() + 60 * 60 * 1000);
  } else {
    // Rate limits expire after 5 minutes
    failedProviders.add(provider);
    failedProviderExpiry.set(provider, Date.now() + 5 * 60 * 1000);
  }
}

export function hasNoCredits(provider: string): boolean {
  if (!creditExhaustedProviders.has(provider)) return false;
  const expiry = creditExhaustedExpiry.get(provider);
  if (expiry && Date.now() > expiry) {
    creditExhaustedProviders.delete(provider);
    creditExhaustedExpiry.delete(provider);
    return false;
  }
  return true;
}

export function isRateLimited(provider: string): boolean {
  if (!failedProviders.has(provider)) return false;
  const expiry = failedProviderExpiry.get(provider);
  if (expiry && Date.now() > expiry) {
    failedProviders.delete(provider);
    failedProviderExpiry.delete(provider);
    return false;
  }
  return true;
}

export function markProviderSuccess(provider: string): void {
  // Clear any failure states when a provider succeeds
  failedProviders.delete(provider);
  failedProviderExpiry.delete(provider);
  creditExhaustedProviders.delete(provider);
  creditExhaustedExpiry.delete(provider);
}

function isProviderAvailable(provider: string): boolean {
  // Check credit exhaustion first
  if (hasNoCredits(provider)) return false;
  
  // Then check rate limiting
  return !isRateLimited(provider);
}

// ============================================================================
// Get All Available Providers (Unified Interface)
// ============================================================================

export function getAllUnifiedProviders(): UnifiedAIProvider[] {
  const providers: UnifiedAIProvider[] = [];

  // Priority order: Anthropic first (most reliable), then OpenRouter, DeepSeek, OpenAI last (rate limited)

  if (isProviderAvailable("anthropic")) {
    const anthropic = createAnthropicProvider();
    if (anthropic) providers.push(anthropic);
  }

  if (isProviderAvailable("openrouter")) {
    const openrouter = createOpenRouterProvider();
    if (openrouter) providers.push(openrouter);
  }

  if (isProviderAvailable("deepseek")) {
    const deepseek = createDeepSeekProvider();
    if (deepseek) providers.push(deepseek);
  }

  if (isProviderAvailable("openai")) {
    const openai = createOpenAIProvider();
    if (openai) providers.push(openai);
  }

  // Replit AI as last fallback - always available via Replit AI Integrations
  // Uses the modelfarm proxy with dummy key - billed to user's Replit credits
  if (isProviderAvailable("replit-ai")) {
    const replitAI = createReplitAIProvider();
    if (replitAI) providers.push(replitAI);
  }

  return providers;
}

// ============================================================================
// Legacy OpenAI-compatible interface (for backwards compatibility)
// ============================================================================

export function getOpenAIClient(): OpenAI | null {
  const apiKey = getValidOpenAIKey();
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

export type AIProvider = { client: OpenAI; provider: string; model: string };

export function getAllAIClients(): AIProvider[] {
  const clients: AIProvider[] = [];

  if (isProviderAvailable("openai")) {
    const openai = getOpenAIClient();
    if (openai) {
      clients.push({ client: openai, provider: "openai", model: "gpt-4o-mini" });
    }
  }

  if (isProviderAvailable("openrouter")) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.New_open_routers || process.env.openrouterapi || process.env.travisite;
    if (apiKey) {
      const client = new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": process.env.APP_URL || "https://travi.world",
          "X-Title": "Travi CMS",
        },
      });
      clients.push({ client, provider: "openrouter", model: "anthropic/claude-3.5-sonnet" });
    }
  }

  if (isProviderAvailable("deepseek")) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (apiKey) {
      const client = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com/v1",
      });
      clients.push({ client, provider: "deepseek", model: "deepseek-chat" });
    }
  }

  // Replit AI as last fallback - always available via Replit AI Integrations
  if (isProviderAvailable("replit-ai")) {
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (baseURL && apiKey) {
      const client = new OpenAI({ apiKey, baseURL });
      clients.push({ client, provider: "replit-ai", model: "gpt-4o-mini" });
    }
  }

  return clients;
}

export function getAIClient(): { client: OpenAI; provider: string } | null {
  const clients = getAllAIClients();
  if (clients.length > 0) {
    return { client: clients[0].client, provider: clients[0].provider };
  }
  console.warn("[AI Generator] No AI provider configured");
  return null;
}

export function getOpenAIClientForImages(): OpenAI | null {
  const apiKey = getValidOpenAIKey();
  if (!apiKey) {
    console.warn("[AI Generator] No valid OpenAI API key for DALL-E");
    return null;
  }
  return new OpenAI({ apiKey });
}

// ============================================================================
// Model Configuration
// ============================================================================

const MODEL_CONFIGS: Record<ContentTier, Omit<ModelConfig, 'model'>> = {
  premium: {
    maxTokens: 16000,
    temperature: 0.7,
  },
  standard: {
    maxTokens: 8000,
    temperature: 0.7,
  },
};

export function getModelForProvider(provider: string, tier: ContentTier = "standard"): string {
  switch (provider) {
    case "openai":
      return tier === "premium" ? "gpt-4o" : "gpt-4o-mini";
    case "anthropic":
      return "claude-sonnet-4-5";
    case "openrouter":
      return tier === "premium" ? "anthropic/claude-3.5-sonnet" : "anthropic/claude-3.5-sonnet";
    case "deepseek":
      return "deepseek-chat";
    case "replit-ai":
      return tier === "premium" ? "gpt-4o" : "gpt-4o-mini";
    default:
      return "gpt-4o-mini";
  }
}

export function getContentTier(contentType: string): ContentTier {
  const premiumTypes = ['hotel', 'attraction', 'itinerary'];
  return premiumTypes.includes(contentType.toLowerCase()) ? 'premium' : 'standard';
}

export function getModelConfig(tier: ContentTier, provider: string = "openai"): ModelConfig {
  const config = MODEL_CONFIGS[tier];
  return {
    model: getModelForProvider(provider, tier),
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  };
}

// ============================================================================
// Provider Status API
// ============================================================================

export interface ProviderStatus {
  name: string;
  model: string;
  status: "available" | "rate_limited" | "no_credits" | "not_configured";
  message?: string;
  retryAfter?: number; // seconds until available
}

function getProviderStatusValue(provider: string, isConfigured: boolean): ProviderStatus["status"] {
  if (!isConfigured) return "not_configured";
  if (hasNoCredits(provider)) return "no_credits";
  if (isRateLimited(provider)) return "rate_limited";
  return "available";
}

function getProviderMessage(provider: string, isConfigured: boolean): string {
  if (!isConfigured) return "No API key configured";
  if (hasNoCredits(provider)) return "Insufficient credits/balance";
  if (isRateLimited(provider)) return "Temporarily rate limited";
  return "Ready";
}

export function getProviderStatus(): ProviderStatus[] {
  const statuses: ProviderStatus[] = [];
  
  // Check Anthropic
  const hasAnthropic = !!(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);
  statuses.push({
    name: "Anthropic (Claude)",
    model: "claude-sonnet-4-5",
    status: getProviderStatusValue("anthropic", hasAnthropic),
    message: getProviderMessage("anthropic", hasAnthropic),
    retryAfter: getRetryAfter("anthropic"),
  });

  // Check OpenRouter
  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.New_open_routers || process.env.openrouterapi || process.env.travisite);
  statuses.push({
    name: "OpenRouter",
    model: "anthropic/claude-3.5-sonnet",
    status: getProviderStatusValue("openrouter", hasOpenRouter),
    message: getProviderMessage("openrouter", hasOpenRouter),
    retryAfter: getRetryAfter("openrouter"),
  });

  // Check DeepSeek
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  statuses.push({
    name: "DeepSeek",
    model: "deepseek-chat",
    status: getProviderStatusValue("deepseek", hasDeepSeek),
    message: getProviderMessage("deepseek", hasDeepSeek),
    retryAfter: getRetryAfter("deepseek"),
  });

  // Check Replit AI (modelfarm)
  const hasReplitAI = !!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  statuses.push({
    name: "Replit AI (Modelfarm)",
    model: "gpt-4o-mini",
    status: getProviderStatusValue("replit-ai", hasReplitAI),
    message: hasReplitAI && getProviderStatusValue("replit-ai", hasReplitAI) === "available" 
      ? "Free fallback provider" 
      : getProviderMessage("replit-ai", hasReplitAI),
    retryAfter: getRetryAfter("replit-ai"),
  });

  // Check OpenAI
  const hasOpenAI = !!getValidOpenAIKey();
  statuses.push({
    name: "OpenAI",
    model: "gpt-4o-mini",
    status: getProviderStatusValue("openai", hasOpenAI),
    message: getProviderMessage("openai", hasOpenAI),
    retryAfter: getRetryAfter("openai"),
  });

  return statuses;
}

function getRetryAfter(provider: string): number | undefined {
  // Check credit exhaustion first (longer timeout)
  const creditExpiry = creditExhaustedExpiry.get(provider);
  if (creditExpiry) {
    const remaining = creditExpiry - Date.now();
    if (remaining > 0) return Math.ceil(remaining / 1000);
  }
  
  // Then check rate limit expiry
  const expiry = failedProviderExpiry.get(provider);
  if (!expiry) return undefined;
  const remaining = expiry - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : undefined;
}
