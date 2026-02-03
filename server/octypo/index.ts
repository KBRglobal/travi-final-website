/**
 * Octypo Module - Main Entry Point
 *
 * This module is designed for RSS/Article content generation.
 *
 * NOTE: Attraction content uses legacy functions below for backwards compatibility.
 * New attraction content should use:
 * - server/services/tiqets-background-generator.ts
 * - server/ai/attraction-description-generator.ts
 */

// Core types
export * from "./types";

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

  return orchestrator.generateAttractionContent(attraction);
}
