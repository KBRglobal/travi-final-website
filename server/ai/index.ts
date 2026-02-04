/**
 * AI Module Main Entry Point
 *
 * This module provides AI-powered content generation for travel content.
 * It supports multiple AI providers (OpenAI, Gemini, OpenRouter) with automatic
 * fallback and cost optimization through tiered model selection.
 *
 * Architecture:
 * - providers.ts: AI client initialization and model configuration
 * - types.ts: TypeScript interfaces for all content types
 * - image-generation.ts: Multi-provider image generation (Flux, DALL-E)
 * - seo-tools.ts: SEO analysis and optimization
 * - prompts/: System prompts for each content type
 * - generators/: Content generation functions
 */

// ============================================================================
// Type Exports
// ============================================================================
export type {
  ContentTier,
  ModelConfig,
  ImageProvider,
  ImageGenerationConfig,
  GeneratedImage,
  ImageGenerationOptions,
  ContentImage,
  GeneratedHotelContent,
  GeneratedAttractionContent,
  GeneratedArticleContent,
  GeneratedDiningContent,
  GeneratedDistrictContent,
  GeneratedTransportContent,
  GeneratedEventContent,
  GeneratedItineraryContent,
} from "./types";

// ============================================================================
// Provider Exports
// ============================================================================
export {
  getValidOpenAIKey,
  getOpenAIClient,
  getAIClient,
  getOpenAIClientForImages,
  getModelForProvider,
  getContentTier,
  getModelConfig,
  getAllAIClients,
  getAllUnifiedProviders,
  markProviderFailed,
} from "./providers";

export type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  UnifiedAIProvider,
  AIProvider,
} from "./providers";

// ============================================================================
// Utility Exports
// ============================================================================
export { generateBlockId, generateSlug } from "./utils";

// ============================================================================
// Image Generation Exports
// ============================================================================
export {
  IMAGE_MASTER_PROMPT,
  generateImagePrompt,
  generateImage,
  generateContentImages,
} from "./image-generation";

// SEO tools removed - unused

// ============================================================================
// Research Analyzer Exports (Octopus Model) - DELETED
// Old system completely removed per user request
// ============================================================================

// ============================================================================
// Content Generators (from legacy file - to be modularized)
// ============================================================================
// Note: These are re-exported from the legacy ai-generator.ts
// for backwards compatibility. The generators themselves remain
// in the legacy file until full modularization is complete.
