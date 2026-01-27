/**
 * Intelligence Health Scorers
 *
 * Pure TS functions that compute health scores (0-100) based on simple heuristics.
 *
 * PHASE 17: Admin Intelligence & Visibility Layer
 */

import { db } from "../db";
import { contents, searchIndex, backgroundJobs } from "@shared/schema";
import { eq, and, sql, gte, count, isNull } from "drizzle-orm";

export interface HealthScore {
  score: number;
  explanation: string;
  topIssue: string | null;
}

/**
 * Content Health Score (0-100)
 *
 * Based on:
 * - % of content that is published
 * - % of published content that is indexed
 * - % of content with AEO capsule
 */
export async function getContentHealthScore(): Promise<HealthScore> {
  try {
    // Get total content count
    const [totalResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(isNull(contents.deletedAt));

    const total = Number(totalResult?.count || 0);

    if (total === 0) {
      return {
        score: 0,
        explanation: "No content found in database",
        topIssue: "No content exists",
      };
    }

    // Get published count
    const [publishedResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(and(isNull(contents.deletedAt), eq(contents.status, "published")));

    const published = Number(publishedResult?.count || 0);

    // Get indexed count
    const [indexedResult] = await db.select({ count: count() }).from(searchIndex);

    const indexed = Number(indexedResult?.count || 0);

    // Get AEO capsule count
    const [aeoResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(
        and(
          isNull(contents.deletedAt),
          eq(contents.status, "published"),
          sql`${contents.answerCapsule} IS NOT NULL`
        )
      );

    const withAeo = Number(aeoResult?.count || 0);

    // Calculate scores
    const publishedPercent = (published / total) * 100;
    const indexedPercent = published > 0 ? (indexed / published) * 100 : 0;
    const aeoPercent = published > 0 ? (withAeo / published) * 100 : 0;

    // Weighted score: 40% published, 35% indexed, 25% AEO
    const score = Math.round(publishedPercent * 0.4 + indexedPercent * 0.35 + aeoPercent * 0.25);

    // Determine top issue
    let topIssue: string | null = null;
    if (publishedPercent < 50) {
      topIssue = `${total - published} contents in draft/unpublished state`;
    } else if (indexedPercent < 80) {
      topIssue = `${published - indexed} published contents not indexed`;
    } else if (aeoPercent < 50) {
      topIssue = `${published - withAeo} contents missing AEO capsule`;
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      explanation: `${published}/${total} published, ${indexed} indexed, ${withAeo} with AEO`,
      topIssue,
    };
  } catch (error) {
    return {
      score: 0,
      explanation: "Error calculating score",
      topIssue: "Database query failed",
    };
  }
}

/**
 * Search Health Score (0-100)
 *
 * Based on:
 * - Index coverage
 * - Zero-result search rate
 */
export async function getSearchHealthScore(): Promise<HealthScore> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get published content count
    const [publishedResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(and(isNull(contents.deletedAt), eq(contents.status, "published")));

    const published = Number(publishedResult?.count || 0);

    // Get indexed count
    const [indexedResult] = await db.select({ count: count() }).from(searchIndex);

    const indexed = Number(indexedResult?.count || 0);

    // Get total searches and zero-result searches
    const [totalSearchesResult] = await db
      .select({ count: count() })
      .from(sql`search_queries WHERE created_at >= ${oneDayAgo}`);

    const [zeroResultsResult] = await db
      .select({ count: count() })
      .from(sql`search_queries WHERE created_at >= ${oneDayAgo} AND results_count = 0`);

    const totalSearches = Number(totalSearchesResult?.count || 0);
    const zeroResults = Number(zeroResultsResult?.count || 0);

    // Calculate index coverage
    const indexCoverage = published > 0 ? (indexed / published) * 100 : 100;

    // Calculate success rate (inverse of zero-result rate)
    const successRate =
      totalSearches > 0 ? ((totalSearches - zeroResults) / totalSearches) * 100 : 100;

    // Weighted score: 60% coverage, 40% success rate
    const score = Math.round(indexCoverage * 0.6 + successRate * 0.4);

    // Determine top issue
    let topIssue: string | null = null;
    if (indexCoverage < 90) {
      topIssue = `${published - indexed} contents not indexed`;
    } else if (successRate < 80) {
      topIssue = `${zeroResults} zero-result searches in last 24h`;
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      explanation: `${indexed}/${published} indexed, ${successRate.toFixed(0)}% search success rate`,
      topIssue,
    };
  } catch (error) {
    return {
      score: 0,
      explanation: "Error calculating score",
      topIssue: "Database query failed",
    };
  }
}

/**
 * AI Health Score (0-100)
 *
 * Based on:
 * - Job success rate
 * - Stalled/failed jobs
 */
export async function getAIHealthScore(): Promise<HealthScore> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get job counts by status
    const jobCounts = await db
      .select({
        status: backgroundJobs.status,
        count: count(),
      })
      .from(backgroundJobs)
      .where(gte(backgroundJobs.createdAt, oneDayAgo))
      .groupBy(backgroundJobs.status);

    const statusMap = new Map(jobCounts.map(j => [j.status, Number(j.count)]));
    const completed = statusMap.get("completed") || 0;
    const failed = statusMap.get("failed") || 0;
    const pending = statusMap.get("pending") || 0;
    const processing = statusMap.get("processing") || 0;
    const total = completed + failed + pending + processing;

    if (total === 0) {
      return {
        score: 100,
        explanation: "No jobs processed in last 24h",
        topIssue: null,
      };
    }

    // Calculate success rate
    const successRate = total > 0 ? (completed / total) * 100 : 100;
    const failRate = total > 0 ? (failed / total) * 100 : 0;

    // Check for stalled jobs (processing for > 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [stalledResult] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.status, "processing"),
          sql`${backgroundJobs.startedAt} < ${oneHourAgo}`
        )
      );

    const stalled = Number(stalledResult?.count || 0);

    // Weighted score: 70% success rate, 30% no stalls
    const stallPenalty = stalled > 0 ? Math.min(30, stalled * 10) : 0;
    const score = Math.round(successRate * 0.7 + (100 - stallPenalty) * 0.3);

    // Determine top issue
    let topIssue: string | null = null;
    if (stalled > 0) {
      topIssue = `${stalled} jobs stalled (processing > 1h)`;
    } else if (failRate > 10) {
      topIssue = `${failed} jobs failed (${failRate.toFixed(0)}% failure rate)`;
    } else if (pending > 50) {
      topIssue = `${pending} jobs pending in queue`;
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      explanation: `${completed}/${total} jobs completed, ${failed} failed, ${stalled} stalled`,
      topIssue,
    };
  } catch (error) {
    return {
      score: 0,
      explanation: "Error calculating score",
      topIssue: "Database query failed",
    };
  }
}

/**
 * Blocking Issues - Top issues that need attention
 */
export interface BlockingIssue {
  issue: string;
  count: number;
  severity: "high" | "medium" | "low";
  suggestedAction: string;
}

export async function getBlockingIssues(): Promise<BlockingIssue[]> {
  const issues: BlockingIssue[] = [];

  try {
    // Check for unpublished content
    const [draftResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(and(isNull(contents.deletedAt), eq(contents.status, "draft")));

    const drafts = Number(draftResult?.count || 0);
    if (drafts > 5) {
      issues.push({
        issue: "Contents in draft status",
        count: drafts,
        severity: drafts > 20 ? "high" : "medium",
        suggestedAction: "Review and publish pending content",
      });
    }

    // Check for unindexed content
    const [publishedResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(and(isNull(contents.deletedAt), eq(contents.status, "published")));

    const [indexedResult] = await db.select({ count: count() }).from(searchIndex);

    const published = Number(publishedResult?.count || 0);
    const indexed = Number(indexedResult?.count || 0);
    const unindexed = published - indexed;

    if (unindexed > 0) {
      issues.push({
        issue: "Published contents not indexed",
        count: unindexed,
        severity: unindexed > 10 ? "high" : "medium",
        suggestedAction: "Run search index rebuild job",
      });
    }

    // Check for missing AEO capsules
    const [missingAeoResult] = await db
      .select({ count: count() })
      .from(contents)
      .where(
        and(
          isNull(contents.deletedAt),
          eq(contents.status, "published"),
          isNull(contents.answerCapsule)
        )
      );

    const missingAeo = Number(missingAeoResult?.count || 0);
    if (missingAeo > 0) {
      issues.push({
        issue: "Contents missing AEO capsule",
        count: missingAeo,
        severity: missingAeo > 20 ? "high" : "medium",
        suggestedAction: "Generate AEO capsules for published content",
      });
    }

    // Check for failed jobs
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [failedJobsResult] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(and(gte(backgroundJobs.createdAt, oneDayAgo), eq(backgroundJobs.status, "failed")));

    const failedJobs = Number(failedJobsResult?.count || 0);
    if (failedJobs > 0) {
      issues.push({
        issue: "Background jobs failed (24h)",
        count: failedJobs,
        severity: failedJobs > 10 ? "high" : "low",
        suggestedAction: "Check job logs and retry failed jobs",
      });
    }

    // Check for stalled jobs
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [stalledResult] = await db
      .select({ count: count() })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.status, "processing"),
          sql`${backgroundJobs.startedAt} < ${oneHourAgo}`
        )
      );

    const stalled = Number(stalledResult?.count || 0);
    if (stalled > 0) {
      issues.push({
        issue: "Jobs stalled (processing > 1 hour)",
        count: stalled,
        severity: "high",
        suggestedAction: "Kill stalled jobs and investigate cause",
      });
    }

    // Check feature flags
    if (process.env.ENABLE_INTELLIGENCE_COVERAGE !== "true") {
      issues.push({
        issue: "Intelligence coverage feature disabled",
        count: 1,
        severity: "low",
        suggestedAction: "Set ENABLE_INTELLIGENCE_COVERAGE=true to enable",
      });
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues.slice(0, 10); // Top 10 issues
  } catch (error) {
    return [
      {
        issue: "Error fetching system issues",
        count: 1,
        severity: "high",
        suggestedAction: "Check database connectivity",
      },
    ];
  }
}
