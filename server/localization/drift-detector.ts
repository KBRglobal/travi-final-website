/**
 * Phase 6: Drift Detector
 * 
 * Detects structural drift between translations and their English source.
 * Compares block count, block types, and structural elements.
 * Flags significant structural differences that may indicate translation issues.
 * 
 * HARD CONSTRAINTS:
 * - English (en) is ALWAYS the reference structure
 * - Structural drift indicates potential translation quality issues
 * - Drift detection is separate from freshness (content changes)
 */

import { db } from '../db';
import { contents, translations, type Content, type Translation, type ContentBlock } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { log } from '../lib/logger';
import { CANONICAL_LOCALE } from './canonical-rules';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[DriftDetector] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[DriftDetector] WARN: ${msg}`, data),
};

export interface DriftResult {
  hasDrift: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  issues: DriftIssue[];
  sourceBlockCount: number;
  translationBlockCount: number;
  structuralScore: number;
}

export interface DriftIssue {
  type: 'block_count_mismatch' | 'block_type_mismatch' | 'block_order_mismatch' | 'missing_block' | 'extra_block' | 'content_length_variance';
  description: string;
  sourceIndex?: number;
  translationIndex?: number;
  blockType?: string;
}

export interface BatchDriftResult {
  contentId: string;
  locale: string;
  result: DriftResult;
}

const ACCEPTABLE_CONTENT_LENGTH_VARIANCE = 0.5;
const SEVERE_BLOCK_COUNT_DIFFERENCE = 3;
const MODERATE_BLOCK_COUNT_DIFFERENCE = 1;

/**
 * Detect structural drift between a translation and its English source.
 * 
 * @param contentId - The ID of the content
 * @param locale - The locale of the translation to check
 * @returns DriftResult with drift information
 */
export async function detectTranslationDrift(
  contentId: string,
  locale: string
): Promise<DriftResult> {
  if (locale === CANONICAL_LOCALE) {
    return {
      hasDrift: false,
      severity: 'none',
      issues: [],
      sourceBlockCount: 0,
      translationBlockCount: 0,
      structuralScore: 100,
    };
  }

  const [sourceContent] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId));

  if (!sourceContent) {
    return {
      hasDrift: true,
      severity: 'severe',
      issues: [{ type: 'missing_block', description: 'Source content not found' }],
      sourceBlockCount: 0,
      translationBlockCount: 0,
      structuralScore: 0,
    };
  }

  const [translation] = await db
    .select()
    .from(translations)
    .where(and(
      eq(translations.contentId, contentId),
      eq(translations.locale, locale as any)
    ));

  if (!translation) {
    return {
      hasDrift: true,
      severity: 'severe',
      issues: [{ type: 'missing_block', description: 'Translation does not exist' }],
      sourceBlockCount: (sourceContent.blocks || []).length,
      translationBlockCount: 0,
      structuralScore: 0,
    };
  }

  const sourceBlocks = (sourceContent.blocks || []) as ContentBlock[];
  const translationBlocks = (translation.blocks || []) as ContentBlock[];

  return compareBlockStructures(sourceBlocks, translationBlocks);
}

/**
 * Compare two block arrays and detect structural differences.
 */
function compareBlockStructures(
  sourceBlocks: ContentBlock[],
  translationBlocks: ContentBlock[]
): DriftResult {
  const issues: DriftIssue[] = [];
  
  const sourceBlockCount = sourceBlocks.length;
  const translationBlockCount = translationBlocks.length;
  const blockCountDiff = Math.abs(sourceBlockCount - translationBlockCount);

  if (blockCountDiff > 0) {
    issues.push({
      type: 'block_count_mismatch',
      description: `Source has ${sourceBlockCount} blocks, translation has ${translationBlockCount} blocks`,
    });
  }

  const sourceBlockTypes = sourceBlocks.map(b => b.type);
  const translationBlockTypes = translationBlocks.map(b => b.type);

  const minLength = Math.min(sourceBlocks.length, translationBlocks.length);
  for (let i = 0; i < minLength; i++) {
    if (sourceBlockTypes[i] !== translationBlockTypes[i]) {
      issues.push({
        type: 'block_type_mismatch',
        description: `Block ${i}: source type "${sourceBlockTypes[i]}" vs translation type "${translationBlockTypes[i]}"`,
        sourceIndex: i,
        translationIndex: i,
        blockType: sourceBlockTypes[i],
      });
    }
  }

  for (let i = minLength; i < sourceBlockCount; i++) {
    issues.push({
      type: 'missing_block',
      description: `Block ${i} (type: ${sourceBlockTypes[i]}) missing in translation`,
      sourceIndex: i,
      blockType: sourceBlockTypes[i],
    });
  }

  for (let i = minLength; i < translationBlockCount; i++) {
    issues.push({
      type: 'extra_block',
      description: `Extra block ${i} (type: ${translationBlockTypes[i]}) in translation`,
      translationIndex: i,
      blockType: translationBlockTypes[i],
    });
  }

  for (let i = 0; i < minLength; i++) {
    const sourceContent = extractBlockTextContent(sourceBlocks[i]);
    const translationContent = extractBlockTextContent(translationBlocks[i]);
    
    if (sourceContent && translationContent) {
      const lengthRatio = translationContent.length / sourceContent.length;
      if (lengthRatio < (1 - ACCEPTABLE_CONTENT_LENGTH_VARIANCE) || 
          lengthRatio > (1 + ACCEPTABLE_CONTENT_LENGTH_VARIANCE)) {
        issues.push({
          type: 'content_length_variance',
          description: `Block ${i}: content length ratio ${lengthRatio.toFixed(2)} exceeds acceptable variance`,
          sourceIndex: i,
          translationIndex: i,
          blockType: sourceBlocks[i].type,
        });
      }
    }
  }

  const severity = calculateDriftSeverity(issues, blockCountDiff);
  const structuralScore = calculateStructuralScore(issues, sourceBlockCount, translationBlockCount);

  return {
    hasDrift: issues.length > 0,
    severity,
    issues,
    sourceBlockCount,
    translationBlockCount,
    structuralScore,
  };
}

/**
 * Extract text content from a block for comparison.
 */
function extractBlockTextContent(block: ContentBlock): string | null {
  if (!block.data) return null;
  
  const textContent = block.data.content || block.data.text;
  if (typeof textContent === 'string') {
    return textContent;
  }
  
  if (Array.isArray(block.data.items)) {
    return block.data.items.filter(item => typeof item === 'string').join(' ');
  }
  
  return null;
}

/**
 * Calculate drift severity based on issues.
 */
function calculateDriftSeverity(
  issues: DriftIssue[], 
  blockCountDiff: number
): 'none' | 'minor' | 'moderate' | 'severe' {
  if (issues.length === 0) return 'none';

  const hasMissingBlocks = issues.some(i => i.type === 'missing_block');
  const hasExtraBlocks = issues.some(i => i.type === 'extra_block');
  const hasTypeMismatches = issues.some(i => i.type === 'block_type_mismatch');

  if (blockCountDiff >= SEVERE_BLOCK_COUNT_DIFFERENCE || hasTypeMismatches) {
    return 'severe';
  }

  if (blockCountDiff >= MODERATE_BLOCK_COUNT_DIFFERENCE || hasMissingBlocks || hasExtraBlocks) {
    return 'moderate';
  }

  return 'minor';
}

/**
 * Calculate a structural similarity score (0-100).
 */
function calculateStructuralScore(
  issues: DriftIssue[],
  sourceBlockCount: number,
  translationBlockCount: number
): number {
  if (sourceBlockCount === 0 && translationBlockCount === 0) {
    return 100;
  }

  if (sourceBlockCount === 0 || translationBlockCount === 0) {
    return 0;
  }

  let score = 100;

  const blockCountPenalty = Math.abs(sourceBlockCount - translationBlockCount) * 10;
  score -= Math.min(blockCountPenalty, 30);

  const typeMismatches = issues.filter(i => i.type === 'block_type_mismatch').length;
  score -= typeMismatches * 15;

  const missingBlocks = issues.filter(i => i.type === 'missing_block').length;
  score -= missingBlocks * 10;

  const extraBlocks = issues.filter(i => i.type === 'extra_block').length;
  score -= extraBlocks * 5;

  const lengthVariances = issues.filter(i => i.type === 'content_length_variance').length;
  score -= lengthVariances * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Check drift for all translations of a content item.
 */
export async function checkAllTranslationsDrift(
  contentId: string
): Promise<BatchDriftResult[]> {
  const allTranslations = await db
    .select()
    .from(translations)
    .where(eq(translations.contentId, contentId));

  const results: BatchDriftResult[] = [];

  for (const translation of allTranslations) {
    const result = await detectTranslationDrift(contentId, translation.locale);
    results.push({
      contentId,
      locale: translation.locale,
      result,
    });
  }

  return results;
}

/**
 * Find all translations with significant drift.
 */
export async function findDriftingTranslations(
  minSeverity: 'minor' | 'moderate' | 'severe' = 'moderate',
  limit: number = 100
): Promise<BatchDriftResult[]> {
  const allTranslations = await db
    .select({
      translation: translations,
      content: contents,
    })
    .from(translations)
    .innerJoin(contents, eq(translations.contentId, contents.id))
    .limit(limit * 2);

  const severityOrder = ['none', 'minor', 'moderate', 'severe'];
  const minSeverityIndex = severityOrder.indexOf(minSeverity);
  const driftingResults: BatchDriftResult[] = [];

  for (const { translation, content } of allTranslations) {
    const sourceBlocks = (content.blocks || []) as ContentBlock[];
    const translationBlocks = (translation.blocks || []) as ContentBlock[];
    const result = compareBlockStructures(sourceBlocks, translationBlocks);

    const resultSeverityIndex = severityOrder.indexOf(result.severity);
    if (resultSeverityIndex >= minSeverityIndex && result.hasDrift) {
      driftingResults.push({
        contentId: content.id,
        locale: translation.locale,
        result,
      });

      if (driftingResults.length >= limit) {
        break;
      }
    }
  }

  logger.info('Drift scan completed', { 
    scanned: allTranslations.length, 
    driftingFound: driftingResults.length,
    minSeverity 
  });

  return driftingResults;
}

/**
 * Get drift summary statistics.
 */
export async function getDriftSummary(): Promise<{
  totalTranslations: number;
  noDriftCount: number;
  minorDriftCount: number;
  moderateDriftCount: number;
  severeDriftCount: number;
  averageStructuralScore: number;
}> {
  const allTranslations = await db
    .select({
      translation: translations,
      content: contents,
    })
    .from(translations)
    .innerJoin(contents, eq(translations.contentId, contents.id));

  const counts = { none: 0, minor: 0, moderate: 0, severe: 0 };
  let totalScore = 0;

  for (const { translation, content } of allTranslations) {
    const sourceBlocks = (content.blocks || []) as ContentBlock[];
    const translationBlocks = (translation.blocks || []) as ContentBlock[];
    const result = compareBlockStructures(sourceBlocks, translationBlocks);

    counts[result.severity]++;
    totalScore += result.structuralScore;
  }

  return {
    totalTranslations: allTranslations.length,
    noDriftCount: counts.none,
    minorDriftCount: counts.minor,
    moderateDriftCount: counts.moderate,
    severeDriftCount: counts.severe,
    averageStructuralScore: allTranslations.length > 0 
      ? Math.round(totalScore / allTranslations.length) 
      : 100,
  };
}
