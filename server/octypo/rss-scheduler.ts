/**
 * RSS Content Scheduler
 * Automatically generates news content from RSS feeds using Octypo
 * Configurable daily limit (default: 10 items per day)
 */

import { db } from "../db";
import { rssFeeds, contents, backgroundJobs } from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { jobQueue } from "../job-queue";

interface RSSSchedulerConfig {
  dailyLimit: number;
  intervalMinutes: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: RSSSchedulerConfig = {
  dailyLimit: 10,
  intervalMinutes: 60,
  enabled: true,
};

let schedulerInterval: NodeJS.Timeout | null = null;
let currentConfig: RSSSchedulerConfig = { ...DEFAULT_CONFIG };

async function getTodaysGeneratedCount(): Promise<number> {
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

async function getActiveRSSFeeds() {
  return db
    .select()
    .from(rssFeeds)
    .where(eq(rssFeeds.isActive, true))
    .orderBy(desc(rssFeeds.lastFetchedAt));
}

async function createRSSJob(feed: typeof rssFeeds.$inferSelect): Promise<string | null> {
  // FAIL-FAST: RSS feed must have a destinationId - no silent defaults
  if (!feed.destinationId) {
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
    };

    const jobId = await jobQueue.addJob("ai_generate", jobData, { priority: 5 });

    await db
      .update(rssFeeds)
      .set({ lastFetchedAt: new Date() } as any)
      .where(eq(rssFeeds.id, feed.id));

    return jobId;
  } catch (error) {
    return null;
  }
}

async function runSchedulerCycle(): Promise<{ created: number; remaining: number }> {
  if (!currentConfig.enabled) {
    return { created: 0, remaining: currentConfig.dailyLimit };
  }

  const generatedToday = await getTodaysGeneratedCount();
  const remaining = Math.max(0, currentConfig.dailyLimit - generatedToday);

  if (remaining <= 0) {
    return { created: 0, remaining: 0 };
  }

  const feeds = await getActiveRSSFeeds();
  if (feeds.length === 0) {
    return { created: 0, remaining };
  }

  const pendingJobs = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(backgroundJobs)
    .where(and(eq(backgroundJobs.type, "ai_generate"), eq(backgroundJobs.status, "pending")));

  const pendingCount = pendingJobs[0]?.count || 0;
  if (pendingCount >= 5) {
    return { created: 0, remaining };
  }

  const jobsToCreate = Math.min(remaining, 2, feeds.length);
  let created = 0;

  for (let i = 0; i < jobsToCreate; i++) {
    const feed = feeds[i % feeds.length];
    const jobId = await createRSSJob(feed);
    if (jobId) created++;
  }

  return { created, remaining: remaining - created };
}

export function startRSSScheduler(config?: Partial<RSSSchedulerConfig>): void {
  if (schedulerInterval) {
    stopRSSScheduler();
  }

  currentConfig = { ...DEFAULT_CONFIG, ...config };

  runSchedulerCycle().catch(() => {});

  schedulerInterval = setInterval(
    () => runSchedulerCycle().catch(() => {}),
    currentConfig.intervalMinutes * 60 * 1000
  );
}

export function stopRSSScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export function updateRSSSchedulerConfig(config: Partial<RSSSchedulerConfig>): void {
  const wasEnabled = currentConfig.enabled;
  currentConfig = { ...currentConfig, ...config };

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

export async function manualTrigger(): Promise<{ created: number; remaining: number }> {
  return runSchedulerCycle();
}
