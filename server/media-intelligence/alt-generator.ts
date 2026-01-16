/**
 * Media Intelligence v2 - AI Alt Text Generator
 *
 * Feature flags:
 * - ENABLE_MEDIA_ALT_AI=true (enable AI generation)
 * - ENABLE_MEDIA_AUTO_APPLY=true (auto-apply high confidence suggestions)
 */

import { isAltAIEnabled } from './types-v2';
import { getAsset, storeAltSuggestion } from './asset-manager';

// Rate limiting
const rateLimitWindow = 60000; // 1 minute
const maxRequestsPerWindow = parseInt(process.env.MEDIA_ALT_AI_RATE_LIMIT || '30', 10);
const requestLog: number[] = [];

// Timeout for AI calls
const AI_TIMEOUT_MS = parseInt(process.env.MEDIA_ALT_AI_TIMEOUT || '10000', 10);

/**
 * Check rate limit
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove old entries
  while (requestLog.length > 0 && requestLog[0] < now - rateLimitWindow) {
    requestLog.shift();
  }
  return requestLog.length < maxRequestsPerWindow;
}

/**
 * Record request for rate limiting
 */
function recordRequest(): void {
  requestLog.push(Date.now());
}

/**
 * Sanitize AI-generated text
 */
function sanitizeAltText(text: string): string {
  return text
    .trim()
    .replace(/[\r\n\t]+/g, ' ') // Remove newlines/tabs
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 300); // Max 300 chars
}

/**
 * Generate alt text suggestion using filename
 */
function generateFromFilename(filename: string): { text: string; confidence: number } {
  const name = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ') // Replace separators
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
    .replace(/\d{10,}/g, '') // Remove long numbers (timestamps)
    .trim();

  if (!name || name.length < 3) {
    return { text: '', confidence: 0 };
  }

  // Clean up common prefixes
  const cleaned = name
    .replace(/^(img|image|photo|pic|dsc|screenshot|screen)/i, '')
    .trim();

  if (cleaned.length < 3) {
    return { text: '', confidence: 0 };
  }

  return {
    text: `Image showing ${cleaned.toLowerCase()}`,
    confidence: 0.4,
  };
}

/**
 * Generate alt text from detected tags/objects
 */
function generateFromTags(tags: string[]): { text: string; confidence: number } {
  if (!tags || tags.length === 0) {
    return { text: '', confidence: 0 };
  }

  const relevantTags = tags
    .filter(t => t.length > 2)
    .slice(0, 5);

  if (relevantTags.length === 0) {
    return { text: '', confidence: 0 };
  }

  return {
    text: `Image featuring ${relevantTags.join(', ')}`,
    confidence: 0.6,
  };
}

/**
 * Mock AI alt text generation (placeholder for real AI integration)
 */
async function callAIService(
  imageUrl: string,
  _context?: { filename?: string; tags?: string[] }
): Promise<{ text: string; confidence: number }> {
  // In production, this would call an actual AI service
  // For now, simulate with a delay and mock response

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('AI service timeout'));
    }, AI_TIMEOUT_MS);

    // Simulate AI processing
    setTimeout(() => {
      clearTimeout(timeout);

      // Mock AI response based on URL patterns
      const urlLower = imageUrl.toLowerCase();

      if (urlLower.includes('beach') || urlLower.includes('ocean')) {
        resolve({
          text: 'A scenic beach view with blue ocean water and sandy shore',
          confidence: 0.85,
        });
      } else if (urlLower.includes('hotel') || urlLower.includes('room')) {
        resolve({
          text: 'A modern hotel room with comfortable bedding and elegant decor',
          confidence: 0.82,
        });
      } else if (urlLower.includes('food') || urlLower.includes('restaurant')) {
        resolve({
          text: 'A beautifully plated dish in an upscale restaurant setting',
          confidence: 0.80,
        });
      } else if (urlLower.includes('city') || urlLower.includes('skyline')) {
        resolve({
          text: 'A panoramic city skyline with tall buildings against the sky',
          confidence: 0.78,
        });
      } else {
        // Generic fallback
        resolve({
          text: 'A travel-related photograph showing a destination or experience',
          confidence: 0.55,
        });
      }
    }, 500 + Math.random() * 500); // 500-1000ms simulated delay
  });
}

/**
 * Generate alt text suggestions for an asset
 */
export async function generateAltText(
  assetId: string,
  options: {
    useAI?: boolean;
    tags?: string[];
    objects?: string[];
  } = {}
): Promise<{
  suggestions: Array<{ text: string; confidence: number; source: 'ai' | 'filename' | 'tags' | 'objects' }>;
  rateLimited: boolean;
  error?: string;
}> {
  const suggestions: Array<{ text: string; confidence: number; source: 'ai' | 'filename' | 'tags' | 'objects' }> = [];

  const asset = getAsset(assetId);
  if (!asset) {
    return { suggestions: [], rateLimited: false, error: 'Asset not found' };
  }

  // Try filename-based suggestion
  const filenameSuggestion = generateFromFilename(asset.filename);
  if (filenameSuggestion.text) {
    suggestions.push({
      ...filenameSuggestion,
      text: sanitizeAltText(filenameSuggestion.text),
      source: 'filename',
    });
  }

  // Try tags-based suggestion
  if (options.tags && options.tags.length > 0) {
    const tagsSuggestion = generateFromTags(options.tags);
    if (tagsSuggestion.text) {
      suggestions.push({
        ...tagsSuggestion,
        text: sanitizeAltText(tagsSuggestion.text),
        source: 'tags',
      });
    }
  }

  // Try objects-based suggestion
  if (options.objects && options.objects.length > 0) {
    const objectsSuggestion = generateFromTags(options.objects); // Same logic
    if (objectsSuggestion.text) {
      suggestions.push({
        ...objectsSuggestion,
        text: sanitizeAltText(objectsSuggestion.text),
        source: 'objects',
      });
    }
  }

  // Try AI if enabled
  if (options.useAI !== false && isAltAIEnabled()) {
    if (!checkRateLimit()) {
      return { suggestions, rateLimited: true };
    }

    try {
      recordRequest();
      const aiResult = await callAIService(asset.url, {
        filename: asset.filename,
        tags: options.tags,
      });

      if (aiResult.text) {
        suggestions.push({
          ...aiResult,
          text: sanitizeAltText(aiResult.text),
          source: 'ai',
        });
      }
    } catch (err) {
      // AI failed, but we still have other suggestions
      console.error('AI alt text generation failed:', err);
    }
  }

  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence);

  // Store the suggestions
  if (suggestions.length > 0) {
    storeAltSuggestion(assetId, suggestions);
  }

  return { suggestions, rateLimited: false };
}

/**
 * Batch generate alt text for multiple assets
 */
export async function batchGenerateAltText(
  assetIds: string[],
  options: {
    useAI?: boolean;
    concurrency?: number;
  } = {}
): Promise<{
  processed: number;
  successful: number;
  rateLimited: number;
  failed: number;
}> {
  const concurrency = Math.min(options.concurrency || 5, 10); // Max 10 concurrent
  let processed = 0;
  let successful = 0;
  let rateLimited = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < assetIds.length; i += concurrency) {
    const batch = assetIds.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(id => generateAltText(id, { useAI: options.useAI }))
    );

    for (const result of results) {
      processed++;
      if (result.status === 'fulfilled') {
        if (result.value.rateLimited) {
          rateLimited++;
        } else if (result.value.suggestions.length > 0) {
          successful++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    }

    // Back off if rate limited
    if (rateLimited > 0) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { processed, successful, rateLimited, failed };
}

/**
 * Get alt generation stats
 */
export function getAltGenerationStats(): {
  requestsInWindow: number;
  maxRequestsPerWindow: number;
  windowMs: number;
} {
  const now = Date.now();
  const activeRequests = requestLog.filter(t => t > now - rateLimitWindow);

  return {
    requestsInWindow: activeRequests.length,
    maxRequestsPerWindow,
    windowMs: rateLimitWindow,
  };
}
