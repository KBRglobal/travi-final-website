/**
 * Octypo Module - Main Entry Point
 * Complete content generation system ported from octypo-main
 */

export * from './types';

export { BaseAgent, AgentRegistry, MessageBus } from './agents/base-agent';
export { WriterAgent, initializeWriterAgents, getWriterForAttraction } from './agents/writer-agents';
export { ValidatorAgent, initializeValidatorAgents, getValidators } from './agents/validator-agents';

export { buildAttractionPrompt, buildCorrectionPrompt, AI_BANNED_PHRASES } from './prompts/content-prompts';

export { 
  AnswerCapsuleGenerator, 
  SchemaGenerator, 
  AEOValidator,
  answerCapsuleGenerator,
  schemaGenerator,
  aeoValidator,
} from './aeo/answer-capsule';

export { OctypoOrchestrator, getOctypoOrchestrator } from './orchestration/orchestrator';

export { ImageEngine, getImageEngine } from './image-engine';

import { OctypoOrchestrator } from './orchestration/orchestrator';
import { AttractionData, GenerationResult } from './types';

export async function generateAttractionWithOctypo(
  attraction: AttractionData
): Promise<GenerationResult> {
  const orchestrator = new OctypoOrchestrator({
    maxRetries: 1,         // No retries - just run fast
    qualityThreshold: 0,   // No quality threshold - just check 900 words minimum
  });
  
  return orchestrator.generateAttractionContent(attraction);
}
