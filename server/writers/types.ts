/**
 * Writer Persona System - Type Definitions
 *
 * Feature flag: ENABLE_WRITER_PERSONAS=true
 */

export function isWriterPersonasEnabled(): boolean {
  return process.env.ENABLE_WRITER_PERSONAS === 'true';
}

/**
 * Available persona names.
 */
export type PersonaName =
  | 'journalist'
  | 'seo_expert'
  | 'travel_guide'
  | 'conversational'
  | 'authority'
  | 'default';

/**
 * Writing tone.
 */
export type WritingTone =
  | 'formal'
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'authoritative'
  | 'enthusiastic';

/**
 * Content structure style.
 */
export type StructureStyle =
  | 'news_article'
  | 'listicle'
  | 'guide'
  | 'conversation'
  | 'expert_analysis'
  | 'standard';

/**
 * Citation behavior.
 */
export type CitationBehavior =
  | 'inline_sources'
  | 'end_references'
  | 'minimal'
  | 'none';

/**
 * Writer persona definition.
 */
export interface WriterPersona {
  name: PersonaName;
  displayName: string;
  description: string;
  tone: WritingTone;
  structure: StructureStyle;
  depth: 'shallow' | 'moderate' | 'deep';
  citationBehavior: CitationBehavior;
  promptPrefix: string;
  promptSuffix: string;
  styleGuidelines: string[];
}

/**
 * Prompt context for generation.
 */
export interface PromptContext {
  topic: string;
  entityNames?: string[];
  keywords?: string[];
  targetWordCount?: number;
  contentType?: string;
  locale?: string;
  additionalInstructions?: string[];
}

/**
 * Built prompt ready for AI.
 */
export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  persona: PersonaName;
  context: PromptContext;
}
