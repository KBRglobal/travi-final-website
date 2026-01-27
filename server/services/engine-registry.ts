import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export type ProviderType =
  | "anthropic"
  | "openai"
  | "gemini"
  | "groq"
  | "mistral"
  | "deepseek"
  | "openrouter"
  | "together"
  | "perplexity"
  | "kimi";

export interface EngineConfig {
  id: string;
  name: string;
  provider: ProviderType;
  model: string;
  apiKey: string;
  baseURL?: string;
  headers?: Record<string, string>;
  maxTokens: number;
  weight: number;
  isHealthy: boolean;
  errorCount: number;
  lastError?: string;
  lastUsed?: Date;
  successCount: number;
}

export interface EngineStats {
  total: number;
  healthy: number;
  byProvider: Record<ProviderType, number>;
}

class EngineRegistryClass {
  private engines: EngineConfig[] = [];
  private currentIndex = 0;
  private initialized = false;
  // Per-provider round-robin counters for true queue behavior
  private providerCounters: Map<string, number> = new Map();
  // Global counter for all engines (true round-robin across ALL engines)
  private globalQueueIndex = 0;
  // Provider-level suspension tracking (when quota exhausted, suspend entire provider)
  private suspendedProviders: Map<ProviderType, number> = new Map();
  // Provider priority order - prefer providers with available quota
  private providerPriority: ProviderType[] = [
    "anthropic",
    "openrouter",
    "gemini",
    "groq",
    "mistral",
    "deepseek",
    "perplexity",
    "together",
    "kimi",
    "openai",
  ];

  initialize(): void {
    if (this.initialized) return;

    this.engines = [];

    this.loadAnthropicEngines();
    this.loadHeliconeEngines();
    this.loadOpenAIEngines();
    this.loadOpenRouterEngines();
    this.loadGeminiEngines();
    this.loadGroqEngines();
    this.loadMistralEngines();
    this.loadDeepSeekEngines();
    this.loadTogetherEngines();
    this.loadPerplexityEngines();
    this.loadKimiEngines();

    this.initialized = true;

    const byProvider: Record<string, number> = {};
    this.engines.forEach(e => {
      byProvider[e.provider] = (byProvider[e.provider] || 0) + 1;
    });
    Object.entries(byProvider).forEach(([provider, count]) => {});
    this.engines.forEach((e, i) => {});
  }

  private loadAnthropicEngines(): void {
    const replitKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    const replitBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

    if (replitKey && replitBase) {
      this.engines.push({
        id: "anthropic-replit",
        name: "Anthropic Replit",
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        apiKey: replitKey,
        baseURL: replitBase,
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    const directKey = process.env.ANTHROPIC_API_KEY;
    if (directKey) {
      this.engines.push({
        id: "anthropic-direct",
        name: "Anthropic Direct",
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        apiKey: directKey,
        baseURL: "https://api.anthropic.com",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    for (let i = 1; i <= 20; i++) {
      const key = process.env[`ANTHROPIC_API_KEY_${i}`];
      if (key) {
        this.engines.push({
          id: `anthropic-direct-${i}`,
          name: `Anthropic Direct ${i}`,
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          apiKey: key,
          baseURL: "https://api.anthropic.com",
          maxTokens: 8192,
          weight: 1,
          isHealthy: true,
          errorCount: 0,
          successCount: 0,
        });
      }
    }
  }

  private loadHeliconeEngines(): void {
    for (let i = 1; i <= 20; i++) {
      const anthropicKey = process.env[`ANTHROPIC_API_KEY_${i}`];
      const heliconeKey = process.env[`HELICONE_API_KEY_${i}`];

      if (anthropicKey && heliconeKey) {
        this.engines.push({
          id: `anthropic-helicone-${i}`,
          name: `Anthropic via Helicone ${i}`,
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          apiKey: anthropicKey,
          baseURL: "https://anthropic.helicone.ai",
          headers: {
            "Helicone-Auth": `Bearer ${heliconeKey}`,
            "Helicone-Target-Url": "https://api.anthropic.com",
          },
          maxTokens: 8192,
          weight: 1,
          isHealthy: true,
          errorCount: 0,
          successCount: 0,
        });
      }
    }

    const defaultHelicone = process.env.HELICONE_API_KEY;
    const defaultAnthropic = process.env.ANTHROPIC_API_KEY;
    if (defaultHelicone && defaultAnthropic) {
      this.engines.push({
        id: "anthropic-helicone-default",
        name: "Anthropic via Helicone Default",
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        apiKey: defaultAnthropic,
        baseURL: "https://anthropic.helicone.ai",
        headers: {
          "Helicone-Auth": `Bearer ${defaultHelicone}`,
          "Helicone-Target-Url": "https://api.anthropic.com",
        },
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    // Nevo Helicone key - uses with any available Anthropic key
    const nevoHelicone = process.env.HELICONE_NEVO_KEY;
    if (nevoHelicone && defaultAnthropic) {
      this.engines.push({
        id: "anthropic-helicone-nevo",
        name: "Anthropic via Helicone Nevo",
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        apiKey: defaultAnthropic,
        baseURL: "https://anthropic.helicone.ai",
        headers: {
          "Helicone-Auth": `Bearer ${nevoHelicone}`,
          "Helicone-Target-Url": "https://api.anthropic.com",
        },
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private loadOpenAIEngines(): void {
    const replitKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const replitBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

    if (replitKey && replitBase) {
      this.engines.push({
        id: "openai-replit",
        name: "OpenAI Replit",
        provider: "openai",
        model: "gpt-4.1",
        apiKey: replitKey,
        baseURL: replitBase,
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    const directKey = process.env.OPENAI_API_KEY;
    if (directKey) {
      this.engines.push({
        id: "openai-direct",
        name: "OpenAI Direct",
        provider: "openai",
        model: "gpt-4o",
        apiKey: directKey,
        baseURL: "https://api.openai.com/v1",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    for (let i = 1; i <= 20; i++) {
      const key = process.env[`OPENAI_API_KEY_${i}`];
      if (key) {
        this.engines.push({
          id: `openai-direct-${i}`,
          name: `OpenAI Direct ${i}`,
          provider: "openai",
          model: "gpt-4o",
          apiKey: key,
          baseURL: "https://api.openai.com/v1",
          maxTokens: 8192,
          weight: 1,
          isHealthy: true,
          errorCount: 0,
          successCount: 0,
        });
      }
    }

    // Nevo OpenAI key
    const nevoOpenAI = process.env.OPENAI_NEVO_KEY;
    if (nevoOpenAI) {
      this.engines.push({
        id: "openai-nevo",
        name: "OpenAI Nevo",
        provider: "openai",
        model: "gpt-4o",
        apiKey: nevoOpenAI,
        baseURL: "https://api.openai.com/v1",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private loadOpenRouterEngines(): void {
    const defaultKey = process.env.OPENROUTER_API_KEY;
    if (defaultKey) {
      this.engines.push({
        id: "openrouter-default",
        name: "OpenRouter Default",
        provider: "openrouter",
        model: "anthropic/claude-sonnet-4",
        apiKey: defaultKey,
        baseURL: "https://openrouter.ai/api/v1",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    for (let i = 1; i <= 20; i++) {
      const key = process.env[`OPENROUTER_API_KEY_${i}`];
      if (key) {
        this.engines.push({
          id: `openrouter-${i}`,
          name: `OpenRouter ${i}`,
          provider: "openrouter",
          model: "anthropic/claude-sonnet-4",
          apiKey: key,
          baseURL: "https://openrouter.ai/api/v1",
          maxTokens: 8192,
          weight: 1,
          isHealthy: true,
          errorCount: 0,
          successCount: 0,
        });
      }
    }

    // Nevo OpenRouter key
    const nevoOpenRouter = process.env.OPENROUTER_NEVO_KEY;
    if (nevoOpenRouter) {
      this.engines.push({
        id: "openrouter-nevo",
        name: "OpenRouter Nevo",
        provider: "openrouter",
        model: "anthropic/claude-sonnet-4",
        apiKey: nevoOpenRouter,
        baseURL: "https://openrouter.ai/api/v1",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private loadGeminiEngines(): void {
    const replitKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

    if (replitKey) {
      this.engines.push({
        id: "gemini-replit",
        name: "Gemini Replit",
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKey: replitKey,
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    const directKey = process.env.GEMINI_API_KEY;
    if (directKey) {
      this.engines.push({
        id: "gemini-direct",
        name: "Gemini Direct",
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKey: directKey,
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    const lowercaseKey = process.env.gemini;
    if (lowercaseKey && lowercaseKey !== directKey) {
      this.engines.push({
        id: "gemini-alt",
        name: "Gemini Alt",
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKey: lowercaseKey,
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }

    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        this.engines.push({
          id: `gemini-${i}`,
          name: `Gemini ${i}`,
          provider: "gemini",
          model: "gemini-2.0-flash",
          apiKey: key,
          maxTokens: 8192,
          weight: 1,
          isHealthy: true,
          errorCount: 0,
          successCount: 0,
        });
      }
    }
  }

  private loadGroqEngines(): void {
    const key = process.env.GROQ_API_KEY;
    if (key) {
      this.engines.push({
        id: "groq",
        name: "Groq Llama",
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        apiKey: key,
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private loadMistralEngines(): void {
    const key = process.env.MISTRAL_API_KEY;
    if (key) {
      this.engines.push({
        id: "mistral",
        name: "Mistral Large",
        provider: "mistral",
        model: "mistral-large-latest",
        apiKey: key,
        baseURL: "https://api.mistral.ai/v1",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private loadDeepSeekEngines(): void {
    const key = process.env.DEEPSEEK_API_KEY;
    if (key) {
      this.engines.push({
        id: "deepseek",
        name: "DeepSeek",
        provider: "deepseek",
        model: "deepseek-chat",
        apiKey: key,
        baseURL: "https://api.deepseek.com",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private loadTogetherEngines(): void {
    const key = process.env.TOGETHER_API_KEY;
    if (key) {
      this.engines.push({
        id: "together",
        name: "Together AI",
        provider: "together",
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        apiKey: key,
        baseURL: "https://api.together.xyz/v1",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private loadPerplexityEngines(): void {
    const key = process.env.PERPLEXITY_API_KEY;
    if (key) {
      this.engines.push({
        id: "perplexity",
        name: "Perplexity AI",
        provider: "perplexity",
        model: "sonar", // Updated: old model name deprecated
        apiKey: key,
        baseURL: "https://api.perplexity.ai",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private loadKimiEngines(): void {
    // Kimi/Moonshot disabled - API key invalid (401 auth error)
    // To re-enable: obtain valid API key from https://platform.moonshot.cn
    const key = process.env.KIMI_API_KEY;
    if (key && false) {
      // Disabled until valid API key is provided
      this.engines.push({
        id: "kimi",
        name: "Kimi (Moonshot)",
        provider: "kimi",
        model: "moonshot-v1-128k",
        apiKey: key,
        baseURL: "https://api.moonshot.cn/v1",
        maxTokens: 8192,
        weight: 1,
        isHealthy: true,
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  getNextEngine(): EngineConfig | null {
    this.initialize();

    const healthyEngines = this.engines.filter(e => e.isHealthy);
    if (healthyEngines.length === 0) {
      this.engines.forEach(e => {
        e.isHealthy = true;
        e.errorCount = 0;
      });
      return this.engines[0] || null;
    }

    const engine = healthyEngines[this.currentIndex % healthyEngines.length];
    this.currentIndex++;
    engine.lastUsed = new Date();
    return engine;
  }

  reportSuccess(engineId: string): void {
    const engine = this.engines.find(e => e.id === engineId);
    if (engine) {
      engine.successCount++;
      engine.errorCount = Math.max(0, engine.errorCount - 1);
      engine.isHealthy = true;
    }
  }

  reportError(engineId: string, error: string): void {
    const engine = this.engines.find(e => e.id === engineId);
    if (engine) {
      engine.errorCount++;
      engine.lastError = error;

      const isQuotaError =
        error.includes("402") ||
        error.includes("insufficient") ||
        error.includes("Insufficient credits") ||
        error.includes("quota") ||
        error.includes("exceeded your current quota");

      const isFatalError =
        isQuotaError ||
        error.includes("401") ||
        error.includes("429") || // Rate limit
        error.includes("500") || // Server error
        error.includes("502") || // Bad gateway
        error.includes("503") || // Service unavailable
        error.includes("API key not valid") ||
        error.includes("INVALID_ARGUMENT") ||
        error.includes("invalid authentication") ||
        error.includes("timeout") ||
        error.includes("TIMEOUT");

      // STRICT: Any error = immediate suspension
      if (isFatalError || engine.errorCount >= 1) {
        engine.isHealthy = false;
      }

      // PROVIDER-LEVEL suspension for quota errors - suspend ALL engines of this provider for 10 minutes
      if (isQuotaError) {
        const suspendUntil = Date.now() + 10 * 60 * 1000; // 10 minutes
        this.suspendedProviders.set(engine.provider, suspendUntil);

        // Suspend all engines of this provider
        this.engines
          .filter(e => e.provider === engine.provider)
          .forEach(e => {
            e.isHealthy = false;
          });
      }

      // Timeout-based provider suspension - if 3+ engines from same provider timeout, suspend provider
      // Case-insensitive timeout detection
      const errorLower = error.toLowerCase();
      const isTimeout = errorLower.includes("timeout");
      if (isTimeout) {
        const timedOutEngines = this.engines.filter(
          e =>
            e.provider === engine.provider &&
            !e.isHealthy &&
            e.lastError?.toLowerCase().includes("timeout")
        );
        if (timedOutEngines.length >= 3) {
          const suspendUntil = Date.now() + 2 * 60 * 1000; // 2 minutes for timeout (shorter than quota)
          this.suspendedProviders.set(engine.provider, suspendUntil);

          this.engines
            .filter(e => e.provider === engine.provider)
            .forEach(e => {
              e.isHealthy = false;
            });
        }
      }
    }
  }

  // Check if a provider is currently suspended
  isProviderSuspended(provider: ProviderType): boolean {
    const suspendUntil = this.suspendedProviders.get(provider);
    if (!suspendUntil) return false;
    if (Date.now() > suspendUntil) {
      this.suspendedProviders.delete(provider);

      return false;
    }
    return true;
  }

  // Reset suspended engines periodically (call this every few minutes)
  resetSuspendedEngines(): number {
    let resetCount = 0;
    const now = Date.now();
    for (const engine of this.engines) {
      if (!engine.isHealthy && engine.lastUsed) {
        // Reset after 5 minutes of suspension
        const suspendedMs = now - engine.lastUsed.getTime();
        if (suspendedMs > 5 * 60 * 1000) {
          engine.isHealthy = true;
          engine.errorCount = 0;
          resetCount++;
        }
      }
    }
    return resetCount;
  }

  // Get all healthy engines for parallel execution
  getHealthyEngines(): EngineConfig[] {
    this.initialize();
    return this.engines.filter(e => e.isHealthy);
  }

  getEngineCount(): number {
    this.initialize();
    return this.engines.length;
  }

  getHealthyEngineCount(): number {
    this.initialize();
    return this.engines.filter(e => e.isHealthy).length;
  }

  getStats(): EngineStats {
    this.initialize();
    const byProvider: Record<ProviderType, number> = {
      anthropic: 0,
      openai: 0,
      openrouter: 0,
      gemini: 0,
      groq: 0,
      mistral: 0,
      deepseek: 0,
      together: 0,
      perplexity: 0,
      kimi: 0,
    };
    this.engines.forEach(e => byProvider[e.provider]++);

    return {
      total: this.engines.length,
      healthy: this.engines.filter(e => e.isHealthy).length,
      byProvider,
    };
  }

  getAllEngines(): EngineConfig[] {
    this.initialize();
    return [...this.engines];
  }

  /**
   * TRUE QUEUE SYSTEM: Get the next healthy engine from ALL engines using round-robin
   * Every call advances the queue - ensuring fair distribution across ALL API keys
   * PRIORITY: Prefers providers in priority order, skips suspended providers
   */
  getNextFromQueue(excludeIds: Set<string> = new Set()): EngineConfig | null {
    this.initialize();

    // First, try to get an engine from a non-suspended provider in priority order
    for (const provider of this.providerPriority) {
      if (this.isProviderSuspended(provider)) {
        continue; // Skip suspended providers entirely
      }

      const providerEngines = this.engines.filter(
        e => e.provider === provider && e.isHealthy && !excludeIds.has(e.id)
      );

      if (providerEngines.length > 0) {
        // Get per-provider counter
        let counter = this.providerCounters.get(provider) || 0;
        const engine = providerEngines[counter % providerEngines.length];
        this.providerCounters.set(provider, counter + 1);
        engine.lastUsed = new Date();
        return engine;
      }
    }

    // Fallback: try any healthy engine
    const healthyEngines = this.engines.filter(e => e.isHealthy && !excludeIds.has(e.id));
    if (healthyEngines.length === 0) {
      return null;
    }

    // True round-robin: advance counter and get next engine
    const startIndex = this.globalQueueIndex;
    for (let i = 0; i < healthyEngines.length; i++) {
      const index = (startIndex + i) % healthyEngines.length;
      const engine = healthyEngines[index];
      if (engine.isHealthy) {
        this.globalQueueIndex = (index + 1) % healthyEngines.length;
        engine.lastUsed = new Date();
        return engine;
      }
    }

    return null;
  }

  /**
   * Get next healthy engine matching a provider preference using per-provider round-robin
   * This ensures load is distributed across all keys of the same provider type
   */
  getNextByProviderPreference(
    preferredProviders: string[],
    excludeIds: Set<string> = new Set()
  ): EngineConfig | null {
    this.initialize();

    // Valid provider types for type-safe suspension lookup
    const validProviders: ProviderType[] = [
      "anthropic",
      "openai",
      "gemini",
      "groq",
      "mistral",
      "deepseek",
      "openrouter",
      "together",
      "perplexity",
      "kimi",
    ];

    // Collect all matching healthy engines across all preferred providers
    // CRITICAL: Skip providers that are suspended (quota exhausted or timing out)
    const matchingEngines: EngineConfig[] = [];
    for (const pref of preferredProviders) {
      // Extract actual provider name from preference - handle formats like "anthropic", "anthropic/helicone", etc.
      const prefLower = pref.toLowerCase().split("/")[0].split("-")[0];
      const providerName = validProviders.find(p => prefLower.includes(p) || p.includes(prefLower));

      // Skip entirely if this provider is suspended (type-safe check)
      if (providerName && this.isProviderSuspended(providerName)) {
        continue;
      }

      const engines = this.engines.filter(
        e => e.id.includes(pref) && e.isHealthy && !excludeIds.has(e.id)
      );
      matchingEngines.push(...engines);
    }

    if (matchingEngines.length === 0) {
      // Fall back to global queue if no preferred engines available
      return this.getNextFromQueue(excludeIds);
    }

    // Create a combined key for the preference set for per-preference round-robin
    const prefKey = preferredProviders.join(",");
    let counter = this.providerCounters.get(prefKey) || 0;

    // Round-robin across all matching engines
    const engine = matchingEngines[counter % matchingEngines.length];
    this.providerCounters.set(prefKey, counter + 1);
    engine.lastUsed = new Date();

    return engine;
  }

  /**
   * Get detailed stats for monitoring - shows usage per engine
   */
  getDetailedStats(): {
    engines: Array<{
      id: string;
      name: string;
      provider: string;
      healthy: boolean;
      successCount: number;
      errorCount: number;
      lastError?: string;
    }>;
    queueIndex: number;
  } {
    this.initialize();
    return {
      engines: this.engines.map(e => ({
        id: e.id,
        name: e.name,
        provider: e.provider,
        healthy: e.isHealthy,
        successCount: e.successCount,
        errorCount: e.errorCount,
        lastError: e.lastError,
      })),
      queueIndex: this.globalQueueIndex,
    };
  }
}

export const EngineRegistry = new EngineRegistryClass();

export async function generateWithEngine(
  engine: EngineConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  switch (engine.provider) {
    case "anthropic":
      return generateWithAnthropic(engine, systemPrompt, userPrompt);
    case "openai":
    case "openrouter":
    case "mistral":
    case "deepseek":
    case "together":
    case "perplexity":
    case "kimi":
      return generateWithOpenAI(engine, systemPrompt, userPrompt);
    case "gemini":
      return generateWithGemini(engine, systemPrompt, userPrompt);
    case "groq":
      return generateWithGroq(engine, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${engine.provider}`);
  }
}

async function generateWithAnthropic(
  engine: EngineConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = new Anthropic({
    apiKey: engine.apiKey,
    baseURL: engine.baseURL,
    defaultHeaders: engine.headers,
  });

  const response = await client.messages.create({
    model: engine.model,
    max_tokens: engine.maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find(block => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Anthropic");
  }
  return textBlock.text;
}

async function generateWithOpenAI(
  engine: EngineConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = new OpenAI({
    apiKey: engine.apiKey,
    baseURL: engine.baseURL,
  });

  // Add response_format for providers that support it (OpenAI, DeepSeek, Mistral)
  // Helps enforce JSON output format
  const supportsJsonFormat = ["openai", "deepseek", "mistral"].includes(engine.provider);

  const response = await client.chat.completions.create({
    model: engine.model,
    max_tokens: engine.maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...(supportsJsonFormat && { response_format: { type: "json_object" as const } }),
  });

  return response.choices[0]?.message?.content || "";
}

async function generateWithGemini(
  engine: EngineConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: engine.apiKey });

  const response = await ai.models.generateContent({
    model: engine.model,
    contents: `${systemPrompt}\n\n${userPrompt}`,
    config: {
      maxOutputTokens: engine.maxTokens,
    },
  });

  return response.text || "";
}

async function generateWithGroq(
  engine: EngineConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = new Groq({ apiKey: engine.apiKey });

  const response = await client.chat.completions.create({
    model: engine.model,
    max_tokens: engine.maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content || "";
}
