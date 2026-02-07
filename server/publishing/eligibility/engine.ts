/**
 * Publishing Eligibility Engine
 *
 * Evaluates whether content is allowed to be published.
 * All checks are idempotent and deterministic.
 */

import { db } from "../../db";
import { contents, searchIndex } from "@shared/schema";
import { eq } from "drizzle-orm";

import {
  type EligibilityResult,
  type EligibilityOptions,
  isAeoRequired,
  isEntityRequired,
  isIntelligenceCoverageRequired,
  isQuality108Required,
  isInternalLinkingRequired,
  isFaqRequired,
  getSEOGates,
} from "./types";
import { calculateFullQuality108 } from "../../services/seo/unified-quality-scorer";
import { internalLinkingAnalyzer } from "../../services/seo/internal-linking-analyzer";

/** Mutable context shared across rule checks */
interface EligibilityContext {
  blockingReasons: string[];
  warnings: string[];
  score: number;
}

/** Add a blocking reason and subtract from score */
function block(ctx: EligibilityContext, reason: string, penalty: number): void {
  ctx.blockingReasons.push(reason);
  ctx.score -= penalty;
}

/** Add a warning and subtract from score */
function warn(ctx: EligibilityContext, message: string, penalty: number): void {
  ctx.warnings.push(message);
  ctx.score -= penalty;
}

/** Check body/blocks presence */
function checkBlocks(content: { blocks: unknown }, ctx: EligibilityContext): void {
  const blocks = content.blocks as unknown[] | null;
  if (!blocks || blocks.length === 0) {
    block(ctx, "Content has no body/blocks", 30);
  } else if (blocks.length < 2) {
    warn(ctx, "Content has minimal body (less than 2 blocks)", 10);
  }
}

/** Check AEO capsule requirement */
function checkAeo(
  content: { answerCapsule: unknown; aeoScore: number | null },
  options: EligibilityOptions,
  ctx: EligibilityContext
): void {
  if (!isAeoRequired() || options.skipAeoCheck) return;
  if (!content.answerCapsule) {
    block(ctx, "Content missing AEO capsule", 25);
  } else if (content.aeoScore && content.aeoScore < 50) {
    warn(ctx, `AEO score is low (${content.aeoScore}/100)`, 10);
  }
}

/** Check Quality 108 requirement */
async function checkQuality108(
  contentId: string,
  content: { seoScore: number | null; aeoScore: number | null },
  options: EligibilityOptions,
  ctx: EligibilityContext
): Promise<void> {
  if (!isQuality108Required() || options.skipQuality108Check) return;
  try {
    const quality108 = await calculateFullQuality108(contentId, {
      contentScore: 60,
      seoScore: content.seoScore || 0,
      aeoScore: content.aeoScore || 0,
    });
    const seoGates = getSEOGates();
    if (quality108.totalScore < seoGates.quality108Minimum) {
      block(
        ctx,
        `Quality 108 score too low: ${quality108.totalScore}/${seoGates.quality108Minimum} minimum`,
        25
      );
    }
    if (quality108.criticalIssues.length > 0) {
      block(ctx, `Quality 108 critical issues: ${quality108.criticalIssues.join(", ")}`, 15);
    }
    if (quality108.categories.internalLinking.metrics.orphanStatus && seoGates.noOrphanPages) {
      block(ctx, "Content is orphaned (no inbound links)", 20);
    }
  } catch {
    warn(ctx, "Could not evaluate Quality 108 score", 0);
  }
}

/** Check internal linking requirement */
async function checkInternalLinking(
  contentId: string,
  options: EligibilityOptions,
  ctx: EligibilityContext
): Promise<void> {
  if (!isInternalLinkingRequired() || options.skipInternalLinkingCheck) return;
  try {
    const seoGates = getSEOGates();
    const linkSuggestions = await internalLinkingAnalyzer.suggestLinksForContent(contentId);
    if (linkSuggestions.length >= seoGates.minInternalLinks) {
      warn(ctx, `Consider adding ${Math.min(3, linkSuggestions.length)} more internal links`, 5);
    }
  } catch {
    warn(ctx, "Could not evaluate internal linking", 0);
  }
}

/** Check FAQ requirement */
function checkFaq(
  content: { blocks: unknown },
  options: EligibilityOptions,
  ctx: EligibilityContext
): void {
  if (!isFaqRequired() || options.skipFaqCheck) return;
  const seoGates = getSEOGates();
  const blocks = content.blocks as any[] | null;
  const hasFaq = blocks?.some(
    b => b.type === "faq" || b.type === "accordion" || b.data?.type === "faq"
  );
  if (!hasFaq && seoGates.mustHaveFAQ) {
    warn(ctx, "Content has no FAQ section (recommended for SEO/AEO)", 10);
  }
}

/**
 * Evaluate publishing eligibility for a content item
 */
export async function evaluateEligibility(
  contentId: string,
  options: EligibilityOptions = {}
): Promise<EligibilityResult> {
  const evaluatedAt = new Date();
  const ctx: EligibilityContext = { blockingReasons: [], warnings: [], score: 100 };

  try {
    const [content] = await db
      .select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        status: contents.status,
        blocks: contents.blocks,
        answerCapsule: contents.answerCapsule,
        aeoScore: contents.aeoScore,
        seoScore: contents.seoScore,
        scheduledAt: contents.scheduledAt,
        deletedAt: contents.deletedAt,
      })
      .from(contents)
      .where(eq(contents.id, contentId));

    if (!content) {
      return {
        contentId,
        allowed: false,
        blockingReasons: ["Content not found"],
        warnings: [],
        score: 0,
        evaluatedAt,
      };
    }

    if (content.deletedAt) {
      block(ctx, "Content is deleted", 100);
    }

    checkBlocks(content, ctx);

    if (isEntityRequired() && !options.skipEntityCheck && !content.answerCapsule) {
      block(ctx, "Content has no extracted entities (missing answer capsule)", 25);
    }

    checkAeo(content, options, ctx);

    if (isIntelligenceCoverageRequired() && !options.skipIntelligenceCheck) {
      const [indexed] = await db
        .select({ contentId: searchIndex.contentId })
        .from(searchIndex)
        .where(eq(searchIndex.contentId, contentId));
      if (!indexed) {
        warn(ctx, "Content not yet indexed for search", 5);
      }
    }

    if (content.scheduledAt && !options.forcePublish && content.scheduledAt > new Date()) {
      block(ctx, `Content scheduled for future: ${content.scheduledAt.toISOString()}`, 20);
    }

    if (content.seoScore && content.seoScore < 40) {
      warn(ctx, `SEO score is low (${content.seoScore}/100)`, 5);
    }

    await checkQuality108(contentId, content, options, ctx);
    await checkInternalLinking(contentId, options, ctx);
    checkFaq(content, options, ctx);

    ctx.score = Math.max(0, Math.min(100, ctx.score));

    return {
      contentId,
      allowed: ctx.blockingReasons.length === 0,
      blockingReasons: ctx.blockingReasons,
      warnings: ctx.warnings,
      score: ctx.score,
      evaluatedAt,
    };
  } catch (error) {
    return {
      contentId,
      allowed: false,
      blockingReasons: ["Evaluation error: " + String(error)],
      warnings: [],
      score: 0,
      evaluatedAt,
    };
  }
}

/**
 * Quick check if content can be published (no detailed reasons)
 */
export async function canPublish(
  contentId: string,
  options: EligibilityOptions = {}
): Promise<boolean> {
  const result = await evaluateEligibility(contentId, options);
  return result.allowed;
}

/**
 * Get all blocking reasons for a content
 */
export async function getBlockingReasons(contentId: string): Promise<string[]> {
  const result = await evaluateEligibility(contentId);
  return result.blockingReasons;
}
