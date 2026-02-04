/**
 * Octypo Magic Engine
 * Server-side AI that powers all Magic buttons
 *
 * Core Functions:
 * - generateField: Generate a single field
 * - generateAll: Generate all fields for a content type
 * - generateBatch: Generate multiple specific fields
 */

import { createLogger } from "../../lib/logger";
import {
  fieldGenerators,
  generateBatchFields,
  type GeneratorContext,
  type GeneratorResult,
  type BatchGeneratorResult,
  type FieldGeneratorName,
} from "./field-generators";
import { validateGeneratedContent } from "./validators";
import type { FieldType, PromptContext } from "./prompts";

const logger = createLogger("magic-engine");

// ============================================================================
// Types
// ============================================================================

export type ContentType =
  | "attraction"
  | "hotel"
  | "article"
  | "dining"
  | "district"
  | "transport"
  | "event"
  | "itinerary"
  | "landing_page";

export type GenerationMode = "create" | "enhance" | "translate" | "seo-optimize";

export interface MagicFieldInput {
  entityName: string;
  entityType: ContentType;
  destination?: string;
  category?: string;
  existingTitle?: string;
  existingDescription?: string;
  keywords?: string[];
  targetAudience?: string[];
  tone?: "professional" | "friendly" | "luxury" | "adventurous" | "informative";
  locale?: string;
  additionalContext?: Record<string, unknown>;
}

export interface MagicGenerateResult<T> {
  success: boolean;
  data?: T;
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  metadata: {
    provider?: string;
    model?: string;
    tokensUsed?: number;
    latencyMs: number;
    retries?: number;
  };
  error?: string;
}

export interface MagicGenerateAllResult {
  success: boolean;
  fields: Record<string, unknown>;
  validations: Record<
    string,
    {
      valid: boolean;
      errors: string[];
      warnings: string[];
    }
  >;
  metadata: {
    provider?: string;
    model?: string;
    totalLatencyMs: number;
    fieldsGenerated: number;
    fieldsFailed: number;
  };
  errors?: Record<string, string>;
}

export interface MagicBatchResult {
  success: boolean;
  results: Record<
    string,
    {
      success: boolean;
      data?: unknown;
      validation?: {
        valid: boolean;
        errors: string[];
        warnings: string[];
      };
      error?: string;
    }
  >;
  metadata: {
    provider?: string;
    model?: string;
    totalLatencyMs: number;
    successful: number;
    failed: number;
  };
}

// ============================================================================
// Field Type Mapping by Content Type
// ============================================================================

const CONTENT_TYPE_FIELDS: Record<ContentType, FieldType[]> = {
  attraction: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "highlights",
    "coordinates",
    "priceRange",
    "socialFacebook",
    "socialTwitter",
  ],
  hotel: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "highlights",
    "amenities",
    "coordinates",
    "priceRange",
    "socialFacebook",
    "socialTwitter",
  ],
  article: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "highlights",
    "socialFacebook",
    "socialTwitter",
  ],
  dining: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "highlights",
    "amenities",
    "coordinates",
    "priceRange",
    "socialFacebook",
    "socialTwitter",
  ],
  district: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "highlights",
    "coordinates",
    "socialFacebook",
    "socialTwitter",
  ],
  transport: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "highlights",
    "priceRange",
  ],
  event: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "highlights",
    "coordinates",
    "priceRange",
    "socialFacebook",
    "socialTwitter",
  ],
  itinerary: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "highlights",
    "priceRange",
    "socialFacebook",
    "socialTwitter",
  ],
  landing_page: [
    "title",
    "description",
    "metaTitle",
    "metaDescription",
    "slug",
    "faqs",
    "socialFacebook",
    "socialTwitter",
  ],
};

// ============================================================================
// Magic Engine Class
// ============================================================================

export class MagicEngine {
  private defaultLocale: string = "en";

  constructor(options?: { defaultLocale?: string }) {
    if (options?.defaultLocale) {
      this.defaultLocale = options.defaultLocale;
    }
  }

  /**
   * Generate a single field
   */
  async generateField<T = unknown>(
    fieldType: FieldType,
    input: MagicFieldInput
  ): Promise<MagicGenerateResult<T>> {
    const startTime = Date.now();

    logger.info(
      { fieldType, entityName: input.entityName, entityType: input.entityType },
      "Generating field"
    );

    const context: GeneratorContext = {
      entityName: input.entityName,
      entityType: input.entityType,
      destination: input.destination,
      category: input.category,
      existingTitle: input.existingTitle,
      existingDescription: input.existingDescription,
      keywords: input.keywords,
      targetAudience: input.targetAudience,
      tone: input.tone,
      locale: input.locale || this.defaultLocale,
      additionalContext: input.additionalContext,
      retryOnValidationFail: true,
      maxRetries: 3,
    };

    const generator = fieldGenerators[fieldType as FieldGeneratorName];
    if (!generator) {
      return {
        success: false,
        error: `Unknown field type: ${fieldType}`,
        metadata: { latencyMs: Date.now() - startTime },
      };
    }

    try {
      const result = (await generator(context)) as GeneratorResult<T>;

      logger.info(
        {
          fieldType,
          success: result.success,
          provider: result.provider,
          latencyMs: result.latencyMs,
        },
        "Field generation complete"
      );

      return {
        success: result.success,
        data: result.data,
        validation: result.validation
          ? {
              valid: result.validation.valid,
              errors: result.validation.errors,
              warnings: result.validation.warnings,
            }
          : undefined,
        metadata: {
          provider: result.provider,
          model: result.model,
          tokensUsed: result.tokensUsed,
          latencyMs: result.latencyMs || Date.now() - startTime,
          retries: result.retries,
        },
        error: result.error,
      };
    } catch (error) {
      logger.error({ fieldType, error }, "Field generation failed");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: { latencyMs: Date.now() - startTime },
      };
    }
  }

  /**
   * Generate all fields for a content type
   */
  async generateAll(
    contentType: ContentType,
    input: MagicFieldInput,
    mode: GenerationMode = "create"
  ): Promise<MagicGenerateAllResult> {
    const startTime = Date.now();
    const fields = CONTENT_TYPE_FIELDS[contentType] || [];

    logger.info(
      { contentType, entityName: input.entityName, mode, fieldCount: fields.length },
      "Generating all fields"
    );

    // Filter fields based on mode
    let fieldsToGenerate = [...fields];
    if (mode === "seo-optimize") {
      fieldsToGenerate = fields.filter(f =>
        ["metaTitle", "metaDescription", "slug", "faqs"].includes(f)
      );
    } else if (mode === "enhance") {
      // In enhance mode, skip fields that already exist
      if (input.existingTitle) {
        fieldsToGenerate = fieldsToGenerate.filter(f => f !== "title");
      }
      if (input.existingDescription) {
        fieldsToGenerate = fieldsToGenerate.filter(f => f !== "description");
      }
    }

    const context: GeneratorContext = {
      entityName: input.entityName,
      entityType: contentType,
      destination: input.destination,
      category: input.category,
      existingTitle: input.existingTitle,
      existingDescription: input.existingDescription,
      keywords: input.keywords,
      targetAudience: input.targetAudience,
      tone: input.tone,
      locale: input.locale || this.defaultLocale,
      additionalContext: input.additionalContext,
      retryOnValidationFail: true,
      maxRetries: 2,
    };

    try {
      // Use batch generation for efficiency
      const batchResult: BatchGeneratorResult = await generateBatchFields(
        context,
        fieldsToGenerate
      );

      const validations: Record<string, { valid: boolean; errors: string[]; warnings: string[] }> =
        {};
      const errors: Record<string, string> = {};
      let fieldsGenerated = 0;
      let fieldsFailed = 0;

      for (const field of fieldsToGenerate) {
        const validation = batchResult.validations[field];
        if (validation) {
          validations[field] = {
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
          };
        }

        if (batchResult.fields[field] !== undefined) {
          fieldsGenerated++;
        } else {
          fieldsFailed++;
          errors[field] = "Field not generated";
        }
      }

      logger.info(
        {
          contentType,
          fieldsGenerated,
          fieldsFailed,
          latencyMs: batchResult.latencyMs,
        },
        "All fields generation complete"
      );

      return {
        success: batchResult.success && fieldsFailed === 0,
        fields: batchResult.fields as Record<string, unknown>,
        validations,
        metadata: {
          provider: batchResult.provider,
          model: batchResult.model,
          totalLatencyMs: batchResult.latencyMs || Date.now() - startTime,
          fieldsGenerated,
          fieldsFailed,
        },
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error({ contentType, error }, "All fields generation failed");
      return {
        success: false,
        fields: {},
        validations: {},
        metadata: {
          totalLatencyMs: Date.now() - startTime,
          fieldsGenerated: 0,
          fieldsFailed: fieldsToGenerate.length,
        },
        errors: { _all: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Generate multiple specific fields
   */
  async generateBatch(
    contentType: ContentType,
    entityName: string,
    fields: FieldType[],
    options?: Partial<MagicFieldInput>
  ): Promise<MagicBatchResult> {
    const startTime = Date.now();

    logger.info({ contentType, entityName, fieldCount: fields.length }, "Generating batch fields");

    const input: MagicFieldInput = {
      entityName,
      entityType: contentType,
      ...options,
    };

    const results: Record<
      string,
      {
        success: boolean;
        data?: unknown;
        validation?: { valid: boolean; errors: string[]; warnings: string[] };
        error?: string;
      }
    > = {};
    let successful = 0;
    let failed = 0;
    let provider: string | undefined;
    let model: string | undefined;

    // Run generators for each field
    for (const field of fields) {
      const result = await this.generateField(field, input);
      provider = provider || result.metadata.provider;
      model = model || result.metadata.model;

      results[field] = {
        success: result.success,
        data: result.data,
        validation: result.validation,
        error: result.error,
      };

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    logger.info(
      { contentType, successful, failed, latencyMs: Date.now() - startTime },
      "Batch generation complete"
    );

    return {
      success: failed === 0,
      results,
      metadata: {
        provider,
        model,
        totalLatencyMs: Date.now() - startTime,
        successful,
        failed,
      },
    };
  }

  /**
   * Validate existing content
   */
  validateContent(content: {
    title?: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
    faqs?: Array<{ question: string; answer: string }>;
    highlights?: string[];
    amenities?: string[];
    coordinates?: { lat: number; lng: number };
    priceRange?: string;
    twitterContent?: string;
    facebookContent?: string;
  }): {
    valid: boolean;
    results: Record<string, { valid: boolean; errors: string[]; warnings: string[] }>;
    errorCount: number;
    warningCount: number;
  } {
    const result = validateGeneratedContent(content);

    // Transform the results to a simpler format
    const simplifiedResults: Record<
      string,
      { valid: boolean; errors: string[]; warnings: string[] }
    > = {};

    for (const [key, value] of Object.entries(result.results)) {
      simplifiedResults[key] = {
        valid: value.valid,
        errors: value.errors,
        warnings: value.warnings,
      };
    }

    return {
      valid: result.valid,
      results: simplifiedResults,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
    };
  }

  /**
   * Get available fields for a content type
   */
  getFieldsForContentType(contentType: ContentType): FieldType[] {
    return CONTENT_TYPE_FIELDS[contentType] || [];
  }

  /**
   * Get all supported content types
   */
  getSupportedContentTypes(): ContentType[] {
    return Object.keys(CONTENT_TYPE_FIELDS) as ContentType[];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let magicEngineInstance: MagicEngine | null = null;

export function getMagicEngine(): MagicEngine {
  if (!magicEngineInstance) {
    magicEngineInstance = new MagicEngine();
  }
  return magicEngineInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate a single field - convenience function
 */
export async function generateField<T = unknown>(
  fieldType: FieldType,
  input: MagicFieldInput
): Promise<MagicGenerateResult<T>> {
  const engine = getMagicEngine();
  return engine.generateField<T>(fieldType, input);
}

/**
 * Generate all fields for a content type - convenience function
 */
export async function generateAll(
  contentType: ContentType,
  input: MagicFieldInput,
  mode: GenerationMode = "create"
): Promise<MagicGenerateAllResult> {
  const engine = getMagicEngine();
  return engine.generateAll(contentType, input, mode);
}

/**
 * Generate multiple specific fields - convenience function
 */
export async function generateBatch(
  contentType: ContentType,
  entityName: string,
  fields: FieldType[],
  options?: Partial<MagicFieldInput>
): Promise<MagicBatchResult> {
  const engine = getMagicEngine();
  return engine.generateBatch(contentType, entityName, fields, options);
}

// ============================================================================
// Exports
// ============================================================================

export { type FieldType, type PromptContext } from "./prompts";
export { type GeneratorContext, type GeneratorResult } from "./field-generators";
export {
  validateMetaTitle,
  validateMetaDescription,
  validateSlug,
  validateFAQs,
  validateCoordinates,
  validateTwitterContent,
  validateFacebookContent,
  validatePriceRange,
  validateStringArray,
  BANNED_PHRASES,
} from "./validators";
