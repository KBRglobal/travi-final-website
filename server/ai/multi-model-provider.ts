/**
 * Multi-Model AI Provider with Automatic Fallback Chain
 *
 * Priority: Anthropic (Claude) -> OpenAI (GPT-4) -> Google (Gemini)
 *
 * Features:
 * - Automatic fallback on rate limits (429) or errors
 * - Latency tracking
 * - Token usage tracking (when available)
 * - Provider availability checking
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from "../lib/logger";

const logger = createLogger("multi-model-provider");

// ============================================================================
// Types
// ============================================================================

export interface AIProviderConfig {
  name: string;
  available: boolean;
  priority: number;
  model?: string;
  reason?: string;
}

export interface GenerationResult {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface ProviderError extends Error {
  status?: number;
  code?: string;
}

// ============================================================================
// Provider Rate Limit Tracking
// ============================================================================

const rateLimitedProviders = new Map<string, number>();
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function isRateLimited(provider: string): boolean {
  const expiry = rateLimitedProviders.get(provider);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    rateLimitedProviders.delete(provider);
    return false;
  }
  return true;
}

function markRateLimited(provider: string): void {
  rateLimitedProviders.set(provider, Date.now() + RATE_LIMIT_COOLDOWN_MS);
  logger.warn({ provider }, `Provider ${provider} marked as rate limited for 5 minutes`);
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const providerError = error as ProviderError;
    if (providerError.status === 429) return true;
    if (providerError.code === "rate_limit_exceeded") return true;
    if (error.message.toLowerCase().includes("rate limit")) return true;
    if (error.message.toLowerCase().includes("quota exceeded")) return true;
  }
  return false;
}

// ============================================================================
// Rate Limit Tracking for Multi-Client Pools
// ============================================================================

// Track rate limited client indices per provider
const rateLimitedClients = new Map<string, Map<number, number>>();

function isClientRateLimited(provider: string, clientIndex: number): boolean {
  const providerMap = rateLimitedClients.get(provider);
  if (!providerMap) return false;
  const expiry = providerMap.get(clientIndex);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    providerMap.delete(clientIndex);
    return false;
  }
  return true;
}

function markClientRateLimited(provider: string, clientIndex: number): void {
  if (!rateLimitedClients.has(provider)) {
    rateLimitedClients.set(provider, new Map());
  }
  rateLimitedClients.get(provider)!.set(clientIndex, Date.now() + RATE_LIMIT_COOLDOWN_MS);
  logger.warn(
    { provider, clientIndex },
    `Client ${clientIndex + 1} for ${provider} rate limited for 5 minutes`
  );
}

// ============================================================================
// Multi-Model Provider Class
// ============================================================================

export class MultiModelProvider {
  private anthropicClients: Anthropic[] = [];
  private heliconeClients: OpenAI[] = [];
  private openaiClient: OpenAI | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;
  private openrouterClient: OpenAI | null = null;
  private deepseekClient: OpenAI | null = null;
  private perplexityClient: OpenAI | null = null;
  private groqClient: OpenAI | null = null;
  private mistralClient: OpenAI | null = null;
  private edenClient: { apiKey: string } | null = null;
  private providers: AIProviderConfig[] = [];
  private anthropicKeyIndex: number = 0;
  private heliconeKeyIndex: number = 0;

  constructor() {
    this.initializeProviders();
  }

  // Get next available Anthropic client (round-robin)
  private getNextAnthropicClient(): Anthropic | null {
    if (this.anthropicClients.length === 0) return null;
    const client = this.anthropicClients[this.anthropicKeyIndex];
    this.anthropicKeyIndex = (this.anthropicKeyIndex + 1) % this.anthropicClients.length;
    return client;
  }

  // Get next available Helicone client (round-robin)
  private getNextHeliconeClient(): OpenAI | null {
    if (this.heliconeClients.length === 0) return null;
    const client = this.heliconeClients[this.heliconeKeyIndex];
    this.heliconeKeyIndex = (this.heliconeKeyIndex + 1) % this.heliconeClients.length;
    return client;
  }

  private initializeProviders(): void {
    this.providers = [];

    // Priority 1: Anthropic (Claude) - Support for 6 parallel API keys
    const anthropicKeys = this.getAllAnthropicKeys();
    const anthropicBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    if (anthropicKeys.length > 0) {
      try {
        this.anthropicClients = anthropicKeys.map(
          key =>
            new Anthropic({
              apiKey: key,
              baseURL: anthropicBaseUrl || undefined,
            })
        );
        this.providers.push({
          name: "anthropic",
          available: true,
          priority: 1,
          model: "claude-sonnet-4-5",
        });
        logger.info(
          { keyCount: anthropicKeys.length },
          `Anthropic provider initialized with ${anthropicKeys.length} parallel API keys`
        );
      } catch (error) {
        logger.warn({ error: String(error) }, "Failed to initialize Anthropic provider");
      }
    } else {
      this.providers.push({
        name: "anthropic",
        available: false,
        priority: 1,
        reason: "No API key configured",
      });
    }

    // Priority 2: OpenAI (GPT-4)
    const openaiKey = this.getOpenAIKey();
    const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    if (openaiKey) {
      try {
        this.openaiClient = new OpenAI({
          apiKey: openaiKey,
          baseURL: openaiBaseUrl || undefined,
        });
        this.providers.push({
          name: "openai",
          available: true,
          priority: 2,
          model: "gpt-4o",
        });
        logger.info("OpenAI provider initialized successfully");
      } catch (error) {
        logger.warn({ error: String(error) }, "Failed to initialize OpenAI provider");
      }
    } else {
      this.providers.push({
        name: "openai",
        available: false,
        priority: 2,
        reason: "No API key configured",
      });
    }

    // Priority 3: Google Gemini
    const geminiKey = this.getGeminiKey();
    if (geminiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(geminiKey);
        this.providers.push({
          name: "gemini",
          available: true,
          priority: 3,
          model: "gemini-1.5-pro",
        });
        logger.info("Gemini provider initialized successfully");
      } catch (error) {
        logger.warn({ error: String(error) }, "Failed to initialize Gemini provider");
      }
    } else {
      this.providers.push({
        name: "gemini",
        available: false,
        priority: 3,
        reason: "No API key configured",
      });
    }

    // Priority 4: OpenRouter
    const openrouterKey = this.getOpenRouterKey();
    if (openrouterKey) {
      try {
        this.openrouterClient = new OpenAI({
          apiKey: openrouterKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": process.env.APP_URL || "https://travi.world",
            "X-Title": "Travi CMS",
          },
        });
        this.providers.push({
          name: "openrouter",
          available: true,
          priority: 4,
          model: "anthropic/claude-3.5-sonnet",
        });
        logger.info("OpenRouter provider initialized successfully");
      } catch (error) {
        logger.warn({ error: String(error) }, "Failed to initialize OpenRouter provider");
      }
    } else {
      this.providers.push({
        name: "openrouter",
        available: false,
        priority: 4,
        reason: "No API key configured",
      });
    }

    // Priority 5: DeepSeek - disabled due to connection issues
    this.providers.push({
      name: "deepseek",
      available: false,
      priority: 5,
      reason: "Disabled - connection issues",
    });

    // Priority 6: Perplexity
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    if (perplexityKey) {
      try {
        this.perplexityClient = new OpenAI({
          apiKey: perplexityKey,
          baseURL: "https://api.perplexity.ai",
        });
        this.providers.push({
          name: "perplexity",
          available: true,
          priority: 6,
          model: "sonar",
        });
        logger.info("Perplexity provider initialized successfully");
      } catch (error) {
        logger.warn({ error: String(error) }, "Failed to initialize Perplexity provider");
      }
    } else {
      this.providers.push({
        name: "perplexity",
        available: false,
        priority: 6,
        reason: "No API key configured",
      });
    }

    // Priority 7: Groq (DISABLED - aggressive rate limiting causes mass failures)
    this.providers.push({
      name: "groq",
      available: false,
      priority: 7,
      reason: "Disabled - aggressive rate limiting",
    });

    // Priority 8: Mistral (high quality, competitive pricing)
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (mistralKey) {
      try {
        this.mistralClient = new OpenAI({
          apiKey: mistralKey,
          baseURL: "https://api.mistral.ai/v1",
        });
        this.providers.push({
          name: "mistral",
          available: true,
          priority: 8,
          model: "mistral-large-latest",
        });
        logger.info("Mistral provider initialized successfully");
      } catch (error) {
        logger.warn({ error: String(error) }, "Failed to initialize Mistral provider");
      }
    } else {
      this.providers.push({
        name: "mistral",
        available: false,
        priority: 8,
        reason: "No API key configured",
      });
    }

    // Priority 9: Helicone AI Gateway (0% markup, 100+ models) - Support for 6 parallel API keys
    const heliconeKeys = this.getAllHeliconeKeys();
    if (heliconeKeys.length > 0) {
      try {
        this.heliconeClients = heliconeKeys.map(
          key =>
            new OpenAI({
              apiKey: key,
              baseURL: "https://ai-gateway.helicone.ai",
            })
        );
        this.providers.push({
          name: "helicone",
          available: true,
          priority: 9,
          model: "gpt-4o-mini",
        });
        logger.info(
          { keyCount: heliconeKeys.length },
          `Helicone provider initialized with ${heliconeKeys.length} parallel API keys`
        );
      } catch (error) {
        logger.warn({ error: String(error) }, "Failed to initialize Helicone provider");
      }
    } else {
      this.providers.push({
        name: "helicone",
        available: false,
        priority: 9,
        reason: "No API key configured",
      });
    }

    // Priority 10: Eden AI (unified API for 100+ models)
    const edenKey = process.env.EDEN_API_KEY;
    if (edenKey) {
      try {
        this.edenClient = { apiKey: edenKey };
        this.providers.push({
          name: "eden",
          available: true,
          priority: 10,
          model: "openai/gpt-4o",
        });
        logger.info("Eden AI provider initialized successfully");
      } catch (error) {
        logger.warn({ error: String(error) }, "Failed to initialize Eden AI provider");
      }
    } else {
      this.providers.push({
        name: "eden",
        available: false,
        priority: 10,
        reason: "No API key configured",
      });
    }

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);

    const availableCount = this.providers.filter(p => p.available).length;
    logger.info(
      { availableProviders: availableCount, totalProviders: this.providers.length },
      `Multi-model provider initialized with ${availableCount} available providers`
    );
  }

  // Get all available Anthropic API keys for parallel processing (up to 6)
  private getAllAnthropicKeys(): string[] {
    const keys: string[] = [];

    // Check numbered keys first (ANTHROPIC_API_KEY_1 through ANTHROPIC_API_KEY_6)
    for (let i = 1; i <= 6; i++) {
      const key = process.env[`ANTHROPIC_API_KEY_${i}`];
      if (key && key.length > 10) {
        keys.push(key);
      }
    }

    // If no numbered keys, fall back to standard keys
    if (keys.length === 0) {
      const integrationKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
      if (integrationKey && integrationKey.length > 10) {
        keys.push(integrationKey);
      }
      const standardKey = process.env.ANTHROPIC_API_KEY;
      if (standardKey && standardKey.length > 10 && !keys.includes(standardKey)) {
        keys.push(standardKey);
      }
    }

    return keys;
  }

  // Get all available Helicone API keys for parallel processing (up to 6)
  private getAllHeliconeKeys(): string[] {
    const keys: string[] = [];

    // Check numbered keys first (HELICONE_API_KEY_1 through HELICONE_API_KEY_6)
    for (let i = 1; i <= 6; i++) {
      const key = process.env[`HELICONE_API_KEY_${i}`];
      if (key && key.length > 10) {
        keys.push(key);
      }
    }

    // If no numbered keys, fall back to standard key
    if (keys.length === 0) {
      const standardKey = process.env.HELICONE_API_KEY;
      if (standardKey && standardKey.length > 10) {
        keys.push(standardKey);
      }
    }

    return keys;
  }

  private getAnthropicKey(): string | null {
    const keys = this.getAllAnthropicKeys();
    return keys.length > 0 ? keys[0] : null;
  }

  private getOpenAIKey(): string | null {
    const integrationsKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (integrationsKey && !integrationsKey.includes("DUMMY")) {
      return integrationsKey;
    }
    const directKey = process.env.OPENAI_API_KEY;
    if (directKey && !directKey.includes("DUMMY")) {
      return directKey;
    }
    return null;
  }

  private getGeminiKey(): string | null {
    return (
      process.env.AI_INTEGRATIONS_GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.gemini ||
      null
    );
  }

  private getOpenRouterKey(): string | null {
    return (
      process.env.OPENROUTER_API_KEY ||
      process.env.New_open_routers ||
      process.env.openrouterapi ||
      process.env.travisite ||
      null
    );
  }

  /**
   * Generate content using the fallback chain
   * Tries Anthropic first, then OpenAI, then Gemini
   */
  async generate(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const { maxTokens = 8192, temperature = 0.7, systemPrompt } = options;

    const availableProviders = this.providers.filter(p => p.available && !isRateLimited(p.name));

    if (availableProviders.length === 0) {
      throw new Error(
        "No AI providers available. All providers are either not configured or rate limited. " +
          "Please configure at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY"
      );
    }

    const errors: Array<{ provider: string; error: string }> = [];

    for (const provider of availableProviders) {
      try {
        const result = await this.tryProvider(provider.name, prompt, {
          maxTokens,
          temperature,
          systemPrompt,
        });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ provider: provider.name, error: errorMessage });

        if (isRateLimitError(error)) {
          markRateLimited(provider.name);
        }

        logger.warn(
          { provider: provider.name, error: errorMessage },
          `Provider ${provider.name} failed, trying next provider...`
        );
        continue;
      }
    }

    // All providers failed
    const errorDetails = errors.map(e => `${e.provider}: ${e.error}`).join("; ");
    throw new Error(`All AI providers failed. Errors: ${errorDetails}`);
  }

  /**
   * Try a specific provider
   */
  private async tryProvider(
    name: string,
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string }
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    switch (name) {
      case "anthropic":
        return this.generateWithAnthropic(prompt, options, startTime);
      case "openai":
        return this.generateWithOpenAI(prompt, options, startTime);
      case "gemini":
        return this.generateWithGemini(prompt, options, startTime);
      case "openrouter":
        return this.generateWithOpenRouter(prompt, options, startTime);
      case "deepseek":
        return this.generateWithDeepSeek(prompt, options, startTime);
      case "perplexity":
        return this.generateWithPerplexity(prompt, options, startTime);
      case "groq":
        return this.generateWithGroq(prompt, options, startTime);
      case "mistral":
        return this.generateWithMistral(prompt, options, startTime);
      case "helicone":
        return this.generateWithHelicone(prompt, options, startTime);
      case "eden":
        return this.generateWithEden(prompt, options, startTime);
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }

  private async generateWithAnthropic(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    const client = this.getNextAnthropicClient();
    if (!client) {
      throw new Error("Anthropic client not initialized");
    }

    const model = "claude-sonnet-4-5";
    const clientCount = this.anthropicClients.length;
    logger.debug(
      { model, promptLength: prompt.length, clientCount },
      "Generating with Anthropic (round-robin)"
    );

    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens,
      system: options.systemPrompt || undefined,
      messages: [{ role: "user", content: prompt }],
    });

    const textParts: string[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        textParts.push(block.text);
      }
    }
    const content = textParts.join("\n");

    if (!content) {
      throw new Error("Empty response from Anthropic");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    logger.info(
      { provider: "anthropic", model, latencyMs, tokensUsed },
      "Successfully generated content with Anthropic"
    );

    return {
      content,
      provider: "anthropic",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithOpenAI(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    if (!this.openaiClient) {
      throw new Error("OpenAI client not initialized");
    }

    const model = "gpt-4o";
    logger.debug({ model, promptLength: prompt.length }, "Generating with OpenAI");

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.openaiClient.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens;

    logger.info(
      { provider: "openai", model, latencyMs, tokensUsed },
      "Successfully generated content with OpenAI"
    );

    return {
      content,
      provider: "openai",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithGemini(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    if (!this.geminiClient) {
      throw new Error("Gemini client not initialized");
    }

    const model = "gemini-1.5-pro";
    logger.debug({ model, promptLength: prompt.length }, "Generating with Gemini");

    const geminiModel = this.geminiClient.getGenerativeModel({
      model,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
      systemInstruction: options.systemPrompt || undefined,
    });

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error("Empty response from Gemini");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usageMetadata?.totalTokenCount;

    logger.info(
      { provider: "gemini", model, latencyMs, tokensUsed },
      "Successfully generated content with Gemini"
    );

    return {
      content,
      provider: "gemini",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithOpenRouter(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    if (!this.openrouterClient) {
      throw new Error("OpenRouter client not initialized");
    }

    const model = "anthropic/claude-3.5-sonnet";
    logger.debug({ model, promptLength: prompt.length }, "Generating with OpenRouter");

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.openrouterClient.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenRouter");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens;

    logger.info(
      { provider: "openrouter", model, latencyMs, tokensUsed },
      "Successfully generated content with OpenRouter"
    );

    return {
      content,
      provider: "openrouter",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithDeepSeek(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    if (!this.deepseekClient) {
      throw new Error("DeepSeek client not initialized");
    }

    const model = "deepseek-chat";
    logger.debug({ model, promptLength: prompt.length }, "Generating with DeepSeek");

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    // DeepSeek has max_tokens limit of 8192
    const maxTokens = Math.min(options.maxTokens, 8192);
    const response = await this.deepseekClient.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: options.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from DeepSeek");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens;

    logger.info(
      { provider: "deepseek", model, latencyMs, tokensUsed },
      "Successfully generated content with DeepSeek"
    );

    return {
      content,
      provider: "deepseek",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithPerplexity(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    if (!this.perplexityClient) {
      throw new Error("Perplexity client not initialized");
    }

    const model = "sonar";
    logger.debug({ model, promptLength: prompt.length }, "Generating with Perplexity");

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.perplexityClient.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Perplexity");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens;

    logger.info(
      { provider: "perplexity", model, latencyMs, tokensUsed },
      "Successfully generated content with Perplexity"
    );

    return {
      content,
      provider: "perplexity",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithGroq(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    if (!this.groqClient) {
      throw new Error("Groq client not initialized");
    }

    const model = "llama-3.3-70b-versatile";
    logger.debug({ model, promptLength: prompt.length }, "Generating with Groq");

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.groqClient.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens;

    logger.info(
      { provider: "groq", model, latencyMs, tokensUsed },
      "Successfully generated content with Groq"
    );

    return {
      content,
      provider: "groq",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithMistral(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    if (!this.mistralClient) {
      throw new Error("Mistral client not initialized");
    }

    const model = "mistral-large-latest";
    logger.debug({ model, promptLength: prompt.length }, "Generating with Mistral");

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.mistralClient.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Mistral");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens;

    logger.info(
      { provider: "mistral", model, latencyMs, tokensUsed },
      "Successfully generated content with Mistral"
    );

    return {
      content,
      provider: "mistral",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithHelicone(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    const client = this.getNextHeliconeClient();
    if (!client) {
      throw new Error("Helicone client not initialized");
    }

    const model = "gpt-4o-mini";
    const clientCount = this.heliconeClients.length;
    logger.debug(
      { model, promptLength: prompt.length, clientCount },
      "Generating with Helicone (round-robin)"
    );

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Helicone");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens;

    logger.info(
      { provider: "helicone", model, latencyMs, tokensUsed },
      "Successfully generated content with Helicone"
    );

    return {
      content,
      provider: "helicone",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  private async generateWithEden(
    prompt: string,
    options: { maxTokens: number; temperature: number; systemPrompt?: string },
    startTime: number
  ): Promise<GenerationResult> {
    if (!this.edenClient) {
      throw new Error("Eden AI client not initialized");
    }

    const model = "openai/gpt-4o-mini";
    logger.debug({ model, promptLength: prompt.length }, "Generating with Eden AI");

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.edenai.run/v2/llm/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.edenClient.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Eden AI error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from Eden AI");
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens;

    logger.info(
      { provider: "eden", model, latencyMs, tokensUsed },
      "Successfully generated content with Eden AI"
    );

    return {
      content,
      provider: "eden",
      model,
      tokensUsed,
      latencyMs,
    };
  }

  /**
   * Generate content using a specific provider (no fallback)
   * Used for parallel processing where each provider handles a specific workload
   */
  async generateWithSpecificProvider(
    providerName:
      | "anthropic"
      | "openai"
      | "gemini"
      | "openrouter"
      | "deepseek"
      | "perplexity"
      | "groq"
      | "mistral"
      | "helicone"
      | "eden",
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const { maxTokens = 8192, temperature = 0.7, systemPrompt } = options;

    const provider = this.providers.find(p => p.name === providerName);
    if (!provider || !provider.available) {
      throw new Error(`Provider ${providerName} is not available`);
    }

    if (isRateLimited(providerName)) {
      throw new Error(`Provider ${providerName} is currently rate limited`);
    }

    try {
      return await this.tryProvider(providerName, prompt, {
        maxTokens,
        temperature,
        systemPrompt,
      });
    } catch (error) {
      if (isRateLimitError(error)) {
        markRateLimited(providerName);
      }
      throw error;
    }
  }

  /**
   * Check availability of all providers
   */
  checkAvailability(): AIProviderConfig[] {
    // Refresh provider states with rate limit status
    return this.providers.map(provider => ({
      ...provider,
      available: provider.available && !isRateLimited(provider.name),
      reason: isRateLimited(provider.name)
        ? "Rate limited (will retry automatically)"
        : provider.reason,
    }));
  }

  /**
   * Get the next available provider
   */
  getNextAvailableProvider(): AIProviderConfig | null {
    const available = this.providers.find(p => p.available && !isRateLimited(p.name));
    return available || null;
  }

  /**
   * Force refresh of provider initialization
   */
  refresh(): void {
    (this as any).anthropicClients = [];
    (this as any).openaiClients = [];
    (this as any).geminiClient = null;
    this.providers = [];
    this.initializeProviders();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let multiModelProviderInstance: MultiModelProvider | null = null;

export function getMultiModelProvider(): MultiModelProvider {
  if (!multiModelProviderInstance) {
    multiModelProviderInstance = new MultiModelProvider();
  }
  return multiModelProviderInstance;
}

/**
 * Convenience function for quick content generation
 */
export async function generateWithFallback(
  prompt: string,
  options?: GenerationOptions
): Promise<GenerationResult> {
  const provider = getMultiModelProvider();
  return await provider.generate(prompt, options);
}
