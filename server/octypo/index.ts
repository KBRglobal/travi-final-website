/**
 * Octypo Module - Autonomous Content Intelligence System
 *
 * Zero-touch content pipeline:
 * RSS → Gate1 (Selection) → Writer → Gate2 (Approval) → Publish → 30 Languages
 *
 * Components:
 * - Config: Encrypted secrets management
 * - Gatekeeper: Intelligent content selection and approval
 * - RSS Reader: Feed aggregation and processing
 *
 * NOTE: Attraction content uses legacy functions below for backwards compatibility.
 * New attraction content should use:
 * - server/services/tiqets-background-generator.ts
 * - server/ai/attraction-description-generator.ts
 */

// Core types
export * from "./types";

// Configuration (encrypted secrets)
export { initializeOctypoConfig, loadSecretsToEnv, secretsExist } from "./config";

// Gatekeeper (Gate 1 & Gate 2)
export {
  runGatekeeperPipeline,
  initializeGatekeeper,
  getGate1Selector,
  getGate2Approver,
  getDeduplicationEngine,
  getGatekeeperOrchestrator,
} from "./gatekeeper";

// Agent system
export { BaseAgent, AgentRegistry, MessageBus } from "./agents/base-agent";
export {
  WriterAgent,
  initializeWriterAgents,
  getWriterForAttraction,
} from "./agents/writer-agents";
export {
  ValidatorAgent,
  initializeValidatorAgents,
  getValidators,
} from "./agents/validator-agents";

// AEO (Answer Engine Optimization)
export {
  AnswerCapsuleGenerator,
  SchemaGenerator,
  AEOValidator,
  answerCapsuleGenerator,
  schemaGenerator,
  aeoValidator,
} from "./aeo/answer-capsule";

// RSS system
export { rssReader, isSensitiveTopic, detectDestinationFromContent } from "./rss-reader";
export type { FeedItem, RSSFeedConfig, FetchResult } from "./rss-reader";

// Quality scoring
export { calculateQuality108Score, getGrade } from "./quality/quality-108";

// State management
export { octypoState } from "./state";

// Magic Engine - AI-powered field generation for Magic buttons
export {
  MagicEngine,
  getMagicEngine,
  generateField,
  generateAll,
  generateBatch,
  type ContentType as MagicContentType,
  type GenerationMode,
  type MagicFieldInput,
  type MagicGenerateResult,
  type MagicGenerateAllResult,
  type MagicBatchResult,
} from "./magic";
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
  type FieldType as MagicFieldType,
} from "./magic";
export {
  validateMetaTitle,
  validateMetaDescription,
  validateSlug,
  validateFAQs,
  validateCoordinates,
  BANNED_PHRASES,
} from "./magic";

// ============================================
// LEGACY EXPORTS FOR BACKWARDS COMPATIBILITY
// These are used by attraction content generation
// TODO: Migrate to server/ai/attraction-description-generator.ts
// ============================================

export { OctypoOrchestrator, getOctypoOrchestrator } from "./orchestration/orchestrator";
export {
  buildAttractionPrompt,
  buildCorrectionPrompt,
  AI_BANNED_PHRASES,
} from "./prompts/content-prompts";
export { ImageEngine, getImageEngine } from "./image-engine";

import { OctypoOrchestrator } from "./orchestration/orchestrator";

// Legacy types for attraction generation
export interface AttractionData {
  id: number;
  title: string;
  cityName: string;
  venueName?: string;
  duration?: string;
  primaryCategory?: string;
  secondaryCategories?: string[];
  languages?: string[];
  wheelchairAccess?: boolean;
  tiqetsDescription?: string;
  tiqetsHighlights?: string[];
  priceFrom?: number;
  rating?: number;
  reviewCount?: number;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

export interface GeneratedAttractionContent {
  introduction: string;
  whatToExpect: string;
  visitorTips: string;
  howToGetThere: string;
  faqs: Array<{ question: string; answer: string }>;
  answerCapsule: string;
  metaTitle: string;
  metaDescription: string;
  schemaPayload: Record<string, any>;
  honestLimitations: string[];
  sensoryDescriptions: string[];
}

export interface LegacyGenerationResult {
  success: boolean;
  content?: GeneratedAttractionContent;
  qualityScore?: any;
  quality108?: number | null;
  engineUsed: string;
  writerId: string;
  writerUsed?: string;
  validationResults: any[];
  retryCount: number;
  generationTimeMs: number;
  processingTimeMs?: number;
  linkProcessorResult?: any;
  error?: string;
  errors?: string[];
}

/**
 * @deprecated Use server/ai/attraction-description-generator.ts instead
 * This function is kept for backwards compatibility only
 */
export async function generateAttractionWithOctypo(
  attraction: AttractionData
): Promise<LegacyGenerationResult> {
  const orchestrator = new OctypoOrchestrator({
    maxRetries: 1,
    qualityThreshold: 0,
  });

  return orchestrator.generateAttractionContent(
    attraction as any
  ) as unknown as Promise<LegacyGenerationResult>;
}

// ============================================
// OCTYPO SYSTEM INITIALIZATION
// ============================================

/**
 * Initialize the complete Octypo system
 * Call this during server startup
 */
export async function initializeOctypo(): Promise<boolean> {
  // Step 1: Load encrypted secrets (if available)
  try {
    const { initializeOctypoConfig, secretsExist } = await import("./config");
    if (secretsExist()) {
      initializeOctypoConfig();
    }
  } catch (error) {
    // Secrets module not configured, using env vars - this is acceptable
  }

  // Step 2: Initialize RSS reader
  try {
    const { rssReader: rssReaderModule } = await import("./rss-reader");
    await rssReaderModule.initialize();
  } catch (error) {
    console.error("[Octypo] RSS reader initialization failed:", error);
  }

  // Step 3: Initialize Gatekeeper job handlers
  try {
    const { initializeGatekeeper } = await import("./gatekeeper");
    initializeGatekeeper();
  } catch (error) {
    console.error("[Octypo] Gatekeeper initialization failed:", error);
  }

  return true;
}

/**
 * Run the autonomous content pipeline
 * @param maxItems Maximum items to process in this run
 */
export async function runOctypoPipeline(maxItems: number = 10): Promise<void> {
  const { runGatekeeperPipeline } = await import("./gatekeeper");
  await runGatekeeperPipeline(maxItems);
}
