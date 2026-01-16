/**
 * SEO/AEO Output Normalizer
 * 
 * PHASE 6.2: Enforce output constraints and validation
 * 
 * Features:
 * - Title length enforcement (≤60 chars)
 * - Meta description bounds (150-160 chars)
 * - FAQ schema shape validation
 * - Automatic truncation with ellipsis
 * 
 * ACTIVATION: ENABLED
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[OutputNormalizer] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[OutputNormalizer] ${msg}`, data),
};

export interface NormalizationResult<T> {
  success: boolean;
  data: T;
  warnings: string[];
  modified: boolean;
}

export interface FAQItem {
  question: string;
  answer: string;
}

const CONSTRAINTS = {
  title: {
    maxLength: 60,
    minLength: 20,
  },
  description: {
    maxLength: 160,
    minLength: 120,
    targetLength: 155,
  },
  faq: {
    minItems: 3,
    maxItems: 10,
    minAnswerLength: 30,
    maxAnswerLength: 200,
    maxQuestionLength: 100,
  },
  altText: {
    maxLength: 125,
    minLength: 20,
  },
  answerCapsule: {
    minWords: 30,
    maxWords: 80,
    targetWords: 50,
  },
};

class OutputNormalizer {
  /**
   * Normalize meta title
   */
  normalizeTitle(raw: string): NormalizationResult<string> {
    const warnings: string[] = [];
    let data = raw.trim();
    let modified = false;

    // Remove quotes if wrapped
    if ((data.startsWith('"') && data.endsWith('"')) ||
        (data.startsWith("'") && data.endsWith("'"))) {
      data = data.slice(1, -1);
      modified = true;
    }

    // Check length
    if (data.length > CONSTRAINTS.title.maxLength) {
      warnings.push(`Title truncated from ${data.length} to ${CONSTRAINTS.title.maxLength} chars`);
      data = this.smartTruncate(data, CONSTRAINTS.title.maxLength);
      modified = true;
    }

    if (data.length < CONSTRAINTS.title.minLength) {
      warnings.push(`Title too short: ${data.length} chars (min: ${CONSTRAINTS.title.minLength})`);
    }

    return { success: true, data, warnings, modified };
  }

  /**
   * Normalize meta description
   */
  normalizeDescription(raw: string): NormalizationResult<string> {
    const warnings: string[] = [];
    let data = raw.trim();
    let modified = false;

    // Remove quotes if wrapped
    if ((data.startsWith('"') && data.endsWith('"')) ||
        (data.startsWith("'") && data.endsWith("'"))) {
      data = data.slice(1, -1);
      modified = true;
    }

    // Check length
    if (data.length > CONSTRAINTS.description.maxLength) {
      warnings.push(`Description truncated from ${data.length} to ${CONSTRAINTS.description.maxLength} chars`);
      data = this.smartTruncate(data, CONSTRAINTS.description.maxLength);
      modified = true;
    }

    if (data.length < CONSTRAINTS.description.minLength) {
      warnings.push(`Description short: ${data.length} chars (target: ${CONSTRAINTS.description.targetLength})`);
    }

    return { success: true, data, warnings, modified };
  }

  /**
   * Normalize FAQ array
   */
  normalizeFAQ(raw: string | FAQItem[]): NormalizationResult<FAQItem[]> {
    const warnings: string[] = [];
    let modified = false;

    // Parse if string
    let items: FAQItem[];
    if (typeof raw === 'string') {
      try {
        items = JSON.parse(raw);
        if (!Array.isArray(items)) {
          return {
            success: false,
            data: [],
            warnings: ['FAQ must be an array'],
            modified: false,
          };
        }
      } catch (e) {
        return {
          success: false,
          data: [],
          warnings: ['Failed to parse FAQ JSON'],
          modified: false,
        };
      }
    } else {
      items = raw;
    }

    // Validate and normalize each item
    const normalized: FAQItem[] = [];
    for (const item of items) {
      if (!item.question || !item.answer) {
        warnings.push('Skipped FAQ item with missing question or answer');
        modified = true;
        continue;
      }

      let question = item.question.trim();
      let answer = item.answer.trim();

      // Enforce question length
      if (question.length > CONSTRAINTS.faq.maxQuestionLength) {
        question = this.smartTruncate(question, CONSTRAINTS.faq.maxQuestionLength);
        modified = true;
      }

      // Enforce answer length
      if (answer.length > CONSTRAINTS.faq.maxAnswerLength) {
        answer = this.smartTruncate(answer, CONSTRAINTS.faq.maxAnswerLength);
        modified = true;
      }

      if (answer.length < CONSTRAINTS.faq.minAnswerLength) {
        warnings.push(`FAQ answer too short: "${question.slice(0, 30)}..."`);
      }

      normalized.push({ question, answer });
    }

    // Check count
    if (normalized.length < CONSTRAINTS.faq.minItems) {
      warnings.push(`Only ${normalized.length} FAQ items (min: ${CONSTRAINTS.faq.minItems})`);
    }

    if (normalized.length > CONSTRAINTS.faq.maxItems) {
      warnings.push(`Too many FAQ items, keeping first ${CONSTRAINTS.faq.maxItems}`);
      normalized.splice(CONSTRAINTS.faq.maxItems);
      modified = true;
    }

    return { success: true, data: normalized, warnings, modified };
  }

  /**
   * Normalize alt text
   */
  normalizeAltText(raw: string): NormalizationResult<string> {
    const warnings: string[] = [];
    let data = raw.trim();
    let modified = false;

    // Remove quotes
    if ((data.startsWith('"') && data.endsWith('"')) ||
        (data.startsWith("'") && data.endsWith("'"))) {
      data = data.slice(1, -1);
      modified = true;
    }

    // Check length
    if (data.length > CONSTRAINTS.altText.maxLength) {
      warnings.push(`Alt text truncated from ${data.length} to ${CONSTRAINTS.altText.maxLength} chars`);
      data = this.smartTruncate(data, CONSTRAINTS.altText.maxLength);
      modified = true;
    }

    if (data.length < CONSTRAINTS.altText.minLength) {
      warnings.push(`Alt text too short: ${data.length} chars`);
    }

    return { success: true, data, warnings, modified };
  }

  /**
   * Normalize answer capsule (word count)
   */
  normalizeAnswerCapsule(raw: string): NormalizationResult<string> {
    const warnings: string[] = [];
    let data = raw.trim();
    let modified = false;

    const words = data.split(/\s+/);
    const wordCount = words.length;

    if (wordCount > CONSTRAINTS.answerCapsule.maxWords) {
      warnings.push(`Answer capsule truncated from ${wordCount} to ${CONSTRAINTS.answerCapsule.maxWords} words`);
      data = words.slice(0, CONSTRAINTS.answerCapsule.maxWords).join(' ') + '...';
      modified = true;
    }

    if (wordCount < CONSTRAINTS.answerCapsule.minWords) {
      warnings.push(`Answer capsule short: ${wordCount} words (target: ${CONSTRAINTS.answerCapsule.targetWords})`);
    }

    return { success: true, data, warnings, modified };
  }

  /**
   * Smart truncation that respects word boundaries
   */
  private smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Reserve space for ellipsis
    const targetLength = maxLength - 3;
    
    // Try to break at word boundary
    let truncated = text.slice(0, targetLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > targetLength * 0.7) {
      truncated = truncated.slice(0, lastSpace);
    }

    return truncated.trim() + '...';
  }

  /**
   * Log normalization stats
   */
  logStats(type: string, result: NormalizationResult<unknown>): void {
    if (result.warnings.length > 0 || result.modified) {
      logger.info('Output normalized', {
        type,
        modified: result.modified,
        warningCount: result.warnings.length,
        warnings: result.warnings.slice(0, 3), // First 3 warnings
      });
    }
  }
}

// Singleton
let instance: OutputNormalizer | null = null;

export function getOutputNormalizer(): OutputNormalizer {
  if (!instance) {
    instance = new OutputNormalizer();
  }
  return instance;
}

export { OutputNormalizer, CONSTRAINTS };
