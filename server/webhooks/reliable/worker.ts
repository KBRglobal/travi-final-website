/**
 * Reliable Webhook Worker
 *
 * Processes outbox table, delivers webhooks with:
 * - Exponential backoff with jitter
 * - Row-level locking for concurrency safety
 * - Delivery attempt logging
 * - Automatic status updates
 */

import crypto from "crypto";
import { db } from "../../db";
import { webhookOutbox, webhookDeliveries, webhooks, type WebhookOutbox } from "@shared/schema";
import { eq, and, lte, isNull, or, sql } from "drizzle-orm";

// Worker configuration
const BATCH_SIZE = 50; // Max items per run
const POLL_INTERVAL_MS = 5000; // 5 seconds
const LOCK_DURATION_MS = 60000; // 1 minute lock
const FETCH_TIMEOUT_MS = 30000; // 30 second fetch timeout
const MAX_ATTEMPTS = 12;

// Exponential backoff delays (in seconds): 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s, 1024s, 2048s
const BACKOFF_BASE = 1;
const BACKOFF_MULTIPLIER = 2;
const JITTER_MAX_MS = 5000; // Up to 5s random jitter

/**
 * Calculate next attempt time with exponential backoff and jitter
 */
export function calculateNextAttempt(attemptNumber: number): Date {
  const delaySeconds = BACKOFF_BASE * Math.pow(BACKOFF_MULTIPLIER, attemptNumber);
  const jitterMs = Math.random() * JITTER_MAX_MS;
  const totalMs = delaySeconds * 1000 + jitterMs;
  return new Date(Date.now() + totalMs);
}

/**
 * Generate HMAC-SHA256 signature
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Process a single outbox item
 */
async function processOutboxItem(item: WebhookOutbox): Promise<void> {
  const startTime = Date.now();
  let statusCode: number | undefined;
  let error: string | undefined;
  let responseBody: string | undefined;

  try {
    // Fetch endpoint config
    const [endpoint] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, item.endpointId))
      .limit(1);

    if (!endpoint || !endpoint.isActive) {
      // Endpoint deleted or disabled, mark as failed
      await db
        .update(webhookOutbox)
        .set({
          status: "failed",
          lastError: "Endpoint not found or disabled",
          lockedUntil: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(webhookOutbox.id, item.id));
      return;
    }

    // Build payload
    const payloadObj = {
      event: item.eventType,
      timestamp: new Date().toISOString(),
      data: item.payloadJson,
    };
    const payloadString = JSON.stringify(payloadObj);
    const signature = endpoint.secret ? generateSignature(payloadString, endpoint.secret) : "";

    // Send request
    const response = await fetchWithTimeout(
      endpoint.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": item.eventType,
          "X-Webhook-ID": item.id,
          "X-Webhook-Attempt": String(item.attempts + 1),
        },
        body: payloadString,
      },
      FETCH_TIMEOUT_MS
    );

    statusCode = response.status;
    responseBody = await response.text().catch(() => undefined);

    if (response.ok) {
      // Success
      await db
        .update(webhookOutbox)
        .set({
          status: "succeeded",
          attempts: item.attempts + 1,
          lastStatusCode: statusCode,
          lockedUntil: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(webhookOutbox.id, item.id));
    } else {
      error = `HTTP ${statusCode}: ${responseBody?.substring(0, 200) || "No response body"}`;
      throw new Error(error);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    const newAttempts = item.attempts + 1;

    if (newAttempts >= (item.maxAttempts || MAX_ATTEMPTS)) {
      // Max retries reached
      await db
        .update(webhookOutbox)
        .set({
          status: "failed",
          attempts: newAttempts,
          lastError: error,
          lastStatusCode: statusCode,
          lockedUntil: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(webhookOutbox.id, item.id));
    } else {
      // Schedule retry
      const nextAttempt = calculateNextAttempt(newAttempts);
      await db
        .update(webhookOutbox)
        .set({
          status: "pending",
          attempts: newAttempts,
          nextAttemptAt: nextAttempt,
          lastError: error,
          lastStatusCode: statusCode,
          lockedUntil: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(webhookOutbox.id, item.id));
    }
  }

  // Log delivery attempt
  const durationMs = Date.now() - startTime;
  try {
    await db.insert(webhookDeliveries).values({
      outboxId: item.id,
      attemptNo: item.attempts + 1,
      sentAt: new Date(),
      durationMs,
      statusCode,
      error,
      responseBody: responseBody?.substring(0, 1000), // Truncate response
    } as any);
  } catch (logError) {}
}

/**
 * Acquire and process pending outbox items
 */
async function processBatch(): Promise<number> {
  const now = new Date();

  // Find and lock pending items
  // Use row-level locking by setting lockedUntil
  const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);

  // Get items that are pending and due, and not locked
  const pendingItems = await db
    .select()
    .from(webhookOutbox)
    .where(
      and(
        eq(webhookOutbox.status, "pending"),
        lte(webhookOutbox.nextAttemptAt, now),
        or(isNull(webhookOutbox.lockedUntil), lte(webhookOutbox.lockedUntil, now))
      )
    )
    .limit(BATCH_SIZE);

  if (pendingItems.length === 0) {
    return 0;
  }

  // Lock items
  const itemIds = pendingItems.map(item => item.id);
  await db
    .update(webhookOutbox)
    .set({
      status: "sending",
      lockedUntil: lockUntil,
      updatedAt: new Date(),
    } as any)
    .where(
      and(
        sql`${webhookOutbox.id} = ANY(${itemIds})`,
        eq(webhookOutbox.status, "pending") // Double-check status for race condition
      )
    );

  // Process each item
  let processed = 0;
  for (const item of pendingItems) {
    try {
      await processOutboxItem({ ...item, status: "sending" });
      processed++;
    } catch (error) {}
  }

  return processed;
}

// Worker state
let isRunning = false;
let pollInterval: NodeJS.Timeout | null = null;

/**
 * Webhook delivery worker
 */
export const webhookWorker = {
  /**
   * Process pending webhooks once
   */
  async processOnce(): Promise<number> {
    return processBatch();
  },

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return isRunning;
  },
};

/**
 * Start the webhook worker
 */
export function startWebhookWorker(): void {
  if (isRunning) {
    return;
  }

  if (process.env.ENABLE_RELIABLE_WEBHOOKS !== "true") {
    return;
  }

  isRunning = true;

  // Start polling
  pollInterval = setInterval(async () => {
    try {
      const processed = await processBatch();
      if (processed > 0) {
      }
    } catch (error) {}
  }, POLL_INTERVAL_MS);

  // Recover stuck items on startup
  recoverStuckItems();
}

/**
 * Stop the webhook worker
 */
export function stopWebhookWorker(): void {
  if (!isRunning) {
    return;
  }

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  isRunning = false;
}

/**
 * Recover items stuck in "sending" state (from crashed worker)
 */
async function recoverStuckItems(): Promise<void> {
  try {
    const result = await db
      .update(webhookOutbox)
      .set({
        status: "pending",
        lockedUntil: null,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(webhookOutbox.status, "sending"), lte(webhookOutbox.lockedUntil, new Date())))
      .returning({ id: webhookOutbox.id });

    if (result.length > 0) {
    }
  } catch (error) {}
}
