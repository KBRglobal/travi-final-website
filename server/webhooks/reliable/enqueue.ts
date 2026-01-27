/**
 * Reliable Webhook Enqueue
 *
 * Writes webhook payloads to outbox table with idempotency support.
 * Uses SHA256 hash of (endpointId + eventType + payload) for deduplication.
 */

import crypto from "crypto";
import { db } from "../../db";
import { webhookOutbox, webhooks } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

// Maximum payload size (256KB)
const MAX_PAYLOAD_SIZE = 256 * 1024;

export interface EnqueueOptions {
  /** Specific endpoint IDs to target. If not provided, broadcasts to all active endpoints subscribed to the event */
  endpointIds?: string[];
  /** Custom idempotency key. If not provided, generates from payload hash */
  idempotencyKey?: string;
  /** Maximum delivery attempts (default: 12) */
  maxAttempts?: number;
  /** Schedule for future delivery */
  scheduledFor?: Date;
}

export interface EnqueueResult {
  success: boolean;
  outboxIds: string[];
  skipped: number; // Count of idempotent duplicates
  error?: string;
}

/**
 * Generate idempotency key from payload
 */
export function generateIdempotencyKey(
  endpointId: string,
  eventType: string,
  payload: Record<string, unknown>
): string {
  const data = JSON.stringify({ endpointId, eventType, payload });
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Check if reliable webhooks feature is enabled
 */
export function isReliableWebhooksEnabled(): boolean {
  return process.env.ENABLE_RELIABLE_WEBHOOKS === "true";
}

/**
 * Enqueue webhook for reliable delivery
 *
 * Writes to outbox table. Worker will process and deliver.
 * Supports idempotency to prevent duplicate deliveries.
 */
export async function enqueueWebhook(
  eventType: string,
  payload: Record<string, unknown>,
  options: EnqueueOptions = {}
): Promise<EnqueueResult> {
  const { endpointIds, maxAttempts = 12, scheduledFor } = options;

  try {
    // Validate payload size
    const payloadString = JSON.stringify(payload);
    if (payloadString.length > MAX_PAYLOAD_SIZE) {
      return {
        success: false,
        outboxIds: [],
        skipped: 0,
        error: `Payload exceeds maximum size of ${MAX_PAYLOAD_SIZE} bytes`,
      };
    }

    // Find target endpoints
    let targetEndpoints: Array<{ id: string; url: string }>;

    if (endpointIds && endpointIds.length > 0) {
      // Specific endpoints
      const endpoints = await db
        .select({ id: webhooks.id, url: webhooks.url, events: webhooks.events })
        .from(webhooks)
        .where(and(inArray(webhooks.id, endpointIds), eq(webhooks.isActive, true)));

      // Filter by event subscription
      targetEndpoints = endpoints.filter(ep => {
        const events = (ep.events as string[]) || [];
        return events.length === 0 || events.includes(eventType);
      });
    } else {
      // Broadcast to all active endpoints
      const endpoints = await db
        .select({ id: webhooks.id, url: webhooks.url, events: webhooks.events })
        .from(webhooks)
        .where(eq(webhooks.isActive, true));

      targetEndpoints = endpoints.filter(ep => {
        const events = (ep.events as string[]) || [];
        return events.length === 0 || events.includes(eventType);
      });
    }

    if (targetEndpoints.length === 0) {
      return {
        success: true,
        outboxIds: [],
        skipped: 0,
      };
    }

    const outboxIds: string[] = [];
    let skipped = 0;

    // Enqueue for each endpoint
    for (const endpoint of targetEndpoints) {
      const idempotencyKey =
        options.idempotencyKey || generateIdempotencyKey(endpoint.id, eventType, payload);

      try {
        const [inserted] = await db
          .insert(webhookOutbox)
          .values({
            endpointId: endpoint.id,
            eventType,
            payloadJson: payload,
            idempotencyKey,
            maxAttempts,
            nextAttemptAt: scheduledFor || new Date(),
            status: "pending",
          } as any)
          .onConflictDoNothing({ target: webhookOutbox.idempotencyKey })
          .returning({ id: webhookOutbox.id });

        if (inserted) {
          outboxIds.push(inserted.id);
        } else {
          skipped++;
        }
      } catch (error) {
        // Handle unique constraint violation gracefully
        if (error instanceof Error && error.message.includes("unique constraint")) {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      outboxIds,
      skipped,
    };
  } catch (error) {
    return {
      success: false,
      outboxIds: [],
      skipped: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Enqueue webhook only if feature is enabled
 * Falls back to no-op when disabled
 */
export async function enqueueWebhookIfEnabled(
  eventType: string,
  payload: Record<string, unknown>,
  options: EnqueueOptions = {}
): Promise<EnqueueResult | null> {
  if (!isReliableWebhooksEnabled()) {
    return null;
  }
  return enqueueWebhook(eventType, payload, options);
}
