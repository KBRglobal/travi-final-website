/**
 * Explosion Orchestrator
 * Main orchestration for content explosion pipeline
 */

import { db } from "../../db";
import {
  contents,
  contentEntities,
  explosionJobs,
  explodedArticles,
  articles,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getEntityExtractor } from "./entity-extractor";
import { getEntityMatcher } from "./entity-matcher";
import { getArticleIdeation } from "./article-ideation";
import { getOctypoOrchestrator } from "../orchestration/orchestrator";
import {
  ExplosionConfig,
  ExplosionResult,
  ExplosionJobProgress,
  ExplodedArticleType,
  ARTICLE_TYPE_METADATA,
} from "./types";

export class ExplosionOrchestrator {
  private readonly extractor = getEntityExtractor();
  private readonly matcher = getEntityMatcher();
  private readonly ideation = getArticleIdeation();
  private readonly contentOrchestrator = getOctypoOrchestrator();

  /**
   * Start a content explosion job
   */
  async startExplosion(sourceContentId: string, config: ExplosionConfig = {}): Promise<string> {
    // Create job record
    const [job] = await db
      .insert(explosionJobs)
      .values({
        sourceContentId,
        status: "pending",
        articlesTarget: config.maxArticles || 10,
        config: config,
      })
      .returning();

    // Start processing asynchronously
    this.processExplosion(job.id, config).catch(error => {
      console.error(`[ExplosionOrchestrator] Job ${job.id} failed:`, error);
      this.updateJobStatus(job.id, "failed", error.message);
    });

    return job.id;
  }

  /**
   * Process explosion job
   */
  async processExplosion(jobId: string, config: ExplosionConfig): Promise<ExplosionResult> {
    const startTime = Date.now();

    try {
      // Get job and source content
      const [job] = await db
        .select()
        .from(explosionJobs)
        .where(eq(explosionJobs.id, jobId))
        .limit(1);

      if (!job) {
        throw new Error("Explosion job not found");
      }

      const sourceContentId = job.sourceContentId;

      // Step 1: Extract entities
      await this.updateJobStatus(jobId, "extracting");
      const extractionResult = await this.extractor.extractFromContent(sourceContentId);

      if (!extractionResult.success) {
        throw new Error(`Entity extraction failed: ${extractionResult.error}`);
      }

      await db
        .update(explosionJobs)
        .set({ entitiesExtracted: extractionResult.entities.length })
        .where(eq(explosionJobs.id, jobId));

      // Step 2: Deduplicate entities
      await this.matcher.deduplicateForContent(sourceContentId);

      // Step 3: Generate article ideas
      await this.updateJobStatus(jobId, "ideating");
      const ideationResult = await this.ideation.generateIdeas(
        sourceContentId,
        config.maxArticles || 10,
        config.articleTypes
      );

      if (!ideationResult.success) {
        throw new Error(`Ideation failed: ${ideationResult.error}`);
      }

      await db
        .update(explosionJobs)
        .set({ ideasGenerated: ideationResult.ideas.length })
        .where(eq(explosionJobs.id, jobId));

      // Step 4: Create exploded article records
      const articleRecords: string[] = [];
      for (const idea of ideationResult.ideas) {
        const [article] = await db
          .insert(explodedArticles)
          .values({
            explosionJobId: jobId,
            articleType: idea.articleType,
            ideaTitle: idea.title,
            ideaDescription: idea.description,
            targetKeywords: idea.targetKeywords,
            status: "pending",
          })
          .returning();

        articleRecords.push(article.id);
      }

      // Step 5: Generate content for each idea
      await this.updateJobStatus(jobId, "generating");
      const generatedContentIds: string[] = [];
      let articlesGenerated = 0;

      for (const articleId of articleRecords) {
        try {
          const contentId = await this.generateExplodedArticle(articleId, config);
          if (contentId) {
            generatedContentIds.push(contentId);
            articlesGenerated++;

            await db
              .update(explosionJobs)
              .set({ articlesGenerated })
              .where(eq(explosionJobs.id, jobId));
          }
        } catch (error) {
          console.error(`[ExplosionOrchestrator] Failed to generate article ${articleId}:`, error);
          await db
            .update(explodedArticles)
            .set({
              status: "failed",
              generationAttempts: sql`generation_attempts + 1`,
            })
            .where(eq(explodedArticles.id, articleId));
        }
      }

      // Step 6: Complete job
      await this.updateJobStatus(jobId, "completed");

      return {
        success: true,
        jobId,
        sourceContentId,
        entities: extractionResult.entities,
        ideas: ideationResult.ideas,
        generatedContentIds,
        stats: {
          entitiesExtracted: extractionResult.entities.length,
          ideasGenerated: ideationResult.ideas.length,
          articlesGenerated,
          articlesPublished: 0, // Will be updated by autopilot
          totalTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      await this.updateJobStatus(
        jobId,
        "failed",
        error instanceof Error ? error.message : String(error)
      );

      throw error;
    }
  }

  /**
   * Generate content for an exploded article record
   */
  private async generateExplodedArticle(
    articleId: string,
    config: ExplosionConfig
  ): Promise<string | null> {
    // Get article record
    const [article] = await db
      .select()
      .from(explodedArticles)
      .where(eq(explodedArticles.id, articleId))
      .limit(1);

    if (!article) return null;

    // Update status
    await db
      .update(explodedArticles)
      .set({
        status: "generating",
        generationAttempts: sql`generation_attempts + 1`,
      })
      .where(eq(explodedArticles.id, articleId));

    // Get article type metadata
    const articleMeta = ARTICLE_TYPE_METADATA[article.articleType as ExplodedArticleType];

    // Build attraction-like data for the orchestrator
    const attractionData = {
      id: 0,
      title: article.ideaTitle,
      venueName: article.ideaTitle,
      cityName: config.targetDestination || "",
      primaryCategory: article.articleType,
      description: article.ideaDescription || "",
      priceFrom: null,
      currency: "USD",
      ratings: {},
      images: [],
    };

    // Generate content using existing orchestrator
    const result = await this.contentOrchestrator.generateAttractionContent(attractionData as any);

    if (!result.success || !result.content) {
      await db
        .update(explodedArticles)
        .set({ status: "failed" })
        .where(eq(explodedArticles.id, articleId));
      return null;
    }

    // Create slug
    const slug = this.generateSlug(article.ideaTitle);

    // Check for duplicate slug
    const existingSlug = await db
      .select({ id: contents.id })
      .from(contents)
      .where(eq(contents.slug, slug))
      .limit(1);

    if (existingSlug.length > 0) {
      console.warn(`[ExplosionOrchestrator] Slug already exists: ${slug}`);
      await db
        .update(explodedArticles)
        .set({ status: "failed" })
        .where(eq(explodedArticles.id, articleId));
      return null;
    }

    // Calculate word count
    const wordCount = this.countWords(
      [
        result.content.introduction,
        result.content.whatToExpect,
        result.content.visitorTips,
        result.content.howToGetThere,
        ...result.content.faqs.map(f => f.answer),
      ].join(" ")
    );

    // Save content
    const [contentRecord] = await db
      .insert(contents)
      .values({
        type: "article",
        status: "draft", // Requires approval in semi-auto mode
        title: article.ideaTitle,
        slug,
        metaTitle: result.content.metaTitle || article.ideaTitle.substring(0, 70),
        metaDescription:
          result.content.metaDescription || result.content.introduction?.substring(0, 160),
        summary: result.content.introduction?.substring(0, 200),
        answerCapsule: result.content.answerCapsule,
        blocks: [
          { type: "text", contents: { text: result.content.introduction || "" } },
          { type: "text", contents: { text: result.content.whatToExpect || "" } },
          { type: "text", contents: { text: result.content.visitorTips || "" } },
          { type: "text", contents: { text: result.content.howToGetThere || "" } },
        ].filter(b => b.contents.text),
        seoSchema: result.content.schemaPayload,
        primaryKeyword: article.targetKeywords?.[0] || undefined,
        secondaryKeywords: article.targetKeywords?.slice(1) || [],
        generatedByAI: true,
        wordCount,
      } as any)
      .returning();

    // Create article record
    await db.insert(articles).values({
      contentId: contentRecord.id,
      category: "tips",
      excerpt: result.content.introduction?.substring(0, 200),
      faq: result.content.faqs || [],
    } as any);

    // Update exploded article record
    await db
      .update(explodedArticles)
      .set({
        generatedContentId: contentRecord.id,
        status: "generated",
        generatedAt: new Date(),
        quality108Score: (result.qualityScore as any)?.quality108?.totalScore || null,
      })
      .where(eq(explodedArticles.id, articleId));

    return contentRecord.id;
  }

  /**
   * Get job progress
   */
  async getJobProgress(jobId: string): Promise<ExplosionJobProgress | null> {
    const [job] = await db.select().from(explosionJobs).where(eq(explosionJobs.id, jobId)).limit(1);

    if (!job) return null;

    return {
      status: job.status as ExplosionJobProgress["status"],
      entitiesExtracted: job.entitiesExtracted || 0,
      ideasGenerated: job.ideasGenerated || 0,
      articlesGenerated: job.articlesGenerated || 0,
      articlesTarget: job.articlesTarget || 10,
      error: job.error || undefined,
    };
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const [job] = await db.select().from(explosionJobs).where(eq(explosionJobs.id, jobId)).limit(1);

    if (!job || job.status === "completed" || job.status === "failed") {
      return false;
    }

    await this.updateJobStatus(jobId, "cancelled");
    return true;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: ExplosionJobProgress["status"],
    error?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = { status };

    if (status === "extracting" && !error) {
      updates.startedAt = new Date();
    }

    if (status === "completed" || status === "failed" || status === "cancelled") {
      updates.completedAt = new Date();
    }

    if (error) {
      updates.error = error;
    }

    await db
      .update(explosionJobs)
      .set(updates as any)
      .where(eq(explosionJobs.id, jobId));
  }

  /**
   * Generate URL-safe slug
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 100);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    if (!text) return 0;
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
}

// Singleton instance
let orchestratorInstance: ExplosionOrchestrator | null = null;

export function getExplosionOrchestrator(): ExplosionOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ExplosionOrchestrator();
  }
  return orchestratorInstance;
}
