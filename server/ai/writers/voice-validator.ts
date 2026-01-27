/**
 * Voice Validator - Scores voice consistency for AI Writers
 *
 * Analyzes content to ensure it matches the writer's unique voice and style.
 * Returns a score (0-100) indicating how well the content aligns with the writer's voice.
 */

import OpenAI from "openai";
import { getWriterById } from "./writer-registry";
import type { AIWriter } from "@shared/schema";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Configuration constants
const VOICE_VALIDATION_MAX_CONTENT_LENGTH = 2000; // Maximum characters to analyze

export interface VoiceConsistencyResult {
  score: number; // 0-100
  matches: string[]; // Aspects that match the writer's voice
  mismatches: string[]; // Aspects that don't match
  suggestions: string[]; // How to improve voice consistency
  confidence: number; // 0-1, confidence in the analysis
}

/**
 * Validate that content matches a writer's voice
 */
export async function validateVoiceConsistency(
  writerId: string,
  content: string
): Promise<VoiceConsistencyResult> {
  const writer = getWriterById(writerId);

  if (!writer) {
    throw new Error(`Writer not found: ${writerId}`);
  }

  if (!openai) {
    // Return a default result if OpenAI is not configured
    return {
      score: 50,
      matches: [],
      mismatches: ["OpenAI API not configured"],
      suggestions: ["Configure OPENAI_API_KEY to enable voice validation"],
      confidence: 0.5,
    };
  }

  const prompt = createVoiceValidationPrompt(writer as any, content);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in analyzing writing style and voice consistency. Provide detailed, actionable feedback.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    return {
      score: Math.min(100, Math.max(0, result.score || 0)),
      matches: result.matches || [],
      mismatches: result.mismatches || [],
      suggestions: result.suggestions || [],
      confidence: Math.min(1, Math.max(0, result.confidence || 0.8)),
    };
  } catch (error) {
    // Return a default result on error
    return {
      score: 50,
      matches: [],
      mismatches: ["Unable to analyze voice consistency"],
      suggestions: ["Try regenerating the content"],
      confidence: 0.5,
    };
  }
}

/**
 * Get a simple voice score (0-100) without detailed analysis
 */
export async function getVoiceScore(writerId: string, content: string): Promise<number> {
  const result = await validateVoiceConsistency(writerId, content);
  return result.score;
}

/**
 * Create the prompt for voice validation
 */
function createVoiceValidationPrompt(writer: AIWriter, content: string): string {
  return `Analyze the following content and determine how well it matches the writer's voice and style.

WRITER PROFILE:
Name: ${writer.name}
Personality: ${writer.personality}
Writing Style: ${writer.writingStyle}
Expertise: ${writer.expertise}
Voice Prompt: ${(writer as any).voicePrompt}

Sample Phrases (Writer's Typical Style):
${
  writer.samplePhrases
    ?.slice(0, 3)
    .map(p => `- "${p}"`)
    .join("\n") || "N/A"
}

CONTENT TO ANALYZE:
${content.slice(0, VOICE_VALIDATION_MAX_CONTENT_LENGTH)} ${content.length > VOICE_VALIDATION_MAX_CONTENT_LENGTH ? "...(truncated)" : ""}

Analyze and return a JSON object with:
{
  "score": <number 0-100>,
  "matches": [<list of aspects that match writer's voice>],
  "mismatches": [<list of aspects that don't match>],
  "suggestions": [<actionable suggestions to improve voice consistency>],
  "confidence": <number 0-1 indicating confidence in analysis>
}

Consider:
- Tone and personality alignment
- Writing style and sentence structure
- Use of terminology and jargon
- Cultural and regional references
- Expertise demonstration
- Overall voice consistency

Be specific and actionable in your feedback.`;
}

/**
 * Batch validate multiple content pieces
 */
export async function batchValidateVoice(
  items: Array<{ writerId: string; content: string }>
): Promise<VoiceConsistencyResult[]> {
  return Promise.all(items.map(item => validateVoiceConsistency(item.writerId, item.content)));
}

/**
 * Check if content meets minimum voice score threshold
 */
export async function meetsVoiceThreshold(
  writerId: string,
  content: string,
  threshold: number = 70
): Promise<boolean> {
  const score = await getVoiceScore(writerId, content);
  return score >= threshold;
}

export const voiceValidator = {
  validate: validateVoiceConsistency,
  getScore: getVoiceScore,
  batchValidate: batchValidateVoice,
  meetsThreshold: meetsVoiceThreshold,
};
