/**
 * RSS Content Scheduler v2
 *
 * Automatically generates news content from RSS feeds using Octypo
 *
 * Key features:
 * - Per-destination daily limits (default: 4 items/day per destination)
 * - Fair distribution across all destinations
 * - Integration with publish hooks for localization
 * - Quality threshold enforcement
 */

import { db } from "../db";
import { rssFeeds, contents, backgroundJobs } from "@shared/schema";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";
import { jobQueue } from "../job-queue";
import { log } from "../lib/logger";

// ============================================
// CONFIGURATION
// ============================================

interface RSSSchedulerConfig {
  /** Items per destination per day (default: 4) */
  dailyLimitPerDestination: number;
  /** Global daily limit across all destinations (default: 68 = 17 destinations × 4) */
  globalDailyLimit: number;
  /** Interval between scheduler runs in minutes (default: 60) */
  intervalMinutes: number;
  /** Whether scheduler is enabled */
  enabled: boolean;
  /** Minimum quality score for auto-publish (default: 85) */
  minQualityScore: number;
}

const DEFAULT_CONFIG: RSSSchedulerConfig = {
  dailyLimitPerDestination: 4,
  globalDailyLimit: 68, // 17 destinations × 4
  intervalMinutes: 60,
  enabled: true,
  minQualityScore: 85,
};

let schedulerInterval: NodeJS.Timeout | null = null;
let currentConfig: RSSSchedulerConfig = { ...DEFAULT_CONFIG };

// ============================================
// DAILY COUNT TRACKING (PER DESTINATION)
// ============================================

interface DestinationCounts {
  [destinationId: string]: number;
}

async function getTodaysCountsPerDestination(): Promise<DestinationCounts> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count AI-generated articles per destination today
  // related_destination_ids is JSONB, use ->> 0 to get first element
  const result = await db.execute(sql`
    SELECT
      a.related_destination_ids ->> 0 as destination_id,
      COUNT(*) as count
    FROM contents c
    JOIN articles a ON a.content_id = c.id
    WHERE c.type = 'article'
      AND c.generated_by_ai = true
      AND c.created_at >= ${today}
      AND a.related_destination_ids IS NOT NULL
      AND jsonb_array_length(a.related_destination_ids) > 0
    GROUP BY a.related_destination_ids ->> 0
  `);

  const counts: DestinationCounts = {};
  for (const row of result.rows as any[]) {
    if (row.destination_id) {
      counts[row.destination_id] = parseInt(row.count, 10);
    }
  }

  return counts;
}

async function getTodaysTotalCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contents)
    .where(
      and(
        eq(contents.type, "article"),
        gte(contents.createdAt, today),
        eq(contents.generatedByAI, true)
      )
    );

  return result[0]?.count || 0;
}

// ============================================
// FEED SELECTION (FAIR DISTRIBUTION)
// ============================================

interface FeedWithPriority {
  feed: typeof rssFeeds.$inferSelect;
  priority: number;
  destinationCount: number;
  remainingSlots: number;
}

async function selectFeedsForProcessing(
  maxJobs: number,
  destinationCounts: DestinationCounts
): Promise<Array<typeof rssFeeds.$inferSelect>> {
  // Get all active feeds with destinationId
  const feeds = await db
    .select()
    .from(rssFeeds)
    .where(eq(rssFeeds.isActive, true))
    .orderBy(desc(rssFeeds.lastFetchedAt));

  // Filter feeds that have destinations with remaining slots
  const feedsWithPriority: FeedWithPriority[] = [];

  for (const feed of feeds) {
    if (!feed.destinationId) continue;

    const currentCount = destinationCounts[feed.destinationId] || 0;
    const remainingSlots = currentConfig.dailyLimitPerDestination - currentCount;

    if (remainingSlots <= 0) continue;

    // Calculate priority (higher = more urgent)
    // - Destinations with fewer articles today get higher priority
    // - Feeds that haven't been fetched recently get higher priority
    const lastFetchAge = feed.lastFetchedAt
      ? Date.now() - new Date(feed.lastFetchedAt).getTime()
      : Infinity;
    const agePriority = Math.min(lastFetchAge / (60 * 60 * 1000), 24); // Max 24 hours

    const priority = remainingSlots * 10 + agePriority;

    feedsWithPriority.push({
      feed,
      priority,
      destinationCount: currentCount,
      remainingSlots,
    });
  }

  // Sort by priority (descending) and take top feeds
  feedsWithPriority.sort((a, b) => b.priority - a.priority);

  // Ensure we distribute across different destinations
  const selectedFeeds: Array<typeof rssFeeds.$inferSelect> = [];
  const selectedDestinations = new Set<string>();

  for (const item of feedsWithPriority) {
    if (selectedFeeds.length >= maxJobs) break;

    // Prefer destinations we haven't selected yet in this cycle
    if (!selectedDestinations.has(item.feed.destinationId!)) {
      selectedFeeds.push(item.feed);
      selectedDestinations.add(item.feed.destinationId!);
    }
  }

  // If we still have slots and exhausted unique destinations, add more
  if (selectedFeeds.length < maxJobs) {
    for (const item of feedsWithPriority) {
      if (selectedFeeds.length >= maxJobs) break;
      if (!selectedFeeds.includes(item.feed)) {
        selectedFeeds.push(item.feed);
      }
    }
  }

  return selectedFeeds;
}

// ============================================
// JOB CREATION
// ============================================

async function createRSSJob(
  feed: typeof rssFeeds.$inferSelect,
  destinationCount: number
): Promise<string | null> {
  if (!feed.destinationId) {
    log.warn(`[RSSScheduler] Skipping feed without destinationId: ${feed.name}`);
    return null;
  }

  try {
    const jobData = {
      jobType: "rss-content-generation" as const,
      feedId: feed.id,
      feedUrl: feed.url,
      feedName: feed.name,
      destination: feed.destinationId,
      category: feed.category || "news",
      minQualityScore: currentConfig.minQualityScore,
      currentDestinationCount: destinationCount,
      maxForDestination: currentConfig.dailyLimitPerDestination,
    };

    const jobId = await jobQueue.addJob("ai_generate", jobData, { priority: 5 });

    // Update last fetched time
    await db
      .update(rssFeeds)
      .set({ lastFetchedAt: new Date() } as any)
      .where(eq(rssFeeds.id, feed.id));

    log.info(`[RSSScheduler] Created job for ${feed.name} (${feed.destinationId})`, {
      jobId,
      destination: feed.destinationId,
      currentCount: destinationCount,
    });

    return jobId;
  } catch (error) {
    log.error(`[RSSScheduler] Failed to create job for ${feed.name}:`, error);
    return null;
  }
}

// ============================================
// SCHEDULER CYCLE
// ============================================

async function runSchedulerCycle(): Promise<{
  created: number;
  destinations: string[];
  globalRemaining: number;
}> {
  if (!currentConfig.enabled) {
    return { created: 0, destinations: [], globalRemaining: currentConfig.globalDailyLimit };
  }

  // Check global limit
  const totalToday = await getTodaysTotalCount();
  const globalRemaining = Math.max(0, currentConfig.globalDailyLimit - totalToday);

  if (globalRemaining <= 0) {
    log.info("[RSSScheduler] Global daily limit reached", { totalToday });
    return { created: 0, destinations: [], globalRemaining: 0 };
  }

  // Get per-destination counts
  const destinationCounts = await getTodaysCountsPerDestination();

  // Check pending jobs to avoid creating too many
  const pendingJobs = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(backgroundJobs)
    .where(and(eq(backgroundJobs.type, "ai_generate"), eq(backgroundJobs.status, "pending")));

  const pendingCount = pendingJobs[0]?.count || 0;
  if (pendingCount >= 10) {
    log.info("[RSSScheduler] Too many pending jobs, skipping cycle", { pendingCount });
    return { created: 0, destinations: [], globalRemaining };
  }

  // Calculate how many jobs to create this cycle
  const jobsToCreate = Math.min(
    globalRemaining,
    4, // Max 4 jobs per cycle
    10 - pendingCount // Don't exceed 10 pending jobs
  );

  if (jobsToCreate <= 0) {
    return { created: 0, destinations: [], globalRemaining };
  }

  // Select feeds for processing
  const feeds = await selectFeedsForProcessing(jobsToCreate, destinationCounts);

  if (feeds.length === 0) {
    log.info("[RSSScheduler] No eligible feeds for processing");
    return { created: 0, destinations: [], globalRemaining };
  }

  // Create jobs
  let created = 0;
  const destinations: string[] = [];

  for (const feed of feeds) {
    const count = destinationCounts[feed.destinationId!] || 0;
    const jobId = await createRSSJob(feed, count);
    if (jobId) {
      created++;
      destinations.push(feed.destinationId!);
      // Update local count to prevent over-scheduling
      destinationCounts[feed.destinationId!] = count + 1;
    }
  }

  log.info(`[RSSScheduler] Cycle complete`, {
    created,
    destinations,
    globalRemaining: globalRemaining - created,
  });

  return { created, destinations, globalRemaining: globalRemaining - created };
}

// ============================================
// PUBLIC API
// ============================================

export function startRSSScheduler(config?: Partial<RSSSchedulerConfig>): void {
  if (schedulerInterval) {
    stopRSSScheduler();
  }

  currentConfig = { ...DEFAULT_CONFIG, ...config };

  log.info("[RSSScheduler] Starting scheduler", {
    dailyLimitPerDestination: currentConfig.dailyLimitPerDestination,
    globalDailyLimit: currentConfig.globalDailyLimit,
    intervalMinutes: currentConfig.intervalMinutes,
  });

  // Run immediately
  runSchedulerCycle().catch(err => {
    log.error("[RSSScheduler] Initial cycle failed:", err);
  });

  // Schedule recurring runs
  schedulerInterval = setInterval(
    () =>
      runSchedulerCycle().catch(err => {
        log.error("[RSSScheduler] Scheduled cycle failed:", err);
      }),
    currentConfig.intervalMinutes * 60 * 1000
  );
}

export function stopRSSScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    log.info("[RSSScheduler] Scheduler stopped");
  }
}

export function updateRSSSchedulerConfig(config: Partial<RSSSchedulerConfig>): void {
  const wasEnabled = currentConfig.enabled;
  currentConfig = { ...currentConfig, ...config };

  log.info(`[RSSScheduler] Config updated: ${JSON.stringify(currentConfig)}`);

  if (config.enabled === false && wasEnabled) {
    stopRSSScheduler();
  } else if (config.enabled === true && !wasEnabled) {
    startRSSScheduler(currentConfig);
  }
}

export function getRSSSchedulerStatus(): {
  running: boolean;
  config: RSSSchedulerConfig;
} {
  return {
    running: schedulerInterval !== null,
    config: { ...currentConfig },
  };
}

export async function getSchedulerStats(): Promise<{
  totalToday: number;
  perDestination: DestinationCounts;
  globalRemaining: number;
  perDestinationRemaining: DestinationCounts;
}> {
  const totalToday = await getTodaysTotalCount();
  const perDestination = await getTodaysCountsPerDestination();

  const perDestinationRemaining: DestinationCounts = {};
  for (const [dest, count] of Object.entries(perDestination)) {
    perDestinationRemaining[dest] = Math.max(0, currentConfig.dailyLimitPerDestination - count);
  }

  return {
    totalToday,
    perDestination,
    globalRemaining: Math.max(0, currentConfig.globalDailyLimit - totalToday),
    perDestinationRemaining,
  };
}

export async function manualTrigger(): Promise<{
  created: number;
  destinations: string[];
  globalRemaining: number;
}> {
  return runSchedulerCycle();
}
