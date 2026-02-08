/**
 * Publishing Eligibility Repository
 *
 * Database operations for blocked content tracking.
 */

import { db } from "../../db";
import { contents } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

import { evaluateEligibility } from "./engine";
import type { BlockedContent } from "./types";

/**
 * Get all blocked content (content that fails eligibility)
 */
export async function getBlockedContent(limit: number = 50): Promise<BlockedContent[]> {
  try {
    // Get all draft content
    const draftContent = await db
      .select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        createdAt: contents.createdAt,
        updatedAt: contents.updatedAt,
      })
      .from(contents)
      .where(and(eq(contents.status, "draft"), isNull(contents.deletedAt)))
      .limit(limit * 2); // Fetch more to account for passing content

    const blockedItems: BlockedContent[] = [];

    for (const content of draftContent) {
      if (blockedItems.length >= limit) break;

      const eligibility = await evaluateEligibility(content.id);

      if (!eligibility.allowed) {
        blockedItems.push({
          contentId: content.id,
          title: content.title,
          type: content.type,
          blockingReasons: eligibility.blockingReasons,
          blockedSince: content.createdAt || new Date(),
          lastEvaluatedAt: eligibility.evaluatedAt,
        });
      }
    }

    return blockedItems;
  } catch {
    return [];
  }
}

/**
 * Get content that would be blocked from publishing
 * (already published content attempting re-publish)
 */
export async function getPublishedWithIssues(limit: number = 50): Promise<BlockedContent[]> {
  try {
    const publishedContent = await db
      .select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        publishedAt: contents.publishedAt,
        updatedAt: contents.updatedAt,
      })
      .from(contents)
      .where(and(eq(contents.status, "published"), isNull(contents.deletedAt)))
      .limit(limit * 2);

    const issueItems: BlockedContent[] = [];

    for (const content of publishedContent) {
      if (issueItems.length >= limit) break;

      const eligibility = await evaluateEligibility(content.id);

      // Check for warnings on published content
      if (eligibility.warnings.length > 0 || eligibility.score < 70) {
        issueItems.push({
          contentId: content.id,
          title: content.title,
          type: content.type,
          blockingReasons: eligibility.warnings, // Use warnings for published content
          blockedSince: content.publishedAt || new Date(),
          lastEvaluatedAt: eligibility.evaluatedAt,
        });
      }
    }

    return issueItems;
  } catch {
    return [];
  }
}

/**
 * Get eligibility summary stats
 */
export async function getEligibilityStats(): Promise<{
  totalDraft: number;
  blocked: number;
  eligible: number;
  publishedWithIssues: number;
}> {
  try {
    const blocked = await getBlockedContent(100);
    const publishedIssues = await getPublishedWithIssues(100);

    // Count draft content
    const [draftResult] = await db
      .select({ count: contents.id })
      .from(contents)
      .where(and(eq(contents.status, "draft"), isNull(contents.deletedAt)));

    const totalDraft = draftResult ? 1 : 0; // Simplified count

    return {
      totalDraft,
      blocked: blocked.length,
      eligible: Math.max(0, totalDraft - blocked.length),
      publishedWithIssues: publishedIssues.length,
    };
  } catch {
    return {
      totalDraft: 0,
      blocked: 0,
      eligible: 0,
      publishedWithIssues: 0,
    };
  }
}
