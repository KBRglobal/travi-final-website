/**
 * Content Enhancement Module
 *
 * Features:
 * - Reading Level Analyzer (Flesch score)
 * - Call-to-Action Optimizer
 * - Duplicate Content Detector
 * - Related Articles ("Readers also liked")
 */

import { db } from "./db";
import { contents, contentViews, tags, contentTags } from "@shared/schema";
import { eq, desc, and, sql, ne, inArray } from "drizzle-orm";
import { cache } from "./cache";

// ============================================================================
// READING LEVEL ANALYZER (Flesch Score)
// ============================================================================

export interface ReadabilityAnalysis {
  fleschScore: number;
  fleschGrade: string;
  readingLevel: "easy" | "medium" | "hard" | "very_hard";
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  estimatedReadingTime: number; // minutes
  recommendations: string[];
  hebrewAnalysis?: {
    averageWordLength: number;
    longWordPercentage: number;
    sentenceComplexity: number;
  };
}

export const readabilityAnalyzer = {
  /**
   * Count syllables in a word (English)
   */
  countSyllables(word: string): number {
    word = word.toLowerCase().trim();
    if (word.length <= 3) return 1;

    // Remove trailing e
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  },

  /**
   * Detect if text is Hebrew
   */
  isHebrew(text: string): boolean {
    const hebrewPattern = /[\u0590-\u05FF]/;
    const hebrewMatches = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    return hebrewMatches / totalChars > 0.3;
  },

  /**
   * Analyze text for Hebrew readability
   */
  analyzeHebrew(text: string): ReadabilityAnalysis["hebrewAnalysis"] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const longWords = words.filter(w => w.length > 6).length;
    const longWordPercentage = (longWords / words.length) * 100;

    // Sentence complexity based on punctuation and length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceWords = words.length / sentences.length;
    const sentenceComplexity = avgSentenceWords > 20 ? 3 : avgSentenceWords > 12 ? 2 : 1;

    return {
      averageWordLength: avgWordLength,
      longWordPercentage,
      sentenceComplexity,
    };
  },

  /**
   * Calculate Flesch Reading Ease Score
   * 90-100: Very Easy (5th grade)
   * 80-89: Easy (6th grade)
   * 70-79: Fairly Easy (7th grade)
   * 60-69: Standard (8th-9th grade)
   * 50-59: Fairly Difficult (10th-12th grade)
   * 30-49: Difficult (College)
   * 0-29: Very Difficult (College Graduate)
   */
  calculateFleschScore(text: string): ReadabilityAnalysis {
    const recommendations: string[] = [];

    // Clean text
    const cleanText = text
      .replace(/<[^>]*>/g, ' ')  // Remove HTML
      .replace(/\s+/g, ' ')
      .trim();

    // Check for Hebrew
    const isHebrew = this.isHebrew(cleanText);

    // Split into sentences
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length || 1;

    // Split into words
    const words = cleanText.split(/\s+/).filter(w => w.match(/[a-zA-Z\u0590-\u05FF]/));
    const wordCount = words.length || 1;

    // Count paragraphs
    const paragraphs = cleanText.split(/\n\n+/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length || 1;

    // Calculate averages
    const averageSentenceLength = wordCount / sentenceCount;

    let fleschScore: number;
    let hebrewAnalysis: ReadabilityAnalysis["hebrewAnalysis"];

    if (isHebrew) {
      // Hebrew readability approximation
      hebrewAnalysis = this.analyzeHebrew(cleanText);

      // Approximate Flesch for Hebrew based on word/sentence length
      fleschScore = 100 - (hebrewAnalysis!.averageWordLength * 5) -
                   (averageSentenceLength * 1.5) -
                   (hebrewAnalysis!.longWordPercentage * 0.5);
      fleschScore = Math.max(0, Math.min(100, fleschScore));

      if (hebrewAnalysis!.sentenceComplexity >= 3) {
        recommendations.push("קצר את המשפטים לקריאות טובה יותר");
      }
      if (hebrewAnalysis!.longWordPercentage > 30) {
        recommendations.push("השתמש במילים פשוטות יותר");
      }
    } else {
      // English Flesch-Kincaid
      const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
      const averageSyllablesPerWord = totalSyllables / wordCount;

      // Flesch Reading Ease formula
      fleschScore = 206.835 - (1.015 * averageSentenceLength) - (84.6 * averageSyllablesPerWord);
      fleschScore = Math.max(0, Math.min(100, fleschScore));

      if (averageSentenceLength > 20) {
        recommendations.push("Consider shorter sentences (aim for 15-20 words)");
      }
      if (averageSyllablesPerWord > 1.7) {
        recommendations.push("Use simpler words with fewer syllables");
      }
    }

    // Determine grade and level
    let fleschGrade: string;
    let readingLevel: ReadabilityAnalysis["readingLevel"];

    if (fleschScore >= 80) {
      fleschGrade = "Easy";
      readingLevel = "easy";
    } else if (fleschScore >= 60) {
      fleschGrade = "Standard";
      readingLevel = "medium";
    } else if (fleschScore >= 40) {
      fleschGrade = "Difficult";
      readingLevel = "hard";
      recommendations.push("Content may be too complex for general audience");
    } else {
      fleschGrade = "Very Difficult";
      readingLevel = "very_hard";
      recommendations.push("Simplify content significantly for better engagement");
    }

    // Reading time (average 200 words per minute)
    const estimatedReadingTime = Math.ceil(wordCount / 200);

    // Additional recommendations
    if (wordCount < 300) {
      recommendations.push("Content may be too short for SEO (aim for 500+ words)");
    }
    if (paragraphCount < 3) {
      recommendations.push("Break content into more paragraphs for readability");
    }

    return {
      fleschScore: Math.round(fleschScore),
      fleschGrade,
      readingLevel,
      averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
      averageSyllablesPerWord: Math.round((words.reduce((sum, w) => sum + this.countSyllables(w), 0) / wordCount) * 10) / 10,
      wordCount,
      sentenceCount,
      paragraphCount,
      estimatedReadingTime,
      recommendations,
      hebrewAnalysis,
    };
  },

  /**
   * Analyze content by ID
   */
  async analyzeContent(contentId: string): Promise<ReadabilityAnalysis | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    // Extract text from blocks
    const blocks = (content.blocks as any[]) || [];
    const textContent = blocks
      .filter((b: any) => b.type === "text" || b.type === "paragraph" || b.type === "heading")
      .map((b: any) => b.content || b.text || "")
      .join("\n\n");

    const fullText = `${content.title}\n\n${textContent}`;
    return this.calculateFleschScore(fullText);
  },
};

// ============================================================================
// CALL-TO-ACTION OPTIMIZER
// ============================================================================

export interface CtaSuggestion {
  type: "booking" | "newsletter" | "social" | "related" | "download" | "contact";
  text: string;
  textHe: string;
  placement: "hero" | "mid-content" | "end" | "sidebar" | "popup";
  priority: number;
  url?: string;
  style: "button" | "banner" | "inline" | "card";
  color?: string;
}

export const ctaOptimizer = {
  /**
   * Content type to CTA mapping
   */
  ctasByContentType: {
    hotel: [
      { type: "booking", text: "Book Now & Save", textHe: "הזמן עכשיו וחסוך", placement: "hero", priority: 100, style: "button", color: "#e53935" },
      { type: "booking", text: "Check Availability", textHe: "בדוק זמינות", placement: "sidebar", priority: 90, style: "button" },
      { type: "related", text: "Compare Similar Hotels", textHe: "השווה מלונות דומים", placement: "end", priority: 70, style: "card" },
      { type: "newsletter", text: "Get Exclusive Hotel Deals", textHe: "קבל מבצעי מלונות בלעדיים", placement: "end", priority: 60, style: "banner" },
    ],
    attraction: [
      { type: "booking", text: "Get Tickets", textHe: "קנה כרטיסים", placement: "hero", priority: 100, style: "button", color: "#43a047" },
      { type: "booking", text: "Skip the Line Tickets", textHe: "כרטיסים ללא תור", placement: "mid-content", priority: 85, style: "banner" },
      { type: "related", text: "Explore Nearby Attractions", textHe: "גלה אטרקציות בסביבה", placement: "end", priority: 70, style: "card" },
      { type: "social", text: "Share This Experience", textHe: "שתף את החוויה", placement: "end", priority: 50, style: "inline" },
    ],
    dining: [
      { type: "booking", text: "Reserve a Table", textHe: "הזמן שולחן", placement: "hero", priority: 100, style: "button", color: "#ff9800" },
      { type: "related", text: "More Restaurants Nearby", textHe: "עוד מסעדות בסביבה", placement: "end", priority: 75, style: "card" },
      { type: "download", text: "Download Menu", textHe: "הורד תפריט", placement: "sidebar", priority: 60, style: "button" },
    ],
    article: [
      { type: "newsletter", text: "Subscribe for More Tips", textHe: "הירשם לטיפים נוספים", placement: "end", priority: 90, style: "banner" },
      { type: "related", text: "Read More Articles", textHe: "קרא עוד מאמרים", placement: "end", priority: 85, style: "card" },
      { type: "social", text: "Share This Article", textHe: "שתף מאמר זה", placement: "end", priority: 70, style: "inline" },
      { type: "download", text: "Download Travel Guide", textHe: "הורד מדריך טיולים", placement: "mid-content", priority: 60, style: "banner" },
    ],
    itinerary: [
      { type: "download", text: "Download Full Itinerary", textHe: "הורד מסלול מלא", placement: "hero", priority: 100, style: "button", color: "#1976d2" },
      { type: "booking", text: "Book This Tour", textHe: "הזמן סיור זה", placement: "hero", priority: 95, style: "button" },
      { type: "related", text: "See More Itineraries", textHe: "ראה עוד מסלולים", placement: "end", priority: 70, style: "card" },
      { type: "contact", text: "Get Custom Itinerary", textHe: "קבל מסלול מותאם", placement: "end", priority: 65, style: "banner" },
    ],
  } as Record<string, CtaSuggestion[]>,

  /**
   * Generate CTAs for content
   */
  async generateCtas(contentId: string): Promise<CtaSuggestion[]> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return [];

    const contentType = content.type as keyof typeof this.ctasByContentType;
    const baseCtas = this.ctasByContentType[contentType] || this.ctasByContentType.article;

    // Clone and customize CTAs
    const ctas: CtaSuggestion[] = baseCtas.map(cta => ({
      ...cta,
      text: cta.text.replace("{title}", content.title),
      textHe: cta.textHe.replace("{title}", content.title),
    }));

    // Add context-specific CTAs
    const contentText = JSON.stringify(content.blocks || []).toLowerCase();

    // Luxury content gets premium CTAs
    if (contentText.includes("luxury") || contentText.includes("premium") || contentText.includes("5-star")) {
      ctas.push({
        type: "contact",
        text: "Request VIP Concierge",
        textHe: "בקש שירות קונסיירז' VIP",
        placement: "sidebar",
        priority: 80,
        style: "button",
        color: "#9c27b0",
      });
    }

    // Family content
    if (contentText.includes("family") || contentText.includes("kids") || contentText.includes("children")) {
      ctas.push({
        type: "download",
        text: "Family Travel Checklist",
        textHe: "רשימת בדיקה למשפחות",
        placement: "end",
        priority: 65,
        style: "banner",
      });
    }

    // Sort by priority
    return ctas.sort((a, b) => b.priority - a.priority);
  },

  /**
   * Get best CTA for a specific placement
   */
  async getBestCtaForPlacement(
    contentId: string,
    placement: CtaSuggestion["placement"]
  ): Promise<CtaSuggestion | null> {
    const ctas = await this.generateCtas(contentId);
    return ctas.find(c => c.placement === placement) || null;
  },
};

// ============================================================================
// DUPLICATE CONTENT DETECTOR
// ============================================================================

export interface DuplicateResult {
  contentId: string;
  title: string;
  similarityScore: number; // 0-100
  matchedPhrases: string[];
  type: "exact" | "near" | "similar";
}

export const duplicateDetector = {
  /**
   * Generate n-grams from text
   */
  generateNgrams(text: string, n: number = 3): Set<string> {
    const words = text.toLowerCase()
      .replace(/[^\w\s\u0590-\u05FF]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const ngrams = new Set<string>();
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.add(words.slice(i, i + n).join(' '));
    }
    return ngrams;
  },

  /**
   * Calculate Jaccard similarity between two sets
   */
  jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
  },

  /**
   * Find duplicate or similar content
   */
  async findDuplicates(
    contentId: string,
    threshold: number = 30
  ): Promise<DuplicateResult[]> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return [];

    // Get text from content
    const blocks = (content.blocks as any[]) || [];
    const contentText = `${content.title} ${blocks
      .filter((b: any) => b.type === "text" || b.type === "paragraph")
      .map((b: any) => b.content || b.text || "")
      .join(" ")}`;

    const contentNgrams = this.generateNgrams(contentText);

    // Get all other published content
    const allContent = await db.select({
      id: contents.id,
      title: contents.title,
      blocks: contents.blocks,
    })
    .from(contents)
    .where(and(
      eq(contents.status, "published"),
      ne(contents.id, contentId)
    ));

    const duplicates: DuplicateResult[] = [];

    for (const other of allContent) {
      const otherBlocks = (other.blocks as any[]) || [];
      const otherText = `${other.title} ${otherBlocks
        .filter((b: any) => b.type === "text" || b.type === "paragraph")
        .map((b: any) => b.content || b.text || "")
        .join(" ")}`;

      const otherNgrams = this.generateNgrams(otherText);
      const similarity = this.jaccardSimilarity(contentNgrams, otherNgrams);

      if (similarity >= threshold) {
        // Find matched phrases
        const matchedPhrases = [...contentNgrams].filter(ng => otherNgrams.has(ng)).slice(0, 10);

        let type: DuplicateResult["type"];
        if (similarity >= 90) type = "exact";
        else if (similarity >= 60) type = "near";
        else type = "similar";

        duplicates.push({
          contentId: other.id,
          title: other.title,
          similarityScore: Math.round(similarity),
          matchedPhrases,
          type,
        });
      }
    }

    // Sort by similarity
    return duplicates.sort((a, b) => b.similarityScore - a.similarityScore);
  },

  /**
   * Scan all content for duplicates
   */
  async scanAllForDuplicates(): Promise<{
    total: number;
    groups: Array<{
      contents: Array<{ id: string; title: string }>;
      similarity: number;
    }>;
  }> {
    const allContent = await db.select({
      id: contents.id,
      title: contents.title,
      blocks: contents.blocks,
    })
    .from(contents)
    .where(eq(contents.status, "published"));

    const duplicateGroups: Map<string, Set<string>> = new Map();
    const processedPairs = new Set<string>();

    for (let i = 0; i < allContent.length; i++) {
      const content = allContent[i];
      const duplicates = await this.findDuplicates(content.id, 60);

      for (const dup of duplicates) {
        const pairKey = [content.id, dup.contentId].sort().join('-');
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);

          // Find or create group
          let found = false;
          for (const [key, group] of duplicateGroups) {
            if (group.has(content.id) || group.has(dup.contentId)) {
              group.add(content.id);
              group.add(dup.contentId);
              found = true;
              break;
            }
          }

          if (!found) {
            const newGroup = new Set([content.id, dup.contentId]);
            duplicateGroups.set(content.id, newGroup);
          }
        }
      }
    }

    // Convert to array format
    const groups = [...duplicateGroups.values()].map(group => {
      const contentIds = [...group];
      return {
        contents: contentIds.map(id => ({
          id,
          title: allContent.find(c => c.id === id)?.title || "Unknown",
        })),
        similarity: 0, // Would need to recalculate
      };
    });

    return {
      total: groups.reduce((sum, g) => sum + g.contents.length, 0),
      groups,
    };
  },
};

// ============================================================================
// RELATED ARTICLES ("Readers Also Liked")
// ============================================================================

export interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  type: string;
  heroImage: string | null;
  excerpt: string;
  relevanceScore: number;
  reasons: string[];
}

export const relatedContent = {
  /**
   * Find related content for an article
   */
  async findRelated(
    contentId: string,
    limit: number = 5
  ): Promise<RelatedArticle[]> {
    const cacheKey = `related:${contentId}`;

    // Check cache
    const cached = await cache.get<RelatedArticle[]>(cacheKey);
    if (cached) return cached;

    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return [];

    // Get content tags
    const contentTagIds = await db.select({ tagId: contentTags.tagId })
      .from(contentTags)
      .where(eq(contentTags.contentId, contentId));

    const tagIds = contentTagIds.map(t => t.tagId);

    // Find other content with same tags
    let relatedByTags: Array<{ id: string; title: string; slug: string; type: string; heroImage: string | null; metaDescription: string | null; tagCount: number }> = [];

    if (tagIds.length > 0) {
      const taggedContent = await db.select({
        id: contents.id,
        title: contents.title,
        slug: contents.slug,
        type: contents.type,
        heroImage: contents.heroImage,
        metaDescription: contents.metaDescription,
        tagId: contentTags.tagId,
      })
      .from(contents)
      .innerJoin(contentTags, eq(contents.id, contentTags.contentId))
      .where(and(
        eq(contents.status, "published"),
        ne(contents.id, contentId),
        inArray(contentTags.tagId, tagIds)
      ));

      // Group by content and count matching tags
      const tagCounts = new Map<string, typeof taggedContent[0] & { tagCount: number }>();
      for (const tc of taggedContent) {
        const existing = tagCounts.get(tc.id);
        if (existing) {
          existing.tagCount++;
        } else {
          tagCounts.set(tc.id, { ...tc, tagCount: 1 });
        }
      }
      relatedByTags = [...tagCounts.values()];
    }

    // Get content text for similarity
    const blocks = (content.blocks as any[]) || [];
    const contentText = `${content.title} ${blocks
      .map((b: any) => b.content || b.text || "")
      .join(" ")}`.toLowerCase();

    // Get recently published content of same type
    const sameTypeContent = await db.select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      type: contents.type,
      heroImage: contents.heroImage,
      metaDescription: contents.metaDescription,
      blocks: contents.blocks,
    })
    .from(contents)
    .where(and(
      eq(contents.status, "published"),
      ne(contents.id, contentId),
      eq(contents.type, content.type)
    ))
    .orderBy(desc(contents.publishedAt))
    .limit(20);

    // Score all candidates
    const candidates = new Map<string, RelatedArticle>();

    // Score by tags
    for (const related of relatedByTags) {
      const score = related.tagCount * 20;
      candidates.set(related.id, {
        id: related.id,
        title: related.title,
        slug: related.slug,
        type: related.type,
        heroImage: related.heroImage,
        excerpt: related.metaDescription || "",
        relevanceScore: score,
        reasons: [`${related.tagCount} shared tags`],
      });
    }

    // Score by text similarity and type
    for (const related of sameTypeContent) {
      const relatedBlocks = (related.blocks as any[]) || [];
      const relatedText = `${related.title} ${relatedBlocks
        .map((b: any) => b.content || b.text || "")
        .join(" ")}`.toLowerCase();

      // Simple keyword overlap
      const contentWords = new Set(contentText.split(/\s+/).filter(w => w.length > 4));
      const relatedWords = new Set(relatedText.split(/\s+/).filter(w => w.length > 4));
      const overlap = [...contentWords].filter(w => relatedWords.has(w)).length;

      const existing = candidates.get(related.id);
      if (existing) {
        existing.relevanceScore += overlap;
        if (overlap > 10) existing.reasons.push("Similar content");
      } else {
        candidates.set(related.id, {
          id: related.id,
          title: related.title,
          slug: related.slug,
          type: related.type,
          heroImage: related.heroImage,
          excerpt: related.metaDescription || "",
          relevanceScore: overlap + 10, // Base score for same type
          reasons: ["Same category"],
        });
      }
    }

    // Sort and limit
    const result = [...candidates.values()]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // Cache for 1 hour
    await cache.set(cacheKey, result, 3600);

    return result;
  },

  /**
   * Generate "You might also like" section HTML
   */
  async generateRelatedSection(
    contentId: string,
    locale: string = "en"
  ): Promise<{
    title: string;
    articles: RelatedArticle[];
  }> {
    const related = await this.findRelated(contentId, 4);

    return {
      title: locale === "he" ? "קוראים אהבו גם" : "Readers Also Liked",
      articles: related,
    };
  },

  /**
   * Track content view for future recommendations
   */
  async trackView(contentId: string, userId?: string, sessionId?: string): Promise<void> {
    await db.insert(contentViews).values({
      contentId,
      viewedAt: new Date(),
    });
  },
};

// ============================================================================
// CONTENT FLOW (Article leads to article)
// ============================================================================

export const contentFlow = {
  /**
   * Get next suggested content based on reading flow
   */
  async getNextContent(
    contentId: string,
    viewedContentIds: string[] = []
  ): Promise<RelatedArticle[]> {
    // Get related content excluding already viewed
    const related = await relatedContent.findRelated(contentId, 10);

    return related
      .filter(r => !viewedContentIds.includes(r.id))
      .slice(0, 3);
  },

  /**
   * Generate "Continue Reading" links for end of article
   */
  async getContinueReading(contentId: string): Promise<{
    primary: RelatedArticle | null;
    secondary: RelatedArticle[];
  }> {
    const related = await relatedContent.findRelated(contentId, 4);

    return {
      primary: related[0] || null,
      secondary: related.slice(1),
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const contentEnhancement = {
  readability: readabilityAnalyzer,
  cta: ctaOptimizer,
  duplicates: duplicateDetector,
  related: relatedContent,
  flow: contentFlow,
};
