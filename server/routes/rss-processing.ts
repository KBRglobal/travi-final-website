/**
 * RSS Feed Processing Module
 * Handles RSS feed parsing, content aggregation, and article generation
 */

import crypto from "crypto";
import { eq, like, or, desc, and } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { validateUrlForSSRF } from "../security";
import { sanitizeHtml as sanitizeHtmlContent } from "../security/validators";
import { getStorageManager } from "../services/storage-adapter";
import { generateContentImages } from "../ai";
import { getAllUnifiedProviders, markProviderFailed, markProviderSuccess } from "../ai/providers";
import {
  getContentWriterSystemPrompt,
  buildArticleGenerationPrompt,
  determineContentCategory,
  validateArticleResponse,
  buildRetryPrompt,
  CONTENT_WRITER_PERSONALITIES,
  CATEGORY_PERSONALITY_MAPPING,
  type ArticleResponse,
} from "../content-writer-guidelines";
import type { ContentBlock } from "@shared/schema";
import { safeParseJson } from "./helpers/json-utils";

// RTL languages that need special handling
export const RTL_LOCALES = ["ar", "fa", "ur"];

// All target languages for translation (excluding English which is source)
// Note: DeepL does NOT support: Bengali (bn), Filipino (fil), Hebrew (he), Hindi (hi), Urdu (ur), Persian (fa)
// For unsupported languages, we use GPT as fallback translator
export const DEEPL_SUPPORTED_LOCALES = [
  "ar",
  "zh",
  "ru",
  "fr",
  "de",
  "es",
  "tr",
  "it",
  "ja",
  "ko",
  "pt",
] as const;
export const GPT_FALLBACK_LOCALES = ["hi", "ur", "fa"] as const;
export const TARGET_LOCALES = [...DEEPL_SUPPORTED_LOCALES, ...GPT_FALLBACK_LOCALES] as const;

/**
 * Parse RSS feed and extract items
 */
export async function parseRssFeed(
  url: string
): Promise<{ title: string; link: string; description: string; pubDate?: string }[]> {
  // SSRF Protection: Validate URL before fetching
  const ssrfCheck = validateUrlForSSRF(url);
  if (!ssrfCheck.valid) {
    throw new Error(`Invalid RSS feed URL: ${ssrfCheck.error}`);
  }

  try {
    const response = await fetch(ssrfCheck.sanitizedUrl!);
    const text = await response.text();

    const items: { title: string; link: string; description: string; pubDate?: string }[] = [];
    const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

    for (const itemXml of itemMatches) {
      const titleMatch = itemXml.match(
        /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
      );
      const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descMatch = itemXml.match(
        /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i
      );
      const dateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

      if (titleMatch && linkMatch) {
        // Sanitize all content from RSS to prevent XSS attacks
        const rawTitle = titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "");
        const rawLink = linkMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "");
        const rawDescription = descMatch
          ? descMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "")
          : "";

        items.push({
          title: sanitizeHtmlContent(rawTitle),
          link: rawLink, // URLs are validated separately
          description: sanitizeHtmlContent(rawDescription).substring(0, 500),
          pubDate: dateMatch ? dateMatch[1].trim() : undefined,
        });
      }
    }

    return items;
  } catch (error) {
    throw error;
  }
}

/**
 * Generate fingerprint for content deduplication
 */
export function generateFingerprint(title: string, url?: string): string {
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedUrl = url ? url.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return crypto
    .createHash("sha256")
    .update(`${normalizedTitle}-${normalizedUrl}`)
    .digest("hex")
    .substring(0, 32);
}

export interface ArticleImageResult {
  url: string;
  altText: string;
  imageId: string;
  source: "library" | "freepik";
}

/**
 * Find or create image for article based on topic and keywords
 */
export async function findOrCreateArticleImage(
  topic: string,
  keywords: string[],
  category: string
): Promise<ArticleImageResult | null> {
  try {
    const { aiGeneratedImages } = await import("@shared/schema");

    const searchTerms = [topic, ...keywords].filter(Boolean);
    const searchConditions = searchTerms.map(term =>
      or(
        like(aiGeneratedImages.topic, `%${term}%`),
        like(aiGeneratedImages.altText, `%${term}%`),
        like(aiGeneratedImages.category, `%${term}%`)
      )
    );

    let foundImage = null;

    if (searchConditions.length > 0) {
      const approvedImages = await db
        .select()
        .from(aiGeneratedImages)
        .where(and(eq(aiGeneratedImages.isApproved, true), or(...searchConditions)))
        .orderBy(desc(aiGeneratedImages.usageCount))
        .limit(1);

      if (approvedImages.length > 0) {
        foundImage = approvedImages[0];
      } else {
        const anyImages = await db
          .select()
          .from(aiGeneratedImages)
          .where(or(...searchConditions))
          .orderBy(desc(aiGeneratedImages.createdAt))
          .limit(1);

        if (anyImages.length > 0) {
          foundImage = anyImages[0];
        }
      }
    }

    if (!foundImage) {
      const categoryImages = await db
        .select()
        .from(aiGeneratedImages)
        .where(eq(aiGeneratedImages.category, category))
        .orderBy(desc(aiGeneratedImages.isApproved), desc(aiGeneratedImages.createdAt))
        .limit(1);

      if (categoryImages.length > 0) {
        foundImage = categoryImages[0];
      }
    }

    if (foundImage) {
      await db
        .update(aiGeneratedImages)
        .set({ usageCount: (foundImage.usageCount || 0) + 1, updatedAt: new Date() } as any)
        .where(eq(aiGeneratedImages.id, foundImage.id));

      return {
        url: foundImage.url,
        altText: foundImage.altText || `${topic} - Travel Guide`,
        imageId: foundImage.id,
        source: "library",
      };
    }

    const freepikApiKey = process.env.FREEPIK_API_KEY;
    if (!freepikApiKey) {
      return null;
    }

    const searchQuery = `dubai ${topic} tourism`.substring(0, 100);
    const searchUrl = new URL("https://api.freepik.com/v1/resources");
    searchUrl.searchParams.set("term", searchQuery);
    searchUrl.searchParams.set("page", "1");
    searchUrl.searchParams.set("limit", "5");
    searchUrl.searchParams.set("filters[content_type][photo]", "1");

    const freepikResponse = await fetch(searchUrl.toString(), {
      headers: {
        "Accept-Language": "en-US",
        Accept: "application/json",
        "x-freepik-api-key": freepikApiKey,
      },
    });

    if (!freepikResponse.ok) {
      return null;
    }

    const freepikData = await freepikResponse.json();
    const results = freepikData.data || [];

    if (results.length === 0) {
      // Fallback to AI image generation
      try {
        const aiImages = await generateContentImages({
          contentType: "article",
          title: topic,
          description: `Travel article about ${topic}`,
          style: "photorealistic",
          generateHero: true,
          generateContentImages: false,
        });

        if (aiImages && aiImages.length > 0) {
          const aiImage = aiImages[0];

          // Store the AI generated image
          const [savedImage] = await db
            .insert(aiGeneratedImages)
            .values({
              filename: aiImage.filename,
              url: aiImage.url,
              topic: topic,
              category: category || "general",
              imageType: "hero",
              source: "openai" as const,
              prompt: `Travel image for: ${topic}`,
              keywords: keywords.slice(0, 10),
              altText: aiImage.alt || `${topic} - Travel Guide`,
              caption: aiImage.caption || topic,
              size: 0,
              usageCount: 1,
            } as any)
            .returning();

          return {
            url: aiImage.url,
            altText: aiImage.alt || `${topic} - Travel Guide`,
            imageId: savedImage.id,
            source: "library" as const,
          };
        }
      } catch (aiError) {
        console.error("AI image generation error:", aiError);
      }

      return null;
    }

    const bestResult = results[0];
    const imageUrl =
      bestResult.image?.source?.url || bestResult.preview?.url || bestResult.thumbnail?.url;

    if (!imageUrl) {
      return null;
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return null;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const filename = `freepik-${Date.now()}.jpg`;

    // Use unified storage manager (handles fallback automatically)
    const storageManager = getStorageManager();
    const storagePath = `public/images/${filename}`;
    const result = await storageManager.upload(storagePath, Buffer.from(imageBuffer));
    const persistedUrl = result.url;

    const altText = bestResult.title || `${topic} - Travel Guide`;

    const [savedImage] = await db
      .insert(aiGeneratedImages)
      .values({
        filename,
        url: persistedUrl,
        topic: topic,
        category: category || "general",
        imageType: "hero",
        source: "freepik" as const,
        prompt: null,
        keywords: keywords.slice(0, 10),
        altText: altText,
        caption: bestResult.title || topic,
        size: imageBuffer.byteLength,
        usageCount: 1,
      } as any)
      .returning();

    return {
      url: persistedUrl,
      altText: altText,
      imageId: savedImage.id,
      source: "freepik",
    };
  } catch (error) {
    return null;
  }
}

/**
 * Process image blocks in generated content - fetch images from Freepik/AI based on searchQuery
 */
export async function processImageBlocks(
  blocks: ContentBlock[],
  category: string = "general"
): Promise<ContentBlock[]> {
  const processedBlocks: ContentBlock[] = [];

  for (const block of blocks) {
    if (block.type === "image" && block.data) {
      const rawSearchQuery =
        block.data.searchQuery || block.data.query || block.data.alt || "dubai travel";
      const searchQuery = typeof rawSearchQuery === "string" ? rawSearchQuery : "dubai travel";

      try {
        // Use existing image finder function
        const imageResult = await findOrCreateArticleImage(
          searchQuery,
          [searchQuery, category],
          category
        );

        if (imageResult) {
          processedBlocks.push({
            ...block,
            data: {
              ...block.data,
              url: imageResult.url,
              imageUrl: imageResult.url,
              alt: block.data.alt || imageResult.altText,
              imageId: imageResult.imageId,
            },
          });
        } else {
          // Fallback to Unsplash placeholder
          const unsplashQuery = encodeURIComponent(
            searchQuery.replace(/dubai/gi, "").trim() || "travel"
          );
          processedBlocks.push({
            ...block,
            data: {
              ...block.data,
              url: `https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80`,
              imageUrl: `https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80`,
              alt: block.data.alt || `${searchQuery} - Travel`,
            },
          });
        }
      } catch (error) {
        // Keep block as-is with placeholder
        processedBlocks.push({
          ...block,
          data: {
            ...block.data,
            url: `https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80`,
            imageUrl: `https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80`,
          },
        });
      }
    } else {
      processedBlocks.push(block);
    }
  }

  return processedBlocks;
}

/**
 * DISABLED (January 2026): Automatic translation is permanently disabled.
 * All translations must be done manually via admin UI.
 * This function now returns immediately without performing any translation.
 */
export async function translateArticleToAllLanguages(
  contentId: string,
  content: {
    title: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    blocks?: ContentBlock[];
  }
): Promise<{ success: number; failed: number; errors: string[] }> {
  // HARD DISABLE: Automatic translation is permanently disabled
  return { success: 0, failed: 0, errors: ["Automatic translation is disabled"] };
}

export type AutoProcessResult = {
  feedsProcessed: number;
  itemsFound: number;
  clustersCreated: number;
  articlesGenerated: number;
  errors: string[];
};

/**
 * Automatically process RSS feeds and generate articles from topic clusters
 */
export async function autoProcessRssFeeds(): Promise<AutoProcessResult> {
  const result: AutoProcessResult = {
    feedsProcessed: 0,
    itemsFound: 0,
    clustersCreated: 0,
    articlesGenerated: 0,
    errors: [],
  };

  try {
    const feeds = await storage.getRssFeeds();
    const activeFeeds = feeds.filter(f => f.isActive);

    if (activeFeeds.length === 0) {
      return result;
    }

    for (const feed of activeFeeds) {
      try {
        const items = await parseRssFeed(feed.url);
        result.feedsProcessed++;
        result.itemsFound += items.length;

        for (const item of items) {
          const fingerprint = generateFingerprint(item.title, item.link);
          const existingFp = await storage.getContentFingerprintByHash(fingerprint);
          if (existingFp) {
            continue;
          }

          let cluster = await storage.findSimilarCluster(item.title);

          if (!cluster) {
            cluster = await storage.createTopicCluster({
              topic: item.title,
              status: "pending",
              articleCount: 0,
            });
            result.clustersCreated++;
          }

          await storage.createTopicClusterItem({
            clusterId: cluster.id,
            sourceTitle: item.title,
            sourceDescription: item.description || null,
            sourceUrl: item.link || null,
            rssFeedId: feed.id || null,
            pubDate: item.pubDate ? new Date(item.pubDate) : null,
          });

          try {
            await storage.createContentFingerprint({
              contentId: null,
              fingerprint: fingerprint,
              sourceUrl: item.link || null,
              sourceTitle: item.title,
              rssFeedId: feed.id || null,
            });
          } catch (e) {
            // Fingerprint might already exist
          }

          const clusterItems = await storage.getTopicClusterItems(cluster.id);
          await storage.updateTopicCluster(cluster.id, {
            articleCount: clusterItems.length,
            similarityScore:
              clusterItems.length > 1 ? Math.min(90, 50 + clusterItems.length * 10) : 50,
          });
        }
      } catch (feedError) {
        const errorMsg = `Failed to process feed "${feed.name}": ${feedError}`;
        result.errors.push(errorMsg);
      }
    }

    const pendingClusters = await storage.getTopicClusters({ status: "pending" });
    const unifiedProviders = getAllUnifiedProviders();

    if (unifiedProviders.length === 0) {
      return result;
    }

    // Prioritize Gemini for cost efficiency, then try other providers
    const sortedProviders = [...unifiedProviders].sort((a, b) => {
      if (a.name === "gemini") return -1;
      if (b.name === "gemini") return 1;
      // OpenAI is rate-limited, deprioritize it
      if (a.name === "openai") return 1;
      if (b.name === "openai") return -1;
      return 0;
    });

    // Daily limit to prevent API exhaustion - process max 5 articles per run
    const MAX_ARTICLES_PER_RUN = 5;
    const clustersToProcess = pendingClusters.slice(0, MAX_ARTICLES_PER_RUN);

    for (const cluster of clustersToProcess) {
      try {
        const items = await storage.getTopicClusterItems(cluster.id);
        if (items.length === 0) continue;

        const sources = items.map(item => ({
          title: item.sourceTitle,
          description: item.sourceDescription || "",
          url: item.sourceUrl || "",
          date: item.pubDate?.toISOString() || "",
        }));

        const combinedText = sources.map(s => `${s.title} ${s.description}`).join(" ");
        const category = determineContentCategory(combinedText);
        const sourceContent = sources.map(s => `${s.title}: ${s.description}`).join("\n\n");

        // Use centralized content rules system
        const systemPrompt = await getContentWriterSystemPrompt(category);
        const userPrompt = await buildArticleGenerationPrompt(
          cluster.topic || combinedText,
          sourceContent
        );

        // Generate article with validation and retries
        let validatedData: ArticleResponse | null = null;
        let attempts = 0;
        const maxAttempts = 3;
        let lastResponse: unknown = null;
        let lastErrors: string[] = [];
        let lastWordCount = 0;

        while (!validatedData && attempts < maxAttempts) {
          attempts++;

          const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ];

          // Add retry prompt if this is a retry
          if (attempts > 1 && lastErrors.length > 0) {
            const retryPrompt = await buildRetryPrompt(lastErrors, lastWordCount);
            messages.push({
              role: "user",
              content: retryPrompt,
            });
          }

          // Try each unified provider in fallback chain until one succeeds
          let completionSuccess = false;
          for (const provider of sortedProviders) {
            try {
              const result = await provider.generateCompletion({
                messages,
                model: provider.name === "openai" ? "gpt-4o" : provider.model,
                temperature: attempts === 1 ? 0.7 : 0.5,
                maxTokens: 12000,
                responseFormat: { type: "json_object" },
              });

              lastResponse = safeParseJson(result.content || "{}", {});
              completionSuccess = true;
              markProviderSuccess(provider.name); // Clear any failure states

              break; // Exit provider loop on success
            } catch (providerError: unknown) {
              const err = providerError as { status?: number; code?: string; message?: string };
              const isRateLimitError =
                err?.status === 429 ||
                err?.code === "insufficient_quota" ||
                err?.message?.includes("quota") ||
                err?.message?.includes("429");
              const isCreditsError =
                err?.status === 402 ||
                err?.message?.includes("credits") ||
                err?.message?.includes("Insufficient Balance") ||
                err?.message?.includes("insufficient_funds");

              if (isCreditsError) {
                markProviderFailed(provider.name, "no_credits");
              } else if (isRateLimitError) {
                markProviderFailed(provider.name, "rate_limited");
              }
              // Continue to next provider
            }
          }

          if (!completionSuccess) {
            break; // Exit attempts loop if no providers worked
          }

          const validation = await validateArticleResponse(lastResponse);

          if (validation.isValid && validation.data) {
            validatedData = validation.data;
          } else {
            lastErrors = validation.errors;
            lastWordCount = validation.wordCount;
          }
        }

        // If validation never passed, skip this cluster
        if (!validatedData) {
          const errorMsg = `Failed to generate valid article after ${maxAttempts} attempts for "${cluster.topic}". Last errors: ${lastErrors.join(", ")}`;
          result.errors.push(errorMsg);
          continue;
        }

        const mergedData = validatedData;

        const slug = (mergedData.title || cluster.topic)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 80);

        const textContent = mergedData.content || "";
        const wordCount = textContent
          .replace(/<[^>]*>/g, "")
          .split(/\s+/)
          .filter((w: string) => w.length > 0).length;

        // STEP 1: Fetch hero image BEFORE creating blocks
        const imageSearchTerms = mergedData.imageSearchTerms || [];
        const articleKeywords = mergedData.secondaryKeywords || [];
        const articleTopic = mergedData.title || cluster.topic;

        let heroImageUrl: string | null = null;
        let heroImageAlt: string | null = null;

        const searchAttempts = [
          imageSearchTerms,
          [articleTopic],
          articleKeywords.slice(0, 3),
          [category],
        ];

        for (const searchTerms of searchAttempts) {
          if (heroImageUrl) break;
          if (searchTerms.length === 0) continue;

          const searchQuery = searchTerms.join(" ");

          const articleImage = await findOrCreateArticleImage(
            searchQuery,
            searchTerms as string[],
            category
          );

          if (articleImage) {
            heroImageUrl = articleImage.url;
            heroImageAlt = articleImage.altText;
          }
        }

        // STEP 2: Create all content blocks with validated data
        let blocks: ContentBlock[] = [];
        let blockOrder = 0;
        const timestamp = Date.now();

        // Hero block
        blocks.push({
          id: `hero-${timestamp}-${blockOrder}`,
          type: "hero",
          data: {
            title: mergedData.title || cluster.topic,
            subtitle: mergedData.metaDescription || "",
            image: heroImageUrl || "",
            alt: heroImageAlt || "",
          },
          order: blockOrder++,
        });

        // Split main content into 3 sections for interspersed images
        const mainContent = mergedData.content || "";
        const paragraphs = mainContent.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
        const sectionSize = Math.ceil(paragraphs.length / 3);

        const section1 = paragraphs.slice(0, sectionSize).join("\n\n");
        const section2 = paragraphs.slice(sectionSize, sectionSize * 2).join("\n\n");
        const section3 = paragraphs.slice(sectionSize * 2).join("\n\n");

        // Highlights block
        const quickFacts = mergedData.quickFacts || [];
        if (quickFacts.length > 0) {
          blocks.push({
            id: `highlights-${timestamp}-${blockOrder}`,
            type: "highlights",
            data: {
              title: "Quick Facts",
              content: quickFacts.join("\n"),
              items: quickFacts,
            },
            order: blockOrder++,
          });
        }

        // Content section 1
        blocks.push({
          id: `text-${timestamp}-${blockOrder}`,
          type: "text",
          data: { heading: "", content: section1 },
          order: blockOrder++,
        });

        // Image block 1
        blocks.push({
          id: `image-${timestamp}-${blockOrder}`,
          type: "image",
          data: {
            searchQuery: `${category} tourism ${(mergedData.secondaryKeywords || [])[0] || "travel"}`,
            alt: `${category} - ${mergedData.title}`,
            caption: `Explore the best ${category}`,
          },
          order: blockOrder++,
        });

        // Content section 2
        blocks.push({
          id: `text-${timestamp}-${blockOrder}`,
          type: "text",
          data: { heading: "", content: section2 },
          order: blockOrder++,
        });

        // Image block 2
        blocks.push({
          id: `image-${timestamp}-${blockOrder}`,
          type: "image",
          data: {
            searchQuery: `${(mergedData.secondaryKeywords || [])[1] || "attractions"} travel experience`,
            alt: `Travel experience - ${mergedData.title}`,
            caption: `Discover unique experiences`,
          },
          order: blockOrder++,
        });

        // Content section 3
        blocks.push({
          id: `text-${timestamp}-${blockOrder}`,
          type: "text",
          data: { heading: "", content: section3 },
          order: blockOrder++,
        });

        // Image block 3
        blocks.push({
          id: `image-${timestamp}-${blockOrder}`,
          type: "image",
          data: {
            searchQuery: `${(mergedData.secondaryKeywords || [])[2] || "landmarks"} scenic view`,
            alt: `Scenic landmarks - ${mergedData.title}`,
            caption: `Stunning scenic views`,
          },
          order: blockOrder++,
        });

        // Tips block
        const proTips = mergedData.proTips || [];
        if (proTips.length > 0) {
          blocks.push({
            id: `tips-${timestamp}-${blockOrder}`,
            type: "tips",
            data: {
              title: "Pro Tips",
              content: proTips.join("\n"),
              tips: proTips,
            },
            order: blockOrder++,
          });
        }

        // FAQ block
        const faqs = mergedData.faqs || [];
        if (faqs.length > 0) {
          blocks.push({
            id: `faq-${timestamp}-${blockOrder}`,
            type: "faq",
            data: {
              title: "Frequently Asked Questions",
              questions: faqs.map(faq => ({
                question: faq.question,
                answer: faq.answer,
              })),
            },
            order: blockOrder++,
          });
        }

        // CTA block
        blocks.push({
          id: `cta-${timestamp}-${blockOrder}`,
          type: "cta",
          data: {
            title: "Plan Your Visit",
            content: "Ready to experience this? Start planning your adventure today!",
            buttonText: "Explore More",
            buttonLink: "/articles",
          },
          order: blockOrder++,
        });

        // Process image blocks to fetch real images from Freepik/AI
        blocks = await processImageBlocks(blocks, category);

        const content = await storage.createContent({
          title: mergedData.title || cluster.topic,
          slug: `${slug}-${Date.now()}`,
          type: "article",
          status: "draft",
          metaTitle: mergedData.title || cluster.topic,
          metaDescription: mergedData.metaDescription || null,
          primaryKeyword: mergedData.primaryKeyword || null,
          secondaryKeywords: mergedData.secondaryKeywords || [],
          blocks: blocks as any,
          wordCount: wordCount,
          heroImage: heroImageUrl,
          heroImageAlt: heroImageAlt,
        });

        const articleCategory =
          category === "food" || category === "restaurants" || category === "dining"
            ? "food"
            : category === "attractions" || category === "activities"
              ? "attractions"
              : category === "hotels" || category === "accommodation"
                ? "hotels"
                : category === "transport" ||
                    category === "transportation" ||
                    category === "logistics"
                  ? "transport"
                  : category === "events" || category === "festivals"
                    ? "events"
                    : category === "tips" || category === "guides"
                      ? "tips"
                      : category === "shopping" || category === "deals"
                        ? "shopping"
                        : "news";

        // Get personality info for article metadata
        const personalityKey = CATEGORY_PERSONALITY_MAPPING[category] || "A";
        const personalityData = CONTENT_WRITER_PERSONALITIES[personalityKey];

        await storage.createArticle({
          contentId: content.id,
          category: articleCategory as any,
          urgencyLevel: mergedData.urgencyLevel || "relevant",
          targetAudience: mergedData.targetAudience || [],
          personality: personalityKey,
          tone: personalityData?.style || "professional",
          quickFacts: mergedData.quickFacts || [],
          proTips: mergedData.proTips || [],
          warnings: mergedData.warnings || [],
          faq: mergedData.faqs || [],
        });

        for (const item of items) {
          if (item.sourceUrl) {
            const fp = generateFingerprint(item.sourceTitle, item.sourceUrl);
            try {
              await storage.createContentFingerprint({
                contentId: content.id,
                fingerprint: fp,
                sourceUrl: item.sourceUrl,
                sourceTitle: item.sourceTitle,
                rssFeedId: item.rssFeedId || null,
              });
            } catch (e) {
              // Already exists
            }
          }
          await storage.updateTopicClusterItem(item.id, { isUsedInMerge: true });
        }

        await storage.updateTopicCluster(cluster.id, {
          status: "merged",
          mergedContentId: content.id,
        });

        result.articlesGenerated++;
      } catch (clusterError) {
        const errorMsg = `Failed to generate article for cluster "${cluster.topic}": ${clusterError}`;
        result.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Auto-process failed: ${error}`;
    result.errors.push(errorMsg);
  }

  return result;
}
