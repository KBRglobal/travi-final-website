/**
 * Writer Persona System - Prompt Builder
 *
 * Builds AI prompts based on persona and context.
 */

import { WriterPersona, PromptContext, BuiltPrompt, PersonaName } from './types';
import { resolvePersona } from './resolver';

/**
 * Build a complete prompt for AI generation.
 */
export function buildPrompt(
  context: PromptContext,
  personaName?: string
): BuiltPrompt {
  const persona = resolvePersona(personaName, context);

  const systemPrompt = buildSystemPrompt(persona, context);
  const userPrompt = buildUserPrompt(persona, context);

  return {
    systemPrompt,
    userPrompt,
    persona: persona.name,
    context,
  };
}

/**
 * Build the system prompt.
 */
function buildSystemPrompt(persona: WriterPersona, context: PromptContext): string {
  const parts: string[] = [];

  // Persona introduction
  parts.push(persona.promptPrefix);
  parts.push('');

  // Tone guidance
  parts.push(`Writing Tone: ${formatTone(persona.tone)}`);
  parts.push(`Content Structure: ${formatStructure(persona.structure)}`);
  parts.push(`Depth Level: ${formatDepth(persona.depth)}`);
  parts.push('');

  // Style guidelines
  parts.push('Style Guidelines:');
  for (const guideline of persona.styleGuidelines) {
    parts.push(`- ${guideline}`);
  }
  parts.push('');

  // Citation behavior
  if (persona.citationBehavior !== 'none') {
    parts.push(`Citation Style: ${formatCitationBehavior(persona.citationBehavior)}`);
    parts.push('');
  }

  // Locale-specific instructions
  if (context.locale && context.locale !== 'en') {
    parts.push(`Language: Write in ${getLanguageName(context.locale)}`);
    parts.push('');
  }

  // Suffix
  parts.push(persona.promptSuffix);

  return parts.join('\n');
}

/**
 * Build the user prompt.
 */
function buildUserPrompt(persona: WriterPersona, context: PromptContext): string {
  const parts: string[] = [];

  // Main topic
  parts.push(`Write content about: ${context.topic}`);
  parts.push('');

  // Entity context
  if (context.entityNames && context.entityNames.length > 0) {
    parts.push(`Reference these entities: ${context.entityNames.join(', ')}`);
  }

  // Keywords
  if (context.keywords && context.keywords.length > 0) {
    parts.push(`Include these keywords naturally: ${context.keywords.join(', ')}`);
  }

  // Word count target
  if (context.targetWordCount) {
    parts.push(`Target word count: approximately ${context.targetWordCount} words`);
  }

  // Additional instructions
  if (context.additionalInstructions && context.additionalInstructions.length > 0) {
    parts.push('');
    parts.push('Additional requirements:');
    for (const instruction of context.additionalInstructions) {
      parts.push(`- ${instruction}`);
    }
  }

  return parts.join('\n');
}

/**
 * Format tone for display.
 */
function formatTone(tone: WriterPersona['tone']): string {
  const toneDescriptions: Record<typeof tone, string> = {
    formal: 'Formal and polished',
    professional: 'Professional and clear',
    casual: 'Casual and relaxed',
    friendly: 'Warm and friendly',
    authoritative: 'Confident and authoritative',
    enthusiastic: 'Energetic and enthusiastic',
  };
  return toneDescriptions[tone];
}

/**
 * Format structure for display.
 */
function formatStructure(structure: WriterPersona['structure']): string {
  const structureDescriptions: Record<typeof structure, string> = {
    news_article: 'Inverted pyramid (most important first)',
    listicle: 'Numbered or bulleted list format',
    guide: 'Step-by-step guide format',
    conversation: 'Flowing conversational narrative',
    expert_analysis: 'In-depth analysis with sections',
    standard: 'Standard article with introduction, body, conclusion',
  };
  return structureDescriptions[structure];
}

/**
 * Format depth for display.
 */
function formatDepth(depth: WriterPersona['depth']): string {
  const depthDescriptions: Record<typeof depth, string> = {
    shallow: 'Brief overview, key points only',
    moderate: 'Balanced depth with examples',
    deep: 'Comprehensive coverage with details',
  };
  return depthDescriptions[depth];
}

/**
 * Format citation behavior for display.
 */
function formatCitationBehavior(behavior: WriterPersona['citationBehavior']): string {
  const behaviorDescriptions: Record<typeof behavior, string> = {
    inline_sources: 'Cite sources inline (e.g., "According to...")',
    end_references: 'List references at the end',
    minimal: 'Minimal citations, only when essential',
    none: 'No citations needed',
  };
  return behaviorDescriptions[behavior];
}

/**
 * Get language name from locale.
 */
function getLanguageName(locale: string): string {
  const languages: Record<string, string> = {
    en: 'English',
    ar: 'Arabic',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    zh: 'Chinese',
    ja: 'Japanese',
  };
  return languages[locale] || locale;
}

/**
 * Build a preview prompt (shorter, for testing).
 */
export function buildPreviewPrompt(
  topic: string,
  personaName: PersonaName
): BuiltPrompt {
  const context: PromptContext = {
    topic,
    targetWordCount: 150,
  };

  return buildPrompt(context, personaName);
}

/**
 * Estimate token count for a prompt.
 */
export function estimateTokens(prompt: BuiltPrompt): number {
  const totalText = prompt.systemPrompt + prompt.userPrompt;
  // Rough estimate: ~4 characters per token
  return Math.ceil(totalText.length / 4);
}
