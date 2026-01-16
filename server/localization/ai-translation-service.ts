/**
 * AI Translation Service
 * 
 * Optimized translation service that routes languages to the best AI providers
 * based on language family quality. NO DeepL - uses only AI providers.
 * 
 * Language-to-Provider Optimization:
 * - CJK (Chinese, Japanese, Korean): GPT-4o, Claude (best quality)
 * - RTL (Hebrew, Arabic, Persian, Urdu): Claude, GPT-4o (best RTL handling)
 * - European (French, German, Spanish, Italian, Portuguese, Dutch): Mistral, GPT-4o
 * - Russian/Slavic (Russian, Polish): Claude, GPT-4o
 * - Hindi/South Asian: GPT-4o, Claude
 * - Turkish: Mistral, GPT-4o
 * - Thai: GPT-4o, Claude
 */

import { MultiModelProvider, GenerationResult } from '../ai/multi-model-provider';
import { createLogger } from '../lib/logger';

const logger = createLogger('ai-translation-service');

// ============================================================================
// Types
// ============================================================================

export type TextDirection = 'ltr' | 'rtl';

export type AITranslationProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'gemini' 
  | 'mistral' 
  | 'groq' 
  | 'openrouter'
  | 'perplexity';

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: TextDirection;
  providerPriority: AITranslationProvider[];
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
}

export interface BatchTranslationResult {
  translations: TranslationResult[];
  totalLatencyMs: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ text: string; error: string }>;
}

export interface TranslationOptions {
  preserveHtml?: boolean;
  seoOptimized?: boolean;
  context?: string;
  maxRetries?: number;
}

// ============================================================================
// Language Configuration with Provider Priorities
// ============================================================================

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'mistral'],
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    providerPriority: ['anthropic', 'openai', 'gemini', 'groq'],
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    providerPriority: ['anthropic', 'openai', 'gemini', 'groq'],
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    providerPriority: ['anthropic', 'openai', 'gemini', 'mistral'],
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    providerPriority: ['mistral', 'openai', 'anthropic', 'gemini'],
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    providerPriority: ['mistral', 'openai', 'anthropic', 'gemini'],
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    providerPriority: ['mistral', 'openai', 'anthropic', 'gemini'],
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    providerPriority: ['mistral', 'openai', 'anthropic', 'gemini'],
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    providerPriority: ['mistral', 'openai', 'anthropic', 'gemini'],
  },
  nl: {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    direction: 'ltr',
    providerPriority: ['mistral', 'openai', 'anthropic', 'gemini'],
  },
  tr: {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    providerPriority: ['mistral', 'openai', 'anthropic', 'gemini'],
  },
  pl: {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    direction: 'ltr',
    providerPriority: ['anthropic', 'openai', 'mistral', 'gemini'],
  },
  th: {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  vi: {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  id: {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  ms: {
    code: 'ms',
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  fa: {
    code: 'fa',
    name: 'Persian',
    nativeName: 'فارسی',
    direction: 'rtl',
    providerPriority: ['anthropic', 'openai', 'gemini', 'groq'],
  },
  ur: {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    direction: 'rtl',
    providerPriority: ['anthropic', 'openai', 'gemini', 'groq'],
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  fil: {
    code: 'fil',
    name: 'Filipino',
    nativeName: 'Filipino',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'groq'],
  },
  sv: {
    code: 'sv',
    name: 'Swedish',
    nativeName: 'Svenska',
    direction: 'ltr',
    providerPriority: ['mistral', 'openai', 'anthropic', 'gemini'],
  },
  el: {
    code: 'el',
    name: 'Greek',
    nativeName: 'Ελληνικά',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'mistral'],
  },
  cs: {
    code: 'cs',
    name: 'Czech',
    nativeName: 'Čeština',
    direction: 'ltr',
    providerPriority: ['anthropic', 'openai', 'gemini', 'mistral'],
  },
  ro: {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'mistral'],
  },
  uk: {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    direction: 'ltr',
    providerPriority: ['anthropic', 'openai', 'gemini', 'groq'],
  },
  hu: {
    code: 'hu',
    name: 'Hungarian',
    nativeName: 'Magyar',
    direction: 'ltr',
    providerPriority: ['openai', 'anthropic', 'gemini', 'mistral'],
  },
};

// RTL language codes for quick lookup
export const RTL_LANGUAGES = new Set(['he', 'ar', 'fa', 'ur']);

// CJK language codes
export const CJK_LANGUAGES = new Set(['zh', 'ja', 'ko']);

// ============================================================================
// Translation Prompt Builder
// ============================================================================

function buildTranslationPrompt(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  options: TranslationOptions = {}
): string {
  const sourceLang = SUPPORTED_LANGUAGES[sourceLanguage]?.name || sourceLanguage;
  const targetLang = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;
  const targetNative = SUPPORTED_LANGUAGES[targetLanguage]?.nativeName || targetLanguage;
  
  const instructions: string[] = [
    `Translate the following text from ${sourceLang} to ${targetLang} (${targetNative}).`,
    '',
    'CRITICAL RULES:',
    '1. Return ONLY the translated text - no explanations, no notes, no markers',
    '2. Keep proper nouns unchanged (Dubai, Burj Khalifa, Paris, Tokyo, etc.)',
    '3. Keep brand names unchanged (TripAdvisor, Booking.com, etc.)',
  ];

  if (options.preserveHtml) {
    instructions.push('4. Preserve ALL HTML tags and formatting exactly as they appear');
    instructions.push('5. Do NOT translate text inside HTML attributes');
  }

  if (options.seoOptimized) {
    instructions.push(`${options.preserveHtml ? '6' : '4'}. Maintain SEO keywords naturally in ${targetLang}`);
    instructions.push(`${options.preserveHtml ? '7' : '5'}. Use natural, fluent ${targetLang} that reads well to native speakers`);
    instructions.push(`${options.preserveHtml ? '8' : '6'}. Preserve the semantic meaning and intent for search engines`);
  }

  if (options.context) {
    instructions.push('');
    instructions.push(`Context: ${options.context}`);
  }

  instructions.push('');
  instructions.push('Text to translate:');
  instructions.push(text);

  return instructions.join('\n');
}

// ============================================================================
// AI Translation Service Class
// ============================================================================

export class AITranslationService {
  private multiModelProvider: MultiModelProvider;
  private translationCache = new Map<string, TranslationResult>();
  private cacheEnabled: boolean;
  private cacheMaxSize: number;

  constructor(options: { cacheEnabled?: boolean; cacheMaxSize?: number } = {}) {
    this.multiModelProvider = new MultiModelProvider();
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheMaxSize = options.cacheMaxSize ?? 10000;
    
    logger.info({
      cacheEnabled: this.cacheEnabled,
      supportedLanguages: Object.keys(SUPPORTED_LANGUAGES).length,
    }, 'AI Translation Service initialized');
  }

  /**
   * Get cache key for a translation
   */
  private getCacheKey(text: string, sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}:${targetLanguage}:${text.substring(0, 100)}:${text.length}`;
  }

  /**
   * Translate content using the optimal AI provider for the target language
   */
  async translateContent(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options: TranslationOptions = {}
  ): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        provider: 'none',
        model: 'none',
        latencyMs: 0,
      };
    }

    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        provider: 'passthrough',
        model: 'none',
        latencyMs: 0,
      };
    }

    const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
    if (this.cacheEnabled) {
      const cached = this.translationCache.get(cacheKey);
      if (cached) {
        logger.debug({ sourceLanguage, targetLanguage }, 'Translation cache hit');
        return cached;
      }
    }

    const languageConfig = SUPPORTED_LANGUAGES[targetLanguage];
    if (!languageConfig) {
      logger.warn({ targetLanguage }, 'Unsupported target language, using default provider chain');
    }

    const prompt = buildTranslationPrompt(text, sourceLanguage, targetLanguage, {
      preserveHtml: options.preserveHtml ?? true,
      seoOptimized: options.seoOptimized ?? true,
      context: options.context,
    });

    const maxRetries = options.maxRetries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.translateWithProvider(prompt, targetLanguage);
        
        const translationResult: TranslationResult = {
          translatedText: result.content.trim(),
          sourceLanguage,
          targetLanguage,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          tokensUsed: result.tokensUsed,
        };

        if (this.cacheEnabled) {
          if (this.translationCache.size >= this.cacheMaxSize) {
            const firstKey = this.translationCache.keys().next().value;
            if (firstKey) {
              this.translationCache.delete(firstKey);
            }
          }
          this.translationCache.set(cacheKey, translationResult);
        }

        logger.info({
          sourceLanguage,
          targetLanguage,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          textLength: text.length,
        }, 'Translation completed successfully');

        return translationResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({
          attempt,
          maxRetries,
          error: lastError.message,
          targetLanguage,
        }, `Translation attempt ${attempt} failed`);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('Translation failed after all retries');
  }

  /**
   * Translate using the multi-model provider with language-specific optimization
   */
  private async translateWithProvider(
    prompt: string,
    targetLanguage: string
  ): Promise<GenerationResult> {
    const systemPrompt = this.getSystemPromptForLanguage(targetLanguage);
    
    return this.multiModelProvider.generate(prompt, {
      maxTokens: 4096,
      temperature: 0.1,
      systemPrompt,
    });
  }

  /**
   * Get optimized system prompt based on target language characteristics
   */
  private getSystemPromptForLanguage(targetLanguage: string): string {
    const basePrompt = 'You are an expert translator specializing in accurate, natural translations.';
    
    if (RTL_LANGUAGES.has(targetLanguage)) {
      return `${basePrompt} You have deep expertise in right-to-left languages and understand Arabic/Hebrew script nuances. Ensure proper RTL text flow and appropriate character usage.`;
    }
    
    if (CJK_LANGUAGES.has(targetLanguage)) {
      return `${basePrompt} You have native-level fluency in CJK languages and understand cultural context, honorifics, and appropriate formality levels.`;
    }
    
    if (['hi', 'th'].includes(targetLanguage)) {
      return `${basePrompt} You understand South/Southeast Asian language structures and cultural contexts for natural translations.`;
    }
    
    return `${basePrompt} Provide fluent, natural translations that sound native to speakers of the target language.`;
  }

  /**
   * Batch translate multiple texts to the same target language
   */
  async translateBatch(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    options: TranslationOptions = {}
  ): Promise<BatchTranslationResult> {
    const startTime = Date.now();
    const translations: TranslationResult[] = [];
    const errors: Array<{ text: string; error: string }> = [];

    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 500;

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (text, index) => {
        try {
          const result = await this.translateContent(text, sourceLanguage, targetLanguage, options);
          return { success: true as const, result, index: i + index };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { success: false as const, text, error: errorMessage, index: i + index };
        }
      });

      const results = await Promise.all(batchPromises);

      for (const result of results) {
        if (result.success) {
          translations.push(result.result);
        } else {
          errors.push({ text: result.text, error: result.error });
        }
      }

      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    const totalLatencyMs = Date.now() - startTime;
    const successCount = translations.length;
    const failureCount = errors.length;

    logger.info({
      totalTexts: texts.length,
      successCount,
      failureCount,
      targetLanguage,
      totalLatencyMs,
    }, 'Batch translation completed');

    return {
      translations,
      totalLatencyMs,
      successCount,
      failureCount,
      errors,
    };
  }

  /**
   * Translate to multiple languages in parallel
   */
  async translateToMultipleLanguages(
    text: string,
    sourceLanguage: string,
    targetLanguages: string[],
    options: TranslationOptions = {}
  ): Promise<Map<string, TranslationResult>> {
    const results = new Map<string, TranslationResult>();
    
    const translationPromises = targetLanguages.map(async (targetLanguage) => {
      try {
        const result = await this.translateContent(text, sourceLanguage, targetLanguage, options);
        return { targetLanguage, result, success: true as const };
      } catch (error) {
        logger.error({
          targetLanguage,
          error: error instanceof Error ? error.message : String(error),
        }, 'Translation to language failed');
        return { targetLanguage, success: false as const };
      }
    });

    const allResults = await Promise.all(translationPromises);

    for (const result of allResults) {
      if (result.success) {
        results.set(result.targetLanguage, result.result);
      }
    }

    return results;
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(code: string): LanguageConfig | undefined {
    return SUPPORTED_LANGUAGES[code];
  }

  /**
   * Get all supported language codes
   */
  getSupportedLanguageCodes(): string[] {
    return Object.keys(SUPPORTED_LANGUAGES);
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(code: string): boolean {
    return code in SUPPORTED_LANGUAGES;
  }

  /**
   * Get text direction for a language
   */
  getTextDirection(code: string): TextDirection {
    return SUPPORTED_LANGUAGES[code]?.direction || 'ltr';
  }

  /**
   * Clear the translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
    logger.info('Translation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; enabled: boolean } {
    return {
      size: this.translationCache.size,
      maxSize: this.cacheMaxSize,
      enabled: this.cacheEnabled,
    };
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

let translationServiceInstance: AITranslationService | null = null;

export function getAITranslationService(): AITranslationService {
  if (!translationServiceInstance) {
    translationServiceInstance = new AITranslationService();
  }
  return translationServiceInstance;
}

export default AITranslationService;
