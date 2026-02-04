/**
 * Octypo Job Handler v2
 *
 * Handles RSS content generation jobs using the full Octypo orchestrator
 *
 * Key features:
 * - Uses real AI content generation via orchestrator
 * - Quality 108 scoring and validation
 * - SEO/AEO optimization
 * - Auto-triggers localization via publish hooks
 */

import { jobQueue } from "../job-queue";
import { db } from "../db";
import { rssFeeds, contents, articles, backgroundJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { GeneratedContent } from "./types";
import { rssReader, isSensitiveTopic, detectDestinationFromContent } from "./rss-reader";
import { getOctypoOrchestrator } from "./orchestration/orchestrator";
import { onContentStatusChange } from "../localization/publish-hooks";
import { log } from "../lib/logger";

// ============================================
// JOB TYPE DEFINITIONS
// ============================================

interface RSSJobData {
  jobType: "rss-content-generation";
  feedId: string;
  feedUrl: string;
  feedName: string;
  destination?: string;
  category?: string;
  locale?: "en" | "ar" | "fr";
  minQualityScore?: number;
  currentDestinationCount?: number;
  maxForDestination?: number;
}

type OctypoJobData = RSSJobData;

// ============================================
// CONTENT SAVING WITH PUBLISH HOOKS
// ============================================

async function saveGeneratedArticle(
  title: string,
  slug: string,
  destinationId: string,
  category: string,
  content: GeneratedContent,
  feedId: string,
  sourceUrl?: string,
  jobId?: string,
  qualityScore?: number,
  autoPublish: boolean = false
): Promise<{ contentId: string; articleId: string; published: boolean }> {
  // Calculate word count
  const allText = [
    content.introduction,
    content.whatToExpect,
    content.visitorTips,
    content.howToGetThere,
    content.body,
    content.conclusion,
  ]
    .filter(Boolean)
    .join(" ");
  const calculatedWordCount = allText.split(/\s+/).length;

  // Determine status based on quality score
  const status = autoPublish && qualityScore && qualityScore >= 85 ? "published" : "draft";

  // Create content record
  const [contentRecord] = await db
    .insert(contents)
    .values({
      type: "article",
      status,
      title: title,
      slug: slug,
      metaTitle: content.metaTitle || title.substring(0, 70),
      metaDescription: content.metaDescription || content.introduction?.substring(0, 160),
      summary: content.introduction?.substring(0, 200),
      answerCapsule: content.answerCapsule,
      blocks: buildContentBlocks(content),
      seoSchema: content.schemaPayload,
      generatedByAI: true,
      octopusJobId: jobId,
      wordCount: calculatedWordCount,
      publishedAt: status === "published" ? new Date() : null,
      quality108Score: qualityScore,
    } as any)
    .returning();

  // Create article record
  const [articleRecord] = await db
    .insert(articles)
    .values({
      contentId: contentRecord.id,
      category: category,
      sourceRssFeedId: feedId,
      sourceUrl: sourceUrl,
      excerpt: content.introduction?.substring(0, 200),
      publishDate: status === "published" ? new Date() : null,
      relatedDestinationIds: destinationId ? [destinationId] : [],
      faq: content.faqs || [],
    } as any)
    .returning();

  // Trigger publish hooks if published (for localization)
  if (status === "published") {
    try {
      await onContentStatusChange(contentRecord.id, "published");
      log.info(`[OctypoJobHandler] Triggered publish hooks for ${contentRecord.id}`);
    } catch (err) {
      log.error(`[OctypoJobHandler] Publish hooks failed:`, err);
    }
  }

  return {
    contentId: contentRecord.id,
    articleId: articleRecord.id,
    published: status === "published",
  };
}

function buildContentBlocks(content: GeneratedContent): any[] {
  const blocks: any[] = [];

  if (content.introduction) {
    blocks.push({
      type: "text",
      id: `intro-${Date.now()}`,
      data: { content: content.introduction },
    });
  }

  if (content.whatToExpect) {
    blocks.push({
      type: "heading",
      id: `h-expect-${Date.now()}`,
      data: { text: "What to Expect", level: 2 },
    });
    blocks.push({
      type: "text",
      id: `expect-${Date.now()}`,
      data: { content: content.whatToExpect },
    });
  }

  if (content.visitorTips) {
    blocks.push({
      type: "heading",
      id: `h-tips-${Date.now()}`,
      data: { text: "Visitor Tips", level: 2 },
    });
    blocks.push({
      type: "text",
      id: `tips-${Date.now()}`,
      data: { content: content.visitorTips },
    });
  }

  if (content.howToGetThere) {
    blocks.push({
      type: "heading",
      id: `h-directions-${Date.now()}`,
      data: { text: "How to Get There", level: 2 },
    });
    blocks.push({
      type: "text",
      id: `directions-${Date.now()}`,
      data: { content: content.howToGetThere },
    });
  }

  // Add FAQ section if available
  if (content.faqs && content.faqs.length > 0) {
    blocks.push({
      type: "heading",
      id: `h-faq-${Date.now()}`,
      data: { text: "Frequently Asked Questions", level: 2 },
    });
    blocks.push({
      type: "faq",
      id: `faq-${Date.now()}`,
      data: { items: content.faqs },
    });
  }

  return blocks;
}

async function updateJobStatus(
  jobId: string,
  status: "completed" | "failed",
  result?: unknown,
  error?: string
): Promise<void> {
  try {
    await db
      .update(backgroundJobs)
      .set({
        status,
        result: result,
        error: error,
        completedAt: new Date(),
      } as any)
      .where(eq(backgroundJobs.id, jobId));
  } catch (err) {
    log.error("[OctypoJobHandler] Failed to update job status:", err);
  }
}

// ============================================
// RSS CONTENT GENERATION (USING ORCHESTRATOR)
// ============================================

async function generateArticleUsingOrchestrator(
  title: string,
  summary: string,
  destination: string,
  category: string,
  sourceUrl?: string
): Promise<{ content: GeneratedContent | null; qualityScore: number; passed: boolean }> {
  try {
    const orchestrator = getOctypoOrchestrator();

    // Create attraction-like data for the orchestrator
    const attractionData = {
      id: Date.now(),
      title: title,
      venueName: title,
      cityName: destination,
      primaryCategory: category,
      description: summary,
      // Add more context for better generation
      sourceUrl,
      contentType: "news-article",
    };

    log.info(`[OctypoJobHandler] Generating content for: ${title}`);

    const result = await orchestrator.generateAttractionContent(attractionData as any);

    if (result.success && result.content) {
      return {
        content: result.content,
        qualityScore: result.qualityScore?.overallScore || 0,
        passed: result.qualityScore?.passed || false,
      };
    } else {
      log.warn(`[OctypoJobHandler] Generation failed: ${result.error || "Unknown error"}`);
      return { content: null, qualityScore: 0, passed: false };
    }
  } catch (error) {
    log.error(`[OctypoJobHandler] Orchestrator error:`, error);
    return { content: null, qualityScore: 0, passed: false };
  }
}

async function processRSSJob(
  data: RSSJobData,
  jobId?: string
): Promise<{
  success: boolean;
  generated: number;
  published: number;
  skipped: number;
  errors: string[];
  contentIds: string[];
}> {
  log.info(`[OctypoJobHandler] Processing RSS job for feed: ${data.feedName}`);

  const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, data.feedId)).limit(1);

  if (!feed) {
    return {
      success: false,
      generated: 0,
      published: 0,
      skipped: 0,
      errors: ["RSS feed not found in database"],
      contentIds: [],
    };
  }

  // Step 1: Fetch and store new items from RSS
  const fetchResult = await rssReader.fetchFeed(feed.id);
  if (fetchResult.errors.length > 0) {
    log.warn("[OctypoJobHandler] RSS fetch had errors:", fetchResult.errors);
  }

  // Step 2: Get unprocessed items (limit to respect per-destination quota)
  const maxItems = data.maxForDestination
    ? Math.max(1, data.maxForDestination - (data.currentDestinationCount || 0))
    : 3;

  const items = await rssReader.getUnprocessedItems(maxItems, feed.id);
  if (items.length === 0) {
    log.info("[OctypoJobHandler] No unprocessed items found");
    return { success: true, generated: 0, published: 0, skipped: 0, errors: [], contentIds: [] };
  }

  log.info(`[OctypoJobHandler] Found ${items.length} unprocessed items`);

  const defaultDestinationId = data.destination || feed.destinationId || null;
  const minQualityScore = data.minQualityScore || 85;

  let generated = 0;
  let published = 0;
  let skipped = 0;
  const errors: string[] = [];
  const contentIds: string[] = [];

  for (const item of items) {
    try {
      // Check for sensitive topics
      const sensitivityCheck = isSensitiveTopic(item.title, item.summary);
      if (sensitivityCheck.sensitive) {
        log.info(`[OctypoJobHandler] Skipping sensitive topic: ${item.title}`);
        await rssReader.markProcessed(item.id);
        skipped++;
        continue;
      }

      // Detect destination from content
      const detectedDestination = detectDestinationFromContent(item.title, item.summary);
      const destinationId = detectedDestination || defaultDestinationId || "global";

      // Generate unique slug
      const baseSlug = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 80);
      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      // Check for duplicate title
      const existingContent = await db
        .select({ id: contents.id })
        .from(contents)
        .where(eq(contents.title, item.title))
        .limit(1);

      if (existingContent.length > 0) {
        log.info(`[OctypoJobHandler] Title already exists: ${item.title}`);
        await rssReader.markProcessed(item.id);
        skipped++;
        continue;
      }

      // Generate content using orchestrator
      const category = data.category || feed.category || "news";
      const { content, qualityScore, passed } = await generateArticleUsingOrchestrator(
        item.title,
        item.summary,
        destinationId,
        category,
        item.url
      );

      if (!content) {
        log.warn(`[OctypoJobHandler] Failed to generate content for: ${item.title}`);
        errors.push(`Generation failed: ${item.title}`);
        await rssReader.markProcessed(item.id);
        continue;
      }

      // Determine if should auto-publish
      const shouldAutoPublish = passed && qualityScore >= minQualityScore;

      // Save to database
      const saved = await saveGeneratedArticle(
        item.title,
        slug,
        destinationId,
        category,
        content,
        feed.id,
        item.url,
        jobId,
        qualityScore,
        shouldAutoPublish
      );

      contentIds.push(saved.contentId);
      generated++;
      if (saved.published) {
        published++;
      }

      // Mark as processed
      await rssReader.markProcessed(item.id, saved.contentId);

      log.info(`[OctypoJobHandler] Generated article: ${item.title}`, {
        contentId: saved.contentId,
        qualityScore,
        published: saved.published,
        destination: destinationId,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Error processing: ${item.title} - ${errorMsg}`);
      log.error(`[OctypoJobHandler] Error processing item:`, error);
    }
  }

  log.info(`[OctypoJobHandler] RSS job complete`, {
    generated,
    published,
    skipped,
    errors: errors.length,
  });

  return {
    success: generated > 0 || skipped > 0,
    generated,
    published,
    skipped,
    errors,
    contentIds,
  };
}

// ============================================
// JOB HANDLER MAIN
// ============================================

async function handleOctypoJob(
  data: OctypoJobData,
  jobId?: string
): Promise<{ success: boolean; result: unknown }> {
  log.info("[OctypoJobHandler] Handling job:", data.jobType);

  let result: {
    success: boolean;
    generated: number;
    published?: number;
    skipped?: number;
    errors: string[];
    contentIds: string[];
  };

  switch (data.jobType) {
    case "rss-content-generation":
      result = await processRSSJob(data, jobId);
      break;
    default:
      log.error("[OctypoJobHandler] Unknown job type:", (data as any).jobType);
      result = {
        success: false,
        generated: 0,
        errors: ["Unknown job type - only rss-content-generation is supported"],
        contentIds: [],
      };
  }

  if (jobId) {
    await updateJobStatus(
      jobId,
      result.success ? "completed" : "failed",
      {
        generated: result.generated,
        published: result.published,
        contentIds: result.contentIds,
      },
      result.errors.length > 0 ? result.errors.join("; ") : undefined
    );
  }

  return {
    success: result.success,
    result: {
      generated: result.generated,
      published: result.published,
      contentIds: result.contentIds,
      errors: result.errors,
    },
  };
}

export function registerOctypoJobHandler(): void {
  log.info("[OctypoJobHandler] Registering RSS content generation handler");

  jobQueue.registerHandler<OctypoJobData>("ai_generate", async data => {
    // Only handle RSS jobs - other types should use their dedicated handlers
    if ((data as any).jobType === "rss-content-generation") {
      return handleOctypoJob(data as OctypoJobData);
    }

    // For non-RSS jobs, return failure
    log.warn("[OctypoJobHandler] Non-RSS job received - use dedicated handler instead");
    return {
      success: false,
      result: {
        error: "Only RSS content generation is supported. Use dedicated handlers for attractions.",
      },
    };
  });

  jobQueue.start();
  log.info("[OctypoJobHandler] Job handler registered and started");
}

export async function manuallyProcessRSSJob(
  jobId: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    const job = await jobQueue.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (job.type !== "ai_generate" || (job.data as any).jobType !== "rss-content-generation") {
      return { success: false, error: "Only RSS content generation jobs are supported" };
    }

    await db
      .update(backgroundJobs)
      .set({ status: "processing", startedAt: new Date() } as any)
      .where(eq(backgroundJobs.id, jobId));

    const result = await handleOctypoJob(job.data as OctypoJobData, jobId);
    return { success: result.success, result: result.result };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await updateJobStatus(jobId, "failed", undefined, errorMsg);
    return { success: false, error: errorMsg };
  }
}
