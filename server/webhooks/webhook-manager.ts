/**
 * Webhook Manager
 *
 * Manages webhook subscriptions and delivery
 * - HMAC-SHA256 signatures for security
 * - Automatic retry logic with exponential backoff
 * - Event filtering
 * - Delivery logging
 */

import crypto from "crypto";
import { db } from "../db";
import { webhooks, webhookLogs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";

const WEBHOOK_TIMEOUT_MS = 10000; // 10s timeout for webhooks
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

// Replay attack protection: Max age for webhook requests (5 minutes)
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;
// Nonce cache to prevent replay attacks (in-memory, cleared periodically)
const usedNonces = new Map<string, number>();

// Cleanup old nonces every 10 minutes
setInterval(
  () => {
    const cutoff = Date.now() - MAX_WEBHOOK_AGE_MS;
    for (const [nonce, timestamp] of usedNonces.entries()) {
      if (timestamp < cutoff) {
        usedNonces.delete(nonce);
      }
    }
  },
  10 * 60 * 1000
);

export interface WebhookPayload {
  event: string;
  timestamp: string;
  nonce: string; // Unique ID for replay protection
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: unknown;
  error?: string;
  attempts: number;
}

export const webhookManager = {
  /**
   * Generate HMAC-SHA256 signature for payload
   */
  generateSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  },

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false; // Different lengths means invalid
    }
  },

  /**
   * Generate a unique nonce for replay protection
   */
  generateNonce(): string {
    return `${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
  },

  /**
   * Verify incoming webhook for replay attacks
   * Call this when receiving webhooks from external sources
   */
  verifyIncomingWebhook(
    payload: string,
    signature: string,
    timestamp: string,
    nonce: string,
    secret: string
  ): { valid: boolean; error?: string } {
    // 1. Verify signature first
    if (!this.verifySignature(payload, signature, secret)) {
      return { valid: false, error: "Invalid signature" };
    }

    // 2. Check timestamp is not too old (prevents replay of old requests)
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (isNaN(webhookTime) || now - webhookTime > MAX_WEBHOOK_AGE_MS) {
      return { valid: false, error: "Webhook timestamp too old or invalid" };
    }

    // 3. Check timestamp is not in the future (clock skew tolerance: 1 minute)
    if (webhookTime > now + 60000) {
      return { valid: false, error: "Webhook timestamp in the future" };
    }

    // 4. Check nonce hasn't been used (prevents replay of recent requests)
    if (usedNonces.has(nonce)) {
      return { valid: false, error: "Nonce already used (replay attack detected)" };
    }

    // 5. Store nonce to prevent reuse
    usedNonces.set(nonce, webhookTime);

    return { valid: true };
  },

  /**
   * Deliver webhook with retry logic
   */
  async deliverWebhook(
    webhookId: string,
    event: string,
    data: Record<string, unknown>
  ): Promise<WebhookDeliveryResult> {
    try {
      // Fetch webhook configuration
      const webhook = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);

      if (webhook.length === 0 || (webhook[0] as any).status !== "active") {
        return {
          success: false,
          error: "Webhook not found or inactive",
          attempts: 0,
        };
      }

      const config = webhook[0];

      // Check if webhook is subscribed to this event
      const subscribedEvents = (config.events as string[]) || [];
      if (subscribedEvents.length > 0 && !subscribedEvents.includes(event)) {
        return {
          success: false,
          error: "Webhook not subscribed to this event",
          attempts: 0,
        };
      }

      // Build payload with nonce for replay protection
      const nonce = this.generateNonce();
      const timestamp = new Date().toISOString();
      const payload: WebhookPayload = {
        event,
        timestamp,
        nonce,
        data,
      };

      const payloadString = JSON.stringify(payload);
      const signature = this.generateSignature(payloadString, config.secret);

      // Attempt delivery with retries
      let lastError: string | null = null;
      let lastStatusCode: number | null = null;
      let lastResponse: unknown = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetchWithTimeout(config.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-Webhook-Event": event,
              "X-Webhook-ID": webhookId,
              "X-Webhook-Timestamp": timestamp,
              "X-Webhook-Nonce": nonce,
            },
            body: payloadString,
            timeoutMs: WEBHOOK_TIMEOUT_MS,
          });

          lastStatusCode = response.status;
          lastResponse = await response.text();

          // Success if 2xx status
          if (response.ok) {
            await this.logDelivery(
              webhookId,
              event,
              payload,
              true,
              response.status,
              lastResponse,
              attempt
            );

            return {
              success: true,
              statusCode: response.status,
              response: lastResponse,
              attempts: attempt,
            };
          }

          lastError = `HTTP ${response.status}: ${lastResponse}`;

          // Don't retry on 4xx errors (except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            break;
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Unknown error";
        }

        // Wait before retry (except on last attempt)
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]));
        }
      }

      // All retries failed
      await this.logDelivery(
        webhookId,
        event,
        payload,
        false,
        lastStatusCode,
        lastResponse,
        MAX_RETRIES,
        lastError || undefined
      );

      // Mark webhook as failed after repeated failures
      await this.checkAndUpdateWebhookStatus(webhookId);

      return {
        success: false,
        statusCode: lastStatusCode || undefined,
        error: lastError || "Delivery failed",
        attempts: MAX_RETRIES,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        attempts: 0,
      };
    }
  },

  /**
   * Log webhook delivery attempt
   */
  async logDelivery(
    webhookId: string,
    event: string,
    payload: WebhookPayload,
    success: boolean,
    statusCode: number | null,
    response: unknown,
    attempts: number,
    error?: string
  ): Promise<void> {
    try {
      await db.insert(webhookLogs).values({
        webhookId,
        event,
        payload: payload as unknown as Record<string, unknown>,
        response: response as Record<string, unknown>,
        statusCode: statusCode || undefined,
        success,
        attempts,
        error,
      } as any);
    } catch (error) {
      console.error("Webhook log insert failed:", error);
    }
  },

  /**
   * Check webhook failure rate and update status if needed
   */
  async checkAndUpdateWebhookStatus(webhookId: string): Promise<void> {
    try {
      // Get recent logs
      const recentLogs = await db
        .select()
        .from(webhookLogs)
        .where(eq(webhookLogs.webhookId, webhookId))
        .limit(10)
        .orderBy(webhookLogs.createdAt);

      if (recentLogs.length < 10) {
        return; // Not enough data
      }

      // Count failures
      const failures = recentLogs.filter(log => !(log as any).success).length;

      // If 8+ out of 10 failed, mark webhook as failed
      if (failures >= 8) {
        await db
          .update(webhooks)
          .set({ status: "failed" } as any)
          .where(eq(webhooks.id, webhookId));
      }
    } catch (error) {
      console.error("Webhook status update failed:", error);
    }
  },

  /**
   * Broadcast event to all subscribed webhooks
   */
  async broadcastEvent(event: string, data: Record<string, unknown>): Promise<void> {
    try {
      // Find all active webhooks subscribed to this event
      const activeWebhooks = await db
        .select()
        .from(webhooks)
        .where(eq((webhooks as any).status, "active"));

      const deliveryPromises = activeWebhooks
        .filter(webhook => {
          const events = (webhook.events as string[]) || [];
          return events.length === 0 || events.includes(event);
        })
        .map(webhook => this.deliverWebhook(webhook.id, event, data));

      await Promise.allSettled(deliveryPromises);
    } catch (error) {
      console.error("Webhook broadcast failed:", error);
    }
  },

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId: string): Promise<WebhookDeliveryResult> {
    return this.deliverWebhook(webhookId, "webhook.test", {
      message: "This is a test webhook delivery",
      timestamp: new Date().toISOString(),
    });
  },
};
