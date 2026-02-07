/**
 * Native Content Generation Handler
 *
 * Generates content natively in each locale (not translated).
 * AI writes as a local writer familiar with cultural context.
 *
 * Uses the background job queue (server/job-queue.ts) with type 'native_content_generate'.
 * Writes results to the nativeLocalizedContent table (30 locales).
 */

import { db } from "../db";
import { contents, nativeLocalizedContent, SUPPORTED_LOCALES } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { log } from "../lib/logger";
import { jobQueue, type JobType } from "../job-queue";
import { computeSourceHash } from "./translation-queue";
import { getBestWriterForLocale } from "./writer-language-matrix";
import type { GeneratedAttractionContent } from "../octypo/types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[NativeContentHandler] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[NativeContentHandler] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[NativeContentHandler] WARN: ${msg}`, data),
};

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface NativeContentJobData {
  contentId: string;
  locale: string;
  tier: number; // 1-5
  entityType?: string;
  entityId?: string;
  destination?: string;
}

// ---------------------------------------------------------------------------
// Concurrency control
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = Number.parseInt(process.env.NATIVE_CONTENT_CONCURRENCY || "3", 10);
let activeGenerations = 0;

// ---------------------------------------------------------------------------
// Daily cost tracking
// ---------------------------------------------------------------------------

let dailyCostUsd = 0;
let lastCostResetDate = new Date().toDateString();
const DAILY_BUDGET_USD = Number.parseFloat(process.env.DAILY_LLM_BUDGET_USD || "50");

function resetDailyCostIfNeeded(): void {
  const today = new Date().toDateString();
  if (today !== lastCostResetDate) {
    dailyCostUsd = 0;
    lastCostResetDate = today;
  }
}

// Conservative cost estimate per generation call
const COST_PER_GENERATION_USD = 0.03;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

type JobResult = { success: boolean; result: Record<string, unknown> };

/** Check budget and concurrency guards before processing */
async function checkGuards(data: NativeContentJobData): Promise<JobResult | null> {
  resetDailyCostIfNeeded();
  if (dailyCostUsd >= DAILY_BUDGET_USD && data.tier > 2) {
    logger.warn("Daily LLM budget exceeded, low-tier locale paused", {
      locale: data.locale,
      tier: data.tier,
    });
    return {
      success: false,
      result: { error: "Daily LLM budget exceeded, low-tier locale paused" },
    };
  }

  if (activeGenerations >= MAX_CONCURRENT) {
    await jobQueue.addJob("native_content_generate" as JobType, data as any, {
      priority: data.tier <= 2 ? 3 : 7,
    });
    logger.info("Re-queued due to concurrency limit", { locale: data.locale });
    return { success: true, result: { requeued: true } };
  }

  return null;
}

/** Validate locale purity of generated content */
async function validatePurity(
  generated: GeneratedAttractionContent,
  locale: string
): Promise<{ score: number; failed: boolean; errorMsg?: string }> {
  try {
    const { validateLocalePurity } = await import("./validators/locale-purity");
    const purityResult = validateLocalePurity(
      {
        introduction: generated.introduction,
        whatToExpect: generated.whatToExpect,
        visitorTips: generated.visitorTips,
        howToGetThere: generated.howToGetThere,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        answerCapsule: generated.answerCapsule,
        faqs: generated.faqs as any,
      },
      locale
    );
    if (!purityResult.passed) {
      return {
        score: purityResult.score,
        failed: true,
        errorMsg: `Locale purity ${(purityResult.score * 100).toFixed(1)}% below threshold ${(purityResult.threshold * 100).toFixed(0)}%`,
      };
    }
    return { score: purityResult.score, failed: false };
  } catch (err) {
    logger.warn("Locale purity validation skipped", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { score: 1, failed: false };
  }
}

/** Run quality gates (log-only, non-blocking) */
async function runQualityGatesForGenerated(
  generated: GeneratedAttractionContent,
  locale: string,
  localePurityScore: number
): Promise<void> {
  try {
    const { runQualityGates } = await import("./validators/quality-gates");
    const qualityResult = runQualityGates(
      {
        introduction: generated.introduction,
        whatToExpect: generated.whatToExpect,
        visitorTips: generated.visitorTips,
        howToGetThere: generated.howToGetThere,
        answerCapsule: generated.answerCapsule,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        faq: generated.faqs as any,
        localePurityScore,
      },
      locale
    );
    logger.info("Quality gates result", {
      locale,
      passed: qualityResult.passed,
      failedCount: qualityResult.summary.failedCount,
    });
  } catch {
    // Non-critical
  }
}

/** Build the DB row for native localized content */
function buildNativeContentRow(
  data: NativeContentJobData,
  content: any,
  generated: GeneratedAttractionContent,
  destination: string,
  writerId: string,
  localePurityScore: number,
  sourceHash: string,
  result: any
) {
  return {
    entityType: (data.entityType || "attraction") as any,
    entityId: data.contentId,
    destination,
    locale: data.locale,
    tier: data.tier,
    title: generated.metaTitle || generated.title || content.title,
    introduction: generated.introduction || null,
    whatToExpect: generated.whatToExpect || null,
    visitorTips: generated.visitorTips || null,
    howToGetThere: generated.howToGetThere || null,
    highlights: generated.keywords || null,
    faq: generated.faqs || null,
    answerCapsule: generated.answerCapsule || null,
    metaTitle: generated.metaTitle || null,
    metaDescription: generated.metaDescription || null,
    localePurityScore,
    sourceHash,
    status: "published" as const,
    writerAgent: writerId,
    engineUsed: result.engineUsed,
    generationTimeMs: result.generationTimeMs,
    updatedAt: new Date(),
  };
}

/** Attempt to update the search index (non-critical, errors are swallowed) */
async function tryUpdateSearchIndex(content: any, locale: string): Promise<void> {
  try {
    const { updateSearchIndex } = await import("./publish-hooks");
    await updateSearchIndex(content, locale);
  } catch {
    // Non-critical
  }
}

/** Mark an existing native content row as failed */
async function markExistingAsFailed(existingId: string, errorMsg: string): Promise<void> {
  await db
    .update(nativeLocalizedContent)
    .set({ status: "failed", failureReason: errorMsg, updatedAt: new Date() } as any)
    .where(eq(nativeLocalizedContent.id, existingId));
}

async function handleNativeContentJob(data: NativeContentJobData): Promise<JobResult> {
  logger.info("Processing native content job", {
    contentId: data.contentId,
    locale: data.locale,
    tier: data.tier,
  });

  const guardResult = await checkGuards(data);
  if (guardResult) return guardResult;

  activeGenerations++;

  try {
    const [content] = await db.select().from(contents).where(eq(contents.id, data.contentId));
    if (!content) {
      return { success: false, result: { error: "Content not found" } };
    }

    const sourceHash = computeSourceHash({
      title: content.title,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      blocks: content.blocks,
      answerCapsule: content.answerCapsule,
    });

    const [existing] = await db
      .select()
      .from(nativeLocalizedContent)
      .where(
        and(
          eq(nativeLocalizedContent.entityId, data.contentId),
          eq(nativeLocalizedContent.locale, data.locale)
        )
      );

    if (existing?.status === "published" && existing.sourceHash === sourceHash) {
      logger.info("Native content unchanged (hash match), skipping", {
        contentId: data.contentId,
        locale: data.locale,
      });
      return { success: true, result: { skipped: true, reason: "Source unchanged" } };
    }

    const { getOctypoOrchestrator } = await import("../octypo/orchestration/orchestrator");
    const orchestrator = getOctypoOrchestrator();
    const destination = data.destination || "global";
    const writerId =
      getBestWriterForLocale(data.locale, content.type || undefined) || "writer-sarah";

    const result = await orchestrator.generateAttractionContent({
      id: data.entityId || data.contentId,
      name: content.title,
      title: content.title,
      slug: content.slug,
      destination,
      primaryCategory: content.type || "article",
      locale: data.locale,
    } as any);

    if (!result.success || !result.content) {
      const errorMsg = result.error || "Generation failed";
      if (existing) {
        await markExistingAsFailed(existing.id, errorMsg);
      }
      return { success: false, result: { error: errorMsg } };
    }

    const generated = result.content as GeneratedAttractionContent;

    const purity = await validatePurity(generated, data.locale);
    if (purity.failed) {
      return { success: false, result: { error: purity.errorMsg! } };
    }

    await runQualityGatesForGenerated(generated, data.locale, purity.score);

    const allText = [
      generated.introduction,
      generated.whatToExpect,
      generated.visitorTips,
      generated.howToGetThere,
      generated.body,
      generated.conclusion,
    ]
      .filter(Boolean)
      .join(" ");
    const wordCount = allText.split(/\s+/).filter((w: string) => w.length > 0).length;

    const row = buildNativeContentRow(
      data,
      content,
      generated,
      destination,
      writerId,
      purity.score,
      sourceHash,
      result
    );

    if (existing) {
      await db
        .update(nativeLocalizedContent)
        .set(row as any)
        .where(eq(nativeLocalizedContent.id, existing.id));
    } else {
      await db.insert(nativeLocalizedContent).values(row as any);
    }

    dailyCostUsd += COST_PER_GENERATION_USD;

    await tryUpdateSearchIndex(content, data.locale);

    logger.info("Native content generated", {
      contentId: data.contentId,
      locale: data.locale,
      wordCount,
      purityScore: purity.score,
    });
    return {
      success: true,
      result: {
        contentId: data.contentId,
        locale: data.locale,
        wordCount,
        purityScore: purity.score,
        generationTimeMs: result.generationTimeMs,
      },
    };
  } catch (error) {
    logger.error("Native content generation failed", {
      contentId: data.contentId,
      locale: data.locale,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      result: { error: error instanceof Error ? error.message : "Unknown error" },
    };
  } finally {
    activeGenerations--;
  }
}

// ---------------------------------------------------------------------------
// Enqueue native content jobs for all non-EN locales
// ---------------------------------------------------------------------------

export async function enqueueNativeContentJobs(
  contentId: string,
  options?: {
    locales?: string[];
    entityType?: string;
    destination?: string;
    priority?: number;
  }
): Promise<number> {
  const targetLocales = options?.locales
    ? options.locales
    : SUPPORTED_LOCALES.filter(l => l.code !== "en").map(l => l.code);

  let enqueued = 0;
  for (const localeInfo of SUPPORTED_LOCALES) {
    if (!targetLocales.includes(localeInfo.code)) continue;
    if (localeInfo.code === "en") continue;

    const jobData: NativeContentJobData = {
      contentId,
      locale: localeInfo.code,
      tier: localeInfo.tier,
      entityType: options?.entityType,
      destination: options?.destination,
    };

    await jobQueue.addJob("native_content_generate" as JobType, jobData as any, {
      priority: options?.priority ?? (localeInfo.tier <= 2 ? 3 : 7),
    });
    enqueued++;
  }

  logger.info("Native content jobs enqueued", { contentId, count: enqueued });
  return enqueued;
}

// ---------------------------------------------------------------------------
// Register the handler with the job queue
// ---------------------------------------------------------------------------

export function registerNativeContentHandler(): void {
  jobQueue.registerHandler<NativeContentJobData>(
    "native_content_generate" as JobType,
    async data => {
      return handleNativeContentJob(data);
    }
  );

  logger.info("Native content handler registered");
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getNativeContentStats(): {
  activeGenerations: number;
  dailyCostUsd: number;
  dailyBudgetUsd: number;
  budgetRemaining: number;
  maxConcurrent: number;
} {
  resetDailyCostIfNeeded();
  return {
    activeGenerations,
    dailyCostUsd: Math.round(dailyCostUsd * 100) / 100,
    dailyBudgetUsd: DAILY_BUDGET_USD,
    budgetRemaining: Math.round((DAILY_BUDGET_USD - dailyCostUsd) * 100) / 100,
    maxConcurrent: MAX_CONCURRENT,
  };
}
