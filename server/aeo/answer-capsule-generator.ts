/**
 * Answer Capsule Generator
 * Generates AI-optimized answer capsules (40-60 words) for content
 * Following the AEO specification for AI platform extraction
 */

import { db } from "../db";
import {
  contents,
  aeoAnswerCapsules,
  attractions,
  hotels,
  dining,
  districts,
  articles,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { getAllUnifiedProviders, markProviderFailed } from "../ai/providers";
import { ANSWER_CAPSULE_CONFIG } from "./aeo-config";
import { log } from "../lib/logger";

const aeoLogger = {
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[AEO] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO] ${msg}`, data),
};

// Types
export interface AnswerCapsuleInput {
  contentId: string;
  locale?: string;
  forceRegenerate?: boolean;
}

export interface AnswerCapsuleResult {
  capsuleText: string;
  quickAnswer: string;
  keyFacts: string[];
  differentiator: string;
  qualityScore: number;
  wordCount: number;
}

export interface ContentData {
  id: string;
  type: string;
  title: string;
  metaDescription: string | null;
  blocks: any[];
  // Type-specific data
  location?: string;
  priceFrom?: string;
  duration?: string;
  category?: string;
  starRating?: number;
  cuisineType?: string;
  priceRange?: string;
  neighborhood?: string;
  highlights?: any[];
  faq?: any[];
  targetAudience?: string[];
}

/**
 * Generate an answer capsule for a content piece
 */
export async function generateAnswerCapsule(
  input: AnswerCapsuleInput
): Promise<AnswerCapsuleResult> {
  const { contentId, locale = "en", forceRegenerate = false } = input;

  // Check for existing capsule if not forcing regeneration
  if (!forceRegenerate) {
    const existing = await db.query.aeoAnswerCapsules.findFirst({
      where: and(
        eq(aeoAnswerCapsules.contentId, contentId),
        eq(aeoAnswerCapsules.locale, locale as any)
      ),
    });

    if (
      existing?.qualityScore &&
      existing.qualityScore >= ANSWER_CAPSULE_CONFIG.qualityThresholds.acceptable
    ) {
      return {
        capsuleText: existing.capsuleText,
        quickAnswer: existing.quickAnswer || "",
        keyFacts: (existing.keyFacts as string[]) || [],
        differentiator: existing.differentiator || "",
        qualityScore: existing.qualityScore,
        wordCount: countWords(existing.capsuleText),
      };
    }
  }

  // Fetch content data
  const contentData = await fetchContentData(contentId);
  if (!contentData) {
    throw new Error(`Content not found: ${contentId}`);
  }

  // Generate capsule using AI
  const result = await generateCapsuleWithAI(contentData, locale);

  // Save to database
  await saveCapsule(contentId, locale, result);

  return result;
}

/**
 * Fetch content data with type-specific details
 */
async function fetchContentData(contentId: string): Promise<ContentData | null> {
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });

  if (!content) return null;

  let typeSpecificData: Record<string, any> = {};

  // Fetch type-specific data
  switch (content.type) {
    case "attraction": {
      const attraction = await db.query.attractions.findFirst({
        where: eq(attractions.contentId, contentId),
      });
      if (attraction) {
        typeSpecificData = {
          location: attraction.location,
          priceFrom: attraction.priceFrom,
          duration: attraction.duration,
          category: attraction.category,
          highlights: attraction.highlights,
          faq: attraction.faq,
          targetAudience: attraction.targetAudience,
        };
      }
      break;
    }
    case "hotel": {
      const hotel = await db.query.hotels.findFirst({
        where: eq(hotels.contentId, contentId),
      });
      if (hotel) {
        typeSpecificData = {
          location: hotel.location,
          starRating: hotel.starRating,
          highlights: hotel.highlights,
          faq: hotel.faq,
          targetAudience: hotel.targetAudience,
        };
      }
      break;
    }
    case "dining": {
      const restaurant = await db.query.dining.findFirst({
        where: eq(dining.contentId, contentId),
      });
      if (restaurant) {
        typeSpecificData = {
          location: restaurant.location,
          cuisineType: restaurant.cuisineType,
          priceRange: restaurant.priceRange,
          highlights: restaurant.highlights,
          faq: restaurant.faq,
          targetAudience: restaurant.targetAudience,
        };
      }
      break;
    }
    case "district": {
      const district = await db.query.districts.findFirst({
        where: eq(districts.contentId, contentId),
      });
      if (district) {
        typeSpecificData = {
          location: district.location,
          neighborhood: district.neighborhood,
          highlights: district.highlights,
          faq: district.faq,
          targetAudience: district.targetAudience,
        };
      }
      break;
    }
    case "article": {
      const article = await db.query.articles.findFirst({
        where: eq(articles.contentId, contentId),
      });
      if (article) {
        typeSpecificData = {
          category: article.category,
          faq: article.faq,
          targetAudience: article.targetAudience,
        };
      }
      break;
    }
  }

  return {
    id: content.id,
    type: content.type,
    title: content.title,
    metaDescription: content.metaDescription,
    blocks: content.blocks || [],
    ...typeSpecificData,
  };
}

/**
 * Generate capsule content using AI
 */
async function generateCapsuleWithAI(
  content: ContentData,
  locale: string
): Promise<AnswerCapsuleResult> {
  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    throw new Error("No AI provider available");
  }

  const prompt = buildCapsulePrompt(content, locale);
  let lastError: Error | null = null;

  // Try each provider until one succeeds
  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          {
            role: "system",
            content: getSystemPrompt(locale),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Low temperature for factual consistency
        maxTokens: 500,
        responseFormat: { type: "json_object" },
      });

      const parsed = JSON.parse(result.content);

      // Validate and score the result
      const capsuleText = parsed.capsuleText || parsed.capsule_text || "";
      const quickAnswer = parsed.quickAnswer || parsed.quick_answer || "";
      const keyFacts = parsed.keyFacts || parsed.key_facts || [];
      const differentiator = parsed.differentiator || "";

      const qualityScore = evaluateQuality(capsuleText, quickAnswer, keyFacts, differentiator);

      return {
        capsuleText: capsuleText.trim(),
        quickAnswer: quickAnswer.trim(),
        keyFacts: Array.isArray(keyFacts) ? keyFacts : [],
        differentiator: differentiator.trim(),
        qualityScore,
        wordCount: countWords(capsuleText),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      markProviderFailed(provider.name, "error");
      aeoLogger.error("Provider failed, trying next", {
        provider: provider.name,
        error: String(error),
      });
    }
  }

  aeoLogger.error("Failed to generate answer capsule - all providers failed", {
    contentId: content.id,
  });
  throw lastError || new Error("All AI providers failed");
}

/**
 * Build the prompt for capsule generation
 */
function buildCapsulePrompt(content: ContentData, locale: string): string {
  const contentSummary = extractContentSummary(content);

  return `Generate an Answer Capsule for the following ${content.type} content.

CONTENT DETAILS:
Title: ${content.title}
Type: ${content.type}
${content.location ? `Location: ${content.location}` : ""}
${content.priceFrom ? `Price: ${content.priceFrom}` : ""}
${content.duration ? `Duration: ${content.duration}` : ""}
${content.starRating ? `Star Rating: ${content.starRating} stars` : ""}
${content.cuisineType ? `Cuisine: ${content.cuisineType}` : ""}
${content.priceRange ? `Price Range: ${content.priceRange}` : ""}
${content.category ? `Category: ${content.category}` : ""}
${content.metaDescription ? `Description: ${content.metaDescription}` : ""}

${contentSummary}

REQUIREMENTS:
1. capsuleText: A ${ANSWER_CAPSULE_CONFIG.minWords}-${ANSWER_CAPSULE_CONFIG.maxWords} word summary
   - Start with a direct answer to "What is [title]?"
   - Include one key fact (number, statistic, or unique detail)
   - End with a differentiating value proposition
   - Use factual tone, no marketing language
   - No emojis or markdown

2. quickAnswer: A ${ANSWER_CAPSULE_CONFIG.quickAnswerMinWords}-${ANSWER_CAPSULE_CONFIG.quickAnswerMaxWords} word ultra-short answer
   - Just the essential facts

3. keyFacts: Array of 3-5 key facts as strings
   - Specific numbers, prices, or metrics
   - Unique or surprising information

4. differentiator: One sentence explaining what makes this unique

${locale !== "en" ? `Generate all content in ${getLocaleName(locale)} language.` : ""}

Respond with valid JSON only:
{
  "capsuleText": "...",
  "quickAnswer": "...",
  "keyFacts": ["...", "..."],
  "differentiator": "..."
}`;
}

/**
 * Extract summary from content blocks
 */
function extractContentSummary(content: ContentData): string {
  const parts: string[] = [];

  // Add highlights
  if (content.highlights && Array.isArray(content.highlights)) {
    const highlightTexts = content.highlights
      .slice(0, 5)
      .map((h: any) => h.title || h.text || h)
      .filter(Boolean);
    if (highlightTexts.length > 0) {
      parts.push(`Highlights: ${highlightTexts.join(", ")}`);
    }
  }

  // Add FAQ topics
  if (content.faq && Array.isArray(content.faq)) {
    const faqTopics = content.faq
      .slice(0, 3)
      .map((f: any) => f.question)
      .filter(Boolean);
    if (faqTopics.length > 0) {
      parts.push(`Common questions: ${faqTopics.join("; ")}`);
    }
  }

  // Add target audience
  if (content.targetAudience && Array.isArray(content.targetAudience)) {
    parts.push(`Best for: ${content.targetAudience.join(", ")}`);
  }

  // Extract text from blocks
  if (content.blocks && Array.isArray(content.blocks)) {
    const textBlocks = content.blocks
      .filter((b: any) => b.type === "paragraph" || b.type === "text")
      .slice(0, 2)
      .map((b: any) => b.content || b.text)
      .filter(Boolean);
    if (textBlocks.length > 0) {
      parts.push(`Content: ${textBlocks.join(" ").substring(0, 500)}`);
    }
  }

  return parts.join("\n");
}

/**
 * Get system prompt for the AI
 */
function getSystemPrompt(locale: string): string {
  return `You are an expert content optimizer specializing in Answer Engine Optimization (AEO).
Your task is to create answer capsules optimized for AI assistants like ChatGPT, Perplexity, and Google AI Overviews.

GUIDELINES:
- Write factual, authoritative content
- Use specific numbers and data points
- Avoid marketing language and clichés
- No emojis, no markdown formatting
- Be concise and direct
- Include unique insights not found elsewhere
- Optimize for AI citation and extraction

Your output should be immediately usable as the first paragraph of a content page.`;
}

/**
 * Evaluate the quality of a generated capsule
 */
function evaluateQuality(
  capsuleText: string,
  quickAnswer: string,
  keyFacts: string[],
  differentiator: string
): number {
  let score = 0;

  // Word count check (0-25 points)
  const wordCount = countWords(capsuleText);
  if (wordCount >= ANSWER_CAPSULE_CONFIG.minWords && wordCount <= ANSWER_CAPSULE_CONFIG.maxWords) {
    score += 25;
  } else if (wordCount >= 30 && wordCount <= 70) {
    score += 15;
  }

  // Quick answer check (0-15 points)
  const quickWordCount = countWords(quickAnswer);
  if (
    quickWordCount >= ANSWER_CAPSULE_CONFIG.quickAnswerMinWords &&
    quickWordCount <= ANSWER_CAPSULE_CONFIG.quickAnswerMaxWords
  ) {
    score += 15;
  } else if (quickWordCount > 0 && quickWordCount <= 25) {
    score += 8;
  }

  // Key facts check (0-20 points)
  if (keyFacts.length >= 3 && keyFacts.length <= 5) {
    score += 20;
  } else if (keyFacts.length > 0) {
    score += keyFacts.length * 4;
  }

  // Differentiator check (0-15 points)
  if (differentiator && differentiator.length > 20) {
    score += 15;
  } else if (differentiator && differentiator.length > 0) {
    score += 8;
  }

  // Content quality checks (0-25 points)
  // Check for specific numbers
  if (/\d+/.test(capsuleText)) {
    score += 5;
  }

  // Check for no marketing clichés
  const cliches = [
    "must-visit",
    "hidden gem",
    "breathtaking",
    "amazing",
    "incredible",
    "jaw-dropping",
  ];
  const hasCliches = cliches.some(c => capsuleText.toLowerCase().includes(c));
  if (!hasCliches) {
    score += 10;
  }

  // Check for no emojis
  if (!/[\u{1F300}-\u{1F9FF}]/u.test(capsuleText)) {
    score += 5;
  }

  // Check for factual tone (no exclamation marks)
  if (!capsuleText.includes("!")) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Save capsule to database
 */
async function saveCapsule(
  contentId: string,
  locale: string,
  result: AnswerCapsuleResult
): Promise<void> {
  // Check if exists
  const existing = await db.query.aeoAnswerCapsules.findFirst({
    where: and(
      eq(aeoAnswerCapsules.contentId, contentId),
      eq(aeoAnswerCapsules.locale, locale as any)
    ),
  });

  if (existing) {
    // Update existing
    await db
      .update(aeoAnswerCapsules)
      .set({
        capsuleText: result.capsuleText,
        quickAnswer: result.quickAnswer,
        keyFacts: result.keyFacts,
        differentiator: result.differentiator,
        qualityScore: result.qualityScore,
        generatedByAI: true,
        updatedAt: new Date(),
      } as any)
      .where(eq(aeoAnswerCapsules.id, existing.id));
  } else {
    // Insert new
    await db.insert(aeoAnswerCapsules).values({
      contentId,
      locale: locale as any,
      capsuleText: result.capsuleText,
      quickAnswer: result.quickAnswer,
      keyFacts: result.keyFacts,
      differentiator: result.differentiator,
      qualityScore: result.qualityScore,
      generatedByAI: true,
    } as any);
  }

  // Also update the content's answerCapsule field
  await db
    .update(contents)
    .set({
      answerCapsule: result.capsuleText,
      aeoScore: result.qualityScore,
      updatedAt: new Date(),
    } as any)
    .where(eq(contents.id, contentId));
}

/**
 * Count words in a string
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Get locale name for prompts
 */
function getLocaleName(locale: string): string {
  const names: Record<string, string> = {
    en: "English",
    ar: "Arabic",
    hi: "Hindi",
    zh: "Chinese",
    ru: "Russian",
    fr: "French",
    de: "German",
    es: "Spanish",
    he: "Hebrew",
    ja: "Japanese",
    ko: "Korean",
    it: "Italian",
    tr: "Turkish",
  };
  return names[locale] || "English";
}

/**
 * Batch generate capsules for multiple content items
 */
export async function batchGenerateCapsules(
  contentIds: string[],
  locale: string = "en",
  options: { concurrency?: number; skipExisting?: boolean } = {}
): Promise<{ success: number; failed: number; skipped: number; errors: string[] }> {
  const { concurrency = 3, skipExisting = true } = options;
  const results = { success: 0, failed: 0, skipped: 0, errors: [] as string[] };

  // Process in batches
  for (let i = 0; i < contentIds.length; i += concurrency) {
    const batch = contentIds.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async contentId => {
        try {
          if (skipExisting) {
            const existing = await db.query.aeoAnswerCapsules.findFirst({
              where: and(
                eq(aeoAnswerCapsules.contentId, contentId),
                eq(aeoAnswerCapsules.locale, locale as any)
              ),
            });

            if (
              existing &&
              existing.qualityScore &&
              existing.qualityScore >= ANSWER_CAPSULE_CONFIG.qualityThresholds.acceptable
            ) {
              results.skipped++;
              return;
            }
          }

          await generateAnswerCapsule({ contentId, locale, forceRegenerate: true });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `${contentId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + concurrency < contentIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Get capsule statistics
 */
export async function getCapsuleStats(): Promise<{
  total: number;
  approved: number;
  pendingApproval: number;
  averageQuality: number;
  byLocale: Record<string, number>;
}> {
  const allCapsules = await db.select().from(aeoAnswerCapsules);

  const stats = {
    total: allCapsules.length,
    approved: allCapsules.filter(c => c.isApproved).length,
    pendingApproval: allCapsules.filter(c => !c.isApproved).length,
    averageQuality: 0,
    byLocale: {} as Record<string, number>,
  };

  // Calculate average quality
  const qualityScores = allCapsules.map(c => c.qualityScore).filter((s): s is number => s !== null);
  if (qualityScores.length > 0) {
    stats.averageQuality = Math.round(
      qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    );
  }

  // Count by locale
  for (const capsule of allCapsules) {
    const locale = capsule.locale;
    stats.byLocale[locale] = (stats.byLocale[locale] || 0) + 1;
  }

  return stats;
}
