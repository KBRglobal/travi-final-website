/**
 * Gatekeeper Job Handlers
 * Integrates with the existing job queue system
 */

import { jobQueue, JobType } from "../../job-queue";
import { db } from "../../db";
import { contents, articles } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { getGatekeeperOrchestrator } from "./orchestrator";
import { getOctypoOrchestrator } from "../orchestration/orchestrator";
import { onContentStatusChange } from "../../localization/publish-hooks";
import { logger } from "../../lib/logger";

// ============================================
// JOB TYPE DEFINITIONS
// ============================================

interface GatekeeperWriteJobData {
  feedItemId: string;
  title: string;
  summary: string;
  sourceUrl: string;
  category?: string;
  destinationId?: string;
  writerId: string;
  tier: "S1" | "S2" | "S3";
  gate1Score: number;
  gate1Reasoning: string;
}

interface GatekeeperRevisionJobData {
  contentId: string;
  revisionPrompt: string;
  corrections: any[];
  revisionCount: number;
  maxRevisions: number;
}

interface GatekeeperReviewJobData {
  contentId: string;
  revisionCount?: number;
}

// ============================================
// WRITE JOB HANDLER
// Called after Gate 1 approves an RSS item
// ============================================

async function handleWriteJob(
  data: GatekeeperWriteJobData
): Promise<{ success: boolean; result: any }> {
  logger.info(
    {
      feedItemId: data.feedItemId,
      title: data.title.substring(0, 50),
      writer: data.writerId,
      tier: data.tier,
    },
    "[Gatekeeper] Handling write job"
  );

  try {
    const orchestrator = getOctypoOrchestrator();

    // Generate unique slug
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Build attraction data for the orchestrator
    const attractionData = {
      id: Date.now(),
      title: data.title,
      venueName: data.title,
      cityName: data.destinationId || "global",
      primaryCategory: data.category || "news",
      description: data.summary,
      sourceUrl: data.sourceUrl,
      contentType: "news-article",
      // Pass writer preference
      preferredWriterId: data.writerId,
    };

    // Generate content
    const result = await orchestrator.generateAttractionContent(attractionData as any);

    if (!result.success || !result.content) {
      logger.error(
        {
          feedItemId: data.feedItemId,
          error: result.error,
        },
        "[Gatekeeper] Content generation failed"
      );
      return { success: false, result: { error: result.error } };
    }

    // Calculate word count from actual content fields
    const allText = [result.content.introduction, result.content.body, result.content.conclusion]
      .filter(Boolean)
      .join(" ");
    const wordCount = allText.split(/\s+/).length;

    // Save as draft (Gate 2 will approve)
    const [contentRecord] = await db
      .insert(contents)
      .values({
        type: "article",
        status: "draft", // Always draft - Gate 2 will approve
        title: data.title,
        slug,
        metaTitle: result.content.metaTitle || data.title.substring(0, 70),
        metaDescription:
          result.content.metaDescription || result.content.introduction?.substring(0, 160),
        summary: result.content.introduction?.substring(0, 200),
        answerCapsule: result.content.answerCapsule,
        blocks: buildContentBlocks(result.content),
        seoSchema: result.content.schemaPayload,
        generatedByAI: true,
        writerId: data.writerId,
        wordCount,
      } as any)
      .returning();

    // Create article record
    const [articleRecord] = await db
      .insert(articles)
      .values({
        contentId: contentRecord.id,
        category: data.category || "news",
        sourceUrl: data.sourceUrl,
        excerpt: result.content.introduction?.substring(0, 200),
        relatedDestinationIds: data.destinationId ? [data.destinationId] : [],
        faq: result.content.faqs || [],
      } as any)
      .returning();

    // Update RSS item with content ID (using raw SQL since table is created dynamically)
    await db.execute(sql`
      UPDATE rss_feed_items
      SET processed = TRUE, content_id = ${contentRecord.id}, processed_at = NOW()
      WHERE id = ${data.feedItemId}
    `);

    logger.info(
      {
        contentId: contentRecord.id,
        wordCount,
      },
      "[Gatekeeper] Article written, queuing for Gate 2 review"
    );

    // Queue Gate 2 review
    await jobQueue.addJob(
      "gatekeeper_review" as JobType,
      {
        contentId: contentRecord.id,
        revisionCount: 0,
      },
      { priority: data.tier === "S1" ? 1 : data.tier === "S2" ? 2 : 4 }
    );

    return {
      success: true,
      result: {
        contentId: contentRecord.id,
        articleId: articleRecord.id,
        wordCount,
      },
    };
  } catch (error) {
    logger.error(
      {
        feedItemId: data.feedItemId,
        error: error instanceof Error ? error.message : "Unknown",
      },
      "[Gatekeeper] Write job failed"
    );
    return {
      success: false,
      result: { error: error instanceof Error ? error.message : "Unknown" },
    };
  }
}

// ============================================
// REVIEW JOB HANDLER
// Gate 2: Reviews written article
// ============================================

async function handleReviewJob(
  data: GatekeeperReviewJobData
): Promise<{ success: boolean; result: any }> {
  logger.info(
    {
      contentId: data.contentId,
      revisionCount: data.revisionCount || 0,
    },
    "[Gatekeeper] Handling review job (Gate 2)"
  );

  try {
    const orchestrator = getGatekeeperOrchestrator();
    const result = await orchestrator.reviewArticle(data.contentId, data.revisionCount || 0);

    logger.info(
      {
        contentId: data.contentId,
        decision: result.decision,
        quality: result.overallQuality,
      },
      "[Gatekeeper] Review complete"
    );

    // If approved, trigger publish hooks for localization
    if (result.decision === "approve") {
      try {
        // Update status to approved
        await db
          .update(contents)
          .set({
            status: "approved",
            publishedAt: new Date(),
            updatedAt: new Date(),
          } as any)
          .where(eq(contents.id, data.contentId));

        // Trigger localization
        await onContentStatusChange(data.contentId, "approved");
        logger.info(
          { contentId: data.contentId },
          "[Gatekeeper] Triggered localization for approved article"
        );
      } catch (err) {
        logger.error(
          { contentId: data.contentId, error: err },
          "[Gatekeeper] Failed to trigger localization"
        );
      }
    }

    return {
      success: true,
      result: {
        decision: result.decision,
        quality: result.overallQuality,
        issues: result.issues?.length || 0,
      },
    };
  } catch (error) {
    logger.error(
      {
        contentId: data.contentId,
        error: error instanceof Error ? error.message : "Unknown",
      },
      "[Gatekeeper] Review job failed"
    );
    return {
      success: false,
      result: { error: error instanceof Error ? error.message : "Unknown" },
    };
  }
}

// ============================================
// REVISION JOB HANDLER
// Sends article back to writer with corrections
// ============================================

async function handleRevisionJob(
  data: GatekeeperRevisionJobData
): Promise<{ success: boolean; result: any }> {
  logger.info(
    {
      contentId: data.contentId,
      revisionCount: data.revisionCount,
    },
    "[Gatekeeper] Handling revision job"
  );

  try {
    // Fetch original content
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, data.contentId),
    });

    if (!content) {
      return { success: false, result: { error: "Content not found" } };
    }

    const orchestrator = getOctypoOrchestrator();

    // Generate revised content
    const result = await orchestrator.generateAttractionContent({
      id: Date.now(),
      title: content.title,
      venueName: content.title,
      cityName: "global",
      primaryCategory: "news",
      description: data.revisionPrompt, // Pass revision instructions as context
      contentType: "revision",
      originalContent: content.blocks,
      corrections: data.corrections,
    } as any);

    if (!result.success || !result.content) {
      logger.error({ contentId: data.contentId }, "[Gatekeeper] Revision generation failed");
      return { success: false, result: { error: "Revision generation failed" } };
    }

    // Calculate word count from actual content fields
    const allText = [result.content.introduction, result.content.body, result.content.conclusion]
      .filter(Boolean)
      .join(" ");
    const wordCount = allText.split(/\s+/).length;

    // Update content
    await db
      .update(contents)
      .set({
        metaTitle: result.content.metaTitle || content.metaTitle,
        metaDescription: result.content.metaDescription || content.metaDescription,
        summary: result.content.introduction?.substring(0, 200) || content.summary,
        answerCapsule: result.content.answerCapsule || content.answerCapsule,
        blocks: buildContentBlocks(result.content),
        wordCount,
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, data.contentId));

    logger.info(
      { contentId: data.contentId },
      "[Gatekeeper] Revision complete, queuing for re-review"
    );

    // Queue for Gate 2 re-review
    await jobQueue.addJob(
      "gatekeeper_review" as JobType,
      {
        contentId: data.contentId,
        revisionCount: data.revisionCount,
      },
      { priority: 2 } // High priority for revisions
    );

    return {
      success: true,
      result: {
        contentId: data.contentId,
        revisionCount: data.revisionCount,
      },
    };
  } catch (error) {
    logger.error(
      {
        contentId: data.contentId,
        error: error instanceof Error ? error.message : "Unknown",
      },
      "[Gatekeeper] Revision job failed"
    );
    return {
      success: false,
      result: { error: error instanceof Error ? error.message : "Unknown" },
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildContentBlocks(content: any): any[] {
  const blocks: any[] = [];

  if (content.introduction) {
    blocks.push({
      type: "text",
      id: `intro-${Date.now()}`,
      data: { content: content.introduction },
    });
  }

  if (content.body) {
    blocks.push({
      type: "text",
      id: `body-${Date.now()}`,
      data: { content: content.body },
    });
  }

  if (content.conclusion) {
    blocks.push({
      type: "text",
      id: `conclusion-${Date.now()}`,
      data: { content: content.conclusion },
    });
  }

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

// ============================================
// REGISTER HANDLERS
// ============================================

export function registerGatekeeperJobHandlers(): void {
  logger.info("[Gatekeeper] Registering job handlers");

  // Handler for writing new articles (after Gate 1 approval)
  jobQueue.registerHandler<GatekeeperWriteJobData>("octypo_write" as JobType, async data => {
    return handleWriteJob(data);
  });

  // Handler for Gate 2 review
  jobQueue.registerHandler<GatekeeperReviewJobData>("gatekeeper_review" as JobType, async data => {
    return handleReviewJob(data);
  });

  // Handler for revisions
  jobQueue.registerHandler<GatekeeperRevisionJobData>(
    "gatekeeper_revision" as JobType,
    async data => {
      return handleRevisionJob(data);
    }
  );

  // Handler for rewrite (similar to revision)
  jobQueue.registerHandler<{ contentId: string; revisionPrompt: string; revisionCount: number }>(
    "octypo_rewrite" as JobType,
    async data => {
      return handleRevisionJob({
        ...data,
        corrections: [],
        maxRevisions: 3,
      });
    }
  );

  logger.info("[Gatekeeper] Job handlers registered");
}
