import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";

const EXTERNAL_API_TIMEOUT_MS = 30000;
import {
  SUPPORTED_LOCALES,
  type Locale,
  type ContentBlock,
  translationBatchJobs,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

// ============================================================================
// TRANSLATION SYSTEM CONTROL
// ============================================================================
// HARD DISABLE: Automatic translation is permanently disabled.
// Manual translation via admin UI is still allowed when explicitly triggered.
// To re-enable automatic translation, set this to true (NOT RECOMMENDED).
export const TRANSLATION_ENABLED = false;

export class TranslationDisabledError extends Error {
  constructor(message: string = "Automatic translation is permanently disabled") {
    super(message);
    this.name = "TranslationDisabledError";
  }
}

/**
 * Guard function - throws if automatic translation is attempted
 */
export function assertTranslationEnabled(context: string = "translation"): void {
  if (!TRANSLATION_ENABLED) {
    throw new TranslationDisabledError(
      `[${context}] Automatic translation is disabled. Use manual translation in admin UI.`
    );
  }
}

// Generate a hash of the content for tracking translation freshness
export function generateContentHash(content: {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  blocks?: ContentBlock[];
}): string {
  const data = JSON.stringify({
    title: content.title || "",
    metaTitle: content.metaTitle || "",
    metaDescription: content.metaDescription || "",
    blocks: content.blocks || [],
  });
  return crypto.createHash("md5").update(data).digest("hex");
}

// ============================================================================
// TRANSLATION PROVIDERS - COST OPTIMIZED (December 2025)
// ============================================================================
// CRITICAL: DeepL Pro charged $100 for 4 uses! Use Claude or GPT instead
//
// Cost comparison per 1M tokens (~250K characters):
// - DeepL Pro: $25+/M chars (AVOID - way too expensive!)
// - DeepL Free: $0 (500K chars/month limit)
// - GPT-4o-mini: $0.15/$0.60 (cheapest, good quality)
// - Claude Haiku 3.5: $0.80/$4.00 (RECOMMENDED - excellent quality, still 10x cheaper than DeepL)
// - Claude Sonnet 4: $3.00/$15.00 (premium quality)
//
// STRATEGY:
// 1. DEFAULT: Claude Haiku 3.5 (best quality/cost ratio for translations)
// 2. BUDGET: GPT-4o-mini (cheapest option)
// 3. OPTIONAL: DeepL Free tier only (500K chars/month limit)
// 4. NEVER fall back to DeepL Pro API

type TranslationProvider = "claude" | "gpt" | "deepl_free_only" | "auto";

// DeepL supported language codes (official codes)
const DEEPL_SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "EN",
  de: "DE",
  fr: "FR",
  es: "ES",
  it: "IT",
  nl: "NL",
  pl: "PL",
  pt: "PT-BR",
  ru: "RU",
  ja: "JA",
  zh: "ZH",
  ko: "KO",
  ar: "AR",
  tr: "TR",
  uk: "UK",
  id: "ID",
  sv: "SV",
  da: "DA",
  fi: "FI",
  nb: "NB",
  el: "EL",
  cs: "CS",
  ro: "RO",
  hu: "HU",
  sk: "SK",
  bg: "BG",
  lt: "LT",
  lv: "LV",
  sl: "SL",
  et: "ET",
};

function isDeepLSupported(locale: string): boolean {
  return locale in DEEPL_SUPPORTED_LANGUAGES;
}

function getDeepLLanguageCode(locale: string): string {
  return DEEPL_SUPPORTED_LANGUAGES[locale] || locale.toUpperCase();
}

// Initialize OpenAI client
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

// Gemini via OpenAI-compatible API
function getGeminiClient(): OpenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI || process.env.gemini;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

// OpenRouter - supports many models
function getOpenRouterClient(): OpenAI | null {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.openrouterapi ||
    process.env.OPENROUTERAPI ||
    process.env.travisite;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "https://travi.world",
      "X-Title": "Travi CMS",
    },
  });
}

// Get best available AI client with fallbacks
function getAIClient(): { client: OpenAI; provider: string } | null {
  const openai = getOpenAIClient();
  if (openai) return { client: openai, provider: "openai" };
  const gemini = getGeminiClient();
  if (gemini) return { client: gemini, provider: "gemini" };
  const openrouter = getOpenRouterClient();
  if (openrouter) return { client: openrouter, provider: "openrouter" };
  return null;
}

// Get model for provider
function getModelForProvider(provider: string): string {
  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "gemini":
      return "gemini-1.5-flash";
    case "openrouter":
      return "google/gemini-flash-1.5";
    default:
      return "gpt-4o-mini";
  }
}

// Initialize Anthropic client for Claude translations (RECOMMENDED)
function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Anthropic({ apiKey });
}

// Initialize DeepSeek client (OpenAI-compatible API - BEST FOR CHINESE)
function getDeepSeekClient(): OpenAI | null {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

// Translate using DeepSeek (RECOMMENDED FOR CHINESE - native Chinese AI, very cheap)
async function translateWithDeepSeek(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  contentType: string = "body"
): Promise<{ text: string; success: boolean; error?: string }> {
  const deepseek = getDeepSeekClient();
  if (!deepseek) {
    return { text: "", success: false, error: "DeepSeek API key not configured" };
  }

  const targetLocaleInfo = SUPPORTED_LOCALES.find(l => l.code === targetLocale);
  const targetLanguageName = targetLocaleInfo?.name || targetLocale;

  const contentTypeInstructions: Record<string, string> = {
    title: "This is a title/heading. Keep it concise, impactful, and SEO-friendly.",
    description: "This is a meta description for SEO. Keep it under 160 characters, compelling.",
    meta: "This is meta content for SEO. Optimize for search engines while being natural.",
    body: "This is body content. Maintain the tone, style, and formatting of the original.",
  };

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are an expert tourism content translator specializing in Dubai travel content.

CRITICAL RULES:
1. Translate naturally using LOCAL expressions that tourists from the target language actually use
2. Keep proper nouns in their original form: "Burj Khalifa", "Dubai Mall", "Palm Jumeirah"
3. Preserve all HTML tags, markdown formatting, and special characters exactly
4. Use culturally appropriate marketing tone for the target audience
5. For Chinese: Use Simplified Chinese (简体中文) unless Traditional is specified
6. For Japanese: Use formal/polite language (です/ます form) appropriate for business/tourism
7. For Korean: Use polite formal style (합니다/하세요) for professional travel content

CULTURAL ADAPTATIONS:
FOR CHINESE (中文):
- Highlight shopping opportunities and luxury brands
- Emphasize photo-worthy spots and famous landmarks
- Include practical information (transport, opening hours)
- Use engaging marketing language that resonates with Chinese tourists
- Mention payment options (WeChat Pay, Alipay if applicable)

FOR JAPANESE (日本語):
- Use formal/polite register (敬語/です・ます調) for professional tourism content
- Emphasize cleanliness, safety, and efficiency
- Highlight unique experiences and cultural aspects
- Include precise timing and scheduling information
- Mention Japanese-friendly services (Japanese-speaking staff, halal options)
- Use respectful and humble tone appropriate for customer service

FOR KOREAN (한국어):
- Use formal polite speech (존댓말/합니다체) for travel content
- Emphasize trendy spots, photo locations, and Instagram-worthy experiences
- Highlight K-beauty and shopping opportunities
- Include information about halal food and prayer facilities
- Mention Korean-friendly services and Korean-speaking staff
- Appeal to family travel and honeymoon destinations

${contentTypeInstructions[contentType] || contentTypeInstructions.body}`,
        },
        {
          role: "user",
          content: `Translate the following ${contentType} from ${sourceLocale} to ${targetLanguageName} (${targetLocale}).

Text to translate:
${text}

Return ONLY the translated text, no explanations.`,
        },
      ],
    });

    const translatedText = response.choices[0]?.message?.content?.trim() || "";

    return { text: translatedText, success: true };
  } catch (error) {
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Translate using Claude Haiku 3.5 (RECOMMENDED - best quality/cost ratio)
async function translateWithClaude(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  contentType: string = "body"
): Promise<{ text: string; success: boolean; error?: string }> {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return { text: "", success: false, error: "Anthropic API key not configured" };
  }

  const targetLocaleInfo = SUPPORTED_LOCALES.find(l => l.code === targetLocale);
  const targetLanguageName = targetLocaleInfo?.name || targetLocale;

  const contentTypeInstructions: Record<string, string> = {
    title: "This is a title/heading. Keep it concise, impactful, and SEO-friendly.",
    description: "This is a meta description for SEO. Keep it under 160 characters, compelling.",
    meta: "This is meta content for SEO. Optimize for search engines while being natural.",
    body: "This is body content. Maintain the tone, style, and formatting of the original.",
  };

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022", // Claude 3.5 Haiku - fast, cheap, excellent quality
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert tourism content translator specializing in Dubai travel content.

CRITICAL RULES:
1. Translate naturally using LOCAL expressions that tourists from the target language actually use
2. Keep proper nouns in their original form: "Burj Khalifa", "Dubai Mall", "Palm Jumeirah"
3. Preserve all HTML tags, markdown formatting, and special characters exactly
4. Use culturally appropriate marketing tone for the target audience
5. For RTL languages (Arabic, Hebrew): ensure proper text flow

CULTURAL ADAPTATIONS:
- Russian: Emphasize luxury, exclusivity, VIP experiences
- Arabic: Emphasize halal options, prayer facilities, modest dress code
- Chinese: Highlight shopping, photo spots, famous landmarks
- Japanese: Focus on cleanliness, efficiency, unique experiences
- German: Emphasize quality, precision, practical information

Translate the following ${contentType} from ${sourceLocale} to ${targetLanguageName} (${targetLocale}).

${contentTypeInstructions[contentType] || contentTypeInstructions.body}

Text to translate:
${text}

Return ONLY the translated text, no explanations.`,
        },
      ],
    });

    const textContent = response.content.find(c => c.type === "text");
    const translatedText = textContent ? textContent.text.trim() : "";

    return { text: translatedText, success: true };
  } catch (error) {
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Translate using DeepL API
async function translateWithDeepL(
  text: string,
  sourceLocale: string,
  targetLocale: string
): Promise<{ text: string; success: boolean; error?: string }> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return { text: "", success: false, error: "DeepL API key not configured" };
  }

  try {
    const sourceCode = getDeepLLanguageCode(sourceLocale);
    const targetCode = getDeepLLanguageCode(targetLocale);

    const response = await fetchWithTimeout("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceCode,
        target_lang: targetCode,
        preserve_formatting: true,
        tag_handling: "html",
      }),
      timeoutMs: EXTERNAL_API_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorText = await response.text();

      // IMPORTANT: Do NOT fall back to DeepL Pro API - it's extremely expensive ($25+/M chars)
      // If free tier limit is exceeded (456) or rate limited (429), return error
      // The calling code will automatically fall back to GPT-4o-mini (100x cheaper)
      if (response.status === 456) {
        return {
          text: "",
          success: false,
          error: "DeepL free tier limit exceeded. Using GPT instead.",
        };
      }
      if (response.status === 429) {
        return { text: "", success: false, error: "DeepL rate limited. Using GPT instead." };
      }

      return { text: "", success: false, error: `DeepL API error: ${response.status}` };
    }

    const data = await response.json();
    return { text: data.translations[0].text, success: true };
  } catch (error) {
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Translation prompts optimized for Dubai tourism content
const TRANSLATION_SYSTEM_PROMPT = `You are an expert tourism content translator specializing in Dubai travel content.

CRITICAL RULES:
1. Translate naturally using LOCAL expressions and slang that tourists from the target language actually use
2. Keep proper nouns in their original form: "Burj Khalifa", "Dubai Mall", "Palm Jumeirah"
3. Adapt currency mentions: Keep AED but add local equivalent in parentheses when relevant
4. Use culturally appropriate marketing tone for the target audience
5. Preserve all HTML tags, markdown formatting, and special characters exactly
6. Maintain SEO-friendly structure with proper headings and keywords in target language
7. For RTL languages (Arabic, Hebrew, Persian, Urdu): ensure proper text flow

CULTURAL ADAPTATIONS BY MARKET:
- Russian (ru): Emphasize luxury, exclusivity, VIP experiences
- Hindi (hi): Focus on family-friendly, value for money, vegetarian options
- Chinese (zh): Highlight shopping, photo spots, famous landmarks
- Arabic (ar): Emphasize halal options, prayer facilities, modest dress code areas
- Japanese (ja): Focus on cleanliness, efficiency, unique experiences
- Korean (ko): Highlight Instagram-worthy spots, K-beauty shops, unique cafes
- German (de): Emphasize quality, precision, practical information
- French (fr): Focus on culture, gastronomy, elegance

OUTPUT FORMAT: Return ONLY the translated text. Do not include any explanations or notes.`;

interface TranslationRequest {
  text: string;
  sourceLocale: Locale;
  targetLocale: Locale;
  contentType?: "title" | "description" | "body" | "meta";
}

interface TranslationResult {
  translatedText: string;
  locale: Locale;
  success: boolean;
  error?: string;
}

interface ContentTranslation {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  blocks?: ContentBlock[];
  sourceHash?: string;
}

// Translate a single piece of text
// DEFAULT: Claude Haiku 3.5 (excellent quality, 10x cheaper than DeepL Pro)
// CHINESE: DeepSeek (native Chinese AI, excellent quality, very cheap)
// BUDGET: GPT-4o-mini (cheapest option)
// OPTIONAL: DeepL Free tier only (500K chars/month limit)
export async function translateText(
  request: TranslationRequest,
  options?: { provider?: TranslationProvider }
): Promise<TranslationResult> {
  const { text, sourceLocale, targetLocale, contentType = "body" } = request;
  // DEFAULT TO CLAUDE (best quality/cost ratio)
  const provider = options?.provider || "claude";

  if (!text || text.trim() === "") {
    return { translatedText: "", locale: targetLocale, success: true };
  }

  if (sourceLocale === targetLocale) {
    return { translatedText: text, locale: targetLocale, success: true };
  }

  const targetLocaleInfo = SUPPORTED_LOCALES.find(l => l.code === targetLocale);
  const targetLanguageName = targetLocaleInfo?.name || targetLocale;

  // ASIAN LANGUAGES: Use DeepSeek (excellent for Chinese, Japanese, Korean)
  const asianLanguages = ["zh", "ja", "ko"];
  if (asianLanguages.includes(targetLocale) && process.env.DEEPSEEK_API_KEY) {
    const deepseekResult = await translateWithDeepSeek(
      text,
      sourceLocale,
      targetLocale,
      contentType
    );
    if (deepseekResult.success) {
      return {
        translatedText: deepseekResult.text,
        locale: targetLocale,
        success: true,
      };
    }
    // DeepSeek failed - fall back to Claude/GPT
  }

  // Only use DeepL if explicitly requested AND it's free tier only
  // NEVER use DeepL Pro - it charged $100 for 4 uses!
  if (
    provider === "deepl_free_only" &&
    isDeepLSupported(targetLocale) &&
    process.env.DEEPL_API_KEY
  ) {
    const deeplResult = await translateWithDeepL(text, sourceLocale, targetLocale);

    if (deeplResult.success) {
      return {
        translatedText: deeplResult.text,
        locale: targetLocale,
        success: true,
      };
    }
    // DeepL failed - continue to Claude/GPT
  }

  // Try Claude Haiku first (RECOMMENDED - excellent quality, $0.80-$4.00/M tokens)
  if (provider === "claude" || provider === "auto") {
    const claudeResult = await translateWithClaude(text, sourceLocale, targetLocale, contentType);
    if (claudeResult.success) {
      return {
        translatedText: claudeResult.text,
        locale: targetLocale,
        success: true,
      };
    }
    // Claude failed - fall back to GPT
  }

  // FALLBACK: GPT-4o-mini (cheapest option: $0.15-$0.60/M tokens)

  const contentTypeInstructions = {
    title: "This is a title/heading. Keep it concise, impactful, and SEO-friendly.",
    description:
      "This is a meta description for SEO. Keep it under 160 characters, compelling, and include key search terms.",
    meta: "This is meta content for SEO. Optimize for search engines while being natural.",
    body: "This is body content. Maintain the tone, style, and formatting of the original.",
  };

  try {
    const aiClient = getAIClient();
    if (!aiClient) {
      return {
        translatedText: "",
        locale: targetLocale,
        success: false,
        error: "No AI client configured - check OPENAI_API_KEY, GEMINI, or openrouterapi",
      };
    }
    const { client: openai, provider } = aiClient;

    const response = await openai.chat.completions.create({
      model: getModelForProvider(provider),
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: TRANSLATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Translate the following ${contentType} from ${sourceLocale} to ${targetLanguageName} (${targetLocale}).

${contentTypeInstructions[contentType]}

Text to translate:
${text}`,
        },
      ],
      temperature: 0.3,
    });

    const translatedText = response.choices[0]?.message?.content?.trim() || "";

    return {
      translatedText: translatedText.trim(),
      locale: targetLocale,
      success: true,
    };
  } catch (error) {
    return {
      translatedText: "",
      locale: targetLocale,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Translate content blocks recursively
async function translateBlock(
  block: ContentBlock,
  sourceLocale: Locale,
  targetLocale: Locale
): Promise<ContentBlock> {
  const translatedBlock = { ...block };

  // Translate text fields in the block
  if (block.data) {
    const translatedData: Record<string, unknown> = { ...block.data };

    for (const [key, value] of Object.entries(block.data)) {
      if (typeof value === "string" && value.trim() !== "") {
        // Skip URLs and technical fields
        if (
          key.toLowerCase().includes("url") ||
          key.toLowerCase().includes("src") ||
          key.toLowerCase().includes("id")
        ) {
          continue;
        }

        const result = await translateText({
          text: value,
          sourceLocale,
          targetLocale,
          contentType: key.toLowerCase().includes("title") ? "title" : "body",
        });

        if (result.success) {
          translatedData[key] = result.translatedText;
        }
      } else if (Array.isArray(value)) {
        // Handle arrays (like FAQ items, list items, etc.)
        const translatedArray = await Promise.all(
          value.map(async item => {
            if (typeof item === "string") {
              const result = await translateText({
                text: item,
                sourceLocale,
                targetLocale,
                contentType: "body",
              });
              return result.success ? result.translatedText : item;
            } else if (typeof item === "object" && item !== null) {
              // Recursively translate object items
              const translatedItem: Record<string, unknown> = { ...item };
              for (const [itemKey, itemValue] of Object.entries(item)) {
                if (typeof itemValue === "string" && itemValue.trim() !== "") {
                  const result = await translateText({
                    text: itemValue,
                    sourceLocale,
                    targetLocale,
                    contentType: itemKey.toLowerCase().includes("title") ? "title" : "body",
                  });
                  if (result.success) {
                    translatedItem[itemKey] = result.translatedText;
                  }
                }
              }
              return translatedItem;
            }
            return item;
          })
        );
        translatedData[key] = translatedArray;
      }
    }

    translatedBlock.data = translatedData;
  }

  return translatedBlock;
}

// Translate full content (title, meta, blocks)
// GUARDED: Throws TranslationDisabledError if automatic translation is disabled
export async function translateContent(
  content: {
    title?: string;
    metaTitle?: string;
    metaDescription?: string;
    blocks?: ContentBlock[];
  },
  sourceLocale: Locale,
  targetLocale: Locale
): Promise<ContentTranslation> {
  // HARD DISABLE: Check at every entry point
  assertTranslationEnabled("translateContent");

  const result: ContentTranslation = {};

  // Translate title
  if (content.title) {
    const titleResult = await translateText({
      text: content.title,
      sourceLocale,
      targetLocale,
      contentType: "title",
    });
    if (titleResult.success) {
      result.title = titleResult.translatedText;
    }
  }

  // Translate meta title
  if (content.metaTitle) {
    const metaTitleResult = await translateText({
      text: content.metaTitle,
      sourceLocale,
      targetLocale,
      contentType: "meta",
    });
    if (metaTitleResult.success) {
      result.metaTitle = metaTitleResult.translatedText;
    }
  }

  // Translate meta description
  if (content.metaDescription) {
    const metaDescResult = await translateText({
      text: content.metaDescription,
      sourceLocale,
      targetLocale,
      contentType: "description",
    });
    if (metaDescResult.success) {
      result.metaDescription = metaDescResult.translatedText;
    }
  }

  // Translate blocks
  if (content.blocks && content.blocks.length > 0) {
    result.blocks = await Promise.all(
      content.blocks.map(block => translateBlock(block, sourceLocale, targetLocale))
    );
  }

  // Add source hash for tracking translation freshness
  result.sourceHash = generateContentHash(content);

  return result;
}

// Translate content to all supported languages
// GUARDED: Throws TranslationDisabledError if automatic translation is disabled
export async function translateToAllLanguages(
  content: {
    title?: string;
    metaTitle?: string;
    metaDescription?: string;
    blocks?: ContentBlock[];
  },
  sourceLocale: Locale = "en",
  targetTiers?: number[] // Optional: only translate to specific tiers
): Promise<Map<Locale, ContentTranslation>> {
  // HARD DISABLE: Check at every entry point
  assertTranslationEnabled("translateToAllLanguages");

  const results = new Map<Locale, ContentTranslation>();

  // Filter locales based on tier if specified
  let targetLocales = SUPPORTED_LOCALES.filter(l => l.code !== sourceLocale);
  if (targetTiers && targetTiers.length > 0) {
    targetLocales = targetLocales.filter(l => targetTiers.includes(l.tier));
  }

  // Process translations in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < targetLocales.length; i += BATCH_SIZE) {
    const batch = targetLocales.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async locale => {
        const translation = await translateContent(content, sourceLocale, locale.code);
        return { locale: locale.code, translation };
      })
    );

    for (const { locale, translation } of batchResults) {
      results.set(locale, translation);
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < targetLocales.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Translate tags to a target language
// GUARDED: Throws TranslationDisabledError if automatic translation is disabled
export async function translateTags(
  tags: string[],
  sourceLocale: Locale,
  targetLocale: Locale
): Promise<string[]> {
  // HARD DISABLE: Check at every entry point
  assertTranslationEnabled("translateTags");

  if (tags.length === 0) return [];

  const translatedTags = await Promise.all(
    tags.map(async tag => {
      const result = await translateText({
        text: tag,
        sourceLocale,
        targetLocale,
        contentType: "title",
      });
      return result.success ? result.translatedText : tag;
    })
  );

  return translatedTags;
}

// Get translation progress for content
export function getTranslationProgress(
  translatedLocales: Locale[],
  targetTiers?: number[]
): { completed: number; total: number; percentage: number } {
  let targetLocales = SUPPORTED_LOCALES;
  if (targetTiers && targetTiers.length > 0) {
    targetLocales = SUPPORTED_LOCALES.filter(l => targetTiers.includes(l.tier));
  }

  const total = targetLocales.length;
  const completed = translatedLocales.filter(locale =>
    targetLocales.some(l => l.code === locale)
  ).length;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}

// ============================================================================
// BATCH TRANSLATION API (50% cost savings)
// ============================================================================
// OpenAI Batch API allows sending many requests at once with 24-hour turnaround
// at 50% discount. Perfect for bulk translation of content.

interface BatchTranslationJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  requests: Array<{
    customId: string;
    text: string;
    sourceLocale: Locale;
    targetLocale: Locale;
    contentType: "title" | "description" | "body" | "meta";
  }>;
  results?: Map<string, string>;
  createdAt: Date;
  completedAt?: Date;
  batchId?: string; // OpenAI batch ID
}

// Note: Batch jobs are now persisted to PostgreSQL via translationBatchJobs table

export const batchTranslation = {
  /**
   * Create a batch translation job for multiple texts
   * Returns a job ID that can be used to check status and retrieve results
   */
  async createBatchJob(
    requests: Array<{
      text: string;
      sourceLocale: Locale;
      targetLocale: Locale;
      contentType?: "title" | "description" | "body" | "meta";
    }>
  ): Promise<string> {
    // Batch API is OpenAI-specific, requires direct OpenAI client
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error(
        "OpenAI client required for batch processing - OPENAI_API_KEY not configured"
      );
    }

    const jobId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    // Create batch request file (JSONL format)
    const batchRequests = requests.map((req, index) => {
      const targetLocaleInfo = SUPPORTED_LOCALES.find(l => l.code === req.targetLocale);
      const targetLanguageName = targetLocaleInfo?.name || req.targetLocale;
      const contentType = req.contentType || "body";

      const contentTypeInstructions: Record<string, string> = {
        title: "This is a title/heading. Keep it concise, impactful, and SEO-friendly.",
        description:
          "This is a meta description for SEO. Keep it under 160 characters, compelling, and include key search terms.",
        meta: "This is meta content for SEO. Optimize for search engines while being natural.",
        body: "This is body content. Maintain the tone, style, and formatting of the original.",
      };

      return {
        custom_id: `req_${index}`,
        method: "POST",
        url: "/v1/chat/completions",
        body: {
          model: "gpt-4o-mini",
          max_tokens: 4096,
          messages: [
            { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Translate the following ${contentType} from ${req.sourceLocale} to ${targetLanguageName} (${req.targetLocale}).

${contentTypeInstructions[contentType]}

Text to translate:
${req.text}`,
            },
          ],
          temperature: 0.3,
        },
      };
    });

    try {
      // Convert to JSONL
      const jsonlContent = batchRequests.map(r => JSON.stringify(r)).join("\n");
      const jsonlBlob = new Blob([jsonlContent], { type: "application/jsonl" });

      // Upload file to OpenAI
      const file = await openai.files.create({
        file: jsonlBlob as any,
        purpose: "batch",
      });

      // Create batch
      const batch = await openai.batches.create({
        input_file_id: file.id,
        endpoint: "/v1/chat/completions",
        completion_window: "24h",
      });

      // Store job in database
      const [row] = await db
        .insert(translationBatchJobs)
        .values({
          id: jobId,
          status: "processing",
          batchId: batch.id,
          requests: requests.map((req, index) => ({
            customId: `req_${index}`,
            text: req.text,
            sourceLocale: req.sourceLocale,
            targetLocale: req.targetLocale,
            contentType: req.contentType || "body",
          })),
        })
        .returning();

      return row.id;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check status of a batch translation job
   */
  async getJobStatus(jobId: string): Promise<BatchTranslationJob | null> {
    // Query from database
    const [row] = await db
      .select()
      .from(translationBatchJobs)
      .where(eq(translationBatchJobs.id, jobId));

    if (!row) return null;

    // Convert DB row to BatchTranslationJob format
    const job: BatchTranslationJob = {
      id: row.id,
      status: row.status as BatchTranslationJob["status"],
      requests: row.requests as BatchTranslationJob["requests"],
      results: row.results ? new Map(Object.entries(row.results)) : undefined,
      createdAt: row.createdAt,
      completedAt: row.completedAt || undefined,
      batchId: row.batchId || undefined,
    };

    if (job.status === "processing" && job.batchId) {
      const openai = getOpenAIClient();
      if (!openai) return job;

      try {
        const batch = await openai.batches.retrieve(job.batchId);

        if (batch.status === "completed") {
          // Download results
          if (batch.output_file_id) {
            const outputFile = await openai.files.content(batch.output_file_id);
            const outputContent = await outputFile.text();

            // Parse JSONL results
            const results = new Map<string, string>();
            for (const line of outputContent.split("\n").filter(Boolean)) {
              const result = JSON.parse(line);
              const translation = result.response?.body?.choices?.[0]?.message?.content?.trim();
              if (translation) {
                results.set(result.custom_id, translation);
              }
            }

            // Update database with completed status
            await db
              .update(translationBatchJobs)
              .set({
                status: "completed",
                results: Object.fromEntries(results),
                completedAt: new Date(),
              })
              .where(eq(translationBatchJobs.id, jobId));

            job.status = "completed";
            job.results = results;
            job.completedAt = new Date();
          }
        } else if (
          batch.status === "failed" ||
          batch.status === "expired" ||
          batch.status === "cancelled"
        ) {
          // Update database with failed status
          await db
            .update(translationBatchJobs)
            .set({ status: "failed" })
            .where(eq(translationBatchJobs.id, jobId));

          job.status = "failed";
        }
      } catch (error) {}
    }

    return job;
  },

  /**
   * Get results from a completed batch job
   */
  async getResults(jobId: string): Promise<Map<string, string> | null> {
    const job = await this.getJobStatus(jobId);
    if (!job || job.status !== "completed") return null;
    return job.results || null;
  },

  /**
   * Translate content to all languages using batch API (50% cheaper, 24h turnaround)
   * Returns job ID for tracking
   */
  async translateContentBatch(
    content: {
      title?: string;
      metaTitle?: string;
      metaDescription?: string;
    },
    sourceLocale: Locale = "en",
    targetTiers?: number[]
  ): Promise<string> {
    let targetLocales = SUPPORTED_LOCALES.filter(l => l.code !== sourceLocale);
    if (targetTiers && targetTiers.length > 0) {
      targetLocales = targetLocales.filter(l => targetTiers.includes(l.tier));
    }

    const requests: Array<{
      text: string;
      sourceLocale: Locale;
      targetLocale: Locale;
      contentType: "title" | "description" | "body" | "meta";
    }> = [];

    for (const locale of targetLocales) {
      if (content.title) {
        requests.push({
          text: content.title,
          sourceLocale,
          targetLocale: locale.code,
          contentType: "title",
        });
      }
      if (content.metaTitle) {
        requests.push({
          text: content.metaTitle,
          sourceLocale,
          targetLocale: locale.code,
          contentType: "meta",
        });
      }
      if (content.metaDescription) {
        requests.push({
          text: content.metaDescription,
          sourceLocale,
          targetLocale: locale.code,
          contentType: "description",
        });
      }
    }

    return this.createBatchJob(requests);
  },
};

// ============================================================================
// DEEPL USAGE STUB FUNCTIONS
// ============================================================================
// These are stub functions - DeepL Pro is disabled due to high costs ($100+ per use)
// Translation now uses Claude Haiku 3.5 or GPT-4o-mini instead

export async function getDeepLUsage(): Promise<{
  characterCount: number;
  characterLimit: number;
  percentUsed: number;
}> {
  // DeepL is disabled - return zero usage
  return {
    characterCount: 0,
    characterLimit: 500000, // Free tier limit
    percentUsed: 0,
  };
}

export function getDeepLSupportedLocales(): string[] {
  return Object.keys(DEEPL_SUPPORTED_LANGUAGES);
}

export function getUnsupportedLocales(): string[] {
  const supported = new Set(Object.keys(DEEPL_SUPPORTED_LANGUAGES));
  return SUPPORTED_LOCALES.map(l => l.code).filter(code => !supported.has(code));
}
