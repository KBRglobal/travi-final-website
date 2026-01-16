/**
 * Publishing Eligibility Engine
 *
 * Evaluates whether content is allowed to be published.
 * All checks are idempotent and deterministic.
 */

import { db } from "../../db";
import { contents, searchIndex } from "@shared/schema";
import { eq, isNull, and } from "drizzle-orm";
import {
  type EligibilityResult,
  type EligibilityOptions,
  isAeoRequired,
  isEntityRequired,
  isIntelligenceCoverageRequired,
} from "./types";

/**
 * Evaluate publishing eligibility for a content item
 */
export async function evaluateEligibility(
  contentId: string,
  options: EligibilityOptions = {}
): Promise<EligibilityResult> {
  const evaluatedAt = new Date();
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  try {
    // Fetch content
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

    // Rule 1: Content must exist
    if (!content) {
      return {
        contentId,
        allowed: false,
        blockingReasons: ['Content not found'],
        warnings: [],
        score: 0,
        evaluatedAt,
      };
    }

    // Rule 2: Content must not be deleted
    if (content.deletedAt) {
      blockingReasons.push('Content is deleted');
      score -= 100;
    }

    // Rule 3: Content must have blocks/body
    const blocks = content.blocks as unknown[] | null;
    if (!blocks || blocks.length === 0) {
      blockingReasons.push('Content has no body/blocks');
      score -= 30;
    } else if (blocks.length < 2) {
      warnings.push('Content has minimal body (less than 2 blocks)');
      score -= 10;
    }

    // Rule 4: Entity requirement (if enabled)
    if (isEntityRequired() && !options.skipEntityCheck) {
      // Use answerCapsule as proxy for entity extraction
      if (!content.answerCapsule) {
        blockingReasons.push('Content has no extracted entities (missing answer capsule)');
        score -= 25;
      }
    }

    // Rule 5: AEO capsule requirement (if enabled)
    if (isAeoRequired() && !options.skipAeoCheck) {
      if (!content.answerCapsule) {
        blockingReasons.push('Content missing AEO capsule');
        score -= 25;
      } else if (content.aeoScore && content.aeoScore < 50) {
        warnings.push(`AEO score is low (${content.aeoScore}/100)`);
        score -= 10;
      }
    }

    // Rule 6: Intelligence coverage requirement (if enabled)
    if (isIntelligenceCoverageRequired() && !options.skipIntelligenceCheck) {
      // Check if content is in search index
      const [indexed] = await db
        .select({ contentId: searchIndex.contentId })
        .from(searchIndex)
        .where(eq(searchIndex.contentId, contentId));

      if (!indexed) {
        warnings.push('Content not yet indexed for search');
        score -= 5;
      }
    }

    // Rule 7: Scheduled for future (unless forcePublish)
    if (content.scheduledAt && !options.forcePublish) {
      const now = new Date();
      if (content.scheduledAt > now) {
        blockingReasons.push(`Content scheduled for future: ${content.scheduledAt.toISOString()}`);
        score -= 20;
      }
    }

    // Rule 8: SEO score warning
    if (content.seoScore && content.seoScore < 40) {
      warnings.push(`SEO score is low (${content.seoScore}/100)`);
      score -= 5;
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      contentId,
      allowed: blockingReasons.length === 0,
      blockingReasons,
      warnings,
      score,
      evaluatedAt,
    };
  } catch (error) {
    console.error('[Eligibility] Error evaluating content:', error);
    return {
      contentId,
      allowed: false,
      blockingReasons: ['Evaluation error: ' + String(error)],
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
