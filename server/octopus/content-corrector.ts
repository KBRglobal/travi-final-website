/**
 * Octopus Engine - Content Correction Workflow
 * 
 * Handles the correction workflow for generated content:
 * Generate → Validate Facts → Suggest Corrections → Apply Corrections → Publish
 * 
 * Supports:
 * - Meta title/description updates
 * - Content text replacements
 * - Fact value corrections
 */

import { log } from '../lib/logger';
import type { FactCheckReport, ValidationResult } from './fact-checker';

const correctorLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ContentCorrector] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[ContentCorrector] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[ContentCorrector] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export type CorrectionStatus = 'pending_correction' | 'corrected' | 'approved';

export type CorrectionField = 
  | 'metaTitle'
  | 'metaDescription'
  | 'title'
  | 'content'
  | 'htmlContent'
  | 'factValue'
  | 'statistic'
  | 'date'
  | 'price'
  | 'measurement';

export interface ContentCorrection {
  id: string;
  contentId: string;
  field: CorrectionField;
  originalValue: string;
  correctedValue: string;
  reason: string;
  appliedAt: Date | null;
  status: CorrectionStatus;
  source?: string;
  confidence?: number;
  position?: {
    start: number;
    end: number;
  };
}

export interface CorrectionSuggestion {
  id: string;
  field: CorrectionField;
  originalValue: string;
  suggestedValue: string;
  reason: string;
  source: string;
  confidence: number;
  autoApply: boolean;
}

export interface ContentForCorrection {
  id: string;
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  content?: string;
  htmlContent?: string;
  status?: CorrectionStatus;
}

export interface CorrectedContent extends ContentForCorrection {
  status: CorrectionStatus;
  appliedCorrections: ContentCorrection[];
  correctionSummary: CorrectionSummary;
}

export interface CorrectionSummary {
  totalCorrections: number;
  appliedCorrections: number;
  pendingCorrections: number;
  byField: Record<CorrectionField, number>;
  autoApplied: number;
  manualRequired: number;
}

export interface SuggestCorrectionsOptions {
  autoApplyThreshold?: number;
  includeMetaFields?: boolean;
  maxSuggestions?: number;
}

export interface ApplyCorrectionsOptions {
  autoApplyOnly?: boolean;
  updateStatus?: boolean;
  preserveOriginal?: boolean;
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_SUGGEST_OPTIONS: SuggestCorrectionsOptions = {
  autoApplyThreshold: 0.85,
  includeMetaFields: true,
  maxSuggestions: 50,
};

const DEFAULT_APPLY_OPTIONS: ApplyCorrectionsOptions = {
  autoApplyOnly: false,
  updateStatus: true,
  preserveOriginal: false,
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateCorrectionId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function determineFieldFromClaim(claim: string, context: string): CorrectionField {
  const lowerClaim = claim.toLowerCase();
  const lowerContext = context.toLowerCase();
  
  if (lowerContext.includes('meta title') || lowerContext.includes('metatitle')) {
    return 'metaTitle';
  }
  if (lowerContext.includes('meta description') || lowerContext.includes('metadescription')) {
    return 'metaDescription';
  }
  if (/\d{4}/.test(claim) && /built|established|opened|founded/.test(lowerClaim)) {
    return 'date';
  }
  if (/\$|€|£|฿|aed|usd|thb|eur|gbp/i.test(claim)) {
    return 'price';
  }
  if (/\d+\s*(m|km|ft|miles?|meters?|kilometers?)/i.test(claim)) {
    return 'measurement';
  }
  if (/\d+\s*(million|billion|thousand|%|percent)/i.test(claim)) {
    return 'statistic';
  }
  
  return 'factValue';
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Suggest corrections based on fact-check results
 * 
 * Takes a FactCheckReport and generates correction suggestions for invalid claims.
 * Corrections with high confidence can be auto-applied.
 * 
 * @param factCheckReport - The fact-check report containing validation results
 * @param content - The original content to suggest corrections for
 * @param options - Options for generating suggestions
 * @returns Array of correction suggestions
 */
export function suggestCorrections(
  factCheckReport: FactCheckReport,
  content: ContentForCorrection,
  options: SuggestCorrectionsOptions = {}
): CorrectionSuggestion[] {
  const opts = { ...DEFAULT_SUGGEST_OPTIONS, ...options };
  const suggestions: CorrectionSuggestion[] = [];
  
  correctorLogger.info('Generating correction suggestions', {
    contentId: content.id,
    totalClaims: factCheckReport.totalClaims,
    invalidClaims: factCheckReport.invalidClaims,
  });
  
  const invalidResults = factCheckReport.results.filter(
    (r) => !r.isValid && r.correction !== null
  );
  
  for (const result of invalidResults) {
    if (suggestions.length >= (opts.maxSuggestions || 50)) break;
    
    const matchingClaim = factCheckReport.extractedClaims.find(
      (c) => c.claim === result.claim
    );
    
    const field = determineFieldFromClaim(
      result.claim,
      matchingClaim?.context || ''
    );
    
    const shouldAutoApply = result.confidence >= (opts.autoApplyThreshold || 0.85);
    
    suggestions.push({
      id: generateCorrectionId(),
      field,
      originalValue: result.claim,
      suggestedValue: result.correction!,
      reason: `Fact verification found inaccuracy. Source: ${result.source}`,
      source: result.source,
      confidence: result.confidence,
      autoApply: shouldAutoApply,
    });
  }
  
  if (opts.includeMetaFields && content.metaTitle) {
    const metaTitleSuggestion = checkMetaFieldCorrections(
      content.metaTitle,
      'metaTitle',
      factCheckReport.results
    );
    if (metaTitleSuggestion) {
      suggestions.push(metaTitleSuggestion);
    }
  }
  
  if (opts.includeMetaFields && content.metaDescription) {
    const metaDescSuggestion = checkMetaFieldCorrections(
      content.metaDescription,
      'metaDescription',
      factCheckReport.results
    );
    if (metaDescSuggestion) {
      suggestions.push(metaDescSuggestion);
    }
  }
  
  correctorLogger.info('Correction suggestions generated', {
    contentId: content.id,
    totalSuggestions: suggestions.length,
    autoApplyable: suggestions.filter((s) => s.autoApply).length,
  });
  
  return suggestions;
}

/**
 * Check meta fields for corrections based on validation results
 */
function checkMetaFieldCorrections(
  fieldValue: string,
  fieldType: 'metaTitle' | 'metaDescription',
  validationResults: ValidationResult[]
): CorrectionSuggestion | null {
  for (const result of validationResults) {
    if (!result.isValid && result.correction) {
      const claimPattern = new RegExp(escapeRegExp(result.claim), 'gi');
      if (claimPattern.test(fieldValue)) {
        const correctedValue = fieldValue.replace(claimPattern, result.correction);
        
        return {
          id: generateCorrectionId(),
          field: fieldType,
          originalValue: fieldValue,
          suggestedValue: correctedValue,
          reason: `${fieldType === 'metaTitle' ? 'Meta title' : 'Meta description'} contains inaccurate fact. Source: ${result.source}`,
          source: result.source,
          confidence: result.confidence,
          autoApply: result.confidence >= 0.85,
        };
      }
    }
  }
  return null;
}

/**
 * Apply corrections to content
 * 
 * Takes content and an array of corrections, applies them, and returns
 * the corrected content with a summary of changes.
 * 
 * @param content - The content to correct
 * @param corrections - Array of corrections to apply
 * @param options - Options for applying corrections
 * @returns Corrected content with applied corrections summary
 */
export function applyCorrections(
  content: ContentForCorrection,
  corrections: ContentCorrection[],
  options: ApplyCorrectionsOptions = {}
): CorrectedContent {
  const opts = { ...DEFAULT_APPLY_OPTIONS, ...options };
  const appliedCorrections: ContentCorrection[] = [];
  const now = new Date();
  
  correctorLogger.info('Applying corrections to content', {
    contentId: content.id,
    totalCorrections: corrections.length,
    autoApplyOnly: opts.autoApplyOnly,
  });
  
  let correctedContent: ContentForCorrection = opts.preserveOriginal
    ? { ...content }
    : content;
  
  const correctionsToApply = opts.autoApplyOnly
    ? corrections.filter((c) => c.status === 'pending_correction' && (c.confidence ?? 0) >= 0.85)
    : corrections.filter((c) => c.status === 'pending_correction');
  
  for (const correction of correctionsToApply) {
    const applied = applySingleCorrection(correctedContent, correction);
    
    if (applied) {
      correction.appliedAt = now;
      correction.status = 'corrected';
      appliedCorrections.push(correction);
      correctedContent = applied;
    }
  }
  
  const summary = generateCorrectionSummary(corrections, appliedCorrections);
  
  const newStatus: CorrectionStatus = opts.updateStatus
    ? determineContentStatus(corrections, appliedCorrections)
    : content.status || 'pending_correction';
  
  correctorLogger.info('Corrections applied', {
    contentId: content.id,
    applied: appliedCorrections.length,
    pending: summary.pendingCorrections,
    status: newStatus,
  });
  
  return {
    ...correctedContent,
    status: newStatus,
    appliedCorrections,
    correctionSummary: summary,
  };
}

/**
 * Apply a single correction to content
 */
function applySingleCorrection(
  content: ContentForCorrection,
  correction: ContentCorrection
): ContentForCorrection | null {
  const result = { ...content };
  
  switch (correction.field) {
    case 'metaTitle':
      if (result.metaTitle) {
        result.metaTitle = applyTextReplacement(
          result.metaTitle,
          correction.originalValue,
          correction.correctedValue
        );
        return result;
      }
      break;
      
    case 'metaDescription':
      if (result.metaDescription) {
        result.metaDescription = applyTextReplacement(
          result.metaDescription,
          correction.originalValue,
          correction.correctedValue
        );
        return result;
      }
      break;
      
    case 'title':
      if (result.title) {
        result.title = applyTextReplacement(
          result.title,
          correction.originalValue,
          correction.correctedValue
        );
        return result;
      }
      break;
      
    case 'content':
    case 'factValue':
    case 'statistic':
    case 'date':
    case 'price':
    case 'measurement':
      if (result.content) {
        result.content = applyTextReplacement(
          result.content,
          correction.originalValue,
          correction.correctedValue
        );
      }
      if (result.htmlContent) {
        result.htmlContent = applyTextReplacement(
          result.htmlContent,
          correction.originalValue,
          correction.correctedValue
        );
      }
      return result;
      
    case 'htmlContent':
      if (result.htmlContent) {
        result.htmlContent = applyTextReplacement(
          result.htmlContent,
          correction.originalValue,
          correction.correctedValue
        );
        return result;
      }
      break;
  }
  
  return null;
}

/**
 * Apply text replacement with pattern matching
 */
function applyTextReplacement(
  text: string,
  original: string,
  replacement: string
): string {
  const escapedOriginal = escapeRegExp(original);
  const pattern = new RegExp(escapedOriginal, 'gi');
  return text.replace(pattern, replacement);
}

/**
 * Generate correction summary
 */
function generateCorrectionSummary(
  allCorrections: ContentCorrection[],
  appliedCorrections: ContentCorrection[]
): CorrectionSummary {
  const byField: Record<CorrectionField, number> = {
    metaTitle: 0,
    metaDescription: 0,
    title: 0,
    content: 0,
    htmlContent: 0,
    factValue: 0,
    statistic: 0,
    date: 0,
    price: 0,
    measurement: 0,
  };
  
  for (const correction of allCorrections) {
    byField[correction.field] = (byField[correction.field] || 0) + 1;
  }
  
  const autoApplied = appliedCorrections.filter(
    (c) => (c.confidence ?? 0) >= 0.85
  ).length;
  
  return {
    totalCorrections: allCorrections.length,
    appliedCorrections: appliedCorrections.length,
    pendingCorrections: allCorrections.length - appliedCorrections.length,
    byField,
    autoApplied,
    manualRequired: allCorrections.length - autoApplied,
  };
}

/**
 * Determine content status based on corrections
 */
function determineContentStatus(
  allCorrections: ContentCorrection[],
  appliedCorrections: ContentCorrection[]
): CorrectionStatus {
  if (allCorrections.length === 0) {
    return 'approved';
  }
  
  const pendingCount = allCorrections.filter(
    (c) => c.status === 'pending_correction'
  ).length;
  
  if (pendingCount === 0 && appliedCorrections.length === allCorrections.length) {
    return 'corrected';
  }
  
  if (pendingCount > 0) {
    return 'pending_correction';
  }
  
  return 'corrected';
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert correction suggestions to ContentCorrection objects
 */
export function suggestionsToCorrections(
  contentId: string,
  suggestions: CorrectionSuggestion[]
): ContentCorrection[] {
  return suggestions.map((suggestion) => ({
    id: suggestion.id,
    contentId,
    field: suggestion.field,
    originalValue: suggestion.originalValue,
    correctedValue: suggestion.suggestedValue,
    reason: suggestion.reason,
    appliedAt: null,
    status: 'pending_correction' as CorrectionStatus,
    source: suggestion.source,
    confidence: suggestion.confidence,
  }));
}

/**
 * Create a correction from a fact-check validation result
 */
export function createCorrectionFromValidation(
  contentId: string,
  result: ValidationResult,
  context?: string
): ContentCorrection | null {
  if (result.isValid || !result.correction) {
    return null;
  }
  
  return {
    id: generateCorrectionId(),
    contentId,
    field: determineFieldFromClaim(result.claim, context || ''),
    originalValue: result.claim,
    correctedValue: result.correction,
    reason: `Fact verification found inaccuracy. Source: ${result.source}`,
    appliedAt: null,
    status: 'pending_correction',
    source: result.source,
    confidence: result.confidence,
  };
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Process multiple contents for corrections
 */
export function batchSuggestCorrections(
  factCheckReports: Map<string, FactCheckReport>,
  contents: ContentForCorrection[],
  options: SuggestCorrectionsOptions = {}
): Map<string, CorrectionSuggestion[]> {
  const results = new Map<string, CorrectionSuggestion[]>();
  
  for (const content of contents) {
    const report = factCheckReports.get(content.id);
    if (report) {
      const suggestions = suggestCorrections(report, content, options);
      results.set(content.id, suggestions);
    }
  }
  
  return results;
}

/**
 * Apply corrections to multiple contents
 */
export function batchApplyCorrections(
  contents: ContentForCorrection[],
  correctionsByContentId: Map<string, ContentCorrection[]>,
  options: ApplyCorrectionsOptions = {}
): Map<string, CorrectedContent> {
  const results = new Map<string, CorrectedContent>();
  
  for (const content of contents) {
    const corrections = correctionsByContentId.get(content.id) || [];
    if (corrections.length > 0) {
      const corrected = applyCorrections(content, corrections, options);
      results.set(content.id, corrected);
    }
  }
  
  return results;
}

// ============================================================================
// Status Management
// ============================================================================

/**
 * Update correction status
 */
export function updateCorrectionStatus(
  correction: ContentCorrection,
  newStatus: CorrectionStatus
): ContentCorrection {
  return {
    ...correction,
    status: newStatus,
    appliedAt: newStatus === 'corrected' ? new Date() : correction.appliedAt,
  };
}

/**
 * Approve all corrections for a content
 */
export function approveCorrections(
  corrections: ContentCorrection[]
): ContentCorrection[] {
  return corrections.map((c) => ({
    ...c,
    status: 'approved' as CorrectionStatus,
  }));
}

/**
 * Get pending corrections from a list
 */
export function getPendingCorrections(
  corrections: ContentCorrection[]
): ContentCorrection[] {
  return corrections.filter((c) => c.status === 'pending_correction');
}

/**
 * Get corrections by status
 */
export function getCorrectionsByStatus(
  corrections: ContentCorrection[],
  status: CorrectionStatus
): ContentCorrection[] {
  return corrections.filter((c) => c.status === status);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a correction before applying
 */
export function validateCorrection(correction: ContentCorrection): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!correction.id) {
    errors.push('Correction must have an ID');
  }
  
  if (!correction.contentId) {
    errors.push('Correction must have a content ID');
  }
  
  if (!correction.field) {
    errors.push('Correction must specify a field');
  }
  
  if (!correction.originalValue) {
    errors.push('Correction must have an original value');
  }
  
  if (!correction.correctedValue) {
    errors.push('Correction must have a corrected value');
  }
  
  if (correction.originalValue === correction.correctedValue) {
    errors.push('Original and corrected values must be different');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Summary & Reporting
// ============================================================================

/**
 * Generate a human-readable correction report
 */
export function generateCorrectionReport(
  corrections: ContentCorrection[]
): string {
  if (corrections.length === 0) {
    return 'No corrections needed.';
  }
  
  const lines: string[] = [
    `Correction Report`,
    `=================`,
    `Total Corrections: ${corrections.length}`,
    ``,
  ];
  
  const pending = corrections.filter((c) => c.status === 'pending_correction');
  const applied = corrections.filter((c) => c.status === 'corrected');
  const approved = corrections.filter((c) => c.status === 'approved');
  
  lines.push(`Status Breakdown:`);
  lines.push(`  - Pending: ${pending.length}`);
  lines.push(`  - Applied: ${applied.length}`);
  lines.push(`  - Approved: ${approved.length}`);
  lines.push(``);
  
  if (pending.length > 0) {
    lines.push(`Pending Corrections:`);
    for (const c of pending) {
      lines.push(`  [${c.field}] "${c.originalValue}" → "${c.correctedValue}"`);
      lines.push(`    Reason: ${c.reason}`);
    }
    lines.push(``);
  }
  
  if (applied.length > 0) {
    lines.push(`Applied Corrections:`);
    for (const c of applied) {
      lines.push(`  [${c.field}] "${c.originalValue}" → "${c.correctedValue}"`);
      if (c.appliedAt) {
        lines.push(`    Applied at: ${c.appliedAt.toISOString()}`);
      }
    }
  }
  
  return lines.join('\n');
}
