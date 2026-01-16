export interface SeoIssue {
  type: "error" | "warning" | "success" | "info";
  category: string;
  message: string;
  recommendation?: string;
}

export interface SeoAnalysis {
  score: number;
  issues: SeoIssue[];
  keywordDensity: number;
  wordCount: number;
}

export interface ImageSeoInput {
  url: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  caption?: string;
  filename?: string;
}

export interface SeoInput {
  title: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  content: string;
  headings: { level: number; text: string }[];
  images: ImageSeoInput[];
  internalLinks: number;
  externalLinks: number;
}

const META_TITLE_MIN = 50;
const META_TITLE_MAX = 60; // Strict 50-60 chars - above 60 gets truncated in SERP
const META_DESC_MIN = 150;
const META_DESC_MAX = 160;
const MIN_WORD_COUNT = 1800;
const MIN_H2_COUNT = 4;
const MAX_H2_COUNT = 6;
const MIN_INTERNAL_LINKS = 5;
const MIN_EXTERNAL_LINKS = 2;
const IDEAL_KEYWORD_DENSITY_MIN = 1;
const IDEAL_KEYWORD_DENSITY_MAX = 3;

// Clichés and clickbait phrases to flag (synchronized with writer-engine and seo-validation-agent)
const CLICHE_PHRASES = [
  "must-visit",
  "must visit",
  "world-class",
  "world class",
  "hidden gem",
  "hidden gems",
  "breathtaking",
  "awe-inspiring",
  "jaw-dropping",
  "unforgettable",
  "once-in-a-lifetime",
  "once in a lifetime",
  "bucket list",
  "paradise on earth",
  "jewel in the crown",
  "like no other",
  "best kept secret",
  "off the beaten path",
  "sun-kissed",
  "picture-perfect",
  "secret tips revealed",
  "you won't believe",
  "mind-blowing",
  "epic adventure",
  "ultimate guide",
  "everything you need to know",
];

// Alt text quality requirements
const ALT_TEXT_MIN_WORDS = 5;
const ALT_TEXT_MAX_WORDS = 15;
const ALT_TEXT_MIN_CHARS = 20;
const ALT_TEXT_MAX_CHARS = 125;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function calculateKeywordDensity(content: string, keyword: string): number {
  if (!keyword || !content) return 0;
  const words = content.toLowerCase().split(/\s+/);
  const keywordLower = keyword.toLowerCase();
  const keywordCount = words.filter(w => w.includes(keywordLower)).length;
  return words.length > 0 ? (keywordCount / words.length) * 100 : 0;
}

export function analyzeSeo(input: SeoInput): SeoAnalysis {
  const issues: SeoIssue[] = [];
  let score = 100;

  const wordCount = countWords(input.content);
  const keywordDensity = calculateKeywordDensity(input.content, input.primaryKeyword);

  if (!input.title || input.title.trim().length === 0) {
    issues.push({
      type: "error",
      category: "Title",
      message: "Page title is missing",
      recommendation: "Add a descriptive title for your page",
    });
    score -= 15;
  }

  if (!input.metaTitle || input.metaTitle.trim().length === 0) {
    issues.push({
      type: "error",
      category: "Meta Title",
      message: "Meta title is missing",
      recommendation: "Add a meta title for better search visibility",
    });
    score -= 10;
  } else if (input.metaTitle.length < META_TITLE_MIN) {
    issues.push({
      type: "warning",
      category: "Meta Title",
      message: `Meta title is too short (${input.metaTitle.length} chars)`,
      recommendation: `Aim for ${META_TITLE_MIN}-${META_TITLE_MAX} characters`,
    });
    score -= 5;
  } else if (input.metaTitle.length > META_TITLE_MAX) {
    issues.push({
      type: "warning",
      category: "Meta Title",
      message: `Meta title is too long (${input.metaTitle.length} chars)`,
      recommendation: `Keep it under ${META_TITLE_MAX} characters to prevent truncation`,
    });
    score -= 5;
  } else {
    issues.push({
      type: "success",
      category: "Meta Title",
      message: `Meta title length is optimal (${input.metaTitle.length} chars)`,
    });
  }

  if (!input.metaDescription || input.metaDescription.trim().length === 0) {
    issues.push({
      type: "error",
      category: "Meta Description",
      message: "Meta description is missing",
      recommendation: "Add a compelling meta description",
    });
    score -= 10;
  } else if (input.metaDescription.length < META_DESC_MIN) {
    issues.push({
      type: "warning",
      category: "Meta Description",
      message: `Meta description is too short (${input.metaDescription.length} chars)`,
      recommendation: `Aim for ${META_DESC_MIN}-${META_DESC_MAX} characters`,
    });
    score -= 5;
  } else if (input.metaDescription.length > META_DESC_MAX) {
    issues.push({
      type: "warning",
      category: "Meta Description",
      message: `Meta description is too long (${input.metaDescription.length} chars)`,
      recommendation: `Keep it under ${META_DESC_MAX} characters`,
    });
    score -= 3;
  } else {
    issues.push({
      type: "success",
      category: "Meta Description",
      message: `Meta description length is optimal (${input.metaDescription.length} chars)`,
    });
  }

  if (!input.primaryKeyword || input.primaryKeyword.trim().length === 0) {
    issues.push({
      type: "warning",
      category: "Keyword",
      message: "No primary keyword set",
      recommendation: "Set a focus keyword for better optimization",
    });
    score -= 10;
  } else {
    const keywordInTitle = input.title.toLowerCase().includes(input.primaryKeyword.toLowerCase());
    const keywordInMetaTitle = input.metaTitle.toLowerCase().includes(input.primaryKeyword.toLowerCase());
    const keywordInMetaDesc = input.metaDescription.toLowerCase().includes(input.primaryKeyword.toLowerCase());

    if (!keywordInTitle && !keywordInMetaTitle) {
      issues.push({
        type: "warning",
        category: "Keyword",
        message: "Primary keyword not found in title",
        recommendation: "Include your keyword in the page title",
      });
      score -= 5;
    } else {
      issues.push({
        type: "success",
        category: "Keyword",
        message: "Primary keyword found in title",
      });
    }

    if (!keywordInMetaDesc) {
      issues.push({
        type: "info",
        category: "Keyword",
        message: "Primary keyword not in meta description",
        recommendation: "Consider including keyword in meta description",
      });
      score -= 3;
    }

    if (keywordDensity < IDEAL_KEYWORD_DENSITY_MIN) {
      issues.push({
        type: "warning",
        category: "Keyword Density",
        message: `Keyword density is low (${keywordDensity.toFixed(1)}%)`,
        recommendation: `Aim for ${IDEAL_KEYWORD_DENSITY_MIN}-${IDEAL_KEYWORD_DENSITY_MAX}% keyword density`,
      });
      score -= 5;
    } else if (keywordDensity > IDEAL_KEYWORD_DENSITY_MAX) {
      issues.push({
        type: "warning",
        category: "Keyword Density",
        message: `Keyword density is high (${keywordDensity.toFixed(1)}%)`,
        recommendation: "Reduce keyword usage to avoid keyword stuffing",
      });
      score -= 5;
    } else {
      issues.push({
        type: "success",
        category: "Keyword Density",
        message: `Keyword density is optimal (${keywordDensity.toFixed(1)}%)`,
      });
    }
  }

  if (wordCount < MIN_WORD_COUNT) {
    issues.push({
      type: "error",
      category: "Content Length",
      message: `Content is too short (${wordCount} words)`,
      recommendation: `CRITICAL: Minimum ${MIN_WORD_COUNT} words required for SEO compliance`,
    });
    score -= 25;
  } else if (wordCount >= 2500) {
    issues.push({
      type: "success",
      category: "Content Length",
      message: `Excellent content length (${wordCount} words)`,
    });
  } else {
    issues.push({
      type: "success",
      category: "Content Length",
      message: `Good content length (${wordCount} words)`,
    });
  }

  const h1Count = input.headings.filter(h => h.level === 1).length;
  if (h1Count === 0) {
    issues.push({
      type: "warning",
      category: "Headings",
      message: "No H1 heading found",
      recommendation: "Add an H1 heading to your content",
    });
    score -= 5;
  } else if (h1Count > 1) {
    issues.push({
      type: "warning",
      category: "Headings",
      message: `Multiple H1 headings found (${h1Count})`,
      recommendation: "Use only one H1 heading per page",
    });
    score -= 3;
  } else {
    issues.push({
      type: "success",
      category: "Headings",
      message: "H1 heading is present",
    });
  }

  const h2Count = input.headings.filter(h => h.level === 2).length;
  if (h2Count < MIN_H2_COUNT) {
    issues.push({
      type: "error",
      category: "Headings",
      message: `Not enough H2 headings (${h2Count} found, need ${MIN_H2_COUNT}-${MAX_H2_COUNT})`,
      recommendation: `Add ${MIN_H2_COUNT - h2Count} more H2 subheadings to structure your content`,
    });
    score -= 15;
  } else if (h2Count > MAX_H2_COUNT) {
    issues.push({
      type: "warning",
      category: "Headings",
      message: `Too many H2 headings (${h2Count} found, max ${MAX_H2_COUNT})`,
      recommendation: "Consider consolidating some sections",
    });
    score -= 5;
  } else {
    issues.push({
      type: "success",
      category: "Headings",
      message: `Good H2 structure (${h2Count} headings)`,
    });
  }

  // Comprehensive Image SEO Analysis
  if (input.images.length > 0) {
    const imageAnalysis = analyzeImagesSeo(input.images, input.primaryKeyword);
    issues.push(...imageAnalysis.issues);
    score -= imageAnalysis.deduction;
  }

  if (input.internalLinks < MIN_INTERNAL_LINKS) {
    issues.push({
      type: "error",
      category: "Internal Links",
      message: `Not enough internal links (${input.internalLinks} found, need ${MIN_INTERNAL_LINKS}-8)`,
      recommendation: `Add ${MIN_INTERNAL_LINKS - input.internalLinks} more internal links to related content`,
    });
    score -= 10;
  } else {
    issues.push({
      type: "success",
      category: "Internal Links",
      message: `Good internal linking (${input.internalLinks} links)`,
    });
  }

  if (input.externalLinks < MIN_EXTERNAL_LINKS) {
    issues.push({
      type: "warning",
      category: "External Links",
      message: `Not enough external links (${input.externalLinks} found, need ${MIN_EXTERNAL_LINKS}-3)`,
      recommendation: `Add ${MIN_EXTERNAL_LINKS - input.externalLinks} more external links to authoritative sources`,
    });
    score -= 5;
  } else {
    issues.push({
      type: "success",
      category: "External Links",
      message: `Good external linking (${input.externalLinks} links)`,
    });
  }

  // Check for clichés and clickbait phrases
  const allContent = `${input.title} ${input.metaTitle} ${input.metaDescription} ${input.content}`.toLowerCase();
  const foundCliches = CLICHE_PHRASES.filter(phrase => allContent.includes(phrase.toLowerCase()));
  if (foundCliches.length > 0) {
    issues.push({
      type: "warning",
      category: "Content Quality",
      message: `Found ${foundCliches.length} cliché/clickbait phrase(s): ${foundCliches.slice(0, 3).join(", ")}${foundCliches.length > 3 ? "..." : ""}`,
      recommendation: "Replace with specific, professional language (e.g., 'popular with first-time visitors' instead of 'must-visit')",
    });
    score -= Math.min(foundCliches.length * 2, 10);
  }

  // Check image count relative to H2 sections (should have ~1 image per H2)
  const h2CountForImages = input.headings.filter(h => h.level === 2).length;
  const minRequiredImages = Math.max(1, Math.min(h2CountForImages, 6)); // At least 1, at most 6
  if (input.images.length < minRequiredImages) {
    issues.push({
      type: "warning",
      category: "Images",
      message: `Not enough images (${input.images.length} found, recommend ${minRequiredImages}+ for ${h2CountForImages} sections)`,
      recommendation: `Add images to illustrate each major section. Aim for 1 hero + 1 per H2 section.`,
    });
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));

  issues.sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2, success: 3 };
    return order[a.type] - order[b.type];
  });

  return {
    score,
    issues,
    keywordDensity,
    wordCount,
  };
}

// ==================== Image SEO Analysis ====================

interface ImageAnalysisResult {
  issues: SeoIssue[];
  deduction: number;
}

function analyzeImagesSeo(images: ImageSeoInput[], primaryKeyword?: string): ImageAnalysisResult {
  const issues: SeoIssue[] = [];
  let totalDeduction = 0;

  // Check for missing alt text
  const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim().length === 0);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      type: "error",
      category: "Images - Alt Text",
      message: `${imagesWithoutAlt.length} image(s) missing alt text`,
      recommendation: "Add descriptive alt text to all images for accessibility and SEO",
    });
    totalDeduction += 5 * Math.min(imagesWithoutAlt.length, 3);
  } else {
    issues.push({
      type: "success",
      category: "Images - Alt Text",
      message: "All images have alt text",
    });
  }

  // Check alt text quality - enforce 5-15 words, 20-125 characters
  const shortAltImages = images.filter(img => {
    if (!img.alt || img.alt.length === 0) return false;
    const wordCount = img.alt.split(/\s+/).filter(w => w.length > 0).length;
    return img.alt.length < ALT_TEXT_MIN_CHARS || wordCount < ALT_TEXT_MIN_WORDS;
  });
  if (shortAltImages.length > 0) {
    issues.push({
      type: "warning",
      category: "Images - Alt Text Quality",
      message: `${shortAltImages.length} image(s) have short alt text (need ${ALT_TEXT_MIN_WORDS}-${ALT_TEXT_MAX_WORDS} words)`,
      recommendation: "Use format: [Subject] + [location/context] + [visual detail]. Example: 'Luxury shopping atrium inside Dubai Mall with marble floors and high ceilings'",
    });
    totalDeduction += 3;
  }

  const longAltImages = images.filter(img => {
    if (!img.alt) return false;
    const wordCount = img.alt.split(/\s+/).filter(w => w.length > 0).length;
    return img.alt.length > ALT_TEXT_MAX_CHARS || wordCount > ALT_TEXT_MAX_WORDS;
  });
  if (longAltImages.length > 0) {
    issues.push({
      type: "warning",
      category: "Images - Alt Text Quality",
      message: `${longAltImages.length} image(s) have long alt text (max ${ALT_TEXT_MAX_WORDS} words / ${ALT_TEXT_MAX_CHARS} chars)`,
      recommendation: "Keep alt text concise: 5-15 words describing the image factually",
    });
    totalDeduction += 2;
  }

  // Check for marketing language in alt text
  const marketingPatterns = /must-visit|world-class|breathtaking|amazing|stunning|incredible|perfect|best|ultimate/i;
  const marketingAltImages = images.filter(img => img.alt && marketingPatterns.test(img.alt));
  if (marketingAltImages.length > 0) {
    issues.push({
      type: "warning",
      category: "Images - Alt Text Quality",
      message: `${marketingAltImages.length} image(s) have marketing language in alt text`,
      recommendation: "Alt text should be factual description only, no promotional language",
    });
    totalDeduction += 2;
  }

  // Check for generic alt text patterns
  const genericPatterns = /^(image|photo|picture|pic|img)(\s+of)?$/i;
  const genericAltImages = images.filter(img => img.alt && genericPatterns.test(img.alt.trim()));
  if (genericAltImages.length > 0) {
    issues.push({
      type: "error",
      category: "Images - Alt Text Quality",
      message: `${genericAltImages.length} image(s) have generic alt text`,
      recommendation: "Describe what is actually shown in the image",
    });
    totalDeduction += 5;
  }

  // Check for keyword in alt text
  if (primaryKeyword && images.length > 0) {
    const keywordLower = primaryKeyword.toLowerCase();
    const imagesWithKeyword = images.filter(img =>
      img.alt && img.alt.toLowerCase().includes(keywordLower)
    );

    if (imagesWithKeyword.length === 0) {
      issues.push({
        type: "info",
        category: "Images - Keywords",
        message: "Primary keyword not found in any image alt text",
        recommendation: "Consider including your keyword naturally in at least one image alt text",
      });
      totalDeduction += 3;
    } else {
      issues.push({
        type: "success",
        category: "Images - Keywords",
        message: `Primary keyword found in ${imagesWithKeyword.length} image(s) alt text`,
      });
    }
  }

  // Check for missing dimensions (CLS prevention)
  const imagesWithoutDimensions = images.filter(img => !img.width || !img.height);
  if (imagesWithoutDimensions.length > 0) {
    issues.push({
      type: "warning",
      category: "Images - Dimensions",
      message: `${imagesWithoutDimensions.length} image(s) missing width/height`,
      recommendation: "Specify dimensions to prevent Cumulative Layout Shift (CLS)",
    });
    totalDeduction += 3;
  }

  // Check for title attribute
  const imagesWithoutTitle = images.filter(img => !img.title);
  if (imagesWithoutTitle.length > 0 && imagesWithoutTitle.length < images.length) {
    issues.push({
      type: "info",
      category: "Images - Title",
      message: `${imagesWithoutTitle.length} image(s) missing title attribute`,
      recommendation: "Add title attributes for additional context on hover",
    });
  }

  // Check filename quality
  const badFilenames: string[] = [];
  const genericFilenamePatterns = /^(img|image|photo|picture|untitled|dsc|img_|photo_|\d+)\.(jpg|jpeg|png|webp|gif)$/i;

  images.forEach(img => {
    const filename = img.filename || img.url.split('/').pop() || '';
    if (genericFilenamePatterns.test(filename)) {
      badFilenames.push(filename);
    }
  });

  if (badFilenames.length > 0) {
    issues.push({
      type: "warning",
      category: "Images - Filenames",
      message: `${badFilenames.length} image(s) have generic filenames`,
      recommendation: "Use descriptive, keyword-rich filenames (e.g., burj-khalifa-sunset-view.webp)",
    });
    totalDeduction += 3;
  }

  // Check for WebP format
  const nonWebpImages = images.filter(img => {
    const url = img.url.toLowerCase();
    return !url.includes('.webp') && !url.includes('format=webp');
  });

  if (nonWebpImages.length > 0 && nonWebpImages.length > images.length / 2) {
    issues.push({
      type: "info",
      category: "Images - Format",
      message: `${nonWebpImages.length} image(s) not in WebP format`,
      recommendation: "Consider using WebP for better compression and performance",
    });
  }

  // Check for caption
  const imagesWithCaption = images.filter(img => img.caption && img.caption.trim().length > 0);
  if (imagesWithCaption.length > 0) {
    issues.push({
      type: "success",
      category: "Images - Captions",
      message: `${imagesWithCaption.length} image(s) have captions`,
    });
  } else if (images.length >= 3) {
    issues.push({
      type: "info",
      category: "Images - Captions",
      message: "No images have captions",
      recommendation: "Add captions to important images for better context and SEO",
    });
  }

  return {
    issues,
    deduction: Math.min(totalDeduction, 25), // Cap at 25 points deduction for images
  };
}

// ==================== Image SEO Score Calculation ====================

export interface ImageSeoScore {
  score: number;
  issues: SeoIssue[];
  summary: {
    totalImages: number;
    imagesWithAlt: number;
    imagesWithTitle: number;
    imagesWithDimensions: number;
    imagesWithCaption: number;
    webpImages: number;
    seoFriendlyFilenames: number;
  };
}

export function analyzeImageSeoDetailed(images: ImageSeoInput[], primaryKeyword?: string): ImageSeoScore {
  const result = analyzeImagesSeo(images, primaryKeyword);

  const summary = {
    totalImages: images.length,
    imagesWithAlt: images.filter(img => img.alt && img.alt.trim().length > 0).length,
    imagesWithTitle: images.filter(img => img.title && img.title.trim().length > 0).length,
    imagesWithDimensions: images.filter(img => img.width && img.height).length,
    imagesWithCaption: images.filter(img => img.caption && img.caption.trim().length > 0).length,
    webpImages: images.filter(img => img.url.toLowerCase().includes('.webp') || img.url.includes('format=webp')).length,
    seoFriendlyFilenames: images.filter(img => {
      const filename = img.filename || img.url.split('/').pop() || '';
      const genericPatterns = /^(img|image|photo|picture|untitled|dsc|img_|photo_|\d+)\.(jpg|jpeg|png|webp|gif)$/i;
      return !genericPatterns.test(filename) && !filename.includes('_') && /^[a-z0-9-]+\.[a-z]+$/i.test(filename);
    }).length,
  };

  // Calculate score (100 - deductions)
  const score = Math.max(0, 100 - result.deduction);

  return {
    score,
    issues: result.issues,
    summary,
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 60) return "Needs Improvement";
  if (score >= 40) return "Poor";
  return "Critical";
}
