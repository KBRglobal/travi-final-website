/**
 * Octypo Job Handler
 * Handles RSS content generation jobs ONLY
 *
 * NOTE: Attraction content generation is handled separately by:
 * - server/services/tiqets-background-generator.ts
 */

import { jobQueue } from "../job-queue";
import { db } from "../db";
import { rssFeeds, contents, articles, backgroundJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ContentData, GeneratedContent, ContentSource } from "./types";
import { rssReader, isSensitiveTopic, detectDestinationFromContent } from "./rss-reader";

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
}

type OctypoJobData = RSSJobData;

// ============================================
// CONTENT SAVING
// ============================================

async function saveGeneratedArticle(
  title: string,
  slug: string,
  destinationId: string,
  category: string,
  content: GeneratedContent,
  feedId: string,
  sourceUrl?: string,
  jobId?: string
): Promise<{ contentId: string; articleId: string }> {
  const calculatedWordCount = [content.introduction, content.body, content.conclusion]
    .filter(Boolean)
    .join(" ")
    .split(/\s+/).length;

  const [contentRecord] = await db
    .insert(contents)
    .values({
      type: "article",
      status: "published",
      title: title,
      slug: slug,
      metaTitle: content.metaTitle || title,
      metaDescription: content.metaDescription || content.introduction?.substring(0, 160),
      summary: content.introduction?.substring(0, 200),
      answerCapsule: content.answerCapsule,
      blocks: [
        { type: "text", contents: { text: content.introduction || "" } },
        { type: "text", contents: { text: content.body || "" } },
        { type: "text", contents: { text: content.conclusion || "" } },
      ].filter(b => b.contents.text),
      seoSchema: content.schemaPayload,
      generatedByAI: true,
      octopusJobId: jobId,
      wordCount: calculatedWordCount,
      publishedAt: new Date(),
    } as any)
    .returning();

  const [articleRecord] = await db
    .insert(articles)
    .values({
      contentId: contentRecord.id,
      category: category,
      sourceRssFeedId: feedId,
      sourceUrl: sourceUrl,
      excerpt: content.introduction?.substring(0, 200),
      publishDate: new Date(),
      relatedDestinationIds: destinationId ? [destinationId] : [],
      faq: content.faqs || [],
    } as any)
    .returning();

  return { contentId: contentRecord.id, articleId: articleRecord.id };
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
    console.error("[OctypoJobHandler] Failed to update job status:", err);
  }
}

// ============================================
// RSS CONTENT GENERATION
// ============================================

async function generateArticleFromRSS(
  title: string,
  summary: string,
  destination: string,
  category: string
): Promise<GeneratedContent> {
  // TODO: Implement actual AI content generation using writer agents
  // For now, return a basic structure that can be enhanced later

  const introduction = summary || `Learn more about ${title}.`;

  return {
    title,
    introduction,
    body: "", // Will be filled by AI writer
    conclusion: "",
    faqs: [],
    answerCapsule: "",
    metaTitle: title.substring(0, 70),
    metaDescription: introduction.substring(0, 160),
    schemaPayload: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: introduction.substring(0, 160),
    },
  };
}

async function processRSSJob(
  data: RSSJobData,
  jobId?: string
): Promise<{
  success: boolean;
  generated: number;
  skipped: number;
  errors: string[];
  contentIds: string[];
}> {
  console.log("[OctypoJobHandler] Processing RSS job for feed:", data.feedName);

  const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, data.feedId)).limit(1);

  if (!feed) {
    return {
      success: false,
      generated: 0,
      skipped: 0,
      errors: ["RSS feed not found in database"],
      contentIds: [],
    };
  }

  // Step 1: Fetch and store new items
  const fetchResult = await rssReader.fetchFeed(feed.id);
  if (fetchResult.errors.length > 0) {
    console.warn("[OctypoJobHandler] RSS fetch had errors:", fetchResult.errors);
  }

  // Step 2: Get unprocessed items
  const items = await rssReader.getUnprocessedItems(10, feed.id);
  if (items.length === 0) {
    console.log("[OctypoJobHandler] No unprocessed items found");
    return { success: true, generated: 0, skipped: 0, errors: [], contentIds: [] };
  }

  console.log(`[OctypoJobHandler] Found ${items.length} unprocessed items`);

  const defaultDestinationId = data.destination || feed.destinationId || null;
  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const contentIds: string[] = [];

  for (const item of items) {
    try {
      // Check for sensitive topics
      const sensitivityCheck = isSensitiveTopic(item.title, item.summary);
      if (sensitivityCheck.sensitive) {
        console.log(`[OctypoJobHandler] Skipping sensitive topic: ${item.title}`);
        await rssReader.markProcessed(item.id);
        skipped++;
        continue;
      }

      // Detect destination from content
      const detectedDestination = detectDestinationFromContent(item.title, item.summary);
      const destinationId = detectedDestination || defaultDestinationId || "global";

      // Generate slug
      const slug = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 100);

      // Check for duplicates
      const existingSlug = await db
        .select({ id: contents.id })
        .from(contents)
        .where(eq(contents.slug, slug))
        .limit(1);

      if (existingSlug.length > 0) {
        console.log(`[OctypoJobHandler] Slug already exists: ${slug}`);
        await rssReader.markProcessed(item.id);
        skipped++;
        continue;
      }

      // Generate content
      const category = data.category || feed.category || "news";
      const content = await generateArticleFromRSS(
        item.title,
        item.summary,
        destinationId,
        category
      );

      // Save to database
      const saved = await saveGeneratedArticle(
        item.title,
        slug,
        destinationId,
        category,
        content,
        feed.id,
        item.url,
        jobId
      );

      contentIds.push(saved.contentId);
      generated++;

      // Mark as processed
      await rssReader.markProcessed(item.id, saved.contentId);
      console.log(`[OctypoJobHandler] Generated article: ${item.title}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Error processing: ${item.title} - ${errorMsg}`);
    }
  }

  console.log(`[OctypoJobHandler] RSS job complete: ${generated} generated, ${skipped} skipped`);
  return { success: generated > 0 || skipped > 0, generated, skipped, errors, contentIds };
}

// ============================================
// JOB HANDLER MAIN
// ============================================

async function handleOctypoJob(
  data: OctypoJobData,
  jobId?: string
): Promise<{ success: boolean; result: unknown }> {
  console.log("[OctypoJobHandler] Handling job:", data.jobType);

  let result: {
    success: boolean;
    generated: number;
    skipped?: number;
    errors: string[];
    contentIds: string[];
  };

  switch (data.jobType) {
    case "rss-content-generation":
      result = await processRSSJob(data, jobId);
      break;
    default:
      console.error("[OctypoJobHandler] Unknown job type:", (data as any).jobType);
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
      { generated: result.generated, contentIds: result.contentIds },
      result.errors.length > 0 ? result.errors.join("; ") : undefined
    );
  }

  return {
    success: result.success,
    result: {
      generated: result.generated,
      contentIds: result.contentIds,
      errors: result.errors,
    },
  };
}

export function registerOctypoJobHandler(): void {
  console.log("[OctypoJobHandler] Registering RSS content generation handler");

  jobQueue.registerHandler<OctypoJobData>("ai_generate", async data => {
    // Only handle RSS jobs - other types should use their dedicated handlers
    if ((data as any).jobType === "rss-content-generation") {
      return handleOctypoJob(data as OctypoJobData);
    }

    // For non-RSS jobs, return failure
    console.warn("[OctypoJobHandler] Non-RSS job received - use dedicated handler instead");
    return {
      success: false,
      result: {
        error: "Only RSS content generation is supported. Use dedicated handlers for attractions.",
      },
    };
  });

  jobQueue.start();
  console.log("[OctypoJobHandler] Job handler registered and started");
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
