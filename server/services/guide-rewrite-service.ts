/**
 * Guide Rewrite Service v2
 * AI-powered rewriting of Wikivoyage guides with full SEO/AEO optimization
 * Outputs structured JSON with meta tags, schemas, images, and FAQs
 */

import { db } from "../db";
import { update9987Guides } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const guideLogger = createLogger("guide-rewrite");
const log = (message: string) => guideLogger.info(message);

// Model configuration
const MODELS = {
  primary: "deepseek/deepseek-chat",
  fallback: "google/gemini-flash-1.5",
  premium: "anthropic/claude-3.5-sonnet",
};

const MODEL_COSTS_PER_1M = {
  "deepseek/deepseek-chat": { input: 0.14, output: 0.28 },
  "google/gemini-flash-1.5": { input: 0.075, output: 0.3 },
  "anthropic/claude-3.5-haiku": { input: 0.8, output: 4 },
  "anthropic/claude-3.5-sonnet": { input: 3, output: 15 },
};

// Target destinations (17 total - our official destination list)
const TARGET_DESTINATIONS = [
  // Middle East (3)
  "Dubai",
  "Abu Dhabi",
  "Ras Al Khaimah",
  // Europe (6)
  "Amsterdam",
  "Barcelona",
  "Istanbul",
  "London",
  "Paris",
  "Rome",
  // Asia (4)
  "Bangkok",
  "Hong Kong",
  "Singapore",
  "Tokyo",
  // Americas (4)
  "Las Vegas",
  "Los Angeles",
  "Miami",
  "New York",
];

// Content sections to generate
const CONTENT_SECTIONS = [
  "understand",
  "get_in",
  "get_around",
  "see",
  "do",
  "learn",
  "buy",
  "eat",
  "drink",
  "sleep",
];

// TRAVI brand voice
const TRAVI_VOICE = `
TRAVI Voice Guidelines:
- Conversational and warm, like a knowledgeable friend sharing insider tips
- Direct address using "you" and "your"
- Confident recommendations without being pushy
- Balance of practical info and inspirational storytelling
- Clean, modern language - no dated phrases or clichés
- Active voice preferred
- Short paragraphs for mobile readability
- Include sensory details (sights, sounds, flavors)
- Local perspective - mention what locals love
- NO emojis, NO excessive exclamation marks
- NO generic travel phrases like "hidden gem" or "must-see"
`;

// COMPREHENSIVE REWRITE SYSTEM PROMPT - Forces full content preservation
const COMPREHENSIVE_REWRITE_SYSTEM = `You are a professional travel content rewriter for TRAVI World. Your task is to COMPREHENSIVELY REPHRASE travel guide content to create original text while PRESERVING ALL INFORMATION.

CRITICAL RULES:
1. PRESERVE EVERY FACT: Keep ALL names, addresses, phone numbers, prices, hours, distances, transport options, and specific details from the source
2. KEEP FULL LENGTH: Your output MUST be AT LEAST as long as the input. If input is 2000 words, output must be 2000+ words
3. KEEP ALL ITEMS: If source lists 15 restaurants, you list 15 restaurants. If source mentions 8 neighborhoods, you mention 8 neighborhoods
4. REPHRASE, DON'T SUMMARIZE: Change the wording, sentence structure, and phrasing - but NEVER cut information
5. MAINTAIN STRUCTURE: Keep the same organizational structure with sections, subsections, and lists
6. OUTPUT FORMAT: Write in clean HTML with <h3>, <h4>, <p>, <ul>, <li> tags for structure

WHAT TO CHANGE (Rephrase):
- Sentence structure and word choice
- Paragraph arrangement 
- Descriptive language and tone
- Writing style to match TRAVI voice

WHAT TO KEEP (Preserve exactly):
- ALL specific names (restaurants, hotels, attractions, streets)
- ALL practical details (prices, hours, addresses, phone numbers)
- ALL transport information
- ALL tips and recommendations
- Number of items in lists (if source has 20 attractions, output 20)

TRAVI VOICE:
- Conversational, like a knowledgeable friend
- Use "you" and "your" directly
- Active voice, short paragraphs
- Sensory details (sights, sounds, flavors)
- NO emojis, NO clichés like "hidden gem" or "must-see"
`;

// Section-specific enhancement instructions
const SECTION_ENHANCEMENTS: Record<string, string> = {
  understand:
    "Focus on cultural context, history, and what makes this destination unique. Keep all historical facts and geographical details.",
  see: "For EACH attraction mentioned, preserve: name, location, highlights, visiting hours, entry fees, and tips. Do not drop any attractions from the list.",
  do: "For EACH activity, preserve: name, location, pricing, seasonal availability, and practical booking info. Keep all activities mentioned.",
  eat: "For EACH restaurant/food option, preserve: name, cuisine type, signature dishes, price range, location, hours. Keep all dining options.",
  sleep:
    "For EACH accommodation, preserve: name, category, price range, location, key features, booking tips. Keep all hotels/hostels mentioned.",
  drink:
    "For EACH bar/cafe, preserve: name, vibe, signature drinks, location, hours. Keep all venues mentioned.",
  buy: "For EACH shopping area/market, preserve: name, specialty items, pricing guidance, location, bargaining customs. Keep all shopping options.",
  get_in:
    "Preserve ALL transport options (airports, trains, buses, ferries) with routes, prices, journey times, and booking info.",
  get_around:
    "Preserve ALL local transport options (metro, bus, taxi, bike) with fares, passes, tips, and route information.",
  learn: "Keep all language phrases, cultural customs, etiquette rules, and local tips mentioned.",
  stay_safe: "Keep all safety information, emergency numbers, health tips, and local warnings.",
  default: "Preserve all factual information while improving the writing style and flow.",
};

// Helper function to strip HTML (used by fact extraction and parsing)
function stripHtmlContent(html: string): string {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

// TypeScript interfaces
export interface GuideImage {
  id: string;
  url: string;
  altText: string;
  credit: string;
  section: string;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideSection {
  id: string;
  type: string;
  heading: string;
  content: string;
  subsections?: Array<{ heading: string; content: string }>;
}

// Fact extraction types
interface FactItem {
  id: string;
  category: "place" | "transport" | "price" | "schedule" | "tip" | "warning" | "stat" | "contact";
  sourceText: string;
  normalizedKey: string; // lowercase, sanitized for matching
  quantifiers?: string; // e.g. "15 restaurants", "8 neighborhoods"
}

interface FactExtractionResult {
  facts: FactItem[];
  counts: Record<string, number>; // e.g. { restaurants: 15, neighborhoods: 8 }
}

export interface GuideSeoData {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  urlSlug: string;
}

export interface GuideSchemaMarkup {
  travelGuide: object;
  faqPage: object;
  breadcrumbList: object;
  touristDestination: object;
}

export interface GuideOgTags {
  title: string;
  description: string;
  url: string;
  type: string;
  image: string;
  siteName: string;
}

export interface StructuredGuide {
  id: number;
  title: string;
  slug: string;
  destination: string;
  countryCode: string;
  seo: GuideSeoData;
  sections: GuideSection[];
  faqs: GuideFaq[];
  images: GuideImage[];
  schemaMarkup: GuideSchemaMarkup;
  ogTags: GuideOgTags;
  bestTimeToVisit: {
    summary: string;
    months: Array<{ month: string; rating: string; notes: string }>;
  };
  districts: Array<{ name: string; description: string }>;
  quickFacts: Record<string, string>;
}

export interface RewriteResult {
  success: boolean;
  guide?: StructuredGuide;
  model?: string;
  cost?: number;
  error?: string;
}

export class GuideRewriteService {
  private readonly openrouterKey: string;
  private readonly unsplashKey: string;
  private totalCost = 0;

  constructor() {
    this.openrouterKey = process.env.OPENROUTER_NEVO_KEY || "";
    this.unsplashKey = process.env.UNSPLASH_ACCESS_KEY || "";
    if (!this.openrouterKey) {
      log("[GuideRewrite] Warning: OPENROUTER_NEVO_KEY not set");
    }
  }

  /**
   * Rewrite a single guide by slug with full SEO/AEO optimization
   */
  async rewriteGuide(slug: string): Promise<RewriteResult> {
    log(`[GuideRewrite] Starting enhanced rewrite for: ${slug}`);
    this.totalCost = 0;

    try {
      const [guide] = await db
        .select()
        .from(update9987Guides)
        .where(eq(update9987Guides.slug, slug))
        .limit(1);

      if (!guide) {
        return { success: false, error: `Guide not found: ${slug}` };
      }

      if (!guide.originalContent) {
        return { success: false, error: `No original content for: ${slug}` };
      }

      const destinationName = guide.title || slug.replaceAll("-", " ");
      const year = new Date().getFullYear();

      // Step 1: Parse and rewrite all sections
      const parsedSections = this.parseContentSections(guide.originalContent);
      const rewrittenSections: GuideSection[] = [];

      for (const section of parsedSections) {
        const rewritten = await this.rewriteSection(destinationName, section);
        if (rewritten) {
          rewrittenSections.push(rewritten);
        }
        await this.sleep(300);
      }

      // Step 2: Generate SEO metadata
      const seoData = await this.generateSeoMetadata(destinationName, year, rewrittenSections);

      // Step 3: Generate FAQs
      const faqs = await this.generateFaqs(destinationName, rewrittenSections);

      // Step 4: Get Unsplash images
      const images = await this.fetchUnsplashImages(destinationName, rewrittenSections);

      // Step 5: Generate Best Time to Visit
      const bestTimeToVisit = await this.generateBestTimeToVisit(
        destinationName,
        guide.originalContent
      );

      // Step 6: Extract districts/neighborhoods
      const districts = await this.extractDistricts(destinationName, guide.originalContent);

      // Step 7: Generate Schema.org markup
      const schemaMarkup = this.generateSchemaMarkup(destinationName, seoData, faqs, images);

      // Step 8: Generate Open Graph tags
      const ogTags = this.generateOgTags(destinationName, seoData, images);

      // Step 9: Generate quick facts
      const quickFacts = await this.generateQuickFacts(destinationName, guide.originalContent);

      const structuredGuide: StructuredGuide = {
        id: guide.id,
        title: `${destinationName} Travel Guide ${year}`,
        slug: seoData.urlSlug,
        destination: destinationName,
        countryCode: guide.countryCode || "",
        seo: seoData,
        sections: rewrittenSections,
        faqs,
        images,
        schemaMarkup,
        ogTags,
        bestTimeToVisit,
        districts,
        quickFacts,
      };

      // Save to database
      await db
        .update(update9987Guides)
        .set({
          rewrittenContent: JSON.stringify(structuredGuide),
          rewriteModel: "octypo-v2",
          rewriteCost: this.totalCost.toFixed(6),
          sections: rewrittenSections,
          metaTitle: seoData.metaTitle,
          metaDescription: seoData.metaDescription,
          focusKeyword: seoData.focusKeyword,
          secondaryKeywords: seoData.secondaryKeywords,
          schemaMarkup: schemaMarkup,
          ogTags: ogTags,
          images: images,
          faqs: faqs,
          status: "published", // NEW: Keep as published so guides appear on /guides page
          updatedAt: new Date(),
        } as any)
        .where(eq(update9987Guides.id, guide.id));

      log(`[GuideRewrite] Completed ${slug} - cost: $${this.totalCost.toFixed(4)}`);

      return {
        success: true,
        guide: structuredGuide,
        model: "octypo-v2",
        cost: this.totalCost,
      };
    } catch (error) {
      log(`[GuideRewrite] Error rewriting ${slug}: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Rewrite all 19 target destinations
   */
  async rewriteAllDestinations(): Promise<{
    results: Array<{ slug: string; success: boolean; cost?: number; error?: string }>;
  }> {
    const results: Array<{ slug: string; success: boolean; cost?: number; error?: string }> = [];

    // Get all guides - match by title containing destination name
    const allGuides = await db.select().from(update9987Guides);

    // Filter to guides that match our target destinations
    const guides = allGuides.filter(guide =>
      TARGET_DESTINATIONS.some(dest => guide.title?.toLowerCase().includes(dest.toLowerCase()))
    );

    // NEW: Filter out guides that already have rewrites
    const guidesToRewrite = guides.filter(guide => !guide.rewrittenContent);

    log(
      `[GuideRewrite] Found ${guidesToRewrite.length} guides to rewrite (${guides.length - guidesToRewrite.length} already done, from ${allGuides.length} total)`
    );

    for (const guide of guidesToRewrite) {
      const result = await this.rewriteGuide(guide.slug);
      results.push({
        slug: guide.slug,
        success: result.success,
        cost: result.cost,
        error: result.error,
      });

      // Rate limit between guides
      await this.sleep(1000);
    }

    return { results };
  }

  /**
   * Force rewrite ALL guides (clears existing rewrites first)
   * Use this when prompt/quality has been improved
   */
  async forceRewriteAllDestinations(): Promise<{
    results: Array<{ slug: string; success: boolean; cost?: number; error?: string }>;
  }> {
    const results: Array<{ slug: string; success: boolean; cost?: number; error?: string }> = [];

    // Get all guides - match by title containing destination name
    const allGuides = await db.select().from(update9987Guides);

    // Filter to guides that match our target destinations
    const guides = allGuides.filter(guide =>
      TARGET_DESTINATIONS.some(dest => guide.title?.toLowerCase().includes(dest.toLowerCase()))
    );

    log(
      `[GuideRewrite] FORCE REWRITE: Clearing ${guides.length} existing rewrites and starting fresh...`
    );

    // Clear all existing rewrites first
    for (const guide of guides) {
      await db
        .update(update9987Guides)
        .set({
          rewrittenContent: null,
          rewriteCost: null,
          sections: null,
        } as any)
        .where(eq(update9987Guides.id, guide.id));
    }

    log(`[GuideRewrite] Cleared all rewrites. Starting comprehensive rewrite process...`);

    for (const guide of guides) {
      const result = await this.rewriteGuide(guide.slug);
      results.push({
        slug: guide.slug,
        success: result.success,
        cost: result.cost,
        error: result.error,
      });

      // Rate limit between guides
      await this.sleep(1500);
    }

    return { results };
  }

  /**
   * Parse content into sections
   * Handles wiki markup (== Heading ==), HTML with "Edit section:" markers, and plaintext
   */
  private parseContentSections(
    content: string
  ): Array<{ heading: string; content: string; type: string }> {
    const sections: Array<{ heading: string; content: string; type: string }> = [];

    // Known main section headings for travel guides
    const mainSections = [
      "Understand",
      "Get in",
      "Get around",
      "See",
      "Do",
      "Learn",
      "Work",
      "Buy",
      "Eat",
      "Drink",
      "Sleep",
      "Stay safe",
      "Stay healthy",
      "Respect",
      "Connect",
      "Cope",
      "Go next",
      "Districts",
      "Regions",
    ];

    // First try wiki markup format (== Heading ==)
    const wikiHeadingRegex = /^==\s*([^=]+)\s*==/gm;
    const wikiMatches = [...content.matchAll(wikiHeadingRegex)];

    if (wikiMatches.length > 0) {
      for (let i = 0; i < wikiMatches.length; i++) {
        const match = wikiMatches[i];
        const heading = match[1].trim();
        const startIndex = match.index! + match[0].length;
        const endIndex = i < wikiMatches.length - 1 ? wikiMatches[i + 1].index! : content.length;

        const sectionContent = content.slice(startIndex, endIndex).trim();
        const sectionType = this.detectSectionType(heading);

        if (sectionContent.length > 50) {
          sections.push({
            heading,
            content: sectionContent.slice(0, 15000), // Increased for comprehensive content
            type: sectionType,
          });
        }
      }
      return sections;
    }

    // HTML format - look for "Edit section: SECTION_NAME" patterns from Wikivoyage
    const htmlSectionRegex = /Edit section:\s*([^"<>]+)/gi;
    const htmlMatches = [...content.matchAll(htmlSectionRegex)];

    if (htmlMatches.length > 0) {
      // Filter to main sections only
      const mainMatches = htmlMatches.filter(m =>
        mainSections.some(s => s.toLowerCase() === m[1].trim().toLowerCase())
      );

      if (mainMatches.length > 0) {
        // Strip HTML tags from content for cleaner text
        const stripHtml = (html: string) =>
          html
            .replace(/<script[^>]*>.*?<\/script>/gis, "")
            .replace(/<style[^>]*>.*?<\/style>/gis, "")
            .replace(/<[^>]+>/g, " ")
            .replaceAll("&nbsp;", " ")
            .replaceAll("&amp;", "&")
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">")
            .replaceAll("&quot;", '"')
            .replaceAll("&#39;", "'")
            .replace(/\s+/g, " ")
            .trim();

        for (let i = 0; i < mainMatches.length; i++) {
          const match = mainMatches[i];
          const heading = match[1].trim();
          const startIndex = match.index! + match[0].length;
          const endIndex = i < mainMatches.length - 1 ? mainMatches[i + 1].index! : content.length;

          const sectionContent = stripHtml(content.slice(startIndex, endIndex));
          const sectionType = this.detectSectionType(heading);

          if (sectionContent.length > 100) {
            sections.push({
              heading,
              content: sectionContent.slice(0, 15000), // Comprehensive content
              type: sectionType,
            });
          }
        }

        if (sections.length > 0) {
          return sections;
        }
      }
    }

    // Plaintext format - sections appear as standalone lines
    const headingPattern = mainSections
      .map(h => h.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
      .join("|");
    const plaintextHeadingRegex = new RegExp(
      String.raw`^\s*(` + headingPattern + String.raw`)\s*[:.]?\s*$`,
      "gmi"
    );

    const lines = content.split("\n");
    let currentHeading = "Overview";
    let currentContent: string[] = [];
    let foundHeadings = false;

    for (const line of lines) {
      const headingMatch = plaintextHeadingRegex.exec(line);

      if (headingMatch) {
        foundHeadings = true;
        if (currentContent.length > 0) {
          const sectionText = currentContent.join("\n").trim();
          if (sectionText.length > 50) {
            sections.push({
              heading: currentHeading,
              content: sectionText.slice(0, 15000), // Comprehensive content
              type: this.detectSectionType(currentHeading),
            });
          }
        }
        currentHeading = headingMatch[1].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      const sectionText = currentContent.join("\n").trim();
      if (sectionText.length > 50) {
        sections.push({
          heading: currentHeading,
          content: sectionText.slice(0, 15000), // Comprehensive content
          type: this.detectSectionType(currentHeading),
        });
      }
    }

    if (sections.length === 0 || (!foundHeadings && sections.length === 1)) {
      return [
        {
          heading: "Overview",
          content: content.slice(0, 20000), // Full Overview
          type: "understand",
        },
      ];
    }

    return sections;
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return stripHtmlContent(html);
  }

  /**
   * Extract facts from a section for validation
   */
  private async extractSectionFacts(
    sectionHeading: string,
    content: string
  ): Promise<FactExtractionResult> {
    const cleanContent = this.stripHtml(content);

    const prompt = `Extract ALL facts from this travel guide section. Return JSON ONLY.

CONTENT:
${cleanContent}

OUTPUT FORMAT (JSON only, no markdown):
{
  "facts": [
    {"id": "f1", "category": "place", "sourceText": "Burj Khalifa", "normalizedKey": "burj khalifa"},
    {"id": "f2", "category": "price", "sourceText": "$50 entry fee", "normalizedKey": "50 entry fee"},
    {"id": "f3", "category": "schedule", "sourceText": "open 9am-10pm", "normalizedKey": "open 9am-10pm"}
  ],
  "counts": {"restaurants": 5, "attractions": 3, "hotels": 2}
}

Categories: place, transport, price, schedule, tip, warning, stat, contact
Extract EVERY proper noun, price, time, address, phone number, and specific detail.`;

    try {
      const response = await this.callModel(MODELS.primary, prompt);
      if (response) {
        this.totalCost += this.calculateCost(MODELS.primary, prompt, response);
        const jsonMatch = /\{[\s\S]*\}/.exec(response);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as FactExtractionResult;
        }
      }
    } catch (error) {
      log(`[FactExtraction] Failed for ${sectionHeading}: ${error}`);
    }

    return { facts: [], counts: {} };
  }

  /**
   * Validate that output contains all extracted facts
   */
  private validateFactCoverage(
    output: string,
    facts: FactItem[]
  ): { ratio: number; missingFacts: FactItem[] } {
    const outputLower = output.toLowerCase();
    const missing: FactItem[] = [];

    for (const fact of facts) {
      // Guard against missing normalizedKey - derive from sourceText as fallback
      const key = (fact.normalizedKey || fact.sourceText || "").toLowerCase();
      if (!key) continue;

      const words = key.split(/\s+/).filter(w => w.length > 2);
      if (words.length === 0) continue;

      const foundWords = words.filter(w => outputLower.includes(w));
      if (foundWords.length / words.length < 0.7) {
        missing.push(fact);
      }
    }

    const coverage = facts.length > 0 ? (facts.length - missing.length) / facts.length : 1;
    return { ratio: coverage, missingFacts: missing };
  }

  /**
   * Detect section type from heading
   */
  private detectSectionType(heading: string): string {
    const h = heading.toLowerCase();
    if (h.includes("understand") || h.includes("overview") || h.includes("about"))
      return "understand";
    if (h.includes("see")) return "see";
    if (h.includes("do") || h.includes("activities")) return "do";
    if (h.includes("eat") || h.includes("food") || h.includes("dining")) return "eat";
    if (h.includes("drink") || h.includes("bar") || h.includes("nightlife")) return "drink";
    if (h.includes("sleep") || h.includes("hotel") || h.includes("stay")) return "sleep";
    if (h.includes("buy") || h.includes("shop")) return "buy";
    if (h.includes("get in") || h.includes("arrive") || h.includes("airport")) return "get_in";
    if (h.includes("get around") || h.includes("transport") || h.includes("metro"))
      return "get_around";
    if (h.includes("learn") || h.includes("culture") || h.includes("language")) return "learn";
    if (h.includes("safe") || h.includes("health") || h.includes("emergency")) return "stay_safe";
    return "default";
  }

  /**
   * Rewrite a single section with COMPREHENSIVE content preservation
   * Uses two-pass system: 1) Extract facts, 2) Rewrite with validation
   */
  private async rewriteSection(
    destination: string,
    section: { heading: string; content: string; type: string }
  ): Promise<GuideSection | null> {
    const sectionEnhancement = SECTION_ENHANCEMENTS[section.type] || SECTION_ENHANCEMENTS.default;

    // Calculate source stats for validation
    const sourceWordCount = section.content.split(/\s+/).length;
    const sourceCharCount = section.content.length;

    // PASS 1: Extract facts for validation
    log(`[GuideRewrite] Pass 1: Extracting facts from ${section.heading}...`);
    const { facts, counts } = await this.extractSectionFacts(section.heading, section.content);
    log(`[GuideRewrite] Extracted ${facts.length} facts from ${section.heading}`);

    // If fact extraction failed for a substantial section, log warning
    if (facts.length === 0 && section.content.length > 500) {
      log(
        `[GuideRewrite] Warning: No facts extracted for ${section.heading} - proceeding with length-only validation`
      );
    }

    // Build fact checklist for prompt
    const factChecklist =
      facts.length > 0
        ? `\nFACT CHECKLIST - You MUST include all of these:\n${facts.map(f => `- ${f.sourceText} (${f.category})`).join("\n")}\n\nREQUIRED COUNTS: ${JSON.stringify(counts)}\n`
        : "";

    // PASS 2: Rewrite with up to 3 retries
    const MAX_RETRIES = 3;
    let bestResponse: string | null = null;
    let bestRatio = 0;
    let bestCoverage = 0;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Determine model based on attempt
      const model = attempt >= 2 ? MODELS.premium : MODELS.primary;

      // On retry 3, use paragraph-by-paragraph mode
      if (attempt === 3) {
        log(
          `[GuideRewrite] Retry 3: Using paragraph-by-paragraph approach for ${section.heading}...`
        );
        try {
          const paragraphResult = await this.rewriteSectionByParagraphs(
            section,
            sectionEnhancement
          );
          if (paragraphResult) {
            const paragraphWordCount = paragraphResult.split(/\s+/).length;
            const paragraphRatio = Math.round((paragraphWordCount / sourceWordCount) * 100);
            const paragraphCoverage = this.validateFactCoverage(paragraphResult, facts);
            log(
              `[GuideRewrite] PARAGRAPH ${section.heading}: ${paragraphWordCount} words (${paragraphRatio}%), coverage: ${Math.round(paragraphCoverage.ratio * 100)}%`
            );

            if (paragraphRatio >= 90 && paragraphCoverage.ratio >= 0.7) {
              return {
                id: `${section.type}-${Date.now()}`,
                type: section.type,
                heading: section.heading,
                content: paragraphResult,
              };
            }

            // Use paragraph result if it's better than previous attempts
            if (paragraphRatio > bestRatio || paragraphCoverage.ratio > bestCoverage) {
              bestResponse = paragraphResult;
              bestRatio = paragraphRatio;
              bestCoverage = paragraphCoverage.ratio;
            }
          }
        } catch (retryError) {
          log(`[GuideRewrite] Paragraph approach failed for ${section.heading}: ${retryError}`);
        }
        continue;
      }

      // Build comprehensive prompt with fact checklist
      const userPrompt = `SECTION TO REWRITE: "${section.heading}" for ${destination}

SOURCE CONTENT STATS:
- Word count: ~${sourceWordCount} words
- Character count: ~${sourceCharCount} characters
- Your output MUST be at least ${Math.round(sourceWordCount * 0.9)} words (90% of source minimum)
${factChecklist}
SECTION-SPECIFIC INSTRUCTIONS:
${sectionEnhancement}

---
SOURCE CONTENT TO REPHRASE (preserve ALL information):
---
${section.content}
---

OUTPUT REQUIREMENTS:
1. Write comprehensive HTML content with proper <h3>, <h4>, <p>, <ul>, <li> tags
2. PRESERVE every name, address, price, phone number, and detail from the FACT CHECKLIST above
3. KEEP all items from lists - if source mentions 10 places, include all 10
4. Output length MUST match or exceed the source length
5. NO markdown formatting - use HTML only
6. NO emojis
7. Write in English with TRAVI voice

YOUR COMPREHENSIVE REWRITE:`;

      try {
        log(
          `[GuideRewrite] Pass 2 (attempt ${attempt}/${MAX_RETRIES}): Rewriting ${section.heading} with ${model}...`
        );

        // Use system + user message structure for better results
        const response = await this.callModelWithSystem(
          model,
          COMPREHENSIVE_REWRITE_SYSTEM,
          userPrompt
        );

        if (response) {
          this.totalCost += this.calculateCost(
            model,
            COMPREHENSIVE_REWRITE_SYSTEM + userPrompt,
            response
          );

          // Validate output length
          const outputWordCount = response.split(/\s+/).length;
          const ratio = Math.round((outputWordCount / sourceWordCount) * 100);

          // Validate fact coverage
          const coverage = this.validateFactCoverage(response, facts);
          const coveragePercent = Math.round(coverage.ratio * 100);

          log(
            `[GuideRewrite] ${section.heading} (attempt ${attempt}): ${outputWordCount} words (${ratio}%), coverage: ${coveragePercent}%`
          );

          // Track best result
          if (ratio > bestRatio || coverage.ratio > bestCoverage) {
            bestResponse = response;
            bestRatio = ratio;
            bestCoverage = coverage.ratio;
          }

          // Success conditions: length >= 90% AND coverage >= 70%
          if (ratio >= 90 && coverage.ratio >= 0.7) {
            log(`[GuideRewrite] ${section.heading}: PASSED validation on attempt ${attempt}`);
            return {
              id: `${section.type}-${Date.now()}`,
              type: section.type,
              heading: section.heading,
              content: response,
            };
          }

          // Log why we're retrying
          if (ratio < 90) {
            log(
              `[GuideRewrite] ${section.heading}: Length too short (${ratio}% < 90%) - retrying...`
            );
          }
          if (coverage.ratio < 0.7) {
            log(
              `[GuideRewrite] ${section.heading}: Coverage too low (${coveragePercent}% < 70%), missing ${coverage.missingFacts.length} facts - retrying...`
            );
          }
        }
      } catch (error) {
        log(`[GuideRewrite] Attempt ${attempt} failed for ${section.heading}: ${error}`);
      }

      // Rate limit between retries
      await this.sleep(500);
    }

    // Use best result if we have one, even if it didn't pass all validations
    if (bestResponse) {
      log(
        `[GuideRewrite] ${section.heading}: Using best result (${bestRatio}% length, ${Math.round(bestCoverage * 100)}% coverage)`
      );
      return {
        id: `${section.type}-${Date.now()}`,
        type: section.type,
        heading: section.heading,
        content: bestResponse,
      };
    }

    log(`[GuideRewrite] ${section.heading}: All attempts failed`);
    return null;
  }

  /**
   * Rewrite a section by processing each paragraph separately
   * This approach gives better length control for long sections
   */
  private async rewriteSectionByParagraphs(
    section: { heading: string; content: string; type: string },
    sectionEnhancement: string
  ): Promise<string | null> {
    const chunks: string[] = [];

    // Helper function to strip HTML tags and get clean text
    const stripHtml = (html: string): string => {
      return html
        .replace(/<script[^>]*>.*?<\/script>/gis, "")
        .replace(/<style[^>]*>.*?<\/style>/gis, "")
        .replace(/<[^>]+>/g, " ")
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Extract ALL block-level elements from Wikivoyage HTML content
    const paragraphMatches = section.content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    const listMatches = section.content.match(/<li[^>]*>[\s\S]*?<\/li>/gi) || [];
    const headerMatches = section.content.match(/<h[3-6][^>]*>[\s\S]*?<\/h[3-6]>/gi) || [];
    const dlMatches = section.content.match(/<dl[^>]*>[\s\S]*?<\/dl>/gi) || [];
    const ddMatches = section.content.match(/<dd[^>]*>[\s\S]*?<\/dd>/gi) || [];
    const divMatches = section.content.match(/<div[^>]*>[\s\S]*?<\/div>/gi) || [];
    const figureMatches = section.content.match(/<figure[^>]*>[\s\S]*?<\/figure>/gi) || [];
    const blockquoteMatches =
      section.content.match(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi) || [];
    const tableMatches = section.content.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
    const trMatches = section.content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

    // Combine all HTML block matches
    const allMatches = [
      ...paragraphMatches,
      ...listMatches,
      ...headerMatches,
      ...dlMatches,
      ...ddMatches,
      ...divMatches,
      ...figureMatches,
      ...blockquoteMatches,
      ...tableMatches,
      ...trMatches,
    ];

    // Calculate total source word count for chunk planning
    const totalWordCount = section.content.split(/\s+/).length;
    const targetChunkSize = 300; // Target 200-400 words per chunk
    const minChunks = totalWordCount > 300 ? 3 : 1; // Ensure at least 3 chunks for longer sections

    if (allMatches.length === 0) {
      // No HTML structure found - split by sentences instead of just lines
      // Split on ". " followed by capital letter (sentence boundary)
      const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])/g;
      const sentences = section.content.split(sentenceRegex);

      // Also try double newline split as fallback
      if (sentences.length <= 1) {
        const lines = section.content.split(/\n\n+/);
        for (const line of lines) {
          const cleanLine = stripHtml(line.trim());
          if (cleanLine.length > 30) {
            chunks.push(cleanLine);
          }
        }
      } else {
        // Group sentences into chunks of 200-400 words
        let currentChunk = "";
        let currentWordCount = 0;

        for (const sentence of sentences) {
          const cleanSentence = stripHtml(sentence.trim());
          if (!cleanSentence) continue;

          const sentenceWords = cleanSentence.split(/\s+/).length;

          // Start new chunk if current exceeds target (200-400 range)
          if (
            currentWordCount + sentenceWords > targetChunkSize &&
            currentWordCount >= 200 &&
            currentChunk
          ) {
            chunks.push(currentChunk.trim());
            currentChunk = cleanSentence;
            currentWordCount = sentenceWords;
          } else {
            currentChunk += (currentChunk ? " " : "") + cleanSentence;
            currentWordCount += sentenceWords;
          }
        }
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
      }
    } else {
      // HTML structure found - group into chunks of 200-400 words
      let currentChunk = "";
      let currentWordCount = 0;

      for (const match of allMatches) {
        // Strip HTML to get clean text for the AI
        const cleanText = stripHtml(match);
        if (!cleanText || cleanText.length < 10) continue;

        const matchWords = cleanText.split(/\s+/).length;

        // Start new chunk if current exceeds target range (200-400 words)
        if (
          currentWordCount + matchWords > targetChunkSize &&
          currentWordCount >= 200 &&
          currentChunk
        ) {
          chunks.push(currentChunk.trim());
          currentChunk = cleanText;
          currentWordCount = matchWords;
        } else {
          currentChunk += (currentChunk ? "\n\n" : "") + cleanText;
          currentWordCount += matchWords;
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }

    // If we have too few chunks for a long section, split the existing chunks further
    if (chunks.length < minChunks && chunks.length > 0 && totalWordCount > 300) {
      const newChunks: string[] = [];
      const targetPerChunk = Math.ceil(totalWordCount / minChunks);

      for (const chunk of chunks) {
        const chunkWords = chunk.split(/\s+/).length;
        if (chunkWords > targetPerChunk * 1.5) {
          // Split this chunk by sentences
          const sentences = chunk.split(/(?<=[.!?])\s+(?=[A-Z])/g);
          let subChunk = "";
          let subWordCount = 0;

          for (const sentence of sentences) {
            const sentenceWords = sentence.split(/\s+/).length;
            if (subWordCount + sentenceWords > targetPerChunk && subChunk) {
              newChunks.push(subChunk.trim());
              subChunk = sentence;
              subWordCount = sentenceWords;
            } else {
              subChunk += (subChunk ? " " : "") + sentence;
              subWordCount += sentenceWords;
            }
          }
          if (subChunk.trim()) {
            newChunks.push(subChunk.trim());
          }
        } else {
          newChunks.push(chunk);
        }
      }

      if (newChunks.length > chunks.length) {
        chunks.length = 0;
        chunks.push(...newChunks);
      }
    }

    if (chunks.length === 0) {
      return null;
    }

    log(
      `[GuideRewrite] Splitting ${section.heading} into ${chunks.length} chunks (${totalWordCount} words total, ~${Math.round(totalWordCount / chunks.length)} per chunk)`
    );

    // Rewrite each chunk with a focused prompt
    const rewrittenChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkWordCount = chunk.split(/\s+/).length;

      const chunkPrompt = `You are rewriting part ${i + 1}/${chunks.length} of the "${section.heading}" section.

CRITICAL RULES:
1. Preserve EVERY fact, name, number, price, and detail
2. Your output MUST be at least ${chunkWordCount} words (same as the source chunk)
3. Rephrase completely but keep all information
4. Output clean HTML only (<p>, <ul>, <li>)

SOURCE CHUNK TO REPHRASE:
${chunk}

COMPREHENSIVE REWRITTEN CHUNK:`;

      try {
        const response = await this.callModel(MODELS.primary, chunkPrompt);
        if (response) {
          this.totalCost += this.calculateCost(MODELS.primary, chunkPrompt, response);
          rewrittenChunks.push(response);
        } else {
          // Keep original if rewrite fails
          rewrittenChunks.push(chunk);
        }
      } catch (error) {
        rewrittenChunks.push(chunk); // Keep original on error
      }
    }

    // Combine all rewritten chunks
    const combinedContent = rewrittenChunks.join("\n\n");
    return combinedContent;
  }

  /**
   * Call AI model with system message for better instruction following
   */
  private async callModelWithSystem(
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string | null> {
    if (!this.openrouterKey) {
      throw new Error("OPENROUTER_NEVO_KEY not configured");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://travi.world",
        "X-Title": "TRAVI Guide Rewriter",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8000, // Increased for comprehensive output
        temperature: 0.6, // Slightly lower for more faithful rewriting
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  }

  /**
   * Generate SEO metadata
   */
  private async generateSeoMetadata(
    destination: string,
    year: number,
    sections: GuideSection[]
  ): Promise<GuideSeoData> {
    const prompt = `Generate SEO metadata for a travel guide about ${destination}.

Return ONLY valid JSON in this exact format:
{
  "metaTitle": "${destination} Travel Guide ${year}: Complete Visitor's Guide | TRAVI",
  "metaDescription": "Discover ${destination} in ${year}: honest costs, best hotels, local tips. Realistic guide for visitors with top attractions and insider advice.",
  "focusKeyword": "${destination} travel guide",
  "secondaryKeywords": ["things to do in ${destination}", "${destination} travel tips", "best time to visit ${destination}", "${destination} hotels", "visiting ${destination}"],
  "urlSlug": "${destination.toLowerCase().replace(/\s+/g, "-")}-travel-guide-${year}"
}

Requirements:
- metaTitle: 50-60 characters max
- metaDescription: 150-160 characters max
- Include the year ${year}
- Focus keyword should be natural
- 5 secondary keywords`;

    try {
      const response = await this.callModel(MODELS.primary, prompt);
      if (response) {
        this.totalCost += this.calculateCost(MODELS.primary, prompt, response);
        const jsonMatch = /\{[\s\S]*\}/.exec(response);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      log(`[GuideRewrite] SEO metadata generation failed, using defaults`);
    }

    // Fallback defaults
    return {
      metaTitle: `${destination} Travel Guide ${year}: Complete Visitor's Guide | TRAVI`,
      metaDescription: `Discover ${destination} in ${year}: honest costs, best hotels, local tips. Realistic guide for visitors with top attractions.`,
      focusKeyword: `${destination} travel guide`,
      secondaryKeywords: [
        `things to do in ${destination}`,
        `${destination} travel tips`,
        `best time to visit ${destination}`,
      ],
      urlSlug: `${destination.toLowerCase().replace(/\s+/g, "-")}-travel-guide-${year}`,
    };
  }

  /**
   * Generate FAQs for the destination
   */
  private async generateFaqs(destination: string, sections: GuideSection[]): Promise<GuideFaq[]> {
    const sectionSummary = sections.map(s => s.heading).join(", ");

    const prompt = `Generate 8 FAQ questions and answers about traveling to ${destination}.

Topics covered in the guide: ${sectionSummary}

Return ONLY valid JSON array in this format:
[
  {
    "question": "What is the best time to visit ${destination}?",
    "answer": "The best time to visit ${destination} is [months] when [weather conditions]. This period offers [benefits]. [Additional seasonal info]."
  }
]

Requirements:
- 8 unique questions travelers commonly ask
- Answers should be 2-3 sentences each
- Be specific and helpful
- Include questions about: best time, costs, safety, getting around, must-see attractions, local food
- NO markdown in answers`;

    try {
      const response = await this.callModel(MODELS.primary, prompt);
      if (response) {
        this.totalCost += this.calculateCost(MODELS.primary, prompt, response);
        const jsonMatch = /\[[\s\S]*\]/.exec(response);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      log(`[GuideRewrite] FAQ generation failed`);
    }

    return [
      {
        question: `What is the best time to visit ${destination}?`,
        answer: `The best time to visit ${destination} depends on your preferences for weather and crowds.`,
      },
      {
        question: `How many days do you need in ${destination}?`,
        answer: `Most visitors spend 3-5 days in ${destination} to see the main attractions.`,
      },
      {
        question: `Is ${destination} expensive to visit?`,
        answer: `${destination} offers options for all budgets, from budget hostels to luxury hotels.`,
      },
    ];
  }

  /**
   * Fetch images from Unsplash with SEO alt text
   */
  private async fetchUnsplashImages(
    destination: string,
    sections: GuideSection[]
  ): Promise<GuideImage[]> {
    const images: GuideImage[] = [];

    // Search queries for different aspects
    const queries = [
      `${destination} skyline`,
      `${destination} street`,
      `${destination} landmark`,
      `${destination} food`,
      `${destination} hotel`,
    ];

    for (const query of queries) {
      try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Client-ID ${this.unsplashKey}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.results?.[0]) {
            const photo = data.results[0];
            const section = this.mapQueryToSection(query);
            images.push({
              id: photo.id,
              url: photo.urls.regular,
              altText: `${destination} ${query.replace(destination, "").trim()} - travel photo`,
              credit: `Photo by ${photo.user.name} on Unsplash`,
              section,
            });
          }
        }
        await this.sleep(100); // Rate limit
      } catch (error) {
        log(`[GuideRewrite] Unsplash fetch failed for: ${query}`);
      }
    }

    // If no Unsplash key, generate placeholder data
    if (images.length === 0) {
      const placeholderSections = ["hero", "see", "eat", "sleep", "do"];
      for (const section of placeholderSections) {
        images.push({
          id: `placeholder-${section}`,
          url: `https://source.unsplash.com/1200x800/?${encodeURIComponent(destination + " " + section)}`,
          altText: `${destination} ${section} - travel photo`,
          credit: "Unsplash",
          section,
        });
      }
    }

    return images;
  }

  /**
   * Map search query to section type
   */
  private mapQueryToSection(query: string): string {
    if (query.includes("skyline") || query.includes("landmark")) return "hero";
    if (query.includes("food")) return "eat";
    if (query.includes("hotel")) return "sleep";
    if (query.includes("street")) return "see";
    return "general";
  }

  /**
   * Generate best time to visit calendar
   */
  private async generateBestTimeToVisit(
    destination: string,
    originalContent: string
  ): Promise<{ summary: string; months: Array<{ month: string; rating: string; notes: string }> }> {
    const prompt = `Based on this content about ${destination}, generate a "Best Time to Visit" summary.

CONTENT (extract relevant info):
${originalContent.slice(0, 3000)}

Return ONLY valid JSON:
{
  "summary": "Brief 2-sentence summary of the best times to visit ${destination}",
  "months": [
    {"month": "January", "rating": "good|fair|poor", "notes": "Brief weather/event note"},
    {"month": "February", "rating": "good|fair|poor", "notes": "Brief note"}
  ]
}

Include all 12 months. Rate each as good, fair, or poor for tourism.`;

    try {
      const response = await this.callModel(MODELS.primary, prompt);
      if (response) {
        this.totalCost += this.calculateCost(MODELS.primary, prompt, response);
        const jsonMatch = /\{[\s\S]*\}/.exec(response);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      log(`[GuideRewrite] Best time generation failed`);
    }

    return {
      summary: `${destination} can be visited year-round with peak season offering the best weather.`,
      months: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].map(m => ({
        month: m,
        rating: "fair",
        notes: "Check local conditions",
      })),
    };
  }

  /**
   * Extract districts/neighborhoods
   */
  private async extractDistricts(
    destination: string,
    originalContent: string
  ): Promise<Array<{ name: string; description: string }>> {
    const prompt = `Extract the main districts/neighborhoods of ${destination} from this content.

CONTENT:
${originalContent.slice(0, 4000)}

Return ONLY valid JSON array:
[
  {"name": "District Name", "description": "Brief 1-2 sentence description of character and what it's known for"}
]

Include 4-8 main areas that travelers should know about.`;

    try {
      const response = await this.callModel(MODELS.primary, prompt);
      if (response) {
        this.totalCost += this.calculateCost(MODELS.primary, prompt, response);
        const jsonMatch = /\[[\s\S]*\]/.exec(response);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      log(`[GuideRewrite] Districts extraction failed`);
    }

    return [
      { name: "City Center", description: `The heart of ${destination} with main attractions.` },
    ];
  }

  /**
   * Generate quick facts
   */
  private async generateQuickFacts(
    destination: string,
    originalContent: string
  ): Promise<Record<string, string>> {
    const prompt = `Extract quick facts about ${destination} for travelers.

CONTENT:
${originalContent.slice(0, 3000)}

Return ONLY valid JSON object with these keys:
{
  "currency": "Currency name and code",
  "language": "Primary language(s)",
  "timezone": "Timezone",
  "emergency": "Emergency number",
  "voltage": "Electrical voltage/plug type",
  "tipping": "Tipping customs",
  "visa": "Visa info for most visitors",
  "bestFor": "What type of traveler it's best for"
}`;

    try {
      const response = await this.callModel(MODELS.primary, prompt);
      if (response) {
        this.totalCost += this.calculateCost(MODELS.primary, prompt, response);
        const jsonMatch = /\{[\s\S]*\}/.exec(response);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      log(`[GuideRewrite] Quick facts generation failed`);
    }

    return { currency: "Local currency", language: "Local language", timezone: "Local timezone" };
  }

  /**
   * Generate Schema.org markup
   */
  private generateSchemaMarkup(
    destination: string,
    seo: GuideSeoData,
    faqs: GuideFaq[],
    images: GuideImage[]
  ): GuideSchemaMarkup {
    const baseUrl = "https://travi.world";

    return {
      travelGuide: {
        "@context": "https://schema.org",
        "@type": "TravelGuide",
        name: seo.metaTitle,
        description: seo.metaDescription,
        url: `${baseUrl}/guides/${seo.urlSlug}`,
        datePublished: new Date().toISOString().split("T")[0],
        dateModified: new Date().toISOString().split("T")[0],
        author: { "@type": "Organization", name: "TRAVI World" },
        publisher: {
          "@type": "Organization",
          name: "TRAVI World",
          logo: { "@type": "ImageObject", url: `${baseUrl}/logo.png` },
        },
        mainEntity: {
          "@type": "City",
          name: destination,
          description: `Travel destination guide for ${destination}`,
        },
      },
      faqPage: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(faq => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
      breadcrumbList: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Travel Guides", item: `${baseUrl}/guides` },
          {
            "@type": "ListItem",
            position: 3,
            name: destination,
            item: `${baseUrl}/guides/${seo.urlSlug}`,
          },
        ],
      },
      touristDestination: {
        "@context": "https://schema.org",
        "@type": "TouristDestination",
        name: destination,
        description: seo.metaDescription,
        url: `${baseUrl}/guides/${seo.urlSlug}`,
        image: images[0]?.url || "",
        touristType: ["Culture enthusiasts", "Food lovers", "Urban explorers"],
      },
    };
  }

  /**
   * Generate Open Graph tags
   */
  private generateOgTags(
    destination: string,
    seo: GuideSeoData,
    images: GuideImage[]
  ): GuideOgTags {
    return {
      title: seo.metaTitle,
      description: seo.metaDescription,
      url: `https://travi.world/guides/${seo.urlSlug}`,
      type: "article",
      image: images[0]?.url || "https://travi.world/images/default-guide.jpg",
      siteName: "TRAVI World",
    };
  }

  /**
   * Call AI model via OpenRouter
   */
  private async callModel(model: string, prompt: string): Promise<string | null> {
    if (!this.openrouterKey) {
      throw new Error("OPENROUTER_NEVO_KEY not configured");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://travi.world",
        "X-Title": "TRAVI Guide Rewriter",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  }

  /**
   * Calculate cost for a request
   */
  private calculateCost(model: string, prompt: string, response: string): number {
    const costs =
      MODEL_COSTS_PER_1M[model as keyof typeof MODEL_COSTS_PER_1M] ||
      MODEL_COSTS_PER_1M["deepseek/deepseek-chat"];

    const inputTokens = prompt.length / 4;
    const outputTokens = response.length / 4;

    return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get rewrite status for all guides
   */
  async getRewriteStatus(): Promise<
    Array<{
      slug: string;
      title: string;
      hasRewrite: boolean;
      cost: string | null;
      status: string | null;
    }>
  > {
    const guides = await db
      .select({
        slug: update9987Guides.slug,
        title: update9987Guides.title,
        rewrittenContent: update9987Guides.rewrittenContent,
        rewriteCost: update9987Guides.rewriteCost,
        status: update9987Guides.status,
      })
      .from(update9987Guides);

    return guides.map(g => ({
      slug: g.slug,
      title: g.title,
      hasRewrite: !!(g.rewrittenContent && g.rewrittenContent.length > 0),
      cost: g.rewriteCost,
      status: g.status,
    }));
  }
}

export const guideRewriteService = new GuideRewriteService();
