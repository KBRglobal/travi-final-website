/**
 * SEO Validation Agent
 * Comprehensive SEO validation with 4 tiers based on Dubai Content SEO Architecture
 *
 * TIER 1: Critical (blocks publishing if < 100%)
 * TIER 2: Essential (affects ranking)
 * TIER 3: Technical (professional quality)
 * TIER 4: Quality (excellence differentiator)
 */

import { logger } from "./log-service";

// ============================================================================
// TYPES
// ============================================================================

export type SEOTier = "tier1_critical" | "tier2_essential" | "tier3_technical" | "tier4_quality";

export type PageType =
  | "attraction"
  | "hotel"
  | "article"
  | "dining"
  | "district"
  | "event"
  | "itinerary"
  | "landing_page"
  | "case_study"
  | "off_plan"
  | "listicle"
  | "comparison"
  | "guide";

export interface SEOCheck {
  name: string;
  tier: SEOTier;
  passed: boolean;
  message: string;
  currentValue?: string | number | null;
  requiredValue?: string | number;
  autoFixable: boolean;
  fixSuggestion?: string;
}

export interface SEOValidationResult {
  pageType: PageType;
  overallScore: number;
  tier1Score: number;
  tier2Score: number;
  tier3Score: number;
  tier4Score: number;
  checks: SEOCheck[];
  blockingIssues: string[];
  warnings: string[];
  canPublish: boolean;
  publishBlockReasons: string[];
  autoFixableIssues: Array<{
    name: string;
    current: string | number | null;
    suggestion: string;
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Minimum word counts by page type
const MIN_WORD_COUNTS: Record<PageType, number> = {
  attraction: 1500,
  hotel: 1200,
  article: 1200,
  dining: 1200,
  district: 1500,
  event: 800,
  itinerary: 1500,
  landing_page: 1000,
  case_study: 1500,
  off_plan: 1500,
  listicle: 2500,
  comparison: 2000,
  guide: 1800,
};

// Required elements by page type
const REQUIRED_ELEMENTS: Record<
  PageType,
  {
    minFaq: number;
    maxFaq: number;
    minInternalLinks: number;
    maxInternalLinks: number;
    minTips: number;
    minHighlights?: number;
    maxHighlights?: number;
    minImages?: number;
    maxImages?: number;
  }
> = {
  attraction: {
    minFaq: 6,
    maxFaq: 10,
    minInternalLinks: 5,
    maxInternalLinks: 8,
    minTips: 3,
    minHighlights: 3,
    maxHighlights: 5,
  },
  hotel: {
    minFaq: 6,
    maxFaq: 8,
    minInternalLinks: 5,
    maxInternalLinks: 8,
    minTips: 3,
    minImages: 5,
    maxImages: 8,
  },
  article: { minFaq: 6, maxFaq: 10, minInternalLinks: 5, maxInternalLinks: 8, minTips: 3 },
  dining: { minFaq: 5, maxFaq: 8, minInternalLinks: 4, maxInternalLinks: 6, minTips: 3 },
  district: { minFaq: 8, maxFaq: 12, minInternalLinks: 8, maxInternalLinks: 12, minTips: 5 },
  event: { minFaq: 4, maxFaq: 6, minInternalLinks: 3, maxInternalLinks: 5, minTips: 3 },
  itinerary: { minFaq: 6, maxFaq: 10, minInternalLinks: 8, maxInternalLinks: 15, minTips: 5 },
  landing_page: { minFaq: 5, maxFaq: 8, minInternalLinks: 5, maxInternalLinks: 10, minTips: 3 },
  case_study: { minFaq: 4, maxFaq: 6, minInternalLinks: 5, maxInternalLinks: 8, minTips: 3 },
  off_plan: { minFaq: 8, maxFaq: 12, minInternalLinks: 5, maxInternalLinks: 10, minTips: 5 },
  listicle: { minFaq: 8, maxFaq: 12, minInternalLinks: 5, maxInternalLinks: 8, minTips: 3 },
  comparison: { minFaq: 6, maxFaq: 10, minInternalLinks: 5, maxInternalLinks: 8, minTips: 3 },
  guide: { minFaq: 8, maxFaq: 12, minInternalLinks: 8, maxInternalLinks: 12, minTips: 5 },
};

// Cliches and clickbait phrases to avoid (matches writer-engine and client seo-analyzer)
const CLICHES = [
  "must-visit",
  "must visit",
  "hidden gem",
  "hidden gems",
  "world-class",
  "world class",
  "breathtaking",
  "awe-inspiring",
  "jaw-dropping",
  "unforgettable",
  "once in a lifetime",
  "once-in-a-lifetime",
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

// Dubai-specific locations for context
const DUBAI_LOCATIONS = [
  "downtown dubai",
  "dubai marina",
  "palm jumeirah",
  "jbr",
  "deira",
  "bur dubai",
  "business bay",
  "jumeirah",
  "al barsha",
  "dubai creek",
  "city walk",
  "la mer",
  "dubai hills",
  "jvc",
  "dubai south",
  "al quoz",
  "difc",
];

// ============================================================================
// SEO VALIDATION AGENT
// ============================================================================

export class SEOValidationAgent {
  private readonly minSeoScore = 70;
  private readonly requireTier1_100Percent = true;

  constructor() {
    logger.seo.debug("SEO Validation Agent initialized");
  }

  /**
   * Validate content against complete SEO checklist
   */
  validate(content: ContentData, pageType: PageType = "attraction"): SEOValidationResult {
    const checks: SEOCheck[] = [];

    // TIER 1: Critical checks
    const tier1Checks = this.validateTier1Critical(content, pageType);
    checks.push(...tier1Checks);

    // TIER 2: Essential checks
    const tier2Checks = this.validateTier2Essential(content, pageType);
    checks.push(...tier2Checks);

    // TIER 3: Technical checks
    const tier3Checks = this.validateTier3Technical(content);
    checks.push(...tier3Checks);

    // TIER 4: Quality checks
    const tier4Checks = this.validateTier4Quality(content);
    checks.push(...tier4Checks);

    // Calculate scores
    const tier1Score = this.calculateTierScore(tier1Checks);
    const tier2Score = this.calculateTierScore(tier2Checks);
    const tier3Score = this.calculateTierScore(tier3Checks);
    const tier4Score = this.calculateTierScore(tier4Checks);

    // Overall score (weighted)
    const overallScore = Math.round(
      tier1Score * 0.4 + tier2Score * 0.3 + tier3Score * 0.2 + tier4Score * 0.1
    );

    // Determine blocking issues and publishability
    const blockingIssues = tier1Checks.filter(c => !c.passed).map(c => c.message);
    const warnings = [...tier2Checks, ...tier3Checks].filter(c => !c.passed).map(c => c.message);

    // Check publishing eligibility
    let canPublish = true;
    const publishBlockReasons: string[] = [];

    if (overallScore < this.minSeoScore) {
      canPublish = false;
      publishBlockReasons.push(`SEO Score ${overallScore}% < minimum ${this.minSeoScore}%`);
    }

    if (this.requireTier1_100Percent && tier1Score < 100) {
      canPublish = false;
      publishBlockReasons.push(`Tier 1 Critical: ${tier1Score}% (must be 100%)`);
      publishBlockReasons.push(...blockingIssues);
    }

    // Collect auto-fixable issues
    const autoFixableIssues = checks
      .filter(c => c.autoFixable && !c.passed)
      .map(c => ({
        name: c.name,
        current: c.currentValue ?? null,
        suggestion: c.fixSuggestion || "",
      }));

    logger.seo.info(`SEO Validation complete: ${overallScore}% | Can publish: ${canPublish}`, {
      pageType,
      tier1Score,
      tier2Score,
      tier3Score,
      tier4Score,
      blockingCount: blockingIssues.length,
      autoFixableCount: autoFixableIssues.length,
    });

    return {
      pageType,
      overallScore,
      tier1Score,
      tier2Score,
      tier3Score,
      tier4Score,
      checks,
      blockingIssues,
      warnings,
      canPublish,
      publishBlockReasons,
      autoFixableIssues,
    };
  }

  // ============================================================================
  // TIER 1: Critical - blocks publishing
  // ============================================================================

  private validateTier1Critical(content: ContentData, pageType: PageType): SEOCheck[] {
    const checks: SEOCheck[] = [];

    // 1. Meta Title (50-60 chars, includes primary keyword)
    const metaTitle = content.metaTitle || content.title || "";
    const primaryKeyword = content.primaryKeyword || "";

    const titleLen = metaTitle.length;
    const titleHasKeyword = primaryKeyword
      ? metaTitle.toLowerCase().includes(primaryKeyword.toLowerCase())
      : true;
    const titleValid = titleLen >= 50 && titleLen <= 60 && titleHasKeyword;

    checks.push({
      name: "meta_title",
      tier: "tier1_critical",
      passed: titleValid,
      message: `Meta Title: ${titleLen} chars (need 50-60)${!titleHasKeyword ? " | Missing keyword" : ""}`,
      currentValue: metaTitle.substring(0, 60) || null,
      requiredValue: "50-60 chars with primary keyword",
      autoFixable: true,
      fixSuggestion: titleValid ? undefined : this.generateMetaTitle(content),
    });

    // 2. Meta Description (150-160 chars)
    const metaDesc = content.metaDescription || "";
    const descLen = metaDesc.length;
    const descValid = descLen >= 150 && descLen <= 160;

    checks.push({
      name: "meta_description",
      tier: "tier1_critical",
      passed: descValid,
      message: `Meta Description: ${descLen} chars (need 150-160)`,
      currentValue: metaDesc ? metaDesc.substring(0, 80) + "..." : null,
      requiredValue: "150-160 chars with CTA",
      autoFixable: true,
      fixSuggestion: descValid ? undefined : this.generateMetaDescription(content),
    });

    // 3. Primary Keyword defined
    const hasPrimaryKeyword = !!content.primaryKeyword && content.primaryKeyword.length > 2;
    checks.push({
      name: "primary_keyword_defined",
      tier: "tier1_critical",
      passed: hasPrimaryKeyword,
      message: `Primary Keyword: ${hasPrimaryKeyword ? "Defined" : "MISSING"}`,
      currentValue: content.primaryKeyword || null,
      autoFixable: true,
      fixSuggestion: hasPrimaryKeyword ? undefined : this.extractPrimaryKeyword(content),
    });

    // 4. Primary Keyword in H1/Title
    const h1 = content.title || "";
    const h1HasKeyword = primaryKeyword
      ? h1.toLowerCase().includes(primaryKeyword.toLowerCase())
      : false;
    checks.push({
      name: "primary_keyword_in_h1",
      tier: "tier1_critical",
      passed: h1HasKeyword || !primaryKeyword,
      message: `Primary Keyword in H1: ${h1HasKeyword ? "Yes" : "MISSING"}`,
      currentValue: h1.substring(0, 50) || null,
      autoFixable: false,
    });

    // 5. Primary Keyword in first 150 words
    const intro = content.introduction || this.getFullText(content).substring(0, 1000);
    const first150Words = intro.split(/\s+/).slice(0, 150).join(" ");
    const keywordInIntro = primaryKeyword
      ? first150Words.toLowerCase().includes(primaryKeyword.toLowerCase())
      : true;
    checks.push({
      name: "primary_keyword_in_intro",
      tier: "tier1_critical",
      passed: keywordInIntro,
      message: `Primary Keyword in first 150 words: ${keywordInIntro ? "Yes" : "MISSING"}`,
      autoFixable: false,
    });

    // 6. Minimum word count
    const fullContent = this.getFullText(content);
    const wordCount = this.countWords(fullContent);
    const minWords = MIN_WORD_COUNTS[pageType] || 1500;

    checks.push({
      name: "minimum_word_count",
      tier: "tier1_critical",
      passed: wordCount >= minWords,
      message: `Word Count: ${wordCount} (minimum: ${minWords})`,
      currentValue: wordCount,
      requiredValue: minWords,
      autoFixable: false,
    });

    // 7. H2 Structure (3-8 H2s)
    const h2Count = this.countH2Sections(content);
    const h2Valid = h2Count >= 3 && h2Count <= 8;
    checks.push({
      name: "h2_structure",
      tier: "tier1_critical",
      passed: h2Valid,
      message: `H2 Headers: ${h2Count} (need 3-8)`,
      currentValue: h2Count,
      requiredValue: "3-8",
      autoFixable: false,
    });

    // 8. Hero Image with Alt Text
    const heroImage = content.heroImage || content.image;
    const heroAlt = typeof heroImage === "object" ? heroImage?.altText || heroImage?.alt : "";
    const hasHeroWithAlt = !!heroImage && !!heroAlt && heroAlt.length >= 20;

    checks.push({
      name: "hero_image_alt",
      tier: "tier1_critical",
      passed: hasHeroWithAlt,
      message: `Hero Image Alt Text: ${heroAlt ? heroAlt.substring(0, 40) + "..." : "MISSING"}`,
      autoFixable: true,
      fixSuggestion: hasHeroWithAlt ? undefined : this.generateAltText(content),
    });

    // 9. All Images have Alt Text
    const images = content.images || [];
    const imagesWithoutAlt = images.filter((img: any) => !img.altText && !img.alt);
    const allImagesHaveAlt = imagesWithoutAlt.length === 0;

    checks.push({
      name: "all_images_alt_text",
      tier: "tier1_critical",
      passed: allImagesHaveAlt || images.length === 0,
      message:
        imagesWithoutAlt.length > 0
          ? `${imagesWithoutAlt.length} image(s) missing Alt Text`
          : "All images have Alt Text",
      autoFixable: imagesWithoutAlt.length > 0,
    });

    return checks;
  }

  // ============================================================================
  // TIER 2: Essential - affects ranking
  // ============================================================================

  private validateTier2Essential(content: ContentData, pageType: PageType): SEOCheck[] {
    const checks: SEOCheck[] = [];
    const reqs = REQUIRED_ELEMENTS[pageType] || REQUIRED_ELEMENTS.attraction;

    // 1. Internal Links
    const internalLinks = this.countInternalLinks(content);
    const linksValid =
      internalLinks >= reqs.minInternalLinks && internalLinks <= reqs.maxInternalLinks;

    checks.push({
      name: "internal_links",
      tier: "tier2_essential",
      passed: linksValid,
      message: `Internal Links: ${internalLinks} (need ${reqs.minInternalLinks}-${reqs.maxInternalLinks})`,
      currentValue: internalLinks,
      requiredValue: `${reqs.minInternalLinks}-${reqs.maxInternalLinks}`,
      autoFixable: false,
    });

    // 2. External Links (1-2 authoritative)
    const externalLinks = content.externalLinks?.length || 0;
    checks.push({
      name: "external_links",
      tier: "tier2_essential",
      passed: externalLinks >= 1 && externalLinks <= 2,
      message: `External Links: ${externalLinks} (need 1-2 authoritative)`,
      currentValue: externalLinks,
      autoFixable: false,
    });

    // 3. FAQ Section
    const faq = content.faq || [];
    const faqCount = faq.length;
    const faqValid = faqCount >= reqs.minFaq && faqCount <= reqs.maxFaq;

    checks.push({
      name: "faq_section",
      tier: "tier2_essential",
      passed: faqValid,
      message: `FAQ Questions: ${faqCount} (need ${reqs.minFaq}-${reqs.maxFaq})`,
      currentValue: faqCount,
      requiredValue: `${reqs.minFaq}-${reqs.maxFaq}`,
      autoFixable: false,
    });

    // 4. Pro Tips Section
    const tips = content.proTips || content.tips || [];
    const tipsValid = tips.length >= reqs.minTips;

    checks.push({
      name: "pro_tips",
      tier: "tier2_essential",
      passed: tipsValid,
      message: `Pro Tips: ${tips.length} (minimum: ${reqs.minTips})`,
      currentValue: tips.length,
      autoFixable: false,
    });

    // 5. Secondary Keywords (3-5)
    const secondaryKeywords = content.secondaryKeywords || [];
    const secKwValid = secondaryKeywords.length >= 3 && secondaryKeywords.length <= 5;

    checks.push({
      name: "secondary_keywords",
      tier: "tier2_essential",
      passed: secKwValid,
      message: `Secondary Keywords: ${secondaryKeywords.length} (need 3-5)`,
      autoFixable: true,
      fixSuggestion: secKwValid ? undefined : this.extractSecondaryKeywords(content).join(", "),
    });

    // 6. CTAs (at least 2)
    const ctaCount = this.countCTAs(content);
    checks.push({
      name: "call_to_actions",
      tier: "tier2_essential",
      passed: ctaCount >= 2,
      message: `CTAs: ${ctaCount} (minimum: 2)`,
      currentValue: ctaCount,
      autoFixable: false,
    });

    return checks;
  }

  // ============================================================================
  // TIER 3: Technical
  // ============================================================================

  private validateTier3Technical(content: ContentData): SEOCheck[] {
    const checks: SEOCheck[] = [];

    // 1. URL Structure
    const url = content.slug || content.url || "";
    const urlValid = !!url && !url.includes("?") && url.length < 100;

    checks.push({
      name: "url_structure",
      tier: "tier3_technical",
      passed: urlValid,
      message: `URL Structure: ${urlValid ? "Clean" : "Needs improvement"}`,
      currentValue: url.substring(0, 50) || null,
      autoFixable: true,
    });

    // 2. Canonical URL
    const hasCanonical = !!content.canonicalUrl;
    checks.push({
      name: "canonical_url",
      tier: "tier3_technical",
      passed: hasCanonical,
      message: `Canonical URL: ${hasCanonical ? "Set" : "Not set"}`,
      autoFixable: true,
    });

    // 3. Schema Markup
    const hasSchema = !!content.seoSchema || !!content.schemaMarkup;
    checks.push({
      name: "schema_markup",
      tier: "tier3_technical",
      passed: hasSchema,
      message: `Schema Markup: ${hasSchema ? "Present" : "Missing"}`,
      autoFixable: false,
    });

    // 4. Open Graph Tags
    const ogTags = content.ogTags || {};
    const ogValid =
      !!(ogTags["og:title"] || ogTags.ogTitle) &&
      !!(ogTags["og:description"] || ogTags.ogDescription) &&
      !!(ogTags["og:image"] || ogTags.ogImage);

    checks.push({
      name: "open_graph_tags",
      tier: "tier3_technical",
      passed: ogValid,
      message: `Open Graph Tags: ${ogValid ? "Complete" : "Incomplete"}`,
      autoFixable: true,
    });

    // 5. Breadcrumb Navigation
    const hasBreadcrumb = !!content.breadcrumb;
    checks.push({
      name: "breadcrumb",
      tier: "tier3_technical",
      passed: hasBreadcrumb,
      message: `Breadcrumb: ${hasBreadcrumb ? "Set" : "Missing"}`,
      autoFixable: true,
    });

    // 6. Publication/Update Date
    const hasDates = !!content.publishedAt && !!content.updatedAt;
    checks.push({
      name: "dates",
      tier: "tier3_technical",
      passed: hasDates,
      message: `Publication/Update Dates: ${hasDates ? "Set" : "Missing"}`,
      autoFixable: true,
    });

    return checks;
  }

  // ============================================================================
  // TIER 4: Quality
  // ============================================================================

  private validateTier4Quality(content: ContentData): SEOCheck[] {
    const checks: SEOCheck[] = [];
    const fullText = this.getFullText(content);

    // 1. No Cliches
    const clichesFound = CLICHES.filter(c => fullText.toLowerCase().includes(c.toLowerCase()));
    const noCliches = clichesFound.length === 0;

    checks.push({
      name: "no_cliches",
      tier: "tier4_quality",
      passed: noCliches,
      message: noCliches
        ? "No cliches found"
        : `Cliches found: ${clichesFound.slice(0, 3).join(", ")}`,
      autoFixable: false,
    });

    // 2. Specific Prices (not just "affordable")
    const hasSpecificPrices = /(?:AED|USD|\$|€|£)\s*\d+/.test(fullText);
    const vaguePricing = /(affordable|cheap|expensive|budget-friendly|pricey)/i.test(fullText);

    checks.push({
      name: "specific_prices",
      tier: "tier4_quality",
      passed: hasSpecificPrices || !vaguePricing,
      message: hasSpecificPrices
        ? "Specific prices included"
        : "Use specific prices instead of vague terms",
      autoFixable: false,
    });

    // 3. Honest Cons (not just pros)
    const hasCons =
      !!content.cons?.length ||
      /\b(con|downside|drawback|disadvantage|however|but)\b/i.test(fullText);
    checks.push({
      name: "honest_cons",
      tier: "tier4_quality",
      passed: hasCons,
      message: hasCons ? "Includes balanced view with cons" : "Add honest cons for credibility",
      autoFixable: false,
    });

    // 4. Current Year Mentioned
    const currentYear = new Date().getFullYear();
    const hasCurrentYear =
      fullText.includes(String(currentYear)) || fullText.includes(String(currentYear + 1));

    checks.push({
      name: "current_year",
      tier: "tier4_quality",
      passed: hasCurrentYear,
      message: hasCurrentYear ? `Year ${currentYear} mentioned` : "Add current year for freshness",
      autoFixable: false,
    });

    // 5. Paragraph Length (2-4 sentences avg)
    const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim());
    let goodParagraphs = true;
    if (paragraphs.length > 0) {
      const avgSentences =
        paragraphs.reduce((sum, p) => sum + p.split(/[.!?]+/).filter(s => s.trim()).length, 0) /
        paragraphs.length;
      goodParagraphs = avgSentences >= 2 && avgSentences <= 5;
    }

    checks.push({
      name: "paragraph_length",
      tier: "tier4_quality",
      passed: goodParagraphs,
      message: goodParagraphs ? "Paragraph length optimal" : "Keep 2-4 sentences per paragraph",
      autoFixable: false,
    });

    // 6. Visual Breaks (every 300-400 words)
    const wordCount = this.countWords(fullText);
    const h2Count = this.countH2Sections(content);
    const expectedBreaks = Math.floor(wordCount / 350);

    checks.push({
      name: "visual_breaks",
      tier: "tier4_quality",
      passed: h2Count >= expectedBreaks || wordCount < 1000,
      message: `Visual Breaks: ${h2Count} sections for ${wordCount} words`,
      autoFixable: false,
    });

    return checks;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateTierScore(checks: SEOCheck[]): number {
    if (checks.length === 0) return 100;
    const passed = checks.filter(c => c.passed).length;
    return Math.round((passed / checks.length) * 100);
  }

  private getFullText(content: ContentData): string {
    const parts: string[] = [
      content.title || "",
      content.introduction || "",
      content.content || "",
    ];

    // Add blocks content
    if (content.blocks) {
      for (const block of content.blocks) {
        if (block.content) parts.push(block.content);
        if (block.text) parts.push(block.text);
        if (block.items) parts.push(block.items.join(" "));
      }
    }

    // Add quick facts
    if (content.quickFacts) {
      parts.push(content.quickFacts.join(" "));
    }

    // Add main sections
    if (content.mainSections) {
      for (const section of content.mainSections) {
        if (section.content) parts.push(section.content);
        if (section.text) parts.push(section.text);
      }
    }

    // Add FAQ
    if (content.faq) {
      for (const faq of content.faq) {
        parts.push(faq.question || "");
        parts.push(faq.answer || "");
      }
    }

    // Add tips
    if (content.proTips) {
      parts.push(content.proTips.join(" "));
    }
    if (content.tips) {
      parts.push(
        content.tips.map((t: any) => (typeof t === "string" ? t : t.text || "")).join(" ")
      );
    }

    // Add conclusion
    if (content.conclusion) {
      parts.push(content.conclusion);
    }

    return parts.filter(Boolean).join(" ");
  }

  private countWords(text: string): number {
    return text
      .replace(/<[^>]*>/g, "")
      .split(/\s+/)
      .filter(w => w.length > 0).length;
  }

  private countH2Sections(content: ContentData): number {
    let count = 0;

    // Count from mainSections
    if (content.mainSections) {
      count += content.mainSections.length;
    }

    // Count from blocks
    if (content.blocks) {
      count += content.blocks.filter(
        (b: any) => b.type === "heading" || b.type === "section" || b.type === "h2"
      ).length;
    }

    // Count H2 tags in content
    if (content.content) {
      const h2Matches = content.content.match(/<h2[^>]*>/gi);
      if (h2Matches) count += h2Matches.length;
    }

    return count || content.mainSections?.length || 0;
  }

  private countInternalLinks(content: ContentData): number {
    const fullText = this.getFullText(content);
    const links = fullText.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    const internal = (links as any[]).filter(
      l => !l.includes("http") || l.includes("travi") || l.includes("dubai")
    );
    return internal.length + (content.internalLinks?.length || 0);
  }

  private countCTAs(content: ContentData): number {
    const fullText = this.getFullText(content).toLowerCase();
    const ctaPhrases = [
      "book now",
      "plan your",
      "get tickets",
      "reserve",
      "learn more",
      "discover",
      "explore",
      "read more",
      "check out",
      "see more",
      "click here",
      "visit",
      "sign up",
      "get started",
      "try now",
    ];
    return ctaPhrases.filter(phrase => fullText.includes(phrase)).length;
  }

  // ============================================================================
  // AUTO-FIX GENERATORS
  // ============================================================================

  private generateMetaTitle(content: ContentData): string {
    const title = content.title || "";
    const primaryKeyword = content.primaryKeyword || "";
    const year = new Date().getFullYear();

    let base = title
      .replace(/Complete Guide to\s*/i, "")
      .replace(/\s*Guide$/i, "")
      .trim();
    if (primaryKeyword && !base.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      base = `${primaryKeyword} - ${base}`;
    }

    const result = `${base.substring(0, 45)} | Dubai ${year}`;
    return result.substring(0, 60);
  }

  private generateMetaDescription(content: ContentData): string {
    const intro = content.introduction || "";
    const primaryKeyword = content.primaryKeyword || "";

    const sentences = intro.split(/[.!?]/);
    let firstSentence = sentences[0]?.trim() || "";

    const cta = "Plan your visit today!";
    let desc = firstSentence.substring(0, 100);

    if (primaryKeyword && !desc.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      desc = `${primaryKeyword}: ${desc}`;
    }

    desc = `${desc}. ${cta}`;

    if (desc.length < 150) {
      desc = desc.padEnd(150, " ");
    }

    return desc.substring(0, 160).trim();
  }

  private extractPrimaryKeyword(content: ContentData): string {
    const title = content.title || "";

    // Destination-agnostic patterns for keyword extraction
    const patterns = [
      /guide to (.+?)(?:\s+\d{4}|\s*$)/i,
      /best (.+?) in (?:dubai|paris|london|tokyo|singapore|bangkok|new york|barcelona|rome|amsterdam)/i,
      /top (.+?) in (?:dubai|paris|london|tokyo|singapore|bangkok|new york|barcelona|rome|amsterdam)/i,
      /^(.+?) -/,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(title);
      if (match?.[1]) {
        const keyword = match[1].trim();
        if (keyword.length > 3) {
          return keyword.charAt(0).toUpperCase() + keyword.slice(1);
        }
      }
    }

    // Common stopwords to skip (destination-agnostic)
    const stopWords = ["guide", "complete", "best", "ultimate", "top", "travel", "the", "a", "an"];
    const words = title.split(/\s+/);
    for (const word of words) {
      if (word.length > 4 && !stopWords.includes(word.toLowerCase())) {
        return word;
      }
    }

    // FAIL-FAST: Return title as keyword rather than hardcoding a destination
    return title.split(" ")[0] || "Travel";
  }

  private extractSecondaryKeywords(content: ContentData): string[] {
    const fullText = this.getFullText(content).toLowerCase();
    const primary = (content.primaryKeyword || "").toLowerCase();

    const potential = [
      "tickets",
      "prices",
      "hours",
      "location",
      "tips",
      "restaurants nearby",
      "hotels nearby",
      "attractions",
      "things to do",
      "best time to visit",
      "how to get there",
      "what to wear",
      "booking",
      "entry fee",
      "opening hours",
      "sunset view",
      "photography",
    ];

    const found = potential.filter(kw => fullText.includes(kw) && kw !== primary);
    return found.slice(0, 5);
  }

  private generateAltText(content: ContentData): string {
    const title = content.title || "attraction";
    const category = content.type || content.category || "tourism";

    // Generate alt text without hardcoding a destination
    return `${title.replace(/ - Complete Guide.*$/i, "")} - ${category} travel photography`.substring(
      0,
      125
    );
  }
}

// ============================================================================
// CONTENT DATA TYPE
// ============================================================================

interface ContentData {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  introduction?: string;
  content?: string;
  blocks?: Array<{
    type: string;
    content?: string;
    text?: string;
    items?: string[];
  }>;
  quickFacts?: string[];
  mainSections?: Array<{
    title?: string;
    content?: string;
    text?: string;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  proTips?: string[];
  tips?: Array<string | { text: string }>;
  conclusion?: string;
  heroImage?: { altText?: string; alt?: string; url?: string } | string;
  image?: { altText?: string; alt?: string; url?: string } | string;
  images?: Array<{ altText?: string; alt?: string; url?: string }>;
  internalLinks?: string[];
  externalLinks?: string[];
  slug?: string;
  url?: string;
  canonicalUrl?: string;
  seoSchema?: unknown;
  schemaMarkup?: unknown;
  ogTags?: Record<string, string>;
  breadcrumb?: string[];
  publishedAt?: string | Date;
  updatedAt?: string | Date;
  cons?: string[];
  type?: string;
  category?: string;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Singleton instance
let seoValidatorInstance: SEOValidationAgent | null = null;

export function getSEOValidator(): SEOValidationAgent {
  if (!seoValidatorInstance) {
    seoValidatorInstance = new SEOValidationAgent();
  }
  return seoValidatorInstance;
}

export function validateSEO(
  content: ContentData,
  pageType: PageType = "attraction"
): SEOValidationResult {
  return getSEOValidator().validate(content, pageType);
}
