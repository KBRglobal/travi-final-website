/**
 * SEO-AEO Compatibility Validator
 * Ensures SEO and AEO optimizations don't conflict with each other
 */

import { db } from '../db';
import { contents, aeoAnswerCapsules, aeoSchemaEnhancements } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { ANSWER_CAPSULE_CONFIG } from './aeo-config';
import { log } from '../lib/logger';

const validatorLogger = {
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[SEO-AEO Validator] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[SEO-AEO Validator] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[SEO-AEO Validator] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  seoScore: number;
  aeoScore: number;
  compatibilityScore: number;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'seo' | 'aeo' | 'conflict';
  severity: 'critical' | 'major' | 'minor';
  field: string;
  message: string;
  fix?: string;
}

export interface ValidationWarning {
  type: 'seo' | 'aeo' | 'compatibility';
  field: string;
  message: string;
  suggestion: string;
}

export interface ContentValidationInput {
  contentId: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  answerCapsule?: string;
  blocks?: any[];
  schemaMarkup?: any;
  slug?: string;
  type?: string;
}

// ============================================================================
// SEO Validation Rules
// ============================================================================

const SEO_RULES = {
  title: {
    minLength: 30,
    maxLength: 60,
    idealLength: { min: 50, max: 60 },
  },
  metaDescription: {
    minLength: 120,
    maxLength: 160,
    idealLength: { min: 150, max: 155 },
  },
  slug: {
    maxLength: 75,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  h1: {
    required: true,
    maxCount: 1,
  },
  headingHierarchy: true,
  internalLinks: {
    minimum: 2,
  },
  imageAlt: {
    required: true,
  },
};

// ============================================================================
// AEO Validation Rules
// ============================================================================

const AEO_RULES = {
  answerCapsule: {
    minWords: ANSWER_CAPSULE_CONFIG.minWords,
    maxWords: ANSWER_CAPSULE_CONFIG.maxWords,
    requiresDirectAnswer: true,
    avoidMarketing: true,
    avoidEmojis: true,
  },
  schema: {
    requiredTypes: ['FAQPage', 'BreadcrumbList'],
    recommendedTypes: ['Article', 'HowTo'],
  },
  content: {
    requiresFAQ: true,
    requiresKeyFacts: true,
    firstParagraphOptimized: true,
  },
};

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate content for SEO-AEO compatibility
 */
export async function validateSEOAEOCompatibility(
  contentId: string
): Promise<ValidationResult> {
  // Fetch content and related data
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });

  if (!content) {
    throw new Error(`Content not found: ${contentId}`);
  }

  const capsule = await db.query.aeoAnswerCapsules.findFirst({
    where: eq(aeoAnswerCapsules.contentId, contentId),
  });

  const schemaEnhancement = await db.query.aeoSchemaEnhancements.findFirst({
    where: eq(aeoSchemaEnhancements.contentId, contentId),
  });

  const input: ContentValidationInput = {
    contentId,
    title: content.title,
    metaTitle: content.metaTitle || undefined,
    metaDescription: content.metaDescription || undefined,
    answerCapsule: capsule?.capsuleText || content.answerCapsule || undefined,
    blocks: content.blocks || [],
    schemaMarkup: schemaEnhancement?.schemaData,
    slug: content.slug,
    type: content.type,
  };

  return validateContent(input);
}

/**
 * Validate content input
 */
export function validateContent(input: ContentValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationWarning[] = [];
  const recommendations: string[] = [];

  // Run all validations
  const seoResults = validateSEO(input, issues, warnings);
  const aeoResults = validateAEO(input, issues, warnings);
  const compatibilityResults = validateCompatibility(input, issues, warnings);

  // Calculate scores
  const seoScore = calculateSEOScore(seoResults, issues);
  const aeoScore = calculateAEOScore(aeoResults, issues);
  const compatibilityScore = calculateCompatibilityScore(compatibilityResults, issues);

  // Overall score (weighted average)
  const score = Math.round(
    (seoScore * 0.35) + (aeoScore * 0.35) + (compatibilityScore * 0.30)
  );

  // Generate recommendations
  generateRecommendations(issues, warnings, recommendations);

  const isValid = issues.filter(i => i.severity === 'critical').length === 0;

  validatorLogger.info('Validation completed', {
    contentId: input.contentId,
    isValid,
    score,
    seoScore,
    aeoScore,
    compatibilityScore,
    issueCount: issues.length,
  });

  return {
    isValid,
    score,
    seoScore,
    aeoScore,
    compatibilityScore,
    issues,
    warnings,
    recommendations,
  };
}

// ============================================================================
// SEO Validation
// ============================================================================

interface SEOValidationResults {
  titleValid: boolean;
  metaDescriptionValid: boolean;
  slugValid: boolean;
  headingsValid: boolean;
  linksValid: boolean;
  imagesValid: boolean;
}

function validateSEO(
  input: ContentValidationInput,
  issues: ValidationIssue[],
  warnings: ValidationWarning[]
): SEOValidationResults {
  const results: SEOValidationResults = {
    titleValid: true,
    metaDescriptionValid: true,
    slugValid: true,
    headingsValid: true,
    linksValid: true,
    imagesValid: true,
  };

  // Validate title
  const title = input.metaTitle || input.title;
  if (!title) {
    issues.push({
      type: 'seo',
      severity: 'critical',
      field: 'title',
      message: 'Title is missing',
      fix: 'Add a descriptive title between 50-60 characters',
    });
    results.titleValid = false;
  } else {
    if (title.length < SEO_RULES.title.minLength) {
      warnings.push({
        type: 'seo',
        field: 'title',
        message: `Title is too short (${title.length} chars, minimum ${SEO_RULES.title.minLength})`,
        suggestion: 'Expand title with relevant keywords',
      });
    }
    if (title.length > SEO_RULES.title.maxLength) {
      issues.push({
        type: 'seo',
        severity: 'major',
        field: 'title',
        message: `Title is too long (${title.length} chars, maximum ${SEO_RULES.title.maxLength})`,
        fix: 'Shorten title to prevent truncation in search results',
      });
      results.titleValid = false;
    }
  }

  // Validate meta description
  const metaDesc = input.metaDescription;
  if (!metaDesc) {
    issues.push({
      type: 'seo',
      severity: 'major',
      field: 'metaDescription',
      message: 'Meta description is missing',
      fix: 'Add a compelling meta description between 150-155 characters',
    });
    results.metaDescriptionValid = false;
  } else {
    if (metaDesc.length < SEO_RULES.metaDescription.minLength) {
      warnings.push({
        type: 'seo',
        field: 'metaDescription',
        message: `Meta description is short (${metaDesc.length} chars)`,
        suggestion: 'Expand to 150-155 characters for better CTR',
      });
    }
    if (metaDesc.length > SEO_RULES.metaDescription.maxLength) {
      issues.push({
        type: 'seo',
        severity: 'minor',
        field: 'metaDescription',
        message: `Meta description is too long (${metaDesc.length} chars)`,
        fix: 'Shorten to prevent truncation in search results',
      });
    }
  }

  // Validate slug
  if (input.slug) {
    if (!SEO_RULES.slug.pattern.test(input.slug)) {
      issues.push({
        type: 'seo',
        severity: 'minor',
        field: 'slug',
        message: 'Slug contains invalid characters',
        fix: 'Use only lowercase letters, numbers, and hyphens',
      });
      results.slugValid = false;
    }
    if (input.slug.length > SEO_RULES.slug.maxLength) {
      warnings.push({
        type: 'seo',
        field: 'slug',
        message: `Slug is long (${input.slug.length} chars)`,
        suggestion: 'Shorter URLs are generally better for SEO',
      });
    }
  }

  // Validate content structure (headings)
  if (input.blocks && Array.isArray(input.blocks)) {
    const headings = input.blocks.filter((b: any) =>
      b.type === 'heading' || b.type?.startsWith('h')
    );

    const h1Count = headings.filter((h: any) =>
      h.level === 1 || h.type === 'h1'
    ).length;

    if (h1Count === 0) {
      warnings.push({
        type: 'seo',
        field: 'headings',
        message: 'No H1 heading found in content',
        suggestion: 'Add one H1 heading that matches the page title',
      });
    }
    if (h1Count > 1) {
      issues.push({
        type: 'seo',
        severity: 'minor',
        field: 'headings',
        message: `Multiple H1 headings found (${h1Count})`,
        fix: 'Use only one H1 heading per page',
      });
      results.headingsValid = false;
    }

    // Check internal links
    const linkBlocks = input.blocks.filter((b: any) =>
      b.type === 'link' || b.content?.includes('<a ')
    );
    if (linkBlocks.length < SEO_RULES.internalLinks.minimum) {
      warnings.push({
        type: 'seo',
        field: 'links',
        message: 'Few internal links detected',
        suggestion: 'Add relevant internal links to improve site structure',
      });
    }
  }

  return results;
}

// ============================================================================
// AEO Validation
// ============================================================================

interface AEOValidationResults {
  capsuleValid: boolean;
  capsuleQuality: number;
  schemaValid: boolean;
  faqPresent: boolean;
  firstParagraphOptimized: boolean;
}

function validateAEO(
  input: ContentValidationInput,
  issues: ValidationIssue[],
  warnings: ValidationWarning[]
): AEOValidationResults {
  const results: AEOValidationResults = {
    capsuleValid: true,
    capsuleQuality: 0,
    schemaValid: true,
    faqPresent: false,
    firstParagraphOptimized: false,
  };

  // Validate answer capsule
  if (!input.answerCapsule) {
    issues.push({
      type: 'aeo',
      severity: 'critical',
      field: 'answerCapsule',
      message: 'Answer capsule is missing',
      fix: 'Generate an answer capsule (40-60 words) for AI platform optimization',
    });
    results.capsuleValid = false;
  } else {
    const capsule = input.answerCapsule;
    const wordCount = countWords(capsule);

    // Word count validation
    if (wordCount < AEO_RULES.answerCapsule.minWords) {
      issues.push({
        type: 'aeo',
        severity: 'major',
        field: 'answerCapsule',
        message: `Capsule too short (${wordCount} words, minimum ${AEO_RULES.answerCapsule.minWords})`,
        fix: 'Expand capsule to include more key information',
      });
      results.capsuleValid = false;
    }
    if (wordCount > AEO_RULES.answerCapsule.maxWords) {
      issues.push({
        type: 'aeo',
        severity: 'major',
        field: 'answerCapsule',
        message: `Capsule too long (${wordCount} words, maximum ${AEO_RULES.answerCapsule.maxWords})`,
        fix: 'Shorten capsule to be more concise for AI extraction',
      });
      results.capsuleValid = false;
    }

    // Marketing language check
    const marketingWords = ['amazing', 'incredible', 'must-visit', 'breathtaking', 'hidden gem', 'best-kept secret'];
    const hasMarketing = marketingWords.some(w => capsule.toLowerCase().includes(w));
    if (hasMarketing) {
      issues.push({
        type: 'aeo',
        severity: 'minor',
        field: 'answerCapsule',
        message: 'Capsule contains marketing language',
        fix: 'Use factual, objective language instead of marketing superlatives',
      });
    }

    // Emoji check
    if (/[\u{1F300}-\u{1F9FF}]/u.test(capsule)) {
      issues.push({
        type: 'aeo',
        severity: 'minor',
        field: 'answerCapsule',
        message: 'Capsule contains emojis',
        fix: 'Remove emojis for professional AI-optimized content',
      });
    }

    // Number/fact check (good for AI)
    if (!/\d+/.test(capsule)) {
      warnings.push({
        type: 'aeo',
        field: 'answerCapsule',
        message: 'Capsule lacks specific numbers or statistics',
        suggestion: 'Include concrete data points (prices, distances, counts) for better AI citations',
      });
    }

    // Calculate quality score
    results.capsuleQuality = calculateCapsuleQuality(capsule);
  }

  // Validate schema
  if (!input.schemaMarkup) {
    warnings.push({
      type: 'aeo',
      field: 'schema',
      message: 'No AEO schema enhancements found',
      suggestion: 'Add FAQPage, HowTo, or other relevant schema types',
    });
  } else {
    // Check for required schema types
    const schemaTypes = extractSchemaTypes(input.schemaMarkup);
    const hasFAQ = schemaTypes.includes('FAQPage');
    const hasBreadcrumb = schemaTypes.includes('BreadcrumbList');

    if (!hasFAQ && input.type !== 'event') {
      warnings.push({
        type: 'aeo',
        field: 'schema',
        message: 'FAQPage schema not found',
        suggestion: 'Add FAQ schema for better AI platform visibility',
      });
    }
    if (!hasBreadcrumb) {
      warnings.push({
        type: 'aeo',
        field: 'schema',
        message: 'BreadcrumbList schema not found',
        suggestion: 'Add breadcrumb schema for navigation context',
      });
    }

    results.faqPresent = hasFAQ;
  }

  // Check first paragraph optimization
  if (input.blocks && Array.isArray(input.blocks)) {
    const firstParagraph = input.blocks.find((b: any) =>
      b.type === 'paragraph' || b.type === 'text'
    );
    if (firstParagraph?.content) {
      const paragraphWords = countWords(firstParagraph.content);
      if (paragraphWords >= 40 && paragraphWords <= 80) {
        results.firstParagraphOptimized = true;
      } else {
        warnings.push({
          type: 'aeo',
          field: 'content',
          message: 'First paragraph not optimized for AI extraction',
          suggestion: 'Make first paragraph 40-80 words with direct answer',
        });
      }
    }
  }

  return results;
}

// ============================================================================
// Compatibility Validation
// ============================================================================

interface CompatibilityResults {
  capsuleMatchesMetaDesc: boolean;
  noConflictingMessages: boolean;
  schemaAligned: boolean;
  keywordConsistency: boolean;
}

function validateCompatibility(
  input: ContentValidationInput,
  issues: ValidationIssue[],
  warnings: ValidationWarning[]
): CompatibilityResults {
  const results: CompatibilityResults = {
    capsuleMatchesMetaDesc: true,
    noConflictingMessages: true,
    schemaAligned: true,
    keywordConsistency: true,
  };

  // Check capsule vs meta description alignment
  if (input.answerCapsule && input.metaDescription) {
    const capsuleWords = new Set(input.answerCapsule.toLowerCase().split(/\s+/));
    const metaWords = new Set(input.metaDescription.toLowerCase().split(/\s+/));

    // Calculate overlap
    const intersection = new Set([...capsuleWords].filter(x => metaWords.has(x)));
    const overlapRatio = intersection.size / Math.min(capsuleWords.size, metaWords.size);

    if (overlapRatio < 0.2) {
      issues.push({
        type: 'conflict',
        severity: 'major',
        field: 'capsule-meta-description',
        message: 'Answer capsule and meta description have very different messaging',
        fix: 'Align capsule and meta description to reinforce the same key message',
      });
      results.capsuleMatchesMetaDesc = false;
    } else if (overlapRatio > 0.9) {
      warnings.push({
        type: 'compatibility',
        field: 'capsule-meta-description',
        message: 'Answer capsule and meta description are nearly identical',
        suggestion: 'Capsule should expand on meta description with more factual details',
      });
    }
  }

  // Check for conflicting quality signals
  if (input.answerCapsule && input.metaDescription) {
    // Marketing in meta (OK for SEO CTR) but factual in capsule (good for AEO)
    const metaHasMarketing = /amazing|incredible|best|stunning/i.test(input.metaDescription);
    const capsuleHasMarketing = /amazing|incredible|best|stunning/i.test(input.answerCapsule);

    if (metaHasMarketing && capsuleHasMarketing) {
      warnings.push({
        type: 'compatibility',
        field: 'tone',
        message: 'Both meta description and capsule have marketing language',
        suggestion: 'Keep marketing in meta description, use factual language in capsule',
      });
    }
  }

  // Check title and capsule keyword alignment
  if (input.title && input.answerCapsule) {
    const titleKeywords = extractKeywords(input.title);
    const capsuleText = input.answerCapsule.toLowerCase();

    const keywordsInCapsule = titleKeywords.filter(k => capsuleText.includes(k.toLowerCase()));
    if (keywordsInCapsule.length < titleKeywords.length * 0.3) {
      warnings.push({
        type: 'compatibility',
        field: 'keywords',
        message: 'Title keywords not well represented in answer capsule',
        suggestion: 'Include main title keywords in capsule for consistency',
      });
      results.keywordConsistency = false;
    }
  }

  return results;
}

// ============================================================================
// Helper Functions
// ============================================================================

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractSchemaTypes(schema: any): string[] {
  if (!schema) return [];

  const types: string[] = [];

  if (Array.isArray(schema)) {
    for (const item of schema) {
      if (item['@type']) types.push(item['@type']);
    }
  } else if (schema['@type']) {
    types.push(schema['@type']);
  } else if (schema['@graph']) {
    for (const item of schema['@graph']) {
      if (item['@type']) types.push(item['@type']);
    }
  }

  return types;
}

function extractKeywords(text: string): string[] {
  // Remove common stop words and extract meaningful keywords
  const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are'];
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.includes(w))
    .slice(0, 5);
}

function calculateCapsuleQuality(capsule: string): number {
  let score = 50; // Base score

  const wordCount = countWords(capsule);

  // Word count
  if (wordCount >= 40 && wordCount <= 60) score += 20;
  else if (wordCount >= 30 && wordCount <= 70) score += 10;

  // Has numbers
  if (/\d+/.test(capsule)) score += 10;

  // No marketing language
  const marketingWords = ['amazing', 'incredible', 'must-visit', 'breathtaking'];
  if (!marketingWords.some(w => capsule.toLowerCase().includes(w))) score += 10;

  // No emojis
  if (!/[\u{1F300}-\u{1F9FF}]/u.test(capsule)) score += 5;

  // Factual tone (no exclamation marks)
  if (!capsule.includes('!')) score += 5;

  return Math.min(100, score);
}

function calculateSEOScore(results: SEOValidationResults, issues: ValidationIssue[]): number {
  let score = 100;

  if (!results.titleValid) score -= 20;
  if (!results.metaDescriptionValid) score -= 15;
  if (!results.slugValid) score -= 10;
  if (!results.headingsValid) score -= 10;

  // Deduct for issues
  const seoIssues = issues.filter(i => i.type === 'seo');
  seoIssues.forEach(issue => {
    if (issue.severity === 'critical') score -= 15;
    else if (issue.severity === 'major') score -= 10;
    else score -= 5;
  });

  return Math.max(0, score);
}

function calculateAEOScore(results: AEOValidationResults, issues: ValidationIssue[]): number {
  let score = 100;

  if (!results.capsuleValid) score -= 30;
  if (!results.faqPresent) score -= 15;
  if (!results.firstParagraphOptimized) score -= 10;

  // Add capsule quality
  score = (score + results.capsuleQuality) / 2;

  // Deduct for AEO issues
  const aeoIssues = issues.filter(i => i.type === 'aeo');
  aeoIssues.forEach(issue => {
    if (issue.severity === 'critical') score -= 15;
    else if (issue.severity === 'major') score -= 10;
    else score -= 5;
  });

  return Math.max(0, Math.round(score));
}

function calculateCompatibilityScore(results: CompatibilityResults, issues: ValidationIssue[]): number {
  let score = 100;

  if (!results.capsuleMatchesMetaDesc) score -= 25;
  if (!results.noConflictingMessages) score -= 20;
  if (!results.schemaAligned) score -= 15;
  if (!results.keywordConsistency) score -= 10;

  // Deduct for conflict issues
  const conflictIssues = issues.filter(i => i.type === 'conflict');
  conflictIssues.forEach(issue => {
    if (issue.severity === 'critical') score -= 20;
    else if (issue.severity === 'major') score -= 15;
    else score -= 5;
  });

  return Math.max(0, score);
}

function generateRecommendations(
  issues: ValidationIssue[],
  warnings: ValidationWarning[],
  recommendations: string[]
): void {
  // Priority recommendations based on issues
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const majorIssues = issues.filter(i => i.severity === 'major');

  if (criticalIssues.length > 0) {
    recommendations.push('⚠️ Fix critical issues first: ' + criticalIssues.map(i => i.field).join(', '));
  }

  if (majorIssues.length > 0) {
    recommendations.push('Address major issues: ' + majorIssues.map(i => i.field).join(', '));
  }

  // Specific recommendations
  const hasNoCapsule = issues.some(i => i.field === 'answerCapsule' && i.severity === 'critical');
  if (hasNoCapsule) {
    recommendations.push('Generate an answer capsule to enable AI platform visibility');
  }

  const hasMetaConflict = issues.some(i => i.field === 'capsule-meta-description');
  if (hasMetaConflict) {
    recommendations.push('Align your capsule and meta description messaging while keeping each optimized for its purpose');
  }

  // Best practices
  if (recommendations.length === 0) {
    recommendations.push('Content is well-optimized for both SEO and AEO!');
    recommendations.push('Consider A/B testing capsule variants for better AI citations');
  }
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate multiple content items
 */
export async function batchValidateSEOAEO(
  contentIds: string[]
): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>();

  for (const contentId of contentIds) {
    try {
      const result = await validateSEOAEOCompatibility(contentId);
      results.set(contentId, result);
    } catch (error) {
      validatorLogger.error('Validation failed for content', { contentId, error });
      results.set(contentId, {
        isValid: false,
        score: 0,
        seoScore: 0,
        aeoScore: 0,
        compatibilityScore: 0,
        issues: [{
          type: 'conflict',
          severity: 'critical',
          field: 'content',
          message: 'Failed to validate content',
        }],
        warnings: [],
        recommendations: ['Check if content exists and is accessible'],
      });
    }
  }

  return results;
}

/**
 * Get validation summary for content list
 */
export async function getValidationSummary(contentIds: string[]): Promise<{
  total: number;
  valid: number;
  invalid: number;
  averageScore: number;
  averageSEOScore: number;
  averageAEOScore: number;
  averageCompatibilityScore: number;
  commonIssues: Array<{ field: string; count: number }>;
}> {
  const results = await batchValidateSEOAEO(contentIds);

  let valid = 0;
  let totalScore = 0;
  let totalSEO = 0;
  let totalAEO = 0;
  let totalCompatibility = 0;
  const issueCount = new Map<string, number>();

  results.forEach((result) => {
    if (result.isValid) valid++;
    totalScore += result.score;
    totalSEO += result.seoScore;
    totalAEO += result.aeoScore;
    totalCompatibility += result.compatibilityScore;

    result.issues.forEach(issue => {
      issueCount.set(issue.field, (issueCount.get(issue.field) || 0) + 1);
    });
  });

  const total = contentIds.length;

  return {
    total,
    valid,
    invalid: total - valid,
    averageScore: Math.round(totalScore / total),
    averageSEOScore: Math.round(totalSEO / total),
    averageAEOScore: Math.round(totalAEO / total),
    averageCompatibilityScore: Math.round(totalCompatibility / total),
    commonIssues: Array.from(issueCount.entries())
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}
