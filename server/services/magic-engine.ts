/**
 * Magic Engine - AI-powered field generation for CMS content
 *
 * Provides intelligent auto-fill capabilities for:
 * - Destinations
 * - Hotels
 * - Attractions
 * - Restaurants
 * - Articles
 */

import { getAllUnifiedProviders } from "../ai/providers";
import { log } from "../lib/logger";

// ============================================================================
// Types
// ============================================================================

export type ContentType = "destination" | "hotel" | "attraction" | "restaurant" | "article";
export type GenerationMode = "quick" | "full" | "premium";

export interface FieldContext {
  contentType: string;
  entityName?: string;
  parentDestination?: string;
  existingFields: Record<string, any>;
  locale?: string;
}

export interface GenerateFieldRequest {
  fieldType: string;
  context: FieldContext;
}

export interface GenerateFieldResponse {
  success: boolean;
  value: any;
  confidence: number;
  alternatives?: any[];
  tokensUsed: number;
  processingTimeMs: number;
  error?: string;
}

export interface GenerateAllFieldsRequest {
  contentType: ContentType;
  input: string;
  mode: GenerationMode;
  excludeFields?: string[];
}

export interface GenerateAllFieldsResponse {
  success: boolean;
  fields: Record<string, any>;
  metadata: {
    sources: string[];
    confidence: number;
    tokensUsed: number;
    processingTimeMs: number;
  };
  error?: string;
}

export interface GenerateBatchFieldsRequest {
  contentType: string;
  entityName: string;
  fields: string[];
}

export interface GenerateBatchFieldsResponse {
  success: boolean;
  fields: Record<string, any>;
  error?: string;
}

// ============================================================================
// Field Definitions by Content Type
// ============================================================================

const FIELD_DEFINITIONS: Record<ContentType, Record<string, { prompt: string; type: string }>> = {
  destination: {
    name: { prompt: "Official destination name", type: "string" },
    country: { prompt: "Country where the destination is located", type: "string" },
    region: { prompt: "Region or state within the country", type: "string" },
    description: {
      prompt:
        "Compelling 2-3 paragraph description highlighting what makes this destination unique for travelers",
      type: "text",
    },
    shortDescription: {
      prompt: "One-sentence elevator pitch for this destination",
      type: "string",
    },
    climate: { prompt: "Climate description including best times to visit", type: "text" },
    language: { prompt: "Primary language(s) spoken", type: "string" },
    currency: { prompt: "Local currency code", type: "string" },
    timezone: { prompt: "Timezone (e.g., UTC+2)", type: "string" },
    population: { prompt: "Approximate population", type: "number" },
    bestTimeToVisit: { prompt: "Best months to visit and why", type: "text" },
    highlights: { prompt: "Top 5 must-see attractions or experiences", type: "array" },
    metaTitle: { prompt: "SEO-optimized meta title (60 chars max)", type: "string" },
    metaDescription: { prompt: "SEO-optimized meta description (155 chars max)", type: "string" },
  },
  hotel: {
    name: { prompt: "Official hotel name", type: "string" },
    description: {
      prompt: "Enticing 2-paragraph hotel description highlighting amenities and location benefits",
      type: "text",
    },
    shortDescription: { prompt: "One-line tagline for the hotel", type: "string" },
    starRating: { prompt: "Hotel star rating (1-5)", type: "number" },
    propertyType: { prompt: "Type of property (hotel, resort, boutique, etc.)", type: "string" },
    amenities: { prompt: "List of key amenities", type: "array" },
    roomTypes: { prompt: "Available room types", type: "array" },
    checkInTime: { prompt: "Standard check-in time", type: "string" },
    checkOutTime: { prompt: "Standard check-out time", type: "string" },
    highlights: { prompt: "Top 3 unique selling points", type: "array" },
    metaTitle: { prompt: "SEO-optimized meta title", type: "string" },
    metaDescription: { prompt: "SEO-optimized meta description", type: "string" },
  },
  attraction: {
    name: { prompt: "Official attraction name", type: "string" },
    description: { prompt: "Engaging 2-paragraph description of the attraction", type: "text" },
    shortDescription: { prompt: "Brief one-line description", type: "string" },
    category: { prompt: "Primary category (museum, landmark, park, etc.)", type: "string" },
    duration: { prompt: "Typical visit duration", type: "string" },
    highlights: { prompt: "Top 3 highlights or features", type: "array" },
    tips: { prompt: "Practical visitor tips", type: "array" },
    bestTimeToVisit: { prompt: "Best time of day/year to visit", type: "string" },
    accessibility: { prompt: "Accessibility information", type: "text" },
    metaTitle: { prompt: "SEO-optimized meta title", type: "string" },
    metaDescription: { prompt: "SEO-optimized meta description", type: "string" },
  },
  restaurant: {
    name: { prompt: "Restaurant name", type: "string" },
    description: {
      prompt: "Appetizing 2-paragraph description of the dining experience",
      type: "text",
    },
    shortDescription: { prompt: "One-line description", type: "string" },
    cuisineType: { prompt: "Primary cuisine type(s)", type: "array" },
    priceRange: { prompt: "Price range ($, $$, $$$, $$$$)", type: "string" },
    atmosphere: { prompt: "Description of the atmosphere and ambiance", type: "text" },
    specialties: { prompt: "Signature dishes or specialties", type: "array" },
    dietaryOptions: {
      prompt: "Available dietary options (vegetarian, vegan, gluten-free, etc.)",
      type: "array",
    },
    openingHours: { prompt: "Typical opening hours", type: "string" },
    metaTitle: { prompt: "SEO-optimized meta title", type: "string" },
    metaDescription: { prompt: "SEO-optimized meta description", type: "string" },
  },
  article: {
    title: { prompt: "Engaging article title", type: "string" },
    introduction: { prompt: "Hook-style introduction paragraph", type: "text" },
    outline: { prompt: "Article outline with main sections", type: "array" },
    conclusion: { prompt: "Call-to-action conclusion", type: "text" },
    tags: { prompt: "Relevant tags for categorization", type: "array" },
    metaTitle: { prompt: "SEO-optimized meta title", type: "string" },
    metaDescription: { prompt: "SEO-optimized meta description", type: "string" },
    primaryKeyword: { prompt: "Primary SEO keyword", type: "string" },
    secondaryKeywords: { prompt: "Secondary keywords", type: "array" },
  },
};

// ============================================================================
// Model Selection by Mode
// ============================================================================

function getModelForMode(mode: GenerationMode): string {
  switch (mode) {
    case "quick":
      return process.env.AI_MODEL_QUICK || "gpt-4o-mini";
    case "full":
      return process.env.AI_MODEL_FULL || "gpt-4o-mini";
    case "premium":
      return process.env.AI_MODEL_PREMIUM || "gpt-4o";
    default:
      return "gpt-4o-mini";
  }
}

// ============================================================================
// Prompt Builders
// ============================================================================

function buildSingleFieldPrompt(fieldType: string, context: FieldContext): string {
  const contentType = context.contentType as ContentType;
  const fieldDef = FIELD_DEFINITIONS[contentType]?.[fieldType];

  const existingContext = Object.entries(context.existingFields)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
    .join("\n");

  return `You are an expert travel content writer. Generate the "${fieldType}" field for a ${contentType}.

${context.entityName ? `Entity: ${context.entityName}` : ""}
${context.parentDestination ? `Location: ${context.parentDestination}` : ""}
${context.locale ? `Language/Locale: ${context.locale}` : ""}

Existing information:
${existingContext || "None provided"}

Field to generate: ${fieldType}
${fieldDef ? `Description: ${fieldDef.prompt}` : ""}
${fieldDef ? `Expected type: ${fieldDef.type}` : ""}

Respond with a JSON object containing:
{
  "value": <the generated value>,
  "confidence": <0-100 confidence score>,
  "alternatives": [<optional alternative values>]
}

Ensure the value is factually accurate and follows travel content best practices.`;
}

function buildAllFieldsPrompt(request: GenerateAllFieldsRequest): string {
  const fieldDefs = FIELD_DEFINITIONS[request.contentType];
  const excludeSet = new Set(request.excludeFields || []);

  const fieldsToGenerate = Object.entries(fieldDefs)
    .filter(([key]) => !excludeSet.has(key))
    .map(([key, def]) => `- ${key} (${def.type}): ${def.prompt}`)
    .join("\n");

  const modeInstructions = {
    quick: "Provide concise, essential information only. Prioritize speed over depth.",
    full: "Provide comprehensive, well-researched information. Balance depth with accuracy.",
    premium:
      "Provide premium-quality, deeply researched content with rich details and nuanced insights.",
  };

  return `You are an expert travel content writer. Generate all fields for a ${request.contentType} entry.

Input: "${request.input}"
Mode: ${request.mode} - ${modeInstructions[request.mode]}

Generate the following fields:
${fieldsToGenerate}

Respond with a JSON object containing:
{
  "fields": {
    <fieldName>: <value>,
    ...
  },
  "sources": [<list of knowledge sources used>],
  "confidence": <0-100 overall confidence score>
}

Important guidelines:
1. All content must be factually accurate and based on real information
2. Descriptions should be engaging and traveler-focused
3. SEO fields should follow best practices
4. Arrays should contain 3-5 items where applicable
5. Do not make up specific details like addresses or phone numbers`;
}

function buildBatchFieldsPrompt(request: GenerateBatchFieldsRequest): string {
  const contentType = request.contentType as ContentType;
  const fieldDefs = FIELD_DEFINITIONS[contentType] || {};

  const fieldsToGenerate = request.fields
    .map(field => {
      const def = fieldDefs[field];
      return def ? `- ${field} (${def.type}): ${def.prompt}` : `- ${field}`;
    })
    .join("\n");

  return `You are an expert travel content writer. Generate specific fields for a ${request.contentType}.

Entity: ${request.entityName}

Generate only these fields:
${fieldsToGenerate}

Respond with a JSON object containing:
{
  "fields": {
    <fieldName>: <value>,
    ...
  }
}

Ensure all values are factually accurate and follow travel content best practices.`;
}

// ============================================================================
// AI Response Parsing
// ============================================================================

function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
  }

  return cleaned.trim();
}

function parseJsonResponse<T>(content: string, fallback: T): T {
  try {
    const cleaned = cleanJsonResponse(content);
    return JSON.parse(cleaned) as T;
  } catch (error) {
    log.warn("[MagicEngine] Failed to parse JSON response", {
      error,
      content: content.substring(0, 200),
    });
    return fallback;
  }
}

// ============================================================================
// Core Engine Functions
// ============================================================================

/**
 * Generate a single field value using AI
 */
export async function generateField(request: GenerateFieldRequest): Promise<GenerateFieldResponse> {
  const startTime = Date.now();
  let tokensUsed = 0;

  try {
    log.info("[MagicEngine] Generating single field", {
      fieldType: request.fieldType,
      contentType: request.context.contentType,
      entityName: request.context.entityName,
    });

    const providers = getAllUnifiedProviders();
    if (providers.length === 0) {
      return {
        success: false,
        value: null,
        confidence: 0,
        tokensUsed: 0,
        processingTimeMs: Date.now() - startTime,
        error: "No AI providers available",
      };
    }

    const provider = providers[0];
    const prompt = buildSingleFieldPrompt(request.fieldType, request.context);

    const result = await provider.generateCompletion({
      messages: [
        {
          role: "system",
          content: "You are an expert travel content writer. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 2000,
      responseFormat: { type: "json_object" },
    });

    tokensUsed = Math.ceil(prompt.length / 4) + Math.ceil(result.content.length / 4);

    const parsed = parseJsonResponse(result.content, {
      value: null,
      confidence: 0,
      alternatives: [],
    });

    return {
      success: true,
      value: parsed.value,
      confidence: parsed.confidence || 80,
      alternatives: parsed.alternatives,
      tokensUsed,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    log.error("[MagicEngine] Field generation failed", error);
    return {
      success: false,
      value: null,
      confidence: 0,
      tokensUsed,
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate all fields for a content type
 */
export async function generateAllFields(
  request: GenerateAllFieldsRequest
): Promise<GenerateAllFieldsResponse> {
  const startTime = Date.now();
  let tokensUsed = 0;

  try {
    log.info("[MagicEngine] Generating all fields", {
      contentType: request.contentType,
      input: request.input,
      mode: request.mode,
    });

    const providers = getAllUnifiedProviders();
    if (providers.length === 0) {
      return {
        success: false,
        fields: {},
        metadata: {
          sources: [],
          confidence: 0,
          tokensUsed: 0,
          processingTimeMs: Date.now() - startTime,
        },
        error: "No AI providers available",
      };
    }

    const provider = providers[0];
    const model = getModelForMode(request.mode);
    const prompt = buildAllFieldsPrompt(request);

    const maxTokens = request.mode === "premium" ? 8000 : request.mode === "full" ? 4000 : 2000;

    const result = await provider.generateCompletion({
      messages: [
        {
          role: "system",
          content: "You are an expert travel content writer. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      model,
      temperature: request.mode === "premium" ? 0.8 : 0.7,
      maxTokens,
      responseFormat: { type: "json_object" },
    });

    tokensUsed = Math.ceil(prompt.length / 4) + Math.ceil(result.content.length / 4);

    const parsed = parseJsonResponse(result.content, {
      fields: {},
      sources: [],
      confidence: 0,
    });

    return {
      success: true,
      fields: parsed.fields || {},
      metadata: {
        sources: parsed.sources || ["AI Knowledge Base"],
        confidence: parsed.confidence || 80,
        tokensUsed,
        processingTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    log.error("[MagicEngine] All fields generation failed", error);
    return {
      success: false,
      fields: {},
      metadata: {
        sources: [],
        confidence: 0,
        tokensUsed,
        processingTimeMs: Date.now() - startTime,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate specific fields in batch
 */
export async function generateBatchFields(
  request: GenerateBatchFieldsRequest
): Promise<GenerateBatchFieldsResponse> {
  const startTime = Date.now();

  try {
    log.info("[MagicEngine] Generating batch fields", {
      contentType: request.contentType,
      entityName: request.entityName,
      fields: request.fields,
    });

    if (request.fields.length === 0) {
      return {
        success: true,
        fields: {},
      };
    }

    const providers = getAllUnifiedProviders();
    if (providers.length === 0) {
      return {
        success: false,
        fields: {},
        error: "No AI providers available",
      };
    }

    const provider = providers[0];
    const prompt = buildBatchFieldsPrompt(request);

    const result = await provider.generateCompletion({
      messages: [
        {
          role: "system",
          content: "You are an expert travel content writer. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 4000,
      responseFormat: { type: "json_object" },
    });

    const parsed = parseJsonResponse(result.content, { fields: {} });

    log.info("[MagicEngine] Batch generation completed", {
      fieldsGenerated: Object.keys(parsed.fields || {}).length,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      success: true,
      fields: parsed.fields || {},
    };
  } catch (error) {
    log.error("[MagicEngine] Batch field generation failed", error);
    return {
      success: false,
      fields: {},
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get available field definitions for a content type
 */
export function getFieldDefinitions(
  contentType: ContentType
): Record<string, { prompt: string; type: string }> | null {
  return FIELD_DEFINITIONS[contentType] || null;
}

/**
 * Get all supported content types
 */
export function getSupportedContentTypes(): ContentType[] {
  return Object.keys(FIELD_DEFINITIONS) as ContentType[];
}
