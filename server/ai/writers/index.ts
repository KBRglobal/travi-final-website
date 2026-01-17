/**
 * AI Writers Module
 * 
 * Virtual Newsroom system with 10 AI writers, each with unique personality and expertise
 */

// Export writer registry
export {
  AI_WRITERS,
  getWriterById,
  getWriterBySlug,
  getWritersByContentType,
  getActiveWriters,
  searchWritersByExpertise,
  type AIWriter,
} from "./writer-registry";

// Export writer engine
export {
  writerEngine,
  generateContent,
  generateTitles,
  generateIntro,
  rewriteInVoice,
  optimizeForSeo,
  type WriteContentResponse,
} from "./writer-engine";
export type WriteContentRequest = any;

// Export assignment system
export {
  assignmentSystem,
  assignWriter,
  getOptimalWriter,
  getBestWriters,
  createCollaboration,
  getWriterRecommendations,
  type AssignmentRequest,
  type Assignment,
} from "./assignment-system";

// Export prompts
export {
  getWriterSystemPrompt,
  getContentGenerationPrompt,
  getTitleGenerationPrompt,
  getIntroGenerationPrompt,
  getRewritePrompt,
  getVoiceValidationPrompt,
  getSeoOptimizationPrompt,
  getWriterGuidelines,
} from "./prompts";

// Export voice validator (SINGLE source of truth for voice validation)
export {
  voiceValidator,
  validateVoiceConsistency,
  getVoiceScore,
  type VoiceConsistencyResult,
} from "./voice-validator";

// Export content generator (primary entry point)
export {
  aiWritersContentGenerator,
  generate as generateWithWriter,
  recommendWriter,
  type ContentGenerationRequest,
  type ContentGenerationResult,
} from "./content-generator";
