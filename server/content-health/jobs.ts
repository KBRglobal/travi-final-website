/**
 * Content Health Engine - Jobs
 * Background jobs for health checking and remediation
 */

import { db } from "../db";
import { contents } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { scoreContent, batchScoreContent, invalidateScoreCache } from "./scorer";
import {
  createRemediationActions,
  queueRemediation,
  processRemediationQueue,
  getRemediationStats,
} from "./remediation-engine";
import { ContentHealthStats as ContentHealthMetrics, DEFAULT_SCANNER_CONFIG } from "./types";

const DEFAULT_HEALTH_CONFIG = {
  autoRemediationEnabled: (DEFAULT_SCANNER_CONFIG as any).autoEnqueueJobs ?? false,
  checkIntervalHours:
    ((DEFAULT_SCANNER_CONFIG as any).scanIntervalMs ?? 300000) / (60 * 60 * 1000) || 1,
} as any;

let isRunning = false;
let jobIntervalId: NodeJS.Timeout | null = null;
let remediationIntervalId: NodeJS.Timeout | null = null;

const healthScoreHistory: Map<string, number[]> = new Map();
const MAX_HISTORY_SIZE = 100;

function isEnabled(): boolean {
  return process.env.ENABLE_CONTENT_HEALTH === "true";
}

export async function runHealthCheck(contentIds?: string[]): Promise<any> {
  const startTime = Date.now();

  let targetIds = contentIds;

  if (!targetIds) {
    // Get all published content
    const published = await db
      .select({ id: contents.id })
      .from(contents)
      .where(eq(contents.status, "published"))
      .limit(1000); // Limit batch size

    targetIds = published.map(c => c.id);
  }

  const scores = await batchScoreContent(targetIds);

  let healthyCount = 0;
  let needsAttentionCount = 0;
  let criticalCount = 0;
  let totalScore = 0;
  let remediationsQueued = 0;

  for (const [contentId, score] of scores) {
    totalScore += score.overallScore;

    // Track history
    const history = healthScoreHistory.get(contentId) || [];
    history.push(score.overallScore);
    if (history.length > MAX_HISTORY_SIZE) history.shift();
    healthScoreHistory.set(contentId, history);

    if (score.overallScore >= 85) {
      healthyCount++;
    } else if (score.remediationPriority === "critical") {
      criticalCount++;
      needsAttentionCount++;
    } else if (score.needsRemediation) {
      needsAttentionCount++;
    }

    // Queue remediation actions
    if (score.needsRemediation && DEFAULT_HEALTH_CONFIG.autoRemediationEnabled) {
      const actions = createRemediationActions(score);
      for (const action of actions) {
        queueRemediation(action);
        remediationsQueued++;
      }
    }
  }

  const elapsed = Date.now() - startTime;

  const remediationStats = getRemediationStats();

  return {
    totalContent: scores.size,
    healthyContent: healthyCount,
    needsAttention: needsAttentionCount,
    criticalIssues: criticalCount,
    remediationsToday: remediationStats.completed + remediationStats.pending,
    successRate:
      remediationStats.completed + remediationStats.failed > 0
        ? Math.round(
            (remediationStats.completed / (remediationStats.completed + remediationStats.failed)) *
              100
          )
        : 100,
    averageHealthScore: scores.size > 0 ? Math.round(totalScore / scores.size) : 100,
  };
}

export async function runHealthCheckForContent(contentId: string): Promise<void> {
  const score = await scoreContent(contentId);
  if (!score) return;

  if (score.needsRemediation && DEFAULT_HEALTH_CONFIG.autoRemediationEnabled) {
    const actions = createRemediationActions(score);
    for (const action of actions) {
      queueRemediation(action);
    }
  }
}

async function processHealthCheckCycle(): Promise<void> {
  if (!isEnabled()) return;
  if (isRunning) return;

  isRunning = true;

  try {
    await runHealthCheck();
  } catch (error) {
  } finally {
    isRunning = false;
  }
}

async function processRemediationCycle(): Promise<void> {
  if (!isEnabled()) return;

  try {
    const processed = await processRemediationQueue();
    if (processed > 0) {
    }
  } catch (error) {}
}

export function startHealthJobs(): void {
  if (!isEnabled()) {
    return;
  }

  // Health check every N hours
  const checkIntervalMs = DEFAULT_HEALTH_CONFIG.checkIntervalHours * 60 * 60 * 1000;
  jobIntervalId = setInterval(processHealthCheckCycle, checkIntervalMs);

  // Remediation processing every minute
  remediationIntervalId = setInterval(processRemediationCycle, 60 * 1000);

  // Initial run after 30 seconds
  setTimeout(processHealthCheckCycle, 30 * 1000);
}

export function stopHealthJobs(): void {
  if (jobIntervalId) {
    clearInterval(jobIntervalId);
    jobIntervalId = null;
  }
  if (remediationIntervalId) {
    clearInterval(remediationIntervalId);
    remediationIntervalId = null;
  }
}

export function onContentUpdated(contentId: string): void {
  if (!isEnabled()) return;

  // Invalidate cache and re-check
  invalidateScoreCache(contentId);

  // Schedule health check for updated content
  setTimeout(() => runHealthCheckForContent(contentId), 5000);
}

export function onContentPublished(contentId: string): void {
  if (!isEnabled()) return;

  // Invalidate and schedule check
  invalidateScoreCache(contentId);
  setTimeout(() => runHealthCheckForContent(contentId), 10000);
}

export function getHealthTrend(contentId: string): {
  current: number;
  trend: "improving" | "declining" | "stable";
  history: number[];
} {
  const history = healthScoreHistory.get(contentId) || [];
  const current = history[history.length - 1] || 0;

  if (history.length < 2) {
    return { current, trend: "stable", history };
  }

  const recent = history.slice(-5);
  const earlier = history.slice(-10, -5);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg =
    earlier.length > 0 ? earlier.reduce((a, b) => a + b, 0) / earlier.length : recentAvg;

  const diff = recentAvg - earlierAvg;

  let trend: "improving" | "declining" | "stable" = "stable";
  if (diff > 5) trend = "improving";
  else if (diff < -5) trend = "declining";

  return { current, trend, history };
}
