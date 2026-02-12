/**
 * AI Provider Helpers
 *
 * Utilities for working with multiple AI providers (OpenAI, Gemini, OpenRouter).
 * Includes provider fallback logic, error classification, model selection,
 * and suggestion parsing.
 */

import type OpenAI from "openai";
import {
  getAllUnifiedProviders,
  markProviderFailed,
  markProviderSuccess,
  type AIProvider,
  type UnifiedAIProvider,
} from "../../ai/providers";
import { safeParseJson } from "./json-utils";
import { addSystemLog } from "./ai-logging";

/** Successful provider completion result */
export interface ProviderCompletionSuccess {
  article: Record<string, unknown>;
  provider: string;
  client: OpenAI;
  model: string;
}

/** Failed provider completion result (all providers exhausted) */
export interface ProviderCompletionFailure {
  error: string;
  lastError: Error;
  triedProviders: string[];
}

/**
 * Return the appropriate model name for a given provider and task type.
 *
 * @param provider - Provider identifier ("openai", "gemini", "openrouter")
 * @param task     - Task type: "chat" or "image"
 */
export function getModelForProvider(provider: string, task: "chat" | "image" = "chat"): string {
  if (task === "image") {
    if (provider === "openai") return "dall-e-3";
    return "dall-e-3";
  }
  switch (provider) {
    case "openai":
      return process.env.OPENAI_MODEL || "gpt-4o-mini";
    case "gemini":
      return "gemini-1.5-flash";
    case "openrouter":
      return "google/gemini-flash-1.5";
    default:
      return "gpt-4o-mini";
  }
}

/**
 * Classify a provider error into a category that informs retry logic.
 *
 * @param err - The caught error value (may not be an Error instance)
 * @returns "no_credits" | "rate_limited" | "other"
 */
export function classifyProviderError(err: unknown): "no_credits" | "rate_limited" | "other" {
  const error = err as { status?: number; code?: string; message?: string } | null;
  const isCredits =
    error?.status === 402 ||
    error?.message?.includes("credits") ||
    error?.message?.includes("Insufficient Balance") ||
    error?.message?.includes("insufficient_funds");
  if (isCredits) return "no_credits";

  const isRateLimit =
    error?.status === 429 ||
    error?.code === "insufficient_quota" ||
    error?.message?.includes("quota") ||
    error?.message?.includes("429");
  if (isRateLimit) return "rate_limited";

  return "other";
}

/**
 * Try each AI provider in order until one succeeds at generating a chat completion.
 * Returns a success or failure discriminated union.
 *
 * @param aiProviders - Ordered list of providers to try
 * @param messages    - Chat messages to send
 * @param maxTokens   - Maximum tokens for the completion
 */
export async function tryProvidersForCompletion(
  aiProviders: AIProvider[],
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens: number
): Promise<ProviderCompletionSuccess | ProviderCompletionFailure> {
  let lastError: Error | null = null;

  for (const aiProvider of aiProviders) {
    const { client: openai, provider, model } = aiProvider;
    try {
      addSystemLog("info", "ai", `Trying AI provider: ${provider} with model: ${model}`);
      const response = await openai.chat.completions.create({
        model,
        messages,
        ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
        max_tokens: maxTokens,
      });
      const article = safeParseJson(response.choices[0].message.content || "{}", {});
      markProviderSuccess(provider);
      addSystemLog("info", "ai", `Successfully generated with ${provider}`);
      return { article, provider, client: openai, model };
    } catch (providerError: unknown) {
      lastError = providerError instanceof Error ? providerError : new Error(String(providerError));
      const errorType = classifyProviderError(providerError);
      const errMsg = lastError.message || "Unknown error";
      const errStatus = (providerError as { status?: number })?.status;
      addSystemLog("warning", "ai", `Provider ${provider} failed: ${errMsg}`, {
        status: errStatus,
        isRateLimit: errorType === "rate_limited",
        isCredits: errorType === "no_credits",
      });
      if (errorType !== "other") {
        markProviderFailed(provider, errorType);
        addSystemLog(
          "info",
          "ai",
          `Marked ${provider} as ${errorType === "no_credits" ? "out of credits" : "temporarily unavailable"}, trying next provider...`
        );
      }
    }
  }

  return {
    error: lastError?.message || "All AI providers failed",
    lastError: lastError!,
    triedProviders: aiProviders.map(p => p.provider),
  };
}

/**
 * Get all unified AI providers sorted with Gemini preferred first.
 */
export function getSortedUnifiedProviders(): UnifiedAIProvider[] {
  const providers = getAllUnifiedProviders();
  return [...providers].sort((a, b) => {
    if (a.name === "gemini") return -1;
    if (b.name === "gemini") return 1;
    return 0;
  });
}

/**
 * Try unified providers in order to generate a field-level completion (e.g. SEO suggestions).
 *
 * @param sortedProviders - Providers sorted by preference
 * @param prompt          - The user prompt to send
 * @returns The raw content string from the first successful provider
 */
export async function tryUnifiedProvidersForField(
  sortedProviders: UnifiedAIProvider[],
  prompt: string
): Promise<string> {
  let content = "[]";
  let lastError: Error | null = null;

  for (const provider of sortedProviders) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          {
            role: "system",
            content:
              "You are an expert SEO content writer specializing in Dubai travel content. Generate high-quality, optimized suggestions. Always return valid JSON arrays of strings.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        maxTokens: 1024,
      });
      content = result.content;
      markProviderSuccess(provider.name);
      break;
    } catch (providerError: unknown) {
      lastError = providerError instanceof Error ? providerError : new Error(String(providerError));
      const errorType = classifyProviderError(providerError);
      markProviderFailed(provider.name, errorType === "no_credits" ? "no_credits" : "rate_limited");
    }
  }

  if (content === "[]" && lastError) {
    throw lastError;
  }
  return content;
}

/**
 * Parse AI-generated suggestion content into an array of strings.
 * Handles both JSON array responses and newline-separated text.
 *
 * @param content   - Raw response content
 * @param maxLength - Optional maximum length per suggestion (truncated with "...")
 */
export function parseSuggestions(content: string, maxLength?: number): string[] {
  let suggestions: string[];
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new TypeError("Not an array");
    suggestions = parsed;
  } catch {
    suggestions = content
      .split("\n")
      .filter(s => s.trim().length > 0)
      .slice(0, 3);
  }
  if (maxLength) {
    suggestions = suggestions.map(s =>
      s.length > maxLength ? s.substring(0, maxLength - 3) + "..." : s
    );
  }
  return suggestions;
}
