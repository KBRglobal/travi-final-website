/**
 * Octypo Magic Engine
 * Server-side AI that powers all Magic buttons
 *
 * @example
 * ```typescript
 * import { getMagicEngine, generateField, generateAll, generateBatch } from './server/octypo/magic';
 *
 * // Single field generation
 * const result = await generateField('metaTitle', {
 *   entityName: 'Burj Khalifa',
 *   entityType: 'attraction',
 *   destination: 'Dubai',
 * });
 *
 * // Generate all fields for content type
 * const allFields = await generateAll('attraction', {
 *   entityName: 'Burj Khalifa',
 *   entityType: 'attraction',
 *   destination: 'Dubai',
 * });
 *
 * // Generate specific fields
 * const batch = await generateBatch('attraction', 'Burj Khalifa', ['metaTitle', 'metaDescription', 'slug']);
 * ```
 */

// Main engine
export {
  MagicEngine,
  getMagicEngine,
  generateField,
  generateAll,
  generateBatch,
  type ContentType,
  type GenerationMode,
  type MagicFieldInput,
  type MagicGenerateResult,
  type MagicGenerateAllResult,
  type MagicBatchResult,
} from "./magic-engine";

// Field generators
export {
  generateTitle,
  generateDescription,
  generateMetaTitle,
  generateMetaDescription,
  generateSlug,
  generateCoordinates,
  generateFAQs,
  generateSocialFacebook,
  generateSocialTwitter,
  generateHighlights,
  generateAmenities,
  generatePriceRange,
  generateBatchFields,
  fieldGenerators,
  type GeneratorContext,
  type GeneratorResult,
  type BatchGeneratorResult,
  type FieldGeneratorName,
} from "./field-generators";

// Prompts
export {
  getPromptForField,
  getBatchGenerationPrompt,
  getTitlePrompt,
  getDescriptionPrompt,
  getMetaTitlePrompt,
  getMetaDescriptionPrompt,
  getSlugPrompt,
  getCoordinatesPrompt,
  getFAQsPrompt,
  getSocialFacebookPrompt,
  getSocialTwitterPrompt,
  getHighlightsPrompt,
  getAmenitiesPrompt,
  getPriceRangePrompt,
  type PromptContext,
  type FieldType,
} from "./prompts";

// Validators
export {
  validateTitle,
  validateDescription,
  validateMetaTitle,
  validateMetaDescription,
  validateSlug,
  validateFAQs,
  validateCoordinates,
  validateTwitterContent,
  validateFacebookContent,
  validatePriceRange,
  validateStringArray,
  validateGeneratedContent,
  BANNED_PHRASES,
  type ValidationResult,
  type FAQValidationResult,
} from "./validators";
