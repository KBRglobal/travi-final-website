/**
 * Content Regeneration - AI Generator
 *
 * Safely generates improved content blocks using AI.
 */

import { db } from '../db';
import { contents as content } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  ContentBlock,
  GenerationOptions,
  EligibilityResult,
  RATE_LIMITS,
} from './types';

// In-memory rate limiter
const rateLimiter = {
  hourly: new Map<string, number>(),
  daily: new Map<string, number>(),
  lastReset: { hourly: Date.now(), daily: Date.now() },
};

/**
 * Generate improved content blocks.
 */
export async function generateImprovedBlocks(
  contentId: string,
  eligibility: EligibilityResult,
  options: GenerationOptions = {}
): Promise<ContentBlock[]> {
  // Check rate limits
  checkRateLimits();

  // Get current content
  const contentRecord = await (db.query as any).contents.findFirst({
    where: eq(content.id, contentId),
  });

  if (!contentRecord) {
    throw new Error(`Content not found: ${contentId}`);
  }

  const currentBlocks = (contentRecord.blocks as ContentBlock[]) || [];
  const title = contentRecord.title || 'Untitled';

  // Build generation context
  const context = buildGenerationContext(
    title,
    currentBlocks,
    eligibility,
    options
  );

  // Generate with timeout
  const timeout = options.timeout || RATE_LIMITS.TIMEOUT_MS;
  const generatedBlocks = await generateWithTimeout(context, timeout);

  // Sanitize output
  const sanitizedBlocks = sanitizeBlocks(generatedBlocks);

  // Update rate limiter
  incrementRateLimiter();

  return sanitizedBlocks;
}

/**
 * Build generation context for AI.
 */
function buildGenerationContext(
  title: string,
  currentBlocks: ContentBlock[],
  eligibility: EligibilityResult,
  options: GenerationOptions
): GenerationContext {
  const focusAreas = options.focusAreas || eligibility.reasons;

  return {
    title,
    currentBlocks,
    focusAreas,
    persona: options.persona || 'default',
    preserveStructure: options.preserveStructure ?? true,
    maxBlocks: options.maxBlocks || 20,
    instructions: buildInstructions(focusAreas),
  };
}

interface GenerationContext {
  title: string;
  currentBlocks: ContentBlock[];
  focusAreas: string[];
  persona: string;
  preserveStructure: boolean;
  maxBlocks: number;
  instructions: string[];
}

/**
 * Build generation instructions based on focus areas.
 */
function buildInstructions(focusAreas: string[]): string[] {
  const instructions: string[] = [];

  if (focusAreas.includes('stale_content')) {
    instructions.push('Update outdated information and references');
    instructions.push('Add current trends and developments');
  }

  if (focusAreas.includes('low_ice_score')) {
    instructions.push('Improve content depth and comprehensiveness');
    instructions.push('Add more relevant details and examples');
  }

  if (focusAreas.includes('no_entities')) {
    instructions.push('Reference specific places, businesses, or attractions');
    instructions.push('Include proper nouns and named entities');
  }

  if (focusAreas.includes('poor_search_performance')) {
    instructions.push('Improve SEO-friendliness of titles and headings');
    instructions.push('Add relevant keywords naturally');
  }

  if (focusAreas.includes('thin_content')) {
    instructions.push('Expand content with more valuable information');
    instructions.push('Add supporting paragraphs and details');
  }

  if (focusAreas.includes('no_aeo_capsule')) {
    instructions.push('Add a clear answer summary at the beginning');
    instructions.push('Structure content for featured snippets');
  }

  return instructions;
}

/**
 * Generate content with timeout.
 */
async function generateWithTimeout(
  context: GenerationContext,
  timeoutMs: number
): Promise<ContentBlock[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    generateContentBlocks(context)
      .then(blocks => {
        clearTimeout(timer);
        resolve(blocks);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Generate content blocks (mock AI call - would integrate with real AI).
 */
async function generateContentBlocks(context: GenerationContext): Promise<ContentBlock[]> {
  // This is a mock implementation
  // In production, this would call an AI service
  const blocks: ContentBlock[] = [];

  // Add AEO capsule if needed
  if (context.focusAreas.includes('no_aeo_capsule')) {
    blocks.push({
      id: `block-aeo-${Date.now()}`,
      type: 'aeo_capsule',
      data: {
        text: `Quick answer about ${context.title}`,
        generated: true,
      },
    });
  }

  // Preserve existing blocks with improvements
  if (context.preserveStructure) {
    for (const block of context.currentBlocks) {
      if (blocks.length >= context.maxBlocks) break;

      // Add improved version
      blocks.push({
        id: block.id || `block-${Date.now()}-${blocks.length}`,
        type: block.type,
        data: {
          ...block.data,
          improved: true,
        },
      });
    }
  }

  // Add new content for thin content
  if (context.focusAreas.includes('thin_content') && blocks.length < 5) {
    blocks.push({
      id: `block-new-${Date.now()}`,
      type: 'paragraph',
      data: {
        text: `Additional information about ${context.title} to provide more value to readers.`,
        generated: true,
      },
    });
  }

  return blocks;
}

/**
 * Sanitize generated blocks.
 */
function sanitizeBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map(block => {
    const sanitized = { ...block };

    // Ensure valid block structure
    if (!sanitized.type) {
      sanitized.type = 'paragraph';
    }

    if (!sanitized.data) {
      sanitized.data = {};
    }

    // Sanitize text content
    if (typeof sanitized.data.text === 'string') {
      sanitized.data.text = sanitizeText(sanitized.data.text);
    }

    // Remove any potentially dangerous properties
    delete (sanitized.data as Record<string, unknown>).script;
    delete (sanitized.data as Record<string, unknown>).onclick;
    delete (sanitized.data as Record<string, unknown>).onerror;

    return sanitized;
  });
}

/**
 * Sanitize text content.
 */
function sanitizeText(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Check rate limits.
 */
function checkRateLimits(): void {
  const now = Date.now();

  // Reset hourly counter
  if (now - rateLimiter.lastReset.hourly > 60 * 60 * 1000) {
    rateLimiter.hourly.clear();
    rateLimiter.lastReset.hourly = now;
  }

  // Reset daily counter
  if (now - rateLimiter.lastReset.daily > 24 * 60 * 60 * 1000) {
    rateLimiter.daily.clear();
    rateLimiter.lastReset.daily = now;
  }

  // Check limits
  const hourlyCount = Array.from(rateLimiter.hourly.values()).reduce((a, b) => a + b, 0);
  const dailyCount = Array.from(rateLimiter.daily.values()).reduce((a, b) => a + b, 0);

  if (hourlyCount >= RATE_LIMITS.MAX_GENERATIONS_PER_HOUR) {
    throw new Error('Hourly rate limit exceeded');
  }

  if (dailyCount >= RATE_LIMITS.MAX_GENERATIONS_PER_DAY) {
    throw new Error('Daily rate limit exceeded');
  }
}

/**
 * Increment rate limiter.
 */
function incrementRateLimiter(): void {
  const key = 'global';
  rateLimiter.hourly.set(key, (rateLimiter.hourly.get(key) || 0) + 1);
  rateLimiter.daily.set(key, (rateLimiter.daily.get(key) || 0) + 1);
}

/**
 * Get current rate limit status.
 */
export function getRateLimitStatus(): {
  hourlyRemaining: number;
  dailyRemaining: number;
} {
  const hourlyCount = Array.from(rateLimiter.hourly.values()).reduce((a, b) => a + b, 0);
  const dailyCount = Array.from(rateLimiter.daily.values()).reduce((a, b) => a + b, 0);

  return {
    hourlyRemaining: Math.max(0, RATE_LIMITS.MAX_GENERATIONS_PER_HOUR - hourlyCount),
    dailyRemaining: Math.max(0, RATE_LIMITS.MAX_GENERATIONS_PER_DAY - dailyCount),
  };
}
