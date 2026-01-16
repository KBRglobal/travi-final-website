/**
 * AI Writers Content Generator
 * 
 * This is the PRIMARY content generation system.
 * It REPLACES the legacy DEFAULT_CONTENT_RULES system.
 * 
 * Features:
 * - Auto-assigns optimal writer based on content type and topic
 * - Uses writer-specific prompts and personalities
 * - Validates voice consistency
 * - Returns content with writer attribution and voice score
 */

import { writerEngine } from './writer-engine';
import { assignmentSystem } from './assignment-system';
import { voiceValidator } from './voice-validator';
import { getWriterById } from './writer-registry';
import type { ContentType } from '@shared/schema';

export interface ContentGenerationRequest {
  writerId?: string; // Optional - auto-assigns if not provided
  contentType: ContentType;
  topic: string;
  keywords?: string[];
  locale?: string;
  length?: 'short' | 'medium' | 'long';
  tone?: string;
  targetAudience?: string[];
  additionalContext?: string;
}

export interface ContentGenerationResult {
  title: string;
  body: string;
  intro?: string;
  sections?: Array<{ heading: string; content: string }>;
  metaDescription?: string;
  keywords?: string[];
  writerId: string;
  writerName: string;
  writerAvatar: string;
  writerBio: string;
  writerNationality: string;
  generatedByAI: boolean;
  writerVoiceScore: number;
  confidence: number;
}

/**
 * Main content generation function using AI Writers system
 */
export async function generate(
  request: ContentGenerationRequest
): Promise<ContentGenerationResult> {
  // 1. Get or assign the best writer for this content
  let writer;
  if (request.writerId) {
    writer = getWriterById(request.writerId);
    if (!writer) {
      throw new Error(`Writer not found: ${request.writerId}`);
    }
  } else {
    // Auto-assign optimal writer
    const assignment = await assignmentSystem.assignWriter({
      contentType: request.contentType,
      topic: request.topic,
      keywords: request.keywords || [],
    });
    writer = assignment.writer;
  }

  // 2. Generate content using writer's voice (NOT legacy rules!)
  const generatedContent = await writerEngine.generateContent({
    writerId: writer.id,
    contentType: request.contentType,
    topic: request.topic,
    keywords: request.keywords || [],
    locale: request.locale || 'en',
    length: request.length || 'medium',
    tone: request.tone,
    targetAudience: request.targetAudience,
    additionalContext: request.additionalContext
  });

  // 3. Validate voice consistency
  const fullContent = [
    generatedContent.content.title,
    generatedContent.content.intro,
    generatedContent.content.body,
    generatedContent.content.conclusion
  ].filter(Boolean).join('\n\n');
  
  const voiceScore = await voiceValidator.getScore(
    writer.id,
    fullContent
  );

  // 4. Return with writer metadata in expected format
  return {
    title: generatedContent.content.title,
    body: generatedContent.content.body,
    intro: generatedContent.content.intro,
    metaDescription: generatedContent.content.metaDescription,
    keywords: request.keywords,
    writerId: writer.id,
    writerName: writer.name,
    writerAvatar: writer.avatar,
    writerBio: writer.shortBio,
    writerNationality: writer.nationality,
    generatedByAI: true,
    writerVoiceScore: voiceScore,
    confidence: 0.85 // Base confidence, can be adjusted based on various factors
  };
}

/**
 * Generate multiple title options with specific writer
 */
export async function generateTitles(
  writerId: string,
  topic: string,
  count: number = 5
): Promise<string[]> {
  const writer = getWriterById(writerId);
  if (!writer) {
    throw new Error(`Writer not found: ${writerId}`);
  }

  const titles = await writerEngine.generateTitles(writer.id, topic);
  return titles.slice(0, count);
}

/**
 * Generate intro paragraph with specific writer
 */
export async function generateIntro(
  writerId: string,
  topic: string,
  title?: string
): Promise<string> {
  const writer = getWriterById(writerId);
  if (!writer) {
    throw new Error(`Writer not found: ${writerId}`);
  }

  return writerEngine.generateIntro(writer.id, topic, title || topic);
}

/**
 * Rewrite existing content in writer's voice
 */
export async function rewriteInVoice(
  writerId: string,
  content: string,
  context?: string
): Promise<string> {
  const writer = getWriterById(writerId);
  if (!writer) {
    throw new Error(`Writer not found: ${writerId}`);
  }

  return writerEngine.rewriteInVoice(writer.id, content);
}

// Legacy system removed - AI Writers is the only content generation system

/**
 * Get recommended writer for content type and topic
 */
export async function recommendWriter(
  contentType: ContentType,
  topic: string,
  keywords?: string[]
) {
  return assignmentSystem.assignWriter({ contentType, topic, keywords: keywords || [] });
}

// Export main functions
export const aiWritersContentGenerator = {
  generate,
  generateTitles,
  generateIntro,
  rewriteInVoice,
  recommendWriter
};

// Default export
export default aiWritersContentGenerator;
