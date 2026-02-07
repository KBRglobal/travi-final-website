/**
 * Gatekeeper Orchestrator
 * Manages the complete autonomous content pipeline:
 * RSS → Gate1 (Selection) → Writer → Gate2 (Approval) → Publish
 *
 * Zero human touch. Fully autonomous.
 */

import { db } from "../../db";
import { contents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { Gate1Selector, getGate1Selector } from "./gate1-selector";

/** Convert tier to job priority (lower = higher priority) */
function tierToPriority(tier: string): number {
  if (tier === "S1") return 1;
  if (tier === "S2") return 3;
  return 5;
}
import { Gate2Approver, getGate2Approver } from "./gate2-approver";
import { getAttractionDetector } from "./attraction-detector";
import {
  ContentSelectionInput,
  ContentSelectionResult,
  ArticleApprovalInput,
  ArticleApprovalResult,
  GatekeeperConfig,
  DEFAULT_GATEKEEPER_CONFIG,
} from "./types";
import { logger } from "../../lib/logger";
import { jobQueue, JobType } from "../../job-queue";
import { rssReader, FeedItem } from "../rss-reader";

interface PipelineStats {
  itemsEvaluated: number;
  itemsApprovedForWriting: number;
  itemsSkipped: number;
  articlesWritten: number;
  articlesApproved: number;
  articlesRevised: number;
  articlesRejected: number;
  articlesPublished: number;
}

export class GatekeeperOrchestrator {
  private readonly config: GatekeeperConfig;
  private readonly gate1: Gate1Selector;
  private readonly gate2: Gate2Approver;
  private stats: PipelineStats;
  private isRunning: boolean = false;

  constructor(config: Partial<GatekeeperConfig> = {}) {
    this.config = { ...DEFAULT_GATEKEEPER_CONFIG, ...config };
    this.gate1 = getGate1Selector(this.config);
    this.gate2 = getGate2Approver(this.config);
    this.stats = this.initStats();
  }

  private initStats(): PipelineStats {
    return {
      itemsEvaluated: 0,
      itemsApprovedForWriting: 0,
      itemsSkipped: 0,
      articlesWritten: 0,
      articlesApproved: 0,
      articlesRevised: 0,
      articlesRejected: 0,
      articlesPublished: 0,
    };
  }

  /**
   * Main pipeline: Process unprocessed RSS items
   */
  async runPipeline(maxItems: number = 10): Promise<PipelineStats> {
    if (this.isRunning) {
      logger.warn("[Gatekeeper] Pipeline already running, skipping");
      return this.stats;
    }

    this.isRunning = true;
    this.stats = this.initStats();

    logger.info({ maxItems }, "[Gatekeeper] Starting autonomous pipeline");

    try {
      // Step 1: Fetch unprocessed RSS items
      const items = await this.fetchUnprocessedItems(maxItems);
      logger.info({ count: items.length }, "[Gatekeeper] Fetched unprocessed items");

      if (items.length === 0) {
        logger.info("[Gatekeeper] No items to process");
        return this.stats;
      }

      // Step 2: Run Gate 1 (Selection) on each item
      for (const item of items) {
        await this.processItem(item);
      }

      logger.info({ stats: this.stats }, "[Gatekeeper] Pipeline complete");
      return this.stats;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : "Unknown",
        },
        "[Gatekeeper] Pipeline failed"
      );
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single RSS item through the full pipeline
   */
  private async processItem(item: FeedItem): Promise<void> {
    const input: ContentSelectionInput = {
      feedItemId: item.id,
      title: item.title,
      summary: item.summary || "",
      sourceUrl: item.url,
      sourceName: item.source || "Unknown",
      category: item.category,
      publishedDate: item.publishedDate ? new Date(item.publishedDate) : undefined,
      // destinationId will be detected from content by Gate1 or determined later
    };

    try {
      // Gate 1: Evaluate and decide
      const selection = await this.gate1.evaluate(input);
      this.stats.itemsEvaluated++;

      // Save Gate 1 decision
      await this.saveGate1Decision(item.id, selection);

      if (selection.decision === "skip") {
        this.stats.itemsSkipped++;
        await this.markItemProcessed(item.id, null, "skipped");
        logger.info(
          {
            feedItemId: item.id,
            title: item.title.substring(0, 50),
            score: selection.totalScore,
            reason: selection.reasoning,
          },
          "[Gatekeeper] Item skipped"
        );
        return;
      }

      if (selection.decision === "queue") {
        // Queue for later processing (S3 items)
        await this.queueForLater(item.id, selection);
        return;
      }

      // Decision is 'write' - proceed to writing
      this.stats.itemsApprovedForWriting++;

      // Check if this is an attraction (from Gate1 contentType or attraction detector)
      if (selection.contentType === "attraction") {
        await this.queueAttractionWritingJob(item, selection);
      } else {
        // Run attraction detector as a secondary check for non-classified items
        try {
          const detector = getAttractionDetector();
          const detection = await detector.detect({
            id: item.id,
            title: item.title,
            summary: item.summary || "",
            url: item.url,
            category: item.category,
          });

          if (detection.isAttraction && detection.confidence >= 70) {
            await this.queueAttractionWritingJob(item, selection, detection);
            return;
          }
        } catch (detectionError) {
          // Attraction detection is non-critical, continue with regular write
          logger.warn(
            { feedItemId: item.id },
            "[Gatekeeper] Attraction detection failed, falling back to article"
          );
        }

        // Queue regular writing job
        await this.queueWritingJob(item, selection);
      }
    } catch (error) {
      logger.error(
        {
          feedItemId: item.id,
          error: error instanceof Error ? error.message : "Unknown",
        },
        "[Gatekeeper] Item processing failed"
      );
      // Mark as failed but don't block pipeline
      await this.markItemProcessed(item.id, null, "failed");
    }
  }

  /**
   * Gate 2: Review a written article
   * Called after writer completes
   */
  async reviewArticle(
    contentId: string,
    revisionCount: number = 0
  ): Promise<ArticleApprovalResult> {
    logger.info({ contentId, revisionCount }, "[Gatekeeper] Gate 2: Reviewing article");

    // Fetch article content
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const input: ArticleApprovalInput = {
      contentId: content.id,
      title: content.title,
      metaTitle: content.metaTitle || content.title,
      metaDescription: content.metaDescription || "",
      summary: content.summary || "",
      answerCapsule: content.answerCapsule || undefined,
      blocks: (content.blocks as any[]) || [],
      wordCount: content.wordCount || 0,
      writerId: content.writerId || "",
    };

    // Run Gate 2 review
    const result = await this.gate2.review(input, revisionCount);

    // Handle decision
    await this.handleGate2Decision(contentId, result, revisionCount);

    return result;
  }

  /**
   * Handle Gate 2 decision
   */
  private async handleGate2Decision(
    contentId: string,
    result: ArticleApprovalResult,
    revisionCount: number
  ): Promise<void> {
    switch (result.decision) {
      case "approve":
        this.stats.articlesApproved++;
        await this.approveForPublication(contentId);
        break;

      case "revise":
        this.stats.articlesRevised++;
        await this.sendForRevision(contentId, result, revisionCount);
        break;

      case "reject":
        this.stats.articlesRejected++;
        await this.rejectArticle(contentId, result.reasoning);
        break;
    }
  }

  /**
   * Approve article for publication
   */
  private async approveForPublication(contentId: string): Promise<void> {
    logger.info({ contentId }, "[Gatekeeper] Approving for publication");

    await db
      .update(contents)
      .set({
        status: "approved",
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));

    // The publish hooks will handle localization automatically
    // when status changes to 'approved'

    this.stats.articlesPublished++;
  }

  /**
   * Send article back for revision
   */
  private async sendForRevision(
    contentId: string,
    result: ArticleApprovalResult,
    currentRevisionCount: number
  ): Promise<void> {
    logger.info(
      {
        contentId,
        revisionCount: currentRevisionCount + 1,
      },
      "[Gatekeeper] Sending for revision"
    );

    // Update status
    await db
      .update(contents)
      .set({
        status: "draft",
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));

    // Queue revision job with correction instructions
    await jobQueue.addJob(
      "gatekeeper_revision" as JobType,
      {
        contentId,
        revisionPrompt: result.revisionPrompt,
        corrections: result.corrections,
        revisionCount: currentRevisionCount + 1,
        maxRevisions: result.maxRevisions,
      },
      { priority: 5 }
    );
  }

  /**
   * Reject article permanently
   */
  private async rejectArticle(contentId: string, reason: string): Promise<void> {
    logger.warn({ contentId, reason }, "[Gatekeeper] Rejecting article");

    await db
      .update(contents)
      .set({
        status: "draft", // Keep as draft but don't process further
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));

    // Could add to a rejection log table for analysis
  }

  /**
   * Fetch unprocessed RSS items
   */
  private async fetchUnprocessedItems(limit: number): Promise<FeedItem[]> {
    // Use rssReader which handles the raw SQL table
    return rssReader.getUnprocessedItems(limit);
  }

  /**
   * Mark RSS item as processed
   */
  private async markItemProcessed(
    feedItemId: string,
    contentId: string | null,
    status: string
  ): Promise<void> {
    // Use rssReader or raw SQL since table is created dynamically
    await rssReader.markProcessed(feedItemId, contentId || undefined);
  }

  /**
   * Save Gate 1 decision to database
   */
  private async saveGate1Decision(
    feedItemId: string,
    selection: ContentSelectionResult
  ): Promise<void> {
    // This would save to a gatekeeper_decisions table
    // For now, log it
    logger.info(
      {
        feedItemId,
        tier: selection.tier,
        decision: selection.decision,
        score: selection.totalScore,
        writer: selection.writerName,
      },
      "[Gatekeeper] Gate 1 Decision saved"
    );
  }

  /**
   * Queue item for later processing
   */
  private async queueForLater(
    feedItemId: string,
    selection: ContentSelectionResult
  ): Promise<void> {
    await jobQueue.addJob(
      "gatekeeper_queued" as JobType,
      {
        feedItemId,
        selection,
        queuedAt: new Date(),
      },
      { priority: 8 } // Lower priority
    );

    logger.info(
      {
        feedItemId,
        tier: selection.tier,
      },
      "[Gatekeeper] Item queued for later"
    );
  }

  /**
   * Queue attraction-specific writing job
   */
  private async queueAttractionWritingJob(
    item: FeedItem,
    selection: ContentSelectionResult,
    detection?: any
  ): Promise<void> {
    await jobQueue.addJob(
      "gatekeeper_attraction_write" as JobType,
      {
        feedItemId: item.id,
        title: item.title,
        summary: item.summary,
        sourceUrl: item.url,
        category: item.category,
        writerId: selection.recommendedWriterId,
        tier: selection.tier,
        gate1Score: selection.totalScore,
        gate1Reasoning: selection.reasoning,
        contentType: "attraction",
        attractionName: detection?.attractionName || item.title,
        attractionType: detection?.attractionType || "other",
        cityName: detection?.cityName || null,
        openingDate: detection?.openingDate || null,
        description: detection?.description || item.summary,
      },
      { priority: tierToPriority(selection.tier) }
    );

    logger.info(
      {
        feedItemId: item.id,
        attractionName: detection?.attractionName || item.title,
        tier: selection.tier,
      },
      "[Gatekeeper] Attraction writing job queued"
    );
  }

  /**
   * Queue writing job
   */
  private async queueWritingJob(item: FeedItem, selection: ContentSelectionResult): Promise<void> {
    await jobQueue.addJob(
      "octypo_write" as JobType,
      {
        feedItemId: item.id,
        title: item.title,
        summary: item.summary,
        sourceUrl: item.url,
        category: item.category,
        writerId: selection.recommendedWriterId,
        tier: selection.tier,
        gate1Score: selection.totalScore,
        gate1Reasoning: selection.reasoning,
      },
      { priority: tierToPriority(selection.tier) }
    );

    logger.info(
      {
        feedItemId: item.id,
        writer: selection.writerName,
        tier: selection.tier,
        priority: tierToPriority(selection.tier),
      },
      "[Gatekeeper] Writing job queued"
    );
  }

  /**
   * Get current stats
   */
  getStats(): PipelineStats {
    return { ...this.stats };
  }

  /**
   * Check if pipeline is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let orchestratorInstance: GatekeeperOrchestrator | null = null;

export function getGatekeeperOrchestrator(
  config?: Partial<GatekeeperConfig>
): GatekeeperOrchestrator {
  if (!orchestratorInstance || config) {
    orchestratorInstance = new GatekeeperOrchestrator(config);
  }
  return orchestratorInstance;
}

/**
 * Job handler for gatekeeper revision jobs
 */
export async function handleRevisionJob(data: {
  contentId: string;
  revisionPrompt: string;
  corrections: any[];
  revisionCount: number;
  maxRevisions: number;
}): Promise<void> {
  logger.info(
    {
      contentId: data.contentId,
      revisionCount: data.revisionCount,
    },
    "[Gatekeeper] Handling revision job"
  );

  // This integrates with the existing Octypo writer system
  // Queue a rewrite job with the revision prompt

  await jobQueue.addJob(
    "octypo_rewrite" as JobType,
    {
      contentId: data.contentId,
      revisionPrompt: data.revisionPrompt,
      revisionCount: data.revisionCount,
    },
    { priority: 2 } // High priority for revisions
  );
}

/**
 * Job handler for post-write review
 * Called after writer completes an article
 */
export async function handlePostWriteReview(data: {
  contentId: string;
  revisionCount?: number;
}): Promise<void> {
  const orchestrator = getGatekeeperOrchestrator();
  await orchestrator.reviewArticle(data.contentId, data.revisionCount || 0);
}
