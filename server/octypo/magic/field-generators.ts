/**
 * Octypo Magic Engine - Field Generators
 * Specific generators for each field type
 */

import {
  getAllUnifiedProviders,
  markProviderFailed,
  markProviderSuccess,
  type UnifiedAIProvider,
  type AICompletionResult,
} from "../../ai/providers";
import { createLogger } from "../../lib/logger";
import {
  getPromptForField,
  getBatchGenerationPrompt,
  type PromptContext,
  type FieldType,
} from "./prompts";
import {
  validateTitle,
  validateDescription,
  validateMetaTitle,
  validateMetaDescription,
  validateSlug,
  validateFAQs,
  validateCoordinates,
  validateTwitterContent,
  validateFacebookContent,
  validateStringArray,
  validatePriceRange,
  type ValidationResult,
  type FAQValidationResult,
} from "./validators";

const logger = createLogger("magic-field-generators");

// ============================================================================
// Types
// ============================================================================

export interface GeneratorContext extends PromptContext {
  retryOnValidationFail?: boolean;
  maxRetries?: number;
}

export interface GeneratorResult<T> {
  success: boolean;
  data?: T;
  validation?: ValidationResult | FAQValidationResult;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  latencyMs?: number;
  error?: string;
  retries?: number;
}

interface ParsedJSON {
  [key: string]: unknown;
}

// ============================================================================
// Core Generation Function
// ============================================================================

async function generateWithProvider(
  provider: UnifiedAIProvider,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<AICompletionResult> {
  return provider.generateCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    maxTokens: 4096,
    responseFormat: { type: "json_object" },
  });
}

async function generateWithFallback(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<AICompletionResult & { latencyMs: number }> {
  const providers = getAllUnifiedProviders();

  if (providers.length === 0) {
    throw new Error("No AI providers available");
  }

  const startTime = Date.now();
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      logger.debug({ provider: provider.name }, "Attempting generation with provider");
      const result = await generateWithProvider(provider, systemPrompt, userPrompt, temperature);
      markProviderSuccess(provider.name);
      return {
        ...result,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`${provider.name}: ${errorMessage}`);
      logger.warn({ provider: provider.name, error: errorMessage }, "Provider failed");

      // Check for rate limiting or credit issues
      if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429") ||
        errorMessage.includes("quota")
      ) {
        markProviderFailed(provider.name, "rate_limited");
      } else if (
        errorMessage.includes("insufficient") ||
        errorMessage.includes("credit") ||
        errorMessage.includes("balance")
      ) {
        markProviderFailed(provider.name, "no_credits");
      }
    }
  }

  throw new Error(`All providers failed: ${errors.join("; ")}`);
}

function parseJSON(content: string): ParsedJSON {
  // Try to parse directly
  try {
    return JSON.parse(content);
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Failed to parse JSON from response");
      }
    }
    throw new Error("No JSON found in response");
  }
}

// ============================================================================
// Title Generator
// ============================================================================

export async function generateTitle(context: GeneratorContext): Promise<GeneratorResult<string>> {
  const startTime = Date.now();
  let retries = 0;
  const maxRetries = context.maxRetries ?? 2;

  while (retries <= maxRetries) {
    try {
      const { system, user } = getPromptForField("title", context);
      const result = await generateWithFallback(system, user);
      const parsed = parseJSON(result.content);
      const title = parsed.title as string;

      if (!title) {
        throw new Error("No title in response");
      }

      const validation = validateTitle(title);

      if (!validation.valid && context.retryOnValidationFail && retries < maxRetries) {
        retries++;
        logger.warn({ errors: validation.errors }, "Title validation failed, retrying");
        continue;
      }

      return {
        success: true,
        data: validation.sanitized || title,
        validation,
        provider: result.provider,
        model: result.model,
        latencyMs: Date.now() - startTime,
        retries,
      };
    } catch (error) {
      if (retries >= maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startTime,
          retries,
        };
      }
      retries++;
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
    latencyMs: Date.now() - startTime,
    retries,
  };
}

// ============================================================================
// Description Generator
// ============================================================================

export async function generateDescription(
  context: GeneratorContext
): Promise<GeneratorResult<string>> {
  const startTime = Date.now();
  let retries = 0;
  const maxRetries = context.maxRetries ?? 2;

  while (retries <= maxRetries) {
    try {
      const { system, user } = getPromptForField("description", context);
      const result = await generateWithFallback(system, user);
      const parsed = parseJSON(result.content);
      const description = parsed.description as string;

      if (!description) {
        throw new Error("No description in response");
      }

      const validation = validateDescription(description);

      if (!validation.valid && context.retryOnValidationFail && retries < maxRetries) {
        retries++;
        logger.warn({ errors: validation.errors }, "Description validation failed, retrying");
        continue;
      }

      return {
        success: true,
        data: validation.sanitized || description,
        validation,
        provider: result.provider,
        model: result.model,
        latencyMs: Date.now() - startTime,
        retries,
      };
    } catch (error) {
      if (retries >= maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startTime,
          retries,
        };
      }
      retries++;
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
    latencyMs: Date.now() - startTime,
    retries,
  };
}

// ============================================================================
// Meta Title Generator
// ============================================================================

export async function generateMetaTitle(
  context: GeneratorContext
): Promise<GeneratorResult<string>> {
  const startTime = Date.now();
  let retries = 0;
  const maxRetries = context.maxRetries ?? 3; // More retries for strict length requirement

  while (retries <= maxRetries) {
    try {
      const { system, user } = getPromptForField("metaTitle", context);
      const result = await generateWithFallback(system, user, 0.6); // Lower temperature for consistency
      const parsed = parseJSON(result.content);
      const metaTitle = parsed.metaTitle as string;

      if (!metaTitle) {
        throw new Error("No metaTitle in response");
      }

      const validation = validateMetaTitle(metaTitle, { entityName: context.entityName });

      // For meta titles, we MUST meet the length requirement
      if (!validation.valid && retries < maxRetries) {
        retries++;
        logger.warn(
          { errors: validation.errors, length: metaTitle.length },
          "Meta title validation failed, retrying"
        );
        continue;
      }

      return {
        success: true,
        data: validation.sanitized || metaTitle,
        validation,
        provider: result.provider,
        model: result.model,
        latencyMs: Date.now() - startTime,
        retries,
      };
    } catch (error) {
      if (retries >= maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startTime,
          retries,
        };
      }
      retries++;
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
    latencyMs: Date.now() - startTime,
    retries,
  };
}

// ============================================================================
// Meta Description Generator
// ============================================================================

export async function generateMetaDescription(
  context: GeneratorContext
): Promise<GeneratorResult<string>> {
  const startTime = Date.now();
  let retries = 0;
  const maxRetries = context.maxRetries ?? 3; // More retries for strict length requirement

  while (retries <= maxRetries) {
    try {
      const { system, user } = getPromptForField("metaDescription", context);
      const result = await generateWithFallback(system, user, 0.6);
      const parsed = parseJSON(result.content);
      const metaDescription = parsed.metaDescription as string;

      if (!metaDescription) {
        throw new Error("No metaDescription in response");
      }

      const validation = validateMetaDescription(metaDescription, {
        entityName: context.entityName,
        requireCTA: true,
      });

      // For meta descriptions, we want the 150-160 char range
      if (!validation.valid && retries < maxRetries) {
        retries++;
        logger.warn(
          { errors: validation.errors, length: metaDescription.length },
          "Meta description validation failed, retrying"
        );
        continue;
      }

      return {
        success: true,
        data: validation.sanitized || metaDescription,
        validation,
        provider: result.provider,
        model: result.model,
        latencyMs: Date.now() - startTime,
        retries,
      };
    } catch (error) {
      if (retries >= maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startTime,
          retries,
        };
      }
      retries++;
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
    latencyMs: Date.now() - startTime,
    retries,
  };
}

// ============================================================================
// Slug Generator
// ============================================================================

export async function generateSlug(context: GeneratorContext): Promise<GeneratorResult<string>> {
  const startTime = Date.now();

  try {
    const { system, user } = getPromptForField("slug", context);
    const result = await generateWithFallback(system, user, 0.3); // Low temperature for consistency
    const parsed = parseJSON(result.content);
    const slug = parsed.slug as string;

    if (!slug) {
      throw new Error("No slug in response");
    }

    const validation = validateSlug(slug);

    return {
      success: true,
      data: validation.sanitized || slug,
      validation,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Coordinates Generator
// ============================================================================

export async function generateCoordinates(
  context: GeneratorContext
): Promise<GeneratorResult<{ lat: number; lng: number }>> {
  const startTime = Date.now();

  try {
    const { system, user } = getPromptForField("coordinates", context);
    const result = await generateWithFallback(system, user, 0.3);
    const parsed = parseJSON(result.content);
    const coordinates = parsed.coordinates as { lat: number; lng: number };

    if (
      !coordinates ||
      typeof coordinates.lat !== "number" ||
      typeof coordinates.lng !== "number"
    ) {
      throw new Error("Invalid coordinates in response");
    }

    const validation = validateCoordinates(coordinates);

    return {
      success: validation.valid,
      data: coordinates,
      validation,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// FAQs Generator
// ============================================================================

export async function generateFAQs(
  context: GeneratorContext
): Promise<GeneratorResult<Array<{ question: string; answer: string }>>> {
  const startTime = Date.now();
  let retries = 0;
  const maxRetries = context.maxRetries ?? 2;

  while (retries <= maxRetries) {
    try {
      const { system, user } = getPromptForField("faqs", context);
      const result = await generateWithFallback(system, user);
      const parsed = parseJSON(result.content);
      const faqs = parsed.faqs as Array<{ question: string; answer: string }>;

      if (!faqs || !Array.isArray(faqs)) {
        throw new Error("No FAQs array in response");
      }

      const validation = validateFAQs(faqs, { minCount: 5, maxCount: 15 });

      if (!validation.valid && context.retryOnValidationFail && retries < maxRetries) {
        retries++;
        logger.warn({ errors: validation.errors }, "FAQ validation failed, retrying");
        continue;
      }

      return {
        success: true,
        data: validation.validFaqs,
        validation,
        provider: result.provider,
        model: result.model,
        latencyMs: Date.now() - startTime,
        retries,
      };
    } catch (error) {
      if (retries >= maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startTime,
          retries,
        };
      }
      retries++;
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
    latencyMs: Date.now() - startTime,
    retries,
  };
}

// ============================================================================
// Social Facebook Generator
// ============================================================================

export async function generateSocialFacebook(
  context: GeneratorContext
): Promise<GeneratorResult<string>> {
  const startTime = Date.now();

  try {
    const { system, user } = getPromptForField("socialFacebook", context);
    const result = await generateWithFallback(system, user, 0.8); // Higher temperature for creativity
    const parsed = parseJSON(result.content);
    const facebookContent = parsed.facebookContent as string;

    if (!facebookContent) {
      throw new Error("No facebookContent in response");
    }

    const validation = validateFacebookContent(facebookContent);

    return {
      success: true,
      data: validation.sanitized || facebookContent,
      validation,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Social Twitter Generator
// ============================================================================

export async function generateSocialTwitter(
  context: GeneratorContext
): Promise<GeneratorResult<string>> {
  const startTime = Date.now();
  let retries = 0;
  const maxRetries = context.maxRetries ?? 3; // More retries for strict 280 char limit

  while (retries <= maxRetries) {
    try {
      const { system, user } = getPromptForField("socialTwitter", context);
      const result = await generateWithFallback(system, user, 0.7);
      const parsed = parseJSON(result.content);
      const twitterContent = parsed.twitterContent as string;

      if (!twitterContent) {
        throw new Error("No twitterContent in response");
      }

      const validation = validateTwitterContent(twitterContent);

      if (!validation.valid && retries < maxRetries) {
        retries++;
        logger.warn(
          { errors: validation.errors, length: twitterContent.length },
          "Twitter content validation failed, retrying"
        );
        continue;
      }

      return {
        success: true,
        data: validation.sanitized || twitterContent,
        validation,
        provider: result.provider,
        model: result.model,
        latencyMs: Date.now() - startTime,
        retries,
      };
    } catch (error) {
      if (retries >= maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startTime,
          retries,
        };
      }
      retries++;
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
    latencyMs: Date.now() - startTime,
    retries,
  };
}

// ============================================================================
// Highlights Generator
// ============================================================================

export async function generateHighlights(
  context: GeneratorContext
): Promise<GeneratorResult<string[]>> {
  const startTime = Date.now();

  try {
    const { system, user } = getPromptForField("highlights", context);
    const result = await generateWithFallback(system, user);
    const parsed = parseJSON(result.content);
    const highlights = parsed.highlights as string[];

    if (!highlights || !Array.isArray(highlights)) {
      throw new Error("No highlights array in response");
    }

    const validation = validateStringArray(highlights, "highlights", { minCount: 3, maxCount: 10 });

    return {
      success: validation.valid,
      data: highlights.filter(h => typeof h === "string" && h.trim().length > 0),
      validation,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Amenities Generator
// ============================================================================

export async function generateAmenities(
  context: GeneratorContext
): Promise<GeneratorResult<string[]>> {
  const startTime = Date.now();

  try {
    const { system, user } = getPromptForField("amenities", context);
    const result = await generateWithFallback(system, user, 0.5);
    const parsed = parseJSON(result.content);
    const amenities = parsed.amenities as string[];

    if (!amenities || !Array.isArray(amenities)) {
      throw new Error("No amenities array in response");
    }

    const validation = validateStringArray(amenities, "amenities", { minCount: 5, maxCount: 20 });

    return {
      success: validation.valid,
      data: amenities.filter(a => typeof a === "string" && a.trim().length > 0),
      validation,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Price Range Generator
// ============================================================================

export async function generatePriceRange(
  context: GeneratorContext
): Promise<GeneratorResult<string>> {
  const startTime = Date.now();

  try {
    const { system, user } = getPromptForField("priceRange", context);
    const result = await generateWithFallback(system, user, 0.3);
    const parsed = parseJSON(result.content);
    const priceRange = parsed.priceRange as string;

    if (!priceRange) {
      throw new Error("No priceRange in response");
    }

    const validation = validatePriceRange(priceRange);

    return {
      success: true,
      data: validation.sanitized || priceRange,
      validation,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Batch Field Generator
// ============================================================================

export interface BatchGeneratorResult {
  success: boolean;
  fields: Partial<Record<FieldType, unknown>>;
  validations: Partial<Record<FieldType, ValidationResult | FAQValidationResult>>;
  provider?: string;
  model?: string;
  latencyMs: number;
  error?: string;
}

export async function generateBatchFields(
  context: GeneratorContext,
  fields: FieldType[]
): Promise<BatchGeneratorResult> {
  const startTime = Date.now();

  try {
    const { system, user } = getBatchGenerationPrompt(context, fields);
    const result = await generateWithFallback(system, user);
    const parsed = parseJSON(result.content);

    const generatedFields: Partial<Record<FieldType, unknown>> = {};
    const validations: Partial<Record<FieldType, ValidationResult | FAQValidationResult>> = {};

    // Process each field
    for (const field of fields) {
      const value = parsed[field];
      if (value !== undefined) {
        generatedFields[field] = value;

        // Run validation for each field
        switch (field) {
          case "title":
            validations[field] = validateTitle(value as string);
            generatedFields[field] = validations[field]?.sanitized || value;
            break;
          case "description":
            validations[field] = validateDescription(value as string);
            generatedFields[field] = validations[field]?.sanitized || value;
            break;
          case "metaTitle":
            validations[field] = validateMetaTitle(value as string, {
              entityName: context.entityName,
            });
            generatedFields[field] = validations[field]?.sanitized || value;
            break;
          case "metaDescription":
            validations[field] = validateMetaDescription(value as string, {
              entityName: context.entityName,
            });
            generatedFields[field] = validations[field]?.sanitized || value;
            break;
          case "slug":
            validations[field] = validateSlug(value as string);
            generatedFields[field] = validations[field]?.sanitized || value;
            break;
          case "faqs":
            validations[field] = validateFAQs(value as Array<{ question: string; answer: string }>);
            generatedFields[field] =
              (validations[field] as FAQValidationResult)?.validFaqs || value;
            break;
          case "highlights":
            validations[field] = validateStringArray(value as string[], "highlights", {
              minCount: 3,
            });
            break;
          case "amenities":
            validations[field] = validateStringArray(value as string[], "amenities", {
              minCount: 5,
            });
            break;
          case "coordinates":
            validations[field] = validateCoordinates(value as { lat: number; lng: number });
            break;
          case "socialTwitter":
            validations[field] = validateTwitterContent(value as string);
            generatedFields[field] = validations[field]?.sanitized || value;
            break;
          case "socialFacebook":
            validations[field] = validateFacebookContent(value as string);
            generatedFields[field] = validations[field]?.sanitized || value;
            break;
          case "priceRange":
            validations[field] = validatePriceRange(value as string);
            break;
        }
      }
    }

    return {
      success: true,
      fields: generatedFields,
      validations,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      fields: {},
      validations: {},
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Field Generator Map
// ============================================================================

export const fieldGenerators = {
  title: generateTitle,
  description: generateDescription,
  metaTitle: generateMetaTitle,
  metaDescription: generateMetaDescription,
  slug: generateSlug,
  coordinates: generateCoordinates,
  faqs: generateFAQs,
  socialFacebook: generateSocialFacebook,
  socialTwitter: generateSocialTwitter,
  highlights: generateHighlights,
  amenities: generateAmenities,
  priceRange: generatePriceRange,
} as const;

export type FieldGeneratorName = keyof typeof fieldGenerators;
