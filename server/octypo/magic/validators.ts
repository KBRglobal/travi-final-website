/**
 * Octypo Magic Engine - Content Validators
 * Validates AI-generated content meets quality standards
 */

import { createLogger } from "../../lib/logger";

const logger = createLogger("magic-validators");

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: string;
}

export interface FAQValidationResult extends ValidationResult {
  validFaqs: Array<{ question: string; answer: string }>;
  invalidFaqs: Array<{ question: string; answer: string; reason: string }>;
}

// ============================================================================
// Constants
// ============================================================================

// SEO-audit skill: banned phrases that hurt rankings
export const BANNED_PHRASES = [
  // AI-typical phrases
  "nestled",
  "hidden gem",
  "tapestry",
  "vibrant",
  "bustling",
  "whether you're",
  "there's something for everyone",
  "unforgettable",
  "breathtaking",
  "stunning",
  "amazing",
  "incredible",
  "delve into",
  "embark on",
  "unlock",
  "in conclusion",
  "ultimately",
  "at the end of the day",
  "it's worth noting",
  "interestingly",
  "it is important to note",
  "one cannot help but",
  "serves as a testament",
  // Marketing fluff
  "a must-visit",
  "truly unique",
  "like no other",
  "world-class",
  "second to none",
  "state-of-the-art",
  "cutting-edge",
  "iconic",
  "legendary",
  "paradise",
  "oasis",
  "sanctuary",
  "mecca",
  "crown jewel",
  "jewel in the crown",
  "feast for the senses",
  "treat for the senses",
  "once-in-a-lifetime",
  "must-see",
  "absolutely stunning",
  "truly amazing",
  // Click-bait
  "you won't believe",
  "shocking",
  "mind-blowing",
];

// Characters that should not appear in slugs
const INVALID_SLUG_CHARS = /[^a-z0-9-]/;

// ============================================================================
// Meta Title Validator
// ============================================================================

/**
 * Validate meta title for SEO best practices
 * - Must be <= 60 characters (Google truncates at ~60)
 * - Should not contain banned phrases
 * - Should not be all caps
 * - Should contain the entity name
 */
export function validateMetaTitle(
  title: string,
  options?: { entityName?: string }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = title.trim();

  // Check length
  if (sanitized.length === 0) {
    errors.push("Meta title cannot be empty");
    return { valid: false, errors, warnings };
  }

  if (sanitized.length > 60) {
    errors.push(
      `Meta title exceeds 60 characters (${sanitized.length}). Will be truncated in search results.`
    );
    // Auto-truncate at word boundary
    const truncated = sanitized.substring(0, 57).trim();
    const lastSpace = truncated.lastIndexOf(" ");
    sanitized = lastSpace > 40 ? truncated.substring(0, lastSpace) + "..." : truncated + "...";
  }

  if (sanitized.length < 30) {
    warnings.push(`Meta title is short (${sanitized.length} chars). Aim for 50-60 for better CTR.`);
  }

  // Check for banned phrases
  const bannedFound = BANNED_PHRASES.filter(phrase =>
    sanitized.toLowerCase().includes(phrase.toLowerCase())
  );
  if (bannedFound.length > 0) {
    warnings.push(
      `Contains AI-typical phrases that may hurt authenticity: ${bannedFound.join(", ")}`
    );
  }

  // Check for all caps (screaming)
  if (sanitized === sanitized.toUpperCase() && sanitized.length > 10) {
    warnings.push("All caps title may appear spammy. Use title case instead.");
    sanitized = toTitleCase(sanitized);
  }

  // Check for entity name inclusion
  if (options?.entityName && !sanitized.toLowerCase().includes(options.entityName.toLowerCase())) {
    warnings.push(
      `Meta title should include the entity name "${options.entityName}" for relevance.`
    );
  }

  // Check for pipe/dash separators (good practice)
  if (!sanitized.includes("|") && !sanitized.includes("-") && !sanitized.includes(":")) {
    warnings.push("Consider adding brand separator (e.g., ' | TRAVI' or ' - TRAVI')");
  }

  logger.debug({ title: sanitized, errors, warnings }, "Meta title validation");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// Meta Description Validator
// ============================================================================

function truncateAtBoundary(text: string, maxLen: number): string {
  const truncated = text.substring(0, maxLen).trim();
  const lastPeriod = truncated.lastIndexOf(".");
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastPeriod > 100) return truncated.substring(0, lastPeriod + 1);
  if (lastSpace > 100) return truncated.substring(0, lastSpace) + "...";
  return truncated + "...";
}

function checkDescriptionLength(length: number, warnings: string[]): void {
  if (length < 120) {
    warnings.push(
      `Meta description is short (${length} chars). Aim for 150-160 for better visibility.`
    );
  } else if (length > 140 && length < 150) {
    warnings.push("Meta description slightly short. Adding a few more words could improve CTR.");
  }
}

/**
 * Validate meta description for SEO best practices
 * - Optimal length: 150-160 characters
 * - Should not contain banned phrases
 * - Should have a call to action
 */
export function validateMetaDescription(
  description: string,
  options?: { entityName?: string; requireCTA?: boolean }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = description.trim();

  // Check length
  if (sanitized.length === 0) {
    errors.push("Meta description cannot be empty");
    return { valid: false, errors, warnings };
  }

  if (sanitized.length > 160) {
    errors.push(
      `Meta description exceeds 160 characters (${sanitized.length}). Will be truncated.`
    );
    sanitized = truncateAtBoundary(sanitized, 157);
  }

  checkDescriptionLength(sanitized.length, warnings);

  // Check for banned phrases
  const bannedFound = BANNED_PHRASES.filter(phrase =>
    sanitized.toLowerCase().includes(phrase.toLowerCase())
  );
  if (bannedFound.length > 0) {
    warnings.push(`Contains generic phrases: ${bannedFound.slice(0, 3).join(", ")}`);
  }

  // Check for CTA indicators
  const ctaPatterns = [
    /discover/i,
    /learn/i,
    /find out/i,
    /explore/i,
    /book/i,
    /get/i,
    /read/i,
    /see/i,
    /check/i,
    /view/i,
  ];
  const hasCTA = ctaPatterns.some(pattern => pattern.test(sanitized));
  if (options?.requireCTA && !hasCTA) {
    warnings.push("Consider adding a call-to-action (e.g., 'Discover', 'Learn', 'Explore')");
  }

  // Check for entity name inclusion
  if (options?.entityName && !sanitized.toLowerCase().includes(options.entityName.toLowerCase())) {
    warnings.push(`Meta description should mention "${options.entityName}" for relevance.`);
  }

  logger.debug({ description: sanitized, errors, warnings }, "Meta description validation");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// Slug Validator
// ============================================================================

function truncateSlug(slug: string, maxLen: number): string {
  const parts = slug.split("-");
  let truncated = "";
  for (const part of parts) {
    if (truncated.length + part.length + 1 <= maxLen) {
      truncated = truncated ? `${truncated}-${part}` : part;
    } else {
      break;
    }
  }
  return truncated || slug.substring(0, maxLen);
}

/**
 * Validate URL slug for SEO best practices
 * - Lowercase letters, numbers, hyphens only
 * - No consecutive hyphens
 * - No leading/trailing hyphens
 * - Reasonable length (3-60 chars)
 */
export function validateSlug(slug: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = slug.trim().toLowerCase();

  // Check empty
  if (sanitized.length === 0) {
    errors.push("Slug cannot be empty");
    return { valid: false, errors, warnings };
  }

  // Remove invalid characters
  if (INVALID_SLUG_CHARS.test(sanitized)) {
    const original = sanitized;
    sanitized = sanitized
      .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Collapse multiple hyphens
      .replace(/(?:^-)|(?:-$)/g, ""); // Remove leading/trailing hyphens
    warnings.push(
      `Slug contained invalid characters. Sanitized from "${original}" to "${sanitized}"`
    );
  }

  // Check for consecutive hyphens
  if (/--+/.test(sanitized)) {
    sanitized = sanitized.replace(/-+/g, "-");
    warnings.push("Removed consecutive hyphens from slug");
  }

  // Check leading/trailing hyphens
  if (sanitized.startsWith("-") || sanitized.endsWith("-")) {
    sanitized = sanitized.replace(/(?:^-+)|(?:-+$)/g, "");
    warnings.push("Removed leading/trailing hyphens from slug");
  }

  // Check length
  if (sanitized.length < 3) {
    errors.push("Slug too short (minimum 3 characters)");
  }

  if (sanitized.length > 60) {
    errors.push(`Slug too long (${sanitized.length} chars). Keep under 60 for better URLs.`);
    sanitized = truncateSlug(sanitized, 60);
  }

  // Check for stop words (optional warning)
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for"]);
  const slugParts = sanitized.split("-");
  const stopWordsFound = slugParts.filter(part => stopWords.has(part));
  if (stopWordsFound.length > 2) {
    warnings.push(
      `Slug contains multiple stop words (${stopWordsFound.join(", ")}). Consider removing for cleaner URLs.`
    );
  }

  logger.debug({ slug: sanitized, errors, warnings }, "Slug validation");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// FAQ Validator
// ============================================================================

/**
 * Validate FAQ array structure and content
 * - Each FAQ must have question and answer
 * - Questions should end with ?
 * - Answers should be substantive (min 20 chars)
 */
function validateSingleFAQ(faq: any, minAnswerLength: number): string[] {
  const issues: string[] = [];
  if (!faq || typeof faq !== "object") {
    issues.push("Invalid FAQ object");
    return issues;
  }
  // Check question
  if (!faq.question || typeof faq.question !== "string") {
    issues.push("Missing or invalid question");
  } else if (faq.question.trim().length < 10) {
    issues.push("Question too short");
  } else if (!faq.question.trim().endsWith("?")) {
    faq.question = faq.question.trim() + "?";
  }
  // Check answer
  if (!faq.answer || typeof faq.answer !== "string") {
    issues.push("Missing or invalid answer");
  } else if (faq.answer.trim().length < minAnswerLength) {
    issues.push(`Answer too short (min ${minAnswerLength} chars)`);
  }
  return issues;
}

export function validateFAQs(
  faqs: Array<{ question: string; answer: string }>,
  options?: { minCount?: number; maxCount?: number; minAnswerLength?: number }
): FAQValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validFaqs: Array<{ question: string; answer: string }> = [];
  const invalidFaqs: Array<{ question: string; answer: string; reason: string }> = [];

  const minCount = options?.minCount ?? 3;
  const maxCount = options?.maxCount ?? 15;
  const minAnswerLength = options?.minAnswerLength ?? 20;

  // Check array
  if (!Array.isArray(faqs)) {
    errors.push("FAQs must be an array");
    return { valid: false, errors, warnings, validFaqs, invalidFaqs };
  }

  // Validate each FAQ
  for (const faq of faqs) {
    const issues = validateSingleFAQ(faq, minAnswerLength);

    if (issues.length > 0) {
      invalidFaqs.push({
        question: faq?.question || "",
        answer: faq?.answer || "",
        reason: issues.join("; "),
      });
    } else {
      validFaqs.push({
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      });
    }
  }

  // Check count
  if (validFaqs.length < minCount) {
    errors.push(`Need at least ${minCount} valid FAQs (got ${validFaqs.length})`);
  }

  if (validFaqs.length > maxCount) {
    warnings.push(`More than ${maxCount} FAQs may be overwhelming. Consider trimming.`);
  }

  // Check for duplicate questions
  const questions = validFaqs.map(f => f.question.toLowerCase());
  const duplicates = questions.filter((q, i) => questions.indexOf(q) !== i);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate questions found: ${duplicates.slice(0, 3).join(", ")}`);
  }

  logger.debug(
    { validCount: validFaqs.length, invalidCount: invalidFaqs.length, errors, warnings },
    "FAQ validation"
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validFaqs,
    invalidFaqs,
  };
}

// ============================================================================
// Title Validator
// ============================================================================

/**
 * Validate content title
 * - Not empty
 * - Reasonable length
 * - No excessive punctuation
 */
export function validateTitle(title: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = title.trim();

  if (sanitized.length === 0) {
    errors.push("Title cannot be empty");
    return { valid: false, errors, warnings };
  }

  if (sanitized.length < 10) {
    warnings.push("Title is very short. Consider making it more descriptive.");
  }

  if (sanitized.length > 100) {
    warnings.push("Title is quite long. Consider shortening for better display.");
    sanitized = sanitized.substring(0, 97) + "...";
  }

  // Check for excessive punctuation
  const exclamations = (sanitized.match(/!/g) || []).length;
  if (exclamations > 1) {
    warnings.push("Multiple exclamation marks may appear unprofessional.");
  }

  // Check for all caps
  if (sanitized === sanitized.toUpperCase() && sanitized.length > 5) {
    warnings.push("All caps title may appear aggressive. Consider title case.");
    sanitized = toTitleCase(sanitized);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// Description Validator
// ============================================================================

/**
 * Validate content description
 * - Not empty
 * - Minimum length for substance
 * - No banned phrases
 */
export function validateDescription(
  description: string,
  options?: { minLength?: number; maxLength?: number }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitized = description.trim();

  const minLength = options?.minLength ?? 50;
  const maxLength = options?.maxLength ?? 500;

  if (sanitized.length === 0) {
    errors.push("Description cannot be empty");
    return { valid: false, errors, warnings };
  }

  if (sanitized.length < minLength) {
    errors.push(`Description too short (min ${minLength} chars, got ${sanitized.length})`);
  }

  if (sanitized.length > maxLength) {
    warnings.push(
      `Description is long (${sanitized.length} chars). Consider trimming to ${maxLength}.`
    );
  }

  // Check for banned phrases
  const bannedFound = BANNED_PHRASES.filter(phrase =>
    sanitized.toLowerCase().includes(phrase.toLowerCase())
  );
  if (bannedFound.length > 0) {
    warnings.push(
      `Contains generic phrases that may hurt authenticity: ${bannedFound.slice(0, 3).join(", ")}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// Coordinates Validator
// ============================================================================

/**
 * Validate geographic coordinates
 */
export function validateCoordinates(
  coordinates: { lat: number; lng: number } | null
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!coordinates) {
    errors.push("Coordinates are required");
    return { valid: false, errors, warnings };
  }

  if (typeof coordinates.lat !== "number" || typeof coordinates.lng !== "number") {
    errors.push("Coordinates must be numbers");
    return { valid: false, errors, warnings };
  }

  if (coordinates.lat < -90 || coordinates.lat > 90) {
    errors.push(`Invalid latitude: ${coordinates.lat} (must be -90 to 90)`);
  }

  if (coordinates.lng < -180 || coordinates.lng > 180) {
    errors.push(`Invalid longitude: ${coordinates.lng} (must be -180 to 180)`);
  }

  // Check for null island (0, 0)
  if (coordinates.lat === 0 && coordinates.lng === 0) {
    warnings.push("Coordinates are at null island (0, 0). This is likely incorrect.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Social Content Validators
// ============================================================================

/**
 * Validate Twitter/X content
 * - Must be <= 280 characters
 * - Should include hashtags
 */
export function validateTwitterContent(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = content.trim();

  if (sanitized.length === 0) {
    errors.push("Twitter content cannot be empty");
    return { valid: false, errors, warnings };
  }

  if (sanitized.length > 280) {
    errors.push(`Twitter content exceeds 280 characters (${sanitized.length})`);
    // Truncate to leave room for "..."
    sanitized = sanitized.substring(0, 277) + "...";
  }

  // Check for hashtags
  const hashtagCount = (sanitized.match(/#\w+/g) || []).length;
  if (hashtagCount === 0) {
    warnings.push("Consider adding 1-3 relevant hashtags for better reach");
  } else if (hashtagCount > 5) {
    warnings.push("Too many hashtags may appear spammy. Aim for 2-4.");
  }

  // Check for URL placeholder
  if (
    !sanitized.includes("http") &&
    !sanitized.includes("{url}") &&
    !sanitized.includes("[link]")
  ) {
    warnings.push("Consider including a link to drive traffic");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

/**
 * Validate Facebook content
 * - Can be longer but optimal is 40-80 chars for engagement
 */
export function validateFacebookContent(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitized = content.trim();

  if (sanitized.length === 0) {
    errors.push("Facebook content cannot be empty");
    return { valid: false, errors, warnings };
  }

  if (sanitized.length > 500) {
    warnings.push(
      "Facebook posts over 500 chars may get truncated. Aim for engagement-friendly length."
    );
  }

  // Optimal length check
  if (sanitized.length < 40) {
    warnings.push("Short posts may lack context. Consider expanding.");
  } else if (sanitized.length > 80 && sanitized.length <= 200) {
    // Good length range
  } else if (sanitized.length > 200) {
    warnings.push("Longer posts can work but ensure the hook is in the first line.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// Price Range Validator
// ============================================================================

/**
 * Validate price range format
 */
export function validatePriceRange(priceRange: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitized = priceRange.trim();

  if (sanitized.length === 0) {
    errors.push("Price range cannot be empty");
    return { valid: false, errors, warnings };
  }

  // Check for common formats
  const validFormats = [
    /^\$+$/, // $, $$, $$$
    /^(budget|moderate|expensive|luxury)$/i,
    /^\d+-\d+\s*(usd|eur|gbp|aed)?$/i, // 10-50 USD
    /^(from\s+)?\$?\d+/i, // from $10 or $10
  ];

  const isValidFormat = validFormats.some(pattern => pattern.test(sanitized));
  if (!isValidFormat) {
    warnings.push(
      "Price range format unclear. Consider using formats like '$$$', '10-50 USD', or 'Budget/Moderate/Expensive'"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

// ============================================================================
// Highlights/Amenities Validator
// ============================================================================

/**
 * Validate array of highlights or amenities
 */
export function validateStringArray(
  items: string[],
  fieldName: string,
  options?: { minCount?: number; maxCount?: number; minLength?: number }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const minCount = options?.minCount ?? 1;
  const maxCount = options?.maxCount ?? 20;
  const minLength = options?.minLength ?? 3;

  if (!Array.isArray(items)) {
    errors.push(`${fieldName} must be an array`);
    return { valid: false, errors, warnings };
  }

  // Filter valid items
  const validItems = items
    .filter(item => typeof item === "string" && item.trim().length >= minLength)
    .map(item => item.trim());

  if (validItems.length < minCount) {
    errors.push(`Need at least ${minCount} valid ${fieldName} (got ${validItems.length})`);
  }

  if (validItems.length > maxCount) {
    warnings.push(`More than ${maxCount} ${fieldName} may be overwhelming. Consider trimming.`);
  }

  // Check for duplicates
  const duplicates = validItems.filter((item, i) => validItems.indexOf(item) !== i);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate ${fieldName} found: ${duplicates.slice(0, 3).join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized: JSON.stringify(validItems),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Run all validations on a generated content object
 */
export function validateGeneratedContent(content: {
  title?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  faqs?: Array<{ question: string; answer: string }>;
  highlights?: string[];
  amenities?: string[];
  coordinates?: { lat: number; lng: number };
  priceRange?: string;
  twitterContent?: string;
  facebookContent?: string;
}): {
  valid: boolean;
  results: Record<string, ValidationResult | FAQValidationResult>;
  errorCount: number;
  warningCount: number;
} {
  const results: Record<string, ValidationResult | FAQValidationResult> = {};
  let errorCount = 0;
  let warningCount = 0;

  if (content.title) {
    results.title = validateTitle(content.title);
    errorCount += results.title.errors.length;
    warningCount += results.title.warnings.length;
  }

  if (content.description) {
    results.description = validateDescription(content.description);
    errorCount += results.description.errors.length;
    warningCount += results.description.warnings.length;
  }

  if (content.metaTitle) {
    results.metaTitle = validateMetaTitle(content.metaTitle);
    errorCount += results.metaTitle.errors.length;
    warningCount += results.metaTitle.warnings.length;
  }

  if (content.metaDescription) {
    results.metaDescription = validateMetaDescription(content.metaDescription);
    errorCount += results.metaDescription.errors.length;
    warningCount += results.metaDescription.warnings.length;
  }

  if (content.slug) {
    results.slug = validateSlug(content.slug);
    errorCount += results.slug.errors.length;
    warningCount += results.slug.warnings.length;
  }

  if (content.faqs) {
    results.faqs = validateFAQs(content.faqs);
    errorCount += results.faqs.errors.length;
    warningCount += results.faqs.warnings.length;
  }

  if (content.highlights) {
    results.highlights = validateStringArray(content.highlights, "highlights", { minCount: 3 });
    errorCount += results.highlights.errors.length;
    warningCount += results.highlights.warnings.length;
  }

  if (content.amenities) {
    results.amenities = validateStringArray(content.amenities, "amenities", { minCount: 3 });
    errorCount += results.amenities.errors.length;
    warningCount += results.amenities.warnings.length;
  }

  if (content.coordinates) {
    results.coordinates = validateCoordinates(content.coordinates);
    errorCount += results.coordinates.errors.length;
    warningCount += results.coordinates.warnings.length;
  }

  if (content.priceRange) {
    results.priceRange = validatePriceRange(content.priceRange);
    errorCount += results.priceRange.errors.length;
    warningCount += results.priceRange.warnings.length;
  }

  if (content.twitterContent) {
    results.twitterContent = validateTwitterContent(content.twitterContent);
    errorCount += results.twitterContent.errors.length;
    warningCount += results.twitterContent.warnings.length;
  }

  if (content.facebookContent) {
    results.facebookContent = validateFacebookContent(content.facebookContent);
    errorCount += results.facebookContent.errors.length;
    warningCount += results.facebookContent.warnings.length;
  }

  return {
    valid: errorCount === 0,
    results,
    errorCount,
    warningCount,
  };
}
