/**
 * Content Quality Gateway
 *
 * Comprehensive quality control system that validates all content before publishing.
 * Enforces strict SEO, content, structure, and compliance standards.
 */

import { createLogger } from "./logger";
import { BANNED_PHRASES, PHRASE_ALTERNATIVES, type ContentType } from "./seo-standards";

const logger = createLogger("content-quality-gateway");

// ============================================================================
// INTERFACES
// ============================================================================

export interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-100
  checks: QualityCheck[];
  blockers: QualityBlocker[];
  recommendations: string[];
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  details: string;
}

export interface QualityBlocker {
  type: "seo" | "content" | "structure" | "compliance";
  message: string;
  severity: "critical" | "major" | "minor";
}

export interface GeneratedContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  htmlContent: string;
  contentType?: ContentType;
  images?: ImageInfo[];
  schema?: object;
}

export interface MetaInfo {
  title: string;
  description: string;
}

export interface ImageInfo {
  src: string;
  alt?: string;
  isHero?: boolean;
}

export interface ReadabilityResult {
  score: number;
  grade: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const QUALITY_WEIGHTS = {
  seo: 20,
  content: 30,
  structure: 20,
  compliance: 30,
} as const;

const PASSING_SCORE = 80;

const WORD_COUNT_LIMITS = {
  min: 1800,
  max: 3500,
} as const;

const H2_LIMITS = {
  min: 4,
  max: 6,
} as const;

const LINK_QUOTAS = {
  internal: { min: 5, max: 8 },
  external: { min: 2, max: 3 },
} as const;

const META_LIMITS = {
  title: { min: 50, max: 60 },
  description: { min: 150, max: 160 },
} as const;

const AUTHORITATIVE_DOMAINS = [
  "visitdubai.com",
  "dubai.ae",
  "dubaitourism.gov.ae",
  "tripadvisor.com",
  "booking.com",
  "lonelyplanet.com",
  "timeout.com",
  "gov.uk",
  "travel.state.gov",
];

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate content through the quality gateway
 */
export function validateContent(content: GeneratedContent): QualityCheckResult {
  logger.info(`Validating content through quality gateway: "${content.title}"`);

  const checks: QualityCheck[] = [];
  const blockers: QualityBlocker[] = [];
  const recommendations: string[] = [];

  const plainText = extractPlainText(content.htmlContent);

  // Run all quality checks
  const wordCountCheck = checkWordCount(plainText);
  checks.push(wordCountCheck);
  if (!wordCountCheck.passed) {
    blockers.push({
      type: "content",
      message: wordCountCheck.details,
      severity: "critical",
    });
  }

  const headingCheck = checkHeadingStructure(content.htmlContent);
  checks.push(headingCheck);
  if (!headingCheck.passed) {
    blockers.push({
      type: "structure",
      message: headingCheck.details,
      severity: headingCheck.score < 50 ? "critical" : "major",
    });
  }

  const linkCheck = checkLinkQuotas(content.htmlContent);
  checks.push(linkCheck);
  if (!linkCheck.passed) {
    blockers.push({
      type: "structure",
      message: linkCheck.details,
      severity: "major",
    });
  }

  const imageCheck = checkImageRequirements(content.htmlContent, content.images);
  checks.push(imageCheck);
  if (!imageCheck.passed) {
    blockers.push({
      type: "content",
      message: imageCheck.details,
      severity: "major",
    });
  }

  const seoCheck = checkSEOCompliance({
    title: content.metaTitle,
    description: content.metaDescription,
  });
  checks.push(seoCheck);
  if (!seoCheck.passed) {
    blockers.push({
      type: "seo",
      message: seoCheck.details,
      severity: "critical",
    });
  }

  const bannedCheck = checkBannedPhrases(plainText);
  checks.push(bannedCheck);
  if (!bannedCheck.passed) {
    blockers.push({
      type: "compliance",
      message: bannedCheck.details,
      severity: "critical",
    });
  }

  const toneCheck = checkProfessionalTone(content.htmlContent);
  checks.push(toneCheck);
  if (!toneCheck.passed) {
    blockers.push({
      type: "compliance",
      message: toneCheck.details,
      severity: toneCheck.score < 50 ? "major" : "minor",
    });
  }

  if (content.schema) {
    const schemaCheck = checkSchemaValidity(content.schema);
    checks.push(schemaCheck);
    if (!schemaCheck.passed) {
      blockers.push({
        type: "seo",
        message: schemaCheck.details,
        severity: "major",
      });
    }
  }

  if (content.images && content.images.length > 0) {
    const altTextCheck = checkAltText(content.images);
    checks.push(altTextCheck);
    if (!altTextCheck.passed) {
      blockers.push({
        type: "seo",
        message: altTextCheck.details,
        severity: "major",
      });
    }
  }

  const readability = calculateReadability(plainText);
  const readabilityCheck: QualityCheck = {
    name: "Readability",
    passed: readability.score >= 50,
    score: Math.min(100, readability.score),
    details:
      readability.score >= 50
        ? `Flesch reading ease: ${readability.score.toFixed(1)} (${readability.grade})`
        : `Readability too low: ${readability.score.toFixed(1)} (${readability.grade}). Target: >= 50`,
  };
  checks.push(readabilityCheck);
  if (!readabilityCheck.passed) {
    blockers.push({
      type: "content",
      message: readabilityCheck.details,
      severity: "minor",
    });
  }

  // Calculate weighted score
  const score = calculateWeightedScore(checks, blockers);

  // Generate recommendations
  recommendations.push(...generateRecommendations(checks, blockers));

  // Determine if passed
  const hasCriticalBlocker = blockers.some(b => b.severity === "critical");
  const passed = !hasCriticalBlocker && score >= PASSING_SCORE;

  const result: QualityCheckResult = {
    passed,
    score,
    checks,
    blockers,
    recommendations,
  };

  logger.info(
    `Quality gate result for "${content.title}": ${passed ? "PASSED" : "FAILED"} (score: ${score})`
  );

  return result;
}

// ============================================================================
// INDIVIDUAL CHECK FUNCTIONS
// ============================================================================

/**
 * Check word count: 1800-3500 words (blocker if outside)
 */
export function checkWordCount(text: string): QualityCheck {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const count = words.length;

  let passed = count >= WORD_COUNT_LIMITS.min && count <= WORD_COUNT_LIMITS.max;
  let score = 100;
  let details = `Word count: ${count} (target: ${WORD_COUNT_LIMITS.min}-${WORD_COUNT_LIMITS.max})`;

  if (count < WORD_COUNT_LIMITS.min) {
    const deficit = WORD_COUNT_LIMITS.min - count;
    score = Math.max(0, (count / WORD_COUNT_LIMITS.min) * 100);
    details = `Word count too low: ${count} words. Need ${deficit} more words (minimum: ${WORD_COUNT_LIMITS.min})`;
  } else if (count > WORD_COUNT_LIMITS.max) {
    const excess = count - WORD_COUNT_LIMITS.max;
    score = Math.max(0, 100 - (excess / WORD_COUNT_LIMITS.max) * 50);
    details = `Word count too high: ${count} words. Remove ${excess} words (maximum: ${WORD_COUNT_LIMITS.max})`;
  }

  return { name: "Word Count", passed, score, details };
}

/**
 * Check heading structure: H1 present, 4-6 H2s, logical hierarchy
 */
export function checkHeadingStructure(html: string): QualityCheck {
  const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || [];
  const h3Matches = html.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi) || [];

  const h1Count = h1Matches.length;
  const h2Count = h2Matches.length;
  const h3Count = h3Matches.length;

  const issues: string[] = [];
  let score = 100;

  if (h1Count === 0) {
    issues.push("Missing H1 heading");
    score -= 30;
  } else if (h1Count > 1) {
    issues.push(`Multiple H1 headings (${h1Count}). Should have exactly 1`);
    score -= 15;
  }

  if (h2Count < H2_LIMITS.min) {
    issues.push(`Not enough H2 headings: ${h2Count} (minimum: ${H2_LIMITS.min})`);
    score -= (H2_LIMITS.min - h2Count) * 10;
  } else if (h2Count > H2_LIMITS.max) {
    issues.push(`Too many H2 headings: ${h2Count} (maximum: ${H2_LIMITS.max})`);
    score -= (h2Count - H2_LIMITS.max) * 5;
  }

  // Check logical hierarchy (H3s should follow H2s)
  const allHeadings = html.match(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi) || [];
  let lastLevel = 0;
  for (const heading of allHeadings) {
    const level = Number.parseInt(/<h([1-6])/i.exec(heading)?.[1] || "0");
    if (level > lastLevel + 1 && lastLevel > 0) {
      issues.push("Heading hierarchy skips levels (e.g., H1 to H3 without H2)");
      score -= 10;
      break;
    }
    lastLevel = level;
  }

  score = Math.max(0, score);
  const passed = issues.length === 0;
  const details = passed
    ? `Heading structure valid: 1 H1, ${h2Count} H2s, ${h3Count} H3s`
    : issues.join(". ");

  return { name: "Heading Structure", passed, score, details };
}

/**
 * Check link quotas: 5-8 internal, 2-3 external authoritative
 */
export function checkLinkQuotas(html: string): QualityCheck {
  const allLinks = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];

  let internalCount = 0;
  let externalCount = 0;
  let authoritativeCount = 0;

  for (const link of allLinks) {
    const hrefMatch = /href=["']([^"']+)["']/i.exec(link);
    if (!hrefMatch) continue;

    const href = hrefMatch[1];

    if (href.startsWith("/") || href.includes("travi.world") || href.includes("localhost")) {
      internalCount++;
    } else if (href.startsWith("http://") || href.startsWith("https://")) {
      externalCount++;
      if (AUTHORITATIVE_DOMAINS.some(domain => href.includes(domain))) {
        authoritativeCount++;
      }
    }
  }

  const issues: string[] = [];
  let score = 100;

  if (internalCount < LINK_QUOTAS.internal.min) {
    issues.push(
      `Not enough internal links: ${internalCount} (minimum: ${LINK_QUOTAS.internal.min})`
    );
    score -= 15;
  } else if (internalCount > LINK_QUOTAS.internal.max) {
    issues.push(`Too many internal links: ${internalCount} (maximum: ${LINK_QUOTAS.internal.max})`);
    score -= 5;
  }

  if (externalCount < LINK_QUOTAS.external.min) {
    issues.push(
      `Not enough external links: ${externalCount} (minimum: ${LINK_QUOTAS.external.min})`
    );
    score -= 10;
  } else if (externalCount > LINK_QUOTAS.external.max) {
    issues.push(`Too many external links: ${externalCount} (maximum: ${LINK_QUOTAS.external.max})`);
    score -= 5;
  }

  if (authoritativeCount === 0 && externalCount > 0) {
    issues.push("No links to authoritative sources");
    score -= 10;
  }

  score = Math.max(0, score);
  const passed = issues.length === 0;
  const details = passed
    ? `Links valid: ${internalCount} internal, ${externalCount} external (${authoritativeCount} authoritative)`
    : issues.join(". ");

  return { name: "Link Quotas", passed, score, details };
}

/**
 * Check image requirements: Hero + 1 per section
 */
export function checkImageRequirements(html: string, images?: ImageInfo[]): QualityCheck {
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;

  const imageCount = images?.length || imgMatches.length;
  const hasHero = images?.some(img => img.isHero) || imgMatches.length > 0;

  // Required: 1 hero + 1 per H2 section
  const requiredImages = 1 + h2Count;

  const issues: string[] = [];
  let score = 100;

  if (!hasHero) {
    issues.push("Missing hero image");
    score -= 20;
  }

  if (imageCount < requiredImages) {
    const missing = requiredImages - imageCount;
    issues.push(
      `Not enough images: ${imageCount} (need ${requiredImages}: 1 hero + ${h2Count} for sections)`
    );
    score -= missing * 10;
  }

  score = Math.max(0, score);
  const passed = issues.length === 0;
  const details = passed
    ? `Images valid: ${imageCount} images for ${h2Count} sections`
    : issues.join(". ");

  return { name: "Image Requirements", passed, score, details };
}

/**
 * Check SEO compliance: Meta title 50-60ch, meta desc 150-160ch
 */
export function checkSEOCompliance(meta: MetaInfo): QualityCheck {
  const titleLength = meta.title.trim().length;
  const descLength = meta.description.trim().length;

  const issues: string[] = [];
  let score = 100;

  if (titleLength < META_LIMITS.title.min) {
    issues.push(`Meta title too short: ${titleLength} chars (minimum: ${META_LIMITS.title.min})`);
    score -= 25;
  } else if (titleLength > META_LIMITS.title.max) {
    issues.push(`Meta title too long: ${titleLength} chars (maximum: ${META_LIMITS.title.max})`);
    score -= 15;
  }

  if (descLength < META_LIMITS.description.min) {
    issues.push(
      `Meta description too short: ${descLength} chars (minimum: ${META_LIMITS.description.min})`
    );
    score -= 25;
  } else if (descLength > META_LIMITS.description.max) {
    issues.push(
      `Meta description too long: ${descLength} chars (maximum: ${META_LIMITS.description.max})`
    );
    score -= 15;
  }

  score = Math.max(0, score);
  const passed = issues.length === 0;
  const details = passed
    ? `SEO compliant: title ${titleLength}ch, description ${descLength}ch`
    : issues.join(". ");

  return { name: "SEO Compliance", passed, score, details };
}

/**
 * Check banned phrases: Zero tolerance for clickbait/clichés
 */
export function checkBannedPhrases(text: string): QualityCheck {
  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const phrase of BANNED_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      found.push(phrase);
    }
  }

  const passed = found.length === 0;
  const score = passed ? 100 : 0; // Zero tolerance
  let details: string;
  if (passed) {
    details = "No banned phrases detected";
  } else {
    const suffix = found.length > 5 ? "..." : "";
    details = `Banned phrases found (${found.length}): ${found.slice(0, 5).join(", ")}${suffix}`;
  }

  return { name: "Banned Phrases", passed, score, details };
}

/**
 * Check professional tone: No excessive exclamation marks, no all-caps
 */
export function checkProfessionalTone(html: string): QualityCheck {
  const text = extractPlainText(html);
  const issues: string[] = [];
  let score = 100;

  // Check exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length;
  const sentenceCount = (text.match(/[.!?]+/g) || []).length || 1;
  const exclamationRatio = exclamationCount / sentenceCount;

  if (exclamationRatio > 0.1) {
    issues.push(`Too many exclamation marks (${exclamationCount} in ${sentenceCount} sentences)`);
    score -= 20;
  }

  // Check for all-caps words (excluding acronyms of 4 chars or less)
  const allCapsWords = text.match(/\b[A-Z]{5,}\b/g) || [];
  if (allCapsWords.length > 0) {
    issues.push(
      `All-caps words detected: ${allCapsWords.slice(0, 3).join(", ")}${allCapsWords.length > 3 ? "..." : ""}`
    );
    score -= 15;
  }

  // Check for multiple consecutive exclamation marks
  const multipleExclamation = text.match(/!{2,}/g) || [];
  if (multipleExclamation.length > 0) {
    issues.push("Multiple consecutive exclamation marks detected");
    score -= 15;
  }

  // Check for excessive enthusiasm markers
  const enthusiasmPatterns = [
    /so\s+amazing/gi,
    /absolutely\s+(amazing|incredible|fantastic)/gi,
    /you\s+will\s+(love|adore)/gi,
  ];

  for (const pattern of enthusiasmPatterns) {
    if (pattern.test(text)) {
      issues.push("Overly enthusiastic language detected");
      score -= 10;
      break;
    }
  }

  score = Math.max(0, score);
  const passed = issues.length === 0;
  const details = passed ? "Professional tone maintained" : issues.join(". ");

  return { name: "Professional Tone", passed, score, details };
}

/**
 * Check schema validity: JSON-LD must be valid
 */
export function checkSchemaValidity(schema: object): QualityCheck {
  const issues: string[] = [];
  let score = 100;

  try {
    // Check if it's valid JSON (already an object, so this is satisfied)
    if (!schema || typeof schema !== "object") {
      issues.push("Schema is not a valid object");
      score = 0;
    } else {
      const schemaObj = schema as Record<string, unknown>;

      // Check required JSON-LD fields
      if (!schemaObj["@context"]) {
        issues.push("Missing @context in schema");
        score -= 20;
      } else if (schemaObj["@context"] !== "https://schema.org") {
        issues.push('@context should be "https://schema.org"');
        score -= 10;
      }

      if (!schemaObj["@type"]) {
        issues.push("Missing @type in schema");
        score -= 30;
      }

      // Check for common schema types and their required properties
      const schemaType = schemaObj["@type"] as string;
      if (
        schemaType === "Article" ||
        schemaType === "NewsArticle" ||
        schemaType === "BlogPosting"
      ) {
        const requiredFields = ["headline", "author", "datePublished"];
        for (const field of requiredFields) {
          if (!schemaObj[field]) {
            issues.push(`Missing required field for ${schemaType}: ${field}`);
            score -= 10;
          }
        }
      } else if (schemaType === "TouristAttraction" || schemaType === "Place") {
        if (!schemaObj["name"]) {
          issues.push("Missing name for TouristAttraction/Place");
          score -= 15;
        }
      } else if (schemaType === "FAQPage") {
        if (!schemaObj["mainEntity"] || !Array.isArray(schemaObj["mainEntity"])) {
          issues.push("FAQPage requires mainEntity array");
          score -= 20;
        }
      }
    }
  } catch {
    issues.push("Schema parsing error");
    score = 0;
  }

  score = Math.max(0, score);
  const passed = issues.length === 0;
  const details = passed ? "Schema is valid JSON-LD" : issues.join(". ");

  return { name: "Schema Validity", passed, score, details };
}

/**
 * Check alt text: All images must have descriptive alt text
 */
export function checkAltText(images: ImageInfo[]): QualityCheck {
  const issues: string[] = [];
  let score = 100;
  let missingAlt = 0;
  let shortAlt = 0;
  let marketingAlt = 0;

  const bannedAltWords = [
    "stunning",
    "amazing",
    "beautiful",
    "breathtaking",
    "gorgeous",
    "spectacular",
    "incredible",
    "magnificent",
    "wonderful",
    "fabulous",
  ];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    if (!img.alt || img.alt.trim().length === 0) {
      missingAlt++;
      continue;
    }

    const altText = img.alt.trim();
    const wordCount = altText.split(/\s+/).length;

    // Check minimum word count (5-15 words recommended)
    if (wordCount < 5) {
      shortAlt++;
    }

    // Check for marketing language
    const lowerAlt = altText.toLowerCase();
    for (const banned of bannedAltWords) {
      if (lowerAlt.includes(banned)) {
        marketingAlt++;
        break;
      }
    }
  }

  if (missingAlt > 0) {
    issues.push(`${missingAlt} image(s) missing alt text`);
    score -= missingAlt * 15;
  }

  if (shortAlt > 0) {
    issues.push(`${shortAlt} image(s) have alt text shorter than 5 words`);
    score -= shortAlt * 5;
  }

  if (marketingAlt > 0) {
    issues.push(`${marketingAlt} image(s) have marketing language in alt text`);
    score -= marketingAlt * 10;
  }

  score = Math.max(0, score);
  const passed = issues.length === 0;
  const details = passed ? `All ${images.length} images have valid alt text` : issues.join(". ");

  return { name: "Alt Text", passed, score, details };
}

/**
 * Calculate Flesch reading ease score
 */
export function calculateReadability(text: string): ReadabilityResult {
  // Count sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // Count words
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length || 1;

  // Count syllables (simplified approach)
  const syllableCount = countSyllables(text);

  // Flesch Reading Ease formula:
  // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const clampedScore = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade: string;
  if (clampedScore >= 90) {
    grade = "5th grade (Very Easy)";
  } else if (clampedScore >= 80) {
    grade = "6th grade (Easy)";
  } else if (clampedScore >= 70) {
    grade = "7th grade (Fairly Easy)";
  } else if (clampedScore >= 60) {
    grade = "8th-9th grade (Standard)";
  } else if (clampedScore >= 50) {
    grade = "10th-12th grade (Fairly Difficult)";
  } else if (clampedScore >= 30) {
    grade = "College (Difficult)";
  } else {
    grade = "College Graduate (Very Difficult)";
  }

  return { score: clampedScore, grade };
}

/**
 * Check if content is ready to publish
 */
export function isPublishReady(result: QualityCheckResult): boolean {
  if (result.blockers.some(b => b.severity === "critical")) {
    return false;
  }
  return result.passed && result.score >= PASSING_SCORE;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countSyllables(text: string): number {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0);
  let totalSyllables = 0;

  for (const word of words) {
    totalSyllables += countWordSyllables(word);
  }

  return totalSyllables;
}

function countWordSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g) || [];
  let count = vowelGroups.length;

  // Handle silent e
  if (word.endsWith("e") && !word.endsWith("le")) {
    count = Math.max(1, count - 1);
  }

  // Handle common suffixes
  const silentSuffixes = ["es", "ed"];
  for (const suffix of silentSuffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 1) {
      const beforeSuffix = word.charAt(word.length - suffix.length - 1);
      if (!"aeiouy".includes(beforeSuffix)) {
        count = Math.max(1, count - 1);
      }
    }
  }

  return Math.max(1, count);
}

function calculateWeightedScore(checks: QualityCheck[], blockers: QualityBlocker[]): number {
  // Group checks by category
  const seoChecks = checks.filter(c =>
    ["SEO Compliance", "Schema Validity", "Alt Text"].includes(c.name)
  );
  const contentChecks = checks.filter(c =>
    ["Word Count", "Readability", "Image Requirements"].includes(c.name)
  );
  const structureChecks = checks.filter(c => ["Heading Structure", "Link Quotas"].includes(c.name));
  const complianceChecks = checks.filter(c =>
    ["Banned Phrases", "Professional Tone"].includes(c.name)
  );

  const avgScore = (checks: QualityCheck[]): number => {
    if (checks.length === 0) return 100;
    return checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
  };

  const seoScore = avgScore(seoChecks) * (QUALITY_WEIGHTS.seo / 100);
  const contentScore = avgScore(contentChecks) * (QUALITY_WEIGHTS.content / 100);
  const structureScore = avgScore(structureChecks) * (QUALITY_WEIGHTS.structure / 100);
  const complianceScore = avgScore(complianceChecks) * (QUALITY_WEIGHTS.compliance / 100);

  let totalScore = seoScore + contentScore + structureScore + complianceScore;

  // Penalty for critical blockers
  const criticalBlockers = blockers.filter(b => b.severity === "critical");
  totalScore -= criticalBlockers.length * 10;

  return Math.max(0, Math.min(100, Math.round(totalScore)));
}

function generateRecommendations(checks: QualityCheck[], blockers: QualityBlocker[]): string[] {
  const recommendations: string[] = [];

  for (const check of checks) {
    if (!check.passed) {
      switch (check.name) {
        case "Word Count":
          recommendations.push("Adjust content length to be between 1800-3500 words");
          break;
        case "Heading Structure":
          recommendations.push("Ensure exactly 1 H1 and 4-6 H2 headings with proper hierarchy");
          break;
        case "Link Quotas":
          recommendations.push(
            "Add 5-8 internal links and 2-3 external links to authoritative sources"
          );
          break;
        case "Image Requirements":
          recommendations.push("Include 1 hero image plus 1 image per H2 section");
          break;
        case "SEO Compliance":
          recommendations.push(
            "Adjust meta title to 50-60 characters and meta description to 150-160 characters"
          );
          break;
        case "Banned Phrases":
          recommendations.push(
            "Remove all clickbait phrases and clichés. Use professional alternatives from the phrase guide"
          );
          break;
        case "Professional Tone":
          recommendations.push(
            "Reduce exclamation marks, avoid all-caps words, and use measured language"
          );
          break;
        case "Schema Validity":
          recommendations.push(
            "Ensure JSON-LD schema includes @context, @type, and required fields for the schema type"
          );
          break;
        case "Alt Text":
          recommendations.push(
            "Add descriptive alt text (5-15 words) to all images without marketing language"
          );
          break;
        case "Readability":
          recommendations.push("Simplify language to achieve Flesch reading ease score above 50");
          break;
      }
    }
  }

  // Add recommendations for banned phrases replacements
  const bannedCheck = checks.find(c => c.name === "Banned Phrases");
  if (bannedCheck && !bannedCheck.passed) {
    for (const [phrase, alternatives] of Object.entries(PHRASE_ALTERNATIVES)) {
      recommendations.push(`Replace "${phrase}" with: ${alternatives.join(" or ")}`);
    }
  }

  return recommendations;
}

// ============================================================================
// LEGACY COMPATIBILITY EXPORTS
// ============================================================================

export const QUALITY_THRESHOLDS = {
  draft: 50,
  review: 70,
  publish: PASSING_SCORE,
  autoApprove: 90,
  minWordCount: WORD_COUNT_LIMITS.min,
  maxBannedPhrases: 0,
  minInternalLinks: LINK_QUOTAS.internal.min,
} as const;

export interface ContentForValidation {
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  contentType: ContentType;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  altTexts?: string[];
}

export interface QualityGateResult {
  passed: boolean;
  score: number;
  tier: "rejected" | "draft" | "review" | "publish" | "auto_approve";
  validation: {
    isValid: boolean;
    score: number;
    errors: unknown[];
    warnings: unknown[];
    suggestions: string[];
  };
  blockingIssues: {
    code: string;
    message: string;
    field: string;
    severity: "critical" | "blocking";
  }[];
  recommendations: string[];
  metrics: ContentMetrics;
}

export interface ContentMetrics {
  wordCount: number;
  h2Count: number;
  internalLinks: number;
  externalLinks: number;
  authoritativeLinks: number;
  bannedPhrasesCount: number;
  keywordDensity: number;
  metaTitleLength: number;
  metaDescriptionLength: number;
}

/**
 * Legacy function for backwards compatibility
 */
export function validateThroughGateway(content: ContentForValidation): QualityGateResult {
  const generatedContent: GeneratedContent = {
    title: content.title,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    htmlContent: content.content,
    contentType: content.contentType,
    images: content.altTexts?.map((alt, i) => ({ src: `image-${i}`, alt })),
  };

  const result = validateContent(generatedContent);

  // Calculate metrics
  const plainText = extractPlainText(content.content);
  const words = plainText.split(/\s+/).filter(w => w.length > 0);
  const h2Count = (content.content.match(/<h2[^>]*>/gi) || []).length;

  const allLinks = content.content.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
  let internalLinks = 0;
  let externalLinks = 0;
  let authoritativeLinks = 0;

  for (const link of allLinks) {
    const hrefMatch = /href=["']([^"']+)["']/i.exec(link);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    if (href.startsWith("/") || href.includes("travi")) {
      internalLinks++;
    } else if (href.startsWith("http")) {
      externalLinks++;
      if (AUTHORITATIVE_DOMAINS.some(d => href.includes(d))) {
        authoritativeLinks++;
      }
    }
  }

  const bannedResult = checkBannedPhrases(plainText);

  // Determine tier
  let tier: QualityGateResult["tier"];
  if (result.blockers.some(b => b.severity === "critical")) {
    tier = "rejected";
  } else if (result.score >= QUALITY_THRESHOLDS.autoApprove) {
    tier = "auto_approve";
  } else if (result.score >= QUALITY_THRESHOLDS.publish) {
    tier = "publish";
  } else if (result.score >= QUALITY_THRESHOLDS.review) {
    tier = "review";
  } else if (result.score >= QUALITY_THRESHOLDS.draft) {
    tier = "draft";
  } else {
    tier = "rejected";
  }

  return {
    passed: result.passed,
    score: result.score,
    tier,
    validation: {
      isValid: result.passed,
      score: result.score,
      errors: result.blockers.map(b => ({
        code: b.type.toUpperCase(),
        message: b.message,
        field: b.type,
        severity: b.severity,
      })),
      warnings: [],
      suggestions: result.recommendations,
    },
    blockingIssues: result.blockers.map(b => ({
      code: b.type.toUpperCase(),
      message: b.message,
      field: b.type,
      severity: b.severity === "critical" ? "critical" : "blocking",
    })),
    recommendations: result.recommendations,
    metrics: {
      wordCount: words.length,
      h2Count,
      internalLinks,
      externalLinks,
      authoritativeLinks,
      bannedPhrasesCount: bannedResult.passed ? 0 : 1,
      keywordDensity: 0,
      metaTitleLength: content.metaTitle.length,
      metaDescriptionLength: content.metaDescription.length,
    },
  };
}

export function canPublish(content: ContentForValidation): { allowed: boolean; reason?: string } {
  const result = validateThroughGateway(content);
  if (result.tier === "publish" || result.tier === "auto_approve") {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason:
      result.blockingIssues.map(i => i.message).join("; ") ||
      `Score ${result.score} below threshold ${QUALITY_THRESHOLDS.publish}`,
  };
}

export function shouldAutoApprove(content: ContentForValidation): boolean {
  return validateThroughGateway(content).tier === "auto_approve";
}

export function getContentTier(content: ContentForValidation): QualityGateResult["tier"] {
  return validateThroughGateway(content).tier;
}

export function getQuickScore(content: ContentForValidation): number {
  return validateThroughGateway(content).score;
}

export function validateForSave(content: ContentForValidation): {
  valid: boolean;
  errors: string[];
} {
  const result = validateThroughGateway(content);
  const errors: string[] = [];
  const criticalIssues = result.blockingIssues.filter(i => i.severity === "critical");
  if (criticalIssues.length > 0) {
    errors.push(...criticalIssues.map(i => i.message));
  }
  if (result.metrics.wordCount < 100) {
    errors.push("Content must have at least 100 words to save");
  }
  if (!content.title.trim()) {
    errors.push("Title is required");
  }
  return { valid: errors.length === 0, errors };
}

export function getImprovementPriorities(content: ContentForValidation): string[] {
  const result = validateThroughGateway(content);
  const priorities: string[] = [];
  for (const issue of result.blockingIssues.filter(i => i.severity === "critical")) {
    priorities.push(`[CRITICAL] ${issue.message}`);
  }
  for (const issue of result.blockingIssues.filter(i => i.severity === "blocking")) {
    priorities.push(`[HIGH] ${issue.message}`);
  }
  for (const rec of result.recommendations) {
    priorities.push(`[MEDIUM] ${rec}`);
  }
  return priorities;
}
