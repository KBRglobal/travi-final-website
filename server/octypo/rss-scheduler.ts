/**
 * RSS Content Scheduler v3
 *
 * Routes RSS content through the Gatekeeper Pipeline (Pipeline B):
 * RSS -> Gate1 (Selection) -> Writer -> Gate2 (Approval) -> Publish
 *
 * Key features:
 * - Global daily limit enforcement
 * - Pending job throttling (octypo_write jobs)
 * - Delegates item selection and evaluation to Gatekeeper
 * - Quality threshold enforcement via Gate1 + Gate2
 */

import { db } from "../db";
import { contents, backgroundJobs } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getGatekeeperOrchestrator } from "./gatekeeper";
import { log } from "../lib/logger";

// ============================================
// CONFIGURATION
// ============================================

interface RSSSchedulerConfig {
  /** Items per destination per day (default: 5) */
  dailyLimitPerDestination: number;
  /** Global daily limit across all destinations (default: 50) */
  globalDailyLimit: number;
  /** Interval between scheduler runs in minutes (default: 30) */
  intervalMinutes: number;
  /** Whether scheduler is enabled */
  enabled: boolean;
  /** Minimum quality score for auto-publish (default: 85) */
  minQualityScore: number;
}

const DEFAULT_CONFIG: RSSSchedulerConfig = {
  dailyLimitPerDestination: 5,
  globalDailyLimit: 50,
  intervalMinutes: 30,
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

  // Check pending octypo_write jobs to avoid creating too many
  const pendingJobs = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(backgroundJobs)
    .where(and(sql`${backgroundJobs.type} = 'octypo_write'`, eq(backgroundJobs.status, "pending")));

  const pendingCount = pendingJobs[0]?.count || 0;
  if (pendingCount >= 10) {
    log.info("[RSSScheduler] Too many pending octypo_write jobs, skipping cycle", { pendingCount });
    return { created: 0, destinations: [], globalRemaining };
  }

  // Calculate how many items to process this cycle
  const maxItems = Math.min(
    globalRemaining,
    8, // Max 8 items per cycle
    10 - pendingCount // Don't exceed 10 pending jobs
  );

  if (maxItems <= 0) {
    return { created: 0, destinations: [], globalRemaining };
  }

  // Run the Gatekeeper pipeline — it fetches unprocessed RSS items,
  // evaluates them through Gate1, and queues octypo_write jobs
  const orchestrator = getGatekeeperOrchestrator();
  const stats = await orchestrator.runPipeline(maxItems);

  log.info("[RSSScheduler] Cycle complete (Gatekeeper pipeline)", {
    itemsEvaluated: stats.itemsEvaluated,
    itemsApprovedForWriting: stats.itemsApprovedForWriting,
    itemsSkipped: stats.itemsSkipped,
    globalRemaining: globalRemaining - stats.itemsApprovedForWriting,
  });

  return {
    created: stats.itemsApprovedForWriting,
    destinations: [], // Gatekeeper handles destination assignment internally
    globalRemaining: globalRemaining - stats.itemsApprovedForWriting,
  };
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
