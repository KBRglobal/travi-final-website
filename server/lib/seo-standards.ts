/**
 * SEO Content Standards Module
 *
 * Unified SEO requirements enforced across ALL content generation in Travi CMS.
 * These standards are non-negotiable and must be validated before any content is published.
 */

// SEO validation is currently disabled - awaiting redesign
export const SEO_VALIDATION_ENABLED = false;

// ============================================================================
// SEO REQUIREMENTS CONSTANTS
// ============================================================================

export const SEO_REQUIREMENTS = {
  // Meta Title: EXACTLY 50-60 characters (truncated at 60 in SERP)
  metaTitle: {
    minLength: 50,
    maxLength: 60,
    description: "Meta title must be 50-60 characters for optimal SERP display",
  },

  // Meta Description: EXACTLY 150-160 characters
  metaDescription: {
    minLength: 150,
    maxLength: 160,
    description: "Meta description must be 150-160 characters for full display in search results",
  },

  // H2 Headers: 4-6 per article
  h2Headers: {
    min: 4,
    max: 6,
    description: "Articles must have 4-6 H2 headers for proper content structure",
  },

  // Internal Links: 5-8 per article
  internalLinks: {
    min: 5,
    max: 8,
    description: "Content must include 5-8 internal links to other Travi pages",
  },

  // External Links: 2-3 to authoritative sources
  externalLinks: {
    min: 2,
    max: 3,
    authoritative: [
      "visitdubai.com",
      "dubai.ae",
      "dubaitourism.gov.ae",
      "tripadvisor.com",
      "booking.com",
      "lonelyplanet.com",
      "timeout.com",
      "gov.uk/foreign-travel-advice",
      "travel.state.gov",
    ],
    description: "Include 2-3 external links to authoritative travel sources",
  },

  // Word Count: 1800-3500 words for full articles
  wordCount: {
    minimum: 1800,
    maximum: 3500,
    sectionMinimum: 300,
    sectionMaximum: 500,
    description: "Full articles must be 1800-3500 words, with 300-500 words per H2 section",
  },

  // Images: 1 hero + 1 per H2 section
  images: {
    heroRequired: true,
    perSection: 1,
    minTotal: 5,
    maxTotal: 12,
    description: "Content needs 1 hero image plus 1 image per H2 section",
  },

  // Alt Text: 5-15 words, 20-125 characters
  altText: {
    minWords: 5,
    maxWords: 15,
    minChars: 20,
    maxChars: 125,
    description: "Alt text must be 5-15 words (20-125 chars), factual descriptions only",
  },

  // Keyword Density
  keywordDensity: {
    primary: { min: 1, max: 2 }, // 1-2% for primary keyword
    secondary: { min: 0.5, max: 1 }, // 0.5-1% for secondary keywords
    description: "Primary keyword 1-2% density, secondary keywords 0.5-1%",
  },
} as const;

// ============================================================================
// BANNED CLICHES AND CLICKBAIT PHRASES
// ============================================================================

export const BANNED_PHRASES = [
  // Overused travel cliches
  "must-visit",
  "must visit",
  "world-class",
  "world class",
  "hidden gem",
  "hidden gems",
  "breathtaking",
  "once-in-a-lifetime",
  "once in a lifetime",
  "bucket list",
  "paradise on earth",
  "like no other",
  "best-kept secret",
  "best kept secret",
  "off the beaten path",
  "off-the-beaten-path",
  "postcard-perfect",
  "postcard perfect",
  "picture-perfect",
  "picture perfect",
  "awe-inspiring",
  "unforgettable experience",
  "trip of a lifetime",

  // Clickbait phrases
  "secret tips revealed",
  "you won't believe",
  "you wont believe",
  "jaw-dropping",
  "jaw dropping",
  "mind-blowing",
  "mind blowing",
  "epic adventure",
  "ultimate guide",
  "the ultimate",
  "everything you need to know",
  "what they don't tell you",
  "what they dont tell you",
  "shocking truth",
  "insider secrets",
  "game-changer",
  "game changer",

  // Marketing superlatives
  "absolutely stunning",
  "truly magical",
  "simply amazing",
  "beyond compare",
  "unmatched beauty",
  "unparalleled",
  "second to none",
  "one of a kind",
  "one-of-a-kind",
] as const;

// Professional alternatives mapping
export const PHRASE_ALTERNATIVES: Record<string, string[]> = {
  "must-visit": ["popular with first-time visitors", "frequently recommended", "commonly visited"],
  "world-class": ["internationally recognized", "award-winning", "highly rated"],
  "hidden gem": ["lesser-known", "quieter alternative", "local favorite"],
  breathtaking: ["impressive", "remarkable", "striking", "notable"],
  "bucket list": ["popular destination", "frequently visited", "well-known"],
  "mind-blowing": ["impressive", "noteworthy", "remarkable"],
  "epic adventure": ["outdoor activity", "adventure experience", "active excursion"],
  "ultimate guide": ["comprehensive overview", "detailed guide", "complete resource"],
  paradise: ["scenic destination", "tropical location", "beach destination"],
};

// ============================================================================
// CONTENT TYPE REQUIREMENTS
// ============================================================================

export const CONTENT_TYPE_REQUIREMENTS = {
  article: {
    minWords: 1800,
    maxWords: 3500,
    h2Count: { min: 4, max: 6 },
    internalLinks: { min: 5, max: 8 },
    externalLinks: { min: 2, max: 3 },
    imagesMin: 5,
    requiredSections: ["introduction", "main_content", "faqs", "conclusion"],
  },

  destination: {
    minWords: 2500,
    maxWords: 4500,
    h2Count: { min: 6, max: 8 },
    internalLinks: { min: 8, max: 12 },
    externalLinks: { min: 3, max: 5 },
    imagesMin: 8,
    requiredSections: ["hero", "overview", "attractions", "hotels", "dining", "transport", "tips"],
  },

  hotel: {
    minWords: 800,
    maxWords: 1500,
    h2Count: { min: 3, max: 5 },
    internalLinks: { min: 3, max: 5 },
    externalLinks: { min: 1, max: 2 },
    imagesMin: 4,
    requiredSections: ["overview", "rooms", "amenities", "location", "booking_info"],
  },

  attraction: {
    minWords: 600,
    maxWords: 1200,
    h2Count: { min: 3, max: 4 },
    internalLinks: { min: 3, max: 5 },
    externalLinks: { min: 1, max: 2 },
    imagesMin: 3,
    requiredSections: ["overview", "highlights", "practical_info", "tips"],
  },

  restaurant: {
    minWords: 400,
    maxWords: 800,
    h2Count: { min: 2, max: 4 },
    internalLinks: { min: 2, max: 4 },
    externalLinks: { min: 1, max: 2 },
    imagesMin: 2,
    requiredSections: ["overview", "cuisine", "atmosphere", "booking_info"],
  },

  landing_page: {
    minWords: 600,
    maxWords: 1500,
    h2Count: { min: 3, max: 5 },
    internalLinks: { min: 4, max: 8 },
    externalLinks: { min: 1, max: 2 },
    imagesMin: 3,
    requiredSections: ["hero", "main_content", "cta"],
  },
} as const;

export type ContentType = keyof typeof CONTENT_TYPE_REQUIREMENTS;

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface SEOValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: SEOError[];
  warnings: SEOWarning[];
  suggestions: string[];
}

export interface SEOError {
  code: string;
  field: string;
  message: string;
  severity: "critical" | "error";
}

export interface SEOWarning {
  code: string;
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate meta title length
 */
export function validateMetaTitle(title: string): { valid: boolean; error?: string } {
  const length = title.trim().length;
  if (length < SEO_REQUIREMENTS.metaTitle.minLength) {
    return {
      valid: false,
      error: `Meta title too short (${length} chars). Minimum: ${SEO_REQUIREMENTS.metaTitle.minLength}`,
    };
  }
  if (length > SEO_REQUIREMENTS.metaTitle.maxLength) {
    return {
      valid: false,
      error: `Meta title too long (${length} chars). Maximum: ${SEO_REQUIREMENTS.metaTitle.maxLength}`,
    };
  }
  return { valid: true };
}

/**
 * Validate meta description length
 */
export function validateMetaDescription(description: string): { valid: boolean; error?: string } {
  const length = description.trim().length;
  if (length < SEO_REQUIREMENTS.metaDescription.minLength) {
    return {
      valid: false,
      error: `Meta description too short (${length} chars). Minimum: ${SEO_REQUIREMENTS.metaDescription.minLength}`,
    };
  }
  if (length > SEO_REQUIREMENTS.metaDescription.maxLength) {
    return {
      valid: false,
      error: `Meta description too long (${length} chars). Maximum: ${SEO_REQUIREMENTS.metaDescription.maxLength}`,
    };
  }
  return { valid: true };
}

/**
 * Validate word count for content type
 */
export function validateWordCount(
  content: string,
  contentType: ContentType
): { valid: boolean; count: number; error?: string } {
  const words = content.split(/\s+/).filter(Boolean);
  const count = words.length;
  const requirements = CONTENT_TYPE_REQUIREMENTS[contentType];

  if (count < requirements.minWords) {
    return {
      valid: false,
      count,
      error: `Content too short (${count} words). Minimum for ${contentType}: ${requirements.minWords}`,
    };
  }
  if (count > requirements.maxWords) {
    return {
      valid: false,
      count,
      error: `Content too long (${count} words). Maximum for ${contentType}: ${requirements.maxWords}`,
    };
  }
  return { valid: true, count };
}

/**
 * Check for banned phrases in content
 */
export function detectBannedPhrases(content: string): {
  found: string[];
  suggestions: Map<string, string[]>;
} {
  const lowerContent = content.toLowerCase();
  const found: string[] = [];
  const suggestions = new Map<string, string[]>();

  for (const phrase of BANNED_PHRASES) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      found.push(phrase);
      // Find alternatives if available
      const basePhrase = phrase.replaceAll("-", " ").toLowerCase();
      for (const [key, alternatives] of Object.entries(PHRASE_ALTERNATIVES)) {
        if (basePhrase.includes(key.replaceAll("-", " ").toLowerCase())) {
          suggestions.set(phrase, alternatives);
          break;
        }
      }
    }
  }

  return { found, suggestions };
}

/**
 * Count H2 headers in HTML content
 */
export function countH2Headers(htmlContent: string): number {
  const h2Matches = htmlContent.match(/<h2[^>]*>/gi);
  return h2Matches ? h2Matches.length : 0;
}

/**
 * Count internal links (links to Travi pages)
 */
export function countInternalLinks(htmlContent: string): number {
  // Match links that start with / or contain travi domain
  const internalPattern = /<a[^>]*href=["'](\/[^"']*|https?:\/\/[^"']*travi[^"']*)["'][^>]*>/gi;
  const matches = htmlContent.match(internalPattern);
  return matches ? matches.length : 0;
}

/**
 * Count and validate external links
 */
export function analyzeExternalLinks(htmlContent: string): {
  count: number;
  authoritative: number;
  links: Array<{ url: string; isAuthoritative: boolean }>;
} {
  const externalPattern = /<a[^>]*href=["'](https?:\/\/(?!.*travi)[^"']+)["'][^>]*>/gi;
  const links: Array<{ url: string; isAuthoritative: boolean }> = [];
  let match;

  while ((match = externalPattern.exec(htmlContent)) !== null) {
    const url = match[1];
    const isAuthoritative = SEO_REQUIREMENTS.externalLinks.authoritative.some(domain =>
      url.includes(domain)
    );
    links.push({ url, isAuthoritative });
  }

  return {
    count: links.length,
    authoritative: links.filter(l => l.isAuthoritative).length,
    links,
  };
}

/**
 * Validate alt text for images
 */
export function validateAltText(altText: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const words = altText.split(/\s+/).filter(Boolean);
  const charCount = altText.length;

  if (words.length < SEO_REQUIREMENTS.altText.minWords) {
    errors.push(
      `Alt text too short (${words.length} words). Minimum: ${SEO_REQUIREMENTS.altText.minWords}`
    );
  }
  if (words.length > SEO_REQUIREMENTS.altText.maxWords) {
    errors.push(
      `Alt text too long (${words.length} words). Maximum: ${SEO_REQUIREMENTS.altText.maxWords}`
    );
  }
  if (charCount < SEO_REQUIREMENTS.altText.minChars) {
    errors.push(
      `Alt text too short (${charCount} chars). Minimum: ${SEO_REQUIREMENTS.altText.minChars}`
    );
  }
  if (charCount > SEO_REQUIREMENTS.altText.maxChars) {
    errors.push(
      `Alt text too long (${charCount} chars). Maximum: ${SEO_REQUIREMENTS.altText.maxChars}`
    );
  }

  // Check for banned marketing phrases in alt text
  const bannedInAlt = [
    "stunning",
    "amazing",
    "beautiful",
    "breathtaking",
    "gorgeous",
    "spectacular",
  ];
  for (const word of bannedInAlt) {
    if (altText.toLowerCase().includes(word)) {
      errors.push(
        `Alt text contains marketing language: "${word}". Use factual descriptions only.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate keyword density
 */
export function calculateKeywordDensity(content: string, keyword: string): number {
  const words = content.toLowerCase().split(/\s+/).filter(Boolean);
  const keywordLower = keyword.toLowerCase();
  const keywordWords = keywordLower.split(/\s+/);

  let count = 0;
  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    const slice = words.slice(i, i + keywordWords.length).join(" ");
    if (slice === keywordLower) {
      count++;
    }
  }

  return (count / words.length) * 100;
}

/**
 * Full SEO validation for content
 * NOTE: Validation is disabled when SEO_VALIDATION_ENABLED is false
 */
export function validateContent(
  content: {
    title: string;
    metaTitle: string;
    metaDescription: string;
    htmlContent: string;
    primaryKeyword?: string;
    altTexts?: string[];
  },
  contentType: ContentType
): SEOValidationResult {
  // Return always-valid result when validation is disabled
  if (!SEO_VALIDATION_ENABLED) {
    return {
      isValid: true,
      score: 100,
      errors: [],
      warnings: [],
      suggestions: [],
    };
  }

  const errors: SEOError[] = [];
  const warnings: SEOWarning[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const requirements = CONTENT_TYPE_REQUIREMENTS[contentType];

  // Validate meta title
  const metaTitleResult = validateMetaTitle(content.metaTitle);
  if (!metaTitleResult.valid) {
    errors.push({
      code: "META_TITLE",
      field: "metaTitle",
      message: metaTitleResult.error!,
      severity: "critical",
    });
    score -= 15;
  }

  // Validate meta description
  const metaDescResult = validateMetaDescription(content.metaDescription);
  if (!metaDescResult.valid) {
    errors.push({
      code: "META_DESC",
      field: "metaDescription",
      message: metaDescResult.error!,
      severity: "critical",
    });
    score -= 15;
  }

  // Validate word count
  const wordCountResult = validateWordCount(
    content.htmlContent.replace(/<[^>]+>/g, " "),
    contentType
  );
  if (!wordCountResult.valid) {
    errors.push({
      code: "WORD_COUNT",
      field: "content",
      message: wordCountResult.error!,
      severity: "error",
    });
    score -= 10;
  }

  // Check H2 headers
  const h2Count = countH2Headers(content.htmlContent);
  if (h2Count < requirements.h2Count.min) {
    errors.push({
      code: "H2_COUNT",
      field: "headers",
      message: `Not enough H2 headers (${h2Count}). Minimum: ${requirements.h2Count.min}`,
      severity: "error",
    });
    score -= 10;
  } else if (h2Count > requirements.h2Count.max) {
    warnings.push({
      code: "H2_COUNT",
      field: "headers",
      message: `Too many H2 headers (${h2Count}). Maximum: ${requirements.h2Count.max}`,
    });
    score -= 5;
  }

  // Check internal links
  const internalLinkCount = countInternalLinks(content.htmlContent);
  if (internalLinkCount < requirements.internalLinks.min) {
    errors.push({
      code: "INTERNAL_LINKS",
      field: "links",
      message: `Not enough internal links (${internalLinkCount}). Minimum: ${requirements.internalLinks.min}`,
      severity: "error",
    });
    score -= 10;
    suggestions.push(
      `Add ${requirements.internalLinks.min - internalLinkCount} more internal links to related Travi pages`
    );
  }

  // Check external links
  const externalLinks = analyzeExternalLinks(content.htmlContent);
  if (externalLinks.count < requirements.externalLinks.min) {
    warnings.push({
      code: "EXTERNAL_LINKS",
      field: "links",
      message: `Not enough external links (${externalLinks.count}). Minimum: ${requirements.externalLinks.min}`,
      suggestion: "Add links to authoritative sources like official tourism sites",
    });
    score -= 5;
  }
  if (externalLinks.authoritative === 0 && externalLinks.count > 0) {
    warnings.push({
      code: "AUTHORITATIVE_LINKS",
      field: "links",
      message: "No links to authoritative sources found",
      suggestion: "Include links to official tourism websites or trusted travel sources",
    });
    score -= 3;
  }

  // Check for banned phrases
  const bannedPhrases = detectBannedPhrases(content.htmlContent);
  if (bannedPhrases.found.length > 0) {
    for (const phrase of bannedPhrases.found) {
      const alternatives = bannedPhrases.suggestions.get(phrase);
      errors.push({
        code: "BANNED_PHRASE",
        field: "content",
        message: `Banned phrase detected: "${phrase}"`,
        severity: "error",
      });
      if (alternatives) {
        suggestions.push(`Replace "${phrase}" with: ${alternatives.join(", ")}`);
      }
    }
    score -= bannedPhrases.found.length * 3;
  }

  // Validate alt texts
  if (content.altTexts) {
    for (let i = 0; i < content.altTexts.length; i++) {
      const altResult = validateAltText(content.altTexts[i]);
      if (!altResult.valid) {
        warnings.push({
          code: "ALT_TEXT",
          field: `image_${i}`,
          message: altResult.errors.join("; "),
        });
        score -= 2;
      }
    }
  }

  // Check keyword density if primary keyword provided
  if (content.primaryKeyword) {
    const density = calculateKeywordDensity(
      content.htmlContent.replace(/<[^>]+>/g, " "),
      content.primaryKeyword
    );
    if (density < SEO_REQUIREMENTS.keywordDensity.primary.min) {
      warnings.push({
        code: "KEYWORD_DENSITY",
        field: "keyword",
        message: `Primary keyword density too low (${density.toFixed(2)}%). Target: 1-2%`,
      });
      score -= 5;
    } else if (density > SEO_REQUIREMENTS.keywordDensity.primary.max) {
      warnings.push({
        code: "KEYWORD_STUFFING",
        field: "keyword",
        message: `Primary keyword density too high (${density.toFixed(2)}%). Maximum: 2%`,
      });
      score -= 5;
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    isValid: errors.filter(e => e.severity === "critical").length === 0 && score >= 80,
    score,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Generate SEO-optimized meta title
 */
export function generateMetaTitle(title: string, destination?: string): string {
  let metaTitle = title;

  // Add destination if provided and there's room
  if (destination && metaTitle.length < 45) {
    metaTitle = `${metaTitle} | ${destination}`;
  }

  // Truncate if too long
  if (metaTitle.length > SEO_REQUIREMENTS.metaTitle.maxLength) {
    metaTitle = metaTitle.substring(0, SEO_REQUIREMENTS.metaTitle.maxLength - 3) + "...";
  }

  // Pad if too short (rarely needed, usually indicates poor title)
  if (metaTitle.length < SEO_REQUIREMENTS.metaTitle.minLength) {
    metaTitle = `${metaTitle} | Travi Travel Guide`;
  }

  return metaTitle.substring(0, SEO_REQUIREMENTS.metaTitle.maxLength);
}

/**
 * Generate SEO-optimized meta description
 */
export function generateMetaDescription(description: string, includesCTA: boolean = true): string {
  let metaDesc = description.trim();

  // Add CTA if there's room and requested
  if (includesCTA && metaDesc.length < 140) {
    metaDesc += " Plan your perfect trip today.";
  }

  // Truncate if too long
  if (metaDesc.length > SEO_REQUIREMENTS.metaDescription.maxLength) {
    // Find last complete sentence within limit
    const shortened = metaDesc.substring(0, SEO_REQUIREMENTS.metaDescription.maxLength - 3);
    const lastPeriod = shortened.lastIndexOf(".");
    if (lastPeriod > SEO_REQUIREMENTS.metaDescription.minLength - 10) {
      metaDesc = shortened.substring(0, lastPeriod + 1);
    } else {
      metaDesc = shortened + "...";
    }
  }

  return metaDesc;
}
