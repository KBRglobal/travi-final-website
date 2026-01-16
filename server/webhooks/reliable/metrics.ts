/**
 * Webhook Outbox Metrics
 *
 * Provides statistics for admin dashboard:
 * - Queue counts by status
 * - Success/failure rates
 * - Latency percentiles
 */

import { db } from "../../db";
import { webhookOutbox, webhookDeliveries } from "@shared/schema";
import { eq, count, sql, and, gte, isNotNull } from "drizzle-orm";

export interface WebhookMetrics {
  queue: {
    pending: number;
    sending: number;
    succeeded: number;
    failed: number;
    total: number;
  };
  rates: {
    successRate: number; // 0-100
    failureRate: number; // 0-100
    retryRate: number; // Average retries per delivery
  };
  latency: {
    p50Ms: number | null;
    p95Ms: number | null;
    p99Ms: number | null;
    avgMs: number | null;
  };
  recent: {
    last24hDeliveries: number;
    last24hSuccesses: number;
    last24hFailures: number;
  };
}

/**
 * Get comprehensive webhook metrics
 */
export async function getOutboxMetrics(): Promise<WebhookMetrics> {
  // Queue counts
  const [pending] = await db
    .select({ count: count() })
    .from(webhookOutbox)
    .where(eq(webhookOutbox.status, "pending"));

  const [sending] = await db
    .select({ count: count() })
    .from(webhookOutbox)
    .where(eq(webhookOutbox.status, "sending"));

  const [succeeded] = await db
    .select({ count: count() })
    .from(webhookOutbox)
    .where(eq(webhookOutbox.status, "succeeded"));

  const [failed] = await db
    .select({ count: count() })
    .from(webhookOutbox)
    .where(eq(webhookOutbox.status, "failed"));

  const pendingCount = pending?.count || 0;
  const sendingCount = sending?.count || 0;
  const succeededCount = succeeded?.count || 0;
  const failedCount = failed?.count || 0;
  const totalCount = pendingCount + sendingCount + succeededCount + failedCount;

  // Success/failure rates (based on final outcomes)
  const completedCount = succeededCount + failedCount;
  const successRate = completedCount > 0 ? (succeededCount / completedCount) * 100 : 100;
  const failureRate = completedCount > 0 ? (failedCount / completedCount) * 100 : 0;

  // Average retries
  const [avgRetries] = await db
    .select({ avg: sql<number>`AVG(${webhookOutbox.attempts})` })
    .from(webhookOutbox)
    .where(eq(webhookOutbox.status, "succeeded"));

  // Latency percentiles (from successful deliveries in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const latencyStats = await db
    .select({
      p50: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${webhookDeliveries.durationMs})`,
      p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${webhookDeliveries.durationMs})`,
      p99: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${webhookDeliveries.durationMs})`,
      avg: sql<number>`AVG(${webhookDeliveries.durationMs})`,
    })
    .from(webhookDeliveries)
    .where(
      and(
        gte(webhookDeliveries.sentAt, sevenDaysAgo),
        isNotNull(webhookDeliveries.durationMs)
      )
    );

  // Recent activity (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recentDeliveries] = await db
    .select({ count: count() })
    .from(webhookDeliveries)
    .where(gte(webhookDeliveries.sentAt, oneDayAgo));

  const [recentSuccesses] = await db
    .select({ count: count() })
    .from(webhookDeliveries)
    .where(
      and(
        gte(webhookDeliveries.sentAt, oneDayAgo),
        sql`${webhookDeliveries.statusCode} >= 200 AND ${webhookDeliveries.statusCode} < 300`
      )
    );

  const [recentFailures] = await db
    .select({ count: count() })
    .from(webhookDeliveries)
    .where(
      and(
        gte(webhookDeliveries.sentAt, oneDayAgo),
        sql`${webhookDeliveries.statusCode} IS NULL OR ${webhookDeliveries.statusCode} >= 400`
      )
    );

  return {
    queue: {
      pending: pendingCount,
      sending: sendingCount,
      succeeded: succeededCount,
      failed: failedCount,
      total: totalCount,
    },
    rates: {
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      retryRate: avgRetries?.avg ? Math.round(avgRetries.avg * 100) / 100 : 0,
    },
    latency: {
      p50Ms: latencyStats[0]?.p50 ? Math.round(latencyStats[0].p50) : null,
      p95Ms: latencyStats[0]?.p95 ? Math.round(latencyStats[0].p95) : null,
      p99Ms: latencyStats[0]?.p99 ? Math.round(latencyStats[0].p99) : null,
      avgMs: latencyStats[0]?.avg ? Math.round(latencyStats[0].avg) : null,
    },
    recent: {
      last24hDeliveries: recentDeliveries?.count || 0,
      last24hSuccesses: recentSuccesses?.count || 0,
      last24hFailures: recentFailures?.count || 0,
    },
  };
}

/**
 * Get queue counts only (lightweight)
 */
export async function getOutboxQueueCounts(): Promise<WebhookMetrics["queue"]> {
  const metrics = await getOutboxMetrics();
  return metrics.queue;
}
