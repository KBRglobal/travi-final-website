/**
 * TRAVI Content Generation - AI Model Orchestrator
 *
 * Implements round-robin rotation between AI models:
 * - Gemini 2.0 Flash Exp (primary, free tier)
 * - GPT-4o Mini (secondary)
 * - Claude Haiku (tertiary)
 *
 * Handles rate limiting, fallback, and cost tracking.
 */

import {
  canMakeRequest,
  recordRequestStart,
  recordRequestResult,
  delay,
  getThrottleMultiplier,
  ServiceType,
} from "./budget-manager";
import { withRetry, isRateLimitError } from "./retry-handler";
import { getApiKey } from "./api-key-resolver";

// AI model configuration
export const AI_MODELS = {
  gemini: {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash Exp",
    service: "gemini" as ServiceType,
    priority: 1,
    costPerInputToken: 0, // Free tier
    costPerOutputToken: 0, // Free tier
    maxTokens: 8192,
    rateLimit: 1500, // Daily limit
  },
  gpt: {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    service: "gpt" as ServiceType,
    priority: 2,
    // Pricing: $0.15/1M input, $0.60/1M output
    costPerInputToken: 0.15 / 1_000_000, // Per token: $0.00000015
    costPerOutputToken: 0.6 / 1_000_000, // Per token: $0.0000006
    maxTokens: 16384,
    rateLimit: 10000,
  },
  claude: {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku",
    service: "claude" as ServiceType,
    priority: 3,
    // Pricing: $0.80/1M input, $4.00/1M output
    costPerInputToken: 0.8 / 1_000_000, // Per token: $0.0000008
    costPerOutputToken: 4.0 / 1_000_000, // Per token: $0.000004
    maxTokens: 4096,
    rateLimit: 5000,
  },
} as const;

export type AIModelKey = keyof typeof AI_MODELS;

// Round-robin state
let currentModelIndex = 0;
const modelOrder: AIModelKey[] = ["gemini", "gpt", "claude"];

// Usage tracking per model per day
const dailyUsage: Map<string, Map<AIModelKey, number>> = new Map();
let lastCleanupDate: string | null = null;

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// Clean up old daily usage entries to prevent memory growth
function cleanupOldUsage(): void {
  const today = getTodayKey();

  // Only cleanup once per day
  if (lastCleanupDate === today) return;

  // Remove all entries except today
  for (const dateKey of dailyUsage.keys()) {
    if (dateKey !== today) {
      dailyUsage.delete(dateKey);
    }
  }

  lastCleanupDate = today;
}

function getDailyUsage(model: AIModelKey): number {
  cleanupOldUsage();
  const today = getTodayKey();
  if (!dailyUsage.has(today)) {
    dailyUsage.set(today, new Map());
  }
  return dailyUsage.get(today)!.get(model) || 0;
}

function incrementDailyUsage(model: AIModelKey): void {
  cleanupOldUsage();
  const today = getTodayKey();
  if (!dailyUsage.has(today)) {
    dailyUsage.set(today, new Map());
  }
  const current = dailyUsage.get(today)!.get(model) || 0;
  dailyUsage.get(today)!.set(model, current + 1);
}

// Get next available model (round-robin with fallback)
export async function getNextAvailableModel(excludeModels: Set<AIModelKey> = new Set()): Promise<{
  model: (typeof AI_MODELS)[AIModelKey];
  modelKey: AIModelKey;
} | null> {
  const startIndex = currentModelIndex;

  // Try each model in rotation order
  for (let i = 0; i < modelOrder.length; i++) {
    const idx = (startIndex + i) % modelOrder.length;
    const modelKey = modelOrder[idx];
    const model = AI_MODELS[modelKey];

    // Skip models that have already failed
    if (excludeModels.has(modelKey)) {
      continue;
    }

    // Check rate limit
    const check = await canMakeRequest(model.service);
    if (!check.allowed) {
      continue;
    }

    // Check local daily usage
    const usage = getDailyUsage(modelKey);
    if (usage >= model.rateLimit) {
      continue;
    }

    // Found available model, advance rotation for next call
    currentModelIndex = (idx + 1) % modelOrder.length;
    return { model, modelKey };
  }

  return null;
}

// Get specific model if available
export async function getModel(modelKey: AIModelKey): Promise<{
  model: (typeof AI_MODELS)[AIModelKey];
  modelKey: AIModelKey;
} | null> {
  const model = AI_MODELS[modelKey];

  const check = await canMakeRequest(model.service);
  if (!check.allowed) {
    return null;
  }

  const usage = getDailyUsage(modelKey);
  if (usage >= model.rateLimit) {
    return null;
  }

  return { model, modelKey };
}

// Unified AI call with retry, rate limiting, and cost tracking
export interface AICallOptions {
  preferredModel?: AIModelKey;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  _failedModels?: AIModelKey[]; // Internal: track failed models for fallback
}

export interface AICallResult {
  content: string;
  modelUsed: string; // Full model ID for database enum
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
}

// Make AI call with automatic model selection and fallback
export async function callAI(
  prompt: string,
  options: AICallOptions = {}
): Promise<AICallResult | null> {
  const failedModels = new Set(options._failedModels || []);

  // Try preferred model first (if not already failed), then fall back to rotation
  let modelInfo =
    options.preferredModel && !failedModels.has(options.preferredModel)
      ? await getModel(options.preferredModel)
      : await getNextAvailableModel(failedModels);

  // If preferred model unavailable, try rotation
  if (!modelInfo && options.preferredModel) {
    modelInfo = await getNextAvailableModel(failedModels);
  }

  if (!modelInfo) {
    return null;
  }

  const { model, modelKey } = modelInfo;

  // Check rate limits and get throttling info BEFORE recording
  const requestCheck = await canMakeRequest(model.service);
  if (!requestCheck.allowed) {
    return null;
  }

  // Apply throttle delay if specified
  if (requestCheck.throttled && requestCheck.delayMs) {
    await delay(requestCheck.delayMs);
  }

  // Record request start AFTER delay
  await recordRequestStart(model.service);
  incrementDailyUsage(modelKey);

  // Make the actual AI call with retry
  const result = await withRetry(
    async () => {
      // Call appropriate AI provider
      return await executeAICall(modelKey, prompt, options);
    },
    {
      maxRetries: 2,
      onRetry: (attempt, error) => {},
    }
  );

  if (result.success && result.data) {
    // Record successful request
    await recordRequestResult(
      model.service,
      true,
      result.data.promptTokens,
      result.data.completionTokens,
      result.wasRateLimited
    );

    return {
      content: result.data.content,
      modelUsed: model.id, // Use full model ID for database enum
      promptTokens: result.data.promptTokens,
      completionTokens: result.data.completionTokens,
      estimatedCost:
        result.data.promptTokens * model.costPerInputToken +
        result.data.completionTokens * model.costPerOutputToken,
    };
  }

  // Record failed request
  await recordRequestResult(model.service, false, 0, 0, result.wasRateLimited);

  // Track failed models to avoid retrying them
  failedModels.add(modelKey);

  // If not all models tried, try fallback to next model
  if (failedModels.size < modelOrder.length) {
    return callAI(prompt, {
      ...options,
      preferredModel: undefined,
      _failedModels: Array.from(failedModels),
    });
  }

  return null;
}

// Execute AI call to specific provider
async function executeAICall(
  modelKey: AIModelKey,
  prompt: string,
  options: AICallOptions
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const model = AI_MODELS[modelKey];

  switch (modelKey) {
    case "gemini":
      return executeGeminiCall(prompt, options);
    case "gpt":
      return executeGPTCall(prompt, options);
    case "claude":
      return executeClaudeCall(prompt, options);
    default:
      throw new Error(`Unknown model: ${modelKey}`);
  }
}

// Gemini API call
async function executeGeminiCall(
  prompt: string,
  options: AICallOptions
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");

  // Get API key from database or env vars
  const apiKey = await getApiKey("gemini");
  if (!apiKey) {
    throw new Error("Gemini API key not configured - add it via Admin > TRAVI > API Keys");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
    },
  });

  const response = result.response;
  const text = response.text();

  // Estimate tokens (Gemini doesn't always return exact counts)
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(text.length / 4);

  return { content: text, promptTokens, completionTokens };
}

// GPT API call
async function executeGPTCall(
  prompt: string,
  options: AICallOptions
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const OpenAI = (await import("openai")).default;

  // Get API key from database or env vars
  const apiKey = await getApiKey("openai");
  if (!apiKey) {
    throw new Error("OpenAI API key not configured - add it via Admin > TRAVI > API Keys");
  }

  const openai = new OpenAI({ apiKey });

  const messages: any[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
  });

  const content = response.choices[0]?.message?.content || "";

  return {
    content,
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
  };
}

// Claude API call
async function executeClaudeCall(
  prompt: string,
  options: AICallOptions
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;

  // Get API key from database or env vars
  const apiKey = await getApiKey("anthropic");
  if (!apiKey) {
    throw new Error("Anthropic API key not configured - add it via Admin > TRAVI > API Keys");
  }

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: options.maxTokens ?? 4096,
    messages: [{ role: "user", content: prompt }],
    ...(options.systemPrompt && { system: options.systemPrompt }),
  });

  const content = response.content[0]?.type === "text" ? response.content[0].text : "";

  return {
    content,
    promptTokens: response.usage?.input_tokens || 0,
    completionTokens: response.usage?.output_tokens || 0,
  };
}

// Get model statistics
export function getModelStats(): {
  [key in AIModelKey]: { used: number; limit: number; available: boolean };
} {
  return {
    gemini: {
      used: getDailyUsage("gemini"),
      limit: AI_MODELS.gemini.rateLimit,
      available: getDailyUsage("gemini") < AI_MODELS.gemini.rateLimit,
    },
    gpt: {
      used: getDailyUsage("gpt"),
      limit: AI_MODELS.gpt.rateLimit,
      available: getDailyUsage("gpt") < AI_MODELS.gpt.rateLimit,
    },
    claude: {
      used: getDailyUsage("claude"),
      limit: AI_MODELS.claude.rateLimit,
      available: getDailyUsage("claude") < AI_MODELS.claude.rateLimit,
    },
  };
}

// Reset rotation (for testing)
export function resetRotation(): void {
  currentModelIndex = 0;
}

// Get AI service status for dashboard display
export function getAIStatus(): {
  available: boolean;
  models: { [key in AIModelKey]: { available: boolean; rateLimit: number; used: number } };
} {
  const stats = getModelStats();
  return {
    available: Object.values(stats).some(m => m.available),
    models: {
      gemini: {
        available: stats.gemini.available,
        rateLimit: stats.gemini.limit,
        used: stats.gemini.used,
      },
      gpt: { available: stats.gpt.available, rateLimit: stats.gpt.limit, used: stats.gpt.used },
      claude: {
        available: stats.claude.available,
        rateLimit: stats.claude.limit,
        used: stats.claude.used,
      },
    },
  };
}
