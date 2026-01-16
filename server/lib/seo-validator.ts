/**
 * SEO Specialist Agent - Comprehensive SEO Validation System
 * 
 * This module provides strict SEO validation with detailed error reporting,
 * banned phrase detection, and suggestion generation.
 */

import { SEO_REQUIREMENTS, BANNED_PHRASES, PHRASE_ALTERNATIVES } from './seo-standards';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SEOValidationResult {
  isValid: boolean;
  score: number;
  errors: SEOError[];
  warnings: SEOWarning[];
  suggestions: string[];
}

export interface SEOError {
  code: string;
  field: string;
  message: string;
  actual: string | number;
  required: string | number;
}

export interface SEOWarning {
  code: string;
  field: string;
  message: string;
  suggestion?: string;
}

export interface ContentForValidation {
  metaTitle?: string;
  metaDescription?: string;
  content: string;
  altTexts?: string[];
  images?: Array<{ src: string; alt?: string }>;
}

export interface MetaTitleValidation {
  valid: boolean;
  length: number;
  issues: string[];
}

export interface MetaDescriptionValidation {
  valid: boolean;
  length: number;
  issues: string[];
}

export interface HeadingsValidation {
  h2Count: number;
  valid: boolean;
  issues: string[];
}

export interface LinksValidation {
  internal: number;
  external: number;
  authoritativeExternal: number;
  valid: boolean;
  issues: string[];
}

export interface WordCountValidation {
  count: number;
  valid: boolean;
  issues: string[];
}

export interface BannedPhrasesResult {
  found: string[];
  positions: number[];
}

export interface AltTextValidation {
  valid: boolean;
  issues: string[];
}

export interface ImagesValidation {
  imageCount: number;
  h2Count: number;
  requiredMinimum: number;
  valid: boolean;
  issues: string[];
}

// ============================================================================
// AUTHORITATIVE DOMAINS
// ============================================================================

const AUTHORITATIVE_DOMAINS = [
  'visitdubai.com',
  'dubai.ae',
  'dubaitourism.gov.ae',
  'tripadvisor.com',
  'booking.com',
  'lonelyplanet.com',
  'timeout.com',
  'gov.uk',
  'travel.state.gov',
  'emirates.com',
  'expo2020dubai.com',
];

// ============================================================================
// ALT TEXT BANNED MARKETING WORDS
// ============================================================================

const ALT_TEXT_BANNED_WORDS = [
  'stunning',
  'amazing',
  'beautiful',
  'breathtaking',
  'gorgeous',
  'spectacular',
  'incredible',
  'magnificent',
  'wonderful',
  'fabulous',
  'extraordinary',
  'unbelievable',
  'awesome',
  'fantastic',
  'marvelous',
  'perfect',
  'best',
  'ultimate',
  'must-see',
  'world-class',
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate meta title - EXACTLY 50-60 characters required
 */
export function validateMetaTitle(title: string): MetaTitleValidation {
  const issues: string[] = [];
  const length = title.trim().length;
  
  if (length === 0) {
    issues.push('Meta title is empty');
  } else if (length < SEO_REQUIREMENTS.metaTitle.minLength) {
    issues.push(`Meta title is too short (${length} chars). Minimum: ${SEO_REQUIREMENTS.metaTitle.minLength} characters`);
  } else if (length > SEO_REQUIREMENTS.metaTitle.maxLength) {
    issues.push(`Meta title is too long (${length} chars). Maximum: ${SEO_REQUIREMENTS.metaTitle.maxLength} characters`);
  }
  
  if (title.includes('|') && title.split('|').length > 2) {
    issues.push('Meta title should have at most one pipe separator');
  }
  
  return {
    valid: issues.length === 0,
    length,
    issues,
  };
}

/**
 * Validate meta description - EXACTLY 150-160 characters required
 */
export function validateMetaDescription(desc: string): MetaDescriptionValidation {
  const issues: string[] = [];
  const length = desc.trim().length;
  
  if (length === 0) {
    issues.push('Meta description is empty');
  } else if (length < SEO_REQUIREMENTS.metaDescription.minLength) {
    issues.push(`Meta description is too short (${length} chars). Minimum: ${SEO_REQUIREMENTS.metaDescription.minLength} characters`);
  } else if (length > SEO_REQUIREMENTS.metaDescription.maxLength) {
    issues.push(`Meta description is too long (${length} chars). Maximum: ${SEO_REQUIREMENTS.metaDescription.maxLength} characters`);
  }
  
  if (!desc.trim().endsWith('.') && !desc.trim().endsWith('!') && !desc.trim().endsWith('?')) {
    issues.push('Meta description should end with proper punctuation');
  }
  
  return {
    valid: issues.length === 0,
    length,
    issues,
  };
}

/**
 * Validate H2 headings - EXACTLY 4-6 per article required
 */
export function validateHeadings(content: string): HeadingsValidation {
  const issues: string[] = [];
  
  const h2Matches = content.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || [];
  const h2Count = h2Matches.length;
  
  if (h2Count < SEO_REQUIREMENTS.h2Headers.min) {
    issues.push(`Not enough H2 headings (${h2Count}). Minimum: ${SEO_REQUIREMENTS.h2Headers.min}`);
  } else if (h2Count > SEO_REQUIREMENTS.h2Headers.max) {
    issues.push(`Too many H2 headings (${h2Count}). Maximum: ${SEO_REQUIREMENTS.h2Headers.max}`);
  }
  
  return {
    h2Count,
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate links - internal (5-8) and external (2-3 authoritative) required
 */
export function validateLinks(content: string): LinksValidation {
  const issues: string[] = [];
  
  const allLinkMatches = content.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
  
  let internalCount = 0;
  let externalCount = 0;
  let authoritativeCount = 0;
  
  for (const match of allLinkMatches) {
    const hrefMatch = match.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    
    const href = hrefMatch[1];
    
    if (href.startsWith('/') || href.includes('travi.world') || href.includes('localhost')) {
      internalCount++;
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      externalCount++;
      const isAuthoritative = AUTHORITATIVE_DOMAINS.some(domain => href.includes(domain));
      if (isAuthoritative) {
        authoritativeCount++;
      }
    }
  }
  
  if (internalCount < SEO_REQUIREMENTS.internalLinks.min) {
    issues.push(`Not enough internal links (${internalCount}). Minimum: ${SEO_REQUIREMENTS.internalLinks.min}`);
  } else if (internalCount > SEO_REQUIREMENTS.internalLinks.max) {
    issues.push(`Too many internal links (${internalCount}). Maximum: ${SEO_REQUIREMENTS.internalLinks.max}`);
  }
  
  if (externalCount < SEO_REQUIREMENTS.externalLinks.min) {
    issues.push(`Not enough external links (${externalCount}). Minimum: ${SEO_REQUIREMENTS.externalLinks.min}`);
  } else if (externalCount > SEO_REQUIREMENTS.externalLinks.max) {
    issues.push(`Too many external links (${externalCount}). Maximum: ${SEO_REQUIREMENTS.externalLinks.max}`);
  }
  
  if (authoritativeCount === 0 && externalCount > 0) {
    issues.push('No links to authoritative sources (visitdubai.com, dubai.ae, dubaitourism.gov.ae, etc.)');
  }
  
  return {
    internal: internalCount,
    external: externalCount,
    authoritativeExternal: authoritativeCount,
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate word count - 1800-3500 words required for articles
 */
export function validateWordCount(content: string): WordCountValidation {
  const issues: string[] = [];
  
  const textOnly = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = textOnly.split(/\s+/).filter(word => word.length > 0);
  const count = words.length;
  
  if (count < SEO_REQUIREMENTS.wordCount.minimum) {
    issues.push(`Content is too short (${count} words). Minimum: ${SEO_REQUIREMENTS.wordCount.minimum} words`);
  } else if (count > SEO_REQUIREMENTS.wordCount.maximum) {
    issues.push(`Content is too long (${count} words). Maximum: ${SEO_REQUIREMENTS.wordCount.maximum} words`);
  }
  
  return {
    count,
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Detect banned phrases with positions in content
 */
export function detectBannedPhrases(content: string): BannedPhrasesResult {
  const found: string[] = [];
  const positions: number[] = [];
  
  const lowerContent = content.toLowerCase();
  
  for (const phrase of BANNED_PHRASES) {
    const phraseLC = phrase.toLowerCase();
    let startIndex = 0;
    let index: number;
    
    while ((index = lowerContent.indexOf(phraseLC, startIndex)) !== -1) {
      if (!found.includes(phrase)) {
        found.push(phrase);
      }
      positions.push(index);
      startIndex = index + 1;
    }
  }
  
  const sortedPositions = [...positions].sort((a, b) => a - b);
  
  return {
    found,
    positions: sortedPositions,
  };
}

/**
 * Validate alt text - 5-15 words, 20-125 characters, no marketing language
 */
export function validateAltText(alt: string): AltTextValidation {
  const issues: string[] = [];
  
  const trimmedAlt = alt.trim();
  const charCount = trimmedAlt.length;
  const words = trimmedAlt.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (charCount === 0) {
    issues.push('Alt text is empty');
    return { valid: false, issues };
  }
  
  if (charCount < SEO_REQUIREMENTS.altText.minChars) {
    issues.push(`Alt text is too short (${charCount} chars). Minimum: ${SEO_REQUIREMENTS.altText.minChars} characters`);
  } else if (charCount > SEO_REQUIREMENTS.altText.maxChars) {
    issues.push(`Alt text is too long (${charCount} chars). Maximum: ${SEO_REQUIREMENTS.altText.maxChars} characters`);
  }
  
  if (wordCount < SEO_REQUIREMENTS.altText.minWords) {
    issues.push(`Alt text has too few words (${wordCount}). Minimum: ${SEO_REQUIREMENTS.altText.minWords} words`);
  } else if (wordCount > SEO_REQUIREMENTS.altText.maxWords) {
    issues.push(`Alt text has too many words (${wordCount}). Maximum: ${SEO_REQUIREMENTS.altText.maxWords} words`);
  }
  
  const altLower = trimmedAlt.toLowerCase();
  for (const bannedWord of ALT_TEXT_BANNED_WORDS) {
    if (altLower.includes(bannedWord.toLowerCase())) {
      issues.push(`Alt text contains marketing language: "${bannedWord}". Use factual descriptions only.`);
    }
  }
  
  if (altLower.startsWith('image of') || altLower.startsWith('photo of') || altLower.startsWith('picture of')) {
    issues.push('Alt text should not start with "image of", "photo of", or "picture of"');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate images - must have 1 hero + 1 per H2 section (imageCount >= h2Count + 1)
 */
export function validateImages(content: string): ImagesValidation {
  const issues: string[] = [];
  
  const imgMatches = content.match(/<img[^>]*>/gi) || [];
  const imageCount = imgMatches.length;
  
  const h2Matches = content.match(/<h2[^>]*>/gi) || [];
  const h2Count = h2Matches.length;
  
  const requiredMinimum = h2Count + 1;
  
  if (imageCount < requiredMinimum) {
    issues.push(`Not enough images (${imageCount}). Need at least ${requiredMinimum} (1 hero + ${h2Count} for H2 sections)`);
  }
  
  return {
    imageCount,
    h2Count,
    requiredMinimum,
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Suggest a compliant meta title from content
 */
export function suggestMetaTitle(content: string): string {
  const textOnly = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let baseTitle = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';
  
  if (!baseTitle) {
    const firstSentence = textOnly.split(/[.!?]/)[0]?.trim() || '';
    baseTitle = firstSentence;
  }
  
  baseTitle = baseTitle.replace(/\s+/g, ' ').trim();
  
  if (baseTitle.length >= SEO_REQUIREMENTS.metaTitle.minLength && 
      baseTitle.length <= SEO_REQUIREMENTS.metaTitle.maxLength) {
    return baseTitle;
  }
  
  if (baseTitle.length < SEO_REQUIREMENTS.metaTitle.minLength) {
    const suffix = ' | Travi Travel Guide 2025';
    if (baseTitle.length + suffix.length <= SEO_REQUIREMENTS.metaTitle.maxLength) {
      baseTitle = baseTitle + suffix;
    } else {
      const shorterSuffix = ' | Dubai Travel';
      baseTitle = baseTitle + shorterSuffix;
    }
    
    if (baseTitle.length < SEO_REQUIREMENTS.metaTitle.minLength) {
      const pad = 'Expert Travel Guide and Tips';
      baseTitle = baseTitle + ' - ' + pad.substring(0, SEO_REQUIREMENTS.metaTitle.minLength - baseTitle.length - 3);
    }
  }
  
  if (baseTitle.length > SEO_REQUIREMENTS.metaTitle.maxLength) {
    baseTitle = baseTitle.substring(0, SEO_REQUIREMENTS.metaTitle.maxLength - 3).trim() + '...';
  }
  
  return baseTitle.substring(0, SEO_REQUIREMENTS.metaTitle.maxLength);
}

/**
 * Suggest a compliant meta description from content
 */
export function suggestMetaDescription(content: string): string {
  const textOnly = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const sentences = textOnly.match(/[^.!?]+[.!?]+/g) || [];
  let description = '';
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 20) continue;
    
    const potentialDesc = description ? description + ' ' + trimmed : trimmed;
    
    if (potentialDesc.length >= SEO_REQUIREMENTS.metaDescription.minLength &&
        potentialDesc.length <= SEO_REQUIREMENTS.metaDescription.maxLength) {
      description = potentialDesc;
      break;
    } else if (potentialDesc.length < SEO_REQUIREMENTS.metaDescription.maxLength) {
      description = potentialDesc;
    } else {
      break;
    }
  }
  
  if (description.length < SEO_REQUIREMENTS.metaDescription.minLength) {
    const cta = ' Discover essential tips for your next adventure.';
    if (description.length + cta.length <= SEO_REQUIREMENTS.metaDescription.maxLength) {
      description = description.trim() + cta;
    }
  }
  
  if (description.length > SEO_REQUIREMENTS.metaDescription.maxLength) {
    description = description.substring(0, SEO_REQUIREMENTS.metaDescription.maxLength - 3).trim();
    const lastSpace = description.lastIndexOf(' ');
    if (lastSpace > SEO_REQUIREMENTS.metaDescription.minLength - 10) {
      description = description.substring(0, lastSpace) + '...';
    } else {
      description = description + '...';
    }
  }
  
  if (description.length < SEO_REQUIREMENTS.metaDescription.minLength) {
    while (description.length < SEO_REQUIREMENTS.metaDescription.minLength) {
      description = description.replace(/\.\.\.$/, '').trim() + ' Plan your visit today.';
      if (description.length > SEO_REQUIREMENTS.metaDescription.maxLength) {
        description = description.substring(0, SEO_REQUIREMENTS.metaDescription.maxLength);
        break;
      }
    }
  }
  
  return description.trim();
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Comprehensive SEO validation for content
 */
export function validateSEO(content: ContentForValidation): SEOValidationResult {
  const errors: SEOError[] = [];
  const warnings: SEOWarning[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  if (content.metaTitle !== undefined) {
    const titleResult = validateMetaTitle(content.metaTitle);
    if (!titleResult.valid) {
      for (const issue of titleResult.issues) {
        errors.push({
          code: 'META_TITLE_INVALID',
          field: 'metaTitle',
          message: issue,
          actual: titleResult.length,
          required: `${SEO_REQUIREMENTS.metaTitle.minLength}-${SEO_REQUIREMENTS.metaTitle.maxLength}`,
        });
      }
      score -= 15;
      suggestions.push(`Suggested title: "${suggestMetaTitle(content.content)}"`);
    }
  } else {
    warnings.push({
      code: 'META_TITLE_MISSING',
      field: 'metaTitle',
      message: 'Meta title is not provided',
      suggestion: 'Add a meta title between 50-60 characters',
    });
    score -= 10;
  }
  
  if (content.metaDescription !== undefined) {
    const descResult = validateMetaDescription(content.metaDescription);
    if (!descResult.valid) {
      for (const issue of descResult.issues) {
        errors.push({
          code: 'META_DESC_INVALID',
          field: 'metaDescription',
          message: issue,
          actual: descResult.length,
          required: `${SEO_REQUIREMENTS.metaDescription.minLength}-${SEO_REQUIREMENTS.metaDescription.maxLength}`,
        });
      }
      score -= 15;
      suggestions.push(`Suggested description: "${suggestMetaDescription(content.content)}"`);
    }
  } else {
    warnings.push({
      code: 'META_DESC_MISSING',
      field: 'metaDescription',
      message: 'Meta description is not provided',
      suggestion: 'Add a meta description between 150-160 characters',
    });
    score -= 10;
  }
  
  const headingsResult = validateHeadings(content.content);
  if (!headingsResult.valid) {
    for (const issue of headingsResult.issues) {
      errors.push({
        code: 'H2_COUNT_INVALID',
        field: 'content',
        message: issue,
        actual: headingsResult.h2Count,
        required: `${SEO_REQUIREMENTS.h2Headers.min}-${SEO_REQUIREMENTS.h2Headers.max}`,
      });
    }
    score -= 12;
  }
  
  const linksResult = validateLinks(content.content);
  if (!linksResult.valid) {
    for (const issue of linksResult.issues) {
      const isInternalIssue = issue.toLowerCase().includes('internal');
      errors.push({
        code: isInternalIssue ? 'INTERNAL_LINKS_INVALID' : 'EXTERNAL_LINKS_INVALID',
        field: 'content',
        message: issue,
        actual: isInternalIssue ? linksResult.internal : linksResult.external,
        required: isInternalIssue 
          ? `${SEO_REQUIREMENTS.internalLinks.min}-${SEO_REQUIREMENTS.internalLinks.max}`
          : `${SEO_REQUIREMENTS.externalLinks.min}-${SEO_REQUIREMENTS.externalLinks.max}`,
      });
    }
    score -= 10;
    
    if (linksResult.internal < SEO_REQUIREMENTS.internalLinks.min) {
      suggestions.push(`Add ${SEO_REQUIREMENTS.internalLinks.min - linksResult.internal} more internal links to related Travi pages`);
    }
    if (linksResult.external < SEO_REQUIREMENTS.externalLinks.min) {
      suggestions.push('Add external links to authoritative sources like visitdubai.com or dubai.ae');
    }
  }
  
  const wordCountResult = validateWordCount(content.content);
  if (!wordCountResult.valid) {
    for (const issue of wordCountResult.issues) {
      errors.push({
        code: 'WORD_COUNT_INVALID',
        field: 'content',
        message: issue,
        actual: wordCountResult.count,
        required: `${SEO_REQUIREMENTS.wordCount.minimum}-${SEO_REQUIREMENTS.wordCount.maximum}`,
      });
    }
    score -= 12;
  }
  
  const imagesResult = validateImages(content.content);
  if (!imagesResult.valid) {
    for (const issue of imagesResult.issues) {
      errors.push({
        code: 'IMAGE_COUNT_INVALID',
        field: 'images',
        message: issue,
        actual: imagesResult.imageCount,
        required: `>= ${imagesResult.requiredMinimum}`,
      });
    }
    score -= 8;
    suggestions.push('Add more images: 1 hero image plus 1 image per H2 section');
  }
  
  const bannedResult = detectBannedPhrases(content.content);
  if (bannedResult.found.length > 0) {
    for (const phrase of bannedResult.found) {
      errors.push({
        code: 'BANNED_PHRASE',
        field: 'content',
        message: `Banned phrase detected: "${phrase}"`,
        actual: phrase,
        required: 'Professional language only',
      });
      
      const alternatives = PHRASE_ALTERNATIVES[phrase] || PHRASE_ALTERNATIVES[phrase.replace(/-/g, ' ')];
      if (alternatives) {
        suggestions.push(`Replace "${phrase}" with: ${alternatives.join(', ')}`);
      }
    }
    score -= Math.min(bannedResult.found.length * 5, 20);
  }
  
  if (content.altTexts) {
    for (let i = 0; i < content.altTexts.length; i++) {
      const altResult = validateAltText(content.altTexts[i]);
      if (!altResult.valid) {
        for (const issue of altResult.issues) {
          warnings.push({
            code: 'ALT_TEXT_INVALID',
            field: `altText[${i}]`,
            message: issue,
            suggestion: 'Use 5-15 words (20-125 chars) with factual descriptions only',
          });
        }
        score -= 3;
      }
    }
  }
  
  if (content.images) {
    for (let i = 0; i < content.images.length; i++) {
      const img = content.images[i];
      if (img.alt) {
        const altResult = validateAltText(img.alt);
        if (!altResult.valid) {
          for (const issue of altResult.issues) {
            warnings.push({
              code: 'ALT_TEXT_INVALID',
              field: `images[${i}].alt`,
              message: issue,
              suggestion: 'Use 5-15 words (20-125 chars) with factual descriptions only',
            });
          }
          score -= 3;
        }
      } else {
        warnings.push({
          code: 'ALT_TEXT_MISSING',
          field: `images[${i}]`,
          message: `Image ${i + 1} is missing alt text`,
          suggestion: 'Add descriptive alt text for accessibility and SEO',
        });
        score -= 2;
      }
    }
  }
  
  score = Math.max(0, Math.min(100, score));
  
  const criticalErrors = errors.filter(e => 
    e.code.includes('META_') || 
    e.code.includes('WORD_COUNT') ||
    e.code === 'BANNED_PHRASE'
  );
  
  return {
    isValid: criticalErrors.length === 0 && score >= 70,
    score,
    errors,
    warnings,
    suggestions,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SEO_REQUIREMENTS,
  BANNED_PHRASES,
  PHRASE_ALTERNATIVES,
  AUTHORITATIVE_DOMAINS,
  ALT_TEXT_BANNED_WORDS,
};
