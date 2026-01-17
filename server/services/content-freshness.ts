/**
 * Content Freshness Monitoring Service
 * Automatically detects and refreshes stale destination pages
 */

import { db } from "../db";
import { eq, desc, and, lt, sql, isNull, count as countFn } from "drizzle-orm";
import {
  destinations,
  aiGenerationLogs,
  notifications,
  users,
  type Destination,
} from "@shared/schema";
import { createLogger } from "../lib/logger";
import {
  generateDestinationContent,
  applyInternalLinks,
  calculateSeoMetrics,
  buildDestinationPrompt,
} from "../routes/destination-intelligence";
import { validateThroughGateway, type ContentForValidation } from "../lib/content-quality-gateway";

const logger = createLogger("content-freshness");

// Configuration for content freshness
export interface FreshnessConfig {
  autoRefreshStale: boolean;
  maxRefreshesPerDay: number;
  staleThresholdDays: number;
  lowSeoScoreThreshold: number;
  requiredSections: string[];
}

export const freshnessConfig: FreshnessConfig = {
  autoRefreshStale: true,
  maxRefreshesPerDay: 2,
  staleThresholdDays: 90,
  lowSeoScoreThreshold: 70,
  requiredSections: ["hero", "attractions", "hotels", "restaurants", "travelTips"],
};

// Staleness reasons
export type StalenessReason = 
  | "content_age"
  | "low_seo_score"
  | "missing_sections"
  | "outdated_references";

// Freshness status for a destination
export interface DestinationFreshness {
  destinationId: string;
  name: string;
  country: string;
  isActive: boolean;
  freshnessScore: number;
  isStale: boolean;
  staleSeverity: "critical" | "high" | "medium" | "low" | "fresh";
  stalenessReasons: StalenessReason[];
  daysSinceGeneration: number | null;
  seoScore: number | null;
  wordCount: number | null;
  lastGenerated: Date | null;
  missingSections: string[];
  hasOutdatedReferences: boolean;
  priority: number;
}

// Freshness check result
export interface FreshnessCheckResult {
  totalDestinations: number;
  staleCount: number;
  freshCount: number;
  criticalCount: number;
  averageFreshnessScore: number;
  destinations: DestinationFreshness[];
  checkedAt: Date;
}

// Refresh result
export interface RefreshResult {
  success: boolean;
  destinationId: string;
  name: string;
  previousScore: number | null;
  newScore: number | null;
  duration: number;
  error?: string;
}

// Run freshness check result
export interface RunFreshnessCheckResult {
  checkedAt: Date;
  totalChecked: number;
  staleCount: number;
  refreshed: RefreshResult[];
  skippedDueToLimit: number;
  notificationsCreated: number;
}

/**
 * Calculate freshness score based on multiple factors
 * Returns a score from 0-100 (100 = freshest)
 */
function calculateFreshnessScore(dest: Destination): {
  score: number;
  reasons: StalenessReason[];
  missingSections: string[];
  hasOutdatedReferences: boolean;
} {
  let score = 100;
  const reasons: StalenessReason[] = [];
  const missingSections: string[] = [];
  let hasOutdatedReferences = false;
  const currentYear = new Date().getFullYear();

  // Factor 1: Age of content (40 points max)
  if (dest.lastGenerated) {
    const daysSince = Math.floor(
      (Date.now() - new Date(dest.lastGenerated).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSince > freshnessConfig.staleThresholdDays) {
      const excessDays = daysSince - freshnessConfig.staleThresholdDays;
      const agePenalty = Math.min(40, Math.floor(excessDays / 10) * 5);
      score -= agePenalty;
      reasons.push("content_age");
    } else if (daysSince > freshnessConfig.staleThresholdDays / 2) {
      score -= 10;
    }
  } else {
    score -= 40;
    reasons.push("content_age");
  }

  // Factor 2: SEO score (30 points max)
  if (dest.seoScore !== null && dest.seoScore !== undefined) {
    if (dest.seoScore < freshnessConfig.lowSeoScoreThreshold) {
      const seoPenalty = Math.min(30, Math.floor((freshnessConfig.lowSeoScoreThreshold - dest.seoScore) / 2));
      score -= seoPenalty;
      reasons.push("low_seo_score");
    } else if (dest.seoScore < 80) {
      score -= 10;
    }
  } else {
    score -= 30;
    reasons.push("low_seo_score");
  }

  // Factor 3: Content completeness (20 points max)
  if (dest.status === "empty") {
    score -= 20;
    missingSections.push(...freshnessConfig.requiredSections);
    reasons.push("missing_sections");
  } else if (dest.status === "partial") {
    score -= 10;
    reasons.push("missing_sections");
  }

  // Factor 4: Word count check (10 points max)
  if (dest.wordCount !== null && dest.wordCount !== undefined) {
    if (dest.wordCount < 500) {
      score -= 10;
    } else if (dest.wordCount < 1000) {
      score -= 5;
    }
  } else {
    score -= 10;
  }

  // Check for outdated year references in meta description
  if (dest.metaDescription) {
    const yearPattern = /\b(20\d{2})\b/g;
    let match;
    while ((match = yearPattern.exec(dest.metaDescription)) !== null) {
      const year = parseInt(match[1], 10);
      if (year < currentYear) {
        hasOutdatedReferences = true;
        if (!reasons.includes("outdated_references")) {
          reasons.push("outdated_references");
          score -= 10;
        }
        break;
      }
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
    missingSections,
    hasOutdatedReferences,
  };
}

/**
 * Determine staleness severity based on freshness score
 */
function getStaleSeverity(score: number): "critical" | "high" | "medium" | "low" | "fresh" {
  if (score >= 80) return "fresh";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "critical";
}

/**
 * Calculate priority for refresh (higher = more urgent)
 * Active destinations with low scores get higher priority
 */
function calculateRefreshPriority(dest: Destination, freshnessScore: number): number {
  let priority = 100 - freshnessScore;
  
  if (dest.isActive) {
    priority += 50;
  }
  
  if (dest.status === "empty") {
    priority += 30;
  }
  
  return priority;
}

/**
 * Check content freshness for all destinations
 */
export async function checkContentFreshness(): Promise<FreshnessCheckResult> {
  logger.info("Starting content freshness check");
  const checkedAt = new Date();

  const allDestinations = await db
    .select()
    .from(destinations)
    .orderBy(desc(destinations.isActive), desc(destinations.lastGenerated));

  const destinationFreshness: DestinationFreshness[] = [];
  let staleCount = 0;
  let freshCount = 0;
  let criticalCount = 0;
  let totalScore = 0;

  for (const dest of allDestinations) {
    const { score, reasons, missingSections, hasOutdatedReferences } = calculateFreshnessScore(dest);
    const severity = getStaleSeverity(score);
    const isStale = severity !== "fresh" && severity !== "low";
    const priority = calculateRefreshPriority(dest, score);

    let daysSinceGeneration: number | null = null;
    if (dest.lastGenerated) {
      daysSinceGeneration = Math.floor(
        (Date.now() - new Date(dest.lastGenerated).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    destinationFreshness.push({
      destinationId: dest.id,
      name: dest.name,
      country: dest.country,
      isActive: dest.isActive ?? false,
      freshnessScore: score,
      isStale,
      staleSeverity: severity,
      stalenessReasons: reasons,
      daysSinceGeneration,
      seoScore: dest.seoScore,
      wordCount: dest.wordCount,
      lastGenerated: dest.lastGenerated,
      missingSections,
      hasOutdatedReferences,
      priority,
    });

    totalScore += score;

    if (isStale) {
      staleCount++;
      if (severity === "critical") {
        criticalCount++;
      }
    } else {
      freshCount++;
    }
  }

  destinationFreshness.sort((a, b) => b.priority - a.priority);

  const result: FreshnessCheckResult = {
    totalDestinations: allDestinations.length,
    staleCount,
    freshCount,
    criticalCount,
    averageFreshnessScore: allDestinations.length > 0 
      ? Math.round(totalScore / allDestinations.length) 
      : 0,
    destinations: destinationFreshness,
    checkedAt,
  };

  logger.info({
    total: result.totalDestinations,
    stale: result.staleCount,
    critical: result.criticalCount,
    avgScore: result.averageFreshnessScore,
  }, "Content freshness check complete");

  return result;
}

/**
 * Refresh stale content for a specific destination
 */
export async function refreshStaleContent(destinationId: string): Promise<RefreshResult> {
  const startTime = Date.now();
  
  logger.info({ destinationId }, "Starting content refresh");

  const [destination] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.id, destinationId));

  if (!destination) {
    return {
      success: false,
      destinationId,
      name: "Unknown",
      previousScore: null,
      newScore: null,
      duration: Date.now() - startTime,
      error: "Destination not found",
    };
  }

  const previousScore = destination.seoScore;

  try {
    const { content: generatedContent, provider, model, duration: genDuration } = 
      await generateDestinationContent(destination);

    const { content: linkedContent, linksAdded } = applyInternalLinks(generatedContent, destination);

    const metrics = calculateSeoMetrics(linkedContent);

    const contentForValidation: ContentForValidation = {
      title: linkedContent.hero.title,
      metaTitle: `${destination.name} Travel Guide ${new Date().getFullYear()} | Travi`,
      metaDescription: linkedContent.hero.description.substring(0, 160),
      content: JSON.stringify(linkedContent),
      contentType: "landing_page",
    };
    
    const validationResult = validateThroughGateway(contentForValidation);

    await db
      .update(destinations)
      .set({
        status: "complete",
        hasPage: true,
        seoScore: validationResult.score,
        wordCount: metrics.wordCount,
        h2Count: metrics.h2Count,
        internalLinks: linksAdded,
        metaTitle: `${destination.name} Travel Guide ${new Date().getFullYear()} | Travi`,
        metaDescription: linkedContent.hero.description.substring(0, 160),
        lastGenerated: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(destinations.id, destinationId));

    await db.insert(aiGenerationLogs).values({
      targetType: "destination_refresh",
      targetId: destinationId,
      provider,
      model,
      prompt: `Freshness refresh for ${destination.name}`,
      success: true,
      seoScore: validationResult.score,
      qualityTier: validationResult.tier,
      duration: genDuration,
    } as any);

    const totalDuration = Date.now() - startTime;

    logger.info({
      destinationId,
      name: destination.name,
      previousScore,
      newScore: validationResult.score,
      duration: totalDuration,
    }, "Content refresh completed successfully");

    return {
      success: true,
      destinationId,
      name: destination.name,
      previousScore,
      newScore: validationResult.score,
      duration: totalDuration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const totalDuration = Date.now() - startTime;

    await db.insert(aiGenerationLogs).values({
      targetType: "destination_refresh",
      targetId: destinationId,
      provider: "unknown",
      model: "unknown",
      prompt: `Freshness refresh for ${destination.name}`,
      success: false,
      error: errorMessage,
      duration: totalDuration,
    } as any);

    logger.error({
      destinationId,
      name: destination.name,
      error: errorMessage,
    }, "Content refresh failed");

    return {
      success: false,
      destinationId,
      name: destination.name,
      previousScore,
      newScore: null,
      duration: totalDuration,
      error: errorMessage,
    };
  }
}

/**
 * Create notifications for stale content that wasn't auto-refreshed
 */
async function createStaleNotifications(
  staleDestinations: DestinationFreshness[],
  refreshedIds: Set<string>
): Promise<number> {
  const unrefshedStale = staleDestinations.filter(
    d => !refreshedIds.has(d.destinationId) && d.staleSeverity === "critical"
  );

  if (unrefshedStale.length === 0) {
    return 0;
  }

  const admins = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"));

  let notificationsCreated = 0;

  for (const admin of admins) {
    const destinationNames = unrefshedStale.slice(0, 5).map(d => d.name).join(", ");
    const moreCount = unrefshedStale.length > 5 ? ` and ${unrefshedStale.length - 5} more` : "";

    await db.insert(notifications).values({
      userId: admin.id,
      type: "warning",
      title: "Stale Content Alert",
      message: `${unrefshedStale.length} destination(s) need content refresh: ${destinationNames}${moreCount}`,
      metadata: {
        type: "stale_content_alert",
        staleCount: unrefshedStale.length,
        destinations: unrefshedStale.map(d => ({
          id: d.destinationId,
          name: d.name,
          score: d.freshnessScore,
          severity: d.staleSeverity,
        })),
      },
    } as any);

    notificationsCreated++;
  }

  return notificationsCreated;
}

/**
 * Main entry point for auto-pilot scheduler
 * Runs freshness check and auto-refreshes stale content
 */
export async function runFreshnessCheck(): Promise<RunFreshnessCheckResult> {
  logger.info("Running scheduled freshness check");

  const freshnessResult = await checkContentFreshness();

  const refreshed: RefreshResult[] = [];
  const refreshedIds = new Set<string>();
  let skippedDueToLimit = 0;

  if (freshnessConfig.autoRefreshStale) {
    // Check how many refreshes have already been done today
    const todayRefreshCount = await getTodayRefreshCount();
    const remainingSlots = Math.max(0, freshnessConfig.maxRefreshesPerDay - todayRefreshCount);

    if (remainingSlots === 0) {
      logger.info(
        { todayCount: todayRefreshCount, limit: freshnessConfig.maxRefreshesPerDay },
        "Daily refresh limit reached, skipping auto-refresh"
      );
    }

    const allStale = freshnessResult.destinations
      .filter(d => d.isStale && d.isActive)
      .sort((a, b) => b.priority - a.priority);

    // Only take as many as we have remaining slots for today
    const staleToRefresh = allStale.slice(0, remainingSlots);
    
    skippedDueToLimit = allStale.length - staleToRefresh.length;

    for (const dest of staleToRefresh) {
      logger.info({
        destinationId: dest.destinationId,
        name: dest.name,
        priority: dest.priority,
        severity: dest.staleSeverity,
      }, "Auto-refreshing stale destination");

      const result = await refreshStaleContent(dest.destinationId);
      refreshed.push(result);
      refreshedIds.add(dest.destinationId);

      if (staleToRefresh.indexOf(dest) < staleToRefresh.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  const notificationsCreated = await createStaleNotifications(
    freshnessResult.destinations.filter(d => d.isStale),
    refreshedIds
  );

  const result: RunFreshnessCheckResult = {
    checkedAt: new Date(),
    totalChecked: freshnessResult.totalDestinations,
    staleCount: freshnessResult.staleCount,
    refreshed,
    skippedDueToLimit,
    notificationsCreated,
  };

  logger.info({
    totalChecked: result.totalChecked,
    staleCount: result.staleCount,
    refreshedCount: result.refreshed.length,
    skipped: result.skippedDueToLimit,
    notifications: result.notificationsCreated,
  }, "Scheduled freshness check complete");

  return result;
}

/**
 * Get count of refreshes done today
 */
export async function getTodayRefreshCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: countFn() })
    .from(aiGenerationLogs)
    .where(and(
      eq(aiGenerationLogs.targetType, "destination_refresh"),
      sql`${aiGenerationLogs.createdAt} >= ${today}`
    ));

  return result?.count || 0;
}

/**
 * Update freshness configuration
 */
export function updateFreshnessConfig(config: Partial<FreshnessConfig>): FreshnessConfig {
  Object.assign(freshnessConfig, config);
  logger.info({ config: freshnessConfig }, "Freshness configuration updated");
  return freshnessConfig;
}

export const contentFreshness = {
  checkContentFreshness,
  refreshStaleContent,
  runFreshnessCheck,
  getTodayRefreshCount,
  updateFreshnessConfig,
  config: freshnessConfig,
};
