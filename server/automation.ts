/**
 * Automation System
 * Automatic improvements that run without user intervention
 */

import { db } from "./db";
import { contents, translations, mediaFiles, siteSettings, tags, contentTags } from "@shared/schema";
import { eq, desc, lt, gt, and, sql, like, isNull, or } from "drizzle-orm";
import { cache, cacheKeys } from "./cache";
import { jobQueue } from "./job-queue";
import { validateUrlForSSRF } from "./security";

// ============================================================================
// AUTO INTERNAL LINKING
// ============================================================================

interface LinkSuggestion {
  contentId: string;
  phrase: string;
  targetId: string;
  targetTitle: string;
  targetSlug: string;
  relevanceScore: number;
}

export const autoLinking = {
  /**
   * Find opportunities for internal links within content
   */
  async findLinkOpportunities(contentId: string): Promise<LinkSuggestion[]> {
    // Get the content
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content || !content.blocks) return [];

    // Get all published content for potential targets
    const allContent = await db.select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      type: contents.type,
      keywords: contents.metaTitle, // Using metaTitle as keyword source
    })
    .from(contents)
    .where(and(
      eq(contents.status, "published"),
      sql`${contents.id} != ${contentId}`
    ));

    const suggestions: LinkSuggestion[] = [];
    const contentText = JSON.stringify(content.blocks).toLowerCase();

    for (const target of allContent) {
      // Check if target title appears in content
      const titleLower = target.title.toLowerCase();
      const words = titleLower.split(/\s+/).filter(w => w.length > 4);

      for (const word of words) {
        if (contentText.includes(word) && !contentText.includes(`href=`)) {
          suggestions.push({
            contentId,
            phrase: word,
            targetId: target.id,
            targetTitle: target.title,
            targetSlug: target.slug,
            relevanceScore: 70 + (words.indexOf(word) === 0 ? 20 : 0),
          });
        }
      }

      // Check for exact title match
      if (contentText.includes(titleLower)) {
        suggestions.push({
          contentId,
          phrase: target.title,
          targetId: target.id,
          targetTitle: target.title,
          targetSlug: target.slug,
          relevanceScore: 100,
        });
      }
    }

    // Sort by relevance and dedupe
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter((s, i, arr) => arr.findIndex(x => x.targetId === s.targetId) === i)
      .slice(0, 10);
  },

  /**
   * Auto-add internal links to content (modifies blocks)
   */
  async applyLinks(contentId: string, suggestions: LinkSuggestion[]): Promise<number> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content || !content.blocks) return 0;

    let blocks = content.blocks as any[];
    let linksAdded = 0;

    for (const suggestion of suggestions.slice(0, 5)) { // Max 5 links per content
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].type === "text" || blocks[i].type === "paragraph") {
          const text = blocks[i].content || blocks[i].text || "";
          const phraseRegex = new RegExp(`\\b${suggestion.phrase}\\b`, "gi");

          if (phraseRegex.test(text) && !text.includes(`href=`)) {
            const linkedText = text.replace(
              phraseRegex,
              `<a href="/${suggestion.targetSlug}" class="internal-link">${suggestion.phrase}</a>`
            );
            blocks[i].content = linkedText;
            blocks[i].text = linkedText;
            linksAdded++;
            break; // Only one link per phrase per content
          }
        }
      }
    }

    if (linksAdded > 0) {
      await db.update(contents)
        .set({ blocks: blocks as any, updatedAt: new Date() })
        .where(eq(contents.id, contentId));
    }

    return linksAdded;
  },

  /**
   * Process all content for internal linking opportunities
   */
  async processAllContent(): Promise<{ processed: number; linksAdded: number }> {
    const allContent = await db.select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, "published"));

    let totalLinks = 0;
    for (const content of allContent) {
      const suggestions = await this.findLinkOpportunities(content.id);
      const links = await this.applyLinks(content.id, suggestions);
      totalLinks += links;
    }

    return { processed: allContent.length, linksAdded: totalLinks };
  },
};

// ============================================================================
// CONTENT FRESHNESS MONITORING
// ============================================================================

interface FreshnessReport {
  staleContent: Array<{
    id: string;
    title: string;
    type: string;
    lastUpdated: Date;
    daysSinceUpdate: number;
    priority: "high" | "medium" | "low";
  }>;
  stats: {
    total: number;
    fresh: number;
    stale: number;
    critical: number;
  };
}

export const freshnessMonitor = {
  // Days after which content is considered stale by type
  thresholds: {
    hotel: 90,      // Hotels need updates every 3 months (prices, amenities)
    restaurant: 60, // Restaurants every 2 months (menus, hours)
    attraction: 120, // Attractions every 4 months
    event: 30,      // Events need frequent updates
    article: 180,   // General articles every 6 months
    itinerary: 90,  // Itineraries every 3 months
  } as Record<string, number>,

  /**
   * Get freshness report for all content
   */
  async getReport(): Promise<FreshnessReport> {
    const now = new Date();
    const allContent = await db.select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(eq(contents.status, "published"));

    const staleContent: FreshnessReport["staleContent"] = [];
    let fresh = 0, stale = 0, critical = 0;

    for (const content of allContent) {
      const threshold = this.thresholds[content.type] || 180;
      const updatedDate = content.updatedAt ? new Date(content.updatedAt) : new Date();
      const daysSinceUpdate = Math.floor(
        (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate > threshold) {
        const priority = daysSinceUpdate > threshold * 2 ? "high" :
                        daysSinceUpdate > threshold * 1.5 ? "medium" : "low";

        if (priority === "high") critical++;
        stale++;

        staleContent.push({
          id: content.id,
          title: content.title,
          type: content.type,
          lastUpdated: updatedDate,
          daysSinceUpdate,
          priority,
        });
      } else {
        fresh++;
      }
    }

    // Sort by priority and days since update
    staleContent.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || b.daysSinceUpdate - a.daysSinceUpdate;
    });

    return {
      staleContent,
      stats: {
        total: allContent.length,
        fresh,
        stale,
        critical,
      },
    };
  },

  /**
   * Mark content as needing review
   */
  async flagForReview(contentId: string, reason: string): Promise<void> {
    await db.update(contents)
      .set({
        status: "review" as any,
        updatedAt: new Date(),
      })
      .where(eq(contents.id, contentId));
  },
};

// ============================================================================
// AUTO META GENERATION
// ============================================================================

export const autoMeta = {
  /**
   * Generate meta description from content if missing
   */
  async generateMetaDescription(contentId: string): Promise<string | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    // Already has meta description
    if (content.metaDescription && content.metaDescription.length >= 50) {
      return content.metaDescription;
    }

    // Extract text from blocks
    const blocks = (content.blocks as any[]) || [];
    let text = "";

    for (const block of blocks) {
      if (block.type === "text" || block.type === "paragraph") {
        text += (block.content || block.text || "") + " ";
      }
      if (text.length > 200) break;
    }

    // Clean and truncate
    const cleanText = text
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ")     // Normalize whitespace
      .trim();

    if (cleanText.length < 50) return null;

    // Generate description (first 150-160 chars, end at word boundary)
    let description = cleanText.substring(0, 160);
    const lastSpace = description.lastIndexOf(" ");
    if (lastSpace > 120) {
      description = description.substring(0, lastSpace) + "...";
    }

    // Save
    await db.update(contents)
      .set({ metaDescription: description })
      .where(eq(contents.id, contentId));

    return description;
  },

  /**
   * Generate meta title if missing
   */
  async generateMetaTitle(contentId: string): Promise<string | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    if (content.metaTitle) return content.metaTitle;

    // Create meta title from title + type
    const typeNames: Record<string, string> = {
      hotel: "Hotel in Dubai",
      restaurant: "Restaurant Dubai",
      attraction: "Dubai Attraction",
      article: "Dubai Guide",
      event: "Dubai Event",
      itinerary: "Dubai Itinerary",
    };

    const suffix = typeNames[content.type] || "Dubai Travel";
    const metaTitle = `${content.title} | ${suffix}`;

    await db.update(contents)
      .set({ metaTitle })
      .where(eq(contents.id, contentId));

    return metaTitle;
  },

  /**
   * Process all content missing meta
   */
  async processAllMissingMeta(): Promise<{ descriptions: number; titles: number }> {
    const contentMissingMeta = await db.select({ id: contents.id })
      .from(contents)
      .where(or(
        isNull(contents.metaDescription),
        isNull(contents.metaTitle),
        eq(contents.metaDescription, ""),
        eq(contents.metaTitle, "")
      ));

    let descriptions = 0, titles = 0;

    for (const content of contentMissingMeta) {
      const desc = await this.generateMetaDescription(content.id);
      const title = await this.generateMetaTitle(content.id);
      if (desc) descriptions++;
      if (title) titles++;
    }

    return { descriptions, titles };
  },
};

// ============================================================================
// BROKEN LINKS DETECTOR
// ============================================================================

interface BrokenLink {
  contentId: string;
  contentTitle: string;
  url: string;
  type: "internal" | "external" | "image";
  status?: number;
  error?: string;
}

export const brokenLinksDetector = {
  /**
   * Extract all links from content blocks
   */
  extractLinks(blocks: any[]): Array<{ url: string; type: "internal" | "external" | "image" }> {
    const links: Array<{ url: string; type: "internal" | "external" | "image" }> = [];
    const urlRegex = /href=["']([^"']+)["']|src=["']([^"']+)["']/g;

    const text = JSON.stringify(blocks);
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[1] || match[2];
      if (!url) continue;

      const type = match[0].startsWith("src") ? "image" :
                   url.startsWith("/") || url.includes(process.env.APP_URL || "") ? "internal" : "external";

      links.push({ url, type });
    }

    return links;
  },

  /**
   * Check if a URL is accessible
   */
  async checkUrl(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
    try {
      // For internal links, check database
      if (url.startsWith("/")) {
        const slug = url.replace(/^\//, "").split("?")[0];
        const [exists] = await db.select({ id: contents.id })
          .from(contents)
          .where(eq(contents.slug, slug));

        return exists ? { ok: true, status: 200 } : { ok: false, status: 404, error: "Content not found" };
      }

      // SSRF Protection: Validate URL before making request
      const ssrfCheck = validateUrlForSSRF(url);
      if (!ssrfCheck.valid) {
        return { ok: false, error: `SSRF blocked: ${ssrfCheck.error}` };
      }

      // For external links, make HTTP request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(ssrfCheck.sanitizedUrl!, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "TraviBot/1.0 (link-checker)" },
      });

      clearTimeout(timeout);
      return { ok: response.ok, status: response.status };
    } catch (error: any) {
      return { ok: false, error: error.message || "Connection failed" };
    }
  },

  /**
   * Scan all content for broken links
   */
  async scanAllContent(): Promise<BrokenLink[]> {
    const brokenLinks: BrokenLink[] = [];
    const allContent = await db.select({
      id: contents.id,
      title: contents.title,
      blocks: contents.blocks,
      heroImage: contents.heroImage,
    })
    .from(contents)
    .where(eq(contents.status, "published"));

    for (const content of allContent) {
      const blocks = (content.blocks as any[]) || [];
      const links = this.extractLinks(blocks);

      // Also check hero image
      if (content.heroImage) {
        links.push({ url: content.heroImage, type: "image" });
      }

      for (const link of links) {
        const result = await this.checkUrl(link.url);
        if (!result.ok) {
          brokenLinks.push({
            contentId: content.id,
            contentTitle: content.title,
            url: link.url,
            type: link.type,
            status: result.status,
            error: result.error,
          });
        }
      }
    }

    return brokenLinks;
  },

  /**
   * Quick scan (internal links only, faster)
   */
  async quickScan(): Promise<BrokenLink[]> {
    const brokenLinks: BrokenLink[] = [];
    const allContent = await db.select({
      id: contents.id,
      title: contents.title,
      blocks: contents.blocks,
    })
    .from(contents)
    .where(eq(contents.status, "published"));

    // Get all valid slugs
    const validSlugs = new Set(
      (await db.select({ slug: contents.slug }).from(contents)).map(c => c.slug)
    );

    for (const content of allContent) {
      const blocks = (content.blocks as any[]) || [];
      const links = this.extractLinks(blocks).filter(l => l.type === "internal");

      for (const link of links) {
        const slug = link.url.replace(/^\//, "").split("?")[0];
        if (!validSlugs.has(slug)) {
          brokenLinks.push({
            contentId: content.id,
            contentTitle: content.title,
            url: link.url,
            type: "internal",
            status: 404,
            error: "Content not found",
          });
        }
      }
    }

    return brokenLinks;
  },
};

// ============================================================================
// CONTENT PERFORMANCE SCORING
// ============================================================================

interface PerformanceScore {
  contentId: string;
  title: string;
  type: string;
  scores: {
    seo: number;
    freshness: number;
    completeness: number;
    engagement: number;
    overall: number;
  };
  recommendations: string[];
}

export const performanceScoring = {
  /**
   * Calculate performance score for content
   */
  async scoreContent(contentId: string): Promise<PerformanceScore | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    const recommendations: string[] = [];
    const blocks = (content.blocks as any[]) || [];

    // SEO Score (0-100)
    let seoScore = 0;
    if (content.metaTitle) seoScore += 20;
    else recommendations.push("Add a meta title");

    if (content.metaDescription && content.metaDescription.length >= 120) seoScore += 20;
    else recommendations.push("Add a meta description (120+ characters)");

    if (content.heroImage) seoScore += 20;
    else recommendations.push("Add a hero image");

    if (content.slug && content.slug.length <= 75) seoScore += 20;

    // Check for headings in content
    const hasHeadings = blocks.some((b: any) => b.type === "heading");
    if (hasHeadings) seoScore += 20;
    else recommendations.push("Add headings to structure your content");

    // Freshness Score (0-100)
    const contentUpdatedDate = content.updatedAt ? new Date(content.updatedAt) : new Date();
    const daysSinceUpdate = Math.floor(
      (Date.now() - contentUpdatedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const threshold = freshnessMonitor.thresholds[content.type] || 180;
    const freshnessScore = Math.max(0, 100 - (daysSinceUpdate / threshold) * 100);

    if (freshnessScore < 50) {
      recommendations.push(`Content is ${daysSinceUpdate} days old, consider updating`);
    }

    // Completeness Score (0-100)
    let completenessScore = 0;

    // Word count
    const textContent = blocks
      .filter((b: any) => b.type === "text" || b.type === "paragraph")
      .map((b: any) => b.content || b.text || "")
      .join(" ");
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    if (wordCount >= 300) completenessScore += 25;
    else recommendations.push("Add more content (minimum 300 words)");

    if (wordCount >= 600) completenessScore += 25;
    if (wordCount >= 1000) completenessScore += 25;

    // Images in content
    const imageCount = blocks.filter((b: any) => b.type === "image").length;
    if (imageCount >= 2) completenessScore += 25;
    else recommendations.push("Add more images to your content");

    // Engagement Score (placeholder - would come from analytics)
    const engagementScore = 50; // Default to 50 without analytics data

    // Overall Score
    const overall = Math.round(
      (seoScore * 0.3) +
      (freshnessScore * 0.2) +
      (completenessScore * 0.3) +
      (engagementScore * 0.2)
    );

    return {
      contentId: content.id,
      title: content.title,
      type: content.type,
      scores: {
        seo: Math.round(seoScore),
        freshness: Math.round(freshnessScore),
        completeness: Math.round(completenessScore),
        engagement: engagementScore,
        overall,
      },
      recommendations,
    };
  },

  /**
   * Get scores for all content
   */
  async scoreAllContent(): Promise<PerformanceScore[]> {
    const allContent = await db.select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, "published"));

    const scores: PerformanceScore[] = [];
    for (const content of allContent) {
      const score = await this.scoreContent(content.id);
      if (score) scores.push(score);
    }

    return scores.sort((a, b) => a.scores.overall - b.scores.overall);
  },

  /**
   * Get underperforming content
   */
  async getUnderperformers(threshold = 60): Promise<PerformanceScore[]> {
    const allScores = await this.scoreAllContent();
    return allScores.filter(s => s.scores.overall < threshold);
  },
};

// ============================================================================
// AUTO SOCIAL POSTS GENERATOR
// ============================================================================

interface SocialPost {
  contentId: string;
  platform: "twitter" | "facebook" | "instagram" | "linkedin";
  text: string;
  hashtags: string[];
  imageUrl?: string;
}

export const socialPostsGenerator = {
  /**
   * Generate social media posts for content
   */
  async generatePosts(contentId: string): Promise<SocialPost[]> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return [];

    const baseUrl = process.env.APP_URL || "https://travi.co.il";
    const url = `${baseUrl}/${content.slug}`;

    // Get content excerpt
    const blocks = (content.blocks as any[]) || [];
    const textContent = blocks
      .filter((b: any) => b.type === "text" || b.type === "paragraph")
      .map((b: any) => b.content || b.text || "")
      .join(" ")
      .replace(/<[^>]*>/g, "")
      .substring(0, 200);

    // Generate hashtags based on type and content
    const typeHashtags: Record<string, string[]> = {
      hotel: ["DubaiHotels", "LuxuryDubai", "DubaiTravel"],
      restaurant: ["DubaiFoodie", "DubaiDining", "DubaiEats"],
      attraction: ["DubaiAttractions", "VisitDubai", "DubaiTourism"],
      article: ["DubaiGuide", "DubaiTips", "TravelDubai"],
      event: ["DubaiEvents", "DubaiNightlife", "WhatsOnDubai"],
    };
    const hashtags = ["Dubai", ...(typeHashtags[content.type] || ["DubaiTravel"])];

    const posts: SocialPost[] = [];

    // Twitter/X (280 chars max)
    const twitterText = `${content.title}\n\n${textContent.substring(0, 150)}...\n\n${url}`;
    posts.push({
      contentId,
      platform: "twitter",
      text: twitterText.substring(0, 280),
      hashtags: hashtags.slice(0, 3),
      imageUrl: content.heroImage || undefined,
    });

    // Facebook (longer text allowed)
    posts.push({
      contentId,
      platform: "facebook",
      text: `${content.title}\n\n${textContent}...\n\nRead more: ${url}`,
      hashtags,
      imageUrl: content.heroImage || undefined,
    });

    // Instagram (visual focused)
    const igText = `${content.title}\n\n${textContent.substring(0, 100)}...\n\nLink in bio!\n\n${hashtags.map(h => `#${h}`).join(" ")}`;
    posts.push({
      contentId,
      platform: "instagram",
      text: igText,
      hashtags,
      imageUrl: content.heroImage || undefined,
    });

    // LinkedIn (professional)
    posts.push({
      contentId,
      platform: "linkedin",
      text: `Discover: ${content.title}\n\n${textContent}...\n\n${url}`,
      hashtags: hashtags.slice(0, 3),
      imageUrl: content.heroImage || undefined,
    });

    return posts;
  },
};

// ============================================================================
// SCHEMA.ORG STRUCTURED DATA
// ============================================================================

export const schemaGenerator = {
  /**
   * Generate Schema.org JSON-LD for content
   */
  generateSchema(content: any): Record<string, any> {
    const baseUrl = process.env.APP_URL || "https://travi.co.il";

    const baseSchema = {
      "@context": "https://schema.org",
      "@id": `${baseUrl}/${content.slug}`,
      "url": `${baseUrl}/${content.slug}`,
      "name": content.title,
      "description": content.metaDescription || "",
      "image": content.heroImage,
      "datePublished": content.createdAt,
      "dateModified": content.updatedAt,
    };

    switch (content.type) {
      case "hotel":
        return {
          ...baseSchema,
          "@type": "Hotel",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Dubai",
            "addressCountry": "AE",
          },
          "starRating": {
            "@type": "Rating",
            "ratingValue": content.rating || 4,
          },
          "priceRange": content.priceRange || "$$$",
        };

      case "restaurant":
        return {
          ...baseSchema,
          "@type": "Restaurant",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Dubai",
            "addressCountry": "AE",
          },
          "servesCuisine": content.cuisine || "International",
          "priceRange": content.priceRange || "$$",
        };

      case "attraction":
        return {
          ...baseSchema,
          "@type": "TouristAttraction",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Dubai",
            "addressCountry": "AE",
          },
          "isAccessibleForFree": false,
        };

      case "event":
        return {
          ...baseSchema,
          "@type": "Event",
          "location": {
            "@type": "Place",
            "name": "Dubai",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Dubai",
              "addressCountry": "AE",
            },
          },
          "startDate": content.startDate,
          "endDate": content.endDate,
        };

      case "article":
      default:
        return {
          ...baseSchema,
          "@type": "Article",
          "author": {
            "@type": "Organization",
            "name": "Travi",
          },
          "publisher": {
            "@type": "Organization",
            "name": "Travi",
            "logo": {
              "@type": "ImageObject",
              "url": `${baseUrl}/logo.png`,
            },
          },
        };
    }
  },

  /**
   * Generate breadcrumb schema
   */
  generateBreadcrumbs(content: any): Record<string, any> {
    const baseUrl = process.env.APP_URL || "https://travi.co.il";

    const typeNames: Record<string, string> = {
      hotel: "Hotels",
      restaurant: "Restaurants",
      attraction: "Attractions",
      article: "Articles",
      event: "Events",
      itinerary: "Itineraries",
    };

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": typeNames[content.type] || "Content",
          "item": `${baseUrl}/${content.type}s`,
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": content.title,
          "item": `${baseUrl}/${content.slug}`,
        },
      ],
    };
  },
};

// ============================================================================
// SCHEDULED AUTOMATION RUNNER
// ============================================================================

export const automationRunner = {
  /**
   * Run all daily automations
   */
  async runDailyTasks(): Promise<{
    internalLinks: { processed: number; linksAdded: number };
    missingMeta: { descriptions: number; titles: number };
    brokenLinks: number;
    staleContent: number;
  }> {
    console.log("[Automation] Starting daily tasks...");

    // 1. Process internal links
    const linkResults = await autoLinking.processAllContent();
    console.log(`[Automation] Internal links: ${linkResults.linksAdded} added`);

    // 2. Generate missing meta
    const metaResults = await autoMeta.processAllMissingMeta();
    console.log(`[Automation] Meta generated: ${metaResults.descriptions} descriptions, ${metaResults.titles} titles`);

    // 3. Quick broken links scan
    const brokenLinks = await brokenLinksDetector.quickScan();
    console.log(`[Automation] Broken links found: ${brokenLinks.length}`);

    // 4. Check freshness
    const freshnessReport = await freshnessMonitor.getReport();
    console.log(`[Automation] Stale content: ${freshnessReport.stats.stale}, critical: ${freshnessReport.stats.critical}`);

    console.log("[Automation] Daily tasks completed");

    return {
      internalLinks: linkResults,
      missingMeta: metaResults,
      brokenLinks: brokenLinks.length,
      staleContent: freshnessReport.stats.stale,
    };
  },

  /**
   * Run weekly tasks (more intensive)
   */
  async runWeeklyTasks(): Promise<{
    performanceScores: PerformanceScore[];
    brokenLinksDetailed: BrokenLink[];
  }> {
    console.log("[Automation] Starting weekly tasks...");

    // 1. Full performance scoring
    const scores = await performanceScoring.scoreAllContent();
    const underperformers = scores.filter(s => s.scores.overall < 60);
    console.log(`[Automation] Underperforming content: ${underperformers.length}`);

    // 2. Full broken links scan (including external)
    const brokenLinks = await brokenLinksDetector.scanAllContent();
    console.log(`[Automation] Total broken links: ${brokenLinks.length}`);

    console.log("[Automation] Weekly tasks completed");

    return {
      performanceScores: underperformers,
      brokenLinksDetailed: brokenLinks,
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const automation = {
  linking: autoLinking,
  freshness: freshnessMonitor,
  meta: autoMeta,
  brokenLinks: brokenLinksDetector,
  performance: performanceScoring,
  social: socialPostsGenerator,
  schema: schemaGenerator,
  runner: automationRunner,
};
