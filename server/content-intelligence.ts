/**
 * Content Intelligence System
 * Advanced content optimization, clustering, recommendations, and A/B testing
 */

import { db } from "./db";
import { contents, translations, tags, contentTags, siteSettings, abTests as abTestsTable } from "@shared/schema";
import { eq, desc, and, sql, like, or, ne, gt, lt, inArray } from "drizzle-orm";
import { DUBAI_AREAS } from "./services/image-seo-service";

// ============================================================================
// TOPIC CLUSTER BUILDER
// ============================================================================

interface TopicCluster {
  id: string;
  name: string;
  nameHe: string;
  type: "area" | "category" | "theme";
  pillarPage?: {
    id: string;
    title: string;
    slug: string;
  };
  childPages: Array<{
    id: string;
    title: string;
    slug: string;
    type: string;
    linkStrength: number;
  }>;
  stats: {
    totalPages: number;
    missingLinks: number;
    avgScore: number;
  };
}

export const topicClusterBuilder = {
  /**
   * Detect clusters based on Dubai areas
   */
  async detectAreaClusters(): Promise<TopicCluster[]> {
    const clusters: TopicCluster[] = [];

    for (const [areaKey, areaData] of Object.entries(DUBAI_AREAS)) {
      // Find all content mentioning this area
      const areaContent = await db.select({
        id: contents.id,
        title: contents.title,
        slug: contents.slug,
        type: contents.type,
        blocks: contents.blocks,
      })
      .from(contents)
      .where(and(
        eq(contents.status, "published"),
        or(
          like(contents.title, `%${areaData.name}%`),
          sql`${contents.blocks}::text ILIKE ${'%' + areaData.name + '%'}`
        )
      ));

      if (areaContent.length === 0) continue;

      // Find or suggest pillar page
      const pillarPage = areaContent.find(c =>
        c.type === "article" &&
        (c.title.toLowerCase().includes("guide") || c.title.toLowerCase().includes("מדריך"))
      );

      // Calculate link strength (how well connected pages are)
      const childPages = areaContent.map(c => {
        const blocks = (c.blocks as any[]) || [];
        const hasInternalLinks = blocks.some((b: any) =>
          JSON.stringify(b).includes('href="/')
        );
        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          type: c.type,
          linkStrength: hasInternalLinks ? 80 : 30,
        };
      });

      const missingLinks = childPages.filter(p => p.linkStrength < 50).length;

      clusters.push({
        id: areaKey,
        name: areaData.name,
        nameHe: areaData.nameHe,
        type: "area",
        pillarPage: pillarPage ? {
          id: pillarPage.id,
          title: pillarPage.title,
          slug: pillarPage.slug,
        } : undefined,
        childPages,
        stats: {
          totalPages: areaContent.length,
          missingLinks,
          avgScore: Math.round(childPages.reduce((sum, p) => sum + p.linkStrength, 0) / childPages.length),
        },
      });
    }

    return clusters.filter(c => c.childPages.length > 0).sort((a, b) => b.childPages.length - a.childPages.length);
  },

  /**
   * Detect clusters by content type
   */
  async detectCategoryClusters(): Promise<TopicCluster[]> {
    const types = ["hotel", "restaurant", "attraction", "article", "event", "itinerary"];
    const clusters: TopicCluster[] = [];

    for (const type of types) {
      const typeContent = await db.select({
        id: contents.id,
        title: contents.title,
        slug: contents.slug,
        type: contents.type,
      })
      .from(contents)
      .where(and(
        eq(contents.status, "published"),
        eq(contents.type, type as any)
      ));

      if (typeContent.length === 0) continue;

      clusters.push({
        id: `category-${type}`,
        name: type.charAt(0).toUpperCase() + type.slice(1) + "s",
        nameHe: {
          hotel: "מלונות",
          restaurant: "מסעדות",
          attraction: "אטרקציות",
          article: "מאמרים",
          event: "אירועים",
          itinerary: "מסלולים",
        }[type] || type,
        type: "category",
        childPages: typeContent.map(c => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          type: c.type,
          linkStrength: 50,
        })),
        stats: {
          totalPages: typeContent.length,
          missingLinks: 0,
          avgScore: 50,
        },
      });
    }

    return clusters;
  },

  /**
   * Generate pillar page structure for a cluster
   */
  generatePillarPageStructure(cluster: TopicCluster): {
    suggestedTitle: string;
    suggestedSlug: string;
    sections: Array<{ heading: string; linkedPages: string[] }>;
  } {
    const sections: Array<{ heading: string; linkedPages: string[] }> = [];

    // Group by content type
    const byType = cluster.childPages.reduce((acc, page) => {
      if (!acc[page.type]) acc[page.type] = [];
      acc[page.type].push(page.title);
      return acc;
    }, {} as Record<string, string[]>);

    if (byType.hotel) {
      sections.push({ heading: "Where to Stay", linkedPages: byType.hotel.slice(0, 5) });
    }
    if (byType.restaurant) {
      sections.push({ heading: "Where to Eat", linkedPages: byType.restaurant.slice(0, 5) });
    }
    if (byType.attraction) {
      sections.push({ heading: "Things to Do", linkedPages: byType.attraction.slice(0, 5) });
    }
    if (byType.article) {
      sections.push({ heading: "Travel Tips", linkedPages: byType.article.slice(0, 3) });
    }

    return {
      suggestedTitle: `Complete Guide to ${cluster.name} - Everything You Need to Know`,
      suggestedSlug: `${cluster.name.toLowerCase().replace(/\s+/g, "-")}-complete-guide`,
      sections,
    };
  },
};

// ============================================================================
// SERP GAP FINDER
// ============================================================================

interface ContentGap {
  contentId: string;
  title: string;
  gaps: Array<{
    type: "faq" | "section" | "topic" | "keyword";
    description: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  competitorInsights?: string[];
}

export const serpGapFinder = {
  // Common questions/sections that should be in each content type
  requiredElements: {
    hotel: {
      sections: ["location", "rooms", "amenities", "dining", "price", "how to get there"],
      faqs: ["check-in time", "parking", "wifi", "pool", "breakfast", "airport transfer"],
      keywords: ["best time to visit", "booking tips", "nearby attractions"],
    },
    restaurant: {
      sections: ["menu highlights", "ambiance", "location", "hours", "price range", "reservations"],
      faqs: ["dress code", "reservations required", "vegetarian options", "halal", "kids menu"],
      keywords: ["best dishes", "what to order", "parking"],
    },
    attraction: {
      sections: ["what to expect", "tickets", "hours", "how to get there", "tips", "nearby"],
      faqs: ["ticket price", "best time to visit", "how long", "kids friendly", "accessible"],
      keywords: ["skip the line", "best photo spots", "combo tickets"],
    },
    article: {
      sections: ["overview", "key points", "practical tips", "recommendations"],
      faqs: [],
      keywords: [],
    },
  } as Record<string, { sections: string[]; faqs: string[]; keywords: string[] }>,

  /**
   * Analyze content for gaps
   */
  async findGaps(contentId: string): Promise<ContentGap | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    const gaps: ContentGap["gaps"] = [];
    const blocks = (content.blocks as any[]) || [];
    const contentText = JSON.stringify(blocks).toLowerCase();
    const requirements = this.requiredElements[content.type] || this.requiredElements.article;

    // Check for missing sections
    for (const section of requirements.sections) {
      if (!contentText.includes(section)) {
        gaps.push({
          type: "section",
          description: `Missing "${section}" section`,
          suggestion: `Add a section about ${section} to provide complete information`,
          priority: ["price", "hours", "location"].includes(section) ? "high" : "medium",
        });
      }
    }

    // Check for missing FAQs
    for (const faq of requirements.faqs) {
      if (!contentText.includes(faq)) {
        gaps.push({
          type: "faq",
          description: `No mention of "${faq}"`,
          suggestion: `Consider adding FAQ about ${faq}`,
          priority: "medium",
        });
      }
    }

    // Check for missing keywords
    for (const keyword of requirements.keywords) {
      if (!contentText.includes(keyword)) {
        gaps.push({
          type: "keyword",
          description: `Missing keyword: "${keyword}"`,
          suggestion: `Include information about ${keyword}`,
          priority: "low",
        });
      }
    }

    // Check content length
    const wordCount = contentText.split(/\s+/).length;
    if (wordCount < 500) {
      gaps.push({
        type: "section",
        description: "Content is too short",
        suggestion: "Expand content to at least 800-1000 words for better SEO",
        priority: "high",
      });
    }

    // Check for images
    const imageCount = blocks.filter((b: any) => b.type === "image").length;
    if (imageCount < 3) {
      gaps.push({
        type: "section",
        description: "Not enough images",
        suggestion: "Add at least 3-5 relevant images with proper alt text",
        priority: "medium",
      });
    }

    // Check for headings structure
    const hasH2 = blocks.some((b: any) => b.type === "heading" && b.level === 2);
    if (!hasH2) {
      gaps.push({
        type: "section",
        description: "No H2 headings",
        suggestion: "Add H2 headings to structure your content",
        priority: "high",
      });
    }

    return {
      contentId,
      title: content.title,
      gaps: gaps.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }),
    };
  },

  /**
   * Find gaps for all content
   */
  async findAllGaps(): Promise<ContentGap[]> {
    const allContent = await db.select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, "published"));

    const results: ContentGap[] = [];
    for (const content of allContent) {
      const gap = await this.findGaps(content.id);
      if (gap && gap.gaps.length > 0) {
        results.push(gap);
      }
    }

    return results.sort((a, b) => b.gaps.length - a.gaps.length);
  },
};

// ============================================================================
// NEXT BEST ARTICLE RECOMMENDATION
// ============================================================================

interface ArticleRecommendation {
  contentId: string;
  recommendations: Array<{
    id: string;
    title: string;
    slug: string;
    type: string;
    reason: string;
    score: number;
  }>;
}

export const articleRecommendations = {
  /**
   * Get recommendations for a specific content
   */
  async getRecommendations(contentId: string, limit = 3): Promise<ArticleRecommendation | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    const contentText = `${content.title} ${JSON.stringify(content.blocks || [])}`.toLowerCase();

    // Detect area from content
    let detectedArea: string | null = null;
    for (const [areaKey, areaData] of Object.entries(DUBAI_AREAS)) {
      if (areaData.landmarks.some((id: string) => contentText.includes(id.toLowerCase()))) {
        detectedArea = areaKey;
        break;
      }
    }

    // Get all other published content
    const otherContent = await db.select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      type: contents.type,
      blocks: contents.blocks,
    })
    .from(contents)
    .where(and(
      eq(contents.status, "published"),
      ne(contents.id, contentId)
    ));

    // Score each piece of content
    const scored = otherContent.map(other => {
      let score = 0;
      const reasons: string[] = [];
      const otherText = `${other.title} ${JSON.stringify(other.blocks || [])}`.toLowerCase();

      // Same area bonus
      if (detectedArea) {
        const areaData = DUBAI_AREAS[detectedArea as keyof typeof DUBAI_AREAS];
        if (areaData && areaData.landmarks.some((id: string) => otherText.includes(id.toLowerCase()))) {
          score += 40;
          reasons.push(`Same area: ${areaData.name}`);
        }
      }

      // Complementary content type bonus
      const complementary: Record<string, string[]> = {
        hotel: ["restaurant", "attraction", "itinerary"],
        restaurant: ["hotel", "attraction"],
        attraction: ["hotel", "restaurant", "itinerary"],
        article: ["hotel", "restaurant", "attraction"],
        itinerary: ["hotel", "restaurant", "attraction"],
      };
      if (complementary[content.type]?.includes(other.type)) {
        score += 30;
        reasons.push(`Complementary: ${other.type}`);
      }

      // Same type penalty (avoid too similar)
      if (other.type === content.type) {
        score -= 10;
      }

      // Keyword overlap
      const contentWords = new Set(contentText.split(/\s+/).filter(w => w.length > 4));
      const otherWords = new Set(otherText.split(/\s+/).filter(w => w.length > 4));
      const overlap = Array.from(contentWords).filter(w => otherWords.has(w)).length;
      if (overlap > 5) {
        score += Math.min(overlap * 2, 20);
        reasons.push("Related topics");
      }

      return {
        id: other.id,
        title: other.title,
        slug: other.slug,
        type: other.type,
        score,
        reason: reasons.join(", ") || "Related content",
      };
    });

    // Sort by score and return top recommendations
    const recommendations = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      contentId,
      recommendations,
    };
  },

  /**
   * Generate recommendation blocks for all content
   */
  async generateAllRecommendations(): Promise<Map<string, ArticleRecommendation>> {
    const allContent = await db.select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, "published"));

    const results = new Map<string, ArticleRecommendation>();
    for (const content of allContent) {
      const rec = await this.getRecommendations(content.id);
      if (rec) {
        results.set(content.id, rec);
      }
    }

    return results;
  },
};

// ============================================================================
// PRICE/HOURS WATCHLIST
// ============================================================================

interface WatchlistItem {
  contentId: string;
  title: string;
  type: string;
  volatileFields: Array<{
    field: string;
    lastValue?: string;
    lastChecked: Date;
    needsReview: boolean;
  }>;
  priority: "high" | "medium" | "low";
}

export const priceWatchlist = {
  // Fields that change frequently and need monitoring
  volatileFields: {
    hotel: ["price", "rate", "cost", "fee", "من", "עלות"],
    restaurant: ["price", "menu", "hours", "open", "close", "מחיר", "שעות"],
    attraction: ["price", "ticket", "hours", "open", "close", "fee", "כרטיס", "מחיר"],
    event: ["date", "time", "location", "price", "תאריך", "מחיר"],
  } as Record<string, string[]>,

  /**
   * Scan content for volatile information
   */
  async scanForVolatileContent(): Promise<WatchlistItem[]> {
    const watchlist: WatchlistItem[] = [];

    const allContent = await db.select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      blocks: contents.blocks,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(eq(contents.status, "published"));

    for (const content of allContent) {
      const volatileFieldsForType = this.volatileFields[content.type] || [];
      if (volatileFieldsForType.length === 0) continue;

      const contentText = JSON.stringify(content.blocks || []).toLowerCase();
      const foundFields: WatchlistItem["volatileFields"] = [];

      for (const field of volatileFieldsForType) {
        if (contentText.includes(field)) {
          const updatedAt = content.updatedAt ? new Date(content.updatedAt) : new Date();
          const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

          foundFields.push({
            field,
            lastChecked: updatedAt,
            needsReview: daysSinceUpdate > 30, // Needs review if over 30 days
          });
        }
      }

      if (foundFields.length > 0) {
        const needsReviewCount = foundFields.filter(f => f.needsReview).length;
        watchlist.push({
          contentId: content.id,
          title: content.title,
          type: content.type,
          volatileFields: foundFields,
          priority: needsReviewCount > 2 ? "high" : needsReviewCount > 0 ? "medium" : "low",
        });
      }
    }

    return watchlist.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  },

  /**
   * Get items needing immediate attention
   */
  async getUrgentItems(): Promise<WatchlistItem[]> {
    const watchlist = await this.scanForVolatileContent();
    return watchlist.filter(item => item.priority === "high");
  },
};

// ============================================================================
// EVENT CALENDAR SYNC
// ============================================================================

interface EventStatus {
  contentId: string;
  title: string;
  startDate?: Date;
  endDate?: Date;
  status: "upcoming" | "ongoing" | "past" | "unknown";
  needsUpdate: boolean;
  daysUntilStale: number;
}

export const eventCalendarSync = {
  /**
   * Check all events for relevance
   */
  async checkEventRelevance(): Promise<EventStatus[]> {
    const events = await db.select({
      id: contents.id,
      title: contents.title,
      blocks: contents.blocks,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(and(
      eq(contents.type, "event"),
      eq(contents.status, "published")
    ));

    const now = new Date();
    const results: EventStatus[] = [];

    for (const event of events) {
      const contentText = JSON.stringify(event.blocks || []).toLowerCase();

      // Try to extract dates from content
      const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
      const dates: Date[] = [];
      let match;
      while ((match = datePattern.exec(contentText)) !== null) {
        const [, day, month, year] = match;
        const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
        dates.push(new Date(fullYear, parseInt(month) - 1, parseInt(day)));
      }

      let status: EventStatus["status"] = "unknown";
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (dates.length > 0) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        startDate = dates[0];
        endDate = dates[dates.length - 1];

        if (endDate < now) {
          status = "past";
        } else if (startDate <= now && endDate >= now) {
          status = "ongoing";
        } else {
          status = "upcoming";
        }
      }

      const updatedAt = event.updatedAt ? new Date(event.updatedAt) : new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

      results.push({
        contentId: event.id,
        title: event.title,
        startDate,
        endDate,
        status,
        needsUpdate: status === "past" || daysSinceUpdate > 14,
        daysUntilStale: status === "past" ? 0 : 14 - daysSinceUpdate,
      });
    }

    return results.sort((a, b) => {
      const order = { past: 0, unknown: 1, ongoing: 2, upcoming: 3 };
      return order[a.status] - order[b.status];
    });
  },

  /**
   * Get past events that should be archived or updated
   */
  async getPastEvents(): Promise<EventStatus[]> {
    const events = await this.checkEventRelevance();
    return events.filter(e => e.status === "past");
  },
};

// ============================================================================
// IMAGE CONSISTENCY KIT
// ============================================================================

interface ImageConsistencyReport {
  contentId: string;
  title: string;
  issues: Array<{
    type: "aspect_ratio" | "quality" | "style" | "naming" | "alt_text";
    description: string;
    imageUrl?: string;
    suggestion: string;
  }>;
  score: number;
}

export const imageConsistency = {
  // Brand standards
  standards: {
    heroAspectRatio: "16:9",
    contentAspectRatio: "4:3",
    minWidth: 800,
    minHeight: 600,
    formats: ["webp", "jpg", "jpeg", "png"],
    namingPattern: /^[a-z0-9-]+\.(webp|jpg|jpeg|png)$/,
  },

  /**
   * Check image consistency for content
   */
  async checkContent(contentId: string): Promise<ImageConsistencyReport | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    const issues: ImageConsistencyReport["issues"] = [];
    const blocks = (content.blocks as any[]) || [];

    // Check hero image
    if (content.heroImage) {
      // Check naming convention
      const filename = content.heroImage.split("/").pop() || "";
      if (!this.standards.namingPattern.test(filename.toLowerCase())) {
        issues.push({
          type: "naming",
          description: "Hero image doesn't follow naming convention",
          imageUrl: content.heroImage,
          suggestion: "Rename to lowercase with hyphens: my-image-name.webp",
        });
      }

      // Check format
      if (!filename.toLowerCase().endsWith(".webp")) {
        issues.push({
          type: "quality",
          description: "Hero image is not WebP format",
          imageUrl: content.heroImage,
          suggestion: "Convert to WebP for better performance",
        });
      }
    } else {
      issues.push({
        type: "quality",
        description: "No hero image",
        suggestion: "Add a hero image for better visual impact",
      });
    }

    // Check content images
    const imageBlocks = blocks.filter((b: any) => b.type === "image");
    for (const img of imageBlocks) {
      const imgUrl = img.url || img.src || "";
      const imgAlt = img.alt || "";

      // Check alt text
      if (!imgAlt || imgAlt.length < 10) {
        issues.push({
          type: "alt_text",
          description: "Image missing or has poor alt text",
          imageUrl: imgUrl,
          suggestion: "Add descriptive alt text (10+ characters)",
        });
      }

      // Check format
      if (imgUrl && !imgUrl.toLowerCase().includes(".webp")) {
        issues.push({
          type: "quality",
          description: "Content image is not WebP format",
          imageUrl: imgUrl,
          suggestion: "Convert to WebP for better performance",
        });
      }
    }

    // Calculate score
    const maxIssues = 10;
    const score = Math.max(0, 100 - (issues.length / maxIssues) * 100);

    return {
      contentId,
      title: content.title,
      issues,
      score: Math.round(score),
    };
  },

  /**
   * Check all content for image consistency
   */
  async checkAllContent(): Promise<ImageConsistencyReport[]> {
    const allContent = await db.select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, "published"));

    const reports: ImageConsistencyReport[] = [];
    for (const content of allContent) {
      const report = await this.checkContent(content.id);
      if (report) {
        reports.push(report);
      }
    }

    return reports.sort((a, b) => a.score - b.score);
  },
};

// ============================================================================
// AUTO THUMBNAIL CROPS
// ============================================================================

interface ThumbnailCrops {
  original: string;
  crops: {
    og: { width: number; height: number; url?: string };
    twitter: { width: number; height: number; url?: string };
    instagram: { width: number; height: number; url?: string };
    mobile: { width: number; height: number; url?: string };
    listView: { width: number; height: number; url?: string };
  };
}

export const autoThumbnails = {
  // Standard crop sizes
  cropSizes: {
    og: { width: 1200, height: 630, ratio: 1.91 },           // Open Graph
    twitter: { width: 1200, height: 628, ratio: 1.91 },      // Twitter Card
    instagram: { width: 1080, height: 1080, ratio: 1 },      // Instagram Square
    mobile: { width: 375, height: 200, ratio: 1.875 },       // Mobile Hero
    listView: { width: 300, height: 200, ratio: 1.5 },       // List Thumbnail
  },

  /**
   * Generate crop specifications for an image
   */
  getCropSpecs(imageUrl: string): ThumbnailCrops {
    return {
      original: imageUrl,
      crops: {
        og: {
          width: this.cropSizes.og.width,
          height: this.cropSizes.og.height,
          url: `${imageUrl}?w=${this.cropSizes.og.width}&h=${this.cropSizes.og.height}&fit=crop`,
        },
        twitter: {
          width: this.cropSizes.twitter.width,
          height: this.cropSizes.twitter.height,
          url: `${imageUrl}?w=${this.cropSizes.twitter.width}&h=${this.cropSizes.twitter.height}&fit=crop`,
        },
        instagram: {
          width: this.cropSizes.instagram.width,
          height: this.cropSizes.instagram.height,
          url: `${imageUrl}?w=${this.cropSizes.instagram.width}&h=${this.cropSizes.instagram.height}&fit=crop`,
        },
        mobile: {
          width: this.cropSizes.mobile.width,
          height: this.cropSizes.mobile.height,
          url: `${imageUrl}?w=${this.cropSizes.mobile.width}&h=${this.cropSizes.mobile.height}&fit=crop`,
        },
        listView: {
          width: this.cropSizes.listView.width,
          height: this.cropSizes.listView.height,
          url: `${imageUrl}?w=${this.cropSizes.listView.width}&h=${this.cropSizes.listView.height}&fit=crop`,
        },
      },
    };
  },

  /**
   * Get all thumbnails needed for content
   */
  async getContentThumbnails(contentId: string): Promise<ThumbnailCrops | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content || !content.heroImage) return null;

    return this.getCropSpecs(content.heroImage);
  },
};

// ============================================================================
// EDITORIAL TONE GUARD
// ============================================================================

interface ToneAnalysis {
  contentId: string;
  title: string;
  expectedTone: "neutral" | "promotional" | "informative";
  detectedTone: "neutral" | "promotional" | "informative";
  issues: Array<{
    text: string;
    issue: string;
    suggestion: string;
  }>;
  score: number;
  passes: boolean;
}

export const editorialToneGuard = {
  // Words that indicate promotional tone
  promotionalWords: [
    "best", "amazing", "incredible", "must-visit", "can't miss",
    "perfect", "ultimate", "exclusive", "luxurious", "stunning",
    "מדהים", "מושלם", "הכי טוב", "חובה", "יוצא דופן",
  ],

  // Words that indicate neutral/informative tone
  neutralWords: [
    "features", "offers", "provides", "includes", "located",
    "available", "options", "typically", "generally", "may",
    "כולל", "מציע", "ממוקם", "אפשרי", "בדרך כלל",
  ],

  /**
   * Analyze content tone
   */
  async analyzeTone(contentId: string): Promise<ToneAnalysis | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    const blocks = (content.blocks as any[]) || [];
    const contentText = blocks
      .filter((b: any) => b.type === "text" || b.type === "paragraph")
      .map((b: any) => b.content || b.text || "")
      .join(" ")
      .toLowerCase();

    // Determine expected tone based on content type
    const expectedTone: ToneAnalysis["expectedTone"] =
      content.type === "article" ? "neutral" : "informative";

    // Count promotional vs neutral words
    let promotionalCount = 0;
    let neutralCount = 0;
    const issues: ToneAnalysis["issues"] = [];

    for (const word of this.promotionalWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = contentText.match(regex);
      if (matches) {
        promotionalCount += matches.length;
        if (expectedTone === "neutral" && matches.length > 2) {
          issues.push({
            text: word,
            issue: `Word "${word}" appears ${matches.length} times - too promotional`,
            suggestion: `Replace with more neutral language`,
          });
        }
      }
    }

    for (const word of this.neutralWords) {
      if (contentText.includes(word)) {
        neutralCount++;
      }
    }

    // Determine detected tone
    const ratio = promotionalCount / (neutralCount + 1);
    const detectedTone: ToneAnalysis["detectedTone"] =
      ratio > 1.5 ? "promotional" : ratio > 0.5 ? "informative" : "neutral";

    // Calculate score
    const score = expectedTone === detectedTone ? 100 :
                  Math.abs(["neutral", "informative", "promotional"].indexOf(expectedTone) -
                           ["neutral", "informative", "promotional"].indexOf(detectedTone)) === 1 ? 70 : 40;

    return {
      contentId,
      title: content.title,
      expectedTone,
      detectedTone,
      issues: issues.slice(0, 5),
      score,
      passes: score >= 70,
    };
  },

  /**
   * Check all content for tone issues
   */
  async checkAllContent(): Promise<ToneAnalysis[]> {
    const allContent = await db.select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, "published"));

    const results: ToneAnalysis[] = [];
    for (const content of allContent) {
      const analysis = await this.analyzeTone(content.id);
      if (analysis && !analysis.passes) {
        results.push(analysis);
      }
    }

    return results.sort((a, b) => a.score - b.score);
  },
};

// ============================================================================
// A/B TESTING SYSTEM
// ============================================================================

// Local interface matching DB schema
interface ABTestLocal {
  id: string;
  contentId: string;
  testType: "title" | "heroImage" | "metaDescription";
  variants: Array<{
    id: string;
    value: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  status: "running" | "completed" | "paused";
  winner?: string | null;
  startedAt: Date;
  endsAt?: Date | null;
}

// In-memory cache for fast reads (synced with DB)
const abTestsCache: Map<string, ABTestLocal> = new Map();

export const abTesting = {
  /**
   * Create a new A/B test (persisted to DB)
   */
  async createTest(
    contentId: string,
    testType: ABTestLocal["testType"],
    variants: string[]
  ): Promise<ABTestLocal> {
    const variantData = variants.map((value, i) => ({
      id: `var-${i}`,
      value,
      impressions: 0,
      clicks: 0,
      ctr: 0,
    }));

    // Insert into database
    const [dbTest] = await db.insert(abTestsTable).values({
      contentId,
      testType,
      variants: variantData,
      status: "running",
      startedAt: new Date(),
    }).returning();

    const test: ABTestLocal = {
      id: dbTest.id,
      contentId: dbTest.contentId,
      testType: dbTest.testType,
      variants: dbTest.variants || [],
      status: dbTest.status,
      winner: dbTest.winner,
      startedAt: dbTest.startedAt,
      endsAt: dbTest.endsAt,
    };

    // Update cache
    abTestsCache.set(test.id, test);
    return test;
  },

  /**
   * Get test by ID (from cache or DB)
   */
  async getTest(testId: string): Promise<ABTestLocal | null> {
    // Check cache first
    const cached = abTestsCache.get(testId);
    if (cached) return cached;

    // Fallback to database
    const [dbTest] = await db.select().from(abTestsTable).where(eq(abTestsTable.id, testId));
    if (!dbTest) return null;

    const test: ABTestLocal = {
      id: dbTest.id,
      contentId: dbTest.contentId,
      testType: dbTest.testType,
      variants: dbTest.variants || [],
      status: dbTest.status,
      winner: dbTest.winner,
      startedAt: dbTest.startedAt,
      endsAt: dbTest.endsAt,
    };

    abTestsCache.set(testId, test);
    return test;
  },

  /**
   * Get variant for a visitor (random assignment)
   */
  async getVariant(testId: string, visitorId?: string): Promise<{ variantId: string; value: string } | null> {
    const test = await this.getTest(testId);
    if (!test || test.status !== "running") return null;

    // Simple random assignment (in production, would use consistent hashing based on visitorId)
    const randomIndex = Math.floor(Math.random() * test.variants.length);
    const variant = test.variants[randomIndex];

    return { variantId: variant.id, value: variant.value };
  },

  /**
   * Record an impression (persisted to DB)
   */
  async recordImpression(testId: string, variantId: string): Promise<void> {
    const test = await this.getTest(testId);
    if (!test) return;

    const variant = test.variants.find(v => v.id === variantId);
    if (variant) {
      variant.impressions++;
      variant.ctr = variant.impressions > 0 ? variant.clicks / variant.impressions : 0;

      // Update database
      await db.update(abTestsTable)
        .set({ variants: test.variants, updatedAt: new Date() })
        .where(eq(abTestsTable.id, testId));

      // Update cache
      abTestsCache.set(testId, test);
    }
  },

  /**
   * Record a click (persisted to DB)
   */
  async recordClick(testId: string, variantId: string): Promise<void> {
    const test = await this.getTest(testId);
    if (!test) return;

    const variant = test.variants.find(v => v.id === variantId);
    if (variant) {
      variant.clicks++;
      variant.ctr = variant.impressions > 0 ? variant.clicks / variant.impressions : 0;

      // Update database
      await db.update(abTestsTable)
        .set({ variants: test.variants, updatedAt: new Date() })
        .where(eq(abTestsTable.id, testId));

      // Update cache
      abTestsCache.set(testId, test);
    }
  },

  /**
   * Get test results
   */
  async getResults(testId: string): Promise<ABTestLocal | null> {
    return this.getTest(testId);
  },

  /**
   * Determine winner (requires statistical significance)
   */
  async determineWinner(testId: string): Promise<{ winner: string; confidence: number } | null> {
    const test = await this.getTest(testId);
    if (!test) return null;

    // Simple winner determination (in production, would use proper statistics)
    const minImpressions = 100;
    const eligibleVariants = test.variants.filter(v => v.impressions >= minImpressions);

    if (eligibleVariants.length < 2) {
      return null; // Not enough data
    }

    // Sort by CTR
    eligibleVariants.sort((a, b) => b.ctr - a.ctr);
    const winner = eligibleVariants[0];
    const runnerUp = eligibleVariants[1];

    // Simple confidence calculation
    const ctrDiff = winner.ctr - runnerUp.ctr;
    const confidence = Math.min(95, Math.round(ctrDiff * 1000));

    if (confidence >= 90) {
      test.winner = winner.id;
      test.status = "completed";

      // Update database
      await db.update(abTestsTable)
        .set({ winner: winner.id, status: "completed", updatedAt: new Date() })
        .where(eq(abTestsTable.id, testId));

      // Update cache
      abTestsCache.set(testId, test);

      return { winner: winner.value, confidence };
    }

    return null;
  },

  /**
   * Get all running tests from database
   */
  async getRunningTests(): Promise<ABTestLocal[]> {
    const dbTests = await db.select().from(abTestsTable).where(eq(abTestsTable.status, "running"));
    return dbTests.map(t => ({
      id: t.id,
      contentId: t.contentId,
      testType: t.testType,
      variants: t.variants || [],
      status: t.status,
      winner: t.winner,
      startedAt: t.startedAt,
      endsAt: t.endsAt,
    }));
  },

  /**
   * Get all tests for a content from database
   */
  async getTestsForContent(contentId: string): Promise<ABTestLocal[]> {
    const dbTests = await db.select().from(abTestsTable).where(eq(abTestsTable.contentId, contentId));
    return dbTests.map(t => ({
      id: t.id,
      contentId: t.contentId,
      testType: t.testType,
      variants: t.variants || [],
      status: t.status,
      winner: t.winner,
      startedAt: t.startedAt,
      endsAt: t.endsAt,
    }));
  },
};

// ============================================================================
// CONTENT ROI DASHBOARD
// ============================================================================

interface ContentROI {
  contentId: string;
  title: string;
  type: string;
  metrics: {
    pageViews: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
    bounceRate: number;
    scrollDepth: number;
    ctr: number;
    conversions: number;
  };
  costs: {
    creationTime: number; // hours
    translationCost: number;
    imageCost: number;
  };
  roi: number;
  recommendations: string[];
}

export const contentROI = {
  /**
   * Calculate ROI for content (placeholder - would integrate with analytics)
   */
  async calculateROI(contentId: string): Promise<ContentROI | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    // Placeholder metrics (would come from analytics integration)
    const metrics = {
      pageViews: Math.floor(Math.random() * 10000),
      uniqueVisitors: Math.floor(Math.random() * 8000),
      avgTimeOnPage: Math.floor(Math.random() * 300),
      bounceRate: Math.random() * 100,
      scrollDepth: Math.random() * 100,
      ctr: Math.random() * 10,
      conversions: Math.floor(Math.random() * 100),
    };

    // Placeholder costs
    const costs = {
      creationTime: 2, // hours
      translationCost: 50, // USD
      imageCost: 20, // USD
    };

    // Calculate ROI
    const revenuePerConversion = 10; // USD placeholder
    const totalRevenue = metrics.conversions * revenuePerConversion;
    const hourlyRate = 30; // USD
    const totalCost = (costs.creationTime * hourlyRate) + costs.translationCost + costs.imageCost;
    const roi = ((totalRevenue - totalCost) / totalCost) * 100;

    // Generate recommendations
    const recommendations: string[] = [];
    if (metrics.bounceRate > 60) {
      recommendations.push("High bounce rate - improve content intro or page speed");
    }
    if (metrics.avgTimeOnPage < 60) {
      recommendations.push("Low time on page - add more engaging content");
    }
    if (metrics.scrollDepth < 50) {
      recommendations.push("Low scroll depth - restructure content or add visual breaks");
    }
    if (metrics.ctr < 2) {
      recommendations.push("Low CTR - test different titles or meta descriptions");
    }

    return {
      contentId,
      title: content.title,
      type: content.type,
      metrics,
      costs,
      roi: Math.round(roi),
      recommendations,
    };
  },

  /**
   * Get ROI for all content
   */
  async getAllROI(): Promise<ContentROI[]> {
    const allContent = await db.select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, "published"));

    const results: ContentROI[] = [];
    for (const content of allContent) {
      const roi = await this.calculateROI(content.id);
      if (roi) {
        results.push(roi);
      }
    }

    return results.sort((a, b) => b.roi - a.roi);
  },

  /**
   * Get underperforming content
   */
  async getUnderperformers(): Promise<ContentROI[]> {
    const allROI = await this.getAllROI();
    return allROI.filter(r => r.roi < 0);
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const contentIntelligence = {
  clusters: topicClusterBuilder,
  gaps: serpGapFinder,
  recommendations: articleRecommendations,
  priceWatch: priceWatchlist,
  events: eventCalendarSync,
  imageConsistency,
  thumbnails: autoThumbnails,
  toneGuard: editorialToneGuard,
  abTesting,
  roi: contentROI,
};
