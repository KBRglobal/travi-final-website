/**
 * SEO Auto-Fixer Service
 * Automatically fixes common SEO issues identified by the SEO Validation Agent
 *
 * Can fix:
 * - Meta Title (generate from content)
 * - Meta Description (generate from content)
 * - Primary Keyword (extract from title/content)
 * - Secondary Keywords (extract from content)
 * - Alt Text for images (generate descriptive)
 * - Open Graph tags (generate from meta)
 * - Canonical URL (set from URL)
 * - Breadcrumb (generate from category/title)
 * - Dates (add current dates)
 */

import { logger } from "./log-service";

// ============================================================================
// TYPES
// ============================================================================

export interface FixResult {
  field: string;
  originalValue: string | number | null;
  fixedValue: string;
  fixType: "generate" | "extract" | "set" | "fallback";
  success: boolean;
  message: string;
}

export interface AutoFixResult {
  fixesApplied: number;
  fixesFailed: number;
  articleUpdated: Record<string, unknown>;
  fixDetails: FixResult[];
  remainingIssues: string[];
}

// ============================================================================
// SEO AUTO-FIXER
// ============================================================================

export class SEOAutoFixer {
  private readonly brandName = "Travi";

  private readonly ctas = [
    "Plan your visit today!",
    "Book now and save!",
    "Discover more inside!",
    "Start planning now!",
    "Get your tickets today!",
  ];

  // Location recognition patterns for various destinations (destination-agnostic)
  private readonly locationPatterns: Record<string, string[]> = {
    dubai: [
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
    ],
    paris: [
      "eiffel tower",
      "champs elysees",
      "montmartre",
      "le marais",
      "louvre",
      "latin quarter",
      "saint germain",
      "opera",
      "bastille",
    ],
    london: [
      "westminster",
      "soho",
      "covent garden",
      "shoreditch",
      "kensington",
      "notting hill",
      "camden",
      "greenwich",
      "mayfair",
    ],
    "new york": [
      "manhattan",
      "times square",
      "central park",
      "brooklyn",
      "soho",
      "tribeca",
      "chelsea",
      "harlem",
      "upper east side",
    ],
    tokyo: [
      "shibuya",
      "shinjuku",
      "harajuku",
      "ginza",
      "asakusa",
      "akihabara",
      "roppongi",
      "odaiba",
      "ueno",
    ],
    singapore: [
      "marina bay",
      "orchard road",
      "sentosa",
      "chinatown",
      "little india",
      "clarke quay",
      "bugis",
      "jurong",
    ],
    bangkok: [
      "sukhumvit",
      "silom",
      "khao san",
      "chatuchak",
      "thonburi",
      "pratunam",
      "siam",
      "riverside",
    ],
  };

  constructor() {
    logger.seo.debug("SEO Auto-Fixer initialized");
  }

  /**
   * Automatically fix SEO issues in article
   */
  autoFix(article: Record<string, unknown>): AutoFixResult {
    logger.seo.info("Starting SEO auto-fix...");

    const fixedArticle = { ...article };
    const fixes: FixResult[] = [];

    // Fix Meta Title
    if (!this.isValidMetaTitle(fixedArticle)) {
      const result = this.fixMetaTitle(fixedArticle);
      fixes.push(result);
      if (result.success) {
        fixedArticle.metaTitle = result.fixedValue;
      }
    }

    // Fix Meta Description
    if (!this.isValidMetaDescription(fixedArticle)) {
      const result = this.fixMetaDescription(fixedArticle);
      fixes.push(result);
      if (result.success) {
        fixedArticle.metaDescription = result.fixedValue;
      }
    }

    // Fix Primary Keyword
    if (!fixedArticle.primaryKeyword) {
      const result = this.fixPrimaryKeyword(fixedArticle);
      fixes.push(result);
      if (result.success) {
        fixedArticle.primaryKeyword = result.fixedValue;
      }
    }

    // Fix Secondary Keywords
    const secondaryKeywords = fixedArticle.secondaryKeywords as string[] | undefined;
    if (!secondaryKeywords || secondaryKeywords.length < 3) {
      const result = this.fixSecondaryKeywords(fixedArticle);
      fixes.push(result);
      if (result.success) {
        fixedArticle.secondaryKeywords = result.fixedValue.split(", ");
      }
    }

    // Fix Hero Image Alt Text
    if (!this.hasValidAltText(fixedArticle)) {
      const result = this.fixHeroAltText(fixedArticle);
      fixes.push(result);
      if (result.success) {
        const heroImage = fixedArticle.heroImage || fixedArticle.image;
        if (typeof heroImage === "object" && heroImage) {
          (heroImage as Record<string, unknown>).altText = result.fixedValue;
        } else {
          fixedArticle.heroImage = { url: heroImage as string, altText: result.fixedValue };
        }
      }
    }

    // Fix All Images Alt Text
    const images = (fixedArticle.images || []) as Array<Record<string, unknown>>;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.altText && !img.alt) {
        const result = this.fixImageAltText(fixedArticle, i, img);
        fixes.push(result);
        if (result.success) {
          images[i].altText = result.fixedValue;
        }
      }
    }
    if (images.length > 0) {
      fixedArticle.images = images;
    }

    // Fix Open Graph Tags
    if (!this.hasValidOgTags(fixedArticle)) {
      const result = this.fixOgTags(fixedArticle);
      fixes.push(result);
      if (result.success) {
        try {
          fixedArticle.ogTags = JSON.parse(result.fixedValue);
        } catch (error) {
          console.error(error);
          // If parsing fails, create a simple object
          fixedArticle.ogTags = {
            "og:title": fixedArticle.metaTitle || fixedArticle.title,
            "og:description": fixedArticle.metaDescription,
            "og:image": (fixedArticle.heroImage as Record<string, unknown>)?.url || "",
          };
        }
      }
    }

    // Fix Canonical URL
    if (!fixedArticle.canonicalUrl) {
      const result = this.fixCanonicalUrl(fixedArticle);
      fixes.push(result);
      if (result.success) {
        fixedArticle.canonicalUrl = result.fixedValue;
      }
    }

    // Fix Breadcrumb
    if (!fixedArticle.breadcrumb) {
      const result = this.fixBreadcrumb(fixedArticle);
      fixes.push(result);
      if (result.success) {
        fixedArticle.breadcrumb = result.fixedValue.split(" > ");
      }
    }

    // Fix Dates
    if (!fixedArticle.publishedAt || !fixedArticle.updatedAt) {
      const result = this.fixDates(fixedArticle);
      fixes.push(result);
      if (result.success) {
        const now = new Date().toISOString();
        if (!fixedArticle.publishedAt) fixedArticle.publishedAt = now;
        fixedArticle.updatedAt = now;
      }
    }

    // Fix Internal Links in content body
    const internalLinksResult = this.fixInternalLinksInBlocks(fixedArticle);
    if (internalLinksResult.fixed) {
      fixes.push({
        field: "internal_links",
        originalValue: null,
        fixedValue: `Injected ${internalLinksResult.count} internal links`,
        fixType: "generate",
        success: true,
        message: `Injected ${internalLinksResult.count} internal links into content`,
      });
      fixedArticle.blocks = internalLinksResult.blocks;
    }

    // Fix External Links in content body
    const externalLinksResult = this.fixExternalLinksInBlocks(fixedArticle);
    if (externalLinksResult.fixed) {
      fixes.push({
        field: "external_links",
        originalValue: null,
        fixedValue: "Injected authoritative external link",
        fixType: "generate",
        success: true,
        message: "Injected authoritative external link into content",
      });
      fixedArticle.blocks = externalLinksResult.blocks;
    }

    // Count results
    const applied = fixes.filter(f => f.success).length;
    const failed = fixes.filter(f => !f.success).length;
    const remaining = fixes.filter(f => !f.success).map(f => f.message);

    logger.seo.info(`Auto-fix complete: ${applied} fixes applied, ${failed} failed`, {
      fixesApplied: applied,
      fixesFailed: failed,
      fixTypes: fixes.map(f => f.field),
    });

    return {
      fixesApplied: applied,
      fixesFailed: failed,
      articleUpdated: fixedArticle,
      fixDetails: fixes,
      remainingIssues: remaining,
    };
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  private isValidMetaTitle(article: Record<string, unknown>): boolean {
    const title = (article.metaTitle as string) || "";
    return title.length >= 50 && title.length <= 60;
  }

  private isValidMetaDescription(article: Record<string, unknown>): boolean {
    const desc = (article.metaDescription as string) || "";
    return desc.length >= 150 && desc.length <= 160;
  }

  private hasValidAltText(article: Record<string, unknown>): boolean {
    const image = article.heroImage || article.image;
    if (typeof image === "object" && image) {
      const alt =
        (image as Record<string, unknown>).altText || (image as Record<string, unknown>).alt;
      return typeof alt === "string" && alt.length >= 20;
    }
    return false;
  }

  private hasValidOgTags(article: Record<string, unknown>): boolean {
    const og = article.ogTags as Record<string, string> | undefined;
    if (!og) return false;
    return (
      !!(og["og:title"] || og.ogTitle) &&
      !!(og["og:description"] || og.ogDescription) &&
      !!(og["og:image"] || og.ogImage)
    );
  }

  // ============================================================================
  // FIX METHODS
  // ============================================================================

  private fixMetaTitle(article: Record<string, unknown>): FixResult {
    try {
      const title = (article.title as string) || "";
      const year = new Date().getFullYear();

      // Clean title
      let cleanTitle = title
        .replace(/Complete Guide to\s*/i, "")
        .replace(/\s*-\s*Complete Guide$/i, "")
        .replace(/\s+\d{4}$/, "")
        .trim();

      // Try different formats to hit 50-60 chars
      const formats = [
        `${cleanTitle} - Complete Guide ${year} | ${this.brandName}`,
        `${cleanTitle} Guide ${year} | ${this.brandName}`,
        `${cleanTitle} ${year} - Full Guide | ${this.brandName}`,
        `Best ${cleanTitle} Guide ${year} | ${this.brandName}`,
        `${cleanTitle} Tips & Guide ${year} | ${this.brandName}`,
      ];

      let metaTitle = formats.find(fmt => fmt.length >= 50 && fmt.length <= 60);

      if (!metaTitle) {
        const base = `${cleanTitle} Guide ${year} | ${this.brandName}`;
        if (base.length < 50) {
          metaTitle = `${cleanTitle} - Complete Guide ${year} | ${this.brandName}`;
        } else if (base.length > 60) {
          metaTitle = `${cleanTitle.substring(0, 35)} Guide ${year} | ${this.brandName}`;
        } else {
          metaTitle = base;
        }
      }

      // Force into range
      if (metaTitle.length < 50) {
        metaTitle = metaTitle.replace(" | ", " - Dubai | ");
      }
      metaTitle = metaTitle.substring(0, 60).trim();

      return {
        field: "metaTitle",
        originalValue: (article.metaTitle as string) || null,
        fixedValue: metaTitle,
        fixType: "generate",
        success: true,
        message: `Generated meta title (${metaTitle.length} chars): ${metaTitle.substring(0, 40)}...`,
      };
    } catch (e) {
      return {
        field: "metaTitle",
        originalValue: (article.metaTitle as string) || null,
        fixedValue: "",
        fixType: "generate",
        success: false,
        message: `Failed to generate meta title: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private fixMetaDescription(article: Record<string, unknown>): FixResult {
    try {
      const title = (article.title as string) || "";
      const intro = (article.introduction as string) || title;
      // FAIL-FAST: Do not use implicit Dubai fallback for primary keyword
      const primaryKw = (article.primaryKeyword as string) || title.split(" ")[0] || "";

      // Extract first meaningful sentence
      const sentences = intro.split(/[.!?]/);
      let firstSentence = sentences[0]?.trim() || title;

      // Random CTA
      const cta = this.ctas[Math.floor(Math.random() * this.ctas.length)];

      // Target 155 chars
      const ctaLen = cta.length + 1;
      const kwPrefix = `${primaryKw}: `;
      const contentBudget = 155 - ctaLen - kwPrefix.length;

      let content =
        firstSentence.length > contentBudget
          ? firstSentence
              .substring(0, contentBudget - 3)
              .split(" ")
              .slice(0, -1)
              .join(" ") + "..."
          : firstSentence;

      let desc = `${kwPrefix}${content} ${cta}`;

      // Adjust length
      if (desc.length < 150) {
        const filler = " Comprehensive guide with prices and tips.";
        const needed = 150 - desc.length;
        desc = desc.replace(` ${cta}`, `${filler.substring(0, needed)} ${cta}`);
      }

      desc = desc.substring(0, 160).trim();

      return {
        field: "metaDescription",
        originalValue: (article.metaDescription as string) || null,
        fixedValue: desc,
        fixType: "generate",
        success: true,
        message: `Generated meta description (${desc.length} chars)`,
      };
    } catch (e) {
      return {
        field: "metaDescription",
        originalValue: (article.metaDescription as string) || null,
        fixedValue: "",
        fixType: "generate",
        success: false,
        message: `Failed to generate meta description: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private fixPrimaryKeyword(article: Record<string, unknown>): FixResult {
    try {
      const title = (article.title as string) || "";

      const patterns = [
        /(?:guide to|best|top)\s+(.+?)(?:\s+in\s+dubai|\s+\d{4}|$)/i,
        /^(.+?)\s*[-–—:]/,
        /dubai\s+(.+?)(?:\s+guide|\s+\d{4}|$)/i,
      ];

      for (const pattern of patterns) {
        const match = pattern.exec(title);
        if (match?.[1]) {
          let keyword = match[1].trim().replace(/\s+(in|at|for|the)\s*$/i, "");
          if (keyword.length > 3) {
            return {
              field: "primaryKeyword",
              originalValue: null,
              fixedValue: keyword.charAt(0).toUpperCase() + keyword.slice(1),
              fixType: "extract",
              success: true,
              message: `Extracted primary keyword: ${keyword}`,
            };
          }
        }
      }

      // Fallback: significant word from title
      const words = title
        .split(/\s+/)
        .filter(
          w =>
            w.length > 4 &&
            !["guide", "complete", "best", "dubai", "ultimate", "top", "things"].includes(
              w.toLowerCase()
            )
        );

      if (words.length > 0) {
        return {
          field: "primaryKeyword",
          originalValue: null,
          fixedValue: words[0].charAt(0).toUpperCase() + words[0].slice(1),
          fixType: "extract",
          success: true,
          message: `Extracted primary keyword: ${words[0]}`,
        };
      }

      // FAIL-FAST: Do not use implicit Dubai fallback for primary keyword
      return {
        field: "primaryKeyword",
        originalValue: null,
        fixedValue: "",
        fixType: "fallback",
        success: false,
        message:
          "FAIL: No primary keyword available - destination context required (no implicit defaults)",
      };
    } catch (e) {
      return {
        field: "primaryKeyword",
        originalValue: null,
        fixedValue: "",
        fixType: "extract",
        success: false,
        message: `Failed to extract primary keyword: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private fixSecondaryKeywords(article: Record<string, unknown>): FixResult {
    try {
      const fullText = this.getFullText(article).toLowerCase();
      const primary = ((article.primaryKeyword as string) || "").toLowerCase();

      const candidates = [
        "tickets",
        "prices",
        "hours",
        "location",
        "tips",
        "time to visit",
        "restaurants",
        "hotels",
        "nearby",
        "parking",
        "directions",
        "opening hours",
        "entry fee",
        "booking",
        "reservations",
        "best time",
        "what to wear",
        "photography",
        "sunset",
        "sunrise",
        "view",
        "observation",
        "deck",
      ];

      const found = candidates.filter(kw => fullText.includes(kw) && kw !== primary);

      if (found.length < 3) {
        const defaults = ["visitor tips", "practical info", "what to expect"];
        found.push(...defaults.slice(0, 3 - found.length));
      }

      const keywords = found.slice(0, 5).join(", ");

      return {
        field: "secondaryKeywords",
        originalValue: null,
        fixedValue: keywords,
        fixType: "extract",
        success: found.length >= 3,
        message: `Extracted ${found.length} secondary keywords`,
      };
    } catch (e) {
      return {
        field: "secondaryKeywords",
        originalValue: null,
        fixedValue: "",
        fixType: "extract",
        success: false,
        message: `Failed to extract secondary keywords: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private findLocationFromTitle(titleLower: string): { location: string; city: string } {
    let location = "";
    let foundCity = "";

    for (const [city, locations] of Object.entries(this.locationPatterns)) {
      if (titleLower.includes(city.toLowerCase())) {
        foundCity = city.charAt(0).toUpperCase() + city.slice(1);
      }
      for (const loc of locations) {
        if (!titleLower.includes(loc)) continue;
        location = loc
          .split(" ")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        foundCity = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
      if (location) break;
    }

    return { location, city: foundCity };
  }

  private buildLocationSuffix(location: string, city: string): string {
    if (location) return ` - scenic view in ${location}`;
    if (city) return ` - scenic view in ${city}`;
    return " - scenic travel view";
  }

  private fixHeroAltText(article: Record<string, unknown>): FixResult {
    try {
      const title = (article.title as string) || "attraction";
      const titleLower = title.toLowerCase();

      const { location, city } = this.findLocationFromTitle(titleLower);

      const cleanTitle = title.replace(/\s*-\s*Complete Guide.*/i, "").replace(/\s*Guide$/i, "");
      const locationSuffix = this.buildLocationSuffix(location, city);
      const altText = `${cleanTitle}${locationSuffix}`.substring(0, 125);

      return {
        field: "heroImageAlt",
        originalValue: null,
        fixedValue: altText,
        fixType: "generate",
        success: altText.length >= 20,
        message: `Generated hero alt text: ${altText.substring(0, 50)}...`,
      };
    } catch (e) {
      return {
        field: "heroImageAlt",
        originalValue: null,
        fixedValue: "",
        fixType: "generate",
        success: false,
        message: `Failed to generate hero alt text: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private fixImageAltText(
    article: Record<string, unknown>,
    index: number,
    image: Record<string, unknown>
  ): FixResult {
    try {
      // FAIL-FAST: Do not use implicit Dubai fallback for image alt text
      const title = (article.title as string) || "Image";
      const filename = (image.filename as string) || (image.url as string) || "";

      // Extract context from filename
      const nameParts = filename.replaceAll(/[-_.]/g, " ").toLowerCase();

      const altText = `${title} - ${nameParts.substring(0, 50)} photography`.substring(0, 125);

      return {
        field: `image_${index}_alt`,
        originalValue: null,
        fixedValue: altText,
        fixType: "generate",
        success: true,
        message: `Generated alt text for image ${index}`,
      };
    } catch (e) {
      return {
        field: `image_${index}_alt`,
        originalValue: null,
        fixedValue: "",
        fixType: "generate",
        success: false,
        message: `Failed to generate alt text for image ${index}: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private fixOgTags(article: Record<string, unknown>): FixResult {
    try {
      const title = (article.metaTitle as string) || (article.title as string) || "";
      const desc = (article.metaDescription as string) || "";
      const heroImage = article.heroImage || article.image;
      const url = (article.canonicalUrl as string) || (article.slug as string) || "";

      let imageUrl = "";
      if (typeof heroImage === "object" && heroImage) {
        imageUrl = ((heroImage as Record<string, unknown>).url as string) || "";
      } else if (typeof heroImage === "string") {
        imageUrl = heroImage;
      }

      const ogTags = {
        "og:title": title.substring(0, 60),
        "og:description": desc.substring(0, 160) || title,
        "og:image": imageUrl || "/default-og-image.jpg",
        "og:url": url,
        "og:type": "article",
        "og:site_name": this.brandName,
      };

      return {
        field: "ogTags",
        originalValue: null,
        fixedValue: JSON.stringify(ogTags),
        fixType: "generate",
        success: true,
        message: "Generated Open Graph tags",
      };
    } catch (e) {
      return {
        field: "ogTags",
        originalValue: null,
        fixedValue: "",
        fixType: "generate",
        success: false,
        message: `Failed to generate OG tags: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private fixCanonicalUrl(article: Record<string, unknown>): FixResult {
    try {
      const slug = (article.slug as string) || (article.url as string) || "";
      const category = (article.type as string) || (article.category as string) || "attractions";
      const title = (article.title as string) || "page";

      let canonical: string;
      if (slug) {
        const cleanSlug = slug
          .toLowerCase()
          .replaceAll(/[^a-z0-9-]/g, "")
          .replaceAll(/\s+/g, "-");
        canonical = `/${category}/${cleanSlug}`;
      } else {
        const cleanSlug = title
          .toLowerCase()
          .replaceAll(/[^a-z0-9-]/g, "")
          .replaceAll(/\s+/g, "-")
          .substring(0, 50);
        canonical = `/${category}/${cleanSlug}`;
      }

      return {
        field: "canonicalUrl",
        originalValue: null,
        fixedValue: canonical,
        fixType: "generate",
        success: true,
        message: `Set canonical URL: ${canonical}`,
      };
    } catch (e) {
      return {
        field: "canonicalUrl",
        originalValue: null,
        fixedValue: "",
        fixType: "generate",
        success: false,
        message: `Failed to set canonical URL: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private fixBreadcrumb(article: Record<string, unknown>): FixResult {
    try {
      const category =
        ((article.type as string) || (article.category as string) || "attractions")
          .charAt(0)
          .toUpperCase() +
        ((article.type as string) || (article.category as string) || "attractions").slice(1);
      const title = (article.title as string) || "Page";

      // Shorten title for breadcrumb
      const shortTitle = title.split(" - ")[0].substring(0, 30);

      const breadcrumb = `Home > Dubai > ${category} > ${shortTitle}`;

      return {
        field: "breadcrumb",
        originalValue: null,
        fixedValue: breadcrumb,
        fixType: "generate",
        success: true,
        message: `Generated breadcrumb: ${breadcrumb}`,
      };
    } catch (e) {
      return {
        field: "breadcrumb",
        originalValue: null,
        fixedValue: "",
        fixType: "generate",
        success: false,
        message: `Failed to generate breadcrumb: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private fixDates(article: Record<string, unknown>): FixResult {
    try {
      const now = new Date().toISOString();

      return {
        field: "dates",
        originalValue: null,
        fixedValue: now,
        fixType: "set",
        success: true,
        message: `Set publication and update dates to ${now.substring(0, 10)}`,
      };
    } catch (e) {
      return {
        field: "dates",
        originalValue: null,
        fixedValue: "",
        fixType: "set",
        success: false,
        message: `Failed to set dates: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  private collectBlockParts(blocks: Array<Record<string, unknown>> | undefined): string[] {
    if (!blocks) return [];
    const parts: string[] = [];
    for (const block of blocks) {
      if (block.content) parts.push(block.content as string);
      if (block.text) parts.push(block.text as string);
      if (block.items) parts.push((block.items as string[]).join(" "));
    }
    return parts;
  }

  private collectFaqParts(
    faq: Array<{ question?: string; answer?: string }> | undefined
  ): string[] {
    if (!faq) return [];
    const parts: string[] = [];
    for (const f of faq) {
      parts.push(f.question || "", f.answer || "");
    }
    return parts;
  }

  private getFullText(article: Record<string, unknown>): string {
    const parts: string[] = [
      (article.title as string) || "",
      (article.introduction as string) || "",
      (article.content as string) || "",
    ];

    parts.push(
      ...this.collectBlockParts(article.blocks as Array<Record<string, unknown>> | undefined)
    );

    const quickFacts = article.quickFacts as string[] | undefined;
    if (quickFacts) parts.push(quickFacts.join(" "));

    parts.push(
      ...this.collectFaqParts(
        article.faq as Array<{ question?: string; answer?: string }> | undefined
      )
    );

    const proTips = article.proTips as string[] | undefined;
    if (proTips) parts.push(proTips.join(" "));

    if (article.conclusion) parts.push(article.conclusion as string);

    return parts.filter(Boolean).join(" ");
  }

  // ============================================================================
  // LINK INJECTION METHODS
  // ============================================================================

  private fixInternalLinksInBlocks(article: Record<string, unknown>): {
    fixed: boolean;
    count: number;
    blocks: Array<Record<string, unknown>>;
  } {
    try {
      const blocks = (article.blocks as Array<Record<string, unknown>>) || [];
      if (blocks.length === 0) {
        return { fixed: false, count: 0, blocks };
      }

      // Count existing internal links
      let existingInternalLinks = 0;
      for (const block of blocks) {
        const content = (block.content as string) || "";
        existingInternalLinks += (content.match(/href="\//gi) || []).length;
      }

      if (existingInternalLinks >= 5) {
        return { fixed: false, count: 0, blocks };
      }

      // Fallback internal links
      const internalLinks = [
        { title: "Top Attractions in Dubai", url: "/attractions" },
        { title: "Best Hotels in Dubai", url: "/hotels" },
        { title: "Dubai Dining Guide", url: "/dining" },
        { title: "Dubai Districts", url: "/districts" },
        { title: "Dubai Events Calendar", url: "/events" },
        { title: "Getting Around Dubai", url: "/transport" },
      ];

      const linksNeeded = Math.min(5 - existingInternalLinks, 4);
      let injectedCount = 0;
      const updatedBlocks = [...blocks];

      // Find text blocks and inject links
      for (let i = 0; i < updatedBlocks.length && injectedCount < linksNeeded; i++) {
        const block = updatedBlocks[i];
        if (block.type === "text" && block.content) {
          const content = block.content as string;
          if (content.length > 100 && !content.includes('href="/')) {
            const link = internalLinks[injectedCount];
            const linkHtml = ` <span class="related-content">See also: <a href="${link.url}">${link.title}</a>.</span>`;
            updatedBlocks[i] = {
              ...block,
              content: content + linkHtml,
            };
            injectedCount++;
          }
        }
      }

      return { fixed: injectedCount > 0, count: injectedCount, blocks: updatedBlocks };
    } catch (e) {
      logger.seo.error("Failed to inject internal links", {
        error: e instanceof Error ? e.message : String(e),
      });
      return {
        fixed: false,
        count: 0,
        blocks: (article.blocks as Array<Record<string, unknown>>) || [],
      };
    }
  }

  private fixExternalLinksInBlocks(article: Record<string, unknown>): {
    fixed: boolean;
    blocks: Array<Record<string, unknown>>;
  } {
    try {
      const blocks = (article.blocks as Array<Record<string, unknown>>) || [];
      if (blocks.length === 0) {
        return { fixed: false, blocks };
      }

      // Count existing external links
      let existingExternalLinks = 0;
      for (const block of blocks) {
        const content = (block.content as string) || "";
        existingExternalLinks += (content.match(/href="https?:\/\//gi) || []).length;
      }

      if (existingExternalLinks >= 1) {
        return { fixed: false, blocks };
      }

      // Authoritative external links
      const externalLinks = [
        { title: "Visit Dubai Official", url: "https://www.visitdubai.com" },
        { title: "Dubai Government Portal", url: "https://www.dubai.ae" },
      ];

      const updatedBlocks = [...blocks];
      let injected = false;

      // Find a text block and inject external link
      for (let i = 0; i < updatedBlocks.length; i++) {
        const block = updatedBlocks[i];
        if (block.type === "text" && block.content && !injected) {
          const content = block.content as string;
          if (content.length > 100) {
            const link = externalLinks[0];
            const linkHtml = ` <p class="external-reference">For official information, visit <a href="${link.url}" target="_blank" rel="noopener">${link.title}</a>.</p>`;
            updatedBlocks[i] = {
              ...block,
              content: content + linkHtml,
            };
            injected = true;
            break;
          }
        }
      }

      return { fixed: injected, blocks: updatedBlocks };
    } catch (e) {
      logger.seo.error("Failed to inject external links", {
        error: e instanceof Error ? e.message : String(e),
      });
      return { fixed: false, blocks: (article.blocks as Array<Record<string, unknown>>) || [] };
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

let seoFixerInstance: SEOAutoFixer | null = null;

export function getSEOFixer(): SEOAutoFixer {
  if (!seoFixerInstance) {
    seoFixerInstance = new SEOAutoFixer();
  }
  return seoFixerInstance;
}

export function autoFixSEO(article: Record<string, unknown>): AutoFixResult {
  return getSEOFixer().autoFix(article);
}
